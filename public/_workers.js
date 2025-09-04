import axios from 'axios';

const VERCEL_API_BASE = 'https://crypton-api.vercel.app';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Standard CORS preflight handling
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, User-Agent, Referer',
        },
      });
    }

    // Proxy for M3U8 streaming files
    if (url.pathname.startsWith('/m3u8-proxy')) {
      const targetUrl = url.searchParams.get('url');
      const referer = url.searchParams.get('referer');

      if (!targetUrl) {
        return new Response('URL parameter is missing', { status: 400 });
      }

      // Fetch the m3u8 file with the correct Referer header
      const response = await fetch(targetUrl, {
        headers: {
          'Referer': referer || '',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        },
      });
      
      const newHeaders = new Headers(response.headers);
      newHeaders.set('Access-Control-Allow-Origin', '*');
      
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    }

    // Proxy API requests
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

    // Serve static assets
    try {
      return await env.ASSETS.fetch(request);
    } catch {
      return env.ASSETS.fetch(new Request(new URL('/index.html', request.url)));
    }
  },
};