import { API_BASE } from './state.js';

async function fetchLatestEpisodeForAnimeList(animeList) {
    const promises = animeList.map(async (anime) => {
        try {
            const episodesRes = await fetch(`${API_BASE}/episodes/${anime.id}`);
            if (!episodesRes.ok) return anime;
            const episodesData = await episodesRes.json();
            const episodes = episodesData.results?.episodes;
            if (episodes && episodes.length > 0) {
                const latestEpisode = episodes[episodes.length - 1];
                return {
                    ...anime,
                    latestEpisodeNumber: latestEpisode.episode_no,
                    latestEpisodeId: latestEpisode.id
                };
            }
            return anime;
        } catch (err) {
            console.error(`Failed to fetch episodes for anime ID ${anime.id}:`, err);
            return anime;
        }
    });
    return Promise.all(promises);
}

export async function fetchHomeData() {
    const response = await fetch(`${API_BASE}/`);
    if (!response.ok) throw new Error(`Failed to fetch home page data: ${response.statusText}`);
    const data = await response.json();

    const spotlights = data.results.spotlights || [];
    const trending = data.results.topAiring || [];
    const recent = data.results.latestEpisode || [];

    const spotlightDetailsPromises = spotlights.map(async (anime) => {
        // Find the corresponding info from the main /api results
        const mainInfo = data.results.spotlights.find(a => a.id === anime.id);
        const sub = mainInfo?.tvInfo?.episodeInfo?.sub ?? 0;
        const dub = mainInfo?.tvInfo?.episodeInfo?.dub ?? 0;
    
        try {
            const detailsRes = await fetch(`${API_BASE}/info?id=${anime.id}`);
            if (!detailsRes.ok) return { ...anime, sub, dub }; 
    
            const detailsData = await detailsRes.json();
            if (!detailsData.results?.data?.animeInfo) return { ...anime, sub, dub };
    
            const animeData = detailsData.results.data;
            const animeInfo = animeData.animeInfo;
    
            const releaseDate = animeInfo.Aired
                ? animeInfo.Aired.replace(/-/g, ' ').replace(/\s+to\s+\?$/, '').trim()
                : 'N/A';
            const duration = animeInfo.Duration ? animeInfo.Duration.split(' ')[0] : null;
    
            return {
                ...anime,
                showType: animeData.showType,
                genres: animeInfo.Genres,
                duration: duration,
                releaseDate: releaseDate,
                sub,
                dub
            };
        } catch (err) {
            console.error(`Failed to fetch details for anime ID ${anime.id}:`, err);
            return { ...anime, sub, dub };
        }
    });

    const [detailedSpotlights, detailedRecent, detailedTrending] = await Promise.all([
        Promise.all(spotlightDetailsPromises),
        fetchLatestEpisodeForAnimeList(recent),
        fetchLatestEpisodeForAnimeList(trending)
    ]);

    return {
        spotlights: detailedSpotlights,
        trending: detailedTrending,
        recent: detailedRecent,
    };
}

export async function fetchCategoryResults(endpoint, page = 1) {
    const res = await fetch(`${API_BASE}${endpoint}?page=${page}`);
    if (!res.ok) throw new Error('Failed to fetch category results.');
    const data = await res.json();
    const hasNextPage = data.results.totalPages > page;
    return { results: data.results.data, hasNextPage: hasNextPage };
}

export async function fetchSearchResults(query, page = 1) {
    const res = await fetch(`${API_BASE}/search?keyword=${query}&page=${page}`);
    if (!res.ok) throw new Error('Failed to fetch search results.');
    const data = await res.json();
    const hasNextPage = data.results.totalPages > page;
    return { results: data.results.data, hasNextPage: hasNextPage };
}

export async function fetchSearchSuggestions(query) {
    const res = await fetch(`${API_BASE}/search/suggest?keyword=${query}`);
    const data = await res.json();
    return data.results || [];
}

export async function fetchDetailsForPlayer(animeId) {
    const [detailsRes, episodesRes] = await Promise.all([
        fetch(`${API_BASE}/info?id=${animeId}`),
        fetch(`${API_BASE}/episodes/${animeId}`)
    ]);

    if (!detailsRes.ok || !episodesRes.ok) {
        throw new Error(`Could not find anime with ID: ${animeId}`);
    }

    const detailsData = await detailsRes.json();
    const episodesData = await episodesRes.json();
    const episodes = episodesData.results.episodes;

    if (!detailsData.results?.data?.id || !episodesData.results || !Array.isArray(episodes)) {
        throw new Error("Invalid or empty data from API.");
    }

    return { details: detailsData.results.data, episodes: episodes };
}

export async function fetchAnimeInfoForModal(animeId) {
    const detailsRes = await fetch(`${API_BASE}/info?id=${animeId}`);
    if (!detailsRes.ok) throw new Error("Failed to fetch anime info.");
    const detailsData = await detailsRes.json();
    return detailsData.results.data;
}

export async function fetchStreamData(source, episodeId, serverName, type) {
    const endpoint = source === 'fallback' ? 'stream/fallback' : 'stream';
    const watchUrl = `${API_BASE}/${endpoint}?id=${episodeId}&server=${serverName}&type=${type}`;
    const watchRes = await fetch(watchUrl);
    const watchData = await watchRes.json();

    if (!watchRes.ok || !watchData.results?.streamingLink?.link?.file) {
        throw new Error(`Streaming source not found from ${serverName} (${source}).`);
    }
    return watchData.results;
}

export async function fetchServersForEpisode(episodeId) {
    const primaryServersRes = await fetch(`${API_BASE}/servers/${episodeId.split('?ep=')[0]}?ep=${episodeId.split('?ep=')[1]}`);
    const primaryServersData = await primaryServersRes.json();
    if (!primaryServersData.results || !Array.isArray(primaryServersData.results)) throw new Error("Invalid primary server data.");
    const primaryServers = primaryServersData.results.map(s => ({ name: s.serverName, type: s.type, source: 'primary' }));
    let allServers = [...primaryServers];
    if (primaryServers.length > 0) {
        try {
            const firstServer = primaryServers[0];
            const fallbackUrl = `${API_BASE}/stream/fallback?id=${episodeId}&server=${firstServer.name}&type=${firstServer.type}`;
            const fallbackRes = await fetch(fallbackUrl);
            const fallbackData = await fallbackRes.json();
            if (fallbackData.results?.servers && Array.isArray(fallbackData.results.servers)) {
                const primaryServerKeys = new Set(primaryServers.map(s => `${s.name}|${s.type}`));
                const fallbackServers = fallbackData.results.servers.map(s => {
                    const newName = primaryServerKeys.has(`${s.serverName}|${s.type}`) ? `${s.serverName} (v2)` : s.serverName;
                    return { name: newName, type: s.type, source: 'fallback', originalName: s.serverName };
                });
                allServers.push(...fallbackServers);
            }
        } catch (fallbackErr) {
            console.warn("Could not fetch fallback servers, proceeding with primary ones.", fallbackErr);
        }
    }
    return allServers;
}