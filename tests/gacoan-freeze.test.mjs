/**
 * gacoan-freeze.test.mjs
 * Behavioral freeze/unfreeze test using actual Rapier integration.
 */

import assert from 'node:assert/strict';
import RAPIER from '@dimforge/rapier2d-compat';
import { Gacoan } from '../src/entities/Gacoan.js';

async function runGacoanFreezeTests() {
  console.log('Running gacoan-freeze.test.mjs...');

  await RAPIER.init();

  // Minimal PhysicsWorld-compatible stub using real Rapier
  const world = new RAPIER.World({ x: 0.0, y: 9.81 });

  const fakePhysicsWorld = {
    getWorld() { return world; },
    getRapier() { return RAPIER; },
    toMeters(px) { return px / 50; },
    toPixels(m) { return m * 50; },
  };

  // Fake PIXI container stub (Node has no PIXI)
  // We need to patch PIXI.Container/Sprite/Graphics for this test
  // Since Gacoan imports from pixi.js, we must ensure those work.
  // We'll skip parentContainer and sprite (no PIXI in Node).
  // Spawn without parentContainer and check only physics behavior.

  const gacoan = new Gacoan();

  // Manually set up physics without PIXI
  const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(10, 5)
    .setLinvel(2, 3);
  const body = world.createRigidBody(bodyDesc);
  body.setLinvel({ x: 2.0, y: 3.0 }, true);

  const colliderDesc = RAPIER.ColliderDesc.ball(0.8);
  const collider = world.createCollider(colliderDesc, body);

  // Inject directly
  gacoan.value = 100;
  gacoan.body = body;
  gacoan.collider = collider;
  gacoan.physicsWorld = fakePhysicsWorld;
  gacoan.radiusPx = 40;
  gacoan.container = { position: { set() {} }, x: 500, y: 250, parent: null, destroy() {} };
  gacoan.sprite = null;

  // Step physics once to ensure body is active
  world.step();

  // Before freeze: body should be Dynamic
  assert.ok(body.isDynamic(), 'body should be Dynamic before freeze');
  assert.equal(gacoan.isFrozen(), false, 'isFrozen should be false before freeze');

  // Freeze
  gacoan.freeze();

  assert.equal(gacoan.isFrozen(), true, 'isFrozen should be true after freeze');
  assert.ok(body.isFixed(), 'body should be Fixed after freeze');

  // Step physics while frozen — position should be stable
  const posBefore = body.translation();
  world.step();
  world.step();
  const posAfter = body.translation();

  assert.ok(Math.abs(posAfter.x - posBefore.x) < 0.001, 'x position should not change while frozen');
  assert.ok(Math.abs(posAfter.y - posBefore.y) < 0.001, 'y position should not change while frozen');

  // Unfreeze
  gacoan.unfreeze();

  assert.equal(gacoan.isFrozen(), false, 'isFrozen should be false after unfreeze');
  assert.ok(body.isDynamic(), 'body should be Dynamic again after unfreeze');

  // Step physics — body should move again (gravity acting on it)
  const posBeforeMove = body.translation();
  world.step();
  world.step();
  const posAfterMove = body.translation();

  const moved = Math.abs(posAfterMove.y - posBeforeMove.y) > 0.0001 ||
                Math.abs(posAfterMove.x - posBeforeMove.x) > 0.0001;
  assert.ok(moved, 'body should move again after unfreeze');

  // Clean up
  world.removeCollider(collider, true);
  world.removeRigidBody(body);

  console.log('PASS: gacoan-freeze.test.mjs passed all assertions.');
}

runGacoanFreezeTests().catch((err) => {
  console.error('FAIL: gacoan-freeze.test.mjs:', err);
  process.exit(1);
});
