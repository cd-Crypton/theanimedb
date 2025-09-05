import { state, MENU_ITEMS } from './state.js';

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

const SkeletonCard = () => `
<div class="bg-gray-800 rounded-lg overflow-hidden animate-pulse">
  <div class="relative pb-[140%] bg-gray-700"></div>
  <div class="p-3">
    <div class="h-4 bg-gray-700 rounded w-3/4"></div>
  </div>
</div>`;

const renderHomeSkeleton = () => `
    <section class="relative h-[60vh] md:h-[70vh] rounded-lg overflow-hidden mb-10 bg-gray-800 animate-pulse"></section>
    <section>
        <div class="flex items-center gap-2 mb-4">
            <div class="h-10 bg-gray-800 rounded-lg w-36 animate-pulse"></div>
            <div class="h-10 bg-gray-800 rounded-lg w-32 animate-pulse"></div>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            ${Array(12).fill('').map(SkeletonCard).join('')}
        </div>
    </section>
`;

const renderInfoModalSkeleton = () => `
    <button onclick="hideInfoModal()" class="absolute top-4 right-4 text-gray-400 hover:text-white z-10">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
    </button>
    <div class="flex flex-col md:flex-row gap-8 p-8 animate-pulse">
        <div class="md:w-1/3 flex-shrink-0">
            <div class="p-1.5 bg-gray-800 rounded-lg">
                <div class="w-full rounded-lg shadow-md bg-gray-700 aspect-[3/4]"></div>
            </div>
            <div class="p-1.5 bg-gray-800 rounded-lg mt-2">
                <div class="bg-gray-700 h-10 w-full rounded-lg"></div>
            </div>
        </div>
        
        <div class="md:w-2/3 pr-4">
            <div class="h-8 bg-gray-700 rounded w-3/4 mb-2"></div>
            <div class="h-4 bg-gray-700 rounded w-1/2 mb-4"></div>
            <div class="grid grid-cols-2 gap-4 mb-4">
                <div><div class="h-4 bg-gray-700 rounded w-1/4 mb-2"></div><div class="h-4 bg-gray-700 rounded w-3/4"></div></div>
                <div><div class="h-4 bg-gray-700 rounded w-1/4 mb-2"></div><div class="h-4 bg-gray-700 rounded w-1/2"></div></div>
                <div><div class="h-4 bg-gray-700 rounded w-1/4 mb-2"></div><div class="h-4 bg-gray-700 rounded w-1/3"></div></div>
                <div><div class="h-4 bg-gray-700 rounded w-1/4 mb-2"></div><div class="h-4 bg-gray-700 rounded w-full"></div></div>
            </div>
            <div>
                <div class="h-4 bg-gray-700 rounded w-1/4 mb-2"></div>
                <div class="h-4 bg-gray-700 rounded w-full mb-2"></div>
                <div class="h-4 bg-gray-700 rounded w-full mb-2"></div>
                <div class="h-4 bg-gray-700 rounded w-5/6"></div>
            </div>
        </div>
    </div>
`;

