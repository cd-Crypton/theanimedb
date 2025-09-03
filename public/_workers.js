const CONSUMET_API_BASE = "https://test-anime-woad.vercel.app"; // your self-hosted consumet (Vercel)

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

    // Proxy API calls -> routes: /api/meta/anilist/* and /api/anime/gogoanime/*
    if (url.pathname.startsWith("/api/")) {
      const targetPath = url.pathname.replace("/api", ""); 
      const targetUrl = CONSUMET_API_BASE + targetPath + url.search;

      try {
        const response = await fetch(targetUrl, {
          method: request.method,
          headers: {
            "User-Agent": "TheAnimeDB (via Cloudflare Worker)",
          },
        });

        return new Response(response.body, {
          status: response.status,
          headers: {
            "Content-Type":
              response.headers.get("Content-Type") || "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        });
      } catch (error) {
        return new Response(
          JSON.stringify({ error: "Proxy error", details: error.message }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // Serve static assets (HTML, CSS, JS)
    try {
      return await env.ASSETS.fetch(request);
    } catch {
      // Fallback to index.html for SPA routing
      const notFound = await env.ASSETS.fetch(
        new Request(url.origin + "/index.html")
      );
      return new Response(notFound.body, { ...notFound, status: 404 });
    }
  },
};
