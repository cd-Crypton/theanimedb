// --- App Logic ---
const PROXY_URL = 'https://theanimedbproxy.vercel.app/';
const mainContent = document.getElementById('main-content');
let player = null;

// --- State Management ---
let state = {
    view: 'home', // 'home', 'details', 'category'
    homeTab: 'recent', // 'recent' or 'trending'
    homeData: { trending: [], recent: [], spotlights: [] },
    searchResults: null,
    categoryResults: null,
    currentCategoryTitle: null,
    currentCategoryEndpoint: null,
    searchSuggestions: [],
    lastSearchQuery: '',
    currentPage: 1,
    currentSpotlightIndex: 0,
    selectedAnimeId: null,
    animeDetails: null, // For the player page
    animeDetailsForModal: null, // For the info modal
    animeEpisodes: [],
    selectedEpisodeId: null,
    availableSubServers: [],
    availableDubServers: [],
    videoSrc: null,
    isLoading: true,
    error: null,
};

const MENU_ITEMS = [
    { title: 'Home', endpoint: 'home' },
    { title: 'Movies', endpoint: '/movie' },
    { title: 'TV Series', endpoint: '/tv' },
    { title: 'Subbed Anime', endpoint: '/subbed-anime' },
    { title: 'Dubbed Anime', endpoint: '/dubbed-anime' },
    { title: 'Completed', endpoint: '/completed' },
    { title: 'Special', endpoint: '/special' },
    { title: 'OVA', endpoint: '/ova' },
    { title: 'ONA', endpoint: '/ona' },
];

const API_BASE = 'https://crypton-api.vercel.app/api';

const setState = (newState) => {
    state = { ...state, ...newState };
    if (state.view === 'home') {
        renderHome();
    } else if (state.view === 'details') {
        renderDetailsPage();
    } else if (state.view === 'category') {
        renderCategoryPage();
    }
};

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

function toggleSummary(event) {
    event.preventDefault();
    const summaryP = document.getElementById('summary-text');
    const contentSpan = document.getElementById('summary-content');
    const ellipsisSpan = document.getElementById('summary-ellipsis');
    const toggleLink = document.getElementById('summary-toggle');
    const fullText = summaryP.dataset.fullText;
    const isExpanded = toggleLink.textContent.trim() === 'See less...';

    if (isExpanded) {
        // Collapse
        contentSpan.textContent = fullText.substring(0, 550);
        ellipsisSpan.style.display = 'inline';
        toggleLink.textContent = 'See more...';
    } else {
        // Expand
        contentSpan.textContent = fullText;
        ellipsisSpan.style.display = 'none';
        toggleLink.textContent = ' See less...';
    }
}


