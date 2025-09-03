const mainContent = document.getElementById("main-content");
const API_BASE = "/api/anime/anilist";

let state = {
  view: "home",
  homeData: { trending: [], recent: [] },
  searchResults: null,
  lastSearchQuery: "",
  currentPage: 1,
  isLoading: true,
  error: null,
};

const Spinner = () => `<div class="flex justify-center py-16"><div class="animate-spin h-16 w-16 border-t-2 border-b-2 border-blue-500 rounded-full"></div></div>`;
const ErrorDisplay = (msg) => `<div class="p-4 bg-red-900/50 text-red-300 rounded-lg text-center">${msg}</div>`;

const AnimeCard = (anime) => {
  const title = anime.title?.romaji || anime.title?.english || "Unknown";
  return `
    <div class="bg-gray-800 rounded-lg overflow-hidden cursor-pointer hover:-translate-y-1 transition-transform" onclick="handleSelectAnime(${anime.id})">
      <div class="relative pb-[140%]">
        <img src="${anime.coverImage?.large || 'https://placehold.co/300x420/1f2937/9ca3af?text=Image+Not+Found'}" alt="${title}" class="absolute top-0 left-0 w-full h-full object-cover" />
      </div>
      <div class="p-3">
        <h3 class="text-white font-bold text-sm truncate">${title}</h3>
      </div>
    </div>`;
};

const renderHome = () => {
  let trendingContent = state.homeData.trending.map(AnimeCard).join("") || "<p class='text-gray-400'>No trending anime found.</p>";
  let recentContent = state.homeData.recent.map(AnimeCard).join("") || "<p class='text-gray-400'>No recent releases found.</p>";

  mainContent.innerHTML = `
    <section class="mb-10">
      <h2 class="text-2xl font-bold text-white mb-4">Trending Now</h2>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">${trendingContent}</div>
    </section>
    <section>
      <h2 class="text-2xl font-bold text-white mb-4">Recent Releases</h2>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">${recentContent}</div>
    </section>`;
};

const fetchHomeData = async () => {
  state.isLoading = true;
  renderHome();

  try {
    const res = await fetch(`${API_BASE}?page=1&perPage=12`);
    const json = await res.json();
    state.homeData.trending = json.data.Page.media;
    state.homeData.recent = json.data.Page.media; // You can filter recent by season/year
    state.isLoading = false;
    renderHome();
  } catch (err) {
    state.error = "Could not load home anime data.";
    renderHome();
  }
};

// Initial load
fetchHomeData();

window.handleSelectAnime = (id) => alert("Anime ID selected: " + id);
