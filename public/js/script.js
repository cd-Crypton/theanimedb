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
    selectedEpisode: null,
    isLoading: true,
    error: null,
};

// --- API Base URL ---
const API_BASE_URL = '/api/anime/animepahe';

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
        <input
            type="search"
            id="search-input"
            placeholder="Search for an anime..."
            class="w-full p-4 pr-12 text-lg text-white bg-gray-800 border-2 border-gray-700 rounded-full focus:outline-none focus:border-blue-500 transition-colors"
            ${state.isLoading ? 'disabled' : ''}
        />
        <button type="submit" ${state.isLoading ? 'disabled' : ''}
            class="absolute top-1/2 right-4 -translate-y-1/2 text-gray-400 hover:text-white disabled:opacity-50">
            🔍
        </button>
    </div>
</form>`;

const AnimeCard = (anime) => {
    const animeTitle = anime.title || 'Unknown Title';
    const imgSrc = anime.image || 'https://placehold.co/300x420/1f2937/9ca3af?text=No+Image';
    const onclickAction = `handleSelectAnime('${anime.id}')`;

    return `
    <div onclick="${onclickAction}" class="bg-gray-800 rounded-lg overflow-hidden cursor-pointer group transform hover:-translate-y-1 transition-transform duration-300">
        <div class="relative pb-[140%]">
            <img src="${imgSrc}" alt="${animeTitle}"
                class="absolute top-0 left-0 w-full h-full object-cover group-hover:opacity-75 transition-opacity"
                onerror="this.onerror=null; this.src='https://placehold.co/300x420/1f2937/9ca3af?text=No+Image';"
            />
        </div>
        <div class="p-3">
            <h3 class="text-white font-bold text-sm truncate group-hover:text-blue-400 transition-colors">${animeTitle}</h3>
        </div>
    </div>`;
};

const renderPagination = () => {
    if (!state.searchResults) return '';
    const hasNextPage = state.searchResults.hasNextPage;

    return `
    <div class="flex justify-center items-center gap-4 mt-8">
        <button onclick="handlePageChange('prev')" class="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            ${state.currentPage === 1 ? 'disabled' : ''}>&larr; Previous</button>
        <span class="text-white font-semibold">Page ${state.currentPage}</span>
        <button onclick="handlePageChange('next')" class="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            ${!hasNextPage ? 'disabled' : ''}>Next &rarr;</button>
    </div>`;
};

// --- Render Home ---
const renderHome = () => {
    let content = '';

    if (state.isLoading) {
        content = Spinner();
    } else {
        // Trending Section
        const trendingContent = state.homeData.trending.length
            ? state.homeData.trending.map(anime => AnimeCard(anime)).join('')
            : '<p class="text-gray-400 col-span-full">No trending anime found.</p>';

        // Recent Releases
        const recentContent = state.homeData.recent.length
            ? state.homeData.recent.map(anime => AnimeCard(anime)).join('')
            : '<p class="text-gray-400 col-span-full">No recent episodes found.</p>';

        // Search Results
        let searchContent = '';
        if (state.searchResults) {
            searchContent = `
            <section>
                <h2 class="text-2xl font-bold text-white mb-4">Search Results</h2>
                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    ${state.searchResults.results.map(anime => AnimeCard(anime)).join('')}
                </div>
                ${renderPagination()}
            </section>`;
        }

        content = `
        <section class="mb-10">
            <h2 class="text-2xl font-bold text-white mb-4">Trending Now</h2>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">${trendingContent}</div>
        </section>
        <section class="mb-10">
            <h2 class="text-2xl font-bold text-white mb-4">Recent Releases</h2>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">${recentContent}</div>
        </section>
        ${searchContent}`;
    }

    mainContent.innerHTML = SearchBar() + (state.error ? ErrorDisplay(state.error) : '') + content;
    document.getElementById('search-form')?.addEventListener('submit', handleSearchSubmit);
};

// --- Render Details ---
const renderDetails = () => {
    if (state.isLoading && !state.animeDetails) {
        mainContent.innerHTML = Spinner();
        return;
    }
    if (state.error) {
        mainContent.innerHTML = ErrorDisplay(state.error);
        return;
    }
    if (!state.animeDetails) {
        mainContent.innerHTML = `<p class="text-white text-center">No details found.</p>`;
        return;
    }

    const details = state.animeDetails;
    const selectedEp = state.selectedEpisode;

    mainContent.innerHTML = `
    <div>
        <button onclick="handleBack()" class="bg-blue-500 text-white px-4 py-2 rounded-lg mb-6 hover:bg-blue-600 transition-colors">&larr; Back</button>
        <h2 class="text-2xl font-bold text-white mb-4">${details.title}</h2>
        <div class="grid gap-2">
            ${details.episodes.map(ep => `
                <button class="episode-btn bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded" data-id="${ep.id}">
                    Episode ${ep.number}
                </button>
            `).join('')}
        </div>
        <div id="video-player" class="mt-6"></div>
    </div>`;

    document.querySelectorAll('.episode-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const episodeId = btn.dataset.id;
            await handleSelectEpisode(episodeId);
        });
    });
};

// --- App Logic ---
const updateView = () => {
    window.scrollTo(0, 0);
    state.view === 'home' ? renderHome() : renderDetails();
};

const setState = (newState) => {
    state = { ...state, ...newState };
    updateView();
};

// --- API Calls ---
async function fetchHomeData() {
    setState({ isLoading: true, error: null });
    try {
        const [trendingRes, recentRes] = await Promise.all([
            fetch(`${API_BASE_URL}/trending?page=1`),
            fetch(`${API_BASE_URL}/recent-episodes?page=1&type=1`)
        ]);
        const trendingData = await trendingRes.json();
        const recentData = await recentRes.json();
        setState({
            homeData: { trending: trendingData.results || [], recent: recentData.results || [] },
            isLoading: false
        });
    } catch (err) {
        console.error(err);
        setState({ error: 'Could not load trending or recent data.', isLoading: false });
    }
}

async function fetchSearchResultsPage(page) {
    if (!state.lastSearchQuery) return;
    setState({ isLoading: true, error: null, currentPage: page });
    try {
        const res = await fetch(`${API_BASE_URL}/${encodeURIComponent(state.lastSearchQuery)}?page=${page}`);
        if (!res.ok) throw new Error('Search failed');
        const data = await res.json();
        setState({ searchResults: data, isLoading: false });
    } catch (err) {
        console.error(err);
        setState({ error: 'Failed to load search results', isLoading: false });
    }
}

async function handleSearchSubmit(e) {
    e.preventDefault();
    const query = document.getElementById('search-input').value.trim();
    if (!query) return;
    setState({ lastSearchQuery: query, currentPage: 1, searchResults: null, isLoading: true, error: null });
    await fetchSearchResultsPage(1);
}

async function handleSelectAnime(animeId) {
    setState({ view: 'details', selectedAnimeId: animeId, isLoading: true, error: null, animeDetails: null });
    try {
        const res = await fetch(`${API_BASE_URL}/info/${animeId}`);
        if (!res.ok) throw new Error('Failed to fetch anime details');
        const data = await res.json();
        setState({ animeDetails: data, isLoading: false });
    } catch (err) {
        console.error(err);
        setState({ error: 'Failed to fetch anime details', isLoading: false });
    }
}

async function handleSelectEpisode(episodeId) {
    const container = document.getElementById('video-player');
    container.innerHTML = Spinner();
    try {
        const res = await fetch(`${API_BASE_URL}/watch/${episodeId}`);
        if (!res.ok) throw new Error('Failed to fetch episode');
        const data = await res.json();
        const hlsSource = data.sources.find(s => s.isM3U8);
        if (!hlsSource) throw new Error('No playable stream found');

        container.innerHTML = `<video id="hls-video" controls class="w-full rounded" playsinline></video>`;
        const video = document.getElementById('hls-video');
        if (Hls.isSupported()) {
            const hls = new Hls();
            hls.loadSource(hlsSource.url);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = hlsSource.url;
            video.addEventListener('loadedmetadata', () => video.play().catch(() => {}));
        }
    } catch (err) {
        console.error(err);
        container.innerHTML = ErrorDisplay(err.message);
    }
}

function handlePageChange(direction) {
    let newPage = state.currentPage;
    if (direction === 'next') newPage++;
    else if (direction === 'prev' && state.currentPage > 1) newPage--;
    fetchSearchResultsPage(newPage);
}

function handleBack() {
    setState({ view: 'home', selectedAnimeId: null, animeDetails: null, selectedEpisode: null });
}

// --- Initial Load ---
fetchHomeData();
