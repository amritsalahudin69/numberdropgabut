import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Container } from 'pixi.js';
import {
  EFFECT_LIFETIME_SEC,
  MAX_ACTIVE_EFFECTS,
  MAX_SHAKE_AMPLITUDE_PX,
  SHAKE_AMPLITUDE_PX,
  SHAKE_DURATION_SEC,
  TransientVfxSystem,
} from '../src/systems/TransientVfxSystem.js';

const parent = new Container();
const shakeTarget = { x: 100, y: 200 };
const vfx = new TransientVfxSystem({ parent, shakeTarget });

assert.equal(parent.children.length, 1);
assert.equal(vfx.vfxContainer.parent, parent);
assert.equal(vfx.trigger({ type: 'unknown' }), false);
assert.equal(vfx.trigger({ type: 'hammer-impact', x: NaN, y: 300 }), false);
assert.equal(vfx.trigger({ type: 'hammer-impact', x: 400, y: Infinity }), false);
assert.equal(vfx.trigger({
  type: 'hammer-impact', obstacleId: 'hammer-test', x: 400, y: 300,
  directionX: 4, directionY: 2, strength: 1,
}), true);

assert.equal(vfx.getActiveEffectCount(), 1);
assert.ok(Math.abs(vfx.effects[0].duration - EFFECT_LIFETIME_SEC) < 0.001);
assert.equal(vfx.effects[0].root.visible, true);
assert.equal(vfx.effects[0].root.renderable, true);
assert.ok(vfx.effects[0].root.alpha > 0);
assert.ok(vfx.effects[0].root.children.length >= 11);
assert.equal(vfx.vfxContainer.parent, parent);
assert.equal(parent.getChildIndex(vfx.vfxContainer), parent.children.length - 1);
assert.equal(vfx.shakeDuration, SHAKE_DURATION_SEC);
assert.equal(vfx.shakeAmplitude, SHAKE_AMPLITUDE_PX);
assert.ok(vfx.shakeAmplitude <= MAX_SHAKE_AMPLITUDE_PX);

vfx.update(0.016);
assert.equal(vfx.getActiveEffectCount(), 1);
assert.notEqual(shakeTarget.x, 100);
for (let index = 0; index < MAX_ACTIVE_EFFECTS + 3; index += 1) {
  vfx.trigger({ type: 'hammer-impact', x: 400 + index, y: 300, directionX: 1, directionY: 0, strength: 1 });
}
assert.ok(vfx.getActiveEffectCount() <= MAX_ACTIVE_EFFECTS);
vfx.clear();
assert.equal(vfx.getActiveEffectCount(), 0);
assert.equal(shakeTarget.x, 100);
assert.equal(shakeTarget.y, 200);

vfx.trigger({ type: 'hammer-impact', x: 400, y: 300, directionX: 1, directionY: 0, strength: 1 });
for (let index = 0; index < Math.ceil(EFFECT_LIFETIME_SEC / 0.05) + 1; index += 1) vfx.update(0.05);
assert.equal(vfx.getActiveEffectCount(), 0);
assert.equal(shakeTarget.x, 100);
assert.equal(shakeTarget.y, 200);
vfx.destroy();
assert.equal(parent.children.length, 0);

const gameSource = fs.readFileSync(new URL('../src/game/MarbleDropGame.js', import.meta.url), 'utf8');
for (const token of ['TransientVfxSystem', 'hammer-impact', 'transientVfx?.update', 'transientVfx?.clear', 'transientVfx.destroy']) {
  assert.ok(gameSource.includes(token), `MarbleDropGame contains ${token}`);
}
assert.equal(gameSource.includes('vfx' + 'debug'), false);
assert.equal(gameSource.includes('setTimeout'), false);
assert.equal((gameSource.match(/transientVfx\?\.update\?\./g) || []).length, 1);
const cleanupStart = gameSource.indexOf('cleanupActiveGacoan()');
const cleanupEnd = gameSource.indexOf('\n  reset()', cleanupStart);
assert.equal(gameSource.slice(cleanupStart, cleanupEnd).includes('transientVfx.destroy'), false);

console.log('PASS: numberdrop-hammer-vfx.test.mjs');
