//  --- to enter dev mode go to http://127.0.0.1:5500/playlist.html?code=5 ---

const clientId = "3edfcb2cdb144a9796a8c39f5ce3730a"; 
const redirectUri = 'https://fairplayer2.netlify.app/playlist'; 
const scope = 'playlist-read-private playlist-read-collaborative streaming user-read-playback-state user-modify-playback-state';
// const redirectButton = document.getElementById("login-button")
// const loggedIn = false;

const initLogin = document.getElementById('welcomeLogin')

// --- PKCE CRYPTO HELPERS ---
//decrypting spotify 

const generateRandomString = (length) => {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const values = crypto.getRandomValues(new Uint8Array(length));
    return values.reduce((acc, x) => acc + possible[x % possible.length], "");
};

const sha256 = async (plain) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    return window.crypto.subtle.digest('SHA-256', data);
};

const base64encode = (input) => {
    return btoa(String.fromCharCode(...new Uint8Array(input)))
        .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
};


// --- AUTHENTICATION FLOW ---

// --- UPDATED AUTHENTICATION FLOW ---

function redirectToProfile() {
    window.location.href = "playlist.html";
}

async function redirectToSpotify() {
    const codeVerifier = generateRandomString(64);
    const hashed = await sha256(codeVerifier);
    const codeChallenge = base64encode(hashed);

    window.localStorage.setItem('code_verifier', codeVerifier);

    const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        scope,
        code_challenge_method: 'S256',
        code_challenge: codeChallenge,
        redirect_uri: redirectUri,
    });

    // Corrected the URL and the template literal syntax
    window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

async function getAccessToken(code) {
    const codeVerifier = window.localStorage.getItem('code_verifier');
    const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: clientId,
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: redirectUri,
            code_verifier: codeVerifier,
        }),
    });

    // Check if the response is okay before parsing JSON
    if (!response.ok) {
        const errorBody = await response.text(); // Get the text like "Check settings..."
        console.error("Token Error:", errorBody);
        throw new Error(`Spotify Auth Failed: ${response.status}`);
    }

    // console.log("ACCESS TOKEN:", accessToken);
    return await response.json();
}

