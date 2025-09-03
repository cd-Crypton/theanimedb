export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS preflight
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

    if (url.pathname.startsWith("/api/anime/anilist")) {
      const body = {
        query: `
          query ($page: Int, $perPage: Int) {
            Page(page: $page, perPage: $perPage) {
              media(type: ANIME, sort: TRENDING_DESC) {
                id
                title { romaji english native }
                coverImage { large medium }
                episodes
                description
                genres
                averageScore
                season
                seasonYear
                nextAiringEpisode { episode airingAt }
              }
            }
          }
        `,
        variables: {
          page: Number(url.searchParams.get("page") || 1),
          perPage: Number(url.searchParams.get("perPage") || 12),
        },
      };

      try {
        const response = await fetch("https://graphql.anilist.co", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const data = await response.json();

        return new Response(JSON.stringify(data), {
          status: 200,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }
    }

    // Serve SPA fallback
    try {
      return await env.ASSETS.fetch(request);
    } catch {
      const notFound = await env.ASSETS.fetch(new Request(url.origin + "/index.html"));
      return new Response(notFound.body, { ...notFound, status: 404 });
    }
  },
};
