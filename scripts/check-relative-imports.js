#!/usr/bin/env node

/**
 * Validates that all relative imports reachable from App.js resolve to real files.
 * This catches broken local imports after moves/deletes.
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.cwd();
const ENTRY_FILE = path.join(PROJECT_ROOT, 'App.js');
const EXTS = ['.js', '.jsx', '.ts', '.tsx'];

const IMPORT_RE = /(?:import\s+[^'"\n]+?from\s+['"]([^'"\n]+)['"])|(?:export\s+[^'"\n]*?from\s+['"]([^'"\n]+)['"])|(?:require\(\s*['"]([^'"\n]+)['"]\s*\))/g;

function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

function parseImportSpecs(source) {
  const specs = [];
  let match;
  while ((match = IMPORT_RE.exec(source))) {
    const spec = match[1] || match[2] || match[3];
    if (spec) specs.push(spec);
  }
  return specs;
}

function resolveRelativeImport(fromFile, spec) {
  if (!spec.startsWith('.')) return { resolved: null, missing: false };

  const basePath = path.resolve(path.dirname(fromFile), spec);

  if (fs.existsSync(basePath) && fs.statSync(basePath).isFile()) {
    return { resolved: basePath, missing: false };
  }

  for (const ext of EXTS) {
    const withExt = basePath + ext;
    if (fs.existsSync(withExt) && fs.statSync(withExt).isFile()) {
      return { resolved: withExt, missing: false };
    }
  }

  if (fs.existsSync(basePath) && fs.statSync(basePath).isDirectory()) {
    for (const ext of EXTS) {
      const indexFile = path.join(basePath, `index${ext}`);
      if (fs.existsSync(indexFile) && fs.statSync(indexFile).isFile()) {
        return { resolved: indexFile, missing: false };
      }
    }
  }

  return { resolved: null, missing: true };
}

function walkReachableFiles(entryFile) {
  const visited = new Set();
  const stack = [entryFile];
  const missing = [];

  while (stack.length) {
    const current = stack.pop();
    if (!current || visited.has(current)) continue;
    visited.add(current);

    const source = readFileSafe(current);
    if (!source) continue;

    const specs = parseImportSpecs(source);
    for (const spec of specs) {
      const { resolved, missing: isMissing } = resolveRelativeImport(current, spec);
      if (isMissing) {
        missing.push({
          from: path.relative(PROJECT_ROOT, current),
          spec,
        });
        continue;
      }
      if (resolved) stack.push(resolved);
    }
  }

  return { visited, missing };
}

function main() {
  if (!fs.existsSync(ENTRY_FILE)) {
    console.error('App.js not found at project root.');
    process.exit(1);
  }

  const { visited, missing } = walkReachableFiles(ENTRY_FILE);
  const result = {
    reachableFileCount: visited.size,
    missingImportCount: missing.length,
    missing,
  };

  console.log(JSON.stringify(result, null, 2));
  if (missing.length > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
