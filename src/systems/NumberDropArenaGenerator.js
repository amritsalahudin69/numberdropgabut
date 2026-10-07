const MAX_LAYOUT_ATTEMPTS = 100;
const MAX_POSITION_ATTEMPTS = 160;
const PEG_CLEARANCE = 8;
const GATE_CLEARANCE = 8;
const SPAWN_RADIUS = 60;

function cloneData(value) {
  if (Array.isArray(value)) return value.map(cloneData);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, cloneData(child)]));
  }
  return value;
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function normalizeSeed(seed) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
    throw new Error('Arena seed must be an unsigned 32-bit integer');
  }
  return seed >>> 0;
}

function createRandom(seed) {
  let state = seed;
  return () => {
    let value = state += 0x6d2b79f5;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 0x100000000;
  };
}

function randomInteger(random, min, max) {
  return min + Math.floor(random() * (max - min + 1));
}

function isDynamicGate(gate) {
  return gate.speed > 0 && gate.range > 0;
}

function fingerprintFor(level, seed) {
  const canonical = stableStringify({
    seed,
    pegs: level.pegs.map(({ id, x, y }) => ({ id, x, y })),
    gates: level.gates.filter(isDynamicGate).map(({ id, x, y }) => ({ id, x, y })),
  });
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let index = 0; index < canonical.length; index += 1) {
    const code = canonical.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193);
    second = Math.imul(second ^ (code + index), 0x85ebca6b);
  }
  return `nd-arena-v1-${(first >>> 0).toString(16).padStart(8, '0')}${(second >>> 0).toString(16).padStart(8, '0')}`;
}

function validateSource(sourceLevel) {
  if (!sourceLevel || typeof sourceLevel !== 'object') throw new Error('Source level must be an object');
  if (!Array.isArray(sourceLevel.pegs) || !Array.isArray(sourceLevel.gates) || !Array.isArray(sourceLevel.goals)) {
    throw new Error('Source level must define pegs, gates, and goals arrays');
  }
  if (!sourceLevel.world || !Number.isFinite(sourceLevel.world.width) || !Number.isFinite(sourceLevel.world.height)) {
    throw new Error('Source level must define finite world width and height');
  }
  if (!sourceLevel.dropZone || !Number.isFinite(sourceLevel.dropZone.minX)
    || !Number.isFinite(sourceLevel.dropZone.maxX) || !Number.isFinite(sourceLevel.dropZone.y)) {
    throw new Error('Source level must define finite dropZone minX, maxX, and y');
  }
  for (const peg of sourceLevel.pegs) {
    if (!peg.id || ![peg.x, peg.y, peg.radius].every(Number.isFinite) || peg.radius <= 0) {
      throw new Error('Each source peg must define an id, finite position, and positive radius');
    }
  }
  for (const gate of sourceLevel.gates) {
    if (!gate.id || ![gate.x, gate.y, gate.width, gate.height, gate.speed, gate.range].every(Number.isFinite)
      || gate.width <= 0 || gate.height <= 0 || gate.speed < 0 || gate.range < 0) {
      throw new Error('Each source gate must define an id, finite position/movement, and positive dimensions');
    }
  }
  for (const goal of sourceLevel.goals) {
    if (!goal.id || ![goal.x, goal.y, goal.width, goal.height].every(Number.isFinite)
      || goal.width <= 0 || goal.height <= 0) {
      throw new Error('Each source goal must define an id, finite position, and positive dimensions');
    }
  }
  if (sourceLevel.goals.length === 0) throw new Error('Source level must define at least one goal');
}

function pegBounds(peg) {
  return {
    minX: peg.x - peg.radius,
    maxX: peg.x + peg.radius,
    minY: peg.y - peg.radius,
    maxY: peg.y + peg.radius,
  };
}

function gateBounds(gate) {
  const halfWidth = gate.width / 2;
  const movementRange = isDynamicGate(gate) ? gate.range : 0;
  return {
    minX: gate.x - movementRange - halfWidth,
    maxX: gate.x + movementRange + halfWidth,
    minY: gate.y - gate.height / 2,
    maxY: gate.y + gate.height / 2,
  };
}

function rectsOverlap(first, second, clearance = 0) {
  return first.minX < second.maxX + clearance
    && first.maxX + clearance > second.minX
    && first.minY < second.maxY + clearance
    && first.maxY + clearance > second.minY;
}

