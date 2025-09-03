const mainContent = document.getElementById('main-content');

// --- State ---
let state = {
  view: 'home',
  trending: [],
  recent: [],
  searchResults: null,
  lastSearchQuery: '',
  currentPage: 1,
  selectedAnime: null,
  isLoading: true,
  error: null,
};

// --- Jikan API ---
const API_BASE = '/api/anime/jikan';

// --- Render Helpers ---
const Spinner = () => `<div class="flex justify-center py-16"><div class="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div></div>`;
const ErrorDisplay = (msg) => `<div class="text-center p-4 bg-red-900/50 text-red-300 rounded-lg my-4"><p class="font-bold">Error</p><p>${msg}</p></div>`;
const SearchBar = () => `
  <form id="search-form" class="w-full max-w-2xl mx-auto mb-8">
    <div class="relative">
      <input type="search" id="search-input" placeholder="Search anime..." class="w-full p-4 pr-12 text-lg text-white bg-gray-800 border-2 border-gray-700 rounded-full focus:outline-none focus:border-blue-500" ${state.isLoading ? 'disabled' : ''}/>
      <button type="submit" ${state.isLoading ? 'disabled' : ''} class="absolute top-1/2 right-4 -translate-y-1/2 text-gray-400 hover:text-white disabled:opacity-50">
        🔍
      </button>
    </div>
  </form>
`;
const AnimeCard = (anime) => `
  <div onclick="handleSelectAnime(${anime.mal_id})" class="anime-card bg-gray-800 rounded-lg overflow-hidden cursor-pointer group">
    <div class="relative pb-[140%]">
      <img src="${anime.images?.jpg?.image_url || 'https://placehold.co/300x420/1f2937/9ca3af?text=Image+Not+Found'}" alt="${anime.title}" class="absolute top-0 left-0 w-full h-full object-cover"/>
    </div>
    <div class="p-3">
      <h3 class="text-white font-bold text-sm truncate">${anime.title}</h3>
      <p class="text-xs text-gray-400">Episodes: ${anime.episodes || '?'}</p>
    </div>
  </div>
`;
const renderPagination = () => {
  if (!state.searchResults) return '';
  const hasNext = state.searchResults.pagination.has_next_page;
  return `
    <div class="flex justify-center items-center gap-4 mt-8">
      <button onclick="handlePageChange('prev')" ${state.currentPage === 1 ? 'disabled' : ''} class="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600">← Previous</button>
      <span class="text-white font-semibold">Page ${state.currentPage}</span>
      <button onclick="handlePageChange('next')" ${!hasNext ? 'disabled' : ''} class="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">Next →</button>
    </div>
  `;
};

// --- Render Views ---
const renderHome = () => {
  let content = '';
  if (state.isLoading) {
    content = Spinner();
  } else if (state.error) {
    content = ErrorDisplay(state.error);
  } else {
    const trendingContent = state.trending.map(AnimeCard).join('') || '<p class="text-gray-400 col-span-full">No trending anime found.</p>';
    const recentContent = state.recent.map(AnimeCard).join('') || '<p class="text-gray-400 col-span-full">No recent releases found.</p>';
    content = `
      <section class="mb-10">
        <h2 class="text-2xl font-bold text-white mb-4">Trending Now</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">${trendingContent}</div>
      </section>
      <section>
        <h2 class="text-2xl font-bold text-white mb-4">Recent Releases</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">${recentContent}</div>
      </section>
    `;
  }
  mainContent.innerHTML = SearchBar() + content;
  document.getElementById('search-form').addEventListener('submit', handleSearchSubmit);
};

const renderDetails = () => {
  if (!state.selectedAnime) return;
  const anime = state.selectedAnime;
  mainContent.innerHTML = `
    <div>
      <button onclick="handleBack()" class="bg-blue-500 text-white px-4 py-2 rounded-lg mb-6 hover:bg-blue-600">← Back</button>
      <h2 class="text-3xl font-bold text-white mb-2">${anime.title}</h2>
      <p class="text-gray-300 mb-4">${anime.synopsis || 'No description available.'}</p>
      <p class="text-gray-400 mb-2">Episodes: ${anime.episodes || '?'}</p>
      <p class="text-gray-400 mb-2">Score: ${anime.score || 'N/A'}</p>
      <p class="text-gray-400 mb-2">Status: ${anime.status || 'Unknown'}</p>
      <p class="text-gray-400 mb-2">Genres: ${anime.genres?.map(g => g.name).join(', ') || 'N/A'}</p>
      <p class="text-gray-400 mb-2">Aired: ${anime.aired?.string || 'Unknown'}</p>
    </div>
  `;
};

// --- App Logic ---
const setState = (newState) => {
  state = { ...state, ...newState };
  updateView();
};
const updateView = () => {
  if (state.view === 'home') renderHome();
  else if (state.view === 'details') renderDetails();
};

// --- Event Handlers ---
async function fetchTrending() {
  const res = await fetch(`${API_BASE}/top`);
  const data = await res.json();
  return data.data.slice(0, 12);
}
async function fetchRecent() {
  const res = await fetch(`${API_BASE}/season/now`);
  const data = await res.json();
  return data.data.slice(0, 12);
}
async function handleSearchSubmit(e) {
  e.preventDefault();
  const query = document.getElementById('search-input').value.trim();
  if (!query) return;
  setState({ isLoading: true, error: null });
  try {
    const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}&page=1`);
    const data = await res.json();
    setState({ searchResults: data, currentPage: 1, trending: [], recent: [], isLoading: false });
    renderSearchResults(data);
  } catch (err) {
    setState({ error: 'Failed to search.', isLoading: false });
  }
}
function handlePageChange(dir) {
  let page = state.currentPage;
  if (dir === 'next') page++;
  else if (dir === 'prev') page = Math.max(1, page - 1);
  handleSearchPage(page);
}
async function handleSearchPage(page) {
  const query = state.lastSearchQuery;
  if (!query) return;
  setState({ isLoading: true });
  const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}&page=${page}`);
  const data = await res.json();
  setState({ searchResults: data, currentPage: page, isLoading: false });
  renderSearchResults(data);
}
function renderSearchResults(data) {
  const results = data.data.map(AnimeCard).join('');
  mainContent.innerHTML = SearchBar() + `
    <section>
      <h2 class="text-2xl font-bold text-white mb-4">Search Results</h2>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">${results}</div>
      ${renderPagination()}
    </section>
  `;
  document.getElementById('search-form').addEventListener('submit', handleSearchSubmit);
}
async function handleSelectAnime(id) {
  setState({ isLoading: true, error: null });
  try {
    const res = await fetch(`${API_BASE}/info/${id}`);
    const data = await res.json();
    setState({ selectedAnime: data.data, view: 'details', isLoading: false });
  } catch (err) {
    setState({ error: 'Failed to fetch anime info.', isLoading: false });
  }
}
function handleBack() {
  setState({ view: 'home', selectedAnime: null, isLoading: false });
}

// --- Initial Load ---
(async function init() {
  setState({ isLoading: true });
  try {
    const [trending, recent] = await Promise.all([fetchTrending(), fetchRecent()]);
    setState({ trending, recent, isLoading: false });
  } catch (err) {
    setState({ error: 'Could not load home anime data.', isLoading: false });
  }
})();
