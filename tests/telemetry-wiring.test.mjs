import { strict as assert } from 'assert';
import { MarbleDropGame } from '../src/game/MarbleDropGame.js';
import { MarbleDropSession, GAMEPLAY_STATE } from '../src/game/MarbleDropSession.js';
import { RunRecorder } from '../src/systems/RunRecorder.js';
import { LEVEL_1 } from '../src/config/levels/level1.js';

class MockRenderer {
  getCanvas() { return null; }
  getStage() { return null; }
}

class MockPhysics {
  step() {}
  getWorld() { return null; }
  getRapier() { return null; }
}

class MockTextureCache {
  get(value) { return `texture-${value}`; }
}

class MockAssetService {}

class MockClock {
  constructor(initialTime = 0) {
    this.time = initialTime;
  }
  now() {
    return this.time;
  }
  advance(ms) {
    this.time += ms;
  }
}

class MockCollisionEntity {
  constructor(id, handle = 99999) {
    this.id = id;
    this.destroyed = false;
    this._colliderHandle = handle;
    this._frozen = false;
  }
  getColliderHandle() { return this._colliderHandle; }
  destroy() { this.destroyed = true; }
  freeze() { this._frozen = true; }
  unfreeze() { this._frozen = false; }
  isFrozen() { return this._frozen; }
  getPosition() { return { x: 0, y: 0 }; }
}

class MockRegistry {
  constructor() {
    this.data = new Map();
  }
  register(handle, meta) {
    this.data.set(handle, meta);
  }
  unregister(handle) {
    this.data.delete(handle);
  }
  get(handle) {
    return this.data.get(handle);
  }
  clear() {
    this.data.clear();
  }
  size() {
    return this.data.size;
  }
}

class MockCollisionResolver {
  constructor() {
    this.operationHits = [];
  }
  resolveOperationHit({ operator, operand, isGoal }) {
    this.operationHits.push({ operator, operand, isGoal });
    // Return success result
    return {
      ok: true,
      feedbackAsset: 'feedback-asset',
      postHoldAction: isGoal ? 'CLEANUP' : 'RESUME_FALL',
    };
  }
}

