import { PROXY_URL } from './state.js';
import { renderInfoModal } from './ui.js';

export function createHandlers(state, setState, api, playerManager) {

    async function fetchServersAndMaybePlay(episodeId) {
        playerManager.destroy();
        setState({ isLoading: true, selectedEpisodeId: episodeId, availableServers: [] });
        try {
            const allServers = await api.fetchServersForEpisode(episodeId);
            setState({ availableServers: allServers, isLoading: false });

            const preferredServerName = 'HD-2';
            const preferredServer = allServers.find(s => s.name === preferredServerName && s.type === 'sub') || allServers.find(s => s.originalName === preferredServerName && s.type === 'sub');

            setTimeout(() => {
                if (preferredServer) {
                    const value = `${preferredServer.name}|${preferredServer.type}|${preferredServer.source}|${preferredServer.originalName || preferredServer.name}`;
                    handleServerSelection(value);
                }
            }, 0);

        } catch (err) {
            console.error(err);
            setState({ error: `Failed to fetch servers: ${err.message}`, isLoading: false });
        }
    }

    async function handleServerSelection(selectedValue) {
        if (!selectedValue) return;
        const [displayName, type, source, serverName] = selectedValue.split('|');
        const episodeId = state.selectedEpisodeId;
        if (!serverName || !type || !episodeId || !source) return;

        const serverSelect = document.getElementById('server-select');
        if (serverSelect) serverSelect.value = selectedValue;

        playerManager.destroy();
        const playerContainer = document.getElementById('video-player');
        if (playerContainer) playerContainer.innerHTML = `<div class="flex justify-center items-center h-full w-full py-16"><div class="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div></div>`;

        try {
            const streamData = await api.fetchStreamData(source, episodeId, serverName, type);
            console.log(`Fetched from ${source} stream source: ${displayName}`);

            const sourceUrl = streamData.streamingLink.link.file;
            const proxyUrl = `${PROXY_URL}m3u8-proxy?url=${encodeURIComponent(sourceUrl)}`;
            const subtitles = streamData.streamingLink.tracks || [];

            const newPlayer = new Artplayer({
                container: '#video-player',
                url: proxyUrl,
                type: 'm3u8',
                autoplay: true,
                pip: true,
                setting: true,
                fullscreen: true,
                customType: {
                    m3u8: (video, url) => {
                        const hls = new Hls();
                        hls.loadSource(url);
                        hls.attachMedia(video);
                    }
                },
                controls: [
                    {
                        position: 'right',
                        html: '<svg viewBox="-5 -10 75 75" xmlns="http://www.w3.org/2000/svg" width="35" height="35"><path d="M11.9199 45H7.20508V26.5391L2.60645 28.3154V24.3975L11.4219 20.7949H11.9199V45ZM30.1013 35.0059C30.1013 38.3483 29.4926 40.9049 28.2751 42.6758C27.0687 44.4466 25.3422 45.332 23.0954 45.332C20.8708 45.332 19.1498 44.4743 17.9323 42.7588C16.726 41.0322 16.1006 38.5641 16.0564 35.3545V30.7891C16.0564 27.4577 16.6596 24.9121 17.8659 23.1523C19.0723 21.3815 20.8044 20.4961 23.0622 20.4961C25.32 20.4961 27.0521 21.3704 28.2585 23.1191C29.4649 24.8678 30.0792 27.3636 30.1013 30.6064V35.0059ZM25.3864 30.1084C25.3864 28.2048 25.1983 26.777 24.822 25.8252C24.4457 24.8734 23.8591 24.3975 23.0622 24.3975C21.5681 24.3975 20.7933 26.1406 20.738 29.627V35.6533C20.738 37.6012 20.9262 39.0511 21.3025 40.0029C21.6898 40.9548 22.2875 41.4307 23.0954 41.4307C23.8591 41.4307 24.4236 40.988 24.7888 40.1025C25.1651 39.2061 25.3643 37.8392 25.3864 36.002V30.1084Z" fill="white"></path><path d="M11.9894 5.45398V0L2 7.79529L11.9894 15.5914V10.3033H47.0886V40.1506H33.2442V45H52V5.45398H11.9894Z" fill="white"></path></svg>',
                        tooltip: 'Backward 10s',
                        click: () => playerManager.get() && (playerManager.get().backward = 10),
                    },
                    {
                        position: 'right',
                        html: '<svg viewBox="-5 -10 75 75" xmlns="http://www.w3.org/2000/svg" width="35" height="35"><path d="M29.9199 45H25.2051V26.5391L20.6064 28.3154V24.3975L29.4219 20.7949H29.9199V45ZM48.1013 35.0059C48.1013 38.3483 47.4926 40.9049 46.2751 42.6758C45.0687 44.4466 43.3422 45.332 41.0954 45.332C38.8708 45.332 37.1498 44.4743 35.9323 42.7588C34.726 41.0322 34.1006 38.5641 34.0564 35.3545V30.7891C34.0564 27.4577 34.6596 24.9121 35.8659 23.1523C37.0723 21.3815 38.8044 20.4961 41.0622 20.4961C43.32 20.4961 45.0521 21.3704 46.2585 23.1191C47.4649 24.8678 48.0792 27.3636 48.1013 30.6064V35.0059ZM43.3864 30.1084C43.3864 28.2048 43.1983 26.777 42.822 25.8252C42.4457 24.8734 41.8591 24.3975 41.0622 24.3975C39.5681 24.3975 38.7933 26.1406 38.738 29.627V35.6533C38.738 37.6012 38.9262 39.0511 39.3025 40.0029C39.6898 40.9548 40.2875 41.4307 41.0954 41.4307C41.8591 41.4307 42.4236 40.988 42.7888 40.1025C43.1651 39.2061 43.3643 37.8392 43.3864 36.002V30.1084Z" fill="white"></path><path d="M40.0106 5.45398V0L50 7.79529L40.0106 15.5914V10.3033H4.9114V40.1506H18.7558V45H2.01875e-06V5.45398H40.0106Z" fill="white"></path></svg>',
                        tooltip: 'Forward 10s',
                        click: () => playerManager.get() && (playerManager.get().forward = 10),
                    },
                ]
            });
            playerManager.set(newPlayer);

            if (subtitles.length > 0) {
                const captionIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 16 240 240" width="28" height="28"><path d="M215,40H25c-2.7,0-5,2.2-5,5v150c0,2.7,2.2,5,5,5h190c2.7,0,5-2.2,5-5V45C220,42.2,217.8,40,215,40z M108.1,137.7c0.7-0.7,1.5-1.5,2.4-2.3l6.6,7.8c-2.2,2.4-5,4.4-8,5.8c-8,3.5-17.3,2.4-24.3-2.9c-3.9-3.6-5.9-8.7-5.5-14v-25.6c0-2.7,0.5-5.3,1.5-7.8c0.9-2.2,2.4-4.3,4.2-5.9c5.7-4.5,13.2-6.2,20.3-4.6c3.3,0.5,6.3,2,8.7,4.3c1.3,1.3,2.5,2.6,3.5,4.2l-7.1,6.9c-2.4-3.7-6.5-5.9-10.9-5.9c-2.4-0.2-4.8,0.7-6.6,2.3c-1.7,1.7-2.5,4.1-2.4,6.5v25.6C90.4,141.7,102,143.5,108.1,137.7z M152.9,137.7c0.7-0.7,1.5-1.5,2.4-2.3l6.6,7.8c-2.2,2.4-5,4.4-8,5.8c-8,3.5-17.3,2.4-24.3-2.9c-3.9-3.6-5.9-8.7-5.5-14v-25.6c0-2.7,0.5-5.3,1.5-7.8c0.9-2.2,2.4-4.3,4.2-5.9c5.7-4.5,13.2-6.2,20.3-4.6c3.3,0.5,6.3,2,8.7,4.3c1.3,1.3,2.5,2.6,3.5,4.2l-7.1,6.9c-2.4-3.7-6.5-5.9-10.9-5.9c-2.4-0.2-4.8,0.7-6.6,2.3c-1.7,1.7-2.5,4.1-2.4,6.5v25.6C135.2,141.7,146.8,143.5,152.9,137.7z" fill="#fff"></path></svg>`;
                const defaultEnglishSub = subtitles.find(sub => sub.label.toLowerCase() === "english" && sub.default) || subtitles.find(sub => sub.label.toLowerCase() === "english");
                newPlayer.setting.add({
                    name: "captions", icon: captionIcon, html: "Subtitle", tooltip: defaultEnglishSub?.label || "Off", position: "right",
                    selector: [
                        { html: "Display", switch: true, onSwitch: (item) => { item.tooltip = item.switch ? "Hide" : "Show"; newPlayer.subtitle.show = !item.switch; return !item.switch; } },
                        ...subtitles.map((sub) => ({ default: sub === defaultEnglishSub, html: sub.label, url: sub.file })),
                    ],
                    onSelect: (item) => { newPlayer.subtitle.switch(item.url, { name: item.html }); return item.html; },
                });
                if (defaultEnglishSub) newPlayer.subtitle.switch(defaultEnglishSub.file, { name: defaultEnglishSub.label });
            }
        } catch (err) {
            console.error(err);
            if (playerContainer) playerContainer.innerHTML = `<div class="flex items-center justify-center h-full text-red-400 p-4">${err.message}</div>`;
        }
    }

    async function handleEpisodeSelection(episodeId) {
        await fetchServersAndMaybePlay(episodeId);
    }

    function handleSearchInput(query) {
        if (query.trim() === '') {
            setState({ searchQuery: query, searchSuggestions: [] }, { focusSearch: true });
        } else {
            setState({ searchQuery: query }, { focusSearch: true });
            api.fetchSearchSuggestions(query).then(suggestions => {
                setState({ searchSuggestions: suggestions }, { focusSearch: true });
            });
        }
    }

    async function handleSelectAnime(animeId, targetEpisodeId = null) {
        setState({ searchQuery: '', searchSuggestions: [], targetEpisodeId: targetEpisodeId, animeDetailsForModal: null });
        renderInfoModal();
        try {
            const detailsData = await api.fetchAnimeInfoForModal(animeId);
            setState({ animeDetailsForModal: detailsData });
            renderInfoModal();
        } catch (err) {
            console.error(err);
            hideInfoModal();
            alert(err.message);
        }
    }

    function hideInfoModal() {
        const modalOverlay = document.getElementById('info-modal-overlay');
        modalOverlay.classList.add('hidden');
        modalOverlay.classList.remove('flex');
        document.getElementById('info-modal-content').innerHTML = '';
        setState({ animeDetailsForModal: null, targetEpisodeId: null });
    }

    async function handleWatchNowClick(animeId) {
        hideInfoModal();
        history.pushState({ animeId: animeId }, '', `/anime/${animeId}`);
        setState({ isLoading: true, view: 'details' });
        try {
            const { details, episodes } = await api.fetchDetailsForPlayer(animeId);
            const selectedEpId = state.targetEpisodeId || (episodes.length > 0 ? episodes[episodes.length - 1].id : null);
            setState({ animeDetails: details, animeEpisodes: episodes, selectedEpisodeId: selectedEpId });
            if (selectedEpId) {
                await fetchServersAndMaybePlay(selectedEpId);
            } else {
                setState({ isLoading: false });
            }
        } catch (err) {
            console.error(`Failed to load details for ${animeId}:`, err);
            handleGoHome();
        }
    }

    function handleSearchSubmit(e) {
        e.preventDefault();
        const query = document.getElementById('search-input').value.trim();
        if (!query) return;
        setState({ lastSearchQuery: query, currentPage: 1, isLoading: true, searchResults: null, searchSuggestions: [] });
        api.fetchSearchResults(query, 1)
            .then(data => setState({ view: 'home', searchResults: data, isLoading: false }))
            .catch(err => {
                console.error(err);
                setState({ error: 'Failed to fetch search results.', isLoading: false });
            });
    }

    function handlePageChange(dir) {
        let newPage = state.currentPage;
        if (dir === 'next') newPage++;
        if (dir === 'prev' && newPage > 1) newPage--;

        setState({ isLoading: true, currentPage: newPage });
        const fetcher = state.view === 'category'
            ? api.fetchCategoryResults(state.currentCategoryEndpoint, newPage)
            : api.fetchSearchResults(state.lastSearchQuery, newPage);

        fetcher.then(data => {
            const resultsKey = state.view === 'category' ? 'categoryResults' : 'searchResults';
            setState({ [resultsKey]: data, isLoading: false });
        }).catch(err => {
            console.error(err);
            setState({ error: 'Failed to fetch results.', isLoading: false });
        });
    }

    function handleGoHome() {
        playerManager.destroy();
        history.pushState({}, '', '/');
        setState({
            view: 'home', homeTab: 'recent', searchResults: null, categoryResults: null, searchQuery: '',
            searchSuggestions: [], currentCategoryTitle: null, currentCategoryEndpoint: null, lastSearchQuery: '',
            selectedAnimeId: null, animeDetails: null, animeDetailsForModal: null, animeEpisodes: [],
            selectedEpisodeId: null, availableServers: [], videoSrc: null, error: null, isLoading: true
        });
        api.fetchHomeData()
            .then(homeData => setState({ homeData, isLoading: false }))
            .catch(err => {
                console.error(err);
                setState({ error: 'Could not load home anime data.', isLoading: false });
            });
    }

    function switchHomeTab(tab) {
        setState({ homeTab: tab });
    }

    function toggleMenu(show) {
        const menu = document.getElementById('side-menu');
        const overlay = document.getElementById('side-menu-overlay');
        if (show) {
            overlay.classList.remove('hidden');
            menu.classList.remove('-translate-x-full');
        } else {
            overlay.classList.add('hidden');
            menu.classList.add('-translate-x-full');
        }
    }

    function handleCategoryClick(endpoint, title) {
        toggleMenu(false);
        history.pushState({ category: title, endpoint: endpoint }, '', `/category?type=${encodeURIComponent(title)}`);
        setState({ isLoading: true, error: null, view: 'category', currentPage: 1, categoryResults: null, currentCategoryEndpoint: endpoint, currentCategoryTitle: title });
        api.fetchCategoryResults(endpoint, 1)
            .then(data => setState({ categoryResults: data, isLoading: false }))
            .catch(err => {
                console.error(err);
                setState({ error: 'Failed to fetch category results.', isLoading: false });
            });
    }

    function toggleSummary(event) {
        event.preventDefault();
        const summaryP = document.getElementById('summary-text');
        const contentSpan = document.getElementById('summary-content');
        const ellipsisSpan = document.getElementById('summary-ellipsis');
        const toggleLink = document.getElementById('summary-toggle');
        const fullText = summaryP.dataset.fullText;
        const isExpanded = toggleLink.textContent.trim() === 'See less...';

        if (isExpanded) {
            contentSpan.textContent = fullText.substring(0, 550);
            ellipsisSpan.style.display = 'inline';
            toggleLink.textContent = 'See more...';
        } else {
            contentSpan.textContent = fullText;
            ellipsisSpan.style.display = 'none';
            toggleLink.textContent = ' See less...';
        }
    }

    return {
        handleServerSelection, handleEpisodeSelection, handleSearchInput, handleSelectAnime,
        hideInfoModal, handleWatchNowClick, handleSearchSubmit, handlePageChange,
        handleGoHome, switchHomeTab, toggleMenu, handleCategoryClick, toggleSummary,
        fetchServersAndMaybePlay
    };
}