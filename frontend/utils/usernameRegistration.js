import { finalizeUserProfile } from '../services/userProfileService';

export const USERNAME_REGEX = /^[a-z0-9_.]{6,20}$/;

export const sanitizeHandle = (value) => {
  if (!value) return '';
  return value.replace(/[^a-zA-Z0-9_.]/g, '').toLowerCase().slice(0, 20);
};

export async function claimHandle(handle, profile = {}) {
  const sanitized = sanitizeHandle(handle);
  if (!USERNAME_REGEX.test(sanitized)) {
    throw new Error('Invalid username format.');
  }
  return finalizeUserProfile({ handle: sanitized, profile });
}
