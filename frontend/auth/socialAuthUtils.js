import { fetchSignInMethodsForEmail } from 'firebase/auth';
import { auth } from '../../firebase.config';

function normalizeBase64Url(value) {
  if (typeof value !== 'string') return '';
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4;
  if (padding === 0) return normalized;
  return normalized + '='.repeat(4 - padding);
}

function decodeBase64(value) {
  try {
    if (typeof atob === 'function') {
      return atob(value);
    }
  } catch {
    // ignore and fallback to Buffer
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(value, 'base64').toString('utf8');
  }
  throw new Error('Base64 decoding not supported in this environment.');
}

export function decodeJwtPayload(token) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [, payload] = token.split('.');
  if (!payload) return null;
  try {
    const decoded = decodeBase64(normalizeBase64Url(payload));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function extractEmailFromIdToken(token) {
  const payload = decodeJwtPayload(token);
  if (!payload) return '';
  const email = payload.email || payload.userEmail || '';
  return typeof email === 'string' ? email.trim() : '';
}

export function normalizeEmail(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  return trimmed ? trimmed.toLowerCase() : '';
}

export async function shouldDeferByEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    return false;
  }
  try {
    const methods = await fetchSignInMethodsForEmail(auth, normalized);
    return !Array.isArray(methods) || methods.length === 0;
  } catch {
    return false;
  }
}
