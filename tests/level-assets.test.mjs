import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LEVEL_1 } from '../src/config/levels/level1.js';
import { MarbleDropRules } from '../src/game/MarbleDropRules.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const assetIndexPath = path.join(rootDir, 'public', 'assets', 'generated', 'asset-index.json');

function runLevelAssetsTests() {
  console.log('Running level-assets.test.mjs...');

  assert.ok(fs.existsSync(assetIndexPath), 'Asset index file must exist');

  const raw = fs.readFileSync(assetIndexPath, 'utf-8');
  const indexData = JSON.parse(raw);

  const reachableValues = MarbleDropRules.getReachableValues(LEVEL_1);
  assert.ok(reachableValues.length > 0, 'Reachable values must be non-empty');

  for (const val of reachableValues) {
    const key = String(val);
    const record = indexData[key];

    assert.ok(record, `Asset index record for reachable value ${val} must exist`);
    assert.ok(record.png, `Asset index PNG for reachable value ${val} must exist`);

    const relPath = record.png.startsWith('/') ? record.png.slice(1) : record.png;
    const fullPath = path.join(rootDir, 'public', relPath);

    assert.ok(fs.existsSync(fullPath), `PNG file for value ${val} must exist on disk at ${fullPath}`);
  }

  console.log(`PASS: level-assets.test.mjs verified all ${reachableValues.length} reachable Level 1 PNG assets.`);
}

runLevelAssetsTests();
