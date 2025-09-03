const mainContent = document.getElementById('main-content');

// --- State Management ---
let state = {
    view: 'home', // 'home' or 'details'
    homeData: { trending: [], recent: [] },
    searchResults: null,
    lastSearchQuery: '',
    currentPage: 1,
    selectedAnimeId: null,
    animeDetails: null,
    isLoading: true,
    error: null,
};

// --- API Base URL pointing to Worker proxy ---
const API_BASE = '/api/anime/anilist';

// --- Render Helpers ---
const Spinner = () => `
<div class="flex justify-center items-center h-full w-full py-16">
  <div class="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
</div>`;

const ErrorDisplay = (message) => `
<div class="text-center p-4 bg-red-900/50 text-red-300 rounded-lg max-w-2xl mx-auto my-4">
  <p class="font-bold">An Error Occurred</p>
  <p>${message}</p>
</div>`;

const SearchBar = () => `
<form id="search-form" class="w-full max-w-2xl mx-auto mb-8">
  <div class="relative">
    <input type="search" id="search-input" placeholder="Search for an anime..."
      class="w-full p-4 pr-12 text-lg text-white bg-gray-800 border-2 border-gray-700 rounded-full focus:outline-none focus:border-blue-500 transition-colors"
      ${state.isLoading ? 'disabled' : ''} />
    <button type="submit" ${state.isLoading ? 'disabled' : ''}
      class="absolute top-1/2 right-4 -translate-y-1/2 text-gray-400 hover:text-white disabled:opacity-50">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
    </button>
  </div>
</form>`;

const AnimeCard = (anime) => {
    const animeTitle = (anime.title?.romaji || anime.title).replace(/'/g, "\\'");
    const onclickAction = `handleSelectAnime('${anime.id}')`;
    return `
    <div onclick="${onclickAction}" class="bg-gray-800 rounded-lg overflow-hidden cursor-pointer group transform hover:-translate-y-1 transition-transform duration-300">
      <div class="relative pb-[140%]">
        <img src="${anime.image || 'https://placehold.co/300x420/1f2937/9ca3af?text=Image+Not+Found'}"
             alt="${animeTitle}"
             class="absolute top-0 left-0 w-full h-full object-cover group-hover:opacity-75 transition-opacity"
             onerror="this.onerror=null; this.src='https://placehold.co/300x420/1f2937/9ca3af?text=Image+Not+Found';" />
      </div>
      <div class="p-3">
        <h3 class="text-white font-bold text-sm truncate group-hover:text-blue-400 transition-colors">${anime.title?.romaji || anime.title}</h3>
      </div>
    </div>`;
};

const renderPagination = () => {
    if (!state.searchResults) return '';
    const hasNextPage = state.searchResults.hasNextPage;
    return `
    <div class="flex justify-center items-center gap-4 mt-8">
      <button onclick="handlePageChange('prev')" class="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" ${state.currentPage===1?'disabled':''}>&larr; Previous</button>
      <span class="text-white font-semibold">Page ${state.currentPage}</span>
      <button onclick="handlePageChange('next')" class="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" ${!hasNextPage?'disabled':''}>Next &rarr;</button>
    </div>`;
};

// --- Render Views ---
const renderHome = () => {
    let content = '';
    if (state.isLoading) {
        content = Spinner();
    } else if (state.searchResults) {
        content = `
        <section>
          <h2 class="text-2xl font-bold text-white mb-4">Search Results</h2>
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            ${state.searchResults.results.map(anime=>AnimeCard(anime)).join('')}
          </div>
          ${renderPagination()}
        </section>`;
    } else {
        const trendingContent = state.homeData.trending.length > 0
            ? state.homeData.trending.map(anime=>AnimeCard(anime)).join('')
            : '<p class="text-gray-400 col-span-full">No trending anime found.</p>';
        const recentContent = state.homeData.recent.length > 0
            ? state.homeData.recent.map(anime=>AnimeCard(anime)).join('')
            : '<p class="text-gray-400 col-span-full">No recent releases found.</p>';

        content = `
        <section class="mb-10">
          <h2 class="text-2xl font-bold text-white mb-4">Trending Now</h2>
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">${trendingContent}</div>
        </section>
        <section>
          <h2 class="text-2xl font-bold text-white mb-4">Recent Releases</h2>
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">${recentContent}</div>
        </section>`;
    }

    mainContent.innerHTML = SearchBar() + (state.error ? ErrorDisplay(state.error) : '') + content;
    const searchForm = document.getElementById('search-form');
    if (searchForm) searchForm.addEventListener('submit', handleSearchSubmit);
};

// --- App Logic ---
const setState = (newState) => {
    state = { ...state, ...newState };
    renderHome();
};

async function fetchHomeData() {
    setState({ isLoading:true, error:null });
    try {
        const [trendingRes, recentRes] = await Promise.all([
            fetch(`${API_BASE}/top-airing?page=1`),
            fetch(`${API_BASE}/recent-episodes?page=1&type=1`)
        ]);
        const trending = (await trendingRes.json()).results || [];
        const recent = (await recentRes.json()).results || [];
        setState({ homeData: { trending, recent }, isLoading:false });
    } catch(err) {
        console.error(err);
        setState({ error: 'Could not load home anime data.', isLoading:false });
    }
}

async function fetchSearchResults(page=1) {
    if (!state.lastSearchQuery) return;
    setState({ isLoading:true, error:null, currentPage:page });
    try {
        const res = await fetch(`${API_BASE}/${state.lastSearchQuery}?page=${page}`);
        const data = await res.json();
        setState({ searchResults:data, isLoading:false });
    } catch(err){
        console.error(err);
        setState({ error:'Failed to fetch search results.', isLoading:false });
    }
}

// --- Event Handlers ---
function handleSearchSubmit(e){
    e.preventDefault();
    const query = document.getElementById('search-input').value.trim();
    if(!query) return;
    state.lastSearchQuery = query;
    state.currentPage = 1;
    fetchSearchResults(1);
}

function handlePageChange(dir){
    let newPage = state.currentPage;
    if(dir==='next') newPage++;
    if(dir==='prev' && newPage>1) newPage--;
    fetchSearchResults(newPage);
}

function handleSelectAnime(animeId){
    alert(`Selected anime ID: ${animeId}\nStreaming/playback not supported, metadata only.`);
}

// --- Init ---
fetchHomeData();
