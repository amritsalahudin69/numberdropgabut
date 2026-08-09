import assert from 'node:assert/strict';
import { MarbleDropApp } from '../src/app/MarbleDropApp.js';
import { VISUAL_ASSETS } from '../src/config/visualAssets.js';

// Test that MarbleDropApp preloads visual assets via provided visualTextureCache
// and injects it into MarbleDropGame.
async function run() {
  console.log('Running visual-wiring.test.mjs...');

  let preloadCalled = false;
  let requestedBgUrl = null;
  const fakeTexture = { _isFakeTexture: true, width: 800, height: 600 };
  const fakeVisualCache = {
    async preload(catalog) {
      preloadCalled = true;
      return true;
    },
    get(key) { requestedBgUrl = key; return fakeTexture; },
    has(key) { return true; },
    destroy() {}
  };

  // Fake stage that records child order and simulates parent assignment
  const fakeStage = {
    children: [],
    addChild(child) {
      this.children.push(child);
      child.parent = this;
    },
    addChildAt(child, idx) {
      this.children.splice(idx, 0, child);
      child.parent = this;
    },
    removeChild(child) {
      const i = this.children.indexOf(child);
      if (i >= 0) this.children.splice(i, 1);
      child.parent = null;
    }
  };

  // Minimal mocks for renderer, physics, asset service and number texture cache
  const fakeRenderer = {
    init() { return Promise.resolve(); },
    getStage() { return fakeStage; },
    getCanvas() { return null; },
    destroy() {}
  };
  const fakePhysics = { init() { return Promise.resolve(); }, getRapier() { return null; }, step() {}, destroy() {} };
  const fakeAssets = { init() { return Promise.resolve(); }, destroy() {} };
  const fakeNumberCache = { preload() { return Promise.resolve(true); }, has() { return false; }, get() { return null; }, destroy() {} };

  const app = new MarbleDropApp({ renderer: fakeRenderer, physics: fakePhysics, assets: fakeAssets, textureCache: fakeNumberCache, visualTextureCache: fakeVisualCache });

  // Ensure constructor recognized provided visualTextureCache
  assert.equal(!!app._visualTextureCacheProvided, true, 'Constructor must mark visualTextureCache as provided');
  assert.equal(app.visualTextureCache, fakeVisualCache, 'app.visualTextureCache should reference provided instance');

  // VISUAL_ASSETS background must be a string
  assert.equal(typeof VISUAL_ASSETS.background, 'string', 'VISUAL_ASSETS.background must be declared as a string URL');

  // Simulate browser environment so app will call visualTextureCache.preload
  const hadDocument = typeof globalThis.document !== 'undefined';
  if (!hadDocument) globalThis.document = {};

  await app.init(null);

  if (!hadDocument) delete globalThis.document;

  assert.ok(preloadCalled, 'visualTextureCache.preload must be called during app.init');
  assert.ok(app.game && app.game.visualTextureCache === fakeVisualCache, 'MarbleDropGame must receive visualTextureCache instance');

  // VisualTextureCache.get must be called with the exact VISUAL_ASSETS.background URL
  assert.equal(requestedBgUrl, VISUAL_ASSETS.background, 'VisualTextureCache.get must be requested with VISUAL_ASSETS.background');

  // Background sprite must be mounted at index 0
  assert.ok(fakeStage.children.length >= 2, 'Stage should have background and game container');
  const bgSprite = fakeStage.children[0];
  const gameContainer = fakeStage.children[1];
  assert.ok(bgSprite, 'background sprite must be present');
  assert.equal(bgSprite.parent, fakeStage, 'background sprite parent must be stage');
  assert.equal(gameContainer.parent, fakeStage, 'game container must be parented to stage');

  // sprite should be centered according to world
  const world = app.game.level.world;
  assert.equal(bgSprite.position.x, world.width / 2, 'background sprite centered horizontally');
  assert.equal(bgSprite.position.y, world.height / 2, 'background sprite centered vertically');

  await app.destroy();

  console.log('PASS: visual-wiring.test.mjs passed.');
}

run().catch((err) => { console.error('FAIL: visual-wiring.test.mjs', err); process.exit(1); });