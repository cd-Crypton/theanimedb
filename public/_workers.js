import axios from 'axios';

const VERCEL_API_BASE = 'https://crypton-api.vercel.app';

// Helper function to create a response with CORS headers
const createCorsResponse = (body, options) => {
    const responseOptions = {
        ...options,
        headers: {
            ...options.headers,
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': '*',
        },
    };
    return new Response(body, responseOptions);
};

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // --- CORS Preflight ---
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS',
                    'Access-Control-Allow-Headers': '*',
                },
            });
        }

        // --- M3U8 and TS Proxy Handling ---
        if (url.pathname === '/m3u8-proxy' || url.pathname === '/ts-proxy') {
            const targetUrlString = url.searchParams.get('url');
            if (!targetUrlString) {
                return createCorsResponse(JSON.stringify({ error: 'Missing ?url parameter' }), { status: 400 });
            }

            try {
                const targetUrl = new URL(targetUrlString);
                const response = await fetch(targetUrl.toString(), {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117 Safari/537.36',
                        'Referer': targetUrl.origin,
                    },
                });

                // If it's a video segment (.ts), stream it directly with the correct Content-Type
                if (targetUrl.pathname.endsWith('.ts')) {
                    const headers = new Headers(response.headers);
                    headers.set('Content-Type', 'video/mp2t'); // Explicitly set Content-Type
                    return createCorsResponse(response.body, { status: response.status, headers: headers });
                }

                // If it's a manifest file (.m3u8), rewrite its content
                if (targetUrl.pathname.endsWith('.m3u8')) {
                    let manifestText = await response.text();

                    const baseUrl = new URL('.', targetUrl).toString();
                    const proxyBaseUrl = `${url.origin}${url.pathname}`;

                    // Rewrite segment URLs to go through the proxy
                    const rewrittenManifest = manifestText.split('\n').map(line => {
                        line = line.trim();
                        if (line && !line.startsWith('#')) {
                            const absoluteUrl = new URL(line, baseUrl).toString();
                            return `${proxyBaseUrl}?url=${encodeURIComponent(absoluteUrl)}`;
                        }
                        return line;
                    }).join('\n');
                    
                    const headers = new Headers(response.headers);
                    headers.set('Content-Type', 'application/vnd.apple.mpegurl');

                    return createCorsResponse(rewrittenManifest, { status: response.status, headers });
                }
                
                // Fallback for any other file type, just pass it through
                return createCorsResponse(response.body, { status: response.status, headers: response.headers });

            } catch (err) {
                return createCorsResponse(JSON.stringify({ error: 'Failed to fetch stream', details: err.message }), { status: 500 });
            }
        }

        // --- Proxy API Calls (/api/*) ---
        if (url.pathname.startsWith('/api/')) {
            const targetUrl = VERCEL_API_BASE + url.pathname + url.search;
            try {
                const response = await axios.get(targetUrl, {
                    headers: { 'User-Agent': 'TheAnimeDB (via Cloudflare Worker)' },
                });
                return createCorsResponse(JSON.stringify(response.data), { status: response.status });
            } catch (err) {
                const errorResponse = err.response || {};
                return createCorsResponse(JSON.stringify({ error: 'Proxy failed', details: err.message }), { status: errorResponse.status || 500 });
            }
        }

        // --- Static Assets ---
        try {
            return await env.ASSETS.fetch(request);
        } catch {
            return env.ASSETS.fetch(new Request(new URL('/index.html', request.url)));
        }
    },
};