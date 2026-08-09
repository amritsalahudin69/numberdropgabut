import assert from 'node:assert/strict';
import { MarbleDropSession, GAMEPLAY_STATE } from '../src/game/MarbleDropSession.js';

function runSessionTests() {
  console.log('Running session.test.mjs...');

  const mockLevel = {
    id: 'test-level',
    startingValue: 100,
    maxOps: 6,
  };

  // 1. BOOT / creation
  const session = new MarbleDropSession();
  assert.equal(session.getState(), GAMEPLAY_STATE.BOOT);

  // 2. start -> READY
  session.start(mockLevel);
  assert.equal(session.getState(), GAMEPLAY_STATE.READY);
  assert.equal(session.getCurrentValue(), 100);
  assert.equal(session.getOpsUsed(), 0);
  assert.equal(session.getOpsRemaining(), 6);

  const initialSessionId = session.sessionId;
  assert.ok(initialSessionId.startsWith('session-'));

  // 3. READY -> beginDrop -> FALLING
  const mockGacoan1 = { id: 'gacoan-1', value: 100 };
  session.beginDrop(mockGacoan1);
  assert.equal(session.getState(), GAMEPLAY_STATE.FALLING);
  assert.equal(session.getActiveGacoan(), mockGacoan1);
  assert.equal(session.getOpsUsed(), 1);

  // 4. Second simultaneous gacoan rejected
  const mockGacoan2 = { id: 'gacoan-2', value: 100 };
  assert.throws(() => {
    session.beginDrop(mockGacoan2);
  }, /Cannot begin drop from state FALLING/);

  // 5. FALLING -> beginResolve -> RESOLVING
  session.beginResolve();
  assert.equal(session.getState(), GAMEPLAY_STATE.RESOLVING);

  // 6. RESOLVING -> beginHold -> HOLDING (gate)
  session.beginHold({ durationMs: 5000, postHoldAction: 'RESUME_FALL', startNowMs: 0 });
  assert.equal(session.getState(), GAMEPLAY_STATE.HOLDING);
  const holdCtx = session.getHoldContext();
  assert.ok(holdCtx !== null, 'getHoldContext must return context while HOLDING');
  assert.equal(holdCtx.postHoldAction, 'RESUME_FALL');

  // 7. HOLDING -> finishGateHold -> FALLING
  session.finishGateHold();
  assert.equal(session.getState(), GAMEPLAY_STATE.FALLING);

  // 8. FALLING -> RESOLVING -> HOLDING (goal) -> CLEANUP -> READY
  session.beginResolve();
  session.beginHold({ durationMs: 5000, postHoldAction: 'CLEANUP', startNowMs: 0 });
  assert.equal(session.getState(), GAMEPLAY_STATE.HOLDING);

  session.finishGoalHold();
  assert.equal(session.getState(), GAMEPLAY_STATE.CLEANUP);

  session.finishCleanup();
  assert.equal(session.getState(), GAMEPLAY_STATE.READY);
  assert.equal(session.getActiveGacoan(), null);

  // 9. isHoldExpired works correctly
  const s2 = new MarbleDropSession();
  s2.start(mockLevel);
  const g = { id: 'g', value: 100 };
  s2.beginDrop(g);
  s2.beginResolve();
  s2.beginHold({ durationMs: 5000, postHoldAction: 'RESUME_FALL', startNowMs: 1000 });
  assert.equal(s2.isHoldExpired(5999), false, 'hold not expired at 5999ms');
  assert.equal(s2.isHoldExpired(6000), true, 'hold expired at 6000ms (1000+5000)');

  // 10. Invalid transition throws
  assert.throws(() => {
    session.transitionTo(GAMEPLAY_STATE.RESOLVING); // Invalid from READY directly
  }, /Invalid session state transition/);

  // 11. Reset produces fresh sessionId
  session.reset(mockLevel);
  assert.equal(session.getState(), GAMEPLAY_STATE.READY);
  assert.notEqual(session.sessionId, initialSessionId);
  assert.equal(session.getCurrentValue(), 100);
  assert.equal(session.getOpsUsed(), 0);
  assert.equal(session.getHoldContext(), null, 'hold context must be null after reset');

  console.log('PASS: session.test.mjs passed all assertions.');
}

runSessionTests();