export const renderInfoModal = () => {
    const modalOverlay = document.getElementById('info-modal-overlay');
    const modalContent = document.getElementById('info-modal-content');

    if (!state.animeDetailsForModal) {
        modalContent.innerHTML = renderInfoModalSkeleton();
        modalOverlay.classList.remove('hidden');
        modalOverlay.classList.add('flex');
        return;
    }

    const details = state.animeDetailsForModal;
    const genres = details.animeInfo.Genres ? details.animeInfo.Genres.join(', ') : 'N/A';
    const summary = details.animeInfo.Overview || 'No summary available.';
    
    const summaryNeedsTruncation = summary.length > 550; 
    let summaryHtml = '';
    if (summaryNeedsTruncation) {
        const truncatedText = summary.substring(0, 550);
        summaryHtml = `
            <p id="summary-text" class="text-gray-300 text-justify" data-full-text="${summary.replace(/"/g, '&quot;')}">
                <span class="font-semibold text-white">Summary:</span>
                <span id="summary-content">${truncatedText}</span><span id="summary-ellipsis">... </span>
                <a href="#" id="summary-toggle" onclick="toggleSummary(event)" class="text-blue-400 hover:text-blue-300 font-semibold">See more...</a>
            </p>`;
    } else {
        summaryHtml = `<p class="text-gray-300 text-justify"><span class="font-semibold text-white">Summary:</span> ${summary}</p>`;
    }

    modalContent.innerHTML = `
        <button onclick="hideInfoModal()" class="absolute top-4 right-4 text-gray-400 hover:text-white z-10">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>
        <div class="flex flex-col md:flex-row gap-8 p-8">
            <div class="md:w-1/3 flex-shrink-0">
                <div class="p-1.5 bg-gray-800 rounded-lg">
                    <img src="${details.poster || 'https://placehold.co/300x420/1f2937/9ca3af?text=Image+Not+Found'}" alt="${details.title}" class="w-full h-auto rounded-lg shadow-md" />
                </div>
                <div class="p-1.5 bg-gray-800 rounded-lg mt-2">
                    <button onclick="handleWatchNowClick('${details.id}')" class="bg-blue-500 text-white font-bold py-2 px-4 rounded-lg w-full hover:bg-blue-600 transition-colors">
                        Watch Now
                    </button>
                </div>
            </div>
            
            <div class="md:w-2/3 pr-4">
                <h1 class="text-3xl font-extrabold text-white mb-2">${details.title}</h1>
                <p class="text-gray-400 mb-4">${details.japanese_title || ''}</p>
                <div class="grid grid-cols-2 gap-4 mb-4 text-gray-300">
                    <div>
                        <p class="font-semibold text-white">Airing:</p>
                        <p>${
                            details.animeInfo.Aired
                                ? details.animeInfo.Aired
                                    .replace(/-/g, ' ')
                                    .trim()
                                : 'N/A'
                        }</p>
                    </div>
                    <div>
                        <p class="font-semibold text-white">Status:</p>
                        <p>${
                            details.animeInfo.Status
                                ? details.animeInfo.Status
                                    .replace(/-/g, ' ')
                                    .trim()
                                : 'N/A'
                            }</p>
                    </div>
                    <div>
                        <p class="font-semibold text-white">Type:</p>
                        <p>${
                            details.showType
                                ? details.showType
                                    .replace(/-/g, ' ')
                                    .trim()
                                : 'N/A'
                        }</p>
                    </div>
                    <div>
                        <p class="font-semibold text-white">Genres:</p>
                        <p>${
                            genres
                                ? genres
                                    .replace(/-/g, ' ')
                                    .trim()
                                : 'N/A'
                            }</p>
                    </div>
                </div>
                ${summaryHtml}
            </div>
        </div>
    `;

    modalOverlay.classList.remove('hidden');
    modalOverlay.classList.add('flex');
};

