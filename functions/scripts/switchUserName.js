import { initializeApp } from "firebase-admin/app";
import {
  normaliseName,
  resolveUserDoc,
  buildOldNamesSet,
  propagateNameChange,
} from "../shared/namePropagation.js";

try {
  initializeApp();
} catch {
  // ignore: app may already be initialised
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error("Usage: node functions/scripts/switchUserName.js <uidOrHandle> <newName> [oldName]");
    process.exit(1);
  }

  const identifier = args[0];
  const newNameInput = normaliseName(args[1]);
  const providedOldName = normaliseName(args.slice(2).join(" "));

  if (!newNameInput) {
    console.error("New name must be non-empty.");
    process.exit(1);
  }

  const userDoc = await resolveUserDoc(identifier).catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });

  const uid = userDoc.id;
  const data = userDoc.data() || {};

  const oldNames = buildOldNamesSet({ userData: data, explicitOldName: providedOldName });
  if (!oldNames.length) {
    console.error("Could not determine the existing name. Provide it explicitly as the third argument.");
    process.exit(1);
  }

  const representativeOldName = oldNames[0].original;
  if (representativeOldName.toLowerCase() === newNameInput.toLowerCase()) {
    console.log("New name matches existing name (case-insensitive). Nothing to change.");
    return;
  }

  console.log(`Switching name for uid ${uid}`);
  console.log(`   from "${representativeOldName}" to "${newNameInput}"`);

  await propagateNameChange({ uid, oldNames, newName: newNameInput });

  console.log("✅ Name switch complete.");
}

main().catch((error) => {
  console.error("switchUserName failed:", error);
  process.exit(1);
});