const renderInfoModal = () => {
    const modalOverlay = document.getElementById('info-modal-overlay');
    const modalContent = document.getElementById('info-modal-content');

    if (!state.animeDetailsForModal) {
        modalContent.innerHTML = Spinner();
        modalOverlay.classList.remove('hidden');
        modalOverlay.classList.add('flex');
        return;
    }

    const details = state.animeDetailsForModal;
    const genres = details.animeInfo.Genres ? details.animeInfo.Genres.join(', ') : 'N/A';
    const summary = details.animeInfo.Overview || 'No summary available.';
    
    const summaryNeedsTruncation = summary.length > 550; 
    let summaryHtml = '';
    if (summaryNeedsTruncation) {
        const truncatedText = summary.substring(0, 550);
        summaryHtml = `
            <p id="summary-text" class="text-gray-300 text-justify" data-full-text="${summary.replace(/"/g, '&quot;')}">
                <span class="font-semibold text-white">Summary:</span>
                <span id="summary-content">${truncatedText}</span><span id="summary-ellipsis">... </span>
                <a href="#" id="summary-toggle" onclick="toggleSummary(event)" class="text-blue-400 hover:text-blue-300 font-semibold">See more...</a>
            </p>`;
    } else {
        summaryHtml = `<p class="text-gray-300 text-justify"><span class="font-semibold text-white">Summary:</span> ${summary}</p>`;
    }


    modalContent.innerHTML = `
        <button onclick="hideInfoModal()" class="absolute top-4 right-4 text-gray-400 hover:text-white z-10">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>
        <div class="flex flex-col md:flex-row gap-8">
            <div class="md:w-1/3 flex-shrink-0">
                <div class="p-1.5 bg-gray-800 rounded-lg">
                    <img src="${details.poster || 'https://placehold.co/300x420/1f2937/9ca3af?text=Image+Not+Found'}" alt="${details.title}" class="w-full h-auto rounded-lg shadow-md" />
                </div>
                <div class="p-1.5 bg-gray-800 rounded-lg mt-2">
                    <button onclick="handleWatchNowClick('${details.id}')" class="bg-blue-500 text-white font-bold py-2 px-4 rounded-lg w-full hover:bg-blue-600 transition-colors">
                        Watch Now
                    </button>
                </div>
            </div>
            
            <div class="md:w-2/3 pr-4">
                <h1 class="text-3xl font-extrabold text-white mb-2">${details.title}</h1>
                <p class="text-gray-400 mb-4">${details.japanese_title || ''}</p>
                <div class="grid grid-cols-2 gap-4 mb-4 text-gray-300">
                    <div><p class="font-semibold text-white">Released:</p><p>${details.animeInfo.Aired || 'N/A'}</p></div>
                    <div><p class="font-semibold text-white">Status:</p><p>${details.animeInfo.Status || 'N/A'}</p></div>
                    <div><p class="font-semibold text-white">Type:</p><p>${details.showType || 'N/A'}</p></div>
                    <div><p class="font-semibold text-white">Genres:</p><p>${genres}</p></div>
                </div>
                ${summaryHtml}
            </div>
        </div>
    `;

    modalOverlay.classList.remove('hidden');
    modalOverlay.classList.add('flex');
};

const hideInfoModal = () => {
    const modalOverlay = document.getElementById('info-modal-overlay');
    modalOverlay.classList.add('hidden');
    modalOverlay.classList.remove('flex');
    document.getElementById('info-modal-content').innerHTML = '';
    setState({ animeDetailsForModal: null });
};

const SpotlightBanner = (spotlights) => {
    if (!spotlights || spotlights.length === 0) return '';

    const slides = spotlights.map((anime, index) => {
        const genres = anime.genres ? anime.genres.join(', ') : 'N/A';
        const type = anime.showType || 'N/A';
        return `
        <div class="spotlight-slide ${index === 0 ? 'active' : ''}" data-index="${index}" style="background-image: url('${anime.poster}')">
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
            <div class="relative z-10 p-8 md:p-12 lg:p-16 flex flex-col justify-end h-full text-white">
                <h2 class="text-3xl md:text-5xl font-bold mb-4 line-clamp-2">${anime.title}</h2>
                <div class="flex flex-wrap items-center gap-2 text-sm text-gray-300 mb-2">
                    <p class="font-semibold">${type}</p>
                    <span class="text-gray-500">|</span>
                    <p>${genres}</p>
                </div>
                <p class="text-gray-300 md:text-lg mb-6 max-w-2xl line-clamp-3">${anime.description}</p>
                <button onclick="handleSelectAnime('${anime.id}')" class="bg-blue-500 text-white font-bold py-3 px-6 rounded-lg w-fit hover:bg-blue-600 transition-colors">
                    Watch Now
                </button>
            </div>
        </div>
    `}).join('');

    return `
    <section class="relative h-[60vh] md:h-[70vh] rounded-lg overflow-hidden mb-10 group">
        ${slides}
        <button id="spotlight-prev" class="absolute top-1/2 left-4 -translate-y-1/2 bg-black/50 p-2 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity z-20">
             <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <button id="spotlight-next" class="absolute top-1/2 right-4 -translate-y-1/2 bg-black/50 p-2 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity z-20">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
        </button>
    </section>
    `;
};

