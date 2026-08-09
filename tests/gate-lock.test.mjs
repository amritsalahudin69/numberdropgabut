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
  const fakeAssets = { getFeedbackAsset(){ return { type: 'png', url: '/assets/numbers/99.png' }; }, getStaticUrl(v){ return `/assets/numbers/${v}.png`; } };
  const fakeFeedback = { show(){}, updatePosition(){}, clear(){}, isVisible(){ return false; }, destroy(){} };
  const fakeRenderer = { getStage(){ return { addChild(){} }; }, getCanvas(){ return null; }, worldToClient(){ return { clientX:100, clientY:100 }; } };

  const game = new MarbleDropGame({ renderer: fakeRenderer, physics: null, textureCache: fakeTextureCache, assetService: fakeAssets, level: LEVEL_1, clock: fakeClock, feedbackService: fakeFeedback });
  await game.init();
  game.start();

  // create gate-like entity and fake gacoan overlapping it
  const gate = game.gates[0];
  const gcoVal = game.session.getCurrentValue();

  let gacoanFrozen = false;
  let gacoanValue = gcoVal;
  const fakeG = {
    get value(){ return gacoanValue; },
    set value(v){ gacoanValue = v; },
    setValue(v,t){ gacoanValue = v; },
    getPosition(){ return { x: gate.container.x, y: gate.container.y }; },
    getColliderHandle(){ return 'fake-handle-1'; },
    freeze(){ gacoanFrozen = true; },
    unfreeze(){ gacoanFrozen = false; },
    isFrozen(){ return gacoanFrozen; },
    destroyed: false,
    destroy(){ this.destroyed = true; }
  };

  // Register gacoan collider
  game.registry.register(fakeG.getColliderHandle(), { type: 'gacoan', entity: fakeG });
  game.activeGacoan = fakeG;
  game.session.beginDrop(fakeG);

  // Transition to RESOLVING and resolve first gate hit
  game.session.beginResolve();
  const res1 = game.resolver.resolveOperationHit({ operator: gate.operator, operand: gate.operand, isGoal: false });
  assert.ok(res1.ok);
  // Caller would start hold
  game._startHold(res1);

  const valAfter = game.session.getCurrentValue();

  // Simulate Rapier firing a new collision-start event while still overlapping
  // Expect no duplicate arithmetic since gate is blocked
  const res2 = game.resolver.resolveOperationHit({ operator: gate.operator, operand: gate.operand, isGoal: false });
  assert.equal(game.session.getCurrentValue(), valAfter);

  // Now simulate physical separation: move gacoan position away from gate
  fakeG.getPosition = () => ({ x: gate.container.x + 1000, y: gate.container.y + 1000 });
  // Call update to unblock gates (unblock logic runs regardless of HOLDING)
  game.update(0);

  // After separation, blocked set should be empty
  assert.equal(game.blockedGates.size, 0);

  // Expire hold by advancing clock and updating so session returns to FALLING
  fakeClock.advance(5000);
  game.update(0);
  // Now session should be FALLING again
  const st = game.session.getState();
  if (st !== 'FALLING') {
    throw new Error(`Expected session to be FALLING after hold expiry, got ${st}`);
  }

  // New resolve should be allowed now
  try {
    game.session.beginResolve();
  } catch (e) {
    // if already in RESOLVING, ignore
  }
  const res3 = game.resolver.resolveOperationHit({ operator: gate.operator, operand: gate.operand, isGoal: false });
  assert.ok(res3.ok);

  console.log('PASS: gate-lock.test.mjs passed all assertions.');
}

runGateLockTests().catch((err)=>{ console.error('FAIL: gate-lock.test.mjs failed:', err); process.exit(1); });
