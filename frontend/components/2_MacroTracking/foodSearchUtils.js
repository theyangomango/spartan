// Pure helpers of the food search overlay: food keys, result merging, filtering and ranking, favourite ordering.
import { makeFoodFavoriteKey } from '../../utils/favoriteFoods';

export const foodKey = (item) => {
    if (!item) return '';
    return makeFoodFavoriteKey({
        foodId: item.food_id ?? item.foodId ?? item.id ?? '',
        name: item.food_name ?? item.name ?? '',
        brand: item.brand_name ?? item.brand ?? '',
    });
};

export const mergeUniqueFoods = (prev = [], next = []) => {
    const merged = Array.isArray(prev) ? [...prev] : [];
    const seen = new Set();
    for (const item of merged) {
        const key = foodKey(item);
        if (key) seen.add(key);
    }
    if (!Array.isArray(next)) return merged;
    for (const item of next) {
        if (!item) continue;
        const key = foodKey(item);
        if (!key) {
            merged.push(item);
            continue;
        }
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(item);
    }
    return merged;
};

const PER_100_REGEX = /\bper\s*100\s*(?:g|gram|grams|ml|milliliter|milliliters|millilitre|millilitres)\b/i;
const TINY_PRODUCE_PORTION_REGEX = /\bper\s*1\s*(?:seedless|grape|grapes|berry|berries|cherry|cherries)\b/i;
const PRODUCE_KEYWORDS = [
    'apple', 'banana', 'orange', 'pear', 'peach', 'plum', 'apricot', 'grape', 'melon', 'watermelon', 'cantaloupe',
    'honeydew', 'pineapple', 'mango', 'papaya', 'kiwi', 'berry', 'strawberry', 'blueberry', 'raspberry', 'blackberry',
    'cranberry', 'cherry', 'tomato', 'potato', 'onion', 'garlic', 'ginger', 'carrot', 'broccoli', 'cauliflower',
    'lettuce', 'spinach', 'kale', 'cabbage', 'pepper', 'cucumber', 'zucchini', 'eggplant', 'avocado', 'corn',
];
const FLAVOR_PRODUCT_TERMS = [
    'juice', 'drink', 'soda', 'flavor', 'flavoured', 'flavored', 'powder', 'beverage', 'cocktail', 'punch',
    'candy', 'gummy', 'gum', 'bar', 'airheads', 'energy', 'sports drink', 'electrolyte', 'sparkling', 'ade',
];
const BEVERAGE_BRAND_TERMS = [
    'powerade', 'gatorade', 'bodyarmor', 'pedialyte', 'kool aid', 'minute maid', 'ocean spray', 'welch', 'tropicana',
    'capri sun', 'snapple', 'fanta', 'sunkist',
];
const LIQUID_SERVING_REGEX = /\b(?:fl\s*oz|fluid ounce|ml|cup|cups|can|bottle|pouch)\b/i;
const PRODUCE_BYPRODUCT_TERMS = ['leaf', 'leaves', 'vinegar', 'wine', 'jam', 'jelly', 'extract'];
const RESTAURANT_BRAND_TERMS = [
    'mcdonald', 'wendy', 'burger king', 'jack in the box', 'whataburger', 'in n out', 'chick fil a', 'taco bell',
    'kfc', 'arbys', 'subway', 'chipotle', 'popeyes', 'panera', 'sonic', 'dairy queen', 'dominos', 'pizza hut',
    'papa john', 'little caesars', 'five guys', 'shake shack', 'culver', 'ihop', 'denny', 'applebee', 'chilis',
];
const RESTAURANT_MENU_REGEX = /\b(?:jr\.?|combo|value meal|kids meal|platter|double cheeseburger|mcnugget|whopper)\b/i;
const RESTAURANT_QUERY_HINTS = [
    'restaurant', 'combo', 'meal', 'jr', 'burger', 'cheeseburger', 'fast food', 'mcdonald', 'wendy', 'taco bell',
    'kfc', 'subway', 'chipotle', 'popeyes', 'panera',
];

const normalize = (value) => String(value || '').trim().toLowerCase();
const singularizeToken = (value) => {
    const t = normalize(value);
    if (t.endsWith('ies') && t.length > 3) return `${t.slice(0, -3)}y`;
    if (t.endsWith('es') && t.length > 3) return t.slice(0, -2);
    if (t.endsWith('s') && t.length > 3) return t.slice(0, -1);
    return t;
};
const PRODUCE_LOOKUP = new Set(PRODUCE_KEYWORDS.map((kw) => singularizeToken(kw)));
const hasAnyTerm = (text, terms = []) => terms.some((term) => term && text.includes(term));
const isGenericBrand = (brand) => {
    const normalized = normalize(brand);
    return !normalized || normalized === 'generic' || normalized === 'fatsecret' || normalized === 'fat secret' || normalized === 'n/a';
};

