// --- App Logic ---
const PROXY_URL = 'https://theanimedbproxy.vercel.app/';
const mainContent = document.getElementById('main-content');
const modalContainer = document.getElementById('modal-container');
// The global player instance is now for ArtPlayer.js
let player = null;

// --- State Management ---
let state = {
    view: 'home', // 'home', 'details', or 'category'
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
    animeDetails: null,
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
        renderDetails();
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
          <li onclick="selectSuggestion('${s.id}')" class="p-3 hover:bg-gray-700 cursor-pointer transition-colors">
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
        const trendingContent = state.homeData.trending.length > 0 ? state.homeData.trending.map(anime => AnimeCard(anime)).join('') : '<p class="text-gray-400 col-span-full">No trending anime found.</p>';
        const recentContent = state.homeData.recent.length > 0 ? state.homeData.recent.map(anime => AnimeCard(anime)).join('') : '<p class="text-gray-400 col-span-full">No recent releases found.</p>';
        content = `
        ${spotlightsContent}
        <section class="mb-10">
          <h2 class="text-2xl font-bold text-white mb-4">Top Airing</h2>
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">${trendingContent}</div>
        </section>
        <section>
          <h2 class="text-2xl font-bold text-white mb-4">Recent Releases</h2>
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">${recentContent}</div>
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

const renderDetails = () => {
    if (state.isLoading || !state.animeDetails) {
        modalContainer.innerHTML = Spinner();
        return;
    }
    const details = state.animeDetails;
    const genres = details.animeInfo.Genres ? details.animeInfo.Genres.join(', ') : 'N/A';
    let episodeListHtml = '';
    if (state.animeEpisodes && state.animeEpisodes.length > 0) {
        episodeListHtml = `<h3 class="text-xl font-bold text-white mb-2">Episode List</h3><div class="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 overflow-y-auto max-h-96 custom-scrollbar">${state.animeEpisodes.map(ep => `<button onclick="handleEpisodeSelection('${ep.id}')" class="bg-gray-700 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-500 transition-colors">${ep.episode_no}</button>`).join('')}</div>`;
    } else {
        episodeListHtml = '<p class="text-gray-400">No episodes found.</p>';
    }
    let videoPlayerHtml = '';
    if (state.selectedEpisodeId) {
        videoPlayerHtml = `<div class="flex justify-center mb-8"><div id="video-player" class="w-full lg:w-3/4 aspect-video bg-black rounded-lg overflow-hidden"></div></div>`;
    }
    let serverSelectionHtml = '';
    if (state.selectedEpisodeId) {
        const subServerButtonsHtml = state.availableSubServers.map(server => `<button onclick="handleServerSelection(event, '${state.selectedEpisodeId}', '${server}', 'sub')" class="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors">${server}</button>`).join('');
        const dubServerButtonsHtml = state.availableDubServers.map(server => `<button onclick="handleServerSelection(event, '${state.selectedEpisodeId}', '${server}', 'dub')" class="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors">${server}</button>`).join('');
        serverSelectionHtml = `<div class="mb-8" id="server-selection-container"><h3 class="text-xl font-bold text-white mb-2">Servers</h3>${subServerButtonsHtml.length > 0 ? `<h4 class="text-lg font-semibold text-white mt-4 mb-2">Subbed</h4><div class="flex flex-wrap gap-2">${subServerButtonsHtml}</div>` : ''}${dubServerButtonsHtml.length > 0 ? `<h4 class="text-lg font-semibold text-white mt-4 mb-2">Dubbed</h4><div class="flex flex-wrap gap-2">${dubServerButtonsHtml}</div>` : ''}</div>`;
    }
    const content = `
    <div class="modal bg-gray-900 rounded-lg shadow-lg p-6 w-full max-w-4xl relative modal-content overflow-y-auto">
      <button onclick="closeDetailsModal()" class="modal-close-btn">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <div class="flex flex-col md:flex-row gap-8">
        <div class="md:flex-shrink-0"><img src="${details.poster || 'https://placehold.co/300x420/1f2937/9ca3af?text=Image+Not+Found'}" alt="${details.title}" class="w-full md:w-64 h-auto rounded-lg shadow-md" /></div>
        <div class="flex-grow">
          <h1 class="text-3xl sm:text-4xl font-extrabold text-white mb-2">${details.title}</h1>
          <p class="text-gray-400 mb-4">${details.japanese_title || ''}</p>
          <div class="grid grid-cols-2 gap-4 mb-4 text-gray-300">
            <div><p class="font-semibold text-white">Released:</p><p>${details.animeInfo.Aired || 'N/A'}</p></div>
            <div><p class="font-semibold text-white">Status:</p><p>${details.animeInfo.Status || 'N/A'}</p></div>
            <div><p class="font-semibold text-white">Type:</p><p>${details.showType || 'N/A'}</p></div>
            <div><p class="font-semibold text-white">Genres:</p><p>${genres}</p></div>
          </div>
          <p class="text-gray-300 mb-4"><span class="font-semibold text-white">Summary:</span>${details.animeInfo.Overview || 'No summary available.'}</p>
        </div>
      </div>
      <div class="mt-8">
        ${videoPlayerHtml}
        ${serverSelectionHtml}
        <h2 class="text-2xl font-bold text-white mb-4">Episodes</h2>
        ${episodeListHtml}
      </div>
    </div>`;
    modalContainer.innerHTML = content;
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

        // Fetch detailed info for each spotlight concurrently
        const spotlightDetailsPromises = spotlights.map(async (anime) => {
            try {
                const detailsRes = await fetch(`${API_BASE}/info?id=${anime.id}`);
                if (!detailsRes.ok) throw new Error('Failed to fetch details');
                const detailsData = await detailsRes.json();
                // Merge detailed info into the spotlight object
                return {
                    ...anime,
                    showType: detailsData.results.data.showType,
                    genres: detailsData.results.data.animeInfo.Genres,
                };
            } catch (err) {
                console.error(`Failed to fetch details for anime ID ${anime.id}:`, err);
                return anime; // Return original object if fetch fails
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
        if (data.results) {
            setState({ searchSuggestions: data.results });
        }
    } catch (err) {
        console.error("Failed to fetch search suggestions:", err);
    }
}

async function fetchAnimeDetails(animeId) {
    setState({ isLoading: true, error: null, animeDetails: null, videoSrc: null, selectedEpisodeId: null });
    try {
        const [detailsRes, episodesRes] = await Promise.all([
            fetch(`${API_BASE}/info?id=${animeId}`),
            fetch(`${API_BASE}/episodes/${animeId}`)
        ]);

        const detailsData = await detailsRes.json();
        const episodesData = await episodesRes.json();
        
        if (!episodesData.results || !Array.isArray(episodesData.results.episodes)) {
            throw new Error("Invalid episode data from API.");
        }
        
        setState({
            animeDetails: detailsData.results.data,
            animeEpisodes: episodesData.results.episodes,
            isLoading: false
        });
    } catch (err) {
        console.error(err);
        setState({ error: `Failed to fetch anime details: ${err.message}`, isLoading: false });
    }
}

async function handleServerSelection(event, episodeId, serverName, type) {
    const serverContainer = document.getElementById('server-selection-container');
    if (serverContainer) {
        serverContainer.querySelectorAll('button').forEach(btn => btn.classList.remove('active-server'));
        event.target.classList.add('active-server');
    }

    try {
        if (player) {
            player.destroy();
        }

        const watchUrl = `${API_BASE}/stream?id=${episodeId}&server=${serverName}&type=${type}`;
        const watchRes = await fetch(watchUrl);
        const watchData = await watchRes.json();
        if (!watchData.results?.streamingLink?.link?.file) throw new Error('Streaming source not found for this server.');

        const sourceUrl = watchData.results.streamingLink.link.file;
        const proxyUrl = `${PROXY_URL}m3u8-proxy?url=${encodeURIComponent(sourceUrl)}`;
        const subtitles = watchData.results.streamingLink.tracks || [];

        player = new Artplayer({
            container: '#video-player',
            url: proxyUrl,
            type: 'm3u8',
            autoplay: true,
            pip: true,
            setting: true,
            fullscreen: true,
            customType: {
                m3u8: function (video, url) {
                    const hls = new Hls();
                    hls.loadSource(url);
                    hls.attachMedia(video);
                },
            },
        });

        if (subtitles.length > 0) {
            const captionIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 16 240 240" width="28" height="28"><path d="M215,40H25c-2.7,0-5,2.2-5,5v150c0,2.7,2.2,5,5,5h190c2.7,0,5-2.2,5-5V45C220,42.2,217.8,40,215,40z M108.1,137.7c0.7-0.7,1.5-1.5,2.4-2.3l6.6,7.8c-2.2,2.4-5,4.4-8,5.8c-8,3.5-17.3,2.4-24.3-2.9c-3.9-3.6-5.9-8.7-5.5-14v-25.6c0-2.7,0.5-5.3,1.5-7.8c0.9-2.2,2.4-4.3,4.2-5.9c5.7-4.5,13.2-6.2,20.3-4.6c3.3,0.5,6.3,2,8.7,4.3c1.3,1.3,2.5,2.6,3.5,4.2l-7.1,6.9c-2.4-3.7-6.5-5.9-10.9-5.9c-2.4-0.2-4.8,0.7-6.6,2.3c-1.7,1.7-2.5,4.1-2.4,6.5v25.6C90.4,141.7,102,143.5,108.1,137.7z M152.9,137.7c0.7-0.7,1.5-1.5,2.4-2.3l6.6,7.8c-2.2,2.4-5,4.4-8,5.8c-8,3.5-17.3,2.4-24.3-2.9c-3.9-3.6-5.9-8.7-5.5-14v-25.6c0-2.7,0.5-5.3,1.5-7.8c0.9-2.2,2.4-4.3,4.2-5.9c5.7-4.5,13.2-6.2,20.3-4.6c3.3,0.5,6.3,2,8.7,4.3c1.3,1.3,2.5,2.6,3.5,4.2l-7.1,6.9c-2.4-3.7-6.5-5.9-10.9-5.9c-2.4-0.2-4.8,0.7-6.6,2.3c-1.7,1.7-2.5,4.1-2.4,6.5v25.6C135.2,141.7,146.8,143.5,152.9,137.7z" fill="#fff"></path></svg>`;
            
            const defaultEnglishSub = subtitles.find(sub => sub.label.toLowerCase() === "english" && sub.default) || subtitles.find(sub => sub.label.toLowerCase() === "english");

            player.setting.add({
                name: "captions",
                icon: captionIcon,
                html: "Subtitle",
                tooltip: defaultEnglishSub?.label || "Off",
                position: "right",
                selector: [
                    {
                        html: "Display",
                        switch: true,
                        onSwitch: function (item) {
                            item.tooltip = item.switch ? "Hide" : "Show";
                            player.subtitle.show = !item.switch;
                            return !item.switch;
                        },
                    },
                    ...subtitles.map((sub) => ({
                        default: sub === defaultEnglishSub,
                        html: sub.label,
                        url: sub.file,
                    })),
                ],
                onSelect: function (item) {
                    player.subtitle.switch(item.url, {
                        name: item.html
                    });
                    return item.html;
                },
            });

            if (defaultEnglishSub) {
                player.subtitle.switch(defaultEnglishSub.file, {
                    name: defaultEnglishSub.label,
                });
            }
        }

    } catch (err) {
        console.error(err);
        if (player) {
            player.notice.show(err.message);
        }
    }
}

