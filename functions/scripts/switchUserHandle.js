import { initializeApp } from "firebase-admin/app";
import {
  normaliseHandle,
  findUserByHandle,
  ensureHandleAvailable,
  propagateHandleChange,
} from "../shared/handlePropagation.js";

try {
  initializeApp();
} catch {
  // ignore: app may already be initialised
}

async function main() {
  const [, , oldRaw, newRaw] = process.argv;
  if (!oldRaw || !newRaw) {
    console.error("Usage: node functions/scripts/switchUserHandle.js <oldHandle> <newHandle>");
    process.exit(1);
  }

  const oldHandleInput = normaliseHandle(oldRaw);
  const newHandleInput = normaliseHandle(newRaw);

  if (!oldHandleInput || !newHandleInput) {
    console.error("Both handles must be non-empty.");
    process.exit(1);
  }

  if (oldHandleInput.toLowerCase() === newHandleInput.toLowerCase()) {
    console.log("New handle matches old handle (case-insensitive). Nothing to change.");
    return;
  }

  const userDoc = await findUserByHandle(oldHandleInput);
  const uid = userDoc.id;
  const data = userDoc.data() || {};
  const existingHandle = normaliseHandle(data.handle || oldHandleInput);

  await ensureHandleAvailable(newHandleInput, uid);

  console.log(`Switching handle for uid ${uid}`);
  console.log(`   from "${existingHandle}" to "${newHandleInput}"`);

  await propagateHandleChange({ uid, oldHandle: existingHandle, newHandle: newHandleInput });

  console.log("✅ Handle switch complete.");
}

main().catch((error) => {
  console.error("switchUserHandle failed:", error);
  process.exit(1);
});
