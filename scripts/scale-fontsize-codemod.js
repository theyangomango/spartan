#!/usr/bin/env node
/*
 Codemod: Ensure every `fontSize` value uses scaleSize(...)
 - Converts raw numbers/expressions → scaleSize(expr)
 - Converts ts(expr) and require(...).ts(expr) → scaleSize(expr)
 - Converts other scale-like calls (e.g., scaledSize(expr)) → scaleSize(expr)
 - Skips if already using scaleSize or its aliases (e.g., scaleSizeGlobal)
 - Inserts default import for scaleSize with a safe alias when needed
 - Reuses existing default import alias if found
 - Preserves formatting via recast
*/

const fs = require('fs');
const path = require('path');
const recast = require('recast');
const babelRecastParser = require('recast/parsers/babel');

const FRONTEND_DIR = path.resolve(process.cwd(), 'frontend');
const SCALE_FILE = path.resolve(FRONTEND_DIR, 'helper/scaleSize.js');

function parse(code) {
  return recast.parse(code, { parser: babelRecastParser });
}

function print(ast) {
  return recast.print(ast, { reuseWhitespace: true }).code;
}

function isImportingScaleSizeFrom(node, fileDir) {
  if (node.type !== 'ImportDeclaration') return false;
  if (!node.source || node.source.type !== 'StringLiteral') return false;
  const spec = node.source.value;
  try {
    const abs = resolveImportAbs(fileDir, spec);
    return abs === SCALE_FILE;
  } catch {
    return false;
  }
}

function resolveImportAbs(fromDir, spec) {
  // Resolve like bundlers: allow omission of .js
  const withJs = spec.endsWith('.js') ? spec : spec + '.js';
  const abs = path.resolve(fromDir, withJs);
  return abs;
}

function hasTopLevelBinding(ast, name) {
  let found = false;
  recast.types.visit(ast, {
    visitFunctionDeclaration(p) {
      if (p.node.id && p.node.id.name === name) found = true;
      this.traverse(p);
    },
    visitVariableDeclarator(p) {
      if (p.node.id && p.node.id.name === name) found = true;
      this.traverse(p);
    },
    visitClassDeclaration(p) {
      if (p.node.id && p.node.id.name === name) found = true;
      this.traverse(p);
    },
    visitImportSpecifier(p) { this.traverse(p); },
    visitImportDefaultSpecifier(p) { this.traverse(p); },
    visitImportNamespaceSpecifier(p) { this.traverse(p); },
  });
  return found;
}

function getExistingScaleImport(ast, fileDir) {
  let decl = null;
  let defaultLocal = null;
  let hasNamedTS = false;
  recast.types.visit(ast, {
    visitImportDeclaration(p) {
      if (isImportingScaleSizeFrom(p.node, fileDir)) {
        decl = p.node;
        for (const s of p.node.specifiers || []) {
          if (s.type === 'ImportDefaultSpecifier') defaultLocal = s.local && s.local.name;
          if (s.type === 'ImportSpecifier' && s.imported && s.imported.name === 'ts') hasNamedTS = true;
        }
      }
      this.traverse(p);
    }
  });
  return { decl, defaultLocal, hasNamedTS };
}

function insertScaleImport(ast, fileDir, desiredName) {
  const b = recast.types.builders;
  const existing = getExistingScaleImport(ast, fileDir);
  if (existing.decl) {
    // Ensure default import exists
    if (!existing.defaultLocal) {
      const newDefault = b.importDefaultSpecifier(b.identifier(desiredName));
      existing.decl.specifiers.unshift(newDefault);
      return desiredName;
    }
    return existing.defaultLocal;
  }

  // Create new import at top (after last import)
  const rel = path.relative(fileDir, SCALE_FILE).replace(/\\/g, '/');
  const spec = rel.startsWith('.') ? rel : './' + rel; // ensure relative path starts with ./ or ../
  const sourceLiteral = b.stringLiteral(spec.replace(/\.js$/, ''));
  const importDecl = b.importDeclaration([b.importDefaultSpecifier(b.identifier(desiredName))], sourceLiteral);

  const body = ast.program.body;
  let lastImportIndex = -1;
  for (let i = 0; i < body.length; i++) {
    if (body[i].type === 'ImportDeclaration') lastImportIndex = i;
  }
  if (lastImportIndex >= 0) body.splice(lastImportIndex + 1, 0, importDecl);
  else body.unshift(importDecl);
  return desiredName;
}

function chooseIdentifier(ast, preferred) {
  if (!hasTopLevelBinding(ast, preferred)) return preferred;
  const candidates = [preferred + 'Font', preferred + 'Text', preferred + '_', preferred + '1', 'scaleFontSize', 'scaleText'];
  for (const c of candidates) if (!hasTopLevelBinding(ast, c)) return c;
  let n = 2;
  while (hasTopLevelBinding(ast, preferred + n)) n++;
  return preferred + n;
}

