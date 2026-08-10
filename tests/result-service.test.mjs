import { strict as assert } from 'assert';
import { ResultService } from '../src/systems/ResultService.js';
import { RunRecorder } from '../src/systems/RunRecorder.js';
import { MarbleDropSession } from '../src/game/MarbleDropSession.js';
import { LEVEL_1 } from '../src/config/levels/level1.js';

function runResultServiceTests() {
  console.log('Running result-service.test.mjs...');

  // Test 1: Returns plain object with schemaVersion
  {
    const session = new MarbleDropSession();
    session.start(LEVEL_1);
    const recorder = new RunRecorder();

    const result = ResultService.buildResult({
      level: LEVEL_1,
      session,
      runRecorder: recorder,
      startedAtMs: 1000,
      completedAtMs: 2000,
    });

    assert.strictEqual(typeof result, 'object');
    assert.strictEqual(result.schemaVersion, 1);
    assert.strictEqual(result.game, 'marbledrop');
  }

  // Test 2: Captures level and session values
  {
    const session = new MarbleDropSession();
    session.start(LEVEL_1);
    session.currentValue = 42;
    session.opsUsed = 3;
    const recorder = new RunRecorder();

    const result = ResultService.buildResult({
      level: LEVEL_1,
      session,
      runRecorder: recorder,
      startedAtMs: 1000,
      completedAtMs: 2000,
    });

    assert.strictEqual(result.levelId, LEVEL_1.id);
    assert.strictEqual(result.startingValue, LEVEL_1.startingValue);
    assert.strictEqual(result.finalValue, 42);
    assert.strictEqual(result.opsUsed, 3);
    assert.strictEqual(result.maxOps, session.maxOps);
  }

  // Test 3: Handles targetValue from level.targetValue
  {
    const session = new MarbleDropSession();
    session.start(LEVEL_1);
    const recorder = new RunRecorder();
    const customLevel = { ...LEVEL_1, targetValue: 100 };

    const result = ResultService.buildResult({
      level: customLevel,
      session,
      runRecorder: recorder,
      startedAtMs: 1000,
      completedAtMs: 2000,
    });

    assert.strictEqual(result.targetValue, 100);
  }

  // Test 4: Fallback to level.goals[0].value
  {
    const session = new MarbleDropSession();
    session.start(LEVEL_1);
    const recorder = new RunRecorder();
    const customLevel = { 
      ...LEVEL_1, 
      targetValue: undefined,
      goals: [{ value: 75 }]
    };

    const result = ResultService.buildResult({
      level: customLevel,
      session,
      runRecorder: recorder,
      startedAtMs: 1000,
      completedAtMs: 2000,
    });

    assert.strictEqual(result.targetValue, 75);
  }

  // Test 5: Includes operations/collisions/evolutions
  {
    const session = new MarbleDropSession();
    session.start(LEVEL_1);
    const recorder = new RunRecorder();

    recorder.recordOperation({
      source: 'gate',
      sourceId: 'gate-1',
      operator: '+',
      operand: 5,
      previousValue: 10,
      nextValue: 15,
      timestampMs: 1000,
    });
    recorder.recordCollision({
      type: 'gate',
      entityId: 'gate-1',
      accepted: true,
      reason: 'hit',
      timestampMs: 1000,
    });
    recorder.recordEvolution({
      previousValue: 10,
      nextValue: 15,
      source: 'gate',
      sourceId: 'gate-1',
      timestampMs: 1000,
    });

    const result = ResultService.buildResult({
      level: LEVEL_1,
      session,
      runRecorder: recorder,
      startedAtMs: 1000,
      completedAtMs: 2000,
    });

    assert.strictEqual(result.operations.length, 1);
    assert.strictEqual(result.collisions.length, 1);
    assert.strictEqual(result.evolutions.length, 1);
    assert.strictEqual(result.operations[0].operator, '+');
    assert.strictEqual(result.collisions[0].type, 'gate');
    assert.strictEqual(result.evolutions[0].source, 'gate');
  }

  // Test 6: Defensive copies of arrays
  {
    const session = new MarbleDropSession();
    session.start(LEVEL_1);
    const recorder = new RunRecorder();

    recorder.recordOperation({
      source: 'gate',
      sourceId: 'gate-1',
      operator: '+',
      operand: 5,
      previousValue: 10,
      nextValue: 15,
      timestampMs: 1000,
    });

    const result = ResultService.buildResult({
      level: LEVEL_1,
      session,
      runRecorder: recorder,
      startedAtMs: 1000,
      completedAtMs: 2000,
    });

    const originalOpsCount = result.operations.length;

    result.operations.push({
      source: 'fake',
      sourceId: 'fake-1',
      operator: '*',
      operand: 99,
      previousValue: 1,
      nextValue: 99,
      timestampMs: 3000,
    });

    assert.strictEqual(recorder.operations.length, 1, 'Recorder should be unaffected');

    const result2 = ResultService.buildResult({
      level: LEVEL_1,
      session,
      runRecorder: recorder,
      startedAtMs: 1000,
      completedAtMs: 2000,
    });
    assert.strictEqual(result2.operations.length, originalOpsCount);
  }

  // Test 7: Handles null runRecorder
  {
    const session = new MarbleDropSession();
    session.start(LEVEL_1);

    const result = ResultService.buildResult({
      level: LEVEL_1,
      session,
      runRecorder: null,
      startedAtMs: 1000,
      completedAtMs: 2000,
    });

    assert.deepStrictEqual(result.operations, []);
    assert.deepStrictEqual(result.collisions, []);
    assert.deepStrictEqual(result.evolutions, []);
  }

  // Test 8: Includes completion status and reason
  {
    const session = new MarbleDropSession();
    session.start(LEVEL_1);
    session.requestCompletion({ reason: 'target_reached', success: true });
    const recorder = new RunRecorder();

    const result = ResultService.buildResult({
      level: LEVEL_1,
      session,
      runRecorder: recorder,
      startedAtMs: 1000,
      completedAtMs: 2000,
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.completionReason, 'target_reached');
  }

  // Test 9: Passes through startedAt and completedAt
  {
    const session = new MarbleDropSession();
    session.start(LEVEL_1);
    const recorder = new RunRecorder();

    const result = ResultService.buildResult({
      level: LEVEL_1,
      session,
      runRecorder: recorder,
      startedAtMs: 1000,
      completedAtMs: 2000,
    });

    assert.strictEqual(result.startedAt, 1000);
    assert.strictEqual(result.completedAt, 2000);
  }

  // Test 10: Calculates opsRemaining correctly
  {
    const session = new MarbleDropSession();
    session.start(LEVEL_1);
    session.opsUsed = 2;
    session.maxOps = 6;
    const recorder = new RunRecorder();

    const result = ResultService.buildResult({
      level: LEVEL_1,
      session,
      runRecorder: recorder,
      startedAtMs: 1000,
      completedAtMs: 2000,
    });

    assert.strictEqual(result.opsRemaining, 4);
  }

  // Test 11: Produces canonical payload structure
  {
    const session = new MarbleDropSession();
    session.start(LEVEL_1);
    const recorder = new RunRecorder();

    const result = ResultService.buildResult({
      level: LEVEL_1,
      session,
      runRecorder: recorder,
      startedAtMs: 1000,
      completedAtMs: 2000,
    });

    const expectedKeys = [
      'schemaVersion',
      'game',
      'levelId',
      'startingValue',
      'targetValue',
      'finalValue',
      'maxOps',
      'opsUsed',
      'opsRemaining',
      'success',
      'completionReason',
      'operations',
      'collisions',
      'evolutions',
      'startedAt',
      'completedAt',
    ];

    for (const key of expectedKeys) {
      assert.strictEqual(key in result, true, `Missing key: ${key}`);
    }
  }

  console.log('PASS: result-service.test.mjs passed all assertions.');
}

runResultServiceTests();

