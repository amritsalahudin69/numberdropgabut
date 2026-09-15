import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Container } from 'pixi.js';
import { MAX_ACTIVE_EFFECTS, TransientVfxSystem } from '../src/systems/TransientVfxSystem.js';

const parent = new Container();
const shakeTarget = { x: 100, y: 200 };
const vfx = new TransientVfxSystem({ parent, shakeTarget });

assert.equal(vfx.trigger({ type: 'unknown', x: 10, y: 10 }), false);
assert.equal(vfx.trigger({ type: 'peg-impact', x: NaN, y: 20, radius: 15 }), false);
assert.equal(vfx.trigger({ type: 'moving-block-impact', x: 20, y: Infinity, width: 180, height: 36 }), false);

assert.equal(vfx.trigger({
  type: 'peg-impact', obstacleId: 'peg-test', x: 300, y: 240, radius: 15, strength: 1,
}), true);
const peg = vfx.effects[0];
assert.equal(peg.type, 'peg-impact');
assert.ok(Math.abs(peg.duration - 0.14) < 0.001);
assert.equal(vfx.shakeRemaining, 0);
assert.ok(peg.pulse && peg.ring);
for (let index = 0; index < 4; index += 1) vfx.update(0.05);
assert.equal(vfx.effects.some((effect) => effect.type === 'peg-impact'), false);

assert.equal(vfx.trigger({
  type: 'moving-block-impact', obstacleId: 'block-test', x: 420, y: 260,
  width: 180, height: 36, strength: 1,
}), true);
const block = vfx.effects.find((effect) => effect.type === 'moving-block-impact');
assert.ok(block);
assert.ok(Math.abs(block.duration - 0.18) < 0.001);
assert.equal(vfx.shakeRemaining, 0);
assert.ok(block.flash && block.outer);
assert.equal(block.root.children.length, 2);
for (let index = 0; index < 5; index += 1) vfx.update(0.05);
assert.equal(vfx.effects.some((effect) => effect.type === 'moving-block-impact'), false);

assert.equal(vfx.trigger({ type: 'hammer-impact', x: 600, y: 300, directionX: 1, directionY: 0, strength: 1 }), true);
assert.ok(vfx.shakeRemaining > 0);
vfx.clear();
assert.equal(vfx.getActiveEffectCount(), 0);
assert.equal(shakeTarget.x, 100);
assert.equal(shakeTarget.y, 200);

assert.equal(vfx.trigger({ type: 'gear-impact', x: 600, y: 300, radius: 54, clockwise: true }), true);
assert.equal(vfx.shakeRemaining, 0);
assert.equal(vfx.trigger({ type: 'goal-success', x: 700, y: 320, value: 42 }), true);
assert.equal(vfx.shakeRemaining, 0);
for (let index = 0; index < MAX_ACTIVE_EFFECTS + 4; index += 1) {
  vfx.trigger({ type: 'peg-impact', x: 100 + index, y: 100, radius: 15 });
}
assert.ok(vfx.getActiveEffectCount() <= MAX_ACTIVE_EFFECTS);
vfx.clear();
vfx.destroy();
assert.equal(parent.children.length, 0);

const gameSource = fs.readFileSync(new URL('../src/game/MarbleDropGame.js', import.meta.url), 'utf8');
assert.ok(gameSource.includes("type: 'peg-impact'"));
assert.ok(gameSource.includes("type: 'moving-block-impact'"));
assert.ok(gameSource.includes('movingBlock.currentX'));
assert.ok(gameSource.includes('movingBlock.currentY'));
assert.equal(gameSource.includes('wall-impact'), false);

for (const file of [
  'src/systems/RunRecorder.js',
  'src/systems/ResultService.js',
  'src/systems/JsonExporter.js',
]) {
  const source = fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
  assert.equal(source.includes('peg-impact'), false);
  assert.equal(source.includes('moving-block-impact'), false);
}

console.log('PASS: numberdrop-vfx4.test.mjs');
