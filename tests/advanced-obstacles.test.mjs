import assert from 'node:assert/strict';
import { Container } from 'pixi.js';
import { LEVEL_1 } from '../src/config/levels/level1.js';
import { MarbleDropObstacleSystem } from '../src/systems/MarbleDropObstacleSystem.js';

console.log('Running advanced-obstacles.test.mjs...');
assert.equal(LEVEL_1.obstacles.length, 4);
assert.equal(LEVEL_1.obstacles.filter((o) => o.type === 'moving-block').length, 2);
assert.equal(LEVEL_1.obstacles.filter((o) => o.type === 'gear').length, 1);
assert.equal(LEVEL_1.obstacles.filter((o) => o.type === 'hammer').length, 1);

const parent = new Container();
const fakePhysics = {
  getWorld() { return null; },
  getRapier() { return null; },
  toMeters(px) { return px / 50; },
};
const system = new MarbleDropObstacleSystem({ physicsWorld: fakePhysics, parentContainer: parent, registry: null });
system.build([
  { id: 'test-moving', type: 'moving-block', x: 300, y: 500, width: 120, height: 30, axis: 'x', distance: 50, speed: 0.2 },
  { id: 'test-gear', type: 'gear', x: 700, y: 500, radius: 50, clockwise: true },
  { id: 'test-hammer', type: 'hammer', x: 1100, y: 300, length: 150, headRadius: 34, speed: 0.5, swingAngleDeg: 52, impactDeltaV: 12, radialDeltaV: 2.5, minimumExitSpeed: 10, maxResultSpeed: 16 },
]);
assert.equal(system.obstacles.length, 3);
assert.equal(parent.children.length, 3);
const gear = system.getById('test-gear');
const hammer = system.getById('test-hammer');
assert.ok(gear); assert.ok(hammer);
const gearRotationBefore = gear.container.rotation;
system.update(0.1);
assert.notEqual(gear.container.rotation, gearRotationBefore);
const hammerHeadBefore = { x: hammer.currentHeadX, y: hammer.currentHeadY };
system.update(0.1);
assert.ok(hammer.currentHeadX !== hammerHeadBefore.x || hammer.currentHeadY !== hammerHeadBefore.y);

let velocity = { x: 0, y: 0 };
let appliedImpulse = null;
const fakeBody = {
  translation() { return { x: fakePhysics.toMeters(hammer.currentHeadX + 35), y: fakePhysics.toMeters(hammer.currentHeadY + 10) }; },
  mass() { return 2; },
  linvel() { return { ...velocity }; },
  applyImpulse(impulse) { appliedImpulse = { ...impulse }; velocity = { x: velocity.x + impulse.x / 2, y: velocity.y + impulse.y / 2 }; },
  setLinvel(next) { velocity = { ...next }; },
};
const hammerResult = system.handleGacoanCollision({ obstacleId: 'test-hammer', gacoan: { body: fakeBody } });
assert.equal(hammerResult.accepted, true);
assert.equal(hammerResult.reason, 'hammer_strong_whack');
assert.ok(appliedImpulse);
const resultSpeed = Math.hypot(velocity.x, velocity.y);
assert.ok(resultSpeed >= 9, `Hammer result speed must be strong, got ${resultSpeed}`);
assert.ok(resultSpeed <= 16.0001, `Hammer result speed must remain bounded, got ${resultSpeed}`);
const levelGear = LEVEL_1.obstacles.find((o) => o.id === 'gear-1');
const levelHammer = LEVEL_1.obstacles.find((o) => o.id === 'hammer-1');
assert.ok(levelHammer.impactDeltaV >= 10);
assert.ok(levelHammer.minimumExitSpeed >= 9);
assert.ok(levelHammer.impactDeltaV > levelGear.tangentialDeltaV);
system.clear();
assert.equal(system.obstacles.length, 0);
assert.equal(parent.children.length, 0);
system.destroy();
parent.destroy({ children: true });
console.log('PASS: advanced-obstacles.test.mjs');
