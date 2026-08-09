import assert from 'node:assert/strict';
import { VisualTextureCache } from '../src/systems/VisualTextureCache.js';
import { VISUAL_ASSETS } from '../src/config/visualAssets.js';

async function run() {
  console.log('Running visual-assets.test.mjs...');

  // Fake loader to simulate PIXI Assets in Node tests
  const fakeTexture = { width: 100, height: 100, _isFakeTexture: true };
  const fakeLoader = {
    async load(url) {
      // simulate async load
      return Promise.resolve();
    },
    get(url) {
      // return fake texture for known visual asset
      if (url && typeof url === 'string' && url.includes('marbledrop')) return fakeTexture;
      return null;
    },
  };

  const cache = new VisualTextureCache({ loader: fakeLoader });
  let ok = false;
  try {
    ok = await cache.preload(VISUAL_ASSETS);
  } catch (e) {
    console.error('Preload failed', e);
    ok = false;
  }
  assert.ok(ok, 'VisualTextureCache.preload must succeed for declared visual assets');

  // Ensure declared keys are present in cache
  const declared = [];
  const collect = (obj) => {
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      if (typeof v === 'string' && v) declared.push(v);
      else if (v && typeof v === 'object') collect(v);
    }
  };
  collect(VISUAL_ASSETS);

  for (const key of declared) {
    assert.ok(cache.has(key), `cache must have ${key}`);
    const entry = cache.get(key);
    assert.ok(entry && entry._isFakeTexture, `cache entry for ${key} must be the fake texture`);
  }

  cache.destroy();
  assert.equal(cache.has(declared[0]), false, 'cache must be cleared after destroy');

  console.log('PASS: visual-assets.test.mjs passed all assertions.');
}

run().catch((err) => { console.error('FAIL: visual-assets.test.mjs', err); process.exit(1); });
