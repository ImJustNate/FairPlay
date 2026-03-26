// const client_id = "3edfcb2cdb144a9796a8c39f5ce3730a";
// const client_secret = '2693336dd1044b1989fe26ad8f42500f';
// const express = require('express');
// const axios = require('axios'); // You'll need: npm install axios
// const querystring = require('querystring');
// require('dotenv').config(); // Best practice: npm install dotenv

// const app = express();

// const redirect_uri = 'http://127.0.0.1:8888/callback';

// app.get('/login', function(req, res) {
//   const state = '1234567890123456'; // Simplified for this example
//   const scope = 'user-read-private user-read-email';

//   res.redirect('https://accounts.spotify.com/authorize?' +
//     querystring.stringify({
//       response_type: 'code',
//       client_id: client_id,
//       scope: scope,
//       redirect_uri: redirect_uri,
//       state: state
//     }));
// });

// app.get('/callback', async function(req, res) {
//   const code = req.query.code || null;
//   const state = req.query.state || null;

//   if (state === null) {
//     res.redirect('/#error=state_mismatch');
//   } else {
//     try {
//       // This is where 'app' executes the actual token exchange
//       const response = await axios({
//         method: 'post',
//         url: 'https://accounts.spotify.com/api/token',
//         data: querystring.stringify({
//           code: code,
//           redirect_uri: redirect_uri,
//           grant_type: 'authorization_code'
//         }),
//         headers: {
//           'content-type': 'application/x-www-form-urlencoded',
//           'Authorization': 'Basic ' + (Buffer.from(client_id + ':' + client_secret).toString('base64'))
//         }
//       });

//       // Success! You now have the access token
//       const { access_token, refresh_token } = response.data;
//       res.send({ message: "Authenticated!", token: access_token });

//     } catch (error) {
//       res.send({ error: "Authentication failed", details: error.response.data });
//     }
//   }
// });

// // START THE SERVER
// const PORT = 8888;
// app.listen(PORT, () => {
//   console.log(`🚀 App is alive at http://127.0.0.1:${PORT}/login`);
// });

// // const clientId = '3edfcb2cdb144a9796a8c39f5ce3730a'; 
// // const redirectUri = 'http://127.0.0.1:5500/test.html'; // Must match Spotify Dashboard!

// // function login() {
// //     const scope = 'user-read-private user-read-email';
// //     const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;
    
// //     window.location.href = authUrl;
// // }

// // // Function to run on page load
// // window.onload = () => {
// //     const hash = window.location.hash;
// //     console.log('1')
// //     console.log(hash)
// //     if (hash) {
// //         const token = new URLSearchParams(hash.substring(1)).get('access_token');
// //         console.log(token)
// //         if (token) {
// //             generateContent(token);

// //         }
// //     }
// // };

// // async function generateContent(token) {
// //     const response = await fetch('https://api.spotify.com/v1/me', {
// //         headers: { 'Authorization': 'Bearer ' + token }
// //     });
// //     const data = await response.json();
// //     document.getElementById('display').innerHTML = `<h2>Welcome, ${data.display_name}!</h2>`;
// // }

var client_id = '3edfcb2cdb144a9796a8c39f5ce3730a';
var client_secret = '2693336dd1044b1989fe26ad8f42500f';

async function getToken() {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + btoa(`${client_id}:${client_secret}`)
    },
    body: 'grant_type=client_credentials'
  });

  const data = await response.json();
  console.log(data.access_token);
  return data.access_token
}

async function getplaylist(token) {
  const response = await fetch('https://api.spotify.com/v1/albums/4aawyAB9vmqN3uQ7FjRGTy', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token
    },
    // body: 'grant_type=client_credentials'
  });

  const data = await response.json();
  console.log(data.access_token);
}

async function getSpotifyAlbum(token) {
  try {
    const response = await fetch('https://api.spotify.com/v1/albums/4aawyAB9vmqN3uQ7FjRGTy', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(data);
  } catch (error) {
    console.error('Request failed:', error);
  }
}

async function getUserID(token, playlistID) {
  try {
    const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistID}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(data);
  } catch (error) {
    console.error('Request failed:', error);
  }
}

// async function getUserID(token) {
//   try {
//     const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistID}`, {
//       method: 'GET',
//       headers: {
//         'Authorization': `Bearer ${token}`
//       }
//     });

//     if (!response.ok) {
//       throw new Error(`HTTP error! status: ${response.status}`);
//     }

//     const data = await response.json();
//     console.log(data);
//   } catch (error) {
//     console.error('Request failed:', error);
//     return null;
//   }
// }

async function getSpotifyDataV2(token) {
  try {
    const response = await fetch('https://api.spotify.com/v1/me/playlists', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('Success:', data);
    return data;
  } catch (error) {
    console.error('Fetch failed:', error);
  }
}




let token = await getToken()
let tempPlaylistID = '55gj1P2XPDay5TSEtSgQDu'

getUserID(token, tempPlaylistID)

getSpotifyDataV2(token);
getSpotifyAlbum(token);


// getplaylist(token)


