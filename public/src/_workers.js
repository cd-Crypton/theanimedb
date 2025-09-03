// The base URL of the public Consumet API
const CONSUMET_API_BASE = 'https://api.consumet.org';

export default {
  /**
   * Handles incoming requests to the worker.
   * @param {Request} request The incoming request.
   * @param {object} env Environment variables.
   * @param {object} ctx Execution context.
   * @returns {Response} The response to send back to the client.
   */
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // The path from the incoming request (e.g., /api/anime/gogoanime/naruto)
    const requestPath = url.pathname;

    // We remove the '/api' prefix to create the correct path for the target API
    // e.g., /api/anime/gogoanime/naruto -> /anime/gogoanime/naruto
    const targetPath = requestPath.replace('/api/', '/');
    const targetUrl = CONSUMET_API_BASE + targetPath + url.search;

    // Create a new request to forward to the Consumet API.
    // We pass along the original method, headers, and body.
    const apiRequest = new Request(targetUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });
    
    // Set a custom User-Agent to identify traffic from your project.
    apiRequest.headers.set('User-Agent', 'AnimeStream-Educational-Project (via Cloudflare Worker)');
    // Set the Origin header to match the target API's origin to help prevent CORS issues.
    apiRequest.headers.set('Origin', new URL(CONSUMET_API_BASE).origin);

    try {
      // Forward the request to the Consumet API
      const response = await fetch(apiRequest);

      // Create a mutable copy of the response so we can add CORS headers
      const newResponse = new Response(response.body, response);

      // Add CORS (Cross-Origin Resource Sharing) headers to the response.
      // This allows your index.html file (served from a different domain)
      // to access the data from this worker.
      newResponse.headers.set('Access-Control-Allow-Origin', '*'); // For educational projects, '*' is acceptable.
      newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      return newResponse;

    } catch (error) {
      // If the fetch fails, return a 500 error with a descriptive message.
      return new Response('Error forwarding API request: ' + error.message, { status: 500 });
    }
  },
};

