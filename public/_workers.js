const ZORO_API_BASE = 'https://api.consumet.org/anime/zoro';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Handle CORS preflight
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

    // Proxy Zoro API requests
    if (url.pathname.startsWith('/api/anime/zoro')) {
      const path = url.pathname.replace('/api/anime/zoro', '');
      const targetUrl = ZORO_API_BASE + path + url.search;

      try {
        const res = await fetch(targetUrl, {
          method: request.method,
          headers: {
            'User-Agent': 'TheAnimeDB Worker',
            'Accept': 'application/json',
          },
        });

        const body = await res.text();

        return new Response(body, {
          status: res.status,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: 'Proxy failed', details: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Serve static assets
    try {
      return await env.ASSETS.fetch(request);
    } catch {
      const index = await env.ASSETS.fetch(new Request(url.origin + '/index.html'));
      return new Response(index.body, { ...index, status: 404 });
    }
  },
};
