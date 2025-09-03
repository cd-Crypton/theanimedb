const VERCEL_API_BASE = 'https://anime-api-three-sable.vercel.app'; // Your Vercel API

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

    // Proxy API requests
    if (url.pathname.startsWith('/api/anime/aniwatch')) {
      // Build the target Vercel API URL
      const targetPath = url.pathname.replace('/api/anime/aniwatch', '/aniwatch');
      const targetUrl = VERCEL_API_BASE + targetPath + url.search;

      try {
        const response = await fetch(targetUrl, {
          method: request.method,
          headers: {
            'User-Agent': 'TheAnimeDB (via Cloudflare Worker)',
            'Accept': 'application/json',
          },
        });

        const body = await response.text(); // Pass body as text
        return new Response(body, {
          status: response.status,
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
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
    }

    // Serve static assets (if you use Pages)
    try {
      return await env.ASSETS.fetch(request);
    } catch {
      // Fallback for SPA
      const notFound = await env.ASSETS.fetch(new Request(url.origin + '/index.html'));
      return new Response(notFound.body, { ...notFound, status: 404 });
    }
  },
};