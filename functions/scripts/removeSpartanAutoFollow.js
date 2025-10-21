import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const BATCH_SIZE = 400;
const SPARTAN_UID = "24247ffa-0706-4b01-aff2-eec0dd592f56";
const SPARTAN_HANDLE = "spartan";

try {
  initializeApp();
} catch {}

const db = getFirestore();

const toLower = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const isSpartanFollowEntry = (entry) => {
  if (!entry || typeof entry !== "object") return false;
  const handle = toLower(entry.handle);
  const uid = typeof entry.uid === "string" ? entry.uid : "";
  return handle === SPARTAN_HANDLE || uid === SPARTAN_UID;
};

const isSpartanUser = (user) => {
  if (!user || typeof user !== "object") return false;
  const handle = toLower(user.handle);
  const uid = typeof user.uid === "string" ? user.uid : "";
  return handle === SPARTAN_HANDLE || uid === SPARTAN_UID;
};

async function removeSpartanAutoFollow() {
  const removedFollowerUids = new Set();
  let processed = 0;
  let totalUpdated = 0;
  let lastDoc = null;

  while (true) {
    let query = db.collection("users").orderBy("__name__").limit(BATCH_SIZE);
    if (lastDoc) query = query.startAfter(lastDoc);

    const snapshot = await query.get();
    if (snapshot.empty) break;

    const batch = db.batch();
    let batchUpdates = 0;

    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data() || {};
      const following = Array.isArray(data.following) ? data.following : [];
      const filteredFollowing = following.filter(
        (entry) => !isSpartanFollowEntry(entry)
      );
      const normalizedCount = filteredFollowing.length;
      const originalCount =
        typeof data.followingCount === "number"
          ? data.followingCount
          : following.length;
      const needsUpdate =
        filteredFollowing.length !== following.length ||
        originalCount !== normalizedCount;

      if (needsUpdate) {
        batch.update(docSnap.ref, {
          following: filteredFollowing,
          followingCount: normalizedCount,
        });
        batchUpdates += 1;
        if (filteredFollowing.length !== following.length) {
          removedFollowerUids.add(docSnap.id);
        }
      }
    });

    if (batchUpdates > 0) {
      await batch.commit();
      totalUpdated += batchUpdates;
    }

    processed += snapshot.size;
    lastDoc = snapshot.docs[snapshot.docs.length - 1];
    console.log(
      `Processed ${processed} user doc(s). Updated ${batchUpdates} in this batch.`
    );
  }

  console.log(
    `Finished scanning users. Updated ${totalUpdated} user doc(s).`
  );
  console.log(
    `Recorded ${removedFollowerUids.size} user(s) that no longer follow Spartan.`
  );

  await updateGlobalUsersDoc(removedFollowerUids);
  await updateSpartanDoc(removedFollowerUids);
}

async function updateGlobalUsersDoc(removedFollowerUids) {
  const ref = db.collection("global").doc("users");
  const snap = await ref.get();
  if (!snap.exists) {
    console.log("global/users doc missing. Skipping global cleanup.");
    return;
  }

  const data = snap.data() || {};
  const allUsers = Array.isArray(data.all) ? data.all : [];
  let changed = false;

  const updatedAll = allUsers.map((user) => {
    if (!user || typeof user !== "object") return user;

    const following = Array.isArray(user.following) ? user.following : [];
    const filteredFollowing = following.filter(
      (entry) => !isSpartanFollowEntry(entry)
    );
    const normalizedCount = filteredFollowing.length;
    const originalCount =
      typeof user.followingCount === "number"
        ? user.followingCount
        : following.length;
    const userNeedsUpdate =
      filteredFollowing.length !== following.length ||
      originalCount !== normalizedCount;

    if (filteredFollowing.length !== following.length) {
      const uid = typeof user.uid === "string" ? user.uid : "";
      if (uid) removedFollowerUids.add(uid);
    }

    if (!userNeedsUpdate) return user;

    changed = true;
    return {
      ...user,
      following: filteredFollowing,
      followingCount: normalizedCount,
    };
  });

  const spartanIndex = updatedAll.findIndex((entry) => isSpartanUser(entry));
  if (spartanIndex !== -1) {
    const spartan = updatedAll[spartanIndex] || {};
    const followers = Array.isArray(spartan.followers) ? spartan.followers : [];
    const filteredFollowers = followers.filter((entry) => {
      if (!entry || typeof entry !== "object") return true;
      const uid = typeof entry.uid === "string" ? entry.uid : "";
      if (!uid) return true;
      return !removedFollowerUids.has(uid);
    });
    const followerCount = filteredFollowers.length;
    if (
      filteredFollowers.length !== followers.length ||
      spartan.followerCount !== followerCount
    ) {
      updatedAll[spartanIndex] = {
        ...spartan,
        followers: filteredFollowers,
        followerCount,
      };
      changed = true;
    }
  }

  if (!changed) {
    console.log("No changes needed in global/users doc.");
    return;
  }

  await ref.set({ ...data, all: updatedAll }, { merge: true });
  console.log("Updated global/users doc.");
}

async function updateSpartanDoc(removedFollowerUids) {
  if (removedFollowerUids.size === 0) {
    console.log("No recorded removals. Skipping Spartan follower cleanup.");
    return;
  }

  const ref = db.collection("users").doc(SPARTAN_UID);
  const snap = await ref.get();
  if (!snap.exists) {
    console.log("Spartan user doc not found. Skipping Spartan cleanup.");
    return;
  }

  const data = snap.data() || {};
  const followers = Array.isArray(data.followers) ? data.followers : [];
  const filteredFollowers = followers.filter((entry) => {
    if (!entry || typeof entry !== "object") return true;
    const uid = typeof entry.uid === "string" ? entry.uid : "";
    if (!uid) return true;
    return !removedFollowerUids.has(uid);
  });
  const followerCount = filteredFollowers.length;

  if (
    filteredFollowers.length === followers.length &&
    data.followerCount === followerCount
  ) {
    console.log("Spartan follower list already up to date.");
    return;
  }

  await ref.update({
    followers: filteredFollowers,
    followerCount,
  });

  console.log(
    `Updated Spartan follower list. Removed ${
      followers.length - filteredFollowers.length
    } follower(s).`
  );
}

removeSpartanAutoFollow().catch((error) => {
  console.error("removeSpartanAutoFollow failed:", error);
  process.exit(1);
});
