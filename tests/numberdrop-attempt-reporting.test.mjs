import assert from 'node:assert/strict';
import { LEVEL_1 } from '../src/config/levels/level1.js';
import { MarbleDropSession } from '../src/game/MarbleDropSession.js';
import { ResultService } from '../src/systems/ResultService.js';
import { RunRecorder } from '../src/systems/RunRecorder.js';

const recorder = new RunRecorder();
assert.equal(recorder.recordAttemptEvent('hammer-hit'), false);
const eventCoverage = new RunRecorder();
eventCoverage.beginAttempt({ startValue: 1, startedAtMs: 1 });
for (const type of ['gear-hit', 'moving-block-hit', 'peg-hit']) assert.ok(eventCoverage.recordAttemptEvent(type, { obstacleId: `${type}-coverage` }));
assert.equal(eventCoverage.finishAttempt({ outcome: 'failed', reason: 'non_target_goal', finalValue: 1, completedAtMs: 2 }), true);
assert.equal(recorder.beginAttempt({ startValue: 1, startedAtMs: 10 }).attemptId, 1);
assert.equal(recorder.beginAttempt({ startValue: 2 }), false);

recorder.recordOperation({ source: 'gate', sourceId: 'gate-1', operator: '+', operand: 2, previousValue: 1, nextValue: 3, timestampMs: 11 });
recorder.recordCollision({ type: 'gate', entityId: 'gate-1', accepted: true, reason: 'new', timestampMs: 11 });
recorder.recordEvolution({ previousValue: 1, nextValue: 3, source: 'gate', sourceId: 'gate-1', timestampMs: 11 });
assert.ok(recorder.recordAttemptEvent('hammer-hit', { obstacleId: 'hammer-1', x: 10, y: 20, at: 12 }));
assert.ok(recorder.recordAttemptEvent('goal-hit', { obstacleId: 'goal-1', x: 10, y: 20, at: 12 }));
assert.equal(recorder.finishAttempt({ outcome: 'success', reason: 'target_goal', finalValue: 3, completedAtMs: 20 }), true);
assert.equal(recorder.finishAttempt({ outcome: 'failed', reason: 'duplicate', finalValue: 3 }), false);

assert.equal(recorder.beginAttempt({ startValue: 3, startedAtMs: 21 }).attemptId, 2);
recorder.recordAttemptEvent('hammer-hit', { obstacleId: 'hammer-2', x: 30, y: 40 });
recorder.recordAttemptEvent('out-of-bounds', { x: 2000, y: 1200 });
assert.equal(recorder.finishAttempt({ outcome: 'out_of_play', reason: 'out_of_bounds', finalValue: 3, completedAtMs: 30 }), true);

assert.equal(recorder.beginAttempt({ startValue: 3, startedAtMs: 31 }).attemptId, 3);
recorder.recordAttemptEvent('peg-hit', { obstacleId: 'peg-3', x: 50, y: 60 });
recorder.recordAttemptEvent('moving-block-hit', { obstacleId: 'block-3', x: 70, y: 80 });
recorder.recordAttemptEvent('goal-hit', { obstacleId: 'goal-3', x: 90, y: 100 });
assert.equal(recorder.finishAttempt({ outcome: 'failed', reason: 'non_target_goal', finalValue: 3, completedAtMs: 40 }), true);

assert.equal(recorder.beginAttempt({ startValue: 3, startedAtMs: 41 }).attemptId, 4);
assert.equal(recorder.finishAttempt({ outcome: 'error', reason: 'resolver_error', finalValue: 3, completedAtMs: 50 }), true);

const snapshot = recorder.getSnapshot();
assert.equal(snapshot.attempts.length, 4);
assert.deepEqual(snapshot.attempts[0].operationRange, { start: 0, endExclusive: 1 });
assert.deepEqual(snapshot.attempts[0].collisionRange, { start: 0, endExclusive: 1 });
assert.deepEqual(snapshot.attempts[0].evolutionRange, { start: 0, endExclusive: 1 });
assert.equal(snapshot.attempts[0].events.length, 2);
assert.doesNotThrow(() => JSON.stringify(snapshot));

const session = new MarbleDropSession();
session.start(LEVEL_1);
session.currentValue = 3;
session.opsUsed = 4;
const result = ResultService.buildResult({ level: LEVEL_1, session, runRecorder: recorder, startedAtMs: 1, completedAtMs: 50 });
assert.equal(result.attempts.length, 4);
assert.equal(result.attemptSummary.totalAttempts, 4);
assert.equal(result.attemptSummary.successfulAttempts, 1);
assert.equal(result.attemptSummary.failedAttempts, 1);
assert.equal(result.attemptSummary.outOfPlayAttempts, 1);
assert.equal(result.attemptSummary.errorAttempts, 1);
assert.equal(result.attemptSummary.hammerHits, 2);
assert.equal(result.attemptSummary.gearHits, 0);
assert.equal(result.attemptSummary.movingBlockHits, 1);
assert.equal(result.attemptSummary.pegHits, 1);
assert.equal(result.attemptSummary.attemptsWithHammerHit, 2);
assert.equal(result.attemptSummary.hammerThenSuccess, 1);
assert.equal(result.attemptSummary.hammerThenFailed, 0);
assert.equal(result.attemptSummary.hammerThenOutOfPlay, 1);
assert.doesNotThrow(() => JSON.stringify(result));

recorder.clear();
assert.equal(recorder.attempts.length, 0);
assert.equal(recorder.activeAttempt, null);
assert.equal(recorder.nextAttemptId, 1);
assert.equal(recorder.recordAttemptEvent('peg-hit'), false);

console.log('PASS: numberdrop-attempt-reporting.test.mjs');