function circleOverlapsRect(circle, rect, clearance = 0) {
  const nearestX = Math.max(rect.minX, Math.min(circle.x, rect.maxX));
  const nearestY = Math.max(rect.minY, Math.min(circle.y, rect.maxY));
  return Math.hypot(circle.x - nearestX, circle.y - nearestY) < circle.radius + clearance;
}

function obstacleBounds(obstacle) {
  if (obstacle.type === 'moving-block') {
    const halfWidth = obstacle.width / 2;
    const halfHeight = obstacle.height / 2;
    const xTravel = obstacle.axis === 'x' ? obstacle.distance : 0;
    const yTravel = obstacle.axis === 'y' ? obstacle.distance : 0;
    return {
      minX: obstacle.x - xTravel - halfWidth,
      maxX: obstacle.x + xTravel + halfWidth,
      minY: obstacle.y - yTravel - halfHeight,
      maxY: obstacle.y + yTravel + halfHeight,
    };
  }
  if (obstacle.type === 'gear') {
    return {
      minX: obstacle.x - obstacle.radius,
      maxX: obstacle.x + obstacle.radius,
      minY: obstacle.y - obstacle.radius,
      maxY: obstacle.y + obstacle.radius,
    };
  }
  if (obstacle.type === 'hammer') {
    const swing = Math.min(78, Math.max(10, obstacle.swingAngleDeg ?? 52)) * Math.PI / 180;
    const headRadius = obstacle.headRadius ?? 34;
    const halfArmWidth = (obstacle.armWidth ?? 14) / 2;
    const headExtentX = Math.sin(swing) * obstacle.length + headRadius;
    const headMinY = obstacle.y + Math.cos(swing) * obstacle.length - headRadius;
    const headMaxY = obstacle.y + obstacle.length + headRadius;
    return {
      minX: Math.min(obstacle.x - halfArmWidth, obstacle.x - headExtentX),
      maxX: Math.max(obstacle.x + halfArmWidth, obstacle.x + headExtentX),
      minY: Math.min(obstacle.y, headMinY),
      maxY: headMaxY,
    };
  }
  return null;
}

function pegOverlapsObstacle(peg, obstacle) {
  if (obstacle.type === 'gear') {
    return Math.hypot(peg.x - obstacle.x, peg.y - obstacle.y) < peg.radius + obstacle.radius + PEG_CLEARANCE;
  }
  if (obstacle.type === 'hammer') {
    const swing = Math.min(78, Math.max(10, obstacle.swingAngleDeg ?? 52)) * Math.PI / 180;
    const headRadius = obstacle.headRadius ?? 34;
    const collisionRadius = peg.radius + headRadius + PEG_CLEARANCE;
    const samples = 96;
    for (let index = 0; index <= samples; index += 1) {
      const angle = -swing + (2 * swing * index) / samples;
      const headX = obstacle.x - Math.sin(angle) * obstacle.length;
      const headY = obstacle.y + Math.cos(angle) * obstacle.length;
      if (Math.hypot(peg.x - headX, peg.y - headY) < collisionRadius) return true;
    }
    return false;
  }
  const bounds = obstacleBounds(obstacle);
  return bounds ? circleOverlapsRect(peg, bounds, PEG_CLEARANCE) : false;
}

