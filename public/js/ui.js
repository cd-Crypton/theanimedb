import { state } from './state.js';
import { MENU_ITEMS } from './config.js';

export const Spinner = () => `<div class="flex justify-center items-center h-full w-full py-16"><div class="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div></div>`;
export const ErrorDisplay = (message) => `<div class="text-center p-4 bg-red-900/50 text-red-300 rounded-lg max-w-2xl mx-auto my-4"><p class="font-bold">An Error Occurred</p><p>${message}</p></div>`;

const SpotlightBanner = (spotlights) => {
    if (!spotlights || spotlights.length === 0) return '';
    const slides = spotlights.map((anime, index) => `
        <div class="spotlight-slide ${index === 0 ? 'active' : ''}" data-index="${index}" style="background-image: url('${anime.poster}')">
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
            <div class="relative z-10 p-8 md:p-12 lg:p-16 flex flex-col justify-end h-full text-white">
                <h2 class="text-3xl md:text-5xl font-bold mb-4 line-clamp-2">${anime.title}</h2>
                <div class="flex flex-wrap items-center gap-2 text-sm text-gray-300 mb-2">
                    <p class="font-semibold">${anime.showType || 'N/A'}</p><span class="text-gray-500">|</span><p>${anime.genres ? anime.genres.join(', ') : 'N/A'}</p>
                </div>
                <p class="text-gray-300 md:text-lg mb-6 max-w-2xl line-clamp-3">${anime.description || ''}</p>
                <button onclick="handleSelectAnime('${anime.id}')" class="bg-blue-500 text-white font-bold py-3 px-6 rounded-lg w-fit hover:bg-blue-600 transition-colors">Watch Now</button>
            </div>
        </div>`).join('');
    return `<section class="relative h-[60vh] md:h-[70vh] rounded-lg overflow-hidden mb-10 group">${slides}
        <button id="spotlight-prev" class="absolute top-1/2 left-4 -translate-y-1/2 bg-black/50 p-2 rounded-full text-white opacity-0 group-hover:opacity-100"><svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg></button>
        <button id="spotlight-next" class="absolute top-1/2 right-4 -translate-y-1/2 bg-black/50 p-2 rounded-full text-white opacity-0 group-hover:opacity-100"><svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg></button>
    </section>`;
};

const SearchBar = () => `
<form id="search-form" class="w-full">
  <div class="relative flex items-center gap-2">
    <input type="search" id="search-input" placeholder="Search..." class="flex-grow w-full p-2 text-sm text-white bg-gray-800 border-2 border-gray-700 rounded-full focus:outline-none focus:border-blue-500" oninput="handleSearchInput(this.value)" ${state.isLoading ? 'disabled' : ''} />
    <button type="submit" ${state.isLoading ? 'disabled' : ''} class="flex-shrink-0 bg-blue-500 text-white p-1.5 rounded-full hover:bg-blue-600 disabled:opacity-50"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg></button>
    ${state.searchSuggestions.length > 0 ? `<ul id="search-suggestions" class="absolute top-full w-full mt-2 bg-gray-800 border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto z-10">${state.searchSuggestions.map(s => `<li onclick="selectSuggestion('${s.id}')" class="p-3 hover:bg-gray-700 cursor-pointer"><span class="font-bold">${s.title}</span></li>`).join('')}</ul>` : ''}
  </div>
</form>`;

const AnimeCard = (anime) => `<div onclick="handleSelectAnime('${anime.id}')" class="bg-gray-800 rounded-lg overflow-hidden cursor-pointer group transform hover:-translate-y-1 transition-transform">
      <div class="relative pb-[140%]"><img src="${anime.poster || ''}" alt="${anime.title}" class="absolute top-0 left-0 w-full h-full object-cover" onerror="this.onerror=null; this.src='https://placehold.co/300x420/1f2937/9ca3af?text=Image+Not+Found';"/></div>
      <div class="p-3"><h3 class="text-white font-bold text-sm truncate group-hover:text-blue-400">${anime.title}</h3></div>
    </div>`;

const renderPagination = () => {
    const source = state.searchResults || state.categoryResults;
    if (!source) return '';
    const hasNextPage = source.hasNextPage;
    return `<div class="flex justify-center items-center gap-4 mt-8">
      <button onclick="handlePageChange('prev')" class="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 disabled:opacity-50" ${state.currentPage === 1 ? 'disabled' : ''}>&larr; Previous</button>
      <span class="text-white font-semibold">Page ${state.currentPage}</span>
      <button onclick="handlePageChange('next')" class="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50" ${!hasNextPage ? 'disabled' : ''}>Next &rarr;</button>
    </div>`;
};

