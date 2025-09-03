// The base URL of the public Consumet API
const CONSUMET_API_BASE = 'https://api.consumet.org';

export default {
  /**
   * Handles incoming requests.
   * Differentiates between API calls and static asset requests.
   * @param {Request} request The incoming request.
   * @param {object} env Environment variables, including the ASSETS fetcher.
   * @param {object} ctx Execution context.
   * @returns {Response}
   */
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // --- TEST ROUTE ---
    // If the path is exactly /api/ping, return a simple JSON response.
    if (url.pathname === '/api/ping') {
      const data = { status: 'ok', timestamp: new Date().toISOString() };
      return new Response(JSON.stringify(data), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
      });
    }

    // --- API Proxy Logic ---
    // If the path starts with /api/, proxy it to the Consumet API.
    if (url.pathname.startsWith('/api/')) {
      // Create the new URL for the target API
      const targetPath = url.pathname.replace('/api/', '/');
      const targetUrl = CONSUMET_API_BASE + targetPath + url.search;

      // Create a new request to forward
      const apiRequest = new Request(targetUrl, {
        method: request.method,
        headers: request.headers,
        body: request.body,
      });

      // Add headers to help with CORS and identify the request
      apiRequest.headers.set('User-Agent', 'TheAnimeDB (via Cloudflare Worker)');
      apiRequest.headers.set('Origin', new URL(CONSUMET_API_BASE).origin);

      try {
        const response = await fetch(apiRequest);
        // Create a mutable copy to add CORS headers
        const newResponse = new Response(response.body, response);
        newResponse.headers.set('Access-Control-Allow-Origin', '*');
        newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type');
        return newResponse;
      } catch (error) {
        return new Response('Error forwarding API request: ' + error.message, { status: 500 });
      }
    }

    // --- Static Asset Logic ---
    // If it's not an API call, serve the static files from your Pages deployment.
    try {
      // env.ASSETS is the binding to your static files defined in wrangler.toml
      return await env.ASSETS.fetch(request);
    } catch (e) {
      // If the asset isn't found, you can return a 404 page or the main index.html
      // for single-page application routing.
      const notFoundResponse = await env.ASSETS.fetch(new Request(url.origin + '/index.html'));
      return new Response(notFoundResponse.body, { ...notFoundResponse, status: 404 });
    }
  },
};

