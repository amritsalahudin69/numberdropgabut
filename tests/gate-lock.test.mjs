import assert from 'node:assert/strict';
import { MarbleDropGame } from '../src/game/MarbleDropGame.js';
import { LEVEL_1 } from '../src/config/levels/level1.js';
import { FakeClock } from '../src/core/Clock.js';

/**
 * Behavioral test: gate lock prevents duplicate arithmetic while still overlapping
 */

async function runGateLockTests() {
  console.log('Running gate-lock.test.mjs...');

  const fakeClock = new FakeClock(0);

  const fakeTextureCache = { get(v){ return { id: `tex-${v}` }; }, has(){ return true; } };
  const fakeVisualTextureCache = { get(key){ return { _isFakeTexture: true, width: 800, height: 600 }; }, has(){ return true; }, destroy(){} };
  const fakeAssets = { getFeedbackAsset(){ return { type: 'png', url: '/assets/numbers/99.png' }; }, getStaticUrl(v){ return `/assets/numbers/${v}.png`; } };
  const fakeFeedback = { show(){}, updatePosition(){}, clear(){}, isVisible(){ return false; }, destroy(){} };
  const fakeStage = { children: [], addChild(c){ this.children.push(c); c.parent = this; }, addChildAt(c, i){ this.children.splice(i, 0, c); c.parent = this; }, removeChild(c){ const idx = this.children.indexOf(c); if (idx >= 0) this.children.splice(idx, 1); } };
  const fakeRenderer = { getStage(){ return fakeStage; }, getCanvas(){ return null; }, worldToClient(){ return { clientX:100, clientY:100 }; } };

  const game = new MarbleDropGame({ renderer: fakeRenderer, physics: null, textureCache: fakeTextureCache, visualTextureCache: fakeVisualTextureCache, assetService: fakeAssets, level: LEVEL_1, clock: fakeClock, feedbackService: fakeFeedback });
  await game.init();
  game.start();

  // create gate-like entity and fake gacoan overlapping it
  const gate = game.gates[0];
  const gcoVal = game.session.getCurrentValue();

  // In headless test (no physics), gate colliders are not created. Register fake gate collider handles for testing.
  const gateHandle = 'fake-gate-handle-1';
  game.registry.register(gateHandle, { type: 'gate', id: gate.id, entity: gate, operator: gate.operator, operand: gate.operand });

  function createFakeGacoan({ handle, initialValue, getPosition }) {
    let currentValue = initialValue;
    let frozen = false;
    let destroyed = false;

    return {
      get value() { return currentValue; },
      set value(v) { currentValue = v; },
      setValue(v) { currentValue = v; },
      getPosition,
      getColliderHandle() { return handle; },
      freeze() { frozen = true; },
      unfreeze() { frozen = false; },
      isFrozen() { return frozen; },
      get destroyed() { return destroyed; },
      destroy() { destroyed = true; },
    };
  }

  const fakeG = createFakeGacoan({
    handle: 'fake-handle-1',
    initialValue: gcoVal,
    getPosition: () => ({ x: gate.container.x, y: gate.container.y }),
  });

  // Register gacoan collider
  game.registry.register(fakeG.getColliderHandle(), { type: 'gacoan', entity: fakeG });
  game.activeGacoan = fakeG;
  game.session.beginDrop(fakeG);

  // Simulate Rapier firing a collision-start event via production collision path
  game.eventQueue = { drainCollisionEvents: (cb) => { cb(fakeG.getColliderHandle(), gateHandle, true); } };

  console.log('TEST: processing first collision via processCollisionEvents');
  // First event -> should process and mark gate consumed
  game.processCollisionEvents();
  const valAfter = game.session.getCurrentValue();
  console.log('TEST: after first processCollisionEvents', { valAfter });
  assert.ok(valAfter < gcoVal, 'expected value decreased after first gate');
  const gateId = gate.id || (game.registry.get(gateHandle) && game.registry.get(gateHandle).id);
  assert.ok(game.consumedGateIds.has(gateId), 'gate should be marked consumed');

  console.log('TEST: invoking duplicate processCollisionEvents - should be ignored');
  // While still overlapping and holding, duplicate event should be ignored
  game.processCollisionEvents();
  console.log('TEST: after duplicate processCollisionEvents', { val: game.session.getCurrentValue() });
  assert.equal(game.session.getCurrentValue(), valAfter, 'duplicate same-gate event should not change value');

  console.log('TEST: simulating physical separation and calling update');
  // Now simulate physical separation: move gacoan position away from gate
  fakeG.getPosition = () => ({ x: gate.container.x + 1000, y: gate.container.y + 1000 });
  // Call update (should not clear consumedGateIds)
  game.update(0);
  console.log('TEST: after update, consumedGateIds size', game.consumedGateIds.size);
  assert.ok(game.consumedGateIds.has(gateId), 'consumedGateIds must persist across physical separation');

  console.log('TEST: advancing clock to expire hold');
  // Expire hold by advancing clock and updating so session returns to FALLING
  fakeClock.advance(5000);
  game.update(0);
  // Now session should be FALLING again
  const st = game.session.getState();
  if (st !== 'FALLING') {
    throw new Error(`Expected session to be FALLING after hold expiry, got ${st}`);
  }

  console.log('TEST: processing collision after hold expiry (same gate) - should still be ignored');
  // Same gate event after hold expiry should still be ignored
  game.processCollisionEvents();
  console.log('TEST: after processing same-gate post-hold', { val: game.session.getCurrentValue() });
  assert.equal(game.session.getCurrentValue(), valAfter, 'same gate after hold should still be ignored');

  console.log('TEST: processing different gate');
  // Different gate should operate
  const gateB = game.gates[1];
  const gateBHandle = 'fake-gate-handle-2';
  game.registry.register(gateBHandle, { type: 'gate', id: gateB.id, entity: gateB, operator: gateB.operator, operand: gateB.operand });
  console.log('TEST: registry keys before processing', [...game.registry.registry.keys()]);
  game.eventQueue = { drainCollisionEvents: (cb) => { cb(fakeG.getColliderHandle(), gateBHandle, true); } };
  game.processCollisionEvents();
  console.log('TEST: registry keys after processing', [...game.registry.registry.keys()]);
  assert.equal(game.session.getCurrentValue(), valAfter - gateB.operand, 'different gate should apply operation');

  // Cleanup active gacoan to end lifecycle and clear consumed set
  game.session.beginCleanup();
  game.cleanupActiveGacoan();
  assert.equal(game.consumedGateIds.size, 0, 'consumedGateIds should be cleared after cleanup');

  // New gacoan drop should see gate available again
  const fakeG2 = createFakeGacoan({
    handle: 'fake-handle-2',
    initialValue: game.session.getCurrentValue(),
    getPosition: () => ({ x: gate.container.x, y: gate.container.y }),
  });
  game.registry.register(fakeG2.getColliderHandle(), { type: 'gacoan', entity: fakeG2 });
  game.activeGacoan = fakeG2;
  game.session.beginDrop(fakeG2);

  game.eventQueue = { drainCollisionEvents: (cb) => { cb(fakeG2.getColliderHandle(), gateHandle, true); } };
  game.processCollisionEvents();
  assert.equal(game.session.getCurrentValue(), valAfter - gateB.operand - gate.operand, 'new gacoan should be able to use Gate A again');

  console.log('PASS: gate-lock.test.mjs passed all assertions.');
}

runGateLockTests().catch((err)=>{ console.error('FAIL: gate-lock.test.mjs failed:', err); process.exit(1); });
