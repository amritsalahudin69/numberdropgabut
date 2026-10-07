import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MarbleDropApp } from '../src/app/MarbleDropApp.js';
import { LEVEL_1 } from '../src/config/levels/level1.js';
import { MarbleDropGame } from '../src/game/MarbleDropGame.js';
import {
  generateNumberDropArena,
  validateNumberDropArena,
} from '../src/systems/NumberDropArenaGenerator.js';

function positions(level) {
  return {
    pegs: level.pegs.map(({ id, x, y }) => ({ id, x, y })),
    gates: level.gates.map(({ id, x, y }) => ({ id, x, y })),
  };
}

function gateSweepOverlapsObstacle(gate, obstacle) {
  const gateBounds = {
    minX: gate.x - gate.range - gate.width / 2,
    maxX: gate.x + gate.range + gate.width / 2,
    minY: gate.y - gate.height / 2,
    maxY: gate.y + gate.height / 2,
  };
  let obstacleBounds;
  if (obstacle.type === 'gear') {
    obstacleBounds = {
      minX: obstacle.x - obstacle.radius,
      maxX: obstacle.x + obstacle.radius,
      minY: obstacle.y - obstacle.radius,
      maxY: obstacle.y + obstacle.radius,
    };
  } else {
    return false;
  }
  return gateBounds.minX < obstacleBounds.maxX
    && gateBounds.maxX > obstacleBounds.minX
    && gateBounds.minY < obstacleBounds.maxY
    && gateBounds.maxY > obstacleBounds.minY;
}

function protectedData(level) {
  const copy = structuredClone(level);
  for (const field of ['pegs', 'gates']) {
    for (const object of copy[field]) {
      delete object.x;
      delete object.y;
    }
  }
  return copy;
}

