import assert from 'node:assert/strict';
import { MarbleDropGame } from '../src/game/MarbleDropGame.js';
import { LEVEL_1 } from '../src/config/levels/level1.js';
import { Gacoan } from '../src/entities/Gacoan.js';

console.log('Running drop-position.test.mjs...');

// Minimal fake dependencies
const fakeRenderer = null;
const fakePhysics = null;
const fakeTextureCache = { get: (v) => null, has: () => false };
const fakeClock = { now: () => Date.now() };

// We'll instantiate MarbleDropGame but bypass actual spawn texture requirement by mocking textureCache.get to return null
const game = new MarbleDropGame({ renderer: fakeRenderer, physics: fakePhysics, textureCache: fakeTextureCache, level: LEVEL_1, clock: fakeClock });

// Start session so dropAt is allowed
game.start();

// Test dropAt directly since pointer conversion is tested elsewhere
// Helper to create a fake active gacoan by invoking dropAt (dropAt creates Gacoan normally)

function spawnAt(worldX) {
  // Use game's dropAt which clamps by dropZone; simulate available texture by monkeypatching textureCache.get to return null texture
  const ok = game.dropAt(worldX);
  // debug
  console.log('dropAt result', ok, 'activeGacoan', !!game.activeGacoan);
  if (!ok) return null;
  const x = game.activeGacoan ? game.activeGacoan.getPosition().x : null;
  // cleanup active gacoan to allow subsequent drops in test
  try { game.cleanupActiveGacoan(); } catch (e) {}
  try { game.session.reset(game.level); } catch(e) {}
  return x;
}

// Ensure level dropZone updated
assert.equal(LEVEL_1.dropZone.minX, 58, 'dropZone.minX expected 58');
assert.equal(LEVEL_1.dropZone.maxX, 1862, 'dropZone.maxX expected 1862');

// world X 400 -> spawn X 400
let x = 400;
let spawned = spawnAt(x);
assert.equal(spawned, x, `spawn X should equal ${x}`);

// world X 960 -> spawn X 960
x = 960;
spawned = spawnAt(x);
assert.equal(spawned, x, `spawn X should equal ${x}`);

// world X 1700 -> spawn X 1700
x = 1700;
spawned = spawnAt(x);
assert.equal(spawned, x, `spawn X should equal ${x}`);

// world X 1850 -> spawn X 1850
x = 1850;
spawned = spawnAt(x);
assert.equal(spawned, x, `spawn X should equal ${x}`);

// extreme left -> clamp to 58
x = 10;
spawned = spawnAt(x);
assert.equal(spawned, 58, 'spawn X should clamp to 58 for worldX<58');

// extreme right -> clamp to 1862
x = 1900;
spawned = spawnAt(x);
assert.equal(spawned, 1862, 'spawn X should clamp to 1862 for worldX>1862');

console.log('PASS: drop-position.test.mjs passed all assertions.');
