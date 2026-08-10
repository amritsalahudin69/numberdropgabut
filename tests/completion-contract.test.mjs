import { MarbleDropSession, GAMEPLAY_STATE } from '../src/game/MarbleDropSession.js';
import { LEVEL_1 } from '../src/config/levels/level1.js';

console.log('=== COMPLETION CONTRACT TEST ===\n');

// Test 1: Regular operation without completion
const session1 = new MarbleDropSession();
session1.start(LEVEL_1);
console.log(`✓ Session created in state: ${session1.getState()}`);

if (session1.isCompletionRequested()) {
  throw new Error('FAIL: completion should not be requested initially');
}
console.log(`✓ No completion requested initially`);

// Test 2: Target reached → completion success
const session2 = new MarbleDropSession();
session2.start(LEVEL_1);
session2.currentValue = LEVEL_1.targetValue || 50; // Assume target is set
session2.requestCompletion({ reason: 'target_reached', success: true });

if (!session2.isCompletionRequested()) {
  throw new Error('FAIL: completion should be requested');
}
if (session2.getCompletionReason() !== 'target_reached') {
  throw new Error('FAIL: completion reason mismatch');
}
if (session2.isCompletionSuccess() !== true) {
  throw new Error('FAIL: completion should be success');
}
console.log(`✓ Target reached → success true, reason target_reached`);

// Test 3: Max ops exhausted → completion failure
const session3 = new MarbleDropSession();
session3.start(LEVEL_1);
session3.opsUsed = session3.maxOps;
session3.requestCompletion({ reason: 'max_ops_exhausted', success: false });

if (!session3.isCompletionRequested()) {
  throw new Error('FAIL: completion should be requested');
}
if (session3.getCompletionReason() !== 'max_ops_exhausted') {
  throw new Error('FAIL: completion reason mismatch');
}
if (session3.isCompletionSuccess() !== false) {
  throw new Error('FAIL: completion should be failure');
}
console.log(`✓ Max ops exhausted → success false, reason max_ops_exhausted`);

// Test 4: Target precedence (target reached on final op)
const session4 = new MarbleDropSession();
session4.start(LEVEL_1);
session4.opsUsed = session4.maxOps - 1;
session4.currentValue = (LEVEL_1.targetValue || 50) + 1;
session4.requestCompletion({ reason: 'target_reached', success: true });

if (session4.getCompletionReason() !== 'target_reached') {
  throw new Error('FAIL: target should win on final op');
}
if (!session4.isCompletionSuccess()) {
  throw new Error('FAIL: target success should be true');
}
console.log(`✓ Target reached on final op → target wins`);

// Test 5: Idempotent request
const session5 = new MarbleDropSession();
session5.start(LEVEL_1);
session5.requestCompletion({ reason: 'first_call', success: true });
const firstReason = session5.getCompletionReason();
session5.requestCompletion({ reason: 'second_call', success: false });
const secondReason = session5.getCompletionReason();

if (firstReason !== secondReason) {
  throw new Error('FAIL: completion request not idempotent');
}
if (firstReason !== 'first_call') {
  throw new Error('FAIL: first reason should persist');
}
console.log(`✓ requestCompletion is idempotent`);

// Test 6: HOLDING preserved after completion request
const session6 = new MarbleDropSession();
session6.start(LEVEL_1);
session6.transitionTo(GAMEPLAY_STATE.FALLING);
session6.beginDrop({ value: 100 });
if (session6.getState() !== GAMEPLAY_STATE.FALLING) {
  throw new Error('FAIL: not in FALLING');
}
session6.beginResolve();
if (session6.getState() !== GAMEPLAY_STATE.RESOLVING) {
  throw new Error('FAIL: not in RESOLVING');
}

// Trigger completion while resolving
session6.requestCompletion({ reason: 'test', success: true });

// Transition to HOLDING
session6.beginHold({ durationMs: 5000, postHoldAction: 'RESUME_FALL' });
if (session6.getState() !== GAMEPLAY_STATE.HOLDING) {
  throw new Error('FAIL: not in HOLDING after hold request');
}

// Verify completion still present
if (!session6.isCompletionRequested()) {
  throw new Error('FAIL: completion cleared during HOLDING');
}
console.log(`✓ HOLDING preserved after completion request`);

// Test 7: Cleanup before SUMMARY
const session7 = new MarbleDropSession();
session7.start(LEVEL_1);
session7.opsUsed = session7.maxOps; // Trigger summary on cleanup
session7.requestCompletion({ reason: 'max_ops_exhausted', success: false });
session7.activeGacoan = { value: 100 }; // Mock active gacoan
session7.finishCleanup();

if (session7.getState() !== GAMEPLAY_STATE.SUMMARY) {
  throw new Error('FAIL: not in SUMMARY after maxOps cleanup');
}
if (session7.activeGacoan !== null) {
  throw new Error('FAIL: activeGacoan not nulled');
}
if (!session7.isCompletionRequested()) {
  throw new Error('FAIL: completion lost during cleanup');
}
console.log(`✓ Cleanup nulls activeGacoan before SUMMARY, completion preserved`);

console.log('\n=== ALL COMPLETION CONTRACT TESTS PASSED ===');
