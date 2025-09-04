import { state, setState } from './state.js';

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

        // Fetch detailed info for each spotlight concurrently
        const spotlightDetailsPromises = spotlights.map(async (anime) => {
            try {
                const detailsRes = await fetch(`${API_BASE}/info?id=${anime.id}`);
                if (!detailsRes.ok) throw new Error('Failed to fetch details');
                const detailsData = await detailsRes.json();
                // Merge detailed info into the spotlight object
                return {
                    ...anime,
                    showType: detailsData.results.data.showType,
                    genres: detailsData.results.data.animeInfo.Genres,
                };
            } catch (err) {
                console.error(`Failed to fetch details for anime ID ${anime.id}:`, err);
                return anime; // Return original object if fetch fails
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

export async function handleServerSelection(event, episodeId, serverName, type) {
    const PROXY_URL = 'https://theanimedbproxy.vercel.app/';
    const serverContainer = document.getElementById('server-selection-container');
    if (serverContainer) {
        serverContainer.querySelectorAll('button').forEach(btn => btn.classList.remove('active-server'));
        event.target.classList.add('active-server');
    }
    try {
        if (player && !player.isDisposed()) {
            player.loadingSpinner.show();
            player.error(null);
        }
        const watchUrl = `${API_BASE}/stream?id=${episodeId}&server=${serverName}&type=${type}`;
        const watchRes = await fetch(watchUrl);
        const watchData = await watchRes.json();
        if (!watchData.results?.streamingLink?.link?.file) throw new Error('Streaming source not found for this server.');
        const sourceUrl = watchData.results.streamingLink.link.file;
        const proxyUrl = `${PROXY_URL}m3u8-proxy?url=${encodeURIComponent(sourceUrl)}`;
        if (player && !player.isDisposed()) {
            player.on('error', () => {
                const error = player.error();
                console.error('Video.js Player Error:', error);
                player.error({ code: 4, message: `The stream from ${serverName} failed to load. Please try another server.` });
            });
            player.src({ src: proxyUrl, type: 'application/x-mpegURL' });
            player.one('loadedmetadata', () => {
                player.loadingSpinner.hide();
                player.play().catch(err => { console.error("Video.js play failed:", err); player.error({ code: 4, message: "Playback was prevented by the browser." }) });
            });
        }
    } catch (err) {
        console.error(err);
        if (player && !player.isDisposed()) {
            player.error({ code: 4, message: err.message });
        }
    }
}

export async function handleEpisodeSelection(episodeId) {
    setState({ isLoading: true, selectedEpisodeId: episodeId, videoSrc: null, error: null, availableSubServers: [], availableDubServers: [] });
    try {
        const serversRes = await fetch(`${API_BASE}/servers/${episodeId.split('?ep=')[0]}?ep=${episodeId.split('?ep=')[1]}`);
        const serversData = await serversRes.json();
        if (!serversData.results || !Array.isArray(serversData.results)) throw new Error("Invalid server data from API.");
        const subServers = serversData.results.filter(s => s.type === 'sub').map(s => s.serverName);
        const dubServers = serversData.results.filter(s => s.type === 'dub').map(s => s.serverName);
        setState({ availableSubServers: subServers, availableDubServers: dubServers, isLoading: false });
    } catch (err) {
        console.error(err);
        setState({ error: `Failed to fetch servers: ${err.message}`, isLoading: false });
    }
}