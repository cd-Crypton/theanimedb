import { state } from './state.js';
import { handleSearchInput, handleSearchSubmit, handlePageChange, handleSelectAnime, handleGoHome, handleEpisodeSelection, handleServerSelection } from './events.js';

const mainContent = document.getElementById('main-content');
let player = null;

// --- Render Helpers ---
export const Spinner = () => `
<div class="flex justify-center items-center h-full w-full py-16">
  <div class="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
</div>`;

export const ErrorDisplay = (message, showBackButton = false) => {
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

export const SpotlightBanner = (spotlights) => {
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

export const SearchBar = () => `
<form id="search-form" class="w-full">
  <div class="relative flex items-center gap-2">
    <input type="search" id="search-input" placeholder="Search for an anime..."
      class="flex-grow w-full p-4 text-lg text-white bg-gray-800 border-2 border-gray-700 rounded-full focus:outline-none focus:border-blue-500 transition-colors"
      oninput="handleSearchInput(this.value)"
      ${state.isLoading ? 'disabled' : ''} />
    <button type="submit" ${state.isLoading ? 'disabled' : ''}
      class="flex-shrink-0 bg-blue-500 text-white p-3 rounded-full hover:bg-blue-600 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400">
      <span class="sr-only">Search</span>
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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

export const AnimeCard = (anime) => {
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

export const renderPagination = () => {
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

export const renderHome = () => {
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
};

export const renderDetails = () => {
    document.getElementById('search-bar-container').innerHTML = '';
    if (state.isLoading || !state.animeDetails) {
        mainContent.innerHTML = Spinner();
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
        videoPlayerHtml = `<div class="flex justify-center mb-8"><div class="w-full lg:w-3/4 aspect-video bg-black rounded-lg overflow-hidden"><video id="video-player" class="video-js vjs-theme-city vjs-big-play-centered" controls preload="auto" width="640" height="360"></video></div></div>`;
    }
    let serverSelectionHtml = '';
    if (state.selectedEpisodeId) {
        const subServerButtonsHtml = state.availableSubServers.map(server => `<button onclick="handleServerSelection(event, '${state.selectedEpisodeId}', '${server}', 'sub')" class="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors">${server}</button>`).join('');
        const dubServerButtonsHtml = state.availableDubServers.map(server => `<button onclick="handleServerSelection(event, '${state.selectedEpisodeId}', '${server}', 'dub')" class="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors">${server}</button>`).join('');
        serverSelectionHtml = `<div class="mb-8" id="server-selection-container"><h3 class="text-xl font-bold text-white mb-2">Servers</h3>${subServerButtonsHtml.length > 0 ? `<h4 class="text-lg font-semibold text-white mt-4 mb-2">Subbed</h4><div class="flex flex-wrap gap-2">${subServerButtonsHtml}</div>` : ''}${dubServerButtonsHtml.length > 0 ? `<h4 class="text-lg font-semibold text-white mt-4 mb-2">Dubbed</h4><div class="flex flex-wrap gap-2">${dubServerButtonsHtml}</div>` : ''}</div>`;
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
            <h2 class="text-2xl font-bold text-white mb-4">Episodes</h2>
            ${episodeListHtml}
        </div>
    </div>`;
    mainContent.innerHTML = content;
    if (document.getElementById('video-player')) {
        if (player && !player.isDisposed()) player.dispose();
        player = videojs('video-player');
    }
};

export const renderCategoryPage = () => {
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