function createCandidate(sourceLevel, seed) {
  const random = createRandom(seed);
  const level = cloneData(sourceLevel);
  const worldWidth = sourceLevel.world.width;

  for (let index = 0; index < level.pegs.length; index += 1) {
    const peg = level.pegs[index];
    const sourcePeg = sourceLevel.pegs[index];
    const radius = sourcePeg.radius;
    let placed = false;

    for (let attempt = 0; attempt < MAX_POSITION_ATTEMPTS; attempt += 1) {
      const x = randomInteger(random, Math.ceil(radius), Math.floor(worldWidth - radius));
      const candidate = { ...peg, x, y: sourcePeg.y };
      const overlapsPeg = level.pegs.slice(0, index).some((other) => (
        Math.hypot(candidate.x - other.x, candidate.y - other.y)
          < candidate.radius + other.radius + PEG_CLEARANCE
      ));
      const overlapsObstacle = (sourceLevel.obstacles || []).some((obstacle) => pegOverlapsObstacle(candidate, obstacle));
      if (!overlapsPeg && !overlapsObstacle) {
        peg.x = x;
        peg.y = sourcePeg.y;
        placed = true;
        break;
      }
    }
    if (!placed) return null;
  }

  for (let index = 0; index < level.gates.length; index += 1) {
    const gate = level.gates[index];
    const sourceGate = sourceLevel.gates[index];
    if (!isDynamicGate(sourceGate)) continue;
    const minX = Math.ceil(gate.width / 2 + gate.range);
    const maxX = Math.floor(worldWidth - gate.width / 2 - gate.range);
    if (minX > maxX) return null;
    let placed = false;

    for (let attempt = 0; attempt < MAX_POSITION_ATTEMPTS; attempt += 1) {
      const x = randomInteger(random, minX, maxX);
      const candidate = { ...gate, x, y: sourceGate.y };
      const bounds = gateBounds(candidate);
      const overlapsGate = level.gates.slice(0, index).some((other) => (
        rectsOverlap(bounds, gateBounds(other), GATE_CLEARANCE)
      ));
      const overlapsPeg = level.pegs.some((peg) => circleOverlapsRect(peg, bounds, GATE_CLEARANCE));
      const overlapsObstacle = (sourceLevel.obstacles || []).some((obstacle) => {
        const obstacleRect = obstacleBounds(obstacle);
        return obstacleRect && rectsOverlap(bounds, obstacleRect, GATE_CLEARANCE);
      });
      const overlapsGoal = level.goals.some((goal) => rectsOverlap(bounds, {
        minX: goal.x - goal.width / 2,
        maxX: goal.x + goal.width / 2,
        minY: goal.y - goal.height / 2,
        maxY: goal.y + goal.height / 2,
      }, GATE_CLEARANCE));
      if (!overlapsGate && !overlapsPeg && !overlapsObstacle && !overlapsGoal) {
        gate.x = x;
        gate.y = sourceGate.y;
        placed = true;
        break;
      }
    }
    if (!placed) return null;
  }

  return level;
}

function levelWithoutGeneratedPositions(level) {
  return {
    ...level,
    pegs: level.pegs.map(({ x: _x, y: _y, ...peg }) => peg),
    gates: level.gates.map(({ x: _x, y: _y, ...gate }) => gate),
  };
}

function collectKeys(value, keys = []) {
  if (!value || typeof value !== 'object') return keys;
  if (Array.isArray(value)) {
    value.forEach((item) => collectKeys(item, keys));
    return keys;
  }
  for (const [key, child] of Object.entries(value)) {
    keys.push(key.toLowerCase());
    collectKeys(child, keys);
  }
  return keys;
}

