import assert from 'node:assert/strict';
import { MarbleDropGame } from '../src/game/MarbleDropGame.js';
import { LEVEL_1 } from '../src/config/levels/level1.js';
import { GAMEPLAY_STATE } from '../src/game/MarbleDropSession.js';
import { FakeClock } from '../src/core/Clock.js';

async function runLifecycleHardening() {
  console.log('Running lifecycle-hardening.test.mjs...');

  const fakeClock = new FakeClock(0);

  const fakeTextureCache = {
    get(val) { return { id: `tex-${val}` }; },
    has() { return true; },
    destroy() {},
  };

  const fakeVisualTextureCache = {
    get(key) { return { _isFakeTexture: true, width: 800, height: 600 }; },
    has() { return true; },
    destroy() {},
  };

  const fakeAssets = {
    getFeedbackAsset() { return { type: 'png', url: '/assets/numbers/99.png' }; },
    getStaticUrl(val) { return `/assets/numbers/${val}.png`; },
  };

  const fakeFeedback = {
    show() {}, updatePosition() {}, clear() {}, isVisible() { return false; }, getCurrentAsset() { return null; }, destroy() {},
  };

  const fakeStage = { children: [], addChild(c){ this.children.push(c); c.parent = this; }, addChildAt(c, i){ this.children.splice(i, 0, c); c.parent = this; }, removeChild(c){ const idx = this.children.indexOf(c); if (idx >= 0) this.children.splice(idx, 1); } };
  const fakeRenderer = {
    getStage() { return fakeStage; },
    getCanvas() { return null; },
    worldToClient() { return { clientX: 100, clientY: 100 }; },
  };

  const game = new MarbleDropGame({
    renderer: fakeRenderer,
    physics: null,
    textureCache: fakeTextureCache,
    visualTextureCache: fakeVisualTextureCache,
    assetService: fakeAssets,
    level: LEVEL_1,
    clock: fakeClock,
    feedbackService: fakeFeedback,
  });

  await game.init();
  game.start();

  const baselineRegistryCount = game.registry.size();
  const pegCount = game.pegs.length;
  const gateCount = game.gates.length;
  const goalCount = game.goals.length;

  assert.equal(game.session.getState(), GAMEPLAY_STATE.READY);

  // 50 sequential resets
  for (let i = 0; i < 50; i++) {
    game.reset();
    const s = game.getSnapshot();
    assert.equal(s.gameState, GAMEPLAY_STATE.READY);
    assert.equal(s.activeGacoanCount, 0);
    assert.equal(s.pegCount, pegCount);
    assert.equal(s.gateCount, gateCount);
    assert.equal(s.goalCount, goalCount);
    assert.equal(game.registry.size(), baselineRegistryCount);
  }

  // 50 drop -> cleanup cycles
  for (let i = 0; i < 50; i++) {
    // create fake gacoan and inject
    let destroyed = false;
    const fakeG = {
      value: game.session.getCurrentValue(),
      sprite: { texture: { id: 'tex' } },
      destroyed: false,
      getColliderHandle() { return `gc-${i}`; },
      setValue(v, t) { this.value = v; this.sprite.texture = t; },
      freeze() {}, unfreeze() {}, isFrozen() { return false; },
      syncFromPhysics() {}, destroy() { this.destroyed = true; destroyed = true; },
    };

    // register fake collider into registry to simulate real world
    game.registry.register(fakeG.getColliderHandle(), { type: 'gacoan', entity: fakeG });

    game.activeGacoan = fakeG;
    game.session.beginDrop(fakeG);

    // Simulate immediate cleanup (e.g., out of bounds)
    game.session.beginCleanup();
    game.cleanupActiveGacoan();

    assert.equal(game.activeGacoan, null);
    assert.equal(game.registry.get(fakeG.getColliderHandle()), null);
    assert.equal(game.registry.size(), baselineRegistryCount);
    // normalize session for next iteration
    game.reset();
  }

  // 25 gate hold cycles (RESOLVING -> HOLDING -> FALLING)
  for (let i = 0; i < 25; i++) {
    // inject fake gacoan
    let frozen = false;
    let val = game.session.getCurrentValue();
    const fg = {
      get value() { return val; },
      set value(v) { val = v; },
      isFrozen() { return frozen; },
      freeze() { frozen = true; },
      unfreeze() { frozen = false; },
      setValue(v, t) { val = v; },
      getPosition() { return { x: 100, y: 100 }; },
      getColliderHandle() { return `g-h-${i}`; },
      syncFromPhysics() {}, destroy() { this.destroyed = true; },
      destroyed: false,
    };
    game.session.beginDrop(fg);
    game.activeGacoan = fg;
    game.session.beginResolve();

    const res = game.resolver.resolveOperationHit({ operator: '-', operand: 1, isGoal: false });
    assert.ok(res.ok);
    game._startHold(res);

    // still holding
    assert.equal(game.session.getState(), GAMEPLAY_STATE.HOLDING);

    // advance to hold expiry
    fakeClock.advance(5000);
    game.update(0);

    assert.equal(game.session.getState(), GAMEPLAY_STATE.FALLING);
    // cleanup for next cycle
    game.session.beginCleanup();
    game.cleanupActiveGacoan();
    if (game.session.getState() === GAMEPLAY_STATE.CLEANUP) {
      game.session.finishCleanup();
    }
    // normalize session for next iteration
    game.reset();
  }

  // 20 goal cleanup cycles
  for (let i = 0; i < 20; i++) {
    let destroyed = false;
    let _val = game.session.getCurrentValue();
    const fg = {
      get value() { return _val; },
      set value(v) { _val = v; },
      isFrozen() { return false; }, freeze() {}, unfreeze() {},
      setValue(v) { _val = v; },
      getPosition() { return { x: 100, y: 900 }; },
      getColliderHandle() { return `goal-gc-${i}`; },
      syncFromPhysics() {}, destroy() { this.destroyed = true; destroyed = true; },
      destroyed: false,
    };

    game.session.beginDrop(fg);
    game.activeGacoan = fg;
    game.session.beginResolve();

    const res = game.resolver.resolveOperationHit({ operator: '-', operand: 1, isGoal: true });
    assert.ok(res.ok);
    game._startHold(res);

    fakeClock.advance(5000);
    game.update(0);

    // after goal hold, either READY or SUMMARY (finishGoalHold sets CLEANUP->finishCleanup->READY/SUMMARY)
    const st = game.session.getState();
    assert.ok(st === GAMEPLAY_STATE.READY || st === GAMEPLAY_STATE.SUMMARY || st === GAMEPLAY_STATE.CLEANUP);
    // ensure no active gacoan
    assert.equal(game.activeGacoan, null);
    game.reset();
  }

  // 20 reset during holding
  for (let i = 0; i < 20; i++) {
    let _val2 = game.session.getCurrentValue();
    const fg = {
      get value() { return _val2; },
      set value(v) { _val2 = v; },
      isFrozen() { return false; }, freeze() {}, unfreeze() {},
      setValue(v) { _val2 = v; },
      getPosition() { return { x: 100, y: 100 }; },
      getColliderHandle() { return `rdh-${i}`; },
      syncFromPhysics() {}, destroy() { this.destroyed = true; },
      destroyed: false,
    };
    game.session.beginDrop(fg);
    game.activeGacoan = fg;
    game.session.beginResolve();
    const res = game.resolver.resolveOperationHit({ operator: '-', operand: 1, isGoal: false });
    assert.ok(res.ok);
    game._startHold(res);

    // reset during holding
    game.reset();
    // advance far beyond hold expiry
    fakeClock.advance(60000);
    game.update(0);

    assert.equal(game.session.getState(), GAMEPLAY_STATE.READY);
    assert.equal(game.activeGacoan, null);
    assert.equal(game.registry.size(), baselineRegistryCount);
  }

  // duplicate contact: simulate two identical starts -> only one commit
  {
    let valBefore = game.session.getCurrentValue();
    let _val3 = valBefore;
    const fg = {
      get value() { return _val3; },
      set value(v) { _val3 = v; },
      isFrozen() { return false; }, freeze() {}, unfreeze() {},
      setValue(v) { _val3 = v; },
      getPosition() { return { x: 100, y: 100 }; },
      getColliderHandle() { return `dup-1`; },
      syncFromPhysics() {}, destroy() {}, destroyed: false,
    };
    game.session.beginDrop(fg);
    game.activeGacoan = fg;
    game.session.beginResolve();

    const r1 = game.resolver.resolveOperationHit({ operator: '-', operand: 1, isGoal: false });
    assert.ok(r1.ok);
    // simulate realistic handling: caller starts hold after first resolution
    game._startHold(r1);
    const r2 = game.resolver.resolveOperationHit({ operator: '-', operand: 1, isGoal: false });
    // second should be ignored because session no longer RESOLVING
    assert.ok(!r2.ok);
    // advance to expire hold and normalize
    fakeClock.advance(5000);
    game.update(0);
    assert.equal(game.session.getCurrentValue(), valBefore - 1);
    game.reset();
  }

  // double destroy idempotency
  game.destroy();
  game.destroy();

  assert.equal(game.registry.size(), 0);
  assert.equal(game.activeGacoan, null);
  assert.equal(game.session.getState(), GAMEPLAY_STATE.DESTROYED);

  console.log('PASS: lifecycle-hardening.test.mjs all assertions passed.');
}

runLifecycleHardening().catch((err) => {
  console.error('FAIL: lifecycle-hardening.test.mjs failed:', err);
  process.exit(1);
});
