import assert from 'node:assert/strict';
import fs from 'node:fs';

const game = fs.readFileSync(new URL('../src/game/MarbleDropGame.js', import.meta.url), 'utf8');
const recorder = fs.readFileSync(new URL('../src/systems/RunRecorder.js', import.meta.url), 'utf8');
const result = fs.readFileSync(new URL('../src/systems/ResultService.js', import.meta.url), 'utf8');
for (const token of ['beginAttempt', 'finishAttempt', "hammer-hit", "gear-hit", "moving-block-hit", "peg-hit", "goal-hit", "out-of-bounds"]) {
  assert.ok(game.includes(token) || recorder.includes(token), `reporting integration contains ${token}`);
}
assert.ok(result.includes('attempts'));
assert.ok(result.includes('attemptSummary'));
assert.equal(game.includes('transientVfx.trigger'), false, 'P5 does not alter VFX integration API');
assert.equal(game.includes('wall-impact'), false);
for (const file of ['src/systems/JsonExporter.js', 'src/systems/TransientVfxSystem.js']) {
  const source = fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
  assert.equal(source.includes('attemptSummary'), false);
}
console.log('PASS: numberdrop-attempt-integration.test.mjs');
