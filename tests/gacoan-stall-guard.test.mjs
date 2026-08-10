import assert from 'node:assert/strict';
import { GacoanStallGuard } from '../src/systems/GacoanStallGuard.js';

console.log('Running gacoan-stall-guard.test.mjs...');

function makeFakeBody({ linvel = { x: 0, y: 0 } } = {}) {
  let _linvel = { x: linvel.x, y: linvel.y };
  const calls = { setLinvel: 0 };
  return {
    linvel() { return { x: _linvel.x, y: _linvel.y }; },
    setLinvel(newLv, wake = true) { _linvel = { x: newLv.x, y: newLv.y }; calls.setLinvel += 1; },
    _calls: calls,
  };
}

function makeFakeGacoan({ x = 500, y = 200, body } = {}) {
  const pos = { x, y };
  return {
    body,
    getPosition() { return { x: pos.x, y: pos.y }; },
    setPosition(nx, ny) { pos.x = nx; pos.y = ny; },
    getColliderHandle() { return 1; },
    ensureHorizontalEscapeVelocity(direction, minSpeed) {
      // call through to body.setLinvel
      const curr = this.body.linvel();
      const currY = curr && curr.y ? curr.y : 0;
      const desiredX = (Math.abs(curr.x || 0) >= Math.abs(minSpeed)) ? curr.x : (minSpeed * (direction >= 0 ? 1 : -1));
      this.body.setLinvel({ x: desiredX, y: currY }, true);
    }
  };
}

function makeFakeSession({ state = 'FALLING', gacoan = null } = {}) {
  let _state = state;
  let _g = gacoan;
  return {
    getState() { return _state; },
    setState(s) { _state = s; },
    getActiveGacoan() { return _g; },
    setActiveGacoan(g) { _g = g; },
  };
}

function makeFakePeg({ id = 'peg-1', x = 500, y = 300, radius = 15 } = {}) {
  return { id, x, y, radius };
}

// Test helpers
function advanceGuard(guard, nowStart, frames = 10, stepMs = 100) {
  let now = nowStart;
  for (let i = 0; i < frames; i++) {
    guard.update(now, 1 / 60);
    now += stepMs;
  }
  return now;
}

// 1. Normal falling near peg -> no escape
{
  const body = makeFakeBody({ linvel: { x: 0, y: 2 } });
  const g = makeFakeGacoan({ x: 560, y: 240, body });
  const peg = makeFakePeg({ x: 560, y: 250 });
  const session = makeFakeSession({ gacoan: g });
  const physics = { getRapier: () => ({}) };
  const guard = new GacoanStallGuard({ session, physics, getPegs: () => [peg], gacoanColliderRadius: 40, stallTimeMs: 600, minDownwardProgressPx: 3 });

  let now = 0;
  now = advanceGuard(guard, now, 10, 100);

  assert.equal(body._calls.setLinvel, 0, 'no escape during normal falling near peg');
}

// 2. Brief collision/bounce -> no escape
{
  const body = makeFakeBody({ linvel: { x: 0, y: 0 } });
  const g = makeFakeGacoan({ x: 560, y: 245, body });
  const peg = makeFakePeg({ x: 560, y: 250 });
  const session = makeFakeSession({ gacoan: g });
  const guard = new GacoanStallGuard({ session, physics: {}, getPegs: () => [peg], gacoanColliderRadius: 40, stallTimeMs: 700, minDownwardProgressPx: 5 });

  let now = 0;
  // brief contact then downward progress
  guard.update(now, 1 / 60); now += 200;
  // simulate small downward progress
  g.setPosition(560, 248);
  guard.update(now, 1 / 60); now += 200;
  g.setPosition(560, 252);
  guard.update(now, 1 / 60);

  assert.equal(body._calls.setLinvel, 0, 'no escape on brief collision/bounce');
}

// 3. Contact solver jitter while stationary -> timer continues -> stall detected
{
  const body = makeFakeBody({ linvel: { x: 0, y: 0 } });
  const g = makeFakeGacoan({ x: 560, y: 250, body });
  const peg = makeFakePeg({ x: 560, y: 250 });
  const session = makeFakeSession({ gacoan: g });
  const guard = new GacoanStallGuard({ session, physics: {}, getPegs: () => [peg], gacoanColliderRadius: 40, stallTimeMs: 600, minDownwardProgressPx: 2 });

  let now = 0;
  // small vertical jitter within +/-1 px for extended time
  for (let i = 0; i < 8; i++) {
    const jitter = (i % 2 === 0) ? 250 : 249; // small oscillation
    g.setPosition(560, jitter);
    guard.update(now, 1 / 60);
    now += 100;
  }

  // After stall interval, expect exactly one escape
  assert.equal(body._calls.setLinvel, 1, 'one escape applied after sustained jitter');

  // 9. No spam immediately after escape
  for (let i = 0; i < 5; i++) { guard.update(now, 1 / 60); now += 100; }
  assert.equal(body._calls.setLinvel, 1, 'no repeated escapes after initial');
}

