import { setState } from './state.js';

const API_BASE = 'https://crypton-api.vercel.app/api';

export async function fetchHomeData() {
    setState({ isLoading: true, error: null, view: 'home' });
    try {
        const response = await fetch(`${API_BASE}/`);
        if (!response.ok) throw new Error(`Failed to fetch home page data: ${response.statusText}`);
        const data = await response.json();
        const spotlights = data.results.spotlights || [];
        const trending = data.results.topAiring || [];
        const recent = data.results.latestEpisode || [];

        const spotlightDetailsPromises = spotlights.map(async (anime) => {
            try {
                const detailsRes = await fetch(`${API_BASE}/info?id=${anime.id}`);
                if (!detailsRes.ok) throw new Error('Failed to fetch details');
                const detailsData = await detailsRes.json();
                return {
                    ...anime,
                    showType: detailsData.results.data.showType,
                    genres: detailsData.results.data.animeInfo.Genres,
                };
            } catch (err) {
                console.error(`Failed to fetch details for anime ID ${anime.id}:`, err);
                return anime;
            }
        });

        const detailedSpotlights = await Promise.all(spotlightDetailsPromises);

        setState({ homeData: { spotlights: detailedSpotlights, trending, recent }, isLoading: false });
    } catch (err) {
        console.error(err);
        setState({ error: 'Could not load home anime data.', isLoading: false });
    }
}

export async function fetchCategoryResults(endpoint, page = 1) {
    setState({ isLoading: true, error: null, view: 'category', currentPage: page, categoryResults: null });
    try {
        const res = await fetch(`${API_BASE}${endpoint}?page=${page}`);
        if (!res.ok) throw new Error('Failed to fetch category results.');
        const data = await res.json();
        const hasNextPage = data.results.totalPages > page;
        setState({ categoryResults: { results: data.results.data, hasNextPage: hasNextPage }, isLoading: false });
    } catch (err) {
        console.error(err);
        setState({ error: 'Failed to fetch category results.', isLoading: false });
    }
}

export async function fetchSearchResults(page = 1) {
    if (!state.lastSearchQuery) return;
    setState({ isLoading: true, error: null, currentPage: page, searchResults: null });
    try {
        const res = await fetch(`${API_BASE}/search?keyword=${state.lastSearchQuery}&page=${page}`);
        if (!res.ok) throw new Error('Failed to fetch search results.');
        const data = await res.json();
        const hasNextPage = data.results.totalPages > page;
        setState({ view: 'home', searchResults: { results: data.results.data, hasNextPage: hasNextPage }, isLoading: false });
    } catch (err) {
        console.error(err);
        setState({ error: 'Failed to fetch search results.', isLoading: false });
    }
}

export async function fetchSearchSuggestions(query) {
    try {
        const res = await fetch(`${API_BASE}/search/suggest?keyword=${query}`);
        const data = await res.json();
        if (data.results) {
            setState({ searchSuggestions: data.results });
        }
    } catch (err) {
        console.error("Failed to fetch search suggestions:", err);
    }
}

export async function fetchAnimeDetails(animeId) {
    setState({ isLoading: true, error: null, view: 'details', animeDetails: null, videoSrc: null, selectedEpisodeId: null });
    try {
        const detailsRes = await fetch(`${API_BASE}/info?id=${animeId}`);
        const detailsData = await detailsRes.json();
        const episodesRes = await fetch(`${API_BASE}/episodes/${animeId}`);
        const episodesData = await episodesRes.json();
        if (!episodesData.results || !Array.isArray(episodesData.results.episodes)) throw new Error("Invalid episode data from API.");
        setState({ animeDetails: detailsData.results.data, animeEpisodes: episodesData.results.episodes, isLoading: false });
    } catch (err) {
        console.error(err);
        setState({ error: `Failed to fetch anime details: ${err.message}`, isLoading: false });
    }
}