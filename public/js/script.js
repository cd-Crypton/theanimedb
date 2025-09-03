const mainContent = document.getElementById('main-content');
const API_BASE_URL = '/api/anime/animepahe';

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

// --- Render helpers ---
const Spinner = () => `<div class="spinner"><div></div></div>`;
const ErrorDisplay = (msg) => `<div class="error-message">${msg}</div>`;

const SearchBar = () => `
<form id="search-form" class="w-full max-w-2xl mx-auto mb-8">
  <div class="relative">
    <input type="search" id="search-input" placeholder="Search for an anime..."
      class="w-full p-4 pr-12 text-lg text-white bg-gray-800 border-2 border-gray-700 rounded-full focus:outline-none focus:border-blue-500 transition-colors"
      ${state.isLoading ? 'disabled' : ''} />
    <button type="submit" ${state.isLoading ? 'disabled' : ''}
      class="absolute top-1/2 right-4 -translate-y-1/2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed">
      🔍
    </button>
  </div>
</form>`;

const AnimeCard = (anime) => {
    const title = (anime.title || anime.name).replace(/'/g,"\\'");
    const onclickAction = `handleSelectAnime('${anime.id}')`;
    const img = anime.image || 'https://placehold.co/300x420/1f2937/9ca3af?text=Img+Not+Found';
    return `
<div onclick="${onclickAction}" class="bg-gray-800 rounded-lg overflow-hidden cursor-pointer group transform hover:-translate-y-1 transition-transform duration-300">
  <div class="relative pb-[140%]">
    <img src="${img}" alt="${title}" class="absolute top-0 left-0 w-full h-full object-cover img-fallback" />
  </div>
  <div class="p-3">
    <h3 class="text-white font-bold text-sm truncate group-hover:text-blue-400 transition-colors">${title}</h3>
    ${anime.episodeNumber ? `<p class="text-xs text-gray-400">Episode ${anime.episodeNumber}</p>` : ''}
  </div>
</div>`;
};

// --- Pagination ---
const renderPagination = () => {
    if(!state.searchResults) return '';
    const hasNext = state.searchResults.hasNextPage;
    return `
<div class="flex justify-center items-center gap-4 mt-8">
  <button onclick="handlePageChange('prev')" class="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50" ${state.currentPage===1?'disabled':''}>&larr; Prev</button>
  <span class="text-white font-semibold">Page ${state.currentPage}</span>
  <button onclick="handlePageChange('next')" class="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50" ${!hasNext?'disabled':''}>Next &rarr;</button>
</div>`;
};

// --- Render Home ---
const renderHome = () => {
    let content = '';
    if(state.isLoading){
        content = Spinner();
    } else if(state.searchResults){
        content = `<section>
          <h2 class="text-2xl font-bold text-white mb-4">Search Results</h2>
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            ${state.searchResults.results.map(a=>AnimeCard(a)).join('')}
          </div>
          ${renderPagination()}
        </section>`;
    } else {
        const trending = state.homeData.trending.length>0?state.homeData.trending.map(a=>AnimeCard(a)).join(''):'<p class="text-gray-400 col-span-full">No trending anime found.</p>';
        const recent = state.homeData.recent.length>0?state.homeData.recent.map(a=>AnimeCard(a)).join(''):'<p class="text-gray-400 col-span-full">No recent releases found.</p>';
        content = `
<section class="mb-10">
  <h2 class="text-2xl font-bold text-white mb-4">Trending Now</h2>
  <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">${trending}</div>
</section>
<section>
  <h2 class="text-2xl font-bold text-white mb-4">Recent Releases</h2>
  <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">${recent}</div>
</section>`;
    }
    mainContent.innerHTML = SearchBar() + (state.error?ErrorDisplay(state.error):'') + content;
    document.getElementById('search-form')?.addEventListener('submit',handleSearchSubmit);
};

// --- Render Details ---
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
${selectedEp?`
<h2 class="text-2xl font-bold text-white mb-2">${details.title}</h2>
<h3 class="text-lg text-gray-300 mb-4">Watching: Episode ${selectedEp.number}</h3>
<div id="video-player-container"></div>`:`
<div class="video-container"><p class="text-white text-center">Select an episode to begin watching.</p></div>`}
</div>
<div class="lg:w-1/4 mt-6 lg:mt-0">
<div class="bg-gray-800 rounded-lg p-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
<h3 class="text-xl font-bold text-white mb-4">Episodes</h3>
<ul class="space-y-2">
${details.episodes?.map(ep=>`
<li>
<button onclick='handleSelectEpisode(${JSON.stringify(ep).replace(/'/g,"&apos;")})' 
class="w-full text-left p-3 rounded-md transition-colors ${selectedEp?.id===ep.id?'bg-blue-600 text-white':'bg-gray-700 hover:bg-gray-600 text-gray-300'}">
Episode ${ep.number}
</button>
</li>`).join('')}
</ul>
</div>
</div>
</div>
</div>`;

    if(selectedEp) renderVideoPlayer(selectedEp.id);
};

// --- Video Player ---
const renderVideoPlayer = (episodeId) => {
    const container = document.getElementById('video-player-container');
    if(!container) return;
    container.innerHTML = `<div class="video-container">${Spinner()}</div>`;
    const video = document.createElement('video');
    video.controls = true;
    video.className='w-full h-full rounded-lg hidden';
    container.appendChild(video);
    const loader = container.querySelector('div');

    fetch(`${API_BASE_URL}/watch/${episodeId}?server=zoro`).then(r=>{
        if(!r.ok) throw new Error(`Failed to fetch stream. Status ${r.status}`);
        return r.json();
    }).then(data=>{
        const url = data.sources.find(s=>s.quality==='1080p'||s.quality==='720p'||s.quality==='default')?.url;
        if(!url) throw new Error("No HLS stream found.");
        if(Hls.isSupported()){
            const hls = new Hls();
            hls.loadSource(url);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, ()=>{
                loader.style.display='none';
                video.style.display='block';
                video.play().catch(()=>{});
            });
        } else if(video.canPlayType('application/vnd.apple.mpegurl')){
            video.src = url;
            video.addEventListener('loadedmetadata', ()=>{
                loader.style.display='none';
                video.style.display='block';
                video.play().catch(()=>{});
            });
        }
    }).catch(err=>{
        container.innerHTML = ErrorDisplay(err.message);
        console.error("Video Player Error:",err);
    });
};

// --- State & Events ---
const setState = (newState)=>{ state={...state,...newState}; updateView(); };
const updateView = ()=>{ window.scrollTo(0,0); state.view==='home'?renderHome():renderDetails(); };

async function fetchSearchResultsPage(page){
    const query=state.lastSearchQuery;
    if(!query) return;
    setState({isLoading:true,error:null,currentPage:page});
    try{
        const res=await fetch(`${API_BASE_URL}/${query}?page=${page}`);
        if(!res.ok) throw new Error(`Search failed (status ${res.status})`);
        const data=await res.json();
        setState({searchResults:data,isLoading:false});
    }catch(err){
        console.error(err);
        setState({error:'Failed to load search results.',isLoading:false});
    }
}

function handlePageChange(dir){
    let page=state.currentPage;
    page=dir==='next'?page+1:(dir==='prev'?Math.max(1,page-1):page);
    fetchSearchResultsPage(page);
}

async function handleSearchSubmit(e){
    e.preventDefault();
    const query=document.getElementById('search-input').value.trim();
    if(!query) return;
    setState({lastSearchQuery:query,currentPage:1,isLoading:true,error:null,searchResults:null});
    await fetchSearchResultsPage(1);
}

async function handleSelectAnime(animeId){
    setState({view:'details',selectedAnimeId:animeId,isLoading:true,error:null,animeDetails:null});
    try{
        const res=await fetch(`${API_BASE_URL}/info/${animeId}`);
        if(!res.ok) throw new Error('Failed to fetch anime details.');
        const data=await res.json();
        setState({
            animeDetails:data,
            selectedEpisode:(data.episodes&&data.episodes.length>0)?data.episodes[0]:null,
            isLoading:false
        });
    }catch(err){
        console.error(err);
        setState({error:'Could not load details for selected anime.',isLoading:false});
    }
}

function handleSelectEpisode(ep){ setState({selectedEpisode:ep}); }
function handleBack(){ setState({view:'home',selectedAnimeId:null,animeDetails:null,selectedEpisode:null}); }

// --- Initial Load ---
function init(){
    setState({isLoading:true});
    (async()=>{
        try{
            const [trendingRes,recentRes]=await Promise.all([
                fetch(`${API_BASE_URL}/top-airing?page=1`),
                fetch(`${API_BASE_URL}/recent-episodes?page=1&type=1`)
            ]);
            if(!trendingRes.ok||!recentRes.ok) throw new Error('Failed to fetch home data.');
            const trendingData=await trendingRes.json();
            const recentData=await recentRes.json();
            setState({homeData:{trending:trendingData.results||[],recent:recentData.results||[]},isLoading:false});
        }catch(err){
            console.error(err);
            setState({error:'Could not load home anime data.',isLoading:false});
        }
    })();
}

init();
