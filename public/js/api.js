import { API_BASE } from './config.js';

export async function fetchHomeData() {
    const response = await fetch(`${API_BASE}/`);
    if (!response.ok) throw new Error(`Failed to fetch home page data.`);
    const data = await response.json();
    const { spotlights = [], topAiring = [], latestEpisode = [] } = data.results;

    const spotlightDetailsPromises = spotlights.map(async (anime) => {
        try {
            const detailsRes = await fetch(`${API_BASE}/info?id=${anime.id}`);
            if (!detailsRes.ok) return anime;
            const detailsData = await detailsRes.json();
            return { ...anime, ...detailsData.results.data };
        } catch { return anime; }
    });
    const detailedSpotlights = await Promise.all(spotlightDetailsPromises);

    return { spotlights: detailedSpotlights, trending: topAiring, recent: latestEpisode };
}

export async function fetchWatchPageData(animeId) {
    const [detailsRes, episodesRes] = await Promise.all([
        fetch(`${API_BASE}/info?id=${animeId}`),
        fetch(`${API_BASE}/episodes/${animeId}`)
    ]);
    if (!detailsRes.ok || !episodesRes.ok) throw new Error('Failed to fetch anime data.');
    
    const detailsData = await detailsRes.json();
    const episodesData = await episodesRes.json();
    
    return {
        details: detailsData.results.data,
        episodes: episodesData.results.episodes,
    };
}

export async function fetchServersForEpisode(episodeId) {
    const serversRes = await fetch(`${API_BASE}/servers/${episodeId.split('?ep=')[0]}?ep=${episodeId.split('?ep=')[1]}`);
    if (!serversRes.ok) throw new Error("Could not fetch servers.");
    const serversData = await serversRes.json();
    if (!serversData.results) throw new Error("Could not fetch servers.");
    return serversData.results;
}

export async function fetchStreamData(episodeId, serverName, type) {
    const watchUrl = `${API_BASE}/stream?id=${episodeId}&server=${serverName}&type=${type}`;
    const watchRes = await fetch(watchUrl);
    if (!watchRes.ok) throw new Error('Could not fetch stream data.');
    const watchData = await watchRes.json();
    if (!watchData.results?.streamingLink?.link?.file) throw new Error('Streaming source not found.');
    return watchData.results.streamingLink;
}

export async function fetchSearchResults(query, page = 1) {
    const res = await fetch(`${API_BASE}/search?keyword=${query}&page=${page}`);
    if (!res.ok) throw new Error('Failed to fetch search results.');
    return await res.json();
}

export async function fetchCategoryResults(endpoint, page = 1) {
    const res = await fetch(`${API_BASE}${endpoint}?page=${page}`);
    if (!res.ok) throw new Error('Failed to fetch category results.');
    return await res.json();
}

export async function fetchSearchSuggestions(query) {
    const res = await fetch(`${API_BASE}/search/suggest?keyword=${query}`);
    if (!res.ok) throw new Error('Failed to fetch suggestions.');
    return await res.json();
}

