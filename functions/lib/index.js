"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const serviceAccount = require('../firestarter-96e46-firebase-adminsdk-4n0tv-3a219ba7ec.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://firestarter-96e46.firebaseio.com'
});
const crypto = require("crypto");
const qs = require("querystring");
const axios_1 = require("axios");
const CORS = require("cors");
const cors = CORS({ origin: true });
const redirect_uri = 'http://localhost:4200/redirect';
const client_id = '21c90d04417f0f50a2f2eca02b4a1f5f223f7b229cadb4f796b5e33f550f3709';
const client_secret = '2b28a6df889ca76c2e034282ddd3a2a51fa39e5ee07625e8c5a85b0dee34dcf4';
const defaultParams = {
    client_id,
    client_secret,
    redirect_uri
};
// const key = functions.config().coinbase.key
// const secret = functions.config().coinbase.secret
//// Cloud Functions ////
// Configure the redirect URL for the user to sign into Coinbase
exports.redirect = functions.https.onRequest((req, res) => {
    const base = 'https://www.coinbase.com/oauth/authorize?';
    const queryParams = Object.assign({}, defaultParams, { response_type: 'code', code: req.query.code, scope: 'wallet:accounts:read', state: crypto.randomBytes(20).toString('hex') });
    const endpoint = base + qs.stringify(queryParams);
    res.redirect(endpoint);
});
// Use the code returned from Coinbase to mint a custom auth token in Firebase
exports.token = functions.https.onRequest((req, res) => {
    cors(req, res, () => {
        return mintAuthToken(req)
            .then(authToken => res.json({ authToken }))
            .catch(err => console.log(err));
    });
});
exports.wallet = functions.https.onRequest((req, res) => {
    cors(req, res, () => {
        return getWallet(req)
            .then(wallets => res.json(wallets))
            .catch(err => console.log(err));
    });
});
////// Async Helper Functions //////
function mintAuthToken(req) {
    return __awaiter(this, void 0, void 0, function* () {
        const base = 'https://api.coinbase.com/oauth/token?';
        const queryParams = Object.assign({}, defaultParams, { grant_type: 'authorization_code', code: req.query.code });
        const endpoint = base + qs.stringify(queryParams);
        const login = yield axios_1.default.post(endpoint);
        const accessToken = login.data.access_token;
        const refreshToken = login.data.refresh_token;
        const user = yield getCoinbaseUser(accessToken);
        const uid = 'coinbase:' + user.id;
        const authToken = yield admin.auth().createCustomToken(uid);
        yield admin.database().ref(`coinbaseTokens/${uid}`).update({ accessToken, refreshToken });
        return authToken;
    });
}
// Retrieve the user account data from Coinbase
function getCoinbaseUser(accessToken) {
    return __awaiter(this, void 0, void 0, function* () {
        const userUrl = 'https://api.coinbase.com/v2/user';
        const user = yield axios_1.default.get(userUrl, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        return user.data.data;
    });
}
// Validate the Firebase auth header to authenticate the user
function verifyUser(req) {
    return __awaiter(this, void 0, void 0, function* () {
        let authToken = req.headers.authorization;
        authToken = authToken.split('Bearer ')[1];
        const verifiedToken = yield admin.auth().verifyIdToken(authToken);
        return verifiedToken.uid;
    });
}
// Get the user's wallet data from Coinbase
function getWallet(req) {
    return __awaiter(this, void 0, void 0, function* () {
        const endpoint = 'https://api.coinbase.com/v2/accounts';
        const uid = yield verifyUser(req);
        const accessToken = yield updateTokens(uid);
        const accounts = yield axios_1.default.get(endpoint, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        return accounts.data.data;
    });
}
// Used to update tokens for an authenticated user.
function updateTokens(uid) {
    return __awaiter(this, void 0, void 0, function* () {
        const base = 'https://api.coinbase.com/oauth/token?';
        const oldRefreshToken = yield admin.database()
            .ref(`coinbaseTokens/${uid}`)
            .once('value')
            .then(data => data.val().refreshToken);
        const queryParams = Object.assign({}, defaultParams, { refresh_token: oldRefreshToken, grant_type: 'refresh_token' });
        const endpoint = base + qs.stringify(queryParams);
        const response = yield axios_1.default.post(endpoint);
        const accessToken = response.data.access_token;
        const refreshToken = response.data.refresh_token;
        yield admin.database().ref(`coinbaseTokens/${uid}`).update({ accessToken, refreshToken });
        return accessToken;
    });
}
//     return axios.post(url).then(response => {
//         const data = response.data;
//         const userUrl = 'https://api.coinbase.com/v2/user';
//         return axios.get(userUrl, { headers: { 'Authorization': `Bearer ${data.access_token}` } })
//     })
//     .then(coinbaseUser => {
//         // Mint a custom auth token
//         const uid = coinbaseUser.data.data.uid;
//         return admin.auth().createCustomToken(uid);
//     })
//     // .then(() => {
//     //     return admin.database().ref('coinbaseTokens')
//     // })
//     .then(authToken =>  res.json({ authToken }))
//     .catch(err => console.log(err)) 
//# sourceMappingURL=index.js.map