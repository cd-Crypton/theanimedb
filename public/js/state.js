// --- Constants ---
export const PROXY_URL = 'https://theanimedbproxy.vercel.app/';
export const API_BASE = 'https://theanimedb-api.vercel.app/api';

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

// --- State Management ---
export let state = {
    view: 'home', // 'home', 'details', 'category'
    homeTab: 'recent', // 'recent' or 'trending'
    homeData: { trending: [], recent: [], spotlights: [] },
    searchResults: null,
    categoryResults: null,
    currentCategoryTitle: null,
    currentCategoryEndpoint: null,
    searchQuery: '',
    searchSuggestions: [],
    lastSearchQuery: '',
    currentPage: 1,
    currentSpotlightIndex: 0,
    selectedAnimeId: null,
    animeDetails: null, // For the player page
    animeDetailsForModal: null, // For the info modal
    targetEpisodeId: null, // To hold latest episode ID for the modal
    animeEpisodes: [],
    selectedEpisodeId: null,
    availableServers: [],
    videoSrc: null,
    isLoading: true,
    error: null,
};