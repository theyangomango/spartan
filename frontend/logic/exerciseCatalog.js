// Exercise name -> { group, equipment } inference (inferMetaByName), and a name -> meta map built from
// the exercise definitions (buildMetaFromDefs).

/**
 * Infer muscle group & crude equipment from a name when EXERCISE_DEFS lacks structured data.
 */
export function inferMetaByName(name) {
  const n = String(name || "").toLowerCase();
  let group = null;
  if (/shoulder|overhead|press|raise|shrug|upright row/.test(n)) group = "shoulders";
  else if (/bench|chest|fly|push[- ]?up/.test(n)) group = "chest";
  else if (/curl|tricep|skullcrusher|preacher/.test(n)) group = "arms";
  else if (/squat|deadlift|lunge|leg\s|calf|thrust/.test(n)) group = "legs";
  else if (/row|pull[- ]?up|chin[- ]?up|lat|trap|face pull/.test(n)) group = "back";
  else if (/ab|core|crunch|sit[- ]?up|plank|twist|leg raise|v[- ]?up|rollout|wheel/.test(n)) group = "abs";

  const equipment =
    n.includes("dumbbell") || n.includes("db")
      ? "Dumbbell"
      : n.includes("barbell")
      ? "Barbell"
      : n.includes("smith")
      ? "Smith Machine"
      : n.includes("machine")
      ? "Machine"
      : n.includes("cable")
      ? "Cable"
      : n.includes("band")
      ? "Band"
      : n.includes("trap bar")
      ? "Trap Bar"
      : n.includes("body") || /push[- ]?up|pull[- ]?up|chin[- ]?up|dip/.test(n)
      ? "Body Weight"
      : "";

  return { group, equipment };
}

/**
 * Build a normalized meta map from your EXERCISE_DEFS (name → {group, equipment})
 * falling back to inference if missing.
 */
export function buildMetaFromDefs(EXERCISE_DEFS) {
  const map = Object.create(null);
  (EXERCISE_DEFS || []).forEach((ex) => {
    const name = String(ex?.name || "").trim();
    if (!name) return;
    const mg = String(ex?.muscleGroup || ex?.muscle || "").toLowerCase();
    const eq = String(ex?.equipment || "").trim();
    // Normalize group names to our six buckets
    const group =
      mg.includes("shoulder") ? "shoulders" :
      mg === "chest" ? "chest" :
      mg === "arms" ? "arms" :
      mg === "legs" ? "legs" :
      mg === "back" ? "back" :
      (mg === "abs" || mg.includes("core")) ? "abs" :
      (mg === "full body" || mg.includes("full")) ? "full" : null;

    if (group) {
      map[name] = { group, equipment: eq };
    } else {
      map[name] = inferMetaByName(name);
    }
  });
  return map;
}
