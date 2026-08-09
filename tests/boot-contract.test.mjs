import assert from 'node:assert/strict';
import { MarbleDropApp, APP_STATE } from '../src/app/MarbleDropApp.js';

async function runBootContractTests() {
  console.log('Running boot-contract.test.mjs...');

  // Test 1 & 2: Success boot sequence and exact order
  const initCallOrder = [];
  const fakeHost = { id: 'mock-host' };

  const fakeRenderer = {
    initCalls: 0,
    destroyCalls: 0,
    async init(host) {
      this.initCalls++;
      initCallOrder.push('renderer.init');
      assert.equal(host, fakeHost);
    },
    destroy() {
      this.destroyCalls++;
    },
  };

  const fakePhysics = {
    initCalls: 0,
    destroyCalls: 0,
    async init() {
      this.initCalls++;
      initCallOrder.push('physics.init');
    },
    destroy() {
      this.destroyCalls++;
    },
  };

  const fakeAssets = {
    initCalls: 0,
    destroyCalls: 0,
    async init() {
      this.initCalls++;
      initCallOrder.push('assets.init');
    },
    getStaticUrl(val) {
      return `/assets/numbers/${val}.png`;
    },
    destroy() {
      this.destroyCalls++;
    },
  };

  const fakeTextureCache = {
    async preload() {},
    get(val) { return { id: `tex-${val}` }; },
    has() { return true; },
    destroy() {},
  };

  const fakeGame = {
    async init() {},
    start() {},
    reset() {},
    destroy() {},
  };

  const app = new MarbleDropApp({
    renderer: fakeRenderer,
    physics: fakePhysics,
    assets: fakeAssets,
    textureCache: fakeTextureCache,
    game: fakeGame,
  });

  assert.equal(app.getState(), APP_STATE.CREATED);

  const initPromise = app.init(fakeHost);
  assert.equal(app.getState(), APP_STATE.BOOTING);

  await initPromise;

  assert.equal(app.getState(), APP_STATE.READY);
  assert.deepEqual(initCallOrder, ['renderer.init', 'physics.init', 'assets.init']);
  assert.equal(fakeRenderer.initCalls, 1);
  assert.equal(fakePhysics.initCalls, 1);
  assert.equal(fakeAssets.initCalls, 1);

  // Test 4: Destroy test
  app.destroy();
  assert.equal(app.getState(), APP_STATE.DESTROYED);
  assert.equal(fakeRenderer.destroyCalls, 1);
  assert.equal(fakePhysics.destroyCalls, 1);
  assert.equal(fakeAssets.destroyCalls, 1);

  // Test 3: Failure handling (physics.init throws)
  const failCallOrder = [];

  const failRenderer = {
    async init() {
      failCallOrder.push('renderer.init');
    },
    destroy() {},
  };

  const failPhysics = {
    async init() {
      failCallOrder.push('physics.init');
      throw new Error('Physics initialization error simulation');
    },
    destroy() {},
  };

  const failAssets = {
    initCalls: 0,
    async init() {
      this.initCalls++;
      failCallOrder.push('assets.init');
    },
    getStaticUrl(val) { return `/assets/numbers/${val}.png`; },
    destroy() {},
  };

  const failingApp = new MarbleDropApp({
    renderer: failRenderer,
    physics: failPhysics,
    assets: failAssets,
    textureCache: fakeTextureCache,
    game: fakeGame,
  });

  await assert.rejects(async () => {
    await failingApp.init(fakeHost);
  }, /Physics initialization error simulation/);

  assert.equal(failingApp.getState(), APP_STATE.FAILED);
  assert.deepEqual(failCallOrder, ['renderer.init', 'physics.init']);
  assert.equal(failAssets.initCalls, 0); // assets.init MUST NOT be called if physics fails

  console.log('PASS: boot-contract.test.mjs passed all behavioral assertions.');
}

runBootContractTests().catch((err) => {
  console.error('FAIL: boot-contract.test.mjs failed with error:', err);
  process.exit(1);
});
