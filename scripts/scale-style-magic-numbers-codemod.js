#!/usr/bin/env node
/*
 Codemod: Scale magic numbers in StyleSheet styles using scaleSize(...)
 - Targets StyleSheet.create({...}) objects
 - Scales numeric values for dimension-like style props
 - Skips zeros, hairline widths, booleans, strings, percentages, and already-scaled calls
 - Scales nested objects like shadowOffset: { width, height }
 - Adds import for scaleSize with a safe alias if missing
*/

const fs = require('fs');
const path = require('path');
const recast = require('recast');
const babelParser = require('recast/parsers/babel');

const FRONTEND_DIR = path.resolve(process.cwd(), 'frontend');
const SCALE_FILE = path.resolve(FRONTEND_DIR, 'helper/scaleSize.js');

const SCALE_PROPS = new Set([
  // spacing
  'margin','marginTop','marginBottom','marginLeft','marginRight','marginHorizontal','marginVertical',
  'padding','paddingTop','paddingBottom','paddingLeft','paddingRight','paddingHorizontal','paddingVertical',
  // position
  'top','bottom','left','right',
  // size
  'width','height','minWidth','minHeight','maxWidth','maxHeight',
  // radius/border
  'borderWidth','borderRadius','borderTopLeftRadius','borderTopRightRadius','borderBottomLeftRadius','borderBottomRightRadius',
  // text metrics related
  'lineHeight',
  // layout gaps
  'gap','rowGap','columnGap',
  // shadows
  'shadowRadius',
  // RN SVG etc sometimes honor radius like rx/ry in style, but rare
]);

const NESTED_SCALE_PROPS = {
  shadowOffset: new Set(['width','height'])
};

function parse(code) { return recast.parse(code, { parser: babelParser }); }
function print(ast) { return recast.print(ast, { reuseWhitespace: true }).code; }

function resolveImportAbs(fromDir, spec) {
  const withJs = spec.endsWith('.js') ? spec : spec + '.js';
  return path.resolve(fromDir, withJs);
}
function isImportingScaleSizeFrom(node, fileDir) {
  if (node.type !== 'ImportDeclaration') return false;
  if (!node.source || node.source.type !== 'StringLiteral') return false;
  try { return resolveImportAbs(fileDir, node.source.value) === SCALE_FILE; } catch { return false; }
}
function getExistingScaleImport(ast, fileDir) {
  let decl = null, defaultLocal = null;
  recast.types.visit(ast, { visitImportDeclaration(p){
    if (isImportingScaleSizeFrom(p.node, fileDir)) {
      decl = p.node;
      (decl.specifiers||[]).forEach(s=>{ if(s.type==='ImportDefaultSpecifier') defaultLocal = s.local && s.local.name; });
    }
    this.traverse(p);
  }});
  return { decl, defaultLocal };
}
function hasTopBinding(ast, name){
  let found=false; recast.types.visit(ast,{
    visitVariableDeclarator(p){ if(p.node.id && p.node.id.name===name) found=true; this.traverse(p); },
    visitFunctionDeclaration(p){ if(p.node.id && p.node.id.name===name) found=true; this.traverse(p); },
    visitClassDeclaration(p){ if(p.node.id && p.node.id.name===name) found=true; this.traverse(p); },
    visitImportDefaultSpecifier(p){ if(p.node.local && p.node.local.name===name) found=true; this.traverse(p); },
    visitImportSpecifier(p){ if(p.node.local && p.node.local.name===name) found=true; this.traverse(p); },
  }); return found;
}
function chooseIdent(ast, preferred){ if(!hasTopBinding(ast, preferred)) return preferred; let i=1; while(hasTopBinding(ast, preferred+i)) i++; return preferred+i; }
function insertScaleImport(ast, fileDir, asName){
  const b = recast.types.builders;
  const { decl, defaultLocal } = getExistingScaleImport(ast, fileDir);
  if (decl) { if (!defaultLocal) decl.specifiers.unshift(b.importDefaultSpecifier(b.identifier(asName))); return defaultLocal || asName; }
  const rel = path.relative(fileDir, SCALE_FILE).replace(/\\/g,'/');
  const source = b.stringLiteral((rel.startsWith('.')?rel:'./'+rel).replace(/\.js$/,''));
  const imp = b.importDeclaration([b.importDefaultSpecifier(b.identifier(asName))], source);
  const body = ast.program.body; let idx=-1; for(let i=0;i<body.length;i++){ if(body[i].type==='ImportDeclaration') idx=i; }
  if (idx>=0) body.splice(idx+1,0,imp); else body.unshift(imp);
  return asName;
}
function isAlreadyScaled(node, scaleName){
  if(node && node.type==='CallExpression'){
    const c=node.callee; if(c.type==='Identifier' && (/scaleSize/.test(c.name) || c.name===scaleName)) return true;
  }
  return false;
}
function shouldScaleProp(key){ return SCALE_PROPS.has(key); }
function isNumericLiteral(n){ return n && n.type==='NumericLiteral'; }

function scaleNode(b, value, scaleIdent){
  // Skip zeros to avoid noise
  if (isNumericLiteral(value) && value.value === 0) return value;
  return b.callExpression(b.identifier(scaleIdent), [value]);
}

