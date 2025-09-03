// ------------------------------
// App State
// ------------------------------
const mainContent = document.getElementById('main-content');

let state = {
  view: 'home',
  homeData: { trending: [], recent: [] },
  searchResults: null,
  lastSearchQuery: '',
  currentPage: 1,
  selectedAnimeId: null,
  animeDetails: null,
  selectedEpisode: null,
  isLoading: true,
  error: null,
};

// ------------------------------
// API
// ------------------------------
const API_BASE_URL = '/api/meta/anilist'; // Worker proxy to Vercel

// ------------------------------
// Render Functions
// ------------------------------
const Spinner = () => `
<div class="flex justify-center items-center h-full w-full py-16">
  <div class="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
</div>`;

const ErrorDisplay = (message) => `
<div class="text-center p-4 bg-red-900/50 text-red-300 rounded-lg max-w-2xl mx-auto my-4">
  <p class="font-bold">An Error Occurred</p>
  <p>${message}</p>
</div>`;

const SearchBar = () => `
<form id="search-form" class="w-full max-w-2xl mx-auto mb-8">
  <div class="relative">
    <input
      type="search"
      id="search-input"
      placeholder="Search for an anime..."
      class="w-full p-4 pr-12 text-lg text-white bg-gray-800 border-2 border-gray-700 rounded-full focus:outline-none focus:border-blue-500 transition-colors"
      ${state.isLoading ? 'disabled' : ''}/>
    <button type="submit" ${state.isLoading ? 'disabled' : ''}
      class="absolute top-1/2 right-4 -translate-y-1/2 text-gray-400 hover:text-white disabled:opacity-50">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
    </button>
  </div>
</form>`;

