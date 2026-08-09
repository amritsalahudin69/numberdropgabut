import assert from 'assert';
import { MarbleDropGame } from '../src/game/MarbleDropGame.js';
import { CollisionRegistry } from '../src/core/CollisionRegistry.js';
import { GAMEPLAY_STATE } from '../src/game/MarbleDropSession.js';

console.log('Running sound-wiring.test.mjs');

// Fake minimal dependencies
const fakeRenderer = {};
const fakePhysics = { getRapier: () => null }; // not used
const fakeTextureCache = { has: () => false, get: () => null };

let pegCount = 0, gateCount = 0, goalCount = 0;
const fakeSound = {
  playPeg: () => { pegCount++; },
  playGate: () => { gateCount++; },
  playGoal: () => { goalCount++; },
  playSuccess: () => {},
  destroy: () => {},
};

const game = new MarbleDropGame({ renderer: fakeRenderer, physics: fakePhysics, textureCache: fakeTextureCache, assetService: null, level: { goals: [] }, soundService: fakeSound });

// Replace session with minimal fake
const gacoanHandleVal = 201;
const fakeGacoan = { getColliderHandle: () => gacoanHandleVal, destroy: () => {}, isFrozen: () => false, freeze: () => {}, unfreeze: () => {}, getPosition: () => ({ x: 0, y: 0 }) };
const fakeSession = {
  getActiveGacoan: () => fakeGacoan,
  getState: () => GAMEPLAY_STATE.FALLING,
  getActiveGacoan: () => fakeGacoan,
  beginResolve: () => {},
  beginHold: () => {},
};

game.session = fakeSession;
// ensure activeGacoan matches registry entity
game.activeGacoan = fakeGacoan;

// Use real registry
game.registry = new CollisionRegistry();

// Prepare registry entries: assume collider handles 1=peg, 2=gacoan, 3=gate, 4=goal
const pegHandle = 11;
const gateHandle = 12;
const goalHandle = 13;

// Entities
const gateEntity = { id: 'gate-1' };
const goalEntity = { id: 'goal-1', value: 42 };

// Register meta pairs: gacoan vs peg
game.registry.register(pegHandle, { type: 'peg', entity: {} });
// register gacoan by its actual collider handle value so internal checks pass
game.registry.register(gacoanHandleVal, { type: 'gacoan', entity: fakeGacoan });

// Now simulate eventQueue drain in order: peg contact, gate contact, same gate duplicate, goal contact
let drains = [
  // peg: (gacoan, peg)
  [gacoanHandleVal, pegHandle, true],
  // gate: (gacoan, gate)
  [gacoanHandleVal, gateHandle, true],
  // duplicate gate (should be ignored)
  [gacoanHandleVal, gateHandle, true],
  // goal: (gacoan, goal)
  [gacoanHandleVal, goalHandle, true],
];

// Register gate and goal meta
game.registry.register(gateHandle, { type: 'gate', id: 'gate-1', entity: gateEntity, operator: '+', operand: 1 });
game.registry.register(goalHandle, { type: 'goal', id: 'goal-1', entity: goalEntity, value: 42, operator: '-' });

// Provide a fake eventQueue
game.eventQueue = {
  drainCollisionEvents(cb) {
    for (const d of drains) cb(d[0], d[1], d[2]);
  }
};

// Provide resolver that returns ok for gate/goal
game.resolver = {
  resolveOperationHit: ({ operator, operand, isGoal }) => ({ ok: true, feedbackAsset: null, postHoldAction: 'RESUME_FALL' })
};

// Ensure session state is FALLING

// Run processing
game.processCollisionEvents();

// Assertions: pegCount 1, gateCount 1 (duplicate ignored), goalCount 1
assert.strictEqual(pegCount, 1, 'peg sound should be played once');
assert.strictEqual(gateCount, 1, 'gate sound should be played once for first accepted gate');
assert.strictEqual(goalCount, 1, 'goal sound should be played once');

console.log('PASS sound-wiring');
process.exit(0);