const getQueryTokens = (query) => normalize(query).split(/\s+/).filter(Boolean);
const isProduceIntentQuery = (queryTokens = []) => queryTokens.some((token) => PRODUCE_LOOKUP.has(singularizeToken(token)));
const queryMentionsFlavorProduct = (queryTokens = []) => hasAnyTerm(queryTokens.join(' '), FLAVOR_PRODUCT_TERMS);
const BRAND_STOP_TOKENS = new Set([
    'food', 'foods', 'serving', 'servings', 'fresh', 'raw', 'organic', 'plain', 'light', 'low', 'fat', 'free',
    'grape', 'grapes', 'apple', 'apples', 'banana', 'bananas', 'orange', 'oranges', 'berry', 'berries',
    'juice', 'drink', 'soda', 'flavor', 'flavored', 'flavoured',
]);
const getBrandIntentTokens = (queryTokens = []) => {
    return queryTokens.filter((token) => {
        if (!token || token.length < 3) return false;
        if (BRAND_STOP_TOKENS.has(token)) return false;
        if (PRODUCE_LOOKUP.has(singularizeToken(token))) return false;
        return true;
    });
};

const looksLikeProduce = (name, queryTokens = []) => {
    const blob = `${normalize(name)} ${queryTokens.map((t) => singularizeToken(t)).join(' ')}`;
    return PRODUCE_KEYWORDS.some((kw) => blob.includes(kw));
};

const queryHasRestaurantIntent = (queryTokens = []) => {
    const q = queryTokens.join(' ');
    if (!q) return false;
    return hasAnyTerm(q, RESTAURANT_QUERY_HINTS);
};

const looksLikeRestaurantItem = (item) => {
    const name = normalize(item?.food_name ?? item?.name ?? '');
    const brand = normalize(item?.brand_name ?? item?.brand ?? '');
    const blob = `${name} ${brand}`;
    if (RESTAURANT_MENU_REGEX.test(blob)) return true;
    return hasAnyTerm(blob, RESTAURANT_BRAND_TERMS);
};

const shouldHidePer100Result = (item, queryTokens) => {
    const desc = normalize(item?.food_description ?? item?.description ?? '');
    if (!PER_100_REGEX.test(desc)) return false;

    const name = normalize(item?.food_name ?? item?.name ?? '');
    const brand = item?.brand_name ?? item?.brand ?? '';

    if (!looksLikeProduce(name, queryTokens)) return false;
    if (!isGenericBrand(brand)) return false; // keep branded foods even if per 100g

    // Hide unbranded produce-style items that only list per-100g servings
    return true;
};

const shouldHideTinyProduceServing = (item, produceIntent) => {
    if (!produceIntent) return false;
    const desc = normalize(item?.food_description ?? item?.description ?? '');
    if (!TINY_PRODUCE_PORTION_REGEX.test(desc)) return false;
    const brand = item?.brand_name ?? item?.brand ?? '';
    return isGenericBrand(brand);
};

const isFlavorProductResult = (item) => {
    const name = normalize(item?.food_name ?? item?.name ?? '');
    const brand = normalize(item?.brand_name ?? item?.brand ?? '');
    const blob = `${name} ${brand}`;
    return hasAnyTerm(blob, FLAVOR_PRODUCT_TERMS);
};

const shouldHideFlavorProductForProduce = (item, produceIntent, wantsFlavorProduct) => {
    if (!produceIntent || wantsFlavorProduct) return false;
    return isFlavorProductResult(item);
};

const shouldHideBrandedLiquidProduce = (item, produceIntent, wantsFlavorProduct) => {
    if (!produceIntent || wantsFlavorProduct) return false;
    const brand = item?.brand_name ?? item?.brand ?? '';
    if (isGenericBrand(brand)) return false;
    const desc = normalize(item?.food_description ?? item?.description ?? '');
    const brandBlob = `${normalize(item?.food_name ?? item?.name ?? '')} ${normalize(brand)}`;
    const brandedLiquid = LIQUID_SERVING_REGEX.test(desc) || hasAnyTerm(brandBlob, BEVERAGE_BRAND_TERMS);
    return brandedLiquid;
};

