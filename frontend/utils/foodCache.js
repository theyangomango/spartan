// utils/foodCache.js
// Lightweight local cache for nutrition facts (extras per serving) keyed by FatSecret food_id
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = '@foodExtrasPS:'; // e.g., @foodExtrasPS:12345

export async function getFoodExtrasPS(foodId) {
  try {
    const fid = String(foodId || '').trim();
    if (!fid) return null;
    const raw = await AsyncStorage.getItem(KEY_PREFIX + fid);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data && typeof data === 'object') return data;
  } catch {}
  return null;
}

export async function setFoodExtrasPS(foodId, extras) {
  try {
    const fid = String(foodId || '').trim();
    if (!fid || !extras) return;
    const payload = JSON.stringify(extras);
    await AsyncStorage.setItem(KEY_PREFIX + fid, payload);
  } catch {}
}

