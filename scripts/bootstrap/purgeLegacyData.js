#!/usr/bin/env node
/**
 * Purges all legacy Spartan content before the secure relaunch.
 * Usage: GOOGLE_APPLICATION_CREDENTIALS=path/to/serviceAccount.json \
 *        FIREBASE_PROJECT=spartan-8a55f node scripts/bootstrap/purgeLegacyData.js
 */
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const { getAuth } = require('firebase-admin/auth');
const fs = require('fs');
const path = require('path');

const PROJECT_ID = process.env.FIREBASE_PROJECT || 'spartan-8a55f';

function assertServiceAccount() {
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credPath) {
    throw new Error('Set GOOGLE_APPLICATION_CREDENTIALS to a service account JSON.');
  }
  const resolved = path.resolve(credPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Service account file not found at ${resolved}`);
  }
  const payload = JSON.parse(fs.readFileSync(resolved, 'utf8'));
  return cert(payload);
}

console.log('Initializing admin SDK for project', PROJECT_ID);
initializeApp({
  credential: assertServiceAccount(),
  storageBucket: `${PROJECT_ID}.appspot.com`,
  projectId: PROJECT_ID,
});

const db = getFirestore();
const bucket = getStorage().bucket();
const auth = getAuth();

async function purgeCollection(colPath) {
  console.log(`Purging collection: ${colPath}`);
  const batchSize = 500;
  while (true) {
    const snap = await db.collection(colPath).limit(batchSize).get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
}

async function purgeSubcollections(parentCol) {
  console.log(`Purging subcollections under ${parentCol}…`);
  const parentSnap = await db.collection(parentCol).get();
  for (const doc of parentSnap.docs) {
    const subs = await doc.ref.listCollections();
    for (const sub of subs) {
      await purgeCollection(`${parentCol}/${doc.id}/${sub.id}`);
    }
  }
}

async function purgeAuthUsers() {
  console.log('Purging Firebase Auth users…');
  const batchSize = 1000;
  let nextPageToken;
  do {
    const page = await auth.listUsers(batchSize, nextPageToken);
    const uids = page.users.map((user) => user.uid);
    if (uids.length) {
      await auth.deleteUsers(uids);
      console.log(`Deleted ${uids.length} auth users.`);
    }
    nextPageToken = page.pageToken;
  } while (nextPageToken);
}

async function purgeStoragePrefix(prefix) {
  console.log(`Purging storage prefix: ${prefix}`);
  const [files] = await bucket.getFiles({ prefix });
  for (const file of files) {
    await file.delete();
  }
}

async function main() {
  await purgeCollection('usersPublic');
  await purgeCollection('usersPrivate');
  await purgeCollection('workouts');
  await purgeCollection('posts');
  await purgeCollection('messages');
  await purgeCollection('leaderboards');
  await purgeCollection('userSearchIndex');
  await purgeCollection('relationships');
  await purgeSubcollections('usersPublic');
  await purgeSubcollections('usersPrivate');
  await purgeStoragePrefix('pfps/');
  await purgeStoragePrefix('posts/');
  await purgeAuthUsers();
  console.log('Legacy data purged. Spartan relaunch ready for bootstrap.');
}

main().catch((error) => {
  console.error('Purge failed:', error);
  process.exit(1);
});