const SearchBar = () => `
<form id="search-form" class="w-full">
  <div class="relative flex items-center gap-2">
    <input type="search" id="search-input" placeholder="Search for an anime..."
      class="flex-grow w-full p-2 text-sm text-white bg-gray-800 border-2 border-gray-700 rounded-full focus:outline-none focus:border-blue-500 transition-colors"
      oninput="handleSearchInput(this.value)"
      ${state.isLoading ? 'disabled' : ''} />
    <button type="submit" ${state.isLoading ? 'disabled' : ''}
      class="flex-shrink-0 bg-blue-500 text-white p-1.5 rounded-full hover:bg-blue-600 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400">
      <span class="sr-only">Search</span>
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
    </button>
    ${state.searchSuggestions.length > 0 ? `
      <ul id="search-suggestions" class="absolute top-full w-full mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto z-10">
        ${state.searchSuggestions.map(s => `
          <li onclick="handleSelectAnime('${s.id}')" class="p-3 hover:bg-gray-700 cursor-pointer transition-colors">
            <span class="font-bold">${s.title}</span>
          </li>
        `).join('')}
      </ul>
    ` : ''}
  </div>
</form>`;

const AnimeCard = (anime) => {
    const animeTitle = (anime.title).replace(/'/g, "\\'");
    const onclickAction = `handleSelectAnime('${anime.id}')`; 
    return `
    <div onclick="${onclickAction}" class="bg-gray-800 rounded-lg overflow-hidden cursor-pointer group transform hover:-translate-y-1 transition-transform duration-300">
      <div class="relative pb-[140%]">
        <img src="${anime.poster || 'https://placehold.co/300x420/1f2937/9ca3af?text=Image+Not+Found'}"
             alt="${animeTitle}"
             class="absolute top-0 left-0 w-full h-full object-cover group-hover:opacity-75 transition-opacity"
             onerror="this.onerror=null; this.src='https://placehold.co/300x420/1f2937/9ca3af?text=Image+Not+Found';" />
      </div>
      <div class="p-3">
        <h3 class="text-white font-bold text-sm truncate group-hover:text-blue-400 transition-colors">${anime.title}</h3>
      </div>
    </div>`;
};

const renderPagination = () => {
    const source = state.searchResults || state.categoryResults;
    if (!source) return '';
    const hasNextPage = source.hasNextPage;
    return `
    <div class="flex justify-center items-center gap-4 mt-8">
      <button onclick="handlePageChange('prev')" class="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" ${state.currentPage === 1 ? 'disabled' : ''}>&larr; Previous</button>
      <span class="text-white font-semibold">Page ${state.currentPage}</span>
      <button onclick="handlePageChange('next')" class="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" ${!hasNextPage ? 'disabled' : ''}>Next &rarr;</button>
    </div>`;
};

const renderHome = () => {
    document.getElementById('search-bar-container').innerHTML = SearchBar();
    let content = '';
    if (state.isLoading) {
        content = Spinner();
    } else if (state.searchResults) {
        content = `
        <section>
          <h2 class="text-2xl font-bold text-white mb-4">Search Results</h2>
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            ${state.searchResults.results.map(anime => AnimeCard(anime)).join('')}
          </div>
          ${renderPagination()}
        </section>`;
    } else {
        const spotlightsContent = state.homeData.spotlights.length > 0 ? SpotlightBanner(state.homeData.spotlights) : '';
        
        const recentContent = state.homeData.recent.length > 0 
            ? state.homeData.recent.map(anime => AnimeCard(anime)).join('') 
            : '<p class="text-gray-400 col-span-full">No recent releases found.</p>';
        const trendingContent = state.homeData.trending.length > 0 
            ? state.homeData.trending.map(anime => AnimeCard(anime)).join('') 
            : '<p class="text-gray-400 col-span-full">No trending anime found.</p>';

        content = `
        ${spotlightsContent}
        <section>
            <div class="flex items-center gap-2 mb-4">
                <button onclick="switchHomeTab('recent')" class="tab-btn font-semibold py-2 px-4 rounded-lg ${state.homeTab === 'recent' ? 'active' : ''}">Recent Releases</button>
                <button onclick="switchHomeTab('trending')" class="tab-btn font-semibold py-2 px-4 rounded-lg ${state.homeTab === 'trending' ? 'active' : ''}">Top Airing</button>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                ${state.homeTab === 'recent' ? recentContent : trendingContent}
            </div>
        </section>`;
    }
    mainContent.innerHTML = (state.error ? ErrorDisplay(state.error) : '') + content;
    const searchForm = document.getElementById('search-form');
    if (searchForm) searchForm.addEventListener('submit', handleSearchSubmit);
    if (document.getElementById('spotlight-prev')) {
        document.getElementById('spotlight-prev').addEventListener('click', () => { prevSpotlight(); startSpotlightInterval(); });
        document.getElementById('spotlight-next').addEventListener('click', () => { nextSpotlight(); startSpotlightInterval(); });
        startSpotlightInterval();
    }
};

const renderDetailsPage = () => {
    document.getElementById('search-bar-container').innerHTML = '';
    if (state.isLoading || !state.animeDetails) {
        mainContent.innerHTML = Spinner();
        return;
    }

    const details = state.animeDetails;
    const genres = details.animeInfo.Genres ? details.animeInfo.Genres.join(', ') : 'N/A';

    let episodeDropdownHtml = '';
    if (state.animeEpisodes && state.animeEpisodes.length > 0) {
        const episodeOptions = state.animeEpisodes.map(ep => `<option value="${ep.id}" ${ep.id === state.selectedEpisodeId ? 'selected' : ''}>Episode ${ep.episode_no}</option>`).join('');
        episodeDropdownHtml = `<select onchange="handleEpisodeSelection(this.value)" class="bg-gray-700 text-white p-3 rounded-lg w-full md:w-1/2 focus:outline-none focus:ring-2 focus:ring-blue-500">${episodeOptions}</select>`;
    } else {
        episodeDropdownHtml = '<p class="text-gray-400 p-3">No episodes found.</p>';
    }

    let serverDropdownHtml = '';
    if (state.selectedEpisodeId && (state.availableSubServers.length > 0 || state.availableDubServers.length > 0)) {
        const subOptions = state.availableSubServers.map(server => `<option value="${server}|sub">${server} (Sub)</option>`).join('');
        const dubOptions = state.availableDubServers.map(server => `<option value="${server}|dub">${server} (Dub)</option>`).join('');
        serverDropdownHtml = `<select onchange="handleServerSelection(this.value)" class="bg-gray-700 text-white p-3 rounded-lg w-full md:w-1/2 focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="" disabled selected>Select a server</option><optgroup label="Subbed">${subOptions}</optgroup><optgroup label="Dubbed">${dubOptions}</optgroup></select>`;
    }

    const content = `
    <div class="max-w-7xl mx-auto">
        <button onclick="handleGoHome()" class="text-blue-500 hover:text-blue-400 font-bold mb-4 flex items-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>Back to Home</button>
        <div class="flex flex-col lg:flex-row gap-8">
            <div class="lg:w-3/4">
                <div class="bg-gray-800 rounded-lg p-4">
                    <div id="video-player-container" class="mb-4"><div id="video-player" class="w-full aspect-video bg-black rounded-lg overflow-hidden">${!state.selectedEpisodeId ? '<div class="flex items-center justify-center h-full text-gray-400">Please select an episode to begin.</div>' : ''}</div></div>
                    <div class="flex flex-col md:flex-row gap-4">${episodeDropdownHtml}${serverDropdownHtml}</div>
                </div>
            </div>
            <div class="lg:w-1/4">
                <div class="bg-gray-800 rounded-lg overflow-hidden shadow-lg p-4">
                    <div class="flex flex-col gap-4">
                        <div class="flex-shrink-0">
                            <img src="${details.poster || 'https://placehold.co/300x420/1f2937/9ca3af?text=Image+Not+Found'}" alt="${details.title}" class="w-full max-w-[200px] mx-auto h-auto rounded-lg shadow-md" />
                        </div>
                        <div class="flex-grow">
                            <h1 class="text-xl font-extrabold text-white mb-2">${details.title}</h1>
                            <div class="grid grid-cols-1 gap-2 text-sm text-gray-300">
                                <div><p class="font-semibold text-white">Type:</p><p>${details.showType || 'N/A'}</p></div>
                                <div><p class="font-semibold text-white">Status:</p><p>${details.animeInfo.Status || 'N/A'}</p></div>
                                <div><p class="font-semibold text-white">Genres:</p><p>${genres}</p></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
    mainContent.innerHTML = content;
};

const renderCategoryPage = () => {
    document.getElementById('search-bar-container').innerHTML = SearchBar();
    let content = '';
    if (state.isLoading) {
        content = Spinner();
    } else if (state.categoryResults && state.categoryResults.results.length > 0) {
        content = `
        <section>
          <h2 class="text-2xl font-bold text-white mb-4">${state.currentCategoryTitle}</h2>
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            ${state.categoryResults.results.map(anime => AnimeCard(anime)).join('')}
          </div>
          ${renderPagination()}
        </section>`;
    } else {
        content = `<h2 class="text-2xl font-bold text-white mb-4">${state.currentCategoryTitle}</h2><p class="text-gray-400">No anime found in this category.</p>`;
    }
    mainContent.innerHTML = (state.error ? ErrorDisplay(state.error) : '') + content;
    const searchForm = document.getElementById('search-form');
    if (searchForm) searchForm.addEventListener('submit', handleSearchSubmit);
};

// --- App Logic ---
async function fetchHomeData() {
    setState({ isLoading: true, error: null, view: 'home' });
    try {
        const response = await fetch(`${API_BASE}/`);
        if (!response.ok) throw new Error(`Failed to fetch home page data: ${response.statusText}`);
        const data = await response.json();
        const spotlights = data.results.spotlights || [];
        const trending = data.results.topAiring || [];
        const recent = data.results.latestEpisode || [];

        const spotlightDetailsPromises = spotlights.map(async (anime) => {
            try {
                const detailsRes = await fetch(`${API_BASE}/info?id=${anime.id}`);
                if (!detailsRes.ok) return anime;
                const detailsData = await detailsRes.json();
                return { ...anime, showType: detailsData.results.data.showType, genres: detailsData.results.data.animeInfo.Genres };
            } catch (err) {
                console.error(`Failed to fetch details for anime ID ${anime.id}:`, err);
                return anime;
            }
        });
        const detailedSpotlights = await Promise.all(spotlightDetailsPromises);
        setState({ homeData: { spotlights: detailedSpotlights, trending, recent }, isLoading: false });
    } catch (err) {
        console.error(err);
        setState({ error: 'Could not load home anime data.', isLoading: false });
    }
}

async function fetchCategoryResults(endpoint, page = 1) {
    setState({ isLoading: true, error: null, view: 'category', currentPage: page, categoryResults: null });
    try {
        const res = await fetch(`${API_BASE}${endpoint}?page=${page}`);
        if (!res.ok) throw new Error('Failed to fetch category results.');
        const data = await res.json();
        const hasNextPage = data.results.totalPages > page;
        setState({ categoryResults: { results: data.results.data, hasNextPage: hasNextPage }, isLoading: false });
    } catch (err) {
        console.error(err);
        setState({ error: 'Failed to fetch category results.', isLoading: false });
    }
}

async function fetchSearchResults(page = 1) {
    if (!state.lastSearchQuery) return;
    setState({ isLoading: true, error: null, currentPage: page, searchResults: null });
    try {
        const res = await fetch(`${API_BASE}/search?keyword=${state.lastSearchQuery}&page=${page}`);
        if (!res.ok) throw new Error('Failed to fetch search results.');
        const data = await res.json();
        const hasNextPage = data.results.totalPages > page;
        setState({ view: 'home', searchResults: { results: data.results.data, hasNextPage: hasNextPage }, isLoading: false });
    } catch (err) {
        console.error(err);
        setState({ error: 'Failed to fetch search results.', isLoading: false });
    }
}

async function fetchSearchSuggestions(query) {
    try {
        const res = await fetch(`${API_BASE}/search/suggest?keyword=${query}`);
        const data = await res.json();
        if (data.results) setState({ searchSuggestions: data.results });
    } catch (err) {
        console.error("Failed to fetch search suggestions:", err);
    }
}

// --- MODIFICATION: Updated fetchDetailsForPlayer with robust error handling ---
async function fetchDetailsForPlayer(animeId) {
    setState({ isLoading: true, view: 'details' });
    try {
        const [detailsRes, episodesRes] = await Promise.all([
            fetch(`${API_BASE}/info?id=${animeId}`),
            fetch(`${API_BASE}/episodes/${animeId}`)
        ]);

        if (!detailsRes.ok || !episodesRes.ok) {
            throw new Error(`Could not find anime with ID: ${animeId}`);
        }

        const detailsData = await detailsRes.json();
        const episodesData = await episodesRes.json();
        
        if (!detailsData.results?.data?.id || !episodesData.results || !Array.isArray(episodesData.results.episodes)) {
             throw new Error("Invalid or empty data from API.");
        }
        
        const firstEpisodeId = episodesData.results.episodes.length > 0 ? episodesData.results.episodes[0].id : null;
        
        setState({ animeDetails: detailsData.results.data, animeEpisodes: episodesData.results.episodes, selectedEpisodeId: firstEpisodeId });
        
        if (firstEpisodeId) {
            await fetchServersForEpisode(firstEpisodeId);
        } else {
            setState({ isLoading: false });
        }

    } catch (err) {
        console.error(`Failed to load details for ${animeId}:`, err);
        handleGoHome();
    }
}


async function handleServerSelection(selectedValue) {
    if (!selectedValue) return;
    const [serverName, type] = selectedValue.split('|');
    const episodeId = state.selectedEpisodeId;
    if (!serverName || !type || !episodeId) return;

    if (player) player.destroy();
    const playerContainer = document.getElementById('video-player');
    if(playerContainer) playerContainer.innerHTML = Spinner();

    try {
        const watchUrl = `${API_BASE}/stream?id=${episodeId}&server=${serverName}&type=${type}`;
        const watchRes = await fetch(watchUrl);
        const watchData = await watchRes.json();
        if (!watchData.results?.streamingLink?.link?.file) throw new Error('Streaming source not found.');

        const sourceUrl = watchData.results.streamingLink.link.file;
        const proxyUrl = `${PROXY_URL}m3u8-proxy?url=${encodeURIComponent(sourceUrl)}`;
        
        player = new Artplayer({ container: '#video-player', url: proxyUrl, type: 'm3u8', autoplay: true, pip: true, setting: true, fullscreen: true,
            customType: { m3u8: (video, url) => { const hls = new Hls(); hls.loadSource(url); hls.attachMedia(video); } },
        });

    } catch (err) {
        console.error(err);
        if(playerContainer) playerContainer.innerHTML = `<div class="flex items-center justify-center h-full text-red-400 p-4">${err.message}</div>`;
    }
}

async function fetchServersForEpisode(episodeId) {
    if (player) player.destroy();
    setState({ isLoading: true, selectedEpisodeId: episodeId, availableSubServers: [], availableDubServers: [] });
    try {
        const serversRes = await fetch(`${API_BASE}/servers/${episodeId.split('?ep=')[0]}?ep=${episodeId.split('?ep=')[1]}`);
        const serversData = await serversRes.json();
        if (!serversData.results || !Array.isArray(serversData.results)) throw new Error("Invalid server data.");
        
        const subServers = serversData.results.filter(s => s.type === 'sub').map(s => s.serverName);
        const dubServers = serversData.results.filter(s => s.type === 'dub').map(s => s.serverName);
        setState({ availableSubServers: subServers, availableDubServers: dubServers, isLoading: false });
    } catch (err) {
        console.error(err);
        setState({ error: `Failed to fetch servers: ${err.message}`, isLoading: false });
    }
}

async function handleEpisodeSelection(episodeId) {
    await fetchServersForEpisode(episodeId);
}

// --- Event Handlers ---
function handleSearchInput(query) {
    if (query.trim() === '') setState({ searchSuggestions: [] });
    else fetchSearchSuggestions(query);
}

async function handleSelectAnime(animeId) {
    setState({ searchSuggestions: [] });
    renderInfoModal(); 
    try {
        const detailsRes = await fetch(`${API_BASE}/info?id=${animeId}`);
        if (!detailsRes.ok) throw new Error("Failed to fetch anime info.");
        const detailsData = await detailsRes.json();
        setState({ animeDetailsForModal: detailsData.results.data });
        renderInfoModal();
    } catch (err) {
        console.error(err);
        hideInfoModal();
        alert(err.message);
    }
}

function handleWatchNowClick(animeId) {
    hideInfoModal();
    history.pushState({ animeId: animeId }, '', `/anime/${animeId}`);
    fetchDetailsForPlayer(animeId);
}

function handleSearchSubmit(e) {
    e.preventDefault();
    const query = document.getElementById('search-input').value.trim();
    if (!query) return;
    state.lastSearchQuery = query;
    state.currentPage = 1;
    fetchSearchResults(1);
}

function handlePageChange(dir) {
    let newPage = state.currentPage;
    if (dir === 'next') newPage++;
    if (dir === 'prev' && newPage > 1) newPage--;
    if (state.view === 'category' && state.currentCategoryEndpoint) {
        fetchCategoryResults(state.currentCategoryEndpoint, newPage);
    } else if (state.lastSearchQuery) {
        fetchSearchResults(newPage);
    }
}

// --- MODIFICATION: Updated handleGoHome to fully reset state ---
function handleGoHome() {
    if (player) {
        player.destroy();
        player = null;
    }
    history.pushState({}, '', '/');
    setState({
        view: 'home',
        homeTab: 'recent',
        searchResults: null,
        categoryResults: null,
        currentCategoryTitle: null,
        currentCategoryEndpoint: null,
        lastSearchQuery: '',
        selectedAnimeId: null,
        animeDetails: null,
        animeDetailsForModal: null,
        animeEpisodes: [],
        selectedEpisodeId: null,
        availableSubServers: [],
        availableDubServers: [],
        videoSrc: null,
        error: null,
    });
    fetchHomeData();
}


function switchHomeTab(tab) {
    setState({ homeTab: tab });
}

function toggleMenu(show) {
    const menu = document.getElementById('side-menu');
    const overlay = document.getElementById('side-menu-overlay');
    if (show) {
        overlay.classList.remove('hidden');
        menu.classList.remove('-translate-x-full');
    } else {
        overlay.classList.add('hidden');
        menu.classList.add('-translate-x-full');
    }
}

function handleCategoryClick(endpoint, title) {
    state.currentCategoryEndpoint = endpoint;
    state.currentCategoryTitle = title;
    fetchCategoryResults(endpoint, 1);
    toggleMenu(false);
    history.pushState({ category: title, endpoint: endpoint }, '', `/category?type=${encodeURIComponent(title)}`);
}

function initializeMenu() {
    const menuNavLinks = document.getElementById('menu-nav-links');
    menuNavLinks.innerHTML = MENU_ITEMS.map(item =>
        `<a href="#" onclick="${item.endpoint === 'home' ? 'handleGoHome()' : `handleCategoryClick('${item.endpoint}', '${item.title}')`}" class="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-base font-medium">${item.title}</a>`
    ).join('');

    document.getElementById('menu-toggle-btn').addEventListener('click', () => toggleMenu(true));
    document.getElementById('close-menu-btn').addEventListener('click', () => toggleMenu(false));
    document.getElementById('side-menu-overlay').addEventListener('click', () => toggleMenu(false));
}

let spotlightInterval;
function showSpotlight(index) {
    const slides = document.querySelectorAll('.spotlight-slide');
    if (!slides.length) return;
    slides.forEach(slide => slide.classList.remove('active'));
    const newActiveSlide = document.querySelector(`.spotlight-slide[data-index="${index}"]`);
    if (newActiveSlide) newActiveSlide.classList.add('active');
    state.currentSpotlightIndex = index;
}

function nextSpotlight() {
    const newIndex = (state.currentSpotlightIndex + 1) % state.homeData.spotlights.length;
    showSpotlight(newIndex);
}
function prevSpotlight() {
    const newIndex = (state.currentSpotlightIndex - 1 + state.homeData.spotlights.length) % state.homeData.spotlights.length;
    showSpotlight(newIndex);
}
function startSpotlightInterval() {
    clearInterval(spotlightInterval);
    if (state.homeData.spotlights.length > 1) {
        spotlightInterval = setInterval(nextSpotlight, 5000);
    }
}

const handleInitialRoute = () => {
    const path = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);

    if (path.startsWith('/anime/')) {
        const animeId = path.replace('/anime/', '');
        if (animeId) fetchDetailsForPlayer(animeId);
        else handleGoHome();
    } else if (path === '/category') {
        const categoryType = searchParams.get('type');
        const categoryItem = MENU_ITEMS.find(item => item.title === categoryType);
        if (categoryItem) handleCategoryClick(categoryItem.endpoint, categoryItem.title);
        else handleGoHome();
    } else {
        fetchHomeData();
    }
};

window.addEventListener('popstate', handleInitialRoute);

// --- Init ---
initializeMenu();
handleInitialRoute();