function transformStyleObject(obj, b, scaleIdent){
  let changed=false;
  (obj.properties||[]).forEach((prop)=>{
    if (prop.type !== 'ObjectProperty') return;
    const key = prop.key.type==='Identifier' ? prop.key.name : prop.key.type==='StringLiteral' ? prop.key.value : null;
    if (!key) return;

    // shadowOffset: { width, height }
    if (NESTED_SCALE_PROPS[key] && prop.value && prop.value.type==='ObjectExpression'){
      prop.value.properties.forEach((p2)=>{
        if(p2.type!=='ObjectProperty') return;
        const k2 = p2.key.type==='Identifier'?p2.key.name:p2.key.type==='StringLiteral'?p2.key.value:null;
        if(!k2 || !NESTED_SCALE_PROPS[key].has(k2)) return;
        const v2 = p2.value;
        if (v2.type==='Identifier' && v2.name==='StyleSheet' ) return; // impossible but safe
        if (v2.type==='MemberExpression') return; // e.g., StyleSheet.hairlineWidth
        if (isAlreadyScaled(v2, scaleIdent)) return;
        if (isNumericLiteral(v2) || v2.type==='UnaryExpression' || v2.type==='BinaryExpression' || v2.type==='CallExpression'){
          p2.value = scaleNode(b, v2, scaleIdent); changed = true;
        }
      });
      return;
    }

    if (!shouldScaleProp(key)) return;
    const v = prop.value;
    if (v.type==='MemberExpression'){
      // e.g., StyleSheet.hairlineWidth — skip
      return;
    }
    if (isAlreadyScaled(v, scaleIdent)) return;
    if (isNumericLiteral(v) || v.type==='UnaryExpression' || v.type==='BinaryExpression' || v.type==='CallExpression'){
      prop.value = scaleNode(b, v, scaleIdent); changed = true;
    }
  });
  return changed;
}

function transformInlineStyleObject(obj, b, scaleIdent){
  // Same as transformStyleObject but returns whether changed
  return transformStyleObject(obj, b, scaleIdent);
}

function transformJSXStyleAttr(attr, b, scaleIdent){
  if (!attr || attr.type !== 'JSXAttribute') return false;
  if (!attr.name || attr.name.name !== 'style') return false;
  if (!attr.value) return false;
  let changed = false;
  // style={{ ... }}
  if (attr.value.type === 'JSXExpressionContainer'){
    const expr = attr.value.expression;
    if (expr.type === 'ObjectExpression'){
      if (transformInlineStyleObject(expr, b, scaleIdent)) changed = true;
    } else if (expr.type === 'ArrayExpression'){
      (expr.elements||[]).forEach(el => {
        if (el && el.type === 'ObjectExpression'){
          if (transformInlineStyleObject(el, b, scaleIdent)) changed = true;
        }
      });
    }
  }
  return changed;
}

function isStyleSheetCreate(pathNode){
  const n = pathNode.node || pathNode; const node = n;
  if(!node || node.type!=='CallExpression') return false;
  const cal = node.callee;
  return cal && cal.type==='MemberExpression' && cal.object && cal.object.type==='Identifier' && cal.object.name==='StyleSheet' && cal.property && cal.property.name==='create';
}

function transformFile(absPath){
  const code = fs.readFileSync(absPath,'utf8');
  let ast; try { ast = parse(code); } catch(e){ console.error('Parse failed:', absPath, e.message); return {changed:false}; }
  const fileDir = path.dirname(absPath);
  const { defaultLocal } = getExistingScaleImport(ast, fileDir);
  let scaleIdent = defaultLocal || null;
  const b = recast.types.builders;
  let changed=false;

  recast.types.visit(ast, {
    visitObjectExpression(p){
      if (!scaleIdent) scaleIdent = chooseIdent(ast, 'scaleSize');
      const did = transformStyleObject(p.node, b, scaleIdent);
      if (did) changed = true;
      return this.traverse(p);
    },
    visitJSXAttribute(p){
      if (!scaleIdent) scaleIdent = chooseIdent(ast, 'scaleSize');
      const did = transformJSXStyleAttr(p.node, b, scaleIdent);
      if (did) changed = true;
      return this.traverse(p);
    },
    visitCallExpression(p){
      if(!isStyleSheetCreate(p)) return this.traverse(p);
      const arg = p.node.arguments && p.node.arguments[0];
      if (!arg || arg.type!=='ObjectExpression') return this.traverse(p);
      if (!scaleIdent) scaleIdent = chooseIdent(ast, 'scaleSize');
      // transform each style object
      (arg.properties||[]).forEach((prop)=>{
        if(prop.type!=='ObjectProperty') return;
        const val = prop.value;
        if(val && val.type==='ObjectExpression'){
          const did = transformStyleObject(val, b, scaleIdent);
          if(did) changed=true;
        }
      });
      return this.traverse(p);
    }
  });

  if (changed){
    // Ensure import exists
    if (!defaultLocal){
      scaleIdent = insertScaleImport(ast, fileDir, scaleIdent || chooseIdent(ast, 'scaleSize'));
    }
    const out = print(ast); fs.writeFileSync(absPath, out);
  }
  return { changed };
}

function* walk(dir){
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (e.isFile() && full.endsWith('.js')) yield full;
  }
}

function main(){
  const target = FRONTEND_DIR;
  let total=0, mod=0;
  for (const f of walk(target)) { total++; const r = transformFile(f); if (r.changed) mod++; }
  console.log(`Processed ${total} files. Modified ${mod}.`);
}

if (require.main === module) main();
