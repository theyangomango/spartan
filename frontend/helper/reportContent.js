const DEFAULT_DELAY_MS = 650;

/**
 * Temporary stub that simulates reporting content to the backend.
 * Replace this with a callable Cloud Function or HTTPS endpoint.
 */
export default async function reportContent(payload = {}) {
  try {
    if (__DEV__) {
      console.log('[reportContent] submitting payload', payload);
    }
    await new Promise((resolve) => setTimeout(resolve, DEFAULT_DELAY_MS));
    return { ok: true };
  } catch (error) {
    console.warn('reportContent failed', error?.message || error);
    return { ok: false, error };
  }
}
