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
    animeEpisodes: [],
    selectedEpisodeId: null,
    availableServers: [],
    videoSrc: null,
    isLoading: true,
    error: null,
    timeoutId: null, // New state variable to hold the timeout timer
};

// --- API Base URL pointing to Worker proxy ---
const API_BASE = '/api/anime/aniwatch';
const GOGOANIME_API_BASE = 'https://api.consumet.org/anime/gogoanime';
const CORS_PROXY_URL = 'https://cors.consumet.stream/';

// --- Render Helpers ---
const Spinner = () => `
<div class="flex justify-center items-center h-full w-full py-16">
  <div class="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
</div>`;

const ErrorDisplay = (message, showBackButton = false) => {
    let backButton = '';
    if (showBackButton) {
        backButton = `<button onclick="handleGoHome()" class="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">Go Back</button>`;
    }
    return `
    <div class="text-center p-4 bg-red-900/50 text-red-300 rounded-lg max-w-2xl mx-auto my-4">
      <p class="font-bold">An Error Occurred</p>
      <p>${message}</p>
      ${backButton}
    </div>`;
};

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
    const animeTitle = (anime.name).replace(/'/g, "\\'");
    const onclickAction = `handleSelectAnime('${anime.id}')`;
    return `
    <div onclick="${onclickAction}" class="bg-gray-800 rounded-lg overflow-hidden cursor-pointer group transform hover:-translate-y-1 transition-transform duration-300">
      <div class="relative pb-[140%]">
        <img src="${anime.img || 'https://placehold.co/300x420/1f2937/9ca3af?text=Image+Not+Found'}"
             alt="${animeTitle}"
             class="absolute top-0 left-0 w-full h-full object-cover group-hover:opacity-75 transition-opacity"
             onerror="this.onerror=null; this.src='https://placehold.co/300x420/1f2937/9ca3af?text=Image+Not+Found';" />
      </div>
      <div class="p-3">
        <h3 class="text-white font-bold text-sm truncate group-hover:text-blue-400 transition-colors">${anime.name}</h3>
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

const renderDetails = () => {
    if (state.isLoading || !state.animeDetails) {
        mainContent.innerHTML = Spinner();
        return;
    }

    const info = state.animeDetails.info;
    const moreInfo = state.animeDetails.moreInfo;
    const genres = moreInfo.Genres ? moreInfo.Genres.join(', ') : 'N/A';

    let episodeListHtml = '';
    if (state.animeEpisodes && state.animeEpisodes.length > 0) {
        episodeListHtml = `
            <h3 class="text-xl font-bold text-white mb-2">Episode List</h3>
            <div class="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 overflow-y-auto max-h-96 custom-scrollbar">
                ${state.animeEpisodes.map(ep => `
                    <button onclick="handleEpisodeSelection('${ep.episodeId}')"
                            class="bg-gray-700 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-500 transition-colors">
                        ${ep.episodeNo}
                    </button>
                `).join('')}
            </div>
        `;
    } else {
        episodeListHtml = '<p class="text-gray-400">No episodes found.</p>';
    }

    let videoPlayerHtml = '';
    if (state.videoSrc) {
        videoPlayerHtml = `
            <div class="w-full bg-black rounded-lg overflow-hidden mb-8">
                <video controls class="w-full h-auto" src="${state.videoSrc}" type="video/mp4"></video>
            </div>
        `;
    } else if (state.availableServers.length > 0) {
        const serverButtonsHtml = state.availableServers.map(server => `
            <button onclick="handleServerSelection('${state.selectedEpisodeId}', '${server.serverName}')" 
                    class="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors">
                ${server.serverName}
            </button>
        `).join('');

        videoPlayerHtml = `
            <div class="mb-8">
                <h3 class="text-xl font-bold text-white mb-2">Select a Server:</h3>
                <div class="flex flex-wrap gap-2">${serverButtonsHtml}</div>
            </div>
        `;
    }

    const content = `
    <div class="max-w-4xl mx-auto">
        <button onclick="handleGoHome()" class="text-blue-500 hover:text-blue-400 font-bold mb-4 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
            Back to Home
        </button>
        <div class="flex flex-col md:flex-row gap-8 bg-gray-800 rounded-lg overflow-hidden shadow-lg p-6">
            <div class="md:flex-shrink-0">
                <img src="${info.img || 'https://placehold.co/300x420/1f2937/9ca3af?text=Image+Not+Found'}"
                     alt="${info.name}"
                     class="w-full md:w-64 h-auto rounded-lg shadow-md" />
            </div>
            <div class="flex-grow">
                <h1 class="text-3xl sm:text-4xl font-extrabold text-white mb-2">${info.name}</h1>
                <p class="text-gray-400 mb-4">${moreInfo["Japanese:"] || ''}</p>
                <div class="grid grid-cols-2 gap-4 mb-4 text-gray-300">
                    <div>
                        <p class="font-semibold text-white">Released:</p>
                        <p>${moreInfo["Aired:"] || 'N/A'}</p>
                    </div>
                    <div>
                        <p class="font-semibold text-white">Status:</p>
                        <p>${moreInfo.Status || 'N/A'}</p>
                    </div>
                    <div>
                        <p class="font-semibold text-white">Type:</p>
                        <p>${info.category || 'N/A'}</p>
                    </div>
                    <div>
                        <p class="font-semibold text-white">Genres:</p>
                        <p>${genres}</p>
                    </div>
                </div>
                <p class="text-gray-300 mb-4">
                    <span class="font-semibold text-white">Summary:</span>
                    ${info.description || 'No summary available.'}
                </p>
            </div>
        </div>
        
        <div class="mt-8">
            ${videoPlayerHtml}
            ${state.error ? ErrorDisplay(state.error, state.isLoading === false) : ''}
            <h2 class="text-2xl font-bold text-white mb-4">Episodes</h2>
            ${episodeListHtml}
        </div>
    </div>
    `;

    mainContent.innerHTML = content;
};

// --- App Logic ---
const setState = (newState) => {
    state = { ...state, ...newState };
    // Clear existing timeout if it's active
    if (state.timeoutId) {
        clearTimeout(state.timeoutId);
        state.timeoutId = null;
    }

    if (state.view === 'home') {
        renderHome();
    } else if (state.view === 'details') {
        renderDetails();
    }
};

const startTimeout = (message) => {
    // Set a new timeout and store its ID
    const timeoutId = setTimeout(() => {
        setState({
            isLoading: false,
            error: `Request timed out. ${message || ''}`.trim(),
            timeoutId: null,
        });
    }, 10000); // 10 seconds
    state.timeoutId = timeoutId;
};

async function fetchHomeData() {
    setState({ isLoading: true, error: null, view: 'home' });
    startTimeout("Could not load home anime data.");
    try {
        const res = await fetch(`${API_BASE}`);
        const data = await res.json();
        const trending = data.trendingAnimes || [];
        const recent = data.latestEpisodes || [];
        setState({ homeData: { trending, recent } });
    } catch (err) {
        console.error(err);
        setState({ error: 'Could not load home anime data.' });
    } finally {
        setState({ isLoading: false });
    }
}

async function fetchSearchResults(page = 1) {
    if (!state.lastSearchQuery) return;
    setState({ isLoading: true, error: null, currentPage: page, view: 'home' });
    startTimeout("Failed to fetch search results.");
    try {
        const res = await fetch(`${API_BASE}/search?keyword=${state.lastSearchQuery}&page=${page}`);
        const data = await res.json();
        setState({ searchResults: { results: data.animes }, isLoading: false });
    } catch (err) {
        console.error(err);
        setState({ error: 'Failed to fetch search results.', isLoading: false });
    } finally {
        setState({ isLoading: false });
    }
}

async function fetchAnimeDetails(animeId) {
    setState({ isLoading: true, error: null, view: 'details', animeDetails: null, videoSrc: null, availableServers: [], selectedEpisodeId: null });
    startTimeout("Failed to fetch anime details.");
    try {
        const [detailsRes, episodesRes] = await Promise.all([
            fetch(`${API_BASE}/anime/${animeId}`),
            fetch(`${API_BASE}/episodes/${animeId}`)
        ]);

        const detailsData = await detailsRes.json();
        const episodesData = await episodesRes.json();

        setState({
            animeDetails: detailsData,
            animeEpisodes: episodesData.episodes,
            isLoading: false
        });
    } catch (err) {
        console.error(err);
        setState({ error: 'Failed to fetch anime details.', isLoading: false });
    }
}

async function handleEpisodeSelection(episodeId) {
    setState({ isLoading: true, selectedEpisodeId: episodeId, videoSrc: null, availableServers: [], error: null });
    startTimeout("Failed to load servers for this episode.");
    try {
        const serversRes = await fetch(`${API_BASE}/servers?id=${episodeId}`);
        const serversData = await serversRes.json();
        
        let availableServers = serversData.sub;
        
        if (!availableServers || availableServers.length === 0) {
            throw new Error('No servers found for this episode.');
        }
        
        setState({ availableServers, isLoading: false, error: null });

    } catch (err) {
        console.error(err);
        setState({ error: `Failed to load servers: ${err.message}`, isLoading: false });
    }
}

async function handleServerSelection(episodeId, serverName) {
    setState({ isLoading: true, videoSrc: null, error: null });
    startTimeout(`Failed to load streaming source from ${serverName}.`);
    try {
        const serversRes = await fetch(`${API_BASE}/servers?id=${episodeId}`);
        const serversData = await serversRes.json();
        
        if (!serversData.sub || serversData.sub.length === 0) {
            throw new Error('No servers found for this episode.');
        }
        
        const srcRes = await fetch(`${API_BASE}/episode-srcs?id=${serversData.episodeId}&server=${serverName}`);
        const srcData = await srcRes.json();
        
        if (!srcData.sources || srcData.sources.length === 0) {
            throw new Error('No streaming sources found.');
        }

        const sourceUrl = srcData.sources[0].url;
        const proxiedUrl = `${CORS_PROXY_URL}proxy?url=${encodeURIComponent(sourceUrl)}`;

        setState({ videoSrc: proxiedUrl, isLoading: false, error: null });

    } catch (err) {
        console.error("AniWatch API failed, attempting fallback:", err);

        // Fallback to Gogoanime API with CORS proxy
        try {
            const parts = episodeId.split("?ep=");
            const animeSlug = parts[0];
            const episodeNumber = state.animeEpisodes.find(ep => ep.episodeId === episodeId).episodeNo;
            
            const gogoanimeSourceUrl = `${GOGOANIME_API_BASE}/watch/${animeSlug}-episode-${episodeNumber}`;
            const proxiedGogoanimeSourceUrl = `${CORS_PROXY_URL}proxy?url=${encodeURIComponent(gogoanimeSourceUrl)}`;
            
            const gogoanimeSourceRes = await fetch(proxiedGogoanimeSourceUrl);
            const gogoanimeSourceData = await gogoanimeSourceRes.json();
            
            if (!gogoanimeSourceData.sources || gogoanimeSourceData.sources.length === 0) {
                throw new Error('Gogoanime fallback failed to provide sources.');
            }

            const finalGogoanimeSourceUrl = gogoanimeSourceData.sources[0].url;
            const finalProxiedUrl = `${CORS_PROXY_URL}proxy?url=${encodeURIComponent(finalGogoanimeSourceUrl)}`;

            setState({ videoSrc: finalProxiedUrl, isLoading: false, error: null });
        } catch (gogoanimeErr) {
            console.error(gogoanimeErr);
            setState({ error: `Fallback failed to load episode: ${gogoanimeErr.message}`, isLoading: false });
        }
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
    state.selectedAnimeId = animeId;
    fetchAnimeDetails(animeId);
}

function handleGoHome(){
    setState({ view:'home', searchResults: null, lastSearchQuery: '', videoSrc: null, selectedEpisodeId: null, availableServers: [] });
    fetchHomeData();
}

// --- Init ---
fetchHomeData();