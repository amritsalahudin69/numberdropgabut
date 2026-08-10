import { MarbleDropSession, GAMEPLAY_STATE } from '../src/game/MarbleDropSession.js';
import { LEVEL_1 } from '../src/config/levels/level1.js';
import { RunRecorder } from '../src/systems/RunRecorder.js';

console.log('=== FINAL LIFECYCLE TEST ===\n');

let cyclesPassed = 0;
const maxCycles = 20;

for (let cycle = 1; cycle <= maxCycles; cycle++) {
  // Create fresh instances for each cycle
  const session = new MarbleDropSession();
  const runRecorder = new RunRecorder();

  // Verify initial state
  if (session.getState() !== GAMEPLAY_STATE.BOOT) {
    throw new Error(`Cycle ${cycle}: FAIL: session not in BOOT state`);
  }

  // Start
  session.start(LEVEL_1);
  if (session.getState() !== GAMEPLAY_STATE.READY) {
    throw new Error(`Cycle ${cycle}: FAIL: session not in READY after start`);
  }

  // Verify recorder is empty
  if (runRecorder.operations.length !== 0) {
    throw new Error(`Cycle ${cycle}: FAIL: recorder not empty at start`);
  }

  // Simulate one operation
  session.opsUsed = 1;
  runRecorder.recordOperation({
    source: 'gate',
    sourceId: 'gate-1',
    operator: '-',
    operand: 1,
    previousValue: 100,
    nextValue: 99,
    timestampMs: Date.now(),
  });

  if (runRecorder.operations.length !== 1) {
    throw new Error(`Cycle ${cycle}: FAIL: operation not recorded`);
  }

  // Test completion contract
  session.requestCompletion({ reason: 'test_completion', success: true });
  if (!session.isCompletionRequested()) {
    throw new Error(`Cycle ${cycle}: FAIL: completion not requested`);
  }
  if (session.getCompletionReason() !== 'test_completion') {
    throw new Error(`Cycle ${cycle}: FAIL: completion reason mismatch`);
  }
  if (session.isCompletionSuccess() !== true) {
    throw new Error(`Cycle ${cycle}: FAIL: completion success mismatch`);
  }

  // Completion is idempotent
  session.requestCompletion({ reason: 'should_ignore', success: false });
  if (session.getCompletionReason() !== 'test_completion') {
    throw new Error(`Cycle ${cycle}: FAIL: completion not idempotent`);
  }

  // Transition to SUMMARY
  session.transitionTo(GAMEPLAY_STATE.SUMMARY);
  if (session.getState() !== GAMEPLAY_STATE.SUMMARY) {
    throw new Error(`Cycle ${cycle}: FAIL: session not in SUMMARY`);
  }

  // Test recorder snapshot
  const snapshot = runRecorder.getSnapshot();
  if (snapshot.operations.length !== 1) {
    throw new Error(`Cycle ${cycle}: FAIL: snapshot operations mismatch`);
  }

  // Mutate snapshot
  snapshot.operations.push({ seq: 99 });
  if (runRecorder.operations.length !== 1) {
    throw new Error(`Cycle ${cycle}: FAIL: snapshot mutation leaked`);
  }

  // Clear for next cycle
  runRecorder.clear();
  if (runRecorder.operations.length !== 0) {
    throw new Error(`Cycle ${cycle}: FAIL: recorder not cleared`);
  }

  session.destroy();
  if (session.getState() !== GAMEPLAY_STATE.DESTROYED) {
    throw new Error(`Cycle ${cycle}: FAIL: session not DESTROYED`);
  }

  cyclesPassed++;
  if (cycle % 5 === 0) {
    console.log(`✓ Cycles 1-${cycle} passed`);
  }
}

console.log(`✓ All ${cyclesPassed} complete/restart cycles passed`);
console.log('\n=== FINAL LIFECYCLE TEST PASSED ===');
