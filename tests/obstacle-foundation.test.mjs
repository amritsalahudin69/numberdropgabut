import assert from 'node:assert/strict';
import { Container } from 'pixi.js';
import { LEVEL_1 } from '../src/config/levels/level1.js';
import { CollisionRegistry } from '../src/core/CollisionRegistry.js';
import { MarbleDropObstacleSystem } from '../src/systems/MarbleDropObstacleSystem.js';
console.log('Running obstacle-foundation.test.mjs...');
assert.ok(Array.isArray(LEVEL_1.pegs) && LEVEL_1.pegs.length > 0);
assert.ok(Array.isArray(LEVEL_1.gates) && LEVEL_1.gates.length > 0);
assert.ok(Array.isArray(LEVEL_1.goals) && LEVEL_1.goals.length > 0);
assert.ok(Array.isArray(LEVEL_1.obstacles));
const stage5MovingBlocks =
  LEVEL_1.obstacles.filter(
    (obstacle) =>
      obstacle?.type ===
      'moving-block'
  );


assert.equal(
  stage5MovingBlocks.length,
  2,
  'Stage-5 foundation must preserve exactly two MovingBlocks'
);


assert.ok(
  stage5MovingBlocks.some(
    (obstacle) =>
      obstacle?.id ===
      'moving-block-1'
  ),
  'moving-block-1 must remain in the level'
);


assert.ok(
  stage5MovingBlocks.some(
    (obstacle) =>
      obstacle?.id ===
      'moving-block-2'
  ),
  'moving-block-2 must remain in the level'
);
const parent = new Container();
const registry = new CollisionRegistry();
const system = new MarbleDropObstacleSystem({ physicsWorld: null, parentContainer: parent, registry });
const definitions = [{ id: 'test-x', type: 'moving-block', x: 200, y: 300, width: 120, height: 30, axis: 'x', distance: 60, speed: 0.25, phase: 0 }, { id: 'test-y', type: 'moving-block', x: 500, y: 400, width: 140, height: 34, axis: 'y', distance: 50, speed: 0.2, phase: 0.25 }];
system.build(definitions);
assert.equal(system.obstacles.length, 2); assert.equal(parent.children.length, 2);
const obstacleX = system.getById('test-x'); const obstacleY = system.getById('test-y'); assert.ok(obstacleX); assert.ok(obstacleY);
const initialX = obstacleX.currentX; const initialY = obstacleY.currentY; system.update(0.25);
assert.notEqual(obstacleX.currentX, initialX); assert.equal(obstacleX.currentY, obstacleX.baseY); assert.notEqual(obstacleY.currentY, initialY); assert.equal(obstacleY.currentX, obstacleY.baseX);
const collisionResult = system.handleGacoanCollision({ obstacleId: 'test-x', gacoan: { body: null } }); assert.equal(collisionResult.accepted, true); assert.equal(collisionResult.reason, 'physics_only');
system.build(definitions); assert.equal(system.obstacles.length, 2); assert.equal(parent.children.length, 2); system.clear(); assert.equal(system.obstacles.length, 0); assert.equal(parent.children.length, 0); assert.equal(registry.size(), 0); system.destroy(); parent.destroy({ children: true }); console.log('PASS: obstacle-foundation.test.mjs');
