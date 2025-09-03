// ===============================
// API Base URLs
// ===============================
// AniList: for trending, search, metadata
const ANILIST_API_BASE = '/api/meta/anilist';

// Gogoanime: for anime info, episodes, streaming
const GOGO_API_BASE = '/api/anime/gogoanime';

// ===============================
// AniList Functions
// ===============================

// Fetch trending anime from AniList
async function fetchTrending(page = 1) {
    const res = await fetch(`${ANILIST_API_BASE}/trending?page=${page}`);
    return res.json();
}

// Search anime on AniList
async function searchAnime(query, page = 1) {
    const res = await fetch(`${ANILIST_API_BASE}/search/${encodeURIComponent(query)}?page=${page}`);
    return res.json();
}

// ===============================
// Gogoanime Functions
// ===============================

// Fetch anime info + episode list
async function fetchAnimeInfo(animeId) {
    const res = await fetch(`${GOGO_API_BASE}/info/${animeId}`);
    return res.json();
}

// Fetch episode streaming links
async function fetchEpisodeSources(episodeId) {
    const res = await fetch(`${GOGO_API_BASE}/watch/${episodeId}`);
    return res.json();
}

// ===============================
// UI Rendering
// ===============================

// Render trending list
async function renderTrending() {
    const data = await fetchTrending();
    const main = document.getElementById('main-content');

    main.innerHTML = `
        <h2 class="text-2xl font-bold mb-6">Trending Anime</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            ${data.results.map(anime => `
                <div class="bg-gray-800 rounded-lg shadow hover:shadow-lg transition cursor-pointer"
                     onclick="renderAnime('${anime.id}')">
                    <img src="${anime.image}" alt="${anime.title.romaji}" class="w-full h-48 object-cover rounded-t-lg">
                    <div class="p-2">
                        <h3 class="text-sm font-semibold truncate">${anime.title.romaji}</h3>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Render anime details & episodes (from Gogoanime)
async function renderAnime(animeId) {
    const anime = await fetchAnimeInfo(animeId);
    const main = document.getElementById('main-content');

    main.innerHTML = `
        <h2 class="text-2xl font-bold mb-4">${anime.title}</h2>
        <div class="grid gap-2">
            ${anime.episodes.map(ep => `
                <button class="episode-btn bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
                    data-id="${ep.id}">
                    Episode ${ep.number}
                </button>
            `).join('')}
        </div>
        <div id="video-player" class="mt-6"></div>
    `;

    // Attach event listeners for episodes
    document.querySelectorAll('.episode-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const episodeId = btn.dataset.id;
            const sources = await fetchEpisodeSources(episodeId);

            const hlsSource = sources.sources.find(s => s.isM3U8);
            const playerDiv = document.getElementById('video-player');

            playerDiv.innerHTML = `<video id="anime-video" class="w-full max-w-3xl mx-auto rounded" controls></video>`;

            const video = document.getElementById('anime-video');
            if (Hls.isSupported() && hlsSource) {
                const hls = new Hls();
                hls.loadSource(hlsSource.url);
                hls.attachMedia(video);
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                video.src = hlsSource.url;
            } else {
                playerDiv.innerHTML = `<p class="text-red-500">No playable stream found.</p>`;
            }
        });
    });
}

// ===============================
// Init
// ===============================
document.addEventListener('DOMContentLoaded', () => {
    renderTrending();
});
