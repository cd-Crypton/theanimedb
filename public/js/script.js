const API_BASE = '/api/anime/anilist';

// Fetch trending anime
async function fetchTrending() {
  try {
    const res = await fetch(`${API_BASE}/top-airing?page=1`);
    const json = await res.json();
    console.log("Trending:", json);
    return json.results || [];
  } catch (err) {
    console.error(err);
    return [];
  }
}

// Fetch recent anime
async function fetchRecent() {
  try {
    const res = await fetch(`${API_BASE}/recent-episodes?page=1&type=1`);
    const json = await res.json();
    console.log("Recent:", json);
    return json.results || [];
  } catch (err) {
    console.error(err);
    return [];
  }
}

// Init
async function init() {
  const trending = await fetchTrending();
  const recent = await fetchRecent();

  console.log('Trending Anime:', trending);
  console.log('Recent Anime:', recent);

  // Render to DOM...
}

init();