function renderHomePage(container) {
    document.getElementById('search-bar-container').innerHTML = SearchBar();
    let content;
    if (state.searchResults) {
        content = `<section>
          <h2 class="text-2xl font-bold text-white mb-4">Search Results</h2>
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">${state.searchResults.results.map(anime => AnimeCard(anime)).join('')}</div>
          ${renderPagination()}
        </section>`;
    } else {
        content = `${SpotlightBanner(state.homeData.spotlights)}
        <section class="mb-10"><h2 class="text-2xl font-bold text-white mb-4">Top Airing</h2><div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">${state.homeData.trending.map(anime => AnimeCard(anime)).join('')}</div></section>
        <section><h2 class="text-2xl font-bold text-white mb-4">Recent Releases</h2><div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">${state.homeData.recent.map(anime => AnimeCard(anime)).join('')}</div></section>`;
    }
    container.innerHTML = content;
    const searchForm = document.getElementById('search-form');
    if (searchForm) searchForm.addEventListener('submit', window.handleSearchSubmit);
    if (document.getElementById('spotlight-prev')) {
        document.getElementById('spotlight-prev').addEventListener('click', () => { window.prevSpotlight(); window.startSpotlightInterval(); });
        document.getElementById('spotlight-next').addEventListener('click', () => { window.nextSpotlight(); window.startSpotlightInterval(); });
        window.startSpotlightInterval();
    }
}

function renderCategoryPage(container) {
    document.getElementById('search-bar-container').innerHTML = SearchBar();
    let content;
    if (!state.categoryResults) {
        content = Spinner();
    } else if (state.categoryResults.results.length > 0) {
        content = `<section>
          <h2 class="text-2xl font-bold text-white mb-4">${state.currentCategoryTitle}</h2>
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">${state.categoryResults.results.map(anime => AnimeCard(anime)).join('')}</div>
          ${renderPagination()}
        </section>`;
    } else {
        content = `<h2 class="text-2xl font-bold text-white mb-4">${state.currentCategoryTitle}</h2><p class="text-gray-400">No anime in this category.</p>`;
    }
    container.innerHTML = content;
    const searchForm = document.getElementById('search-form');
    if (searchForm) searchForm.addEventListener('submit', window.handleSearchSubmit);
}

function renderWatchPage(container) {
    const { animeDetails, animeEpisodes } = state;
    if (!animeDetails || !animeEpisodes) { container.innerHTML = Spinner(); return; }

    document.getElementById('search-bar-container').innerHTML = '';
    const episodeListHtml = animeEpisodes.map(ep => `<button id="ep-btn-${ep.id}" onclick="handleEpisodeSelection('${ep.id}')" class="episode-button w-full text-left bg-gray-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600">${ep.episode_no}</button>`).join('');
    const detailsHtml = `<div class="details-column"><img src="${animeDetails.poster}" class="w-full rounded-lg mb-4"><h3 class="text-xl font-bold text-white mb-2">${animeDetails.title}</h3><p class="text-gray-400 text-sm mb-4 line-clamp-3">${animeDetails.animeInfo.Overview}</p></div>`;
    
    container.innerHTML = `<div class="watch-page-grid">
            <div class="episode-list-column custom-scrollbar"><h3 class="text-xl font-bold text-white mb-4">Episodes:</h3><div class="flex flex-col gap-2">${episodeListHtml}</div></div>
            <div class="player-column"><div id="video-player-container" class="w-full aspect-video bg-black rounded-lg mb-4">${Spinner()}</div><div id="server-selection-container"></div></div>
            ${detailsHtml}
        </div>`;
}

export function renderPage() {
    const mainContent = document.getElementById('main-content');
    if (state.isLoading && state.view === 'home') {
        mainContent.innerHTML = Spinner();
        return;
    }
    if (state.error) {
        mainContent.innerHTML = ErrorDisplay(state.error);
        return;
    }

    switch (state.view) {
        case 'home':
            renderHomePage(mainContent);
            break;
        case 'category':
            renderCategoryPage(mainContent);
            break;
        case 'details':
            renderWatchPage(mainContent);
            break;
    }
}


export function setActiveEpisodeButton(episodeId) {
    document.querySelectorAll('.episode-button').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`ep-btn-${episodeId}`).classList.add('active');
}

export function renderServerList(episodeId, subServers, dubServers) {
    const serverContainer = document.getElementById('server-selection-container');
    const subButtons = subServers.map(s => `<button onclick="handleServerSelection(event, '${episodeId}', '${s}', 'sub')" class="bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600">${s}</button>`).join('');
    const dubButtons = dubServers.map(s => `<button onclick="handleServerSelection(event, '${episodeId}', '${s}', 'dub')" class="bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600">${s}</button>`).join('');
    serverContainer.innerHTML = `${subServers.length > 0 ? `<div class="mb-2"><span class="font-semibold">SUB:</span> <div class="flex flex-wrap gap-2 mt-1">${subButtons}</div></div>` : ''}${dubServers.length > 0 ? `<div><span class="font-semibold">DUB:</span> <div class="flex flex-wrap gap-2 mt-1">${dubButtons}</div></div>` : ''}`;
}

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

export function initializeSideMenu() {
    const menuNavLinks = document.getElementById('menu-nav-links');
    menuNavLinks.innerHTML = MENU_ITEMS.map(item => `<a href="#" onclick="${item.endpoint === 'home' ? 'handleGoHome()' : `handleCategoryClick('${item.endpoint}', '${item.title}')`}" class="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-base font-medium">${item.title}</a>`).join('');
    document.getElementById('menu-toggle-btn').addEventListener('click', () => toggleMenu(true));
    document.getElementById('close-menu-btn').addEventListener('click', () => toggleMenu(false));
    document.getElementById('side-menu-overlay').addEventListener('click', () => toggleMenu(false));
}

