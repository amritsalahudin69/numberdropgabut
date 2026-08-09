import assert from 'node:assert/strict';
import { CollisionResolver } from '../src/systems/CollisionResolver.js';
import { MarbleDropSession, GAMEPLAY_STATE } from '../src/game/MarbleDropSession.js';

function runCollisionResolverTests() {
  console.log('Running collision-resolver.test.mjs...');

  const mockLevel = {
    id: 'test-level',
    startingValue: 100,
    maxOps: 6,
    valueDomain: { min: 0, max: 2000 },
  };

  const fakeTextures = {
    99: { id: 'tex-99' },
    93: { id: 'tex-93' },
  };

  const fakeTextureCache = {
    get(val) {
      if (fakeTextures[val]) return fakeTextures[val];
      throw new Error(`Texture cache miss for value: ${val}`);
    },
    has(val) {
      return !!fakeTextures[val];
    },
  };

  const mockGacoan = {
    value: 100,
    sprite: { texture: { id: 'tex-100' } },
    setValue(newVal, newTex) {
      this.value = newVal;
      this.sprite.texture = newTex;
    },
  };

  const session = new MarbleDropSession();
  session.start(mockLevel);
  session.beginDrop(mockGacoan);
  // follow contract: transition to RESOLVING before calling resolver
  session.beginResolve();

  const resolver = new CollisionResolver({
    session,
    textureCache: fakeTextureCache,
    levelDomain: mockLevel.valueDomain,
  });

  // 1. Gate hit resolution (-1)
  const gateRes = resolver.resolveOperationHit({
    operator: '-',
    operand: 1,
    isGoal: false,
  });

  assert.equal(gateRes.ok, true);
  assert.equal(gateRes.value, 99);
  assert.equal(session.getCurrentValue(), 99);
  assert.equal(mockGacoan.value, 99);
  assert.equal(mockGacoan.sprite.texture.id, 'tex-99');
  // resolver must not change session lifecycle
  assert.equal(session.getState(), GAMEPLAY_STATE.RESOLVING);

  // 2. Goal hit resolution (-6)
  const mockGoal = { value: 6, operator: '-' };

  const goalRes = resolver.resolveOperationHit({
    operator: mockGoal.operator,
    operand: mockGoal.value,
    isGoal: true,
  });

  assert.equal(goalRes.ok, true);
  assert.equal(goalRes.value, 93);
  assert.equal(session.getCurrentValue(), 93);
  assert.equal(mockGacoan.value, 93);
  assert.equal(mockGoal.value, 6); // Goal value remains IMMUTABLE!
  // resolver must not change session lifecycle
  assert.equal(session.getState(), GAMEPLAY_STATE.RESOLVING);

  // 3. Missing texture test -> No partial commit, enters ERROR
  const errSession = new MarbleDropSession();
  errSession.start(mockLevel);
  const errGacoan = {
    value: 100,
    setValue(v, t) { this.value = v; },
  };
  errSession.beginDrop(errGacoan);
  // transition to RESOLVING per contract
  errSession.beginResolve();

  const emptyCache = {
    get(val) { throw new Error('Missing texture simulation'); },
  };

  const errResolver = new CollisionResolver({
    session: errSession,
    textureCache: emptyCache,
  });

  assert.throws(() => {
    errResolver.resolveOperationHit({
      operator: '-',
      operand: 1,
      isGoal: false,
    });
  }, /Texture lookup failed for result 99/);

  assert.equal(errSession.getState(), GAMEPLAY_STATE.ERROR);
  assert.equal(errGacoan.value, 100); // Gacoan value NOT mutated

  console.log('PASS: collision-resolver.test.mjs passed all assertions.');
}

runCollisionResolverTests();