const shouldHideProduceByproductResult = (item, produceIntent) => {
    if (!produceIntent) return false;
    const name = normalize(item?.food_name ?? item?.name ?? '');
    return hasAnyTerm(name, PRODUCE_BYPRODUCT_TERMS);
};

const scoreSearchResult = (item, queryTokens, produceIntent, restaurantIntent, brandIntentTokens = []) => {
    const queryText = queryTokens.join(' ');
    const name = normalize(item?.food_name ?? item?.name ?? '');
    const brand = normalize(item?.brand_name ?? item?.brand ?? '');
    const hasBrandIntent = brandIntentTokens.length > 0;
    const matchedBrandTokens = brandIntentTokens.filter((token) => brand.includes(token));
    const brandMatchCount = matchedBrandTokens.length;

    let score = 0;
    if (queryText && name === queryText) score += 3;
    if (queryText && name.startsWith(`${queryText} `)) score += 2.5;
    else if (queryText && name.includes(queryText)) score += 1.5;
    if (queryTokens.length && queryTokens.every((token) => name.includes(token))) score += 1;
    if (isGenericBrand(brand)) score += 0.35;
    if (brandMatchCount > 0) score += 4 + (brandMatchCount * 1.2);
    if (hasBrandIntent && brandMatchCount === 0 && brand) score -= 0.9;
    if (hasBrandIntent && brandMatchCount === 0 && isGenericBrand(brand)) score -= 0.4;

    if (produceIntent) {
        if (isGenericBrand(brand)) score += 1.4;
        if (isFlavorProductResult(item)) score -= 2.2;
    }

    if (looksLikeRestaurantItem(item) && !restaurantIntent) {
        score -= 1.6;
    }
    return score;
};

export const filterSearchResults = (items, query) => {
    if (!Array.isArray(items)) return [];
    const queryTokens = getQueryTokens(query);
    const produceIntent = isProduceIntentQuery(queryTokens);
    const wantsFlavorProduct = queryMentionsFlavorProduct(queryTokens);
    const restaurantIntent = queryHasRestaurantIntent(queryTokens);
    const brandIntentTokens = getBrandIntentTokens(queryTokens);

    return items
        .filter((item) => !shouldHidePer100Result(item, queryTokens))
        .filter((item) => !shouldHideTinyProduceServing(item, produceIntent))
        .filter((item) => !shouldHideFlavorProductForProduce(item, produceIntent, wantsFlavorProduct))
        .filter((item) => !shouldHideBrandedLiquidProduce(item, produceIntent, wantsFlavorProduct))
        .filter((item) => !shouldHideProduceByproductResult(item, produceIntent))
        .map((item, index) => ({
            item,
            index,
            score: scoreSearchResult(item, queryTokens, produceIntent, restaurantIntent, brandIntentTokens),
        }))
        .sort((a, b) => {
            if (b.score === a.score) return a.index - b.index;
            return b.score - a.score;
        })
        .map((entry) => entry.item);
};

export const buildFavoriteMap = (items = []) => {
    if (!Array.isArray(items)) return {};
    return items.reduce((acc, item) => {
        const key = String(item?.key || makeFoodFavoriteKey(item) || '').trim();
        if (!key) return acc;
        acc[key] = item || { key };
        return acc;
    }, {});
};

export const prioritizeFavorites = (items = [], favoriteMap = {}) => {
    if (!Array.isArray(items) || items.length === 0) return [];
    const favored = [];
    const others = [];
    items.forEach((item) => {
        const key = foodKey(item);
        if (key && favoriteMap?.[key]) {
            favored.push(item);
            return;
        }
        others.push(item);
    });
    return [...favored, ...others];
};

const recentFoodKey = (item) => {
    if (!item) return '';
    return makeFoodFavoriteKey({
        foodId: item?.foodId ?? item?.id ?? item?.food_id ?? '',
        name: item?.name ?? item?.food_name ?? '',
        brand: item?.brand ?? item?.brand_name ?? '',
    });
};

export const prioritizeRecentFoods = (items = [], favoriteMap = {}) => {
    if (!Array.isArray(items) || items.length === 0) return [];
    const favored = [];
    const others = [];
    items.forEach((item) => {
        const key = recentFoodKey(item);
        if (key && favoriteMap?.[key]) {
            favored.push(item);
            return;
        }
        others.push(item);
    });
    return [...favored, ...others];
};
