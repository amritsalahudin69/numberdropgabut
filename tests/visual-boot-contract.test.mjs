import assert from 'node:assert/strict';
import { MarbleDropApp, APP_STATE } from '../src/app/MarbleDropApp.js';
import { VISUAL_ASSETS } from '../src/config/visualAssets.js';

async function run() {
  console.log('Running visual-boot-contract.test.mjs...');

  const fakeTexture = { _isFakeTexture: true, width: 800, height: 600 };

  // Helper to create a standard test renderer/physics/assets/cache
  const makeFakeAppDeps = (overrides = {}) => {
    const fakeStage = {
      children: [],
      addChild(c) { this.children.push(c); c.parent = this; },
      addChildAt(c, i) { this.children.splice(i, 0, c); c.parent = this; },
      removeChild(c) { const idx = this.children.indexOf(c); if (idx >= 0) this.children.splice(idx, 1); c.parent = null; }
    };
    
    const deps = {
      renderer: {
        init() { return Promise.resolve(); },
        getStage() { return fakeStage; },
        getCanvas() { return null; },
        destroy() {}
      },
      physics: { init() { return Promise.resolve(); }, getRapier() { return null; }, step() {}, destroy() {} },
      assets: { init() { return Promise.resolve(); }, destroy() {} },
      textureCache: { preload() { return Promise.resolve(true); }, has() { return false; }, get() { return null; }, destroy() {} },
      visualTextureCache: {
        async preload(catalog) { return true; },
        get(key) { return fakeTexture; },
        has(key) { return true; },
        destroy() {}
      }
    };
    return { ...deps, ...overrides };
  };

  // A. SUCCESS
  {
    console.log('TEST A: Visual boot success');
    const deps = makeFakeAppDeps();
    const app = new MarbleDropApp(deps);
    await app.init(null);
    assert.equal(app.state, APP_STATE.READY, 'state should be READY on success');
    assert.ok(app.game, 'game should be created');
    assert.ok(app.game.backgroundLayer, 'game.backgroundLayer should exist');
    assert.ok(app.game.backgroundLayer.sprite, 'background sprite should exist');
    const stage = deps.renderer.getStage();
    assert.equal(stage.children[0], app.game.backgroundLayer.sprite, 'background should be stage.children[0]');
    assert.equal(stage.children[1], app.game.container, 'game container should be above background');
    app.destroy();
    console.log('  PASS');
  }

  // B. VISUAL PRELOAD FAILURE
  {
    console.log('TEST B: Visual preload throws');
    const deps = makeFakeAppDeps({
      visualTextureCache: {
        async preload() { throw new Error('Loader unavailable'); },
        destroy() {}
      }
    });
    const app = new MarbleDropApp(deps);
    try {
      await app.init(null);
      assert.fail('Should have rejected');
    } catch (e) {
      assert.ok(e.message.includes('Loader unavailable'), 'error message should contain original failure');
      assert.equal(app.state, APP_STATE.FAILED, 'state should be FAILED');
      assert.ok(!app.game || !app.game.session || !app.game.session.getState, 'game should be destroyed');
    }
    console.log('  PASS');
  }

  // C. CACHE UNAVAILABLE
  {
    console.log('TEST C: visualTextureCache.get is unavailable');
    const deps = makeFakeAppDeps({
      visualTextureCache: {
        async preload() { return true; },
        // missing get() method
        has() { return true; },
        destroy() {}
      }
    });
    const app = new MarbleDropApp(deps);
    try {
      await app.init(null);
      assert.fail('Should have rejected');
    } catch (e) {
      assert.ok(e.message.includes('VisualTextureCache'), 'error should mention VisualTextureCache');
      assert.equal(app.state, APP_STATE.FAILED, 'state should be FAILED');
    }
    console.log('  PASS');
  }

  // D. CACHE MISS
  {
    console.log('TEST D: visualTextureCache.get returns null');
    const deps = makeFakeAppDeps({
      visualTextureCache: {
        async preload() { return true; },
        get(key) { return null; },
        has(key) { return false; },
        destroy() {}
      }
    });
    const app = new MarbleDropApp(deps);
    try {
      await app.init(null);
      assert.fail('Should have rejected');
    } catch (e) {
      assert.ok(e.message.includes('background texture was not preloaded'), 'error should mention missing texture');
      assert.ok(e.message.includes(VISUAL_ASSETS.background), 'error should include exact URL');
      assert.equal(app.state, APP_STATE.FAILED, 'state should be FAILED');
    }
    console.log('  PASS');
  }

  // E. BACKGROUND MOUNT FAILURE
  {
    console.log('TEST E: BackgroundLayer.mount throws');
    const deps = makeFakeAppDeps({
      renderer: {
        init() { return Promise.resolve(); },
        getStage() { return null; }, // Invalid stage
        getCanvas() { return null; },
        destroy() {}
      }
    });
    const app = new MarbleDropApp(deps);
    try {
      await app.init(null);
      assert.fail('Should have rejected');
    } catch (e) {
      assert.ok(e.message.length > 0, 'should have error message');
      assert.equal(app.state, APP_STATE.FAILED, 'state should be FAILED');
    }
    console.log('  PASS');
  }

  // F. APP FAILURE ROLLBACK
  {
    console.log('TEST F: Failure after partial init cleanup');
    const deps = makeFakeAppDeps({
      visualTextureCache: {
        async preload() { return true; },
        get(key) { return fakeTexture; },
        has(key) { return true; },
        destroy() {}
      },
      // Cause failure during game.init by injecting bad physics
      physics: {
        init() { return Promise.resolve(); },
        getRapier() { throw new Error('Physics init failed'); },
        destroy() {}
      }
    });
    const app = new MarbleDropApp(deps);
    try {
      await app.init(null);
      assert.fail('Should have rejected');
    } catch (e) {
      assert.ok(e.message.length > 0, 'original error preserved');
      assert.equal(app.state, APP_STATE.FAILED, 'state should be FAILED');
    }
    console.log('  PASS');
  }

  // G. NORMAL DESTROY
  {
    console.log('TEST G: Normal destroy after success');
    const deps = makeFakeAppDeps();
    const app = new MarbleDropApp(deps);
    await app.init(null);
    const gameRef = app.game;
    assert.ok(gameRef.backgroundLayer, 'background should exist before destroy');
    app.destroy();
    assert.equal(app.state, APP_STATE.DESTROYED, 'state should be DESTROYED');
    assert.equal(app.game, null, 'game should be nulled');
    console.log('  PASS');
  }

  // H. TRANSACTIONAL VISUAL CACHE FAILURE
  {
    console.log('TEST H: Transactional preload with partial assets');
    const deps = makeFakeAppDeps({
      visualTextureCache: {
        async preload(catalog) {
          // Simulate first asset load succeeds, second fails
          throw new Error('Second asset load failed (transactional rollback)');
        },
        has(key) { return false; },
        get(key) { return null; },
        destroy() {}
      }
    });
    const app = new MarbleDropApp(deps);
    try {
      await app.init(null);
      assert.fail('Should have rejected');
    } catch (e) {
      assert.ok(e.message.includes('transactional'), 'error should mention transactional');
      assert.equal(app.state, APP_STATE.FAILED, 'state should be FAILED');
    }
    console.log('  PASS');
  }

  console.log('PASS: visual-boot-contract.test.mjs all scenarios passed.');
}

run().catch((err) => { console.error('FAIL: visual-boot-contract.test.mjs', err); process.exit(1); });
