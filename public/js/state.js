export let state = {
    view: 'home',
    homeData: { trending: [], recent: [], spotlights: [] },
    searchResults: null,
    categoryResults: null,
    currentCategoryTitle: null,
    currentCategoryEndpoint: null,
    searchSuggestions: [],
    lastSearchQuery: '',
    currentPage: 1,
    currentSpotlightIndex: 0,
    animeDetails: null,
    animeEpisodes: [],
    isLoading: true,
    error: null,
    player: null,
};

export function setState(newState) {
    state = { ...state, ...newState };
}

