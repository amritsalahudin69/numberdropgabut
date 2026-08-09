import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { LEVEL_1 } from '../src/config/levels/level1.js';
import { MarbleDropRules } from '../src/game/MarbleDropRules.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const indexPath = path.join(root, 'public', 'assets', 'generated', 'asset-index.json');

console.log('Running required-number-assets.test.mjs');

assert(fs.existsSync(indexPath), 'Asset index must exist for test');
const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));

const required = MarbleDropRules.getRequiredNumberAssetValues(LEVEL_1);
assert(Array.isArray(required), 'Required values must be an array');

// determinism: sorted unique
const sorted = Array.from(new Set(required.map(Number))).map(Number).sort((a,b)=>a-b);
assert(sorted.length === required.length, 'Required values must be unique');

// include startingValue
if (typeof LEVEL_1.startingValue === 'number') {
  assert(sorted.includes(LEVEL_1.startingValue), 'startingValue must be included');
}

// include all goal values
if (Array.isArray(LEVEL_1.goals)) {
  for (const g of LEVEL_1.goals) {
    assert(sorted.includes(Number(g.value)), `goal value ${g.value} must be included`);
  }
}

// targetValue only if present
if (typeof LEVEL_1.targetValue !== 'undefined') {
  assert(sorted.includes(Number(LEVEL_1.targetValue)), 'targetValue present but not included');
}

// verify PNG exists for each required value in asset index and on disk
const missing = [];
for (const v of sorted) {
  const rec = index[String(v)];
  if (!rec || !rec.png) {
    missing.push({ value: v, reason: 'index-missing' });
    continue;
  }
  const rel = rec.png.startsWith('/') ? rec.png.slice(1) : rec.png;
  const candidate = path.join(root, 'public', rel);
  if (!fs.existsSync(candidate)) {
    missing.push({ value: v, path: candidate });
  }
}

assert(missing.length === 0, `Missing PNG assets for values: ${missing.map(m=>m.value).join(', ')}`);

console.log('PASS required-number-assets');
process.exit(0);
