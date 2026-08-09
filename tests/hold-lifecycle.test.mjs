/**
 * hold-lifecycle.test.mjs
 * Behavioral test for HOLDING state with FakeClock.
 * No real waits. No setTimeout.
 */

import assert from 'node:assert/strict';
import { MarbleDropGame } from '../src/game/MarbleDropGame.js';
import { LEVEL_1 } from '../src/config/levels/level1.js';
import { GAMEPLAY_STATE } from '../src/game/MarbleDropSession.js';
import { FakeClock } from '../src/core/Clock.js';
import { COLLISION_FEEDBACK_MS } from '../src/config/constants.js';

async function runHoldLifecycleTests() {
  console.log('Running hold-lifecycle.test.mjs...');

  const fakeClock = new FakeClock(0);

  // --- fake gacoan ---
  let gacoanFrozen = false;
  let gacoanValue = 100;
  let gacoanTexture = { id: 'tex-100' };

  const fakeGacoan = {
    get value() { return gacoanValue; },
    set value(v) { gacoanValue = v; },
    isFrozen() { return gacoanFrozen; },
    freeze() { gacoanFrozen = true; },
    unfreeze() { gacoanFrozen = false; },
    setValue(v, t) { gacoanValue = v; gacoanTexture = t; },
    getPosition() { return { x: 960, y: 400 }; },
    getColliderHandle() { return 'gc-handle'; },
    syncFromPhysics() {},
    destroy() {},
    destroyed: false,
  };

  // --- fake texture cache ---
  const fakeTextureCache = {
    get(val) { return { id: `tex-${val}` }; },
    has() { return true; },
    destroy() {},
  };

  // --- fake visual texture cache ---
  const fakeVisualTextureCache = {
    get(key) { return { _isFakeTexture: true, width: 800, height: 600 }; },
    has() { return true; },
    destroy() {},
  };

  // --- fake asset service (getFeedbackAsset) ---
  const fakeAssets = {
    getFeedbackAsset(val) {
      // value 99 has GIF, 100 has GIF
      return { type: 'gif', url: `/assets/gif/${val}.gif` };
    },
    getStaticUrl(val) {
      return `/assets/numbers/${val}.png`;
    },
  };

  // --- fake feedback service ---
  let feedbackVisible = false;
  let feedbackAssetShown = null;

  const fakeFeedback = {
    show(asset) { feedbackVisible = true; feedbackAssetShown = asset; },
    updatePosition() {},
    clear() { feedbackVisible = false; feedbackAssetShown = null; },
    isVisible() { return feedbackVisible; },
    getCurrentAsset() { return feedbackAssetShown; },
    destroy() {},
  };

  // --- fake renderer ---
  const fakeStage = { children: [], addChild(c){ this.children.push(c); c.parent = this; }, addChildAt(c, i){ this.children.splice(i, 0, c); c.parent = this; }, removeChild(c){ const idx = this.children.indexOf(c); if (idx >= 0) this.children.splice(idx, 1); } };
  const fakeRenderer = {
    getStage() { return fakeStage; },
    getCanvas() { return null; },
    worldToClient() { return { clientX: 100, clientY: 200 }; },
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

  // Inject the pre-made fakeGacoan directly
  game.activeGacoan = fakeGacoan;
  game.session.activeGacoan = fakeGacoan;
  game.session.state = GAMEPLAY_STATE.FALLING;
  game.session.opsUsed = 1;
  game.session.currentValue = 100;

  // Register gacoan collider handle
  game.registry.register('gc-handle', { type: 'gacoan', entity: fakeGacoan });

  // --- PHASE 1: Trigger gate resolution (-1 gate) ---
  // Manually transition to RESOLVING then invoke resolveOperationHit → then _startHold
  game.session.beginResolve();
  const resolveResult = game.resolver.resolveOperationHit({
    operator: '-',
    operand: 1,
    isGoal: false,
  });

  assert.ok(resolveResult.ok, 'gate resolution must succeed');
  assert.equal(resolveResult.nextValue, 99);
  assert.equal(resolveResult.postHoldAction, 'RESUME_FALL');

  // Now call _startHold (game.update would normally do this via processCollisionEvents)
  game._startHold(resolveResult);

  // Immediately after RESOLVING→HOLDING:
  assert.equal(game.session.getState(), GAMEPLAY_STATE.HOLDING);
  assert.equal(gacoanValue, 99, 'gacoan value must be 99 immediately');
  assert.equal(game.session.getCurrentValue(), 99, 'session value must be 99 immediately');
  assert.ok(gacoanFrozen, 'gacoan must be frozen');
  assert.ok(feedbackVisible, 'feedback must be visible');

  // --- PHASE 2: Advance clock to 4999ms — still HOLDING ---
  fakeClock.advance(COLLISION_FEEDBACK_MS - 1);
  game.update(0);  // physics-less update tick

  assert.equal(game.session.getState(), GAMEPLAY_STATE.HOLDING, 'still HOLDING at 4999ms');
  assert.ok(gacoanFrozen, 'still frozen at 4999ms');
  assert.ok(feedbackVisible, 'still visible at 4999ms');

  // --- PHASE 3: Advance to exactly 5000ms — hold expires ---
  fakeClock.advance(1);  // now at 5000ms
  game.update(0);

  assert.equal(game.session.getState(), GAMEPLAY_STATE.FALLING, 'should return to FALLING after hold');
  assert.equal(gacoanFrozen, false, 'gacoan must be unfrozen');
  assert.equal(feedbackVisible, false, 'feedback must be hidden');
  assert.equal(game.session.getCurrentValue(), 99, 'value must remain 99 after hold');
  assert.equal(gacoanValue, 99, 'gacoan value must remain 99');

  game.destroy();

  // ── GOAL HOLD TEST ───────────────────────────────────────────────────────
  console.log('  Testing goal hold lifecycle...');

  const fakeClock2 = new FakeClock(0);
  let g2Frozen = false;
  let g2Value = 99;

  const fakeGacoan2 = {
    get value() { return g2Value; },
    set value(v) { g2Value = v; },
    isFrozen() { return g2Frozen; },
    freeze() { g2Frozen = true; },
    unfreeze() { g2Frozen = false; },
    setValue(v) { g2Value = v; },
    getPosition() { return { x: 960, y: 900 }; },
    getColliderHandle() { return 'gc2-handle'; },
    syncFromPhysics() {},
    destroy() { this.destroyed = true; },
    destroyed: false,
  };

  let fb2Visible = false;
  const fakeFeedback2 = {
    show() { fb2Visible = true; },
    updatePosition() {},
    clear() { fb2Visible = false; },
    isVisible() { return fb2Visible; },
    getCurrentAsset() { return null; },
    destroy() {},
  };

  const game2 = new MarbleDropGame({
    renderer: fakeRenderer,
    physics: null,
    textureCache: fakeTextureCache,
    visualTextureCache: fakeVisualTextureCache,
    assetService: fakeAssets,
    level: LEVEL_1,
    clock: fakeClock2,
    feedbackService: fakeFeedback2,
  });

  await game2.init();
  game2.start();

  game2.activeGacoan = fakeGacoan2;
  game2.session.activeGacoan = fakeGacoan2;
  game2.session.state = GAMEPLAY_STATE.FALLING;
  game2.session.opsUsed = 1;
  game2.session.currentValue = 99;
  game2.registry.register('gc2-handle', { type: 'gacoan', entity: fakeGacoan2 });

  // Goal collision: 99 - 6 = 93
  const fakeGoal = { value: 6, operator: '-' };
  // Transition to RESOLVING before resolving goal
  game2.session.beginResolve();
  const goalResult = game2.resolver.resolveOperationHit({
    operator: fakeGoal.operator,
    operand: fakeGoal.value,
    isGoal: true,
  });

  assert.ok(goalResult.ok);
  assert.equal(goalResult.nextValue, 93);
  assert.equal(goalResult.postHoldAction, 'CLEANUP');
  assert.equal(fakeGoal.value, 6, 'goal value must remain immutable');

  game2._startHold(goalResult);

  assert.equal(game2.session.getState(), GAMEPLAY_STATE.HOLDING);
  assert.ok(g2Frozen, 'gacoan frozen for goal hold');
  assert.ok(fb2Visible, 'feedback visible for goal hold');

  // Before hold expires — gacoan still exists
  fakeClock2.advance(COLLISION_FEEDBACK_MS - 1);
  game2.update(0);
  assert.equal(game2.session.getState(), GAMEPLAY_STATE.HOLDING, 'still HOLDING before expiry');

  // At hold expiry — gacoan cleaned up
  fakeClock2.advance(1);
  game2.update(0);

  assert.ok(
    game2.session.getState() === GAMEPLAY_STATE.READY ||
    game2.session.getState() === GAMEPLAY_STATE.SUMMARY,
    'state should be READY or SUMMARY after goal hold'
  );
  assert.equal(game2.activeGacoan, null, 'active gacoan should be null after goal cleanup');
  assert.equal(fb2Visible, false, 'feedback hidden after goal hold');
  assert.equal(fakeGoal.value, 6, 'goal value still immutable after hold');

  game2.destroy();

  console.log('PASS: hold-lifecycle.test.mjs passed all assertions.');
}

runHoldLifecycleTests().catch((err) => {
  console.error('FAIL: hold-lifecycle.test.mjs:', err);
  process.exit(1);
});
