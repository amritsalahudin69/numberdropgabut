import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Container } from 'pixi.js';
import { MAX_ACTIVE_EFFECTS, TransientVfxSystem } from '../src/systems/TransientVfxSystem.js';

const parent = new Container();
const shakeTarget = { x: 100, y: 200 };
const vfx = new TransientVfxSystem({ parent, shakeTarget });

assert.equal(vfx.trigger({ type: 'unknown', x: 10, y: 10 }), false);
assert.equal(vfx.trigger({ type: 'gear-impact', x: NaN, y: 20, radius: 54 }), false);
assert.equal(vfx.trigger({ type: 'goal-success', x: 20, y: Infinity, value: 10 }), false);

assert.equal(vfx.trigger({
  type: 'gear-impact', obstacleId: 'gear-test', x: 300, y: 240,
  radius: 54, clockwise: true, strength: 1,
}), true);
assert.equal(vfx.getActiveEffectCount(), 1);
assert.equal(vfx.effects[0].type, 'gear-impact');
assert.ok(Math.abs(vfx.effects[0].duration - 0.20) < 0.001);
assert.equal(vfx.shakeRemaining, 0, 'Gear does not start screen shake');
assert.ok(vfx.effects[0].sparks.length >= 6);
assert.ok(vfx.effects[0].streaks.length >= 6);
vfx.update(0.05);
assert.notEqual(vfx.effects[0].root.rotation, 0);

assert.equal(vfx.trigger({
  type: 'goal-success', goalId: 'goal-test', x: 500, y: 320, value: 42, strength: 1,
}), true);
const goal = vfx.effects.find((effect) => effect.type === 'goal-success');
assert.ok(goal);
assert.ok(Math.abs(goal.duration - 0.36) < 0.001);
assert.equal(vfx.shakeRemaining, 0, 'Goal does not start screen shake');
assert.equal(goal.rays.length, 11);
assert.ok(goal.ring1 && goal.ring2);
assert.ok(goal.flash);

assert.equal(vfx.trigger({ type: 'hammer-impact', x: 700, y: 400, directionX: 1, directionY: 0, strength: 1 }), true);
assert.ok(vfx.shakeRemaining > 0, 'Hammer still starts production shake');
assert.ok(vfx.getActiveEffectCount() <= MAX_ACTIVE_EFFECTS);

for (let index = 0; index < MAX_ACTIVE_EFFECTS + 5; index += 1) {
  vfx.trigger({ type: 'gear-impact', x: 100 + index, y: 100, radius: 40, clockwise: false });
}
assert.ok(vfx.getActiveEffectCount() <= MAX_ACTIVE_EFFECTS);
vfx.clear();
assert.equal(vfx.getActiveEffectCount(), 0);
assert.equal(shakeTarget.x, 100);
assert.equal(shakeTarget.y, 200);
vfx.destroy();
assert.equal(parent.children.length, 0);

const gameSource = fs.readFileSync(new URL('../src/game/MarbleDropGame.js', import.meta.url), 'utf8');
assert.ok(gameSource.includes("type: 'gear-impact'"));
assert.ok(gameSource.includes("type: 'goal-success'"));
const obstacleAccepted = gameSource.indexOf("if (result.accepted === true && targetMeta.entity?.type === 'hammer')");
const gearTrigger = gameSource.indexOf("type: 'gear-impact'");
assert.ok(obstacleAccepted >= 0 && gearTrigger > obstacleAccepted, 'Gear VFX follows accepted obstacle handling');
const goalSuccess = gameSource.indexOf('const goalSucceeded =');
const goalTrigger = gameSource.indexOf("type: 'goal-success'");
assert.ok(goalSuccess >= 0 && goalTrigger > goalSuccess, 'Goal VFX follows successful completion validation');
assert.equal(gameSource.includes('wall-impact'), false);

console.log('PASS: numberdrop-vfx3.test.mjs');
