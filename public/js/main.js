import { state, MENU_ITEMS } from './state.js';
import * as api from './api.js';
import * as ui from './ui.js';
import { createHandlers } from './handlers.js';

// --- Global Elements & Player Manager ---
const mainContent = document.getElementById('main-content');
let player = null;

const playerManager = {
    get: () => player,
    set: (newInstance) => { player = newInstance; },
    destroy: () => {
        if (player) {
            player.destroy();
            player = null;
        }
    }
};

// --- State Management & Rendering ---
const setState = (newState, options = {}) => {
    Object.assign(state, newState);

    if (state.view === 'home') {
        ui.renderHome(mainContent);
    } else if (state.view === 'details') {
        ui.renderDetailsPage(mainContent);
    } else if (state.view === 'category') {
        ui.renderCategoryPage(mainContent);
    }

    if (options.focusSearch) {
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.focus();
            const len = searchInput.value.length;
            searchInput.setSelectionRange(len, len);
        }
    }
};

// --- Handlers ---
const handlers = createHandlers(state, setState, api, playerManager);

// Expose handlers and UI functions to global scope for onclick attributes
const functionsToExpose = {
    ...handlers,
    ...ui
};
Object.keys(functionsToExpose).forEach(key => {
    window[key] = functionsToExpose[key];
});

// --- Initialization & Routing ---
const handleInitialRoute = () => {
    const path = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);

    if (path.startsWith('/anime/')) {
        const animeId = path.replace('/anime/', '');
        if (animeId) {
            // This logic is now inside handleWatchNowClick to avoid duplication
            handlers.handleWatchNowClick(animeId);
        } else {
            handlers.handleGoHome();
        }
    } else if (path === '/category') {
        const categoryType = searchParams.get('type');
        const categoryItem = MENU_ITEMS.find(item => item.title === categoryType);
        if (categoryItem) {
            handlers.handleCategoryClick(categoryItem.endpoint, categoryItem.title);
        } else {
            handlers.handleGoHome();
        }
    } else {
        handlers.handleGoHome();
    }
};

window.addEventListener('popstate', (event) => {
    // Re-run routing logic when user uses browser back/forward
    handleInitialRoute();
});

// --- Init ---
ui.initializeMenu();
handleInitialRoute();