function runProceduralArenaTests() {
  console.log('Running procedural-arena.test.mjs...');
  const sourceBefore = JSON.stringify(LEVEL_1);

  const first = generateNumberDropArena(LEVEL_1, 12345);
  const repeated = generateNumberDropArena(LEVEL_1, 12345);
  assert.equal(first.metadata.fingerprint, repeated.metadata.fingerprint, 'same seed must produce the same fingerprint');
  assert.deepEqual(positions(first.level), positions(repeated.level), 'same seed must produce the same positions');
  assert.equal(first.metadata.pegCount, LEVEL_1.pegs.length);
  assert.equal(first.metadata.dynamicGateCount, LEVEL_1.gates.filter((gate) => gate.speed > 0 && gate.range > 0).length);

  const different = generateNumberDropArena(LEVEL_1, 98765);
  assert.notEqual(first.metadata.fingerprint, different.metadata.fingerprint, 'different seeds must produce different fingerprints');
  assert.notDeepEqual(positions(first.level), positions(different.level), 'different seeds must produce different obstacle positions');
  assert.equal(validateNumberDropArena({
    sourceLevel: LEVEL_1,
    generatedLevel: first.level,
    seed: 12345,
    fingerprint: first.metadata.fingerprint,
    deterministicFingerprint: repeated.metadata.fingerprint,
    diversityReference: {
      level: different.level,
      seed: 98765,
      fingerprint: different.metadata.fingerprint,
    },
  }).valid, true, 'validator must accept deterministic, diverse seeded layouts');
  const invalidGameplay = structuredClone(first.level);
  invalidGameplay.gates[0].operand += 1;
  assert.equal(validateNumberDropArena({
    sourceLevel: LEVEL_1,
    generatedLevel: invalidGameplay,
  }).valid, false, 'validator must reject protected gameplay changes');
  const invalidGeometry = structuredClone(first.level);
  invalidGeometry.pegs[0].x = Number.NaN;
  assert.equal(validateNumberDropArena({
    sourceLevel: LEVEL_1,
    generatedLevel: invalidGeometry,
  }).valid, false, 'validator must reject non-finite generated positions');
  assert.equal(validateNumberDropArena({
    sourceLevel: LEVEL_1,
    generatedLevel: first.level,
    seed: 12345,
    diversityReference: {
      level: first.level,
      seed: 98765,
    },
  }).valid, false, 'validator must reject identical layouts for different seeds');

  const staticGateSource = structuredClone(LEVEL_1);
  staticGateSource.gates[0].speed = 0;
  const staticGateArena = generateNumberDropArena(staticGateSource, 12345);
  assert.equal(staticGateArena.level.gates[0].x, staticGateSource.gates[0].x, 'non-moving gates must not be repositioned');
  assert.equal(staticGateArena.metadata.dynamicGateCount, 2, 'metadata must count only moving gates');

  assert.deepEqual(protectedData(first.level), protectedData(LEVEL_1), 'all non-positional level data must remain unchanged');
  assert.deepEqual(first.level.goals, LEVEL_1.goals, 'goal gameplay and positions must remain unchanged');
  assert.deepEqual(first.level.obstacles, LEVEL_1.obstacles, 'special obstacle definitions must remain unchanged');
  assert.equal(first.level.obstacles.length, 20, 'all target special obstacles must remain in the generated arena');
  assert.ok(
    first.level.gates.some((gate) => LEVEL_1.obstacles.some((obstacle) => gateSweepOverlapsObstacle(gate, obstacle))),
    'sensor gate sweeps may cross target obstacle colliders without changing their runtime behavior',
  );
  const gateSource = readFileSync(new URL('../src/entities/Gate.js', import.meta.url), 'utf8');
  const gameSource = readFileSync(new URL('../src/game/MarbleDropGame.js', import.meta.url), 'utf8');
  assert.match(gateSource, /\.setSensor\(true\)/, 'Gate obstacle clearance depends on the existing sensor collider');
  assert.match(gameSource, /if \(!gacoanMeta \|\| !targetMeta\) return;/, 'only Gacoan contacts enter gameplay collision handling');
  assert.equal(first.level.startingValue, LEVEL_1.startingValue);
  assert.equal(first.level.maxOps, LEVEL_1.maxOps);
  assert.deepEqual(first.level.valueDomain, LEVEL_1.valueDomain);
  for (const [index, gate] of first.level.gates.entries()) {
    const sourceGate = LEVEL_1.gates[index];
    assert.deepEqual(
      { ...gate, x: sourceGate.x, y: sourceGate.y },
      sourceGate,
      `gate ${gate.id} gameplay properties must remain unchanged`,
    );
  }
  assert.equal(JSON.stringify(LEVEL_1), sourceBefore, 'generation must not mutate the source level');

  const fiftySeedRecords = [];
  const distinctArrangements = new Set();
  for (let seed = 41000; seed < 41050; seed += 1) {
    const generated = generateNumberDropArena(LEVEL_1, seed);
    const report = validateNumberDropArena({
      sourceLevel: LEVEL_1,
      generatedLevel: generated.level,
      seed,
      fingerprint: generated.metadata.fingerprint,
      deterministicFingerprint: generated.metadata.fingerprint,
    });
    assert.equal(report.valid, true, `seed ${seed} should validate: ${report.errors.join('; ')}`);
    fiftySeedRecords.push({ seed, fingerprint: generated.metadata.fingerprint, result: 'PASS' });
    distinctArrangements.add(JSON.stringify(positions(generated.level)));
  }
  assert.equal(distinctArrangements.size, 50, 'the 50-seed batch should produce 50 distinct obstacle arrangements');
  for (const record of fiftySeedRecords) {
    console.log(`50-seed validation: seed=${record.seed} fingerprint=${record.fingerprint} result=${record.result}`);
  }

  const app = new MarbleDropApp({
    level: LEVEL_1,
    arenaSeed: 12345,
    renderer: {},
    physics: {},
    assets: {},
    textureCache: {},
    visualTextureCache: {},
  });
  assert.deepEqual(positions(app.level), positions(first.level), 'app must assign validated generated level data');
  assert.deepEqual(app.getArenaMetadata(), first.metadata, 'arena diagnostics should be exposed on the app');
  assert.deepEqual(app.getGameSnapshot().arenaMetadata, first.metadata, 'runtime snapshot should expose arena diagnostics');

  const textureCache = { get: () => null, has: () => false };
  const game = new MarbleDropGame({ level: app.level, textureCache });
  game.start();
  assert.deepEqual(
    game.pegs.map(({ id, x, y }) => ({ id, x, y })),
    app.level.pegs.map(({ id, x, y }) => ({ id, x, y })),
    'existing runtime must build pegs from generated positions',
  );
  assert.deepEqual(
    game.gates.map(({ id, x, y }) => ({ id, x, y })),
    app.level.gates.map(({ id, x, y }) => ({ id, x, y })),
    'existing runtime must build gates from generated positions',
  );
  const arenaBeforeReset = positions(app.level);
  game.reset();
  assert.deepEqual(positions(app.level), arenaBeforeReset, 'reset must reuse the current arena');
  game.destroy();

  assert.equal(JSON.stringify(LEVEL_1), sourceBefore, 'runtime integration must not mutate the source level');
  console.log('PASS: procedural-arena.test.mjs');
}

runProceduralArenaTests();
