import { deleteUserAndContentByHandle } from "../shared/deleteUserAndContent.js";

async function main() {
  const [, , handleArg] = process.argv;
  if (!handleArg) {
    console.error("Usage: node functions/scripts/deleteUserAndContentByHandle.js <handle>");
    process.exit(1);
  }

  console.log(`\n🗑️  Deleting Spartan account for handle "${handleArg}"...`);

  try {
    const summary = await deleteUserAndContentByHandle(handleArg);
    console.log("\nSummary:");
    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    console.error("deleteUserAndContentByHandle failed:", error);
    process.exit(1);
  }
}

main();
