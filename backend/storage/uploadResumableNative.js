// backend/storage/uploadResumableNative.js
// Resumable upload to Firebase Storage using Expo FileSystem to avoid RN Blob/multipart issues.
import * as FileSystem from 'expo-file-system';
import { getAuth } from 'firebase/auth';
import { getDownloadURL, ref } from 'firebase/storage';
import { storage } from '../../firebase.config';

const app = require('../../firebase.config').app;
const BUCKET = (app?.options?.storageBucket || '').replace('gs://', '') || 'spartan-8a55f.appspot.com';

async function getIdToken() {
  try {
    const auth = getAuth();
    const tok = await auth?.currentUser?.getIdToken?.();
    return tok || null;
  } catch {
    return null;
  }
}

export default async function uploadResumableNative({ fileUri, path, mime = 'application/octet-stream' }) {
  if (!fileUri || !path) throw new Error('uploadResumableNative: fileUri and path required');

  const idToken = await getIdToken();

  // 1) Start resumable session
  const startUrl = `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(BUCKET)}/o?uploadType=resumable&name=${encodeURIComponent(path)}`;
  const startHeaders = {
    'X-Goog-Upload-Protocol': 'resumable',
    'X-Goog-Upload-Command': 'start',
    'X-Goog-Upload-Header-Content-Type': mime,
    'Content-Type': 'application/json; charset=UTF-8',
  };
  if (idToken) startHeaders['Authorization'] = `Firebase ${idToken}`;

  const startBody = JSON.stringify({
    name: path,
    contentType: mime,
  });

  const startResp = await fetch(startUrl, { method: 'POST', headers: startHeaders, body: startBody });
  if (!startResp.ok) {
    const txt = await startResp.text().catch(() => '');
    throw new Error(`start resumable failed: ${startResp.status} ${txt}`);
  }
  // Some RN envs lowercase header names
  const uploadUrl = startResp.headers.get('X-Goog-Upload-URL') || startResp.headers.get('x-goog-upload-url');
  if (!uploadUrl) throw new Error('No resumable upload URL returned');

  // 2) Upload the file content
  const putHeaders = {
    'X-Goog-Upload-Command': 'upload, finalize',
    'X-Goog-Upload-Offset': '0',
    'Content-Type': mime,
  };
  if (idToken) putHeaders['Authorization'] = `Firebase ${idToken}`;

  const putResp = await FileSystem.uploadAsync(uploadUrl, fileUri, {
    httpMethod: 'PUT',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: putHeaders,
  });
  if (putResp.status !== 200) {
    throw new Error(`upload failed: ${putResp.status} ${putResp.body?.slice?.(0, 120)}`);
  }
  let meta;
  try { meta = JSON.parse(putResp.body); } catch { meta = null; }

  // Prefer token from response, if included
  const respToken = meta?.downloadTokens || meta?.metadata?.firebaseStorageDownloadTokens || null;
  let url = respToken
    ? `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(BUCKET)}/o/${encodeURIComponent(path)}?alt=media&token=${respToken}`
    : `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(BUCKET)}/o/${encodeURIComponent(path)}?alt=media`;
  // If we didn't get a token, attempt to obtain a download URL via SDK (generates/reads token)
  if (!respToken) {
    try {
      url = await getDownloadURL(ref(storage, path));
    } catch {}
  }
  return { url, path, mimeType: mime, metadata: meta };
}
