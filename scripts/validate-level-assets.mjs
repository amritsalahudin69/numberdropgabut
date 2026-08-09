import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LEVEL_1 } from '../src/config/levels/level1.js';
import { MarbleDropRules } from '../src/game/MarbleDropRules.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const assetIndexPath = path.join(rootDir, 'public', 'assets', 'generated', 'asset-index.json');

function validateLevelAssets() {
  if (!fs.existsSync(assetIndexPath)) {
    console.error(`FAIL_LEVEL_ASSET_COVERAGE: Asset index missing at ${assetIndexPath}`);
    process.exit(1);
  }

  let indexData;
  try {
    const raw = fs.readFileSync(assetIndexPath, 'utf-8');
    indexData = JSON.parse(raw);
  } catch (err) {
    console.error(`FAIL_LEVEL_ASSET_COVERAGE: Invalid asset index JSON: ${err.message}`);
    process.exit(1);
  }

  const requiredValues = MarbleDropRules.getRequiredNumberAssetValues(LEVEL_1);

  const missingPngs = [];

  for (const val of requiredValues) {
    const key = String(val);
    const record = indexData[key];

    if (!record || !record.png) {
      missingPngs.push({ value: val, reason: 'Record or PNG missing in asset index' });
      continue;
    }

    const relPath = record.png.startsWith('/') ? record.png.slice(1) : record.png;
    const fullPath = path.join(rootDir, 'public', relPath);

    if (!fs.existsSync(fullPath)) {
      missingPngs.push({ value: val, path: fullPath, reason: 'PNG file missing on disk' });
    }
  }

  if (missingPngs.length > 0) {
    console.error('FAIL_LEVEL_ASSET_COVERAGE:');
    console.error('Missing PNGs for reachable Level 1 values:');
    for (const item of missingPngs) {
      console.error(`  - value: ${item.value} (${item.reason})`);
    }
    process.exit(1);
  }

  const sorted = Array.from(new Set(requiredValues)).map(Number).sort((a,b) => a-b);
  console.log(`Required Level 1 values count: ${sorted.length} (min: ${sorted[0]}, max: ${sorted[sorted.length - 1]})`);
  console.log('PASS_LEVEL_ASSET_COVERAGE');
  process.exit(0);
}

validateLevelAssets();
