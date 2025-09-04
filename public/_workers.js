import axios from 'axios';

// The API endpoint is now defined in the Worker script
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
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // Proxy API requests if they start with /api/
    if (url.pathname.startsWith('/api/')) {
      // Construct the full target URL
      const targetUrl = VERCEL_API_BASE + url.pathname + url.search;

      try {
        // Make the request using axios
        const response = await axios.get(targetUrl, {
          headers: {
            'User-Agent': 'TheAnimeDB (via Cloudflare Worker)',
          }
        });

        // Return the response from the API
        return new Response(JSON.stringify(response.data), {
          status: response.status,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });

      } catch (err) {
        const errorResponse = err.response || {};
        return new Response(JSON.stringify({ error: 'Proxy failed', details: err.message }), {
          status: errorResponse.status || 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
    }

    // Serve static assets from Cloudflare Pages
    try {
      return await env.ASSETS.fetch(request);
    } catch {
      // Fallback for Single Page Applications (SPA)
      return env.ASSETS.fetch(new Request(new URL('/index.html', request.url)));
    }
  },
};