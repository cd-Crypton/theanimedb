const JIKAN_BASE = 'https://api.jikan.moe/v4';

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (!url.pathname.startsWith('/api/anime/jikan')) {
      return new Response('Not Found', { status: 404 });
    }
    const targetPath = url.pathname.replace('/api/anime/jikan', '');
    const targetUrl = JIKAN_BASE + targetPath + url.search;
    try {
      const res = await fetch(targetUrl);
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }
};
