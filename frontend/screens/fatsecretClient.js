import { functions } from "../../firebase.config";
import { httpsCallable } from "firebase/functions";

// convenience wrapper for your dedicated search function
const callSearch = httpsCallable(functions, "fatsecretSearchFood");
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

export async function lookupBarcode(barcode) {
    const res = await callBarcode({ barcode });
    return res.data; // { food }
}

export async function getFoodById(food_id) {
    const res = await callGetFood({ food_id });
    return res.data; // { food }
}
