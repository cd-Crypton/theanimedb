import { state, setState, MENU_ITEMS } from './state.js';
import { fetchHomeData, fetchCategoryResults, fetchSearchResults, fetchSearchSuggestions, fetchAnimeDetails } from './api.js';
import { renderHome, renderDetails, renderCategoryPage } from './ui.js';

const player = null;

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
    // Update the URL without reloading the page
    history.pushState({ animeId: animeId }, '', `/anime/${animeId}`);
    fetchAnimeDetails(animeId);
}

export function handleGoHome() {
    if (player && !player.isDisposed()) {
        player.dispose();
        player = null;
    }
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

// --- New Menu Logic ---
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