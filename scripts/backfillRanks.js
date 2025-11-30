#!/usr/bin/env node
/**
 * Backfills public rank fields for every user based on their completedWorkouts + statsHexagon.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=serviceAccount.json \
 *   FIREBASE_PROJECT=spartan-8a55f \
 *   node scripts/backfillRanks.js [--uid=abc] [--limit=100]
 *
 * - --uid filters to a single user.
 * - --limit caps how many users to process (useful for spot checks).
 */
const fs = require('fs');
const path = require('path');
const { initializeApp, cert, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const UID_FLAG = '--uid=';
const LIMIT_FLAG = '--limit=';
const PROJECT_ID = process.env.FIREBASE_PROJECT || 'spartan-8a55f';

function parseArgs(argv) {
  let uid = null;
  let limit = null;
  for (const arg of argv) {
    if (arg.startsWith(UID_FLAG)) {
      uid = arg.slice(UID_FLAG.length);
    } else if (arg.startsWith(LIMIT_FLAG)) {
      const num = Number(arg.slice(LIMIT_FLAG.length));
      if (Number.isFinite(num) && num > 0) {
        limit = num;
      }
    }
  }
  return { uid, limit };
}

function initAdmin() {
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  let credential;
  if (credPath) {
    const raw = fs.readFileSync(path.resolve(credPath), 'utf8');
    credential = cert(JSON.parse(raw));
  } else {
    // Fall back to Application Default Credentials (gcloud / firebase login)
    credential = applicationDefault();
  }
  initializeApp({ credential, projectId: PROJECT_ID });
  return getFirestore();
}

async function loadRankCalculator() {
  const modulePath = path.resolve(__dirname, '../shared/rankProgress.js');
  const mod = await import(`file://${modulePath}`);
  if (!mod?.computeRankProgressFromData) {
    throw new Error('computeRankProgressFromData not found in shared/rankProgress.js');
  }
  return mod.computeRankProgressFromData;
}

function buildRankFields(progress) {
  const entry = progress?.currentRankEntry;
  const index = progress?.currentRankIndexDesc;
  if (!entry) return null;
  return {
    currentRank: {
      key: entry.key,
      tier: entry.rankTier,
      level: entry.rankLevel,
      label: entry.rankLabel,
      index,
    },
    rankTier: entry.rankTier,
    rankLabel: entry.rankLabel,
    rankLevel: entry.rankLevel,
  };
}

async function fetchTargets(db, { uid, limit }) {
  if (uid) {
    const snap = await db.collection('usersPublic').doc(uid).get();
    if (!snap.exists) {
      console.warn(`usersPublic/${uid} not found; nothing to backfill.`);
      return [];
    }
    return [{ id: snap.id, data: snap.data() }];
  }

  const snap = await db.collection('usersPublic').get();
  const all = [];
  snap.forEach((doc) => all.push({ id: doc.id, data: doc.data() }));
  return typeof limit === 'number' && limit > 0 ? all.slice(0, limit) : all;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const db = initAdmin();
  const computeRankProgressFromData = await loadRankCalculator();

  const targets = await fetchTargets(db, args);
  console.log(`Backfilling rank for ${targets.length} user(s)…`);

  let updated = 0;
  let skipped = 0;

  for (const { id, data } of targets) {
    try {
      const completedWorkouts = Array.isArray(data?.completedWorkouts) ? data.completedWorkouts : [];
      const statsHexagon = data?.statsHexagon || {};
      const progress = computeRankProgressFromData({ completedWorkouts, statsHexagon });
      const fields = buildRankFields(progress);
      if (!fields) {
        skipped += 1;
        continue;
      }

      const payload = {
        ...fields,
        // Keep a minimal copy on users collection for legacy consumers
      };

      await Promise.allSettled(
        ['usersPublic', 'usersPrivate', 'users'].map((col) =>
          db.collection(col).doc(id).set(payload, { merge: true })
        )
      );
      updated += 1;
      if (updated % 50 === 0) {
        console.log(`  processed ${updated}/${targets.length}…`);
      }
    } catch (error) {
      skipped += 1;
      console.warn(`Failed to process ${id}:`, error?.message || error);
    }
  }

  console.log(`Done. Updated=${updated}, skipped=${skipped}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
