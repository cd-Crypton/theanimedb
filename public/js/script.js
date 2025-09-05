import { state, setState } from './state.js';
import * as api from './api.js';
import * as ui from './ui.js';
import { createPlayer, destroyPlayer } from './player.js';

// --- Global Event Handlers ---
window.handleSelectAnime = async (animeId) => {
    destroyPlayer();
    setState({ view: 'details', isLoading: true });
    ui.renderPage();
    try {
        const { details, episodes } = await api.fetchWatchPageData(animeId);
        setState({ animeDetails: details, animeEpisodes: episodes, isLoading: false });
        ui.renderPage();
        if (episodes.length > 0) {
            handleEpisodeSelection(episodes[0].id);
        }
    } catch (err) {
        setState({ error: err.message, isLoading: false });
        ui.renderPage();
    }
};

window.handleEpisodeSelection = async (episodeId) => {
    ui.setActiveEpisodeButton(episodeId);
    try {
        const servers = await api.fetchServersForEpisode(episodeId);
        const subServers = servers.filter(s => s.type === 'sub').map(s => s.serverName);
        const dubServers = servers.filter(s => s.type === 'dub').map(s => s.serverName);
        ui.renderServerList(episodeId, subServers, dubServers);
        
        const firstServer = subServers.length > 0 ? subServers[0] : dubServers[0];
        if (firstServer) {
            const firstType = subServers.length > 0 ? 'sub' : 'dub';
            handleServerSelection(null, episodeId, firstServer, firstType);
            document.querySelector('#server-selection-container button').classList.add('active-server');
        }
    } catch (err) {
        document.getElementById('server-selection-container').innerHTML = ui.ErrorDisplay(err.message);
    }
};

window.handleServerSelection = (event, episodeId, serverName, type) => {
    if (event) {
        document.querySelectorAll('#server-selection-container button').forEach(btn => btn.classList.remove('active-server'));
        event.target.classList.add('active-server');
    }
    createPlayer(episodeId, serverName, type);
};

window.handleGoHome = () => {
    destroyPlayer();
    setState({ view: 'home', searchResults: null, categoryResults: null, animeDetails: null, animeEpisodes: [] });
    initializeApp();
};

window.handleCategoryClick = async (endpoint, title) => {
    setState({ view: 'category', currentCategoryEndpoint: endpoint, currentCategoryTitle: title, isLoading: true, searchResults: null });
    ui.renderPage();
    try {
        const data = await api.fetchCategoryResults(endpoint, 1);
        const hasNextPage = data.results.totalPages > 1;
        setState({ categoryResults: { results: data.results.data, hasNextPage }, isLoading: false });
    } catch (err) {
        setState({ error: err.message, isLoading: false });
    }
    ui.renderPage();
    ui.toggleMenu(false);
};

window.handleSearchSubmit = (e) => {
    e.preventDefault();
    const query = document.getElementById('search-input').value.trim();
    if (!query) return;
    setState({ lastSearchQuery: query, currentPage: 1 });
    fetchSearchResults(1);
};

async function fetchSearchResults(page) {
    setState({ isLoading: true, searchResults: null });
    ui.renderPage();
    try {
        const data = await api.fetchSearchResults(state.lastSearchQuery, page);
        const hasNextPage = data.results.totalPages > page;
        setState({ searchResults: { results: data.results.data, hasNextPage }, isLoading: false });
    } catch (err) {
        setState({ error: err.message, isLoading: false });
    }
    ui.renderPage();
}

window.handlePageChange = (dir) => {
    let newPage = state.currentPage;
    if (dir === 'next') newPage++;
    if (dir === 'prev' && newPage > 1) newPage--;
    setState({ currentPage: newPage });

    if (state.view === 'category') {
        handleCategoryClick(state.currentCategoryEndpoint, state.currentCategoryTitle);
    } else if (state.view === 'home' && state.lastSearchQuery) {
        fetchSearchResults(newPage);
    }
};

window.handleSearchInput = (query) => {
    if (query.trim() === '') {
        setState({ searchSuggestions: [] });
        ui.renderPage();
        return;
    }
    setTimeout(async () => {
        if (query === document.getElementById('search-input').value.trim()) {
            try {
                const data = await api.fetchSearchSuggestions(query);
                setState({ searchSuggestions: data.results });
                ui.renderPage();
            } catch (err) {
                console.error(err);
            }
        }
    }, 300);
};

window.selectSuggestion = (animeId) => {
    setState({ searchSuggestions: [] });
    handleSelectAnime(animeId);
};


// --- Banner Logic ---
let spotlightInterval;
window.startSpotlightInterval = () => {
    stopSpotlightInterval();
    if (state.homeData.spotlights.length > 1) {
        spotlightInterval = setInterval(window.nextSpotlight, 5000);
    }
}
function stopSpotlightInterval() { clearInterval(spotlightInterval); }
window.nextSpotlight = () => {
    const newIndex = (state.currentSpotlightIndex + 1) % state.homeData.spotlights.length;
    showSpotlight(newIndex);
};
window.prevSpotlight = () => {
    const newIndex = (state.currentSpotlightIndex - 1 + state.homeData.spotlights.length) % state.homeData.spotlights.length;
    showSpotlight(newIndex);
};
function showSpotlight(index) {
    document.querySelectorAll('.spotlight-slide').forEach(slide => slide.classList.remove('active'));
    const newActiveSlide = document.querySelector(`.spotlight-slide[data-index="${index}"]`);
    if (newActiveSlide) newActiveSlide.classList.add('active');
    setState({ currentSpotlightIndex: index });
}


// --- Initialization ---
async function initializeApp() {
    ui.initializeSideMenu();
    setState({ isLoading: true });
    ui.renderPage();
    try {
        const homeData = await api.fetchHomeData();
        setState({ homeData, isLoading: false });
    } catch (err) {
        setState({ error: err.message, isLoading: false });
    }
    ui.renderPage();
}

initializeApp();

