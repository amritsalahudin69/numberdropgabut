import { strict as assert } from 'assert';
import { RunRecorder } from '../src/systems/RunRecorder.js';

function runRunRecorderTests() {
  console.log('Running run-recorder.test.mjs...');

  // Test 1: getSnapshot creates new arrays
  {
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

    const snapshot1 = recorder.getSnapshot();
    const snapshot2 = recorder.getSnapshot();

    assert.notStrictEqual(snapshot1.operations, snapshot2.operations, 'Should return different array instances');
    assert.notStrictEqual(snapshot1.collisions, snapshot2.collisions);
    assert.notStrictEqual(snapshot1.evolutions, snapshot2.evolutions);
    assert.strictEqual(snapshot1.operations.length, snapshot2.operations.length);
    assert.strictEqual(snapshot1.operations[0].source, snapshot2.operations[0].source);
  }

  // Test 2: Mutations to returned array don't affect internal state
  {
    const recorder = new RunRecorder();
    recorder.recordCollision({
      type: 'peg',
      entityId: 'peg-1',
      accepted: true,
      reason: 'physics',
      timestampMs: 1000,
    });

    const snapshot = recorder.getSnapshot();
    const originalLength = snapshot.collisions.length;

    snapshot.collisions.push({
      type: 'fake',
      entityId: 'fake-1',
      accepted: false,
      reason: 'fake',
      timestampMs: 2000,
    });

    assert.strictEqual(recorder.collisions.length, originalLength, 'Internal state should be unchanged');
    assert.strictEqual(recorder.getSnapshot().collisions.length, originalLength);
  }

  // Test 3: Defensive copies on every call
  {
    const recorder = new RunRecorder();
    for (let i = 0; i < 5; i++) {
      recorder.recordOperation({
        source: 'gate',
        sourceId: `gate-${i}`,
        operator: '+',
        operand: i,
        previousValue: i * 10,
        nextValue: i * 11,
        timestampMs: 1000 + i * 100,
      });
    }

    const snap1 = recorder.getSnapshot();
    const snap2 = recorder.getSnapshot();

    snap1.operations[0].source = 'MUTATED';
    assert.strictEqual(snap2.operations[0].source, 'gate', 'Second snapshot should be unaffected');
    assert.strictEqual(recorder.operations[0].source, 'gate', 'Internal state should be unaffected');
  }

  // Test 4: clear() idempotent
  {
    const recorder = new RunRecorder();
    recorder.recordCollision({
      type: 'gate',
      entityId: 'gate-1',
      accepted: true,
      reason: 'hit',
      timestampMs: 1000,
    });

    assert.strictEqual(recorder.collisions.length, 1);
    recorder.clear();
    assert.strictEqual(recorder.collisions.length, 0);

    recorder.clear();
    assert.strictEqual(recorder.collisions.length, 0, 'Second clear should not fail');
  }

  // Test 5: destroy() idempotent
  {
    const recorder = new RunRecorder();
    recorder.recordOperation({
      source: 'goal',
      sourceId: 'goal-1',
      operator: '+',
      operand: 50,
      previousValue: 100,
      nextValue: 150,
      timestampMs: 1000,
    });

    assert.strictEqual(recorder.operations.length, 1);
    recorder.destroy();
    assert.strictEqual(recorder.operations.length, 0);

    recorder.destroy();
    assert.strictEqual(recorder.operations.length, 0, 'Second destroy should not fail');
  }

  // Test 6: Sequencers reset on clear
  {
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
      type: 'peg',
      entityId: 'peg-1',
      accepted: true,
      reason: 'physics',
      timestampMs: 1000,
    });

    assert.strictEqual(recorder.operations[0].seq, 1);
    assert.strictEqual(recorder.collisions[0].seq, 1);

    recorder.clear();

    recorder.recordOperation({
      source: 'gate',
      sourceId: 'gate-2',
      operator: '-',
      operand: 3,
      previousValue: 15,
      nextValue: 12,
      timestampMs: 2000,
    });

    assert.strictEqual(recorder.operations[0].seq, 1, 'Sequencer should reset');
  }

  // Test 7: getLastOperation
  {
    const recorder = new RunRecorder();
    assert.strictEqual(recorder.getLastOperation(), null);

    recorder.recordOperation({
      source: 'gate',
      sourceId: 'gate-1',
      operator: '+',
      operand: 5,
      previousValue: 10,
      nextValue: 15,
      timestampMs: 1000,
    });

    assert.notStrictEqual(recorder.getLastOperation(), null);
    assert.strictEqual(recorder.getLastOperation().sourceId, 'gate-1');

    recorder.recordOperation({
      source: 'gate',
      sourceId: 'gate-2',
      operator: '-',
      operand: 3,
      previousValue: 15,
      nextValue: 12,
      timestampMs: 2000,
    });

    assert.strictEqual(recorder.getLastOperation().sourceId, 'gate-2');
  }

  // Test 8: Separate sequencers for different record types
  {
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
      type: 'peg',
      entityId: 'peg-1',
      accepted: true,
      reason: 'physics',
      timestampMs: 1000,
    });
    recorder.recordEvolution({
      previousValue: 10,
      nextValue: 15,
      source: 'gate',
      sourceId: 'gate-1',
      timestampMs: 1000,
    });

    assert.strictEqual(recorder.operations[0].seq, 1);
    assert.strictEqual(recorder.collisions[0].seq, 1);
    assert.strictEqual(recorder.evolutions[0].seq, 1);
  }

  console.log('PASS: run-recorder.test.mjs passed all assertions.');
}

runRunRecorderTests();

