// Simple static analyzer to find unreferenced frontend modules starting from App.js
// It resolves relative imports and builds a dependency graph, then reports files
// under frontend/components and frontend/screens that are not reachable.

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.cwd();
const SRC_DIRS = [
  path.join(PROJECT_ROOT, 'frontend'),
];

const EXTS = ['.js', '.jsx', '.ts', '.tsx'];

function walk(dir, out) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (EXTS.includes(path.extname(e.name))) out.push(full);
  }
}

function readFileSafe(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch { return ''; }
}

// Parse import/require/export-from strings.
// Supports multiline import blocks (e.g. import { a, b } from "x").
const IMPORT_RE = /(?:import\s+[\s\S]*?\sfrom\s+['"]([^'"\n]+)['"])|(?:export\s+[\s\S]*?\sfrom\s+['"]([^'"\n]+)['"])|(?:require\(\s*['"]([^'"\n]+)['"]\s*\))/g;

function resolveImport(fromFile, spec) {
  if (!spec.startsWith('.')) return null; // ignore non-relative
  const base = path.resolve(path.dirname(fromFile), spec);
  // exact match
  if (fs.existsSync(base) && fs.statSync(base).isFile()) return base;
  // try with extensions
  for (const ext of EXTS) {
    const p = base + ext;
    if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
  }
  // if directory, try index
  if (fs.existsSync(base) && fs.statSync(base).isDirectory()) {
    for (const ext of EXTS) {
      const p = path.join(base, 'index' + ext);
      if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
    }
  }
  return null;
}

function buildGraph(files) {
  const adj = new Map();
  for (const f of files) {
    const src = readFileSafe(f);
    const deps = new Set();
    if (src) {
      let m;
      while ((m = IMPORT_RE.exec(src))) {
        const spec = m[1] || m[2] || m[3];
        if (!spec) continue;
        const resolved = resolveImport(f, spec);
        if (resolved) deps.add(resolved);
      }
    }
    adj.set(f, Array.from(deps));
  }
  return adj;
}

function dfs(adj, roots) {
  const seen = new Set();
  const stack = [...roots];
  while (stack.length) {
    const cur = stack.pop();
    if (!cur || seen.has(cur)) continue;
    seen.add(cur);
    const next = adj.get(cur) || [];
    for (const n of next) stack.push(n);
  }
  return seen;
}

function main() {
  const files = [];
  for (const d of SRC_DIRS) walk(d, files);
  // Ensure App.js is part of the graph so imports from it are traversed
  const appJs = path.join(PROJECT_ROOT, 'App.js');
  if (fs.existsSync(appJs)) files.push(appJs);

  // Build graph
  const adj = buildGraph(files);

  // Entry roots: App.js
  const roots = [appJs].filter((p) => fs.existsSync(p));
  const reachable = dfs(adj, roots);

  const isFrontendComponentOrScreen = (p) => {
    const rel = path.relative(PROJECT_ROOT, p);
    return rel.startsWith('frontend/components') || rel.startsWith('frontend/screens');
  };

  const candidates = files.filter(isFrontendComponentOrScreen);
  const unreachable = candidates.filter((f) => !reachable.has(f));

  // False-positive mitigation: ignore files under "frontend/components/5_Profile/MakePost" (may be launched externally)
  const filtered = unreachable.filter((f) => !/frontend\/components\/5_Profile\/MakePost\//.test(f));

  console.log(JSON.stringify({
    total: files.length,
    reachable: reachable.size,
    unreachableCount: filtered.length,
    unreachable: filtered.map((p) => path.relative(PROJECT_ROOT, p)).sort(),
  }, null, 2));
}

if (require.main === module) main();