function geometryErrors(sourceLevel, generatedLevel) {
  const errors = [];
  const { width, height } = sourceLevel.world;
  const dropZone = sourceLevel.dropZone;
  const obstacles = sourceLevel.obstacles || [];
  const goals = generatedLevel.goals;

  for (const [kind, objects] of [['peg', generatedLevel.pegs], ['gate', generatedLevel.gates]]) {
    for (const object of objects) {
      if (!Number.isFinite(object.x) || !Number.isFinite(object.y)) {
        errors.push(`${kind} ${object.id} has non-finite coordinates`);
      }
    }
  }

  for (const peg of generatedLevel.pegs) {
    if (![peg.radius, peg.x, peg.y].every(Number.isFinite) || peg.radius <= 0) continue;
    if (peg.x - peg.radius < 0 || peg.x + peg.radius > width || peg.y - peg.radius < 0 || peg.y + peg.radius > height) {
      errors.push(`peg ${peg.id} is outside world bounds`);
    }
    if (peg.y - peg.radius <= dropZone.y + SPAWN_RADIUS) {
      errors.push(`peg ${peg.id} obstructs the Gacoan spawn band`);
    }
    if (peg.y + peg.radius >= Math.min(...goals.map((goal) => goal.y - goal.height / 2)) - SPAWN_RADIUS) {
      errors.push(`peg ${peg.id} obstructs the goal approach region`);
    }
    for (const obstacle of obstacles) {
      if (pegOverlapsObstacle(peg, obstacle)) errors.push(`peg ${peg.id} overlaps obstacle ${obstacle.id}`);
    }
  }

  for (let index = 0; index < generatedLevel.pegs.length; index += 1) {
    const peg = generatedLevel.pegs[index];
    for (const other of generatedLevel.pegs.slice(index + 1)) {
      if (Math.hypot(peg.x - other.x, peg.y - other.y) < peg.radius + other.radius + PEG_CLEARANCE) {
        errors.push(`pegs ${peg.id} and ${other.id} overlap`);
      }
    }
  }

  const gateSweeps = [];
  for (const gate of generatedLevel.gates) {
    if (![gate.width, gate.height, gate.range, gate.speed].every(Number.isFinite)
      || gate.width <= 0 || gate.height <= 0 || gate.range < 0) {
      errors.push(`gate ${gate.id} has invalid dimensions or movement`);
      continue;
    }
    const bounds = gateBounds(gate);
    if (bounds.minX < 0 || bounds.maxX > width || bounds.minY < 0 || bounds.maxY > height) {
      errors.push(`gate ${gate.id} movement sweep leaves world bounds`);
    }
    if (bounds.minY <= dropZone.y + SPAWN_RADIUS && bounds.maxY >= dropZone.y - SPAWN_RADIUS) {
      errors.push(`gate ${gate.id} obstructs the Gacoan spawn band`);
    }
    if (bounds.maxY >= Math.min(...goals.map((goal) => goal.y - goal.height / 2)) - SPAWN_RADIUS) {
      errors.push(`gate ${gate.id} obstructs the goal approach region`);
    }
    for (const peg of generatedLevel.pegs) {
      if (circleOverlapsRect(peg, bounds, GATE_CLEARANCE)) {
        errors.push(`gate ${gate.id} movement sweep overlaps peg ${peg.id}`);
      }
    }
    for (const obstacle of obstacles) {
      const obstacleRect = obstacleBounds(obstacle);
      if (obstacleRect && rectsOverlap(bounds, obstacleRect, GATE_CLEARANCE)) {
        errors.push(`gate ${gate.id} movement sweep overlaps obstacle ${obstacle.id}`);
      }
    }
    for (const goal of goals) {
      const goalBounds = {
        minX: goal.x - goal.width / 2,
        maxX: goal.x + goal.width / 2,
        minY: goal.y - goal.height / 2,
        maxY: goal.y + goal.height / 2,
      };
      if (rectsOverlap(bounds, goalBounds, GATE_CLEARANCE)) {
        errors.push(`gate ${gate.id} movement sweep overlaps goal ${goal.id}`);
      }
    }
    gateSweeps.push({ gate, bounds });
  }

  for (let index = 0; index < gateSweeps.length; index += 1) {
    for (const other of gateSweeps.slice(index + 1)) {
      if (rectsOverlap(gateSweeps[index].bounds, other.bounds, GATE_CLEARANCE)) {
        errors.push(`gate sweeps ${gateSweeps[index].gate.id} and ${other.gate.id} overlap`);
      }
    }
  }
  const totalGateSweepWidth = gateSweeps.reduce((sum, { gate }) => {
    const movementRange = isDynamicGate(gate) ? gate.range : 0;
    return sum + gate.width + 2 * movementRange;
  }, 0);
  if (totalGateSweepWidth >= width * 0.85) errors.push('gate movement envelopes form an excessive horizontal barrier');

  const spawnBounds = {
    minX: dropZone.minX - SPAWN_RADIUS,
    maxX: dropZone.maxX + SPAWN_RADIUS,
    minY: dropZone.y - SPAWN_RADIUS,
    maxY: dropZone.y + SPAWN_RADIUS,
  };
  for (const gate of generatedLevel.gates) {
    if (rectsOverlap(gateBounds(gate), spawnBounds)) errors.push(`gate ${gate.id} obstructs Gacoan spawn`);
  }
  if (goals.some((goal) => ![goal.x, goal.y, goal.width, goal.height].every(Number.isFinite))) {
    errors.push('goal area has invalid geometry');
  }
  return errors;
}

