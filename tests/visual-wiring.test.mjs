import assert from 'node:assert/strict';
import { MarbleDropApp } from '../src/app/MarbleDropApp.js';

// Test that MarbleDropApp preloads visual assets via provided visualTextureCache
// and injects it into MarbleDropGame.
async function run() {
  console.log('Running visual-wiring.test.mjs...');

  let preloadCalled = false;
  const fakeVisualCache = {
    async preload(catalog) {
      preloadCalled = true;
      return true;
    },
    get(key) { return null; },
    has(key) { return false; },
    destroy() {}
  };

  // Minimal mocks for renderer, physics, asset service and number texture cache
  const fakeRenderer = {
    init() { return Promise.resolve(); },
    getStage() { return { addChild() {}, addChildAt() {} }; },
    getCanvas() { return null; },
  };
  const fakePhysics = { init() { return Promise.resolve(); }, getRapier() { return null; }, step() {}, destroy() {} };
  const fakeAssets = { init() { return Promise.resolve(); }, destroy() {} };
  const fakeNumberCache = { preload() { return Promise.resolve(true); }, has() { return false; }, get() { return null; }, destroy() {} };

  const app = new MarbleDropApp({ renderer: fakeRenderer, physics: fakePhysics, assets: fakeAssets, textureCache: fakeNumberCache, visualTextureCache: fakeVisualCache });

  // Ensure constructor recognized provided visualTextureCache
  assert.equal(!!app._visualTextureCacheProvided, true, 'Constructor must mark visualTextureCache as provided');
  assert.equal(app.visualTextureCache, fakeVisualCache, 'app.visualTextureCache should reference provided instance');

  // Simulate browser environment so app will call visualTextureCache.preload
  const hadDocument = typeof globalThis.document !== 'undefined';
  if (!hadDocument) globalThis.document = {};

  await app.init(null);

  if (!hadDocument) delete globalThis.document;

  assert.ok(preloadCalled, 'visualTextureCache.preload must be called during app.init');
  assert.ok(app.game && app.game.visualTextureCache === fakeVisualCache, 'MarbleDropGame must receive visualTextureCache instance');

  await app.destroy();

  console.log('PASS: visual-wiring.test.mjs passed.');
}

run().catch((err) => { console.error('FAIL: visual-wiring.test.mjs', err); process.exit(1); });