async function handleEpisodeSelection(episodeId) {
    setState({ isLoading: true, selectedEpisodeId: episodeId, videoSrc: null, error: null, availableSubServers: [], availableDubServers: [] });
    try {
        const serversRes = await fetch(`${API_BASE}/servers/${episodeId.split('?ep=')[0]}?ep=${episodeId.split('?ep=')[1]}`);
        const serversData = await serversRes.json();
        if (!serversData.results || !Array.isArray(serversData.results)) throw new Error("Invalid server data from API.");
        const subServers = serversData.results.filter(s => s.type === 'sub').map(s => s.serverName);
        const dubServers = serversData.results.filter(s => s.type === 'dub').map(s => s.serverName);
        setState({ availableSubServers: subServers, availableDubServers: dubServers, isLoading: false });
    } catch (err) {
        console.error(err);
        setState({ error: `Failed to fetch servers: ${err.message}`, isLoading: false });
    }
}

// --- Event Handlers ---
function handleSearchInput(query) {
    if (query.trim() === '') {
        setState({ searchSuggestions: [] });
        return;
    }
    fetchSearchSuggestions(query);
}

function selectSuggestion(animeId) {
    handleSelectAnime(animeId);
    setState({ searchSuggestions: [] });
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
    } else if (state.view === 'home' && state.lastSearchQuery) {
        fetchSearchResults(newPage);
    }
}

function handleSelectAnime(animeId) {
    showDetailsModal(animeId);
}

function handleGoHome() {
    closeDetailsModal();
    setState({
        view: 'home',
        searchResults: null,
        categoryResults: null,
        currentCategoryTitle: null,
        currentCategoryEndpoint: null,
        lastSearchQuery: '',
        videoSrc: null,
        selectedEpisodeId: null,
        availableSubServers: [],
        availableDubServers: [],
        searchSuggestions: []
    });
    fetchHomeData();
}

// --- Menu Logic ---
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

// --- Banner Logic ---
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
    stopSpotlightInterval();
    if (state.homeData.spotlights.length > 1) {
        spotlightInterval = setInterval(nextSpotlight, 5000);
    }
}
function stopSpotlightInterval() {
    clearInterval(spotlightInterval);
}

// --- Modal Logic ---
async function showDetailsModal(animeId) {
    modalContainer.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    await fetchAnimeDetails(animeId);
    renderDetails();
}

function closeDetailsModal() {
    if (player) {
        player.destroy();
        player = null;
    }
    modalContainer.classList.add('hidden');
    document.body.style.overflow = 'auto';
    modalContainer.innerHTML = '';
}

// --- Init ---
initializeMenu();
fetchHomeData();