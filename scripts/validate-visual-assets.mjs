import fs from 'fs';
import path from 'path';
import { VISUAL_ASSETS } from '../src/config/visualAssets.js';

function collectPaths(obj, prefix = '') {
  const out = [];
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (typeof v === 'string' && v) out.push(v);
    else if (v && typeof v === 'object') out.push(...collectPaths(v, `${prefix}${k}.`));
  }
  return out;
}

const publicDir = path.resolve(process.cwd(), 'public', 'assets');
const declared = collectPaths(VISUAL_ASSETS);
let failed = [];
for (const rel of declared) {
  // Normalize declared path to be relative to public/assets
  let relPath = String(rel).replace(/^\/+/, '');
  if (relPath.startsWith('assets/')) relPath = relPath.slice('assets/'.length);
  const abs = path.join(publicDir, relPath);
  if (!fs.existsSync(abs)) {
    failed.push({ declared: rel, abs });
  }
}

if (failed.length > 0) {
  console.error('FAIL_MD_VISUAL_ASSET_CATALOG');
  for (const f of failed) {
    console.error('Missing:', f.declared, 'expected at', f.abs);
  }
  process.exit(1);
} else {
  console.log('PASS_MD_VISUAL_ASSET_CATALOG');
  process.exit(0);
}
