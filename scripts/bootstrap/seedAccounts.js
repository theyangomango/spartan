#!/usr/bin/env node
/**
 * Seeds Firebase Auth + Firestore with baseline admin/test accounts.
 * Accounts are created via Firebase Auth to ensure proper tokens without relying on email verification.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=serviceAccount.json \
 *   FIREBASE_PROJECT=spartan-8a55f \
 *   node scripts/bootstrap/seedAccounts.js --config docs/bootstrap/accounts.json
 */
const fs = require('fs');
const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

const PROJECT_ID = process.env.FIREBASE_PROJECT || 'spartan-8a55f';
const CONFIG_FLAG = '--config=';

function readConfigPath(argv) {
  for (const arg of argv) {
    if (arg.startsWith(CONFIG_FLAG)) {
      return arg.slice(CONFIG_FLAG.length);
    }
  }
  throw new Error('Pass --config=path/to/accounts.json');
}

function loadAccounts(configPath) {
  const resolved = path.resolve(configPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Seed config not found: ${resolved}`);
  }
  const payload = JSON.parse(fs.readFileSync(resolved, 'utf8'));
  if (!Array.isArray(payload?.accounts)) {
    throw new Error('accounts.json must expose { "accounts": [...] }');
  }
  return payload.accounts;
}

function initAdmin() {
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credPath) {
    throw new Error('Set GOOGLE_APPLICATION_CREDENTIALS to a service account json.');
  }
  const credential = cert(JSON.parse(fs.readFileSync(path.resolve(credPath), 'utf8')));
  initializeApp({ credential, projectId: PROJECT_ID });
  return { auth: getAuth(), db: getFirestore() };
}

async function ensureAccount(auth, db, account) {
  const { email, password, displayName, photoURL, isAdmin, publicProfile = {}, privateProfile = {} } = account;
  if (!email || !password) {
    throw new Error(`Account entry missing email/password: ${JSON.stringify(account)}`);
  }
  let userRecord;
  try {
    userRecord = await auth.getUserByEmail(email);
    console.log(`Auth user already exists for ${email}, updating profile…`);
    await auth.updateUser(userRecord.uid, {
      displayName: displayName || userRecord.displayName || null,
      photoURL: photoURL || userRecord.photoURL || null,
      emailVerified: true,
    });
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      userRecord = await auth.createUser({
        email,
        password,
        displayName: displayName || undefined,
        photoURL: photoURL || undefined,
        emailVerified: true,
      });
      console.log(`Created auth user ${email} -> ${userRecord.uid}`);
    } else {
      throw error;
    }
  }

  if (isAdmin) {
    await auth.setCustomUserClaims(userRecord.uid, { isAdmin: true });
  }

  const publicDoc = {
    uid: userRecord.uid,
    displayName: displayName || userRecord.displayName || 'Spartan Admin',
    photoURL: photoURL || '',
    handle: publicProfile.handle || email.split('@')[0],
    isPrivate: !!publicProfile.isPrivate,
    stats: publicProfile.stats || {},
    createdAt: new Date(),
    role: isAdmin ? 'admin' : 'tester',
    ...publicProfile.extra,
  };

  const privateDoc = {
    email: userRecord.email,
    emailVerified: true,
    deviceTokens: [],
    blocked: [],
    blockedBy: [],
    lastLoginAt: new Date(),
    ...privateProfile.extra,
  };

  await db.collection('usersPublic').doc(userRecord.uid).set(publicDoc, { merge: true });
  await db.collection('usersPrivate').doc(userRecord.uid).set(privateDoc, { merge: true });
  console.log(`Seeded Firestore docs for ${email}`);
}

async function main() {
  const configPath = readConfigPath(process.argv.slice(2));
  const accounts = loadAccounts(configPath);
  const { auth, db } = initAdmin();
  for (const account of accounts) {
    // eslint-disable-next-line no-await-in-loop
    await ensureAccount(auth, db, account);
  }
  console.log('Bootstrap accounts seeded.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
