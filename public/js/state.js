// --- State Management ---
export let state = {
    view: 'home', // 'home', 'details', or 'category'
    homeData: { trending: [], recent: [], spotlights: [] },
    searchResults: null,
    categoryResults: null,
    currentCategoryTitle: null,
    currentCategoryEndpoint: null,
    searchSuggestions: [],
    lastSearchQuery: '',
    currentPage: 1,
    currentSpotlightIndex: 0,
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

export const MENU_ITEMS = [
    { title: 'Home', endpoint: 'home' },
    { title: 'Movies', endpoint: '/movie' },
    { title: 'TV Series', endpoint: '/tv' },
    { title: 'Subbed Anime', endpoint: '/subbed-anime' },
    { title: 'Dubbed Anime', endpoint: '/dubbed-anime' },
    { title: 'Completed', endpoint: '/completed' },
    { title: 'Special', endpoint: '/special' },
    { title: 'OVA', endpoint: '/ova' },
    { title: 'ONA', endpoint: '/ona' },
];

export const setState = (newState) => {
    state = { ...state, ...newState };
};