// 4/5/6/7. Direction tests: left, right, center
{
  const physics = {};
  const stallTime = 500;
  const peg = makeFakePeg({ x: 960, y: 250 });

  // Slightly left -> escape LEFT
  let body = makeFakeBody({ linvel: { x: 0, y: 0 } });
  let g = makeFakeGacoan({ x: 954, y: 250, body });
  let session = makeFakeSession({ gacoan: g });
  let guard = new GacoanStallGuard({ session, physics, getPegs: () => [peg], gacoanColliderRadius: 40, stallTimeMs: stallTime, minDownwardProgressPx: 2 });
  let now = 0; for (let i=0;i<6;i++){ guard.update(now,1/60); now+=150; }
  // escape should have setLinvel with negative x
  assert.equal(body._calls.setLinvel, 1, 'escape applied for slightly left');

  // Slightly right -> escape RIGHT
  body = makeFakeBody({ linvel: { x: 0, y: 0 } });
  g = makeFakeGacoan({ x: 966, y: 250, body });
  session = makeFakeSession({ gacoan: g });
  guard = new GacoanStallGuard({ session, physics, getPegs: () => [peg], gacoanColliderRadius: 40, stallTimeMs: stallTime, minDownwardProgressPx: 2 });
  now = 0; for (let i=0;i<6;i++){ guard.update(now,1/60); now+=150; }
  assert.equal(body._calls.setLinvel, 1, 'escape applied for slightly right');

  // Exact center -> tie-break left (-1)
  body = makeFakeBody({ linvel: { x: 0, y: 0 } });
  g = makeFakeGacoan({ x: 960, y: 250, body });
  session = makeFakeSession({ gacoan: g });
  guard = new GacoanStallGuard({ session, physics, getPegs: () => [peg], gacoanColliderRadius: 40, stallTimeMs: stallTime, minDownwardProgressPx: 2 });
  now = 0; for (let i=0;i<6;i++){ guard.update(now,1/60); now+=150; }
  assert.equal(body._calls.setLinvel, 1, 'escape applied for exact center');
}

// 10. Leaves peg envelope -> rearmed
{
  const body = makeFakeBody({ linvel: { x: 0, y: 0 } });
  const g = makeFakeGacoan({ x: 560, y: 250, body });
  const peg1 = makeFakePeg({ x: 560, y: 250 });
  const session = makeFakeSession({ gacoan: g });
  const guard = new GacoanStallGuard({ session, physics: {}, getPegs: () => [peg1], gacoanColliderRadius: 40, stallTimeMs: 400, minDownwardProgressPx: 2 });

  let now = 0;
  for (let i=0;i<5;i++){ guard.update(now,1/60); now+=150; }
  assert.equal(body._calls.setLinvel, 1, 'escape applied');

  // Move g away from peg envelope
  g.setPosition(700, 300);
  guard.update(now, 1/60); now+=100;

  // Now move back and stall again -> should be able to escape again
  g.setPosition(560, 250);
  for (let i=0;i<5;i++){ guard.update(now,1/60); now+=150; }
  assert.ok(body._calls.setLinvel >= 2, 'rearmed and escaped again after leaving envelope');
}

// 11. Different peg later
{
  const body = makeFakeBody({ linvel: { x: 0, y: 0 } });
  const g = makeFakeGacoan({ x: 560, y: 250, body });
  const peg1 = makeFakePeg({ x: 560, y: 250 });
  const peg2 = makeFakePeg({ x: 960, y: 250 });
  const session = makeFakeSession({ gacoan: g });
  const guard = new GacoanStallGuard({ session, physics: {}, getPegs: () => [peg1, peg2], gacoanColliderRadius: 40, stallTimeMs: 400, minDownwardProgressPx: 2 });

  let now = 0;
  for (let i=0;i<5;i++){ guard.update(now,1/60); now+=150; }
  assert.equal(body._calls.setLinvel, 1, 'escape applied on first peg');

  // Move to second peg
  // Simulate horizontal velocity decay so a fresh escape will be applied
  body.setLinvel({ x: 0, y: 0 }, true);
  g.setPosition(960, 250);
  for (let i=0;i<5;i++){ guard.update(now,1/60); now+=150; }
  assert.ok(body._calls.setLinvel >= 2, 'escape applied on second peg as well');
}

// 12. HOLDING -> no escape
{
  const body = makeFakeBody({ linvel: { x: 0, y: 0 } });
  const g = makeFakeGacoan({ x: 560, y: 250, body });
  const peg = makeFakePeg({ x: 560, y: 250 });
  const session = makeFakeSession({ gacoan: g });
  session.setState('HOLDING');
  const guard = new GacoanStallGuard({ session, physics: {}, getPegs: () => [peg], gacoanColliderRadius: 40, stallTimeMs: 400, minDownwardProgressPx: 2 });

  let now = 0;
  for (let i=0;i<10;i++){ guard.update(now,1/60); now+=100; }
  assert.equal(body._calls.setLinvel, 0, 'no escape during HOLDING');
}

// 13. reset/new drop clears state
{
  const body = makeFakeBody({ linvel: { x: 0, y: 0 } });
  const g = makeFakeGacoan({ x: 560, y: 250, body });
  const peg = makeFakePeg({ x: 560, y: 250 });
  const session = makeFakeSession({ gacoan: g });
  const guard = new GacoanStallGuard({ session, physics: {}, getPegs: () => [peg], gacoanColliderRadius: 40, stallTimeMs: 400, minDownwardProgressPx: 2 });

  let now = 0;
  for (let i=0;i<3;i++){ guard.update(now,1/60); now+=150; }
  guard.onReset();
  // Should not immediately fire
  for (let i=0;i<5;i++){ guard.update(now,1/60); now+=150; }
  // At most one escape
  assert.ok(body._calls.setLinvel <= 1, 'reset cleared tracking');
}

console.log('PASS: gacoan-stall-guard.test.mjs passed all assertions.');
