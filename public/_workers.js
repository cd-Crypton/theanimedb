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
          'Access-Control-Allow-Headers': 'Content-Type',
        },
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