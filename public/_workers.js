import axios from 'axios';

const VERCEL_API_BASE = 'https://crypton-api.vercel.app';

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
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // --- M3U8 Proxy Handling ---
    if (url.pathname === '/m3u8-proxy') {
      const targetUrl = url.searchParams.get('url');
      if (!targetUrl) {
        return new Response(JSON.stringify({ error: 'Missing ?url parameter' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }

      try {
        const response = await fetch(targetUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117 Safari/537.36',
            'Referer': new URL(targetUrl).origin,
          },
        });

        // Add CORS headers so Hls.js can read it
        const headers = new Headers(response.headers);
        headers.set('Access-Control-Allow-Origin', '*');
        headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
        headers.set('Access-Control-Allow-Headers', '*');

        return new Response(response.body, {
          status: response.status,
          headers,
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: 'Failed to fetch stream', details: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
    }

    // --- Proxy API Calls (/api/*) ---
    if (url.pathname.startsWith('/api/')) {
      const targetUrl = VERCEL_API_BASE + url.pathname + url.search;
      try {
        const response = await axios.get(targetUrl, {
          headers: { 'User-Agent': 'TheAnimeDB (via Cloudflare Worker)' },
        });
        return new Response(JSON.stringify(response.data), {
          status: response.status,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      } catch (err) {
        const errorResponse = err.response || {};
        return new Response(JSON.stringify({ error: 'Proxy failed', details: err.message }), {
          status: errorResponse.status || 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
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
