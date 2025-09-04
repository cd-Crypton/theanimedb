// --- App Logic ---
const PROXY_URL = 'https://theanimedbproxy.vercel.app/';
const mainContent = document.getElementById('main-content');
// The global player instance is now for Video.js
let player = null; 

// --- State Management ---
let state = {
    view: 'home', // 'home' or 'details'
    homeData: { trending: [], recent: [] },
    searchResults: null,
    searchSuggestions: [], // New state variable for search suggestions
    lastSearchQuery: '',
    currentPage: 1,
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

// --- API Base URL pointing to the new instance ---
const API_BASE = 'https://crypton-api.vercel.app/api/';

const SERVERS = ['vidcloud', 'megacloud'];

// --- Render Helpers ---
const Spinner = () => `
<div class="flex justify-center items-center h-full w-full py-16">
  <div class="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
</div>`;

// This is no longer needed for player errors, but we'll keep it for other errors.
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
<form id="search-form" class="w-full max-w-2xl mx-auto">
  <div class="relative">
    <input type="search" id="search-input" placeholder="Search for an anime..."
      class="w-full p-4 pr-12 text-lg text-white bg-gray-800 border-2 border-gray-700 rounded-full focus:outline-none focus:border-blue-500 transition-colors"
      oninput="handleSearchInput(this.value)"
      ${state.isLoading ? 'disabled' : ''} />
    <button type="submit" ${state.isLoading ? 'disabled' : ''}
      class="absolute top-1/2 right-4 -translate-y-2/2 text-gray-400 hover:text-white disabled:opacity-50">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
    </button>
  </div>
  ${state.searchSuggestions.length > 0 ? `
    <ul id="search-suggestions" class="absolute w-full mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto z-10">
      ${state.searchSuggestions.map(s => `
        <li onclick="selectSuggestion('${s.id}')" class="p-3 hover:bg-gray-700 cursor-pointer transition-colors">
          <span class="font-bold">${s.title}</span>
        </li>
      `).join('')}
    </ul>
  ` : ''}
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
    const searchBarContainer = document.getElementById('search-bar-container');
    searchBarContainer.innerHTML = SearchBar();

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
};

const renderDetails = () => {
    document.getElementById('search-bar-container').innerHTML = '';
    if (state.isLoading || !state.animeDetails) {
        mainContent.innerHTML = Spinner();
        return;
    }

    const details = state.animeDetails;
    const genres = details.animeInfo.Genres ? details.animeInfo.Genres.join(', ') : 'N/A';

    let episodeListHtml = '';
    if (state.animeEpisodes && state.animeEpisodes.length > 0) {
        episodeListHtml = `
            <h3 class="text-xl font-bold text-white mb-2">Episode List</h3>
            <div class="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 overflow-y-auto max-h-96 custom-scrollbar">
                ${state.animeEpisodes.map(ep => `<button onclick="handleEpisodeSelection('${ep.id}')" class="bg-gray-700 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-500 transition-colors">${ep.episode_no}</button>`).join('')}
            </div>
        `;
    } else {
        episodeListHtml = '<p class="text-gray-400">No episodes found.</p>';
    }

    let videoPlayerHtml = '';
    if (state.selectedEpisodeId) {
        videoPlayerHtml = `
            <div class="flex justify-center mb-8">
                <div class="w-full lg:w-3/4 aspect-video bg-black rounded-lg overflow-hidden">
                    <video id="video-player" class="video-js vjs-theme-city vjs-big-play-centered" controls preload="auto" width="640" height="360"></video>
                </div>
            </div>
        `;
    }
    
    // Server selection will now always be visible when an episode is selected
    let serverSelectionHtml = '';
    if (state.selectedEpisodeId) {
        const subServerButtonsHtml = state.availableSubServers.map(server => `<button onclick="handleServerSelection(event, '${state.selectedEpisodeId}', '${server}', 'sub')" class="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors">${server}</button>`).join('');
        const dubServerButtonsHtml = state.availableDubServers.map(server => `<button onclick="handleServerSelection(event, '${state.selectedEpisodeId}', '${server}', 'dub')" class="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors">${server}</button>`).join('');
        
        serverSelectionHtml = `
            <div class="mb-8" id="server-selection-container">
                <h3 class="text-xl font-bold text-white mb-2">Servers</h3>
                ${subServerButtonsHtml.length > 0 ? `<h4 class="text-lg font-semibold text-white mt-4 mb-2">Subbed</h4><div class="flex flex-wrap gap-2">${subServerButtonsHtml}</div>` : ''}
                ${dubServerButtonsHtml.length > 0 ? `<h4 class="text-lg font-semibold text-white mt-4 mb-2">Dubbed</h4><div class="flex flex-wrap gap-2">${dubServerButtonsHtml}</div>` : ''}
            </div>`;
    }

    const content = `
    <div class="max-w-4xl mx-auto">
        <button onclick="handleGoHome()" class="text-blue-500 hover:text-blue-400 font-bold mb-4 flex items-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>Back to Home</button>
        <div class="flex flex-col md:flex-row gap-8 bg-gray-800 rounded-lg overflow-hidden shadow-lg p-6">
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
            ${state.error ? ErrorDisplay(state.error) : ''}
            <h2 class="text-2xl font-bold text-white mb-4">Episodes</h2>
            ${episodeListHtml}
        </div>
    </div>`;

    mainContent.innerHTML = content;

    if (document.getElementById('video-player')) {
        if (player && !player.isDisposed()) {
            player.dispose();
        }
        player = videojs('video-player');
    }
};

