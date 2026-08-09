import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const assetIndexPath = path.join(rootDir, 'public', 'assets', 'generated', 'asset-index.json');

function validateAssets() {
  const errors = [];

  if (!fs.existsSync(assetIndexPath)) {
    console.error(`FAIL_ASSET_INDEX: Index file missing at ${assetIndexPath}`);
    process.exit(1);
  }

  let indexData;
  try {
    const raw = fs.readFileSync(assetIndexPath, 'utf-8');
    indexData = JSON.parse(raw);
  } catch (err) {
    console.error(`FAIL_ASSET_INDEX: Invalid JSON syntax in ${assetIndexPath}: ${err.message}`);
    process.exit(1);
  }

  if (typeof indexData !== 'object' || Array.isArray(indexData) || indexData === null) {
    console.error('FAIL_ASSET_INDEX: Root asset index must be a JSON object');
    process.exit(1);
  }

  const seenKeys = new Set();

  for (const [key, record] of Object.entries(indexData)) {
    if (!/^\d+$/.test(key)) {
      errors.push(`Key "${key}" is not numeric`);
    }

    const numKey = parseInt(key, 10);
    if (seenKeys.has(numKey)) {
      errors.push(`Duplicate logical value key: ${key}`);
    }
    seenKeys.add(numKey);

    if (!record || typeof record !== 'object') {
      errors.push(`Record for key ${key} is invalid`);
      continue;
    }

    if (!record.png || typeof record.png !== 'string') {
      errors.push(`Record for key ${key} missing PNG property`);
    } else {
      const relativePath = record.png.startsWith('/') ? record.png.slice(1) : record.png;
      const fullPngPath = path.join(rootDir, 'public', relativePath);
      if (!fs.existsSync(fullPngPath)) {
        errors.push(`PNG file referenced by key ${key} does not exist: ${fullPngPath}`);
      }
    }

    if (record.gif !== null && record.gif !== undefined) {
      if (typeof record.gif !== 'string') {
        errors.push(`GIF property for key ${key} must be string or null`);
      } else {
        const relativePath = record.gif.startsWith('/') ? record.gif.slice(1) : record.gif;
        const fullGifPath = path.join(rootDir, 'public', relativePath);
        if (!fs.existsSync(fullGifPath)) {
          errors.push(`GIF file referenced by key ${key} does not exist: ${fullGifPath}`);
        }
      }
    }
  }

  if (errors.length > 0) {
    console.error('FAIL_ASSET_INDEX: Validation failed with the following errors:');
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  console.log('PASS_ASSET_INDEX_VALID');
  process.exit(0);
}

validateAssets();
