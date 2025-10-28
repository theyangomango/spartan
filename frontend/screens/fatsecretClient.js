import { functions } from "../../firebase.config";
import { httpsCallable } from "firebase/functions";

// convenience wrapper for your dedicated search function
const callSearch = httpsCallable(functions, "fatsecretSearchFood");
// generic passthrough if you enabled fatsecretMethod
const callGeneric = httpsCallable(functions, "fatsecretMethod");
// barcode lookup (Premier Free)
const callBarcode = httpsCallable(functions, "fatsecretLookupBarcode");
const callGetFood = httpsCallable(functions, "fatsecretGetFood");

export async function searchFood(query, { maxResults = 50, page = 0 } = {}) {
    const res = await callSearch({
        query,
        max_results: maxResults,
        page_number: page,
    });
    return res.data; // the JSON your Cloud Function returned
}

export async function fatsecret(method, params = {}) {
    const res = await callGeneric({ method, params });
    return res.data;
}

export async function lookupBarcode(barcode) {
    const res = await callBarcode({ barcode });
    return res.data; // { food }
}

export async function getFoodById(food_id) {
    const res = await callGetFood({ food_id });
    console.log(res.data);
    return res.data; // { food }
}


// // fatsecretClient.js
// const CONSUMER_KEY = '1c526334ff924bb29ea4f81595b38268';
// const CONSUMER_SECRET = '307b6d1439034f79928647a500186d8d';

// let accessToken = null;

// async function getAccessToken() {
//     if (accessToken) return accessToken;

//     const response = await fetch('https://oauth.fatsecret.com/connect/token', {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/x-www-form-urlencoded',
//         },
//         body: new URLSearchParams({
//             grant_type: 'client_credentials',
//             scope: 'basic',
//             client_id: CONSUMER_KEY,
//             client_secret: CONSUMER_SECRET,
//         }).toString(),
//     });

//     const data = await response.json();
//     accessToken = data.access_token;
//     return accessToken;
// }

// async function makeFatSecretRequest(methodName, params = {}) {
//     const token = await getAccessToken();

//     const url = 'https://platform.fatsecret.com/rest/server.api';
//     const fullParams = {
//         method: methodName,
//         format: 'json',
//         ...params,
//     };

//     const response = await fetch(url, {
//         method: 'POST',
//         headers: {
//             Authorization: `Bearer ${token}`,
//             'Content-Type': 'application/x-www-form-urlencoded',
//         },
//         body: new URLSearchParams(fullParams).toString(),
//     });

//     const json = await response.json();
//     return json;
// }

// export async function searchFood(query) {
//     return await makeFatSecretRequest('foods.search', {
//         search_expression: query,
//     });
// }
