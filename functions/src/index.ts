import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const serviceAccount = require('../firestarter-96e46-firebase-adminsdk-4n0tv-3a219ba7ec.json')

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://firestarter-96e46.firebaseio.com'
});

import * as crypto from 'crypto';
import * as qs from 'querystring';
import axios from 'axios';

import * as CORS from 'cors';
const cors = CORS({ origin: true });

const redirect_uri  = 'http://localhost:4200/redirect';
const client_id = functions.config().coinbase.id
const client_secret = functions.config().coinbase.secret

const defaultParams = { 
    client_id, 
    client_secret, 
    redirect_uri
}




//// Cloud Functions ////

// Configure the redirect URL for the user to sign into Coinbase
export const redirect = functions.https.onRequest((req, res) => {
    const base = 'https://www.coinbase.com/oauth/authorize?';

    const queryParams = { 
        ...defaultParams,
        response_type: 'code',
        code: req.query.code,
        scope: 'wallet:accounts:read',
        state: crypto.randomBytes(20).toString('hex')
    }
    const endpoint = base + qs.stringify( queryParams )

    res.redirect(endpoint);  
});



// Use the code returned from Coinbase to mint a custom auth token in Firebase
export const token = functions.https.onRequest((req, res) => {
    cors( req, res, () => { 
        
        return mintAuthToken(req)
                .then(authToken => res.json({ authToken }))
                .catch(err => console.log(err))

    });
});




export const wallet = functions.https.onRequest((req, res) => {
    cors( req, res, () => { 

        
        return getWallet(req)
                .then(wallets => res.json(wallets))
                .catch(err => console.log(err))

    });

});

////// Async Helper Functions //////

async function mintAuthToken(req): Promise<string> {
    const base = 'https://api.coinbase.com/oauth/token?'

    const queryParams = { 
        ...defaultParams,
        grant_type: 'authorization_code',
        code: req.query.code
    }


    const endpoint = base + qs.stringify( queryParams )
    

    const login        = await axios.post(endpoint);
    const accessToken  = login.data.access_token
    const refreshToken = login.data.refresh_token

    const user      = await getCoinbaseUser(accessToken)
    const uid       = 'coinbase:' + user.id

    const authToken = await admin.auth().createCustomToken(uid);

    await admin.database().ref(`coinbaseTokens/${uid}`).update({ accessToken, refreshToken })
    
    return authToken
}

// Retrieve the user account data from Coinbase
async function getCoinbaseUser(accessToken: any): Promise<any> {
    const userUrl = 'https://api.coinbase.com/v2/user';

    const user = await axios.get(userUrl, { headers: { 'Authorization': `Bearer ${accessToken}` } });

    return user.data.data
}


// Validate the Firebase auth header to authenticate the user
async function verifyUser(req): Promise<string> {
    let authToken = req.headers.authorization as string
    authToken = authToken.split('Bearer ')[1]

    const verifiedToken = await admin.auth().verifyIdToken(authToken)

    return verifiedToken.uid
}

// Get the user's wallet data from Coinbase
async function getWallet(req): Promise<any> {
    const endpoint = 'https://api.coinbase.com/v2/accounts';

    const uid          = await verifyUser(req)

    const accessToken  = await updateTokens(uid) 
    const accounts     = await axios.get(endpoint, { headers: { 'Authorization': `Bearer ${accessToken}` } })

    return accounts.data.data
}

// Used to update tokens for an authenticated user.
async function updateTokens(uid: string): Promise<string> {
    const base = 'https://api.coinbase.com/oauth/token?';

    const oldRefreshToken = await admin.database()
                                       .ref(`coinbaseTokens/${uid}`)
                                       .once('value')
                                       .then(data => data.val().refreshToken)
                                       
    const queryParams = { 
        ...defaultParams,
        refresh_token: oldRefreshToken,
        grant_type: 'refresh_token'
    }

    
    const endpoint = base + qs.stringify( queryParams ) 

    const response = await axios.post(endpoint)

    const accessToken  = response.data.access_token
    const refreshToken = response.data.refresh_token

    await admin.database().ref(`coinbaseTokens/${uid}`).update({ accessToken, refreshToken })

    return accessToken
}
