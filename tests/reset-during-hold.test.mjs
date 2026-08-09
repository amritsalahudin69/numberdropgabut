/**
 * reset-during-hold.test.mjs
 * Behavioral test: reset called during HOLDING must cleanly cancel the hold.
 * No stale callbacks. No stale feedback. No stale gacoan.
 */

import assert from 'node:assert/strict';
import { MarbleDropGame } from '../src/game/MarbleDropGame.js';
import { LEVEL_1 } from '../src/config/levels/level1.js';
import { GAMEPLAY_STATE } from '../src/game/MarbleDropSession.js';
import { FakeClock } from '../src/core/Clock.js';
import { COLLISION_FEEDBACK_MS } from '../src/config/constants.js';

async function runResetDuringHoldTests() {
  console.log('Running reset-during-hold.test.mjs...');

  const fakeClock = new FakeClock(0);

  let gacoanDestroyed = false;
  let gacoanFrozen = false;
  let g1Value = 100;

  const fakeGacoan = {
    get value() { return g1Value; },
    set value(v) { g1Value = v; },
    isFrozen() { return gacoanFrozen; },
    freeze() { gacoanFrozen = true; },
    unfreeze() { gacoanFrozen = false; },
    setValue(v) { g1Value = v; },
    getPosition() { return { x: 960, y: 400 }; },
    getColliderHandle() { return 'gc-handle'; },
    syncFromPhysics() {},
    destroy() { gacoanDestroyed = true; gacoanFrozen = false; },
    destroyed: false,
  };

  let fbVisible = false;
  const fakeFeedback = {
    show() { fbVisible = true; },
    updatePosition() {},
    clear() { fbVisible = false; },
    isVisible() { return fbVisible; },
    getCurrentAsset() { return null; },
    destroy() { fbVisible = false; },
  };

  const fakeTextureCache = {
    get(val) { return { id: `tex-${val}` }; },
    has() { return true; },
    destroy() {},
  };

  const fakeAssets = {
    getFeedbackAsset(val) {
      return { type: 'gif', url: `/assets/gif/${val}.gif` };
    },
    getStaticUrl(val) { return `/assets/numbers/${val}.png`; },
  };

  const fakeRenderer = {
    getStage() { return { addChild() {} }; },
    getCanvas() { return null; },
    worldToClient() { return { clientX: 100, clientY: 200 }; },
  };

  const game = new MarbleDropGame({
    renderer: fakeRenderer,
    physics: null,
    textureCache: fakeTextureCache,
    assetService: fakeAssets,
    level: LEVEL_1,
    clock: fakeClock,
    feedbackService: fakeFeedback,
  });

  await game.init();
  game.start();

  // Inject active gacoan directly and simulate drop
  game.activeGacoan = fakeGacoan;
  game.session.activeGacoan = fakeGacoan;
  game.session.state = GAMEPLAY_STATE.FALLING;
  game.session.opsUsed = 1;
  game.session.currentValue = 100;
  game.registry.register('gc-handle', { type: 'gacoan', entity: fakeGacoan });

  // Trigger gate resolution and enter HOLDING
  // Ensure session transitions to RESOLVING before invoking resolver as production requires
  game.session.beginResolve();
  const resolveResult = game.resolver.resolveOperationHit({
    operator: '-',
    operand: 1,
    isGoal: false,
  });
  assert.ok(resolveResult.ok);

  game._startHold(resolveResult);

  assert.equal(game.session.getState(), GAMEPLAY_STATE.HOLDING, 'must be HOLDING before reset');
  assert.ok(fbVisible, 'feedback must be visible before reset');
  assert.ok(gacoanFrozen, 'gacoan must be frozen before reset');

  // RESET during HOLDING
  game.reset();

  // Immediately after reset:
  assert.equal(game.session.getState(), GAMEPLAY_STATE.READY, 'state must be READY immediately after reset');
  assert.equal(fbVisible, false, 'feedback must be cleared after reset');
  assert.equal(game.activeGacoan, null, 'active gacoan must be null after reset');

  // Capture hold context — it must be cleared
  const holdCtx = game.session.getHoldContext();
  assert.equal(holdCtx, null, 'hold context must be null after reset');

  // Advance fake clock far beyond the original hold duration
  fakeClock.advance(COLLISION_FEEDBACK_MS);
  game.update(0);

  assert.equal(game.session.getState(), GAMEPLAY_STATE.READY, 'state must still be READY after clock advance past old hold');
  assert.equal(fbVisible, false, 'feedback must remain hidden');
  assert.equal(game.activeGacoan, null, 'no stale active gacoan');

  // Advance even further
  fakeClock.advance(COLLISION_FEEDBACK_MS * 2);
  game.update(0);

  assert.equal(game.session.getState(), GAMEPLAY_STATE.READY, 'state must remain READY');
  assert.equal(g1Value, 99, 'old gacoan value was committed (99), not rolled back — correct');

  // After reset, currentValue must have been reset to startingValue
  assert.equal(game.session.getCurrentValue(), LEVEL_1.startingValue,
    'session currentValue must be reset to startingValue after reset');

  game.destroy();

  console.log('PASS: reset-during-hold.test.mjs passed all assertions.');
}

runResetDuringHoldTests().catch((err) => {
  console.error('FAIL: reset-during-hold.test.mjs:', err);
  process.exit(1);
});