// --- App Logic ---
const setState = (newState) => {
    state = { ...state, ...newState };
    if (state.view === 'home') {
        renderHome();
    } else if (state.view === 'details') {
        renderDetails();
    }
};

async function fetchHomeData() {
    setState({ isLoading: true, error: null, view: 'home' });
    try {
        const [topAiringRes, recentlyUpdatedRes] = await Promise.all([
            fetch(`${API_BASE}top-airing`),
            fetch(`${API_BASE}recently-updated`)
        ]);

        const topAiringData = await topAiringRes.json();
        const recentlyUpdatedData = await recentlyUpdatedRes.json();

        const trending = topAiringData.results.data || [];
        const recent = recentlyUpdatedData.results.data || [];
        
        setState({ homeData: { trending, recent }, isLoading: false });
    } catch (err) {
        console.error(err);
        setState({ error: 'Could not load home anime data.', isLoading: false });
    }
}

async function fetchSearchResults(page = 1) {
    if (!state.lastSearchQuery) return;
    setState({ isLoading: true, error: null, currentPage: page, view: 'home' });
    try {
        const res = await fetch(`${API_BASE}search?keyword=${state.lastSearchQuery}&page=${page}`);
        const data = await res.json();
        const hasNextPage = data.results.totalPages > page;
        setState({ searchResults: { results: data.results.data, hasNextPage: hasNextPage }, isLoading: false });
    } catch (err) {
        console.error(err);
        setState({ error: 'Failed to fetch search results.', isLoading: false });
    }
}

async function fetchAnimeDetails(animeId) {
    setState({ isLoading: true, error: null, view: 'details', animeDetails: null, videoSrc: null, selectedEpisodeId: null });
    try {
        const detailsRes = await fetch(`${API_BASE}info?id=${animeId}`);
        const detailsData = await detailsRes.json();

        const episodesRes = await fetch(`${API_BASE}episodes/${animeId}`);
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

async function handleEpisodeSelection(episodeId) {
    setState({ isLoading: true, selectedEpisodeId: episodeId, videoSrc: null, error: null, availableSubServers: [], availableDubServers: [] });
    try {
        const serversRes = await fetch(`${API_BASE}servers/${episodeId.split('?ep=')[0]}?ep=${episodeId.split('?ep=')[1]}`);
        const serversData = await serversRes.json();
        
        if (!serversData.results || !Array.isArray(serversData.results)) {
            throw new Error("Invalid server data from API.");
        }

        const subServers = serversData.results.filter(s => s.type === 'sub').map(s => s.serverName);
        const dubServers = serversData.results.filter(s => s.type === 'dub').map(s => s.serverName);

        setState({ 
            availableSubServers: subServers, 
            availableDubServers: dubServers, 
            isLoading: false 
        });
    } catch (err) {
        console.error(err);
        setState({ error: `Failed to fetch servers: ${err.message}`, isLoading: false });
    }
}

async function handleServerSelection(event, episodeId, serverName, type) {
    const serverContainer = document.getElementById('server-selection-container');
    if (serverContainer) {
        // Remove active class from all buttons
        serverContainer.querySelectorAll('button').forEach(btn => btn.classList.remove('active-server'));
        // Add active class to the clicked button
        event.target.classList.add('active-server');
    }

    try {
        if (player && !player.isDisposed()) {
             // Show a loading spinner inside the player
            player.loadingSpinner.show();
            player.error(null); // Clear previous errors
        }

        const watchUrl = `${API_BASE}stream?id=${episodeId}&server=${serverName}&type=${type}`;
        const watchRes = await fetch(watchUrl);
        const watchData = await watchRes.json();

        if (!watchData.results?.streamingLink?.link?.file) {
            throw new Error('Streaming source not found for this server.');
        }

        const sourceUrl = watchData.results.streamingLink.link.file;
        const proxyUrl = `${PROXY_URL}m3u8-proxy?url=${encodeURIComponent(sourceUrl)}`;

        if (player && !player.isDisposed()) {
            player.on('error', () => {
                const error = player.error();
                console.error('Video.js Player Error:', error);
                player.error({ code: 4, message: `The stream from ${serverName} failed to load. Please try another server.` });
            });

            player.src({ src: proxyUrl, type: 'application/x-mpegURL' });

            player.one('loadedmetadata', () => {
                player.loadingSpinner.hide(); // Hide spinner on load
                player.play().catch(err => {
                    console.error("Video.js play failed:", err);
                    player.error({code: 4, message: "Playback was prevented by the browser."})
                });
            });
        }
    } catch (err) {
        console.error(err);
        if (player && !player.isDisposed()) {
            player.error({ code: 4, message: err.message });
        }
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

async function fetchSearchSuggestions(query) {
  try {
    const res = await fetch(`${API_BASE}search/suggest?keyword=${query}`);
    const data = await res.json();
    if (data.results) {
        setState({ searchSuggestions: data.results });
    }
  } catch(err) {
    console.error("Failed to fetch search suggestions:", err);
  }
}

function handleSelectAnime(animeId){
    state.selectedAnimeId = animeId;
    fetchAnimeDetails(animeId);
}

function handleGoHome(){
    if (player && !player.isDisposed()) {
        player.dispose();
        player = null;
    }
    setState({ view:'home', searchResults: null, lastSearchQuery: '', videoSrc: null, selectedEpisodeId: null, availableSubServers: [], availableDubServers: [], searchSuggestions: [] });
    fetchHomeData();
}

// --- Init ---
fetchHomeData();