const SpotlightBanner = (spotlights) => {
    if (!spotlights || spotlights.length === 0) return '';

    const slides = spotlights.map((anime, index) => {
        const type = anime.showType || 'N/A';
        const duration = anime.duration || 'N/A';
        const releaseDate = anime.releaseDate || 'N/A';

        return `
        <div class="spotlight-slide ${index === 0 ? 'active' : ''}" data-index="${index}" style="background-image: url('${anime.poster}')">
            <div class="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/80 to-transparent"></div>
            <div class="relative z-10 p-8 md:p-12 lg:p-16 flex flex-col justify-end h-full text-white">
                <p class="text-sm font-semibold text-white-400 mb-2">#${index + 1} Spotlight</p>
                <h2 class="text-3xl md:text-5xl font-bold mb-4 line-clamp-2">${anime.title}</h2>
                
                <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-300 mb-4">
                    <div class="flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3.25 3A2.25 2.25 0 0 0 1 5.25v7.5A2.25 2.25 0 0 0 3.25 15h13.5A2.25 2.25 0 0 0 19 12.75v-7.5A2.25 2.25 0 0 0 16.75 3H3.25ZM9 17.5a.75.75 0 0 1 .75-.75h.5a.75.75 0 0 1 0 1.5h-.5a.75.75 0 0 1-.75-.75ZM12.25 18a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0 0 1.5h3a.75.75 0 0 0 .75-.75Z" clip-rule="evenodd" /></svg>
                        <span>${type}</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.414-1.414L11 10.586V6z" clip-rule="evenodd" />
                        </svg>
                        <span>${duration}</span>
                    </div>
                     <div class="flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd" />
                        </svg>
                        <span>${releaseDate}</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <span class="text-xs font-bold bg-gray-700 px-2 py-0.5 rounded">HD</span>
                    </div>
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
      value="${state.searchQuery}"
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
          <li onclick="handleSelectAnime('${s.id}')" class="p-3 hover:bg-gray-700 cursor-pointer transition-colors">
            <span class="font-bold">${s.title}</span>
          </li>
        `).join('')}
      </ul>
    ` : ''}
  </div>
</form>`;

const AnimeCard = (anime, episodeInfo = null) => {
    const animeTitle = (anime.title).replace(/'/g, "\\'");
    const episodeId = episodeInfo && episodeInfo.id ? `'${episodeInfo.id}'` : 'null';
    const onclickAction = `handleSelectAnime('${anime.id}', ${episodeId})`;
    
    let episodeBadge = '';
    if (episodeInfo && episodeInfo.number) {
        episodeBadge = `
        <div class="absolute bottom-2 right-2 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded">
            EP ${episodeInfo.number}
        </div>`;
    }

    return `
    <div onclick="${onclickAction}" class="bg-gray-800 rounded-lg overflow-hidden cursor-pointer group transform hover:-translate-y-1 transition-transform duration-300">
      <div class="relative pb-[140%]">
        <img src="${anime.poster || 'https://placehold.co/300x420/1f2937/9ca3af?text=Image+Not+Found'}"
             alt="${animeTitle}"
             class="absolute top-0 left-0 w-full h-full object-cover group-hover:opacity-75 transition-opacity"
             onerror="this.onerror=null; this.src='https://placehold.co/300x420/1f2937/9ca3af?text=Image+Not+Found';" />
        ${episodeBadge}
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

export function renderHome(mainContent) {
    document.getElementById('search-bar-container').innerHTML = SearchBar();

    if (state.isLoading && state.homeData.recent.length === 0 && !state.searchResults) {
        mainContent.innerHTML = renderHomeSkeleton();
        return; 
    }
    
    let content = '';
    if (state.searchResults) {
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
        
        const recentContent = state.homeData.recent.length > 0
            ? state.homeData.recent.map(anime => {
                return AnimeCard(anime, { number: anime.latestEpisodeNumber, id: anime.latestEpisodeId });
              }).join('')
            : '<p class="text-gray-400 col-span-full">No recent releases found.</p>';
        const trendingContent = state.homeData.trending.length > 0 
            ? state.homeData.trending.map(anime => {
                return AnimeCard(anime, { number: anime.latestEpisodeNumber, id: anime.latestEpisodeId });
              }).join('')
            : '<p class="text-gray-400 col-span-full">No trending anime found.</p>';

        content = `
        ${spotlightsContent}
        <section>
            <div class="flex items-center gap-2 mb-4">
                <button onclick="switchHomeTab('recent')" class="tab-btn font-semibold py-2 px-4 rounded-lg ${state.homeTab === 'recent' ? 'active' : ''}">Recent Releases</button>
                <button onclick="switchHomeTab('trending')" class="tab-btn font-semibold py-2 px-4 rounded-lg ${state.homeTab === 'trending' ? 'active' : ''}">Top Airing</button>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                ${state.homeTab === 'recent' ? recentContent : trendingContent}
            </div>
        </section>`;
    }
    mainContent.innerHTML = (state.error ? ErrorDisplay(state.error) : '') + content;
    const searchForm = document.getElementById('search-form');
    if (searchForm) searchForm.addEventListener('submit', window.handleSearchSubmit);
    if (document.getElementById('spotlight-prev')) {
        document.getElementById('spotlight-prev').addEventListener('click', () => { window.prevSpotlight(); window.startSpotlightInterval(); });
        document.getElementById('spotlight-next').addEventListener('click', () => { window.nextSpotlight(); window.startSpotlightInterval(); });
        window.startSpotlightInterval();
    }
};

export function renderDetailsPage(mainContent) {
    document.getElementById('search-bar-container').innerHTML = '';
    if (state.isLoading || !state.animeDetails) {
        mainContent.innerHTML = Spinner();
        return;
    }

    const details = state.animeDetails;
    const genres = details.animeInfo.Genres ? details.animeInfo.Genres.join(', ') : 'N/A';

    let episodeDropdownHtml = '';
    if (state.animeEpisodes && state.animeEpisodes.length > 0) {
        const episodeOptions = state.animeEpisodes.map(ep => `<option value="${ep.id}" ${ep.id === state.selectedEpisodeId ? 'selected' : ''}>Episode ${ep.episode_no}</option>`).join('');
        episodeDropdownHtml = `<select onchange="handleEpisodeSelection(this.value)" class="bg-gray-700 text-white p-3 rounded-lg w-full md:w-1/2 focus:outline-none focus:ring-2 focus:ring-blue-500">${episodeOptions}</select>`;
    } else {
        episodeDropdownHtml = '<p class="text-gray-400 p-3">No episodes found.</p>';
    }

    let serverDropdownHtml = '';
    if (state.selectedEpisodeId && state.availableServers.length > 0) {
        const subServers = state.availableServers.filter(s => s.type === 'sub');
        const dubServers = state.availableServers.filter(s => s.type === 'dub');

        const createOption = server => {
            const value = `${server.name}|${server.type}|${server.source}|${server.originalName || server.name}`;
            return `<option value="${value}">${server.name} (${server.type.charAt(0).toUpperCase() + server.type.slice(1)})</option>`;
        };

        const subOptions = subServers.map(createOption).join('');
        const dubOptions = dubServers.map(createOption).join('');

        serverDropdownHtml = `<select id="server-select" onchange="handleServerSelection(this.value)" class="bg-gray-700 text-white p-3 rounded-lg w-full md:w-1/2 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="" disabled selected>Select a server</option>
            ${subOptions ? `<optgroup label="Subbed">${subOptions}</optgroup>` : ''}
            ${dubOptions ? `<optgroup label="Dubbed">${dubOptions}</optgroup>` : ''}
        </select>`;
    }

    const content = `
    <div class="max-w-7xl mx-auto">
        <button onclick="handleGoHome()" class="text-blue-500 hover:text-blue-400 font-bold mb-4 flex items-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>Back to Home</button>
        <div class="flex flex-col lg:flex-row gap-8">
            <div class="lg:w-3/4">
                <div class="bg-gray-800 rounded-lg p-4">
                    <div id="video-player-container" class="mb-4"><div id="video-player" class="w-full aspect-video bg-black rounded-lg overflow-hidden">${!state.selectedEpisodeId ? '<div class="flex items-center justify-center h-full text-gray-400">Please select an episode to begin.</div>' : ''}</div></div>
                    <div class="flex flex-col md:flex-row gap-4">${episodeDropdownHtml}${serverDropdownHtml}</div>
                </div>
            </div>
            <div class="lg:w-1/4">
                <div class="bg-gray-800 rounded-lg overflow-hidden shadow-lg p-4">
                    <div class="flex flex-col gap-4">
                        <div class="flex-shrink-0">
                            <img src="${details.poster || 'https://placehold.co/300x420/1f2937/9ca3af?text=Image+Not+Found'}" alt="${details.title}" class="w-full max-w-[200px] mx-auto h-auto rounded-lg shadow-md" />
                        </div>
                        <div class="flex-grow">
                            <h1 class="text-xl font-extrabold text-white mb-2">${details.title}</h1>
                            <div class="grid grid-cols-1 gap-2 text-sm text-gray-300">
                                <div><p class="font-semibold text-white">Type:</p><p>${details.showType || 'N/A'}</p></div>
                                <div><p class="font-semibold text-white">Status:</p><p>${details.animeInfo.Status || 'N/A'}</p></div>
                                <div><p class="font-semibold text-white">Genres:</p><p>${genres}</p></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
    mainContent.innerHTML = content;
};

export function renderCategoryPage(mainContent) {
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
    if (searchForm) searchForm.addEventListener('submit', window.handleSearchSubmit);
};

export function initializeMenu() {
    const menuNavLinks = document.getElementById('menu-nav-links');
    menuNavLinks.innerHTML = MENU_ITEMS.map(item =>
        `<a href="#" onclick="${item.endpoint === 'home' ? 'handleGoHome()' : `handleCategoryClick('${item.endpoint}', '${item.title}')`}" class="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-base font-medium">${item.title}</a>`
    ).join('');

    document.getElementById('menu-toggle-btn').addEventListener('click', () => window.toggleMenu(true));
    document.getElementById('close-menu-btn').addEventListener('click', () => window.toggleMenu(false));
    document.getElementById('side-menu-overlay').addEventListener('click', () => window.toggleMenu(false));
}

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
    clearInterval(spotlightInterval);
    if (state.homeData.spotlights.length > 1) {
        spotlightInterval = setInterval(nextSpotlight, 5000);
    }
}