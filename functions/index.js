const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { computeHexagonFromStats } = require('./computeHexagon');

try { admin.initializeApp(); } catch {}
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

async function recomputeForUid(uid, trainedExerciseNames = []) {
  if (!uid) return { ok: false, error: 'missing-uid' };
  const ref = db.collection('users').doc(String(uid));
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, error: 'user-not-found' };
  const data = snap.data() || {};
  const stats = data.statsExercises || {};
  const prevHex = data.statsHexagon || {};
  const { statsHexagon, lastTrained } = computeHexagonFromStats(stats, prevHex, trainedExerciseNames);
  const payload = {
    statsHexagon,
    statsHexagonMeta: { lastTrainedByGroup: lastTrained, updatedAt: FieldValue.serverTimestamp() },
  };
  await ref.set(payload, { merge: true });
  return { ok: true, statsHexagon };
}

exports.recomputeHexagon = functions.https.onCall(async (data, context) => {
  const uid = (context.auth && context.auth.uid) || (data && data.uid);
  const trained = (data && Array.isArray(data.trainedExerciseNames)) ? data.trainedExerciseNames : [];
  const res = await recomputeForUid(uid, trained);
  return res;
});

exports.onUserStatsWrite = functions.firestore.document('users/{uid}')
  .onWrite(async (change, context) => {
    try {
      const before = change.before.exists ? (change.before.data() || {}) : {};
      const after = change.after.exists ? (change.after.data() || {}) : {};
      const bStats = before.statsExercises || null;
      const aStats = after.statsExercises || null;
      const bMetaTs = before?.statsHexagonMeta?.updatedAt?.toMillis?.() || 0;
      const aMetaTs = after?.statsHexagonMeta?.updatedAt?.toMillis?.() || 0;

      const statsChanged = JSON.stringify(bStats) !== JSON.stringify(aStats);
      const hexMissing = !after.statsHexagon || !aMetaTs;

      // Avoid loops: if only statsHexagon changed, do nothing
      if (!statsChanged && !hexMissing) return null;

      const uid = context.params.uid;
      await recomputeForUid(uid, []);
      return null;
    } catch (e) {
      console.error('onUserStatsWrite error', e);
      return null;
    }
  });

