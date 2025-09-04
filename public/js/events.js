import { state, setState, MENU_ITEMS } from './state.js';
import { fetchHomeData, fetchCategoryResults, fetchSearchResults, fetchSearchSuggestions, fetchAnimeDetails } from './api.js';
import { renderHome, renderDetails, renderCategoryPage } from './ui.js';

const PROXY_URL = 'https://theanimedbproxy.vercel.app/';

// --- Event Handlers ---
export function handleSearchInput(query) {
    if (query.trim() === '') {
        setState({ searchSuggestions: [] });
        return;
    }
    fetchSearchSuggestions(query);
}

export function selectSuggestion(animeId) {
    handleSelectAnime(animeId);
    setState({ searchSuggestions: [] });
}

export function handleSearchSubmit(e) {
    e.preventDefault();
    const query = document.getElementById('search-input').value.trim();
    if (!query) return;
    state.lastSearchQuery = query;
    state.currentPage = 1;
    fetchSearchResults(1);
}

export function handlePageChange(dir) {
    let newPage = state.currentPage;
    if (dir === 'next') newPage++;
    if (dir === 'prev' && newPage > 1) newPage--;
    if (state.view === 'category' && state.currentCategoryEndpoint) {
        fetchCategoryResults(state.currentCategoryEndpoint, newPage);
    } else if (state.view === 'home' && state.lastSearchQuery) {
        fetchSearchResults(newPage);
    }
}

export function handleSelectAnime(animeId) {
    state.selectedAnimeId = animeId;
    history.pushState({ animeId: animeId }, '', `/anime/${animeId}`);
    fetchAnimeDetails(animeId);
}

export function handleGoHome() {
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
    history.pushState({}, '', '/');
}

export async function handleEpisodeSelection(episodeId) {
    setState({ isLoading: true, selectedEpisodeId: episodeId, videoSrc: null, error: null, availableSubServers: [], availableDubServers: [] });
    try {
        const serversRes = await fetch(`https://crypton-api.vercel.app/api/servers/${episodeId.split('?ep=')[0]}?ep=${episodeId.split('?ep=')[1]}`);
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

export async function handleServerSelection(event, episodeId, serverName, type) {
    const serverContainer = document.getElementById('server-selection-container');
    if (serverContainer) {
        serverContainer.querySelectorAll('button').forEach(btn => btn.classList.remove('active-server'));
        event.target.classList.add('active-server');
    }
    try {
        const player = videojs('video-player');
        if (player && !player.isDisposed()) {
            player.loadingSpinner.show();
            player.error(null);
        }
        const watchUrl = `https://crypton-api.vercel.app/api/stream?id=${episodeId}&server=${serverName}&type=${type}`;
        const watchRes = await fetch(watchUrl);
        const watchData = await watchRes.json();
        if (!watchData.results?.streamingLink?.link?.file) throw new Error('Streaming source not found for this server.');
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
                player.loadingSpinner.hide();
                player.play().catch(err => { console.error("Video.js play failed:", err); player.error({ code: 4, message: "Playback was prevented by the browser." }) });
            });
        }
    } catch (err) {
        console.error(err);
        const player = videojs('video-player');
        if (player && !player.isDisposed()) {
            player.error({ code: 4, message: err.message });
        }
    }
}

// --- Menu Logic ---
export function toggleMenu(show) {
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

export function handleCategoryClick(endpoint, title) {
    state.currentCategoryEndpoint = endpoint;
    state.currentCategoryTitle = title;
    fetchCategoryResults(endpoint, 1);
    toggleMenu(false);
    history.pushState({ category: title, endpoint: endpoint }, '', `/category?type=${encodeURIComponent(title)}`);
}

export function initializeMenu() {
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
export function showSpotlight(index) {
    const slides = document.querySelectorAll('.spotlight-slide');
    if (!slides.length) return;
    slides.forEach(slide => slide.classList.remove('active'));
    const newActiveSlide = document.querySelector(`.spotlight-slide[data-index="${index}"]`);
    if (newActiveSlide) newActiveSlide.classList.add('active');
    state.currentSpotlightIndex = index;
}

export function nextSpotlight() {
    const newIndex = (state.currentSpotlightIndex + 1) % state.homeData.spotlights.length;
    showSpotlight(newIndex);
}
export function prevSpotlight() {
    const newIndex = (state.currentSpotlightIndex - 1 + state.homeData.spotlights.length) % state.homeData.spotlights.length;
    showSpotlight(newIndex);
}
export function startSpotlightInterval() {
    stopSpotlightInterval();
    if (state.homeData.spotlights.length > 1) {
        spotlightInterval = setInterval(nextSpotlight, 5000);
    }
}
export function stopSpotlightInterval() {
    clearInterval(spotlightInterval);
}

// --- Initial Routing ---
export const handleInitialRoute = () => {
    const path = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);

    if (path.startsWith('/anime/')) {
        const animeId = path.replace('/anime/', '');
        if (animeId) {
            fetchAnimeDetails(animeId);
        } else {
            handleGoHome();
        }
    } else if (path === '/category') {
        const categoryType = searchParams.get('type');
        const categoryItem = MENU_ITEMS.find(item => item.title === categoryType);
        if (categoryItem) {
            handleCategoryClick(categoryItem.endpoint, categoryItem.title);
        } else {
            handleGoHome();
        }
    } else {
        fetchHomeData();
    }
};

// Handle back/forward button clicks
window.addEventListener('popstate', () => {
    handleInitialRoute();
});