import assert from 'assert';
import { LEVEL_1 } from '../src/config/levels/level1.js';
import { TargetStrip } from '../src/ui/TargetStrip.js';

console.log('Running target-strip.test.mjs');

// Fake cache that will return a very small "texture-like" object for pixi.Sprite
const fakeTexture = { __isFakeTexture: true };
const goodCache = {
  get: (v) => fakeTexture,
};

const badCache = {
  get: (v) => { throw new Error('cache miss'); },
};

// Use LEVEL_1.goals as required
const tsGood = new TargetStrip({ level: LEVEL_1, numberTextureCache: goodCache, assetService: null });
// Should render without throwing
tsGood._renderCards();
assert(tsGood.cards.length === (Array.isArray(LEVEL_1.goals) ? LEVEL_1.goals.length : 0), 'TargetStrip should create one card per goal');

// Now with bad cache: should fallback to text and still not throw
const tsBad = new TargetStrip({ level: LEVEL_1, numberTextureCache: badCache, assetService: null });
tsBad._renderCards();
assert(tsBad.cards.length === (Array.isArray(LEVEL_1.goals) ? LEVEL_1.goals.length : 0), 'TargetStrip fallback should still create cards');

console.log('PASS target-strip');
process.exit(0);