function isAlreadyScaled(value, scaleIdentName) {
  // Returns true if value is a CallExpression to scaleSize(...) or any alias containing 'scaleSize'
  if (value.type === 'CallExpression') {
    const callee = value.callee;
    const isScaleSizeAlias = (n) => typeof n === 'string' && /scaleSize/.test(n);
    if (callee.type === 'Identifier') {
      if (callee.name === (scaleIdentName || 'scaleSize')) return true;
      if (isScaleSizeAlias(callee.name)) return true; // e.g., scaleSizeGlobal, scaleSizeFont
    }
    if (callee.type === 'MemberExpression') {
      const propName = callee.property && (callee.property.name || callee.property.value);
      if (isScaleSizeAlias(propName)) return true;
    }
  }
  return false;
}

function transformFile(absPath) {
  const code = fs.readFileSync(absPath, 'utf8');
  let ast;
  try {
    ast = parse(code);
  } catch (e) {
    console.error('Parse failed:', absPath, e.message);
    return { changed: false };
  }

  const fileDir = path.dirname(absPath);
  const { defaultLocal } = getExistingScaleImport(ast, fileDir);
  let scaleIdent = defaultLocal || null;
  let willNeedImport = false;
  let changed = false;

  const b = recast.types.builders;

  recast.types.visit(ast, {
    visitObjectProperty(p) {
      const node = p.node;
      // key as Identifier or StringLiteral
      const key = node.key;
      const isFontSizeKey = (key && (
        (key.type === 'Identifier' && key.name === 'fontSize') ||
        (key.type === 'StringLiteral' && key.value === 'fontSize')
      ));
      if (!isFontSizeKey) return this.traverse(p);

      let value = node.value;
      // Collapse nested scale calls: scaleX(scaleX(x)) -> scaleX(x)
      if (value && value.type === 'CallExpression' && value.arguments && value.arguments.length === 1) {
        const inner = value.arguments[0];
        const outerCallee = value.callee;
        if (inner && inner.type === 'CallExpression') {
          const innerCallee = inner.callee;
          const sameIdentifier = outerCallee.type === 'Identifier' && innerCallee.type === 'Identifier' && outerCallee.name === innerCallee.name;
          const bothScaleLike = (n) => n && n.type === 'Identifier' && /scale/i.test(n.name);
          if (sameIdentifier || (bothScaleLike(outerCallee) && bothScaleLike(innerCallee))) {
            node.value = recast.types.builders.callExpression(outerCallee, inner.arguments);
            changed = true;
            return this.traverse(p);
          }
        }
      }

      if (isAlreadyScaled(value, scaleIdent)) return this.traverse(p);

      // If value is a call to typography or other scale helpers, normalize to scaleSize(expr)
      if (value && value.type === 'CallExpression') {
        const callee = value.callee;
        // ts(expr) → scaleSize(expr)
        if (callee.type === 'Identifier' && callee.name === 'ts') {
          if (!scaleIdent) { willNeedImport = true; }
          node.value = b.callExpression(b.identifier(scaleIdent || 'scaleSize'), value.arguments);
          changed = true;
          return this.traverse(p);
        }
        // require(...).ts(expr) → scaleSize(expr)
        if (callee.type === 'MemberExpression') {
          const propName = callee.property && (callee.property.name || callee.property.value);
          if (propName === 'ts') {
            if (!scaleIdent) { willNeedImport = true; }
            node.value = b.callExpression(b.identifier(scaleIdent || 'scaleSize'), value.arguments);
            changed = true;
            return this.traverse(p);
          }
        }
        // Any other scale-like function name (scaledSize, rs, ss etc.) → scaleSize(expr)
        if (callee.type === 'Identifier' && /scale|rs|ss|vs|ms/.test(callee.name) && !/scaleSize/.test(callee.name)) {
          if (!scaleIdent) { willNeedImport = true; }
          node.value = b.callExpression(b.identifier(scaleIdent || 'scaleSize'), value.arguments);
          changed = true;
          return this.traverse(p);
        }
      }

      // Wrap the entire value: scaleIdent(value)
      if (!scaleIdent) { willNeedImport = true; }
      let call = b.callExpression(b.identifier(scaleIdent || 'scaleSize'), [value]);
      // If double-wrapped (scale(scale(x))), collapse to single
      if (value && value.type === 'CallExpression' && value.callee && value.callee.type === 'Identifier') {
        const innerName = value.callee.name;
        const outerName = (scaleIdent || 'scaleSize');
        if (innerName === outerName) {
          call = b.callExpression(b.identifier(outerName), value.arguments);
        }
      }
      node.value = call;
      changed = true;
      return this.traverse(p);
    }
  });

  if (changed) {
    if (!scaleIdent) {
      const name = chooseIdentifier(ast, 'scaleSize');
      scaleIdent = insertScaleImport(ast, fileDir, name);
    }
    const output = print(ast);
    fs.writeFileSync(absPath, output);
  }
  return { changed };
}

function* walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      yield* walk(full);
    } else if (e.isFile() && full.endsWith('.js')) {
      yield full;
    }
  }
}

function main() {
  const targetDir = FRONTEND_DIR;
  let total = 0, modified = 0;
  for (const file of walk(targetDir)) {
    total++;
    const { changed } = transformFile(file);
    if (changed) modified++;
  }
  console.log(`Processed ${total} files. Modified ${modified}.`);
}

if (require.main === module) {
  main();
}