function runTelemetryWiringTests() {
  console.log('Running telemetry-wiring.test.mjs...');

  // Test 1: Peg collision only
  {
    const clock = new MockClock(1000);
    const recorder = new RunRecorder();
    
    const game = new MarbleDropGame({
      renderer: new MockRenderer(),
      physics: new MockPhysics(),
      textureCache: new MockTextureCache(),
      assetService: new MockAssetService(),
      level: LEVEL_1,
      clock,
      feedbackService: null,
      soundService: null,
      runRecorder: recorder,
    });

    game.registry = new MockRegistry();
    game.resolver = new MockCollisionResolver();
    
    game.session.transitionTo(GAMEPLAY_STATE.READY);
    game.session.transitionTo(GAMEPLAY_STATE.FALLING);
    
    const gacoan = new MockCollisionEntity('gacoan-1', 1);
    game.activeGacoan = gacoan;
    game.session.activeGacoan = gacoan;
    
    const pegEntity = new MockCollisionEntity('peg-1');
    game.registry.register(1, { type: 'gacoan', entity: gacoan });
    game.registry.register(2, { type: 'peg', entity: pegEntity });

    game.eventQueue = {
      drainCollisionEvents: (fn) => { fn(1, 2, true); }
    };

    const beforeCount = recorder.collisions.length;
    const operationsBefore = recorder.operations.length;
    game.processCollisionEvents();

    assert.strictEqual(recorder.collisions.length, beforeCount + 1, 'Peg collision should be recorded');
    assert.strictEqual(recorder.operations.length, operationsBefore, 'No operation should be recorded for peg');
    assert.strictEqual(recorder.collisions[beforeCount].type, 'peg');
  }

  // Test 2: Gate collision, operation, and evolution on first hit
  {
    const clock = new MockClock(1000);
    const recorder = new RunRecorder();
    
    const game = new MarbleDropGame({
      renderer: new MockRenderer(),
      physics: new MockPhysics(),
      textureCache: new MockTextureCache(),
      assetService: new MockAssetService(),
      level: LEVEL_1,
      clock,
      feedbackService: null,
      soundService: null,
      runRecorder: recorder,
    });

    game.registry = new MockRegistry();
    game.resolver = new MockCollisionResolver();
    
    game.session.transitionTo(GAMEPLAY_STATE.READY);
    game.session.transitionTo(GAMEPLAY_STATE.FALLING);
    game.session.currentValue = 5;
    
    const gacoan = new MockCollisionEntity('gacoan-1', 1);
    game.activeGacoan = gacoan;
    game.session.activeGacoan = gacoan;
    
    const gateEntity = new MockCollisionEntity('gate-1');
    game.registry.register(1, { type: 'gacoan', entity: gacoan });
    game.registry.register(2, { 
      type: 'gate', 
      id: 'gate-1',
      entity: gateEntity,
      operator: '+',
      operand: 3
    });

    game.eventQueue = {
      drainCollisionEvents: (fn) => { fn(1, 2, true); }
    };

    const beforeCount = recorder.collisions.length;
    const operationsBefore = recorder.operations.length;
    const evolutionsBefore = recorder.evolutions.length;
    game.processCollisionEvents();

    assert.strictEqual(recorder.collisions.length, beforeCount + 1, 'Gate collision should be recorded');
    assert.strictEqual(recorder.operations.length, operationsBefore + 1, 'Operation should be recorded');
    assert.strictEqual(recorder.evolutions.length, evolutionsBefore + 1, 'Evolution should be recorded');
    assert.strictEqual(recorder.collisions[beforeCount].accepted, true);
  }

  // Test 3: Second gate hit (with separate drops) should not record operation/evolution for the same gate
  {
    const clock = new MockClock(1000);
    const recorder = new RunRecorder();
    
    const game = new MarbleDropGame({
      renderer: new MockRenderer(),
      physics: new MockPhysics(),
      textureCache: new MockTextureCache(),
      assetService: new MockAssetService(),
      level: LEVEL_1,
      clock,
      feedbackService: null,
      soundService: null,
      runRecorder: recorder,
    });

    game.registry = new MockRegistry();
    game.resolver = new MockCollisionResolver();
    
    game.session.transitionTo(GAMEPLAY_STATE.READY);
    game.session.transitionTo(GAMEPLAY_STATE.FALLING);
    game.session.currentValue = 5;
    
    const gacoan = new MockCollisionEntity('gacoan-1', 1);
    game.activeGacoan = gacoan;
    game.session.activeGacoan = gacoan;
    
    const gateEntity = new MockCollisionEntity('gate-1');
    game.registry.register(1, { type: 'gacoan', entity: gacoan });
    game.registry.register(2, { 
      type: 'gate', 
      id: 'gate-1',
      entity: gateEntity,
      operator: '+',
      operand: 3
    });

    game.eventQueue = {
      drainCollisionEvents: (fn) => {
        fn(1, 2, true); // First and only collision in this event drain
      }
    };

    const operationsBefore = recorder.operations.filter(o => o.sourceId === 'gate-1').length;

    game.processCollisionEvents();

    const operationsAfter = recorder.operations.filter(o => o.sourceId === 'gate-1').length;

    // First collision should record operation
    assert.strictEqual(operationsAfter, operationsBefore + 1);

    // Now simulate the same gate being hit again (would only happen if session returned to FALLING and new collision detected)
    // This is what happens when consumedGateIds prevents duplicate operations in the same drop
    game.session.transitionTo(GAMEPLAY_STATE.FALLING); // Reset state for this test
    
    // Try to process the same gate collision again
    game.eventQueue = {
      drainCollisionEvents: (fn) => {
        fn(1, 2, true); // Same gate collision again
      }
    };

    const operationsBefore2 = recorder.operations.filter(o => o.sourceId === 'gate-1').length;
    game.processCollisionEvents();
    const operationsAfter2 = recorder.operations.filter(o => o.sourceId === 'gate-1').length;

    // Should not record another operation because gate is in consumedGateIds
    assert.strictEqual(operationsAfter2, operationsBefore2);
  }

  // Test 4: Goal collision, operation, and evolution
  {
    const clock = new MockClock(1000);
    const recorder = new RunRecorder();
    
    const game = new MarbleDropGame({
      renderer: new MockRenderer(),
      physics: new MockPhysics(),
      textureCache: new MockTextureCache(),
      assetService: new MockAssetService(),
      level: LEVEL_1,
      clock,
      feedbackService: null,
      soundService: null,
      runRecorder: recorder,
    });

    game.registry = new MockRegistry();
    game.resolver = new MockCollisionResolver();
    
    game.session.transitionTo(GAMEPLAY_STATE.READY);
    game.session.transitionTo(GAMEPLAY_STATE.FALLING);
    game.session.currentValue = 5;
    
    const gacoan = new MockCollisionEntity('gacoan-1', 1);
    game.activeGacoan = gacoan;
    game.session.activeGacoan = gacoan;
    
    const goalEntity = new MockCollisionEntity('goal-1');
    game.registry.register(1, { type: 'gacoan', entity: gacoan });
    game.registry.register(3, { 
      type: 'goal', 
      id: 'goal-1',
      entity: goalEntity,
      operator: '+',
      value: 10
    });

    game.eventQueue = {
      drainCollisionEvents: (fn) => { fn(1, 3, true); }
    };

    const beforeCount = recorder.collisions.length;
    const operationsBefore = recorder.operations.length;
    const evolutionsBefore = recorder.evolutions.length;
    game.processCollisionEvents();

    assert.strictEqual(recorder.collisions.length, beforeCount + 1, 'Goal collision should be recorded');
    assert.strictEqual(recorder.operations.length, operationsBefore + 1, 'Goal operation should be recorded');
    assert.strictEqual(recorder.evolutions.length, evolutionsBefore + 1, 'Goal evolution should be recorded');
    assert.strictEqual(recorder.collisions[beforeCount].type, 'goal');
  }

  // Test 5: Correct values in operation record
  {
    const clock = new MockClock(1000);
    const recorder = new RunRecorder();
    
    const game = new MarbleDropGame({
      renderer: new MockRenderer(),
      physics: new MockPhysics(),
      textureCache: new MockTextureCache(),
      assetService: new MockAssetService(),
      level: LEVEL_1,
      clock,
      feedbackService: null,
      soundService: null,
      runRecorder: recorder,
    });

    game.registry = new MockRegistry();
    game.resolver = new MockCollisionResolver();
    
    game.session.transitionTo(GAMEPLAY_STATE.READY);
    game.session.transitionTo(GAMEPLAY_STATE.FALLING);
    game.session.currentValue = 10;
    
    const gacoan = new MockCollisionEntity('gacoan-1', 1);
    game.activeGacoan = gacoan;
    game.session.activeGacoan = gacoan;
    
    const gateEntity = new MockCollisionEntity('gate-1');
    game.registry.register(1, { type: 'gacoan', entity: gacoan });
    game.registry.register(2, { 
      type: 'gate', 
      id: 'gate-1',
      entity: gateEntity,
      operator: '*',
      operand: 2
    });

    game.eventQueue = {
      drainCollisionEvents: (fn) => { fn(1, 2, true); }
    };

    const opsBefore = recorder.operations.length;
    game.processCollisionEvents();

    const lastOp = recorder.operations[opsBefore];
    assert.strictEqual(lastOp.previousValue, 10);
    assert.strictEqual(lastOp.operator, '*');
    assert.strictEqual(lastOp.operand, 2);
  }

  console.log('PASS: telemetry-wiring.test.mjs passed all assertions.');
}

runTelemetryWiringTests();

