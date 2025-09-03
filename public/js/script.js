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

// --- API Base URL (Animepahe) ---
const API_BASE_URL = '/api/anime/animepahe';

// --- Render Functions ---

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
            <button
                type="submit"
                ${state.isLoading ? 'disabled' : ''}
                class="absolute top-1/2 right-4 -translate-y-1/2 text-gray-400 hover:text-white disabled:opacity-50">
                🔍
            </button>
        </div>
    </form>`;

const AnimeCard = (anime) => {
    const animeTitle = anime.title.replace(/'/g, "\\'");
    const onclickAction = `handleSelectAnime('${anime.id}')`;

    return `
    <div
        onclick="${onclickAction}"
        class="bg-gray-800 rounded-lg overflow-hidden cursor-pointer group transform hover:-translate-y-1 transition-transform duration-300">
        <div class="relative pb-[140%]">
            <img
                src="${anime.image}"
                alt="${animeTitle}"
                class="absolute top-0 left-0 w-full h-full object-cover group-hover:opacity-75 transition-opacity"
                onerror="this.onerror=null; this.src='https://placehold.co/300x420/1f2937/9ca3af?text=Image+Not+Found';"
            />
        </div>
        <div class="p-3">
            <h3 class="text-white font-bold text-sm truncate group-hover:text-blue-400 transition-colors">
                ${anime.title}
            </h3>
        </div>
    </div>`;
};

const renderPagination = () => {
    if (!state.searchResults) return '';

    const hasNextPage = state.searchResults.hasNextPage;

    return `
        <div class="flex justify-center items-center gap-4 mt-8">
            <button
                onclick="handlePageChange('prev')"
                class="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                ${state.currentPage === 1 ? 'disabled' : ''}>
                &larr; Previous
            </button>
            <span class="text-white font-semibold">Page ${state.currentPage}</span>
            <button
                onclick="handlePageChange('next')"
                class="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                ${!hasNextPage ? 'disabled' : ''}>
                Next &rarr;
            </button>
        </div>
    `;
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
                    ${state.searchResults.results.map(anime => AnimeCard(anime)).join('')}
                </div>
                ${renderPagination()}
            </section>`;
    } else {
        content = '<p class="text-gray-400 text-center">Search for anime to see results.</p>';
    }
    
    mainContent.innerHTML = SearchBar() + (state.error ? ErrorDisplay(state.error) : '') + content;
    document.getElementById('search-form').addEventListener('submit', handleSearchSubmit);
};

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
            <button onclick="handleBack()" class="bg-blue-500 text-white px-4 py-2 rounded-lg mb-6 hover:bg-blue-600 transition-colors">
                &larr; Back
            </button>
            <h2 class="text-2xl font-bold text-white mb-4">${details.title}</h2>
            <div class="grid gap-2">
                ${details.episodes.map(ep => `
                    <button class="episode-btn bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
                        data-id="${ep.id}">
                        Episode ${ep.number}
                    </button>
                `).join('')}
            </div>
            <div id="video-player" class="mt-6"></div>
        </div>
    `;

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
    if (state.view === 'home') renderHome();
    else if (state.view === 'details') renderDetails();
};

const setState = (newState) => {
    state = { ...state, ...newState };
    updateView();
};

// --- API Calls ---

async function fetchSearchResultsPage(page) {
    const query = state.lastSearchQuery;
    if (!query) return;

    setState({ isLoading: true, error: null, currentPage: page });

    try {
        const response = await fetch(`${API_BASE_URL}/${encodeURIComponent(query)}?page=${page}`);
        if (!response.ok) throw new Error('Search failed');
        const data = await response.json();
        setState({ searchResults: data, isLoading: false });
    } catch (err) {
        console.error(err);
        setState({ error: 'Failed to load search results', isLoading: false });
    }
}

async function handleSearchSubmit(event) {
    event.preventDefault();
    const query = document.getElementById('search-input').value.trim();
    if (!query) return;

    setState({ lastSearchQuery: query, currentPage: 1, isLoading: true, error: null, searchResults: null });
    await fetchSearchResultsPage(1);
}

async function handleSelectAnime(animeId) {
    setState({ view: 'details', selectedAnimeId: animeId, isLoading: true, error: null, animeDetails: null });
    try {
        const response = await fetch(`${API_BASE_URL}/info/${animeId}`);
        if (!response.ok) throw new Error('Failed to fetch anime details');
        const data = await response.json();
        setState({ animeDetails: data, isLoading: false, selectedEpisode: null });
    } catch (err) {
        console.error(err);
        setState({ error: 'Could not load anime details', isLoading: false });
    }
}

async function handleSelectEpisode(episodeId) {
    const playerDiv = document.getElementById('video-player');
    playerDiv.innerHTML = Spinner();

    try {
        const res = await fetch(`${API_BASE_URL}/watch/${episodeId}`);
        if (!res.ok) throw new Error('Failed to fetch episode');
        const data = await res.json();
        const hlsSource = data.sources.find(s => s.isM3U8);
        if (!hlsSource) throw new Error('No playable stream found');

        playerDiv.innerHTML = `<video id="anime-video" class="w-full max-w-3xl mx-auto rounded" controls></video>`;
        const video = document.getElementById('anime-video');

        if (Hls.isSupported()) {
            const hls = new Hls();
            hls.loadSource(hlsSource.url);
            hls.attachMedia(video);
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = hlsSource.url;
        } else {
            playerDiv.innerHTML = `<p class="text-red-500">No playable stream found.</p>`;
        }

        setState({ selectedEpisode: { id: episodeId } });
    } catch (err) {
        console.error(err);
        playerDiv.innerHTML = ErrorDisplay(err.message);
    }
}

function handleBack() {
    setState({
        view: 'home',
        selectedAnimeId: null,
        animeDetails: null,
        selectedEpisode: null,
    });
}

// --- Initial Load ---
setState({ view: 'home', isLoading: false });
