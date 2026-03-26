//  --- to enter dev mode go to http://127.0.0.1:5500/playlist.html?code=5 ---

const clientId = "3edfcb2cdb144a9796a8c39f5ce3730a"; 
const redirectUri = 'https://fairplayer.netlify.app/playlist'; 
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
    let tracks = [];
    // Note: Ensure the URL uses the correct backticks for the variable template
    let nextUrl = `https://api.spotify.com/v1/playlists/${playlistId}/items?limit=100`;

    try {
        while (nextUrl) {
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
        let htmlContent = "";
        tracks.forEach((item, index) => { 
            if (item && item.track) {
                // const trackName = tracks[i].track.name;
                const trackName = item.track.name;
                // const artistName = tracks[i].track.artists[0].name;
                const artistName = item.track.artists[0]?.name || "Unknown Artist";

                htmlContent += `
                    <p><strong>${index + 1}.</strong> ${trackName} - ${artistName}</p>
                `;
            }
        });
        container.innerHTML = htmlContent || "<p>No tracks found.</p>";

    } catch (error) {
        console.error("Failed to load tracks:", error);
    }
}


const renderPlaylists = (playlists, token) => {
    // FIX: Define the container here so it's available to the code below
    const container = document.getElementById('music-list'); 
    
    if (!container) {
        console.error("Could not find element with id 'music-list'");
        return;
    }

    container.innerHTML = ''; // Clear existing content

    playlists.forEach(playlist => {
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
    });
};


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
