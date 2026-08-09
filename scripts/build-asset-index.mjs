import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const numbersDir = path.join(rootDir, 'public', 'assets', 'numbers');
const gifDir = path.join(rootDir, 'public', 'assets', 'gif');
const generatedDir = path.join(rootDir, 'public', 'assets', 'generated');
const outputFile = path.join(generatedDir, 'asset-index.json');

function buildIndex() {
  if (!fs.existsSync(numbersDir)) {
    console.error(`Numbers directory missing at: ${numbersDir}`);
    process.exit(1);
  }

  const numberFiles = fs.readdirSync(numbersDir);
  const gifFiles = fs.existsSync(gifDir) ? fs.readdirSync(gifDir) : [];

  const numericKeysSet = new Set();

  for (const file of numberFiles) {
    const match = file.match(/^(\d+)\.png$/i);
    if (match) {
      numericKeysSet.add(parseInt(match[1], 10));
    }
  }

  const sortedKeys = Array.from(numericKeysSet).sort((a, b) => a - b);

  const indexMap = {};

  for (const num of sortedKeys) {
    const pngName = `${num}.png`;
    const gifName = `${num}.gif`;

    const pngExists = fs.existsSync(path.join(numbersDir, pngName));
    const gifExists = gifFiles.some((f) => f.toLowerCase() === gifName.toLowerCase());

    if (pngExists) {
      indexMap[num.toString()] = {
        png: `/assets/numbers/${pngName}`,
        gif: gifExists ? `/assets/gif/${gifName}` : null,
      };
    }
  }

  if (!fs.existsSync(generatedDir)) {
    fs.mkdirSync(generatedDir, { recursive: true });
  }

  fs.writeFileSync(outputFile, JSON.stringify(indexMap, null, 2), 'utf-8');
  console.log(`Asset index generated successfully with ${Object.keys(indexMap).length} entries at: ${outputFile}`);
}

buildIndex();