export function validateNumberDropArena({
  sourceLevel,
  generatedLevel,
  seed,
  fingerprint,
  deterministicFingerprint,
  diversityReference,
} = {}) {
  const errors = [];
  if (!sourceLevel || typeof sourceLevel !== 'object') errors.push('source level is missing');
  if (!generatedLevel || typeof generatedLevel !== 'object') errors.push('generated level is missing');
  if (errors.length) return { valid: false, errors };

  for (const field of ['pegs', 'gates', 'goals']) {
    if (!Array.isArray(sourceLevel[field]) || !Array.isArray(generatedLevel[field])) {
      errors.push(`${field} arrays are required`);
    } else if (sourceLevel[field].length !== generatedLevel[field].length) {
      errors.push(`${field} count changed`);
    }
  }
  if (errors.length) return { valid: false, errors };

  for (const field of ['pegs', 'gates']) {
    sourceLevel[field].forEach((sourceObject, index) => {
      const generatedObject = generatedLevel[field][index];
      if (!generatedObject || sourceObject.id !== generatedObject.id) {
        errors.push(`${field} identity/order changed at index ${index}`);
      } else if (Object.prototype.hasOwnProperty.call(sourceObject, 'type')
        && sourceObject.type !== generatedObject.type) {
        errors.push(`${field} type changed for ${sourceObject.id}`);
      }
    });
  }
  if (stableStringify(levelWithoutGeneratedPositions(sourceLevel))
    !== stableStringify(levelWithoutGeneratedPositions(generatedLevel))) {
    errors.push('protected gameplay or non-positional level data changed');
  }

  const prohibitedKey = collectKeys(generatedLevel).find((key) => /wall.?bounce|ripple|wall.?reflect/.test(key));
  if (prohibitedKey) errors.push(`prohibited wall-bounce/ripple semantic found: ${prohibitedKey}`);

  try {
    errors.push(...geometryErrors(sourceLevel, generatedLevel));
  } catch (error) {
    errors.push(`geometry validation failed: ${error.message}`);
  }

  if (seed !== undefined) {
    try {
      const normalizedSeed = normalizeSeed(seed);
      const actualFingerprint = fingerprintFor(generatedLevel, normalizedSeed);
      if (fingerprint && fingerprint !== actualFingerprint) errors.push('provided fingerprint does not match generated arrangement');
      if (deterministicFingerprint && deterministicFingerprint !== actualFingerprint) {
        errors.push('same-seed generation produced a different fingerprint');
      }
      if (diversityReference) {
        const referenceSeed = normalizeSeed(diversityReference.seed);
        if (referenceSeed === normalizedSeed) errors.push('diversity reference must use a different seed');
        const referenceFingerprint = fingerprintFor(diversityReference.level, referenceSeed);
        if (diversityReference.fingerprint && diversityReference.fingerprint !== referenceFingerprint) {
          errors.push('diversity reference fingerprint does not match its arrangement');
        }
        if (referenceFingerprint === actualFingerprint
          || stableStringify(positionsForFingerprint(generatedLevel)) === stableStringify(positionsForFingerprint(diversityReference.level))) {
          errors.push('different seeds produced the same obstacle arrangement');
        }
      }
    } catch (error) {
      errors.push(error.message);
    }
  }

  function positionsForFingerprint(level) {
    return {
      pegs: level.pegs.map(({ id, x, y }) => ({ id, x, y })),
      gates: level.gates.filter(isDynamicGate).map(({ id, x, y }) => ({ id, x, y })),
    };
  }

  return { valid: errors.length === 0, errors };
}

export function generateNumberDropArena(sourceLevel, seed) {
  validateSource(sourceLevel);
  const arenaSeed = normalizeSeed(seed);
  let generatedLevel = null;

  for (let attempt = 0; attempt < MAX_LAYOUT_ATTEMPTS; attempt += 1) {
    generatedLevel = createCandidate(sourceLevel, arenaSeed);
    if (!generatedLevel) continue;
    const report = validateNumberDropArena({ sourceLevel, generatedLevel, seed: arenaSeed });
    if (report.valid) break;
    generatedLevel = null;
  }
  if (!generatedLevel) {
    throw new Error(`Unable to generate a valid MarbleDrop arena for seed ${arenaSeed} after ${MAX_LAYOUT_ATTEMPTS} attempts`);
  }

  const fingerprint = fingerprintFor(generatedLevel, arenaSeed);
  const deterministicReplay = createCandidate(sourceLevel, arenaSeed);
  const deterministicFingerprint = deterministicReplay
    ? fingerprintFor(deterministicReplay, arenaSeed)
    : null;
  const report = validateNumberDropArena({
    sourceLevel,
    generatedLevel,
    seed: arenaSeed,
    fingerprint,
    deterministicFingerprint,
  });
  if (!report.valid) throw new Error(`Generated MarbleDrop arena failed validation: ${report.errors.join('; ')}`);

  return {
    level: generatedLevel,
    metadata: {
      levelId: generatedLevel.id,
      arenaSeed,
      fingerprint,
      pegCount: generatedLevel.pegs.length,
      dynamicGateCount: generatedLevel.gates.filter(isDynamicGate).length,
    },
  };
}

export function createNumberDropArenaSeed() {
  if (!globalThis.crypto || typeof globalThis.crypto.getRandomValues !== 'function') {
    throw new Error('Web Crypto is required to choose an arena seed; provide arenaSeed explicitly');
  }
  return globalThis.crypto.getRandomValues(new Uint32Array(1))[0];
}
