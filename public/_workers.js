export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Handle CORS preflight
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

    // Proxy all /api/anime/anilist requests to your Vercel API
    if (url.pathname.startsWith('/api/anime/anilist')) {
      const targetUrl = 'https://test-anime-woad.vercel.app' + url.pathname.replace('/api/anime/anilist', '/anime/anilist') + url.search;

      try {
        const res = await fetch(targetUrl, { method: 'GET' });
        const data = await res.json();

        return new Response(JSON.stringify(data), {
          status: res.status,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Serve static assets (if using Workers Sites)
    try {
      return await env.ASSETS.fetch(request);
    } catch {
      return new Response('Not Found', { status: 404 });
    }
  }
};
