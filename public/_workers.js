const mainContent = document.getElementById('main-content');
const API_BASE = '/api/anime/anilist';

let state = {
  view: 'home',
  homeData: { trending: [], recent: [] },
  searchResults: null,
  lastSearchQuery: '',
  currentPage: 1,
  perPage: 12,
  selectedAnime: null,
  isLoading: true,
  error: null,
};

// Spinner & Error UI
const Spinner = () => `<div class="flex justify-center py-16"><div class="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div></div>`;
const ErrorDisplay = (message) => `<div class="text-center p-4 bg-red-900/50 text-red-300 rounded-lg max-w-2xl mx-auto my-4"><p class="font-bold">An Error Occurred</p><p>${message}</p></div>`;

// Card UI
const AnimeCard = (anime) => {
  const title = anime.title?.romaji || anime.title?.english || 'Unknown';
  return `
    <div class="bg-gray-800 rounded-lg overflow-hidden cursor-pointer group" onclick="handleSelectAnime(${anime.id})">
      <div class="relative pb-[140%]">
        <img src="${anime.coverImage?.large || anime.coverImage?.medium || 'https://placehold.co/300x420/1f2937/9ca3af?text=No+Image'}" alt="${title}" class="absolute top-0 left-0 w-full h-full object-cover">
      </div>
      <div class="p-3">
        <h3 class="text-white font-bold text-sm truncate">${title}</h3>
        ${anime.episodes ? `<p class="text-xs text-gray-400">Episodes: ${anime.episodes}</p>` : ''}
      </div>
    </div>
  `;
};

// Render Home
const renderHome = () => {
  let content = '';
  if (state.isLoading) {
    content = Spinner();
  } else if (state.error) {
    content = ErrorDisplay(state.error);
  } else {
    const trending = state.homeData.trending.map(AnimeCard).join('');
    const recent = state.homeData.recent.map(AnimeCard).join('');
    content = `
      <section class="mb-10">
        <h2 class="text-2xl font-bold text-white mb-4">Trending Now</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">${trending}</div>
      </section>
      <section>
        <h2 class="text-2xl font-bold text-white mb-4">Recent Releases</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">${recent}</div>
      </section>
    `;
  }
  mainContent.innerHTML = content;
};

// Fetch Anime Data
const fetchAnime = async (type, page = 1, perPage = 12, search = null) => {
  state.isLoading = true;
  renderHome();

  const url = new URL(API_BASE);
  url.searchParams.set('page', page);
  url.searchParams.set('perPage', perPage);
  url.searchParams.set('type', type);
  if (search) url.searchParams.set('search', search);

  try {
    const res = await fetch(url);
    const json = await res.json();
    if (type === 'TRENDING') state.homeData.trending = json.data.Page.media || [];
    else if (type === 'RECENT') state.homeData.recent = json.data.Page.media || [];
    state.isLoading = false;
    renderHome();
  } catch (err) {
    state.isLoading = false;
    state.error = 'Could not load home anime data.';
    renderHome();
  }
};

// On anime click
window.handleSelectAnime = (id) => {
  const anime = [...state.homeData.trending, ...state.homeData.recent].find(a => a.id === id);
  if (!anime) return;
  state.selectedAnime = anime;
  alert(`Selected anime: ${anime.title.romaji}`);
};

// Init
const init = async () => {
  await fetchAnime('TRENDING', 1, state.perPage);
  await fetchAnime('RECENT', 1, state.perPage);
};
init();