const AnimeCard = (anime) => {
  const animeTitle = (anime.title?.romaji || anime.title.userPreferred).replace(/'/g, "\\'");
  const onclickAction = `handleSelectAnime('${anime.id}')`;
  const imgSrc = anime.image || anime.coverImage?.large || 'https://placehold.co/300x420/1f2937/9ca3af?text=No+Image';
  return `
    <div onclick="${onclickAction}" class="bg-gray-800 rounded-lg overflow-hidden cursor-pointer group transform hover:-translate-y-1 transition-transform duration-300">
      <div class="relative pb-[140%]">
        <img src="${imgSrc}" alt="${animeTitle}" class="absolute top-0 left-0 w-full h-full object-cover group-hover:opacity-75 transition-opacity"/>
      </div>
      <div class="p-3">
        <h3 class="text-white font-bold text-sm truncate group-hover:text-blue-400 transition-colors">
          ${anime.title?.romaji || anime.title.userPreferred}
        </h3>
      </div>
    </div>`;
};

// ------------------------------
// Rendering Views
// ------------------------------
const renderPagination = () => {
  if(!state.searchResults) return '';
  const hasNextPage = state.searchResults.hasNextPage;
  return `
    <div class="flex justify-center items-center gap-4 mt-8">
      <button onclick="handlePageChange('prev')" class="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" ${state.currentPage===1?'disabled':''}>
        &larr; Previous
      </button>
      <span class="text-white font-semibold">Page ${state.currentPage}</span>
      <button onclick="handlePageChange('next')" class="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" ${!hasNextPage?'disabled':''}>
        Next &rarr;
      </button>
    </div>
  `;
};

const renderHome = () => {
  let content = '';
  if(state.isLoading){
    content = `<section class="mb-10"><h2 class="text-2xl font-bold text-white mb-4">Trending Now</h2>${Spinner()}</section>`;
  } else if(state.searchResults){
    content = `
      <section>
        <h2 class="text-2xl font-bold text-white mb-4">Search Results</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          ${state.searchResults.results.map(anime=>AnimeCard(anime)).join('')}
        </div>
        ${renderPagination()}
      </section>`;
  } else {
    const trendingContent = state.homeData.trending.length>0
      ? state.homeData.trending.map(anime=>AnimeCard(anime)).join('')
      : '<p class="text-gray-400 col-span-full">No trending anime found.</p>';
    content = `
      <section class="mb-10">
        <h2 class="text-2xl font-bold text-white mb-4">Trending Now</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          ${trendingContent}
        </div>
      </section>`;
  }
  mainContent.innerHTML = SearchBar() + (state.error?ErrorDisplay(state.error):'') + content;
  document.getElementById('search-form').addEventListener('submit', handleSearchSubmit);
};

const renderDetails = () => {
  if(state.isLoading && !state.animeDetails){ mainContent.innerHTML=Spinner(); return; }
  if(state.error){ mainContent.innerHTML=ErrorDisplay(state.error); return; }
  if(!state.animeDetails){ mainContent.innerHTML=`<p class="text-white text-center">No details found.</p>`; return; }

  const details = state.animeDetails;
  const selectedEp = state.selectedEpisode;

  mainContent.innerHTML = `
    <div>
      <button onclick="handleBack()" class="bg-blue-500 text-white px-4 py-2 rounded-lg mb-6 hover:bg-blue-600 transition-colors">&larr; Back</button>
      <div class="lg:flex gap-8">
        <div class="lg:w-3/4">
          <h2 class="text-2xl font-bold text-white mb-2">${details.title?.romaji || details.title?.userPreferred}</h2>
          <p class="text-gray-300 mb-4">${details.description||'No description available.'}</p>
          <div id="video-player-container"></div>
        </div>
      </div>
    </div>`;
  renderVideoPlayer(selectedEp);
};

const renderVideoPlayer = (episode) => {
  const container = document.getElementById('video-player-container');
  if(!container){ return; }
  if(!episode || !episode.url){
    container.innerHTML = `<div class="aspect-video bg-black rounded-lg flex items-center justify-center">
      <p class="text-white">No video available. Trailer may be shown.</p>
    </div>`;
    return;
  }
  if(episode.site==='youtube'){
    container.innerHTML = `<iframe class="w-full h-full rounded-lg" src="https://www.youtube.com/embed/${episode.url}" frameborder="0" allowfullscreen></iframe>`;
    return;
  }
  container.innerHTML = `<div class="aspect-video bg-black flex items-center justify-center">
    <p class="text-white">Streaming not available yet.</p>
  </div>`;
};

// ------------------------------
// App Logic & Handlers
// ------------------------------
const updateView = ()=>{ window.scrollTo(0,0); state.view==='home'?renderHome():renderDetails(); };
const setState = (newState)=>{ state={...state,...newState}; updateView(); };

async function fetchSearchResultsPage(page){
  const query = state.lastSearchQuery; if(!query) return;
  setState({isLoading:true,error:null,currentPage:page});
  try{
    const res = await fetch(`${API_BASE_URL}/search?query=${encodeURIComponent(query)}&page=${page}`);
    if(!res.ok) throw new Error('Failed to fetch search results.');
    const data = await res.json();
    setState({searchResults:data,isLoading:false});
  }catch(err){ console.error(err); setState({error:'Failed to load search results.',isLoading:false}); }
}

function handlePageChange(dir){
  let newPage = state.currentPage;
  if(dir==='next') newPage++;
  else if(dir==='prev' && state.currentPage>1) newPage--;
  fetchSearchResultsPage(newPage);
}

async function handleSearchSubmit(e){
  e.preventDefault();
  const query = document.getElementById('search-input').value.trim(); if(!query) return;
  setState({lastSearchQuery:query,currentPage:1,isLoading:true,error:null,searchResults:null});
  await fetchSearchResultsPage(1);
}

async function handleSelectAnime(animeId){
  setState({view:'details',selectedAnimeId:animeId,isLoading:true,error:null,animeDetails:null});
  try{
    const res = await fetch(`${API_BASE_URL}/info/${animeId}`);
    if(!res.ok) throw new Error('Failed to fetch anime details.');
    const data = await res.json();
    setState({animeDetails:data,isLoading:false,selectedEpisode:data.trailer||null});
  }catch(err){ console.error(err); setState({error:'Could not load anime details.',isLoading:false}); }
}

function handleBack(){ setState({view:'home',selectedAnimeId:null,animeDetails:null,selectedEpisode:null}); }

// ------------------------------
// Init
// ------------------------------
function init(){
  setState({isLoading:true});
  (async()=>{
    try{
      const trendingRes = await fetch(`${API_BASE_URL}/trending?page=1`);
      const trendingData = await trendingRes.json();
      setState({homeData:{trending:trendingData.results||[],recent:[]},isLoading:false});
    }catch(err){ console.error(err); setState({error:'Could not load initial data.',isLoading:false}); }
  })();
}

init();
