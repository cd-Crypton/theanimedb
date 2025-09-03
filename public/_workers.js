const ANIMEPAHE_API_BASE = 'https://api.consumet.org/anime/animepahe';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // --- Handle CORS Preflight ---
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    // --- Proxy API Calls ---
    if (url.pathname.startsWith('/api/anime/animepahe')) {
      const targetPath = url.pathname.replace('/api/anime/animepahe', '');
      const targetUrl = ANIMEPAHE_API_BASE + targetPath + url.search;

      try {
        const apiResponse = await fetch(targetUrl, {
          method: request.method,
          headers: {
            "User-Agent": "TheAnimeDB (via Cloudflare Worker)",
          },
        });

        // Copy response and add CORS headers
        const response = new Response(apiResponse.body, apiResponse);
        response.headers.set('Access-Control-Allow-Origin', '*');
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type');

        return response;
      } catch (err) {
        return new Response(JSON.stringify({ error: 'Proxy error', details: err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // --- Serve Static Assets ---
    try {
      return await env.ASSETS.fetch(request);
    } catch {
      // fallback to index.html for SPA routing
      const index = await env.ASSETS.fetch(new Request(url.origin + '/index.html'));
      return new Response(index.body, { ...index, status: 404 });
    }
  },
};
