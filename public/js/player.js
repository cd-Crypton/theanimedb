import { state, setState } from './state.js';
import { fetchStreamData } from './api.js';
import { Spinner, ErrorDisplay } from './ui.js';

export function destroyPlayer() {
    if (state.player) {
        state.player.destroy();
        setState({ player: null });
    }
}

export async function createPlayer(episodeId, serverName, type) {
    const playerContainer = document.getElementById('video-player-container');
    if (!playerContainer) return;

    destroyPlayer();
    playerContainer.innerHTML = Spinner();

    try {
        const streamData = await fetchStreamData(episodeId, serverName, type);
        playerContainer.innerHTML = '<div id="video-player"></div>';
        
        const proxyUrl = `${location.origin}/m3u8-proxy?url=${encodeURIComponent(streamData.link.file)}`;
        const subtitles = streamData.tracks || [];

        const newPlayer = new Artplayer({
            container: '#video-player',
            url: proxyUrl,
            type: 'm3u8',
            autoplay: true,
            pip: true,
            setting: true,
            fullscreen: true,
            customType: { m3u8: (video, url) => {
                const hls = new Hls();
                hls.loadSource(url);
                hls.attachMedia(video);
            } },
        });

        setState({ player: newPlayer });

        newPlayer.on('ready', () => {
            const backwardBtn = `<svg viewBox="-5 -10 75 75" xmlns="http://www.w3.org/2000/svg" width="35" height="35"><path d="M11.9199 45H7.20508V26.5391L2.60645 28.3154V24.3975L11.4219 20.7949H11.9199V45ZM30.1013 35.0059C30.1013 38.3483 29.4926 40.9049 28.2751 42.6758C27.0687 44.4466 25.3422 45.332 23.0954 45.332C20.8708 45.332 19.1498 44.4743 17.9323 42.7588C16.726 41.0322 16.1006 38.5641 16.0564 35.3545V30.7891C16.0564 27.4577 16.6596 24.9121 17.8659 23.1523C19.0723 21.3815 20.8044 20.4961 23.0622 20.4961C25.32 20.4961 27.0521 21.3704 28.2585 23.1191C29.4649 24.8678 30.0792 27.3636 30.1013 30.6064V35.0059ZM25.3864 30.1084C25.3864 28.2048 25.1983 26.777 24.822 25.8252C24.4457 24.8734 23.8591 24.3975 23.0622 24.3975C21.5681 24.3975 20.7933 26.1406 20.738 29.627V35.6533C20.738 37.6012 20.9262 39.0511 21.3025 40.0029C21.6898 40.9548 22.2875 41.4307 23.0954 41.4307C23.8591 41.4307 24.4236 40.988 24.7888 40.1025C25.1651 39.2061 25.3643 37.8392 25.3864 36.002V30.1084Z" fill="white"></path><path d="M11.9894 5.45398V0L2 7.79529L11.9894 15.5914V10.3033H47.0886V40.1506H33.2442V45H52V5.45398H11.9894Z" fill="white"></path></svg>`;
            const forwardBtn = `<svg viewBox="-5 -10 75 75" xmlns="http://www.w3.org/2000/svg" width="35" height="35"><path d="M29.9199 45H25.2051V26.5391L20.6064 28.3154V24.3975L29.4219 20.7949H29.9199V45ZM48.1013 35.0059C48.1013 38.3483 47.4926 40.9049 46.2751 42.6758C45.0687 44.4466 43.3422 45.332 41.0954 45.332C38.8708 45.332 37.1498 44.4743 35.9323 42.7588C34.726 41.0322 34.1006 38.5641 34.0564 35.3545V30.7891C34.0564 27.4577 34.6596 24.9121 35.8659 23.1523C37.0723 21.3815 38.8044 20.4961 41.0622 20.4961C43.32 20.4961 45.0521 21.3704 46.2585 23.1191C47.4649 24.8678 48.0792 27.3636 48.1013 30.6064V35.0059ZM43.3864 30.1084C43.3864 28.2048 43.1983 26.777 42.822 25.8252C42.4457 24.8734 41.8591 24.3975 41.0622 24.3975C39.5681 24.3975 38.7933 26.1406 38.738 29.627V35.6533C38.738 37.6012 38.9262 39.0511 39.3025 40.0029C39.6898 40.9548 40.2875 41.4307 41.0954 41.4307C41.8591 41.4307 42.4236 40.988 42.7888 40.1025C43.1651 39.2061 43.3643 37.8392 43.3864 36.002V30.1084Z" fill="white"></path><path d="M40.0106 5.45398V0L50 7.79529L40.0106 15.5914V10.3033H4.9114V40.1506H18.7558V45H2.01875e-06V5.45398H40.0106Z" fill="white"></path></svg>`;
            const settingsControl = newPlayer.controls.find('settings');
            const settingsIndex = settingsControl ? newPlayer.controls.indexOf(settingsControl) : -1;
            
            newPlayer.controls.add({ name: 'backward', position: 'right', html: backwardBtn, index: settingsIndex, tooltip: 'Backward 10s', click: () => newPlayer.backward = 10 });
            newPlayer.controls.add({ name: 'forward', position: 'right', html: forwardBtn, index: settingsIndex, tooltip: 'Forward 10s', click: () => newPlayer.forward = 10 });
        });

    } catch (err) {
        playerContainer.innerHTML = ErrorDisplay(err.message);
    }
}