// To get my ID
async function getMyUserId(token) {
    const response = await fetch('https://api.spotify.com/v1/me', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    console.log("getMyUserId function")
    console.log(data)
    console.log(data.id)
    return data.id;
}

async function fetchPlaylists(token) {
    const response = await fetch('https://api.spotify.com/v1/me/playlists', {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
        console.error("API Error:", await response.text());
        return;
    }

    const data = await response.json();
    renderPlaylists(data.items, token);
}

async function loadSongs(playlistId, accessToken) {
    console.log("load songs")
    if (!accessToken) {
    console.error("No access token found");
    redirectToSpotify();
    return;
    } 
    const expiresAt = Number(localStorage.getItem('expires_at'));
    if (Date.now() >= expiresAt) {
        redirectToSpotify();
        return;
    }
  
    let container = document.getElementById('playlist-tracks');
    if (!container) return;
    container.classList.remove('is-visible');
    void container.offsetWidth;
    let tracks = [];
    // Note: Ensure the URL uses the correct backticks for the variable template
    let nextUrl = `https://api.spotify.com/v1/playlists/${playlistId}/items?limit=100`;
    console.log(nextUrl)

    try {
        const cachedPlaylist = localStorage.getItem(playlistId);
        
        if (cachedPlaylist) {
            console.log("Loading playlist from local storage...");
            const cachedTracks = JSON.parse(cachedPlaylist);
            
            let htmlContent = `<button id="shuffle">Shuffle and Add to Queue</button>`;
            cachedTracks.forEach((track, index) => {
                htmlContent += `<p><strong>${index + 1}.</strong> ${track.name} - ${track.artist}</p>`;
            });
            container.innerHTML = htmlContent;

            let shuffled = weightedRandomShuffel(cachedPlaylist, playlistId)

            const shuffleButton = document.querySelector("#shuffle");

            if (shuffleButton) {
                shuffleButton.onclick = () => {
                    addToQueue(shuffled, accessToken);
                };
            } else {
                console.error("Shuffle button not found in the DOM!");
            }
            return; 
        }

        while (nextUrl) {
            console.log("loop")
            const response = await fetch(nextUrl, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            tracks = tracks.concat(data.items);
            nextUrl = data.next;
        }

        // Build the HTML string first
        let htmlContent = `<button id="shuffle">Shuffle and Add to Queue</button>`;
        const tracksData = []; 
        console.log(tracks)
        tracks.forEach((entry, index) => { 
            if (entry && entry.item) {
                console.log("creating html")
                const trackName = entry.item.name;
                const artistName = entry.item.artists?.[0]?.name || "Unknown Artist";
                const albumName = entry.item.album?.[0]?.name || "Unknown Album";

                htmlContent += `
                    <p><strong>${index + 1}.</strong> ${trackName} - ${artistName}</p>
                `;
                const trackData = {
                    index: index,
                    id: entry.item.id,
                    name: trackName,
                    artist: artistName,
                    album: albumName,
                    weight: 0
                };
                
                tracksData.push(trackData);
            }
        });
        localStorage.setItem(playlistId, JSON.stringify(tracksData));

        console.log(htmlContent)

        container.innerHTML = htmlContent || "<p>No tracks found.</p>";

        requestAnimationFrame(() => {
            container.classList.add('is-visible');
        });

        let shuffled = weightedRandomShuffel(tracksData, playlistId, true)
        
        const shuffleButton = document.querySelector("#shuffle");

        if (shuffleButton) {
            shuffleButton.onclick = () => {
                addToQueue(shuffled, accessToken);
            };
        } else {
            console.error("Shuffle button not found in the DOM!");
        }

    } catch (error) {
        console.error("Failed to load tracks:", error);
    }

}


const renderPlaylists = async (playlists, token) => {
    // FIX: Define the container here so it's available to the code below
    const container = document.getElementById('music-list'); 
    
    if (!container) {
        console.error("Could not find element with id 'music-list'");
        return;
    }

    container.innerHTML = ''; // Clear existing content
    const me = await getMyUserId(token)
    console.log("Renderplaylist function");
    console.log(me);


    playlists.forEach(playlist => {
        if (playlist.owner.id == me) {
            const playlistEl = document.createElement('div');
            playlistEl.classList.add('playlist-card');

            playlistEl.innerHTML = `
                <img src="${playlist.images[0]?.url || ''}" alt="${playlist.name}">
                <p>${playlist.name}</p>
            `;
        

        playlistEl.addEventListener('click', () => {
            const token = localStorage.getItem('access_token')
        
            loadSongs(playlist.id, token);
        });
        container.appendChild(playlistEl); 
    }});
};

function weightedRandomShuffel(data, playlistId, firstTime = false){

    if (typeof data === 'string') {
        data = JSON.parse(data);
    }

    let dataGroup0 = []
    let dataGroup1 = []
    let dataGroup2 = []
    let dataGroup3 = []
    let dataGroup4 = []
    let queue = []
    
    data.forEach(song => {
        const group = song.index % 5;

        if (group === 0) dataGroup0.push(song);
        else if (group === 1) dataGroup1.push(song);
        else if (group === 2) dataGroup2.push(song);
        else if (group === 3) dataGroup3.push(song);
        else if (group === 4) dataGroup4.push(song);
    });

    dataGroup0.sort((a, b) => b.weight - a.weight);
    dataGroup1.sort((a, b) => b.weight - a.weight);
    dataGroup2.sort((a, b) => b.weight - a.weight);
    dataGroup3.sort((a, b) => b.weight - a.weight);
    dataGroup4.sort((a, b) => b.weight - a.weight);

    while (dataGroup0.length > 0){
        queue.push(dataGroup0.shift());
        if (dataGroup1.length > 0) queue.push(dataGroup1.shift());
        if (dataGroup0.length > 0) queue.push(dataGroup0.shift());
    }
    
    while (dataGroup1.length > 0){
        queue.push(dataGroup1.shift());
        if (dataGroup2.length > 0) queue.push(dataGroup2.shift());
    }
    
    while (dataGroup2.length > 0){
        queue.push(dataGroup2.shift());
        if (dataGroup3.length > 0) queue.push(dataGroup3.shift());
    }
    
    while (dataGroup3.length > 0){
        queue.push(dataGroup3.shift());
        if (dataGroup4.length > 0) queue.push(dataGroup4.shift());
        if (dataGroup4.length > 0) queue.push(dataGroup4.shift());
    }
    while(dataGroup4.length > 0){
        queue.push(dataGroup4.shift());
    }

    let place = 0
    queue.forEach(song =>{
        place ++;
        song.weight = Math.round((song.weight + place) / 2);
        console.log(song.name)
    })

    localStorage.setItem(playlistId, JSON.stringify(queue));

    if (firstTime){
        return weightedRandomShuffel(queue, playlistId, false)
    }
    else{
        return queue
    }
}


async function addToQueue(data, accessToken) {
    // We use a for...of loop for async/await to ensure order 
    // and avoid hitting Spotify's rate limit too hard
    for (const song of data) {
         console.log(song)
         console.log(song.id)
        // Construct the URI (Spotify needs the spotify:track:ID format)
        const trackId = `spotify:track:${song.id}`;
        // The Endpoint from your screenshot
        // The 'uri' must be a query parameter
        let url = `https://api.spotify.com/v1/me/player/queue?uri=${encodeURIComponent(trackId)}`;
        

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                console.log(`Added to queue: ${song.name}`);
            } else if (response.status === 429) {
                console.warn("Rate limited! Waiting a moment...");
                await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
                const errorData = await response.json();
                console.error(`Failed to add ${song.name}:`, errorData);
            }
        } catch (error) {
            console.error("Network error adding to queue:", error);
        }
        
        // Small delay between calls to be safe
        await new Promise(resolve => setTimeout(resolve, 10));
    }
}

const init = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    
    // 1. Handle Login Redirects
    document.getElementById('loginBtn').addEventListener('click', redirectToSpotify);
    if (document.getElementById('welcomeLogin')) {
        document.getElementById('welcomeLogin').addEventListener('click', redirectToSpotify);
    }
    const storedToken = window.localStorage.getItem('access_token');

    // 2. Logic Branching
    if (code === "5") {
        // Dev Mode
        const response = await fetch('./scripts/testplaylists.json');
        const data = await response.json();
        renderPlaylists(data.items, "mock_token"); 

    } else if (code) {
        // Just returned from Spotify Auth
        const authData = await getAccessToken(code);
        if (authData.access_token) {
            const expiresAt = Date.now() + (authData.expires_in * 1000);
            window.localStorage.setItem('access_token', authData.access_token);
            window.localStorage.setItem('expires_at', expiresAt);
            // Clean URL so the 'code' doesn't stay in the address bar
            window.history.replaceState({}, document.title, window.location.pathname);
            fetchPlaylists(authData.access_token);
        }
        
    } else if (storedToken) {
        const expiresAt = Number(window.localStorage.getItem('expires_at'));
        if (Date.now() < expiresAt) {
        fetchPlaylists(storedToken);
        } else {
            console.log("Token expired. Re-authenticating...");
            redirectToSpotify();
        }
        // Returning user with a valid sessiion
    } else {
        // New user, no code, no token: Show login UI
        console.log("Waiting for login...");
    }
};

init();
