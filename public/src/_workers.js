export default {
  /**
   * Handles incoming requests.
   * - If the URL starts with /api/, it proxies the request to the Consumet API.
   * - Otherwise, it serves static assets (like index.html, css, js).
   * @param {Request} request The incoming request.
   * @param {object} env Environment variables, including the ASSETS binding.
   * @returns {Response} The response.
   */
  async fetch(request, env) {
    const url = new URL(request.url);

    // Check if the request is for our API proxy
    if (url.pathname.startsWith('/api/')) {
      return this.handleApiProxy(request);
    }

    // Otherwise, serve the static assets from Cloudflare Pages
    return env.ASSETS.fetch(request);
  },

  /**
   * Proxies API requests to the public Consumet API.
   * @param {Request} request The incoming API request.
   */
  async handleApiProxy(request) {
    const CONSUMET_API_BASE = 'https://api.consumet.org';
    const url = new URL(request.url);

    // Create the target URL for the Consumet API
    const targetPath = url.pathname.replace('/api/', '/');
    const targetUrl = CONSUMET_API_BASE + targetPath + url.search;

    // Create a new request to forward, copying method and headers
    const apiRequest = new Request(targetUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });
    
    // Set headers to ensure better compatibility
    apiRequest.headers.set('User-Agent', 'AnimeStream-Educational-Project (via Cloudflare Worker)');
    apiRequest.headers.set('Origin', new URL(CONSUMET_API_BASE).origin);

    try {
      // Fetch the response from the Consumet API
      const response = await fetch(apiRequest);
      
      // Create a mutable copy of the response to add CORS headers
      const newResponse = new Response(response.body, response);

      // Add CORS headers to allow your site to access the API response
      newResponse.headers.set('Access-Control-Allow-Origin', '*');
      newResponse.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
      newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type');

      return newResponse;

    } catch (error) {
      return new Response('Error forwarding API request: ' + error.message, { status: 500 });
    }
  },
};

