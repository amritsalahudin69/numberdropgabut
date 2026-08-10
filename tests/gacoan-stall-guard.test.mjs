import assert from 'node:assert/strict';
import { GacoanStallGuard } from '../src/systems/GacoanStallGuard.js';

console.log('Running gacoan-stall-guard.test.mjs...');

function makeFakeBody({ linvel = { x: 0, y: 0 } } = {}) {
  let _linvel = { x: linvel.x, y: linvel.y };
  const calls = { applyImpulse: 0, setLinvel: 0 };
  return {
    linvel() { return { x: _linvel.x, y: _linvel.y }; },
    setLinvel(newLv, wake = true) { _linvel = { x: newLv.x, y: newLv.y }; calls.setLinvel += 1; },
    applyImpulse(imp, wake = true) { if (imp && typeof imp.x === 'number') { _linvel.x += imp.x; } calls.applyImpulse += 1; },
    _calls: calls,
  };
}

function makeFakeGacoan({ x = 500, y = 200, body } = {}) {
  return {
    body,
    getPosition() { return { x, y }; },
    getColliderHandle() { return 1; },
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

// A. Normal free fall -> no impulse
{
  const body = makeFakeBody({ linvel: { x: 0, y: 2 } }); // vertical motion
  const g = makeFakeGacoan({ body });
  const session = makeFakeSession({ gacoan: g });
  const physics = { getRapier: () => ({}) };

  const guard = new GacoanStallGuard({ session, physics, stallTimeMs: 600, speedThresholdPx: 5 });

  // simulate 1000ms of updates with non-zero speed
  let now = 0;
  for (let i = 0; i < 10; i++) {
    guard.update(now, 1 / 60);
    now += 100;
  }

  assert.equal(body._calls.applyImpulse, 0, 'no impulse during normal fall');
  assert.equal(body._calls.setLinvel, 0, 'no setLinvel during normal fall');
}

// B/C. Brief near-zero velocity at bounce apex -> no impulse
{
  const body = makeFakeBody({ linvel: { x: 0.01, y: 0 } });
  const g = makeFakeGacoan({ body });
  const session = makeFakeSession({ gacoan: g });
  const physics = { getRapier: () => ({}) };
  const guard = new GacoanStallGuard({ session, physics, stallTimeMs: 700, speedThresholdPx: 5 });

  // Simulate near-zero for 200ms then movement
  let now = 0;
  for (let i = 0; i < 2; i++) { guard.update(now, 1 / 60); now += 100; }

  // movement resumes
  body.setLinvel({ x: 0.2, y: 0 }, true);
  guard.update(now, 1 / 60);
  now += 100;

  // continue running; should be no impulse
  for (let i = 0; i < 10; i++) { guard.update(now, 1 / 60); now += 100; }

  assert.equal(body._calls.applyImpulse, 0, 'no impulse on short apex');
}

// D. Continuous stalled Gacoan past threshold -> exactly one impulse
{
  const body = makeFakeBody({ linvel: { x: 0, y: 0 } });
  const g = makeFakeGacoan({ body });
  const session = makeFakeSession({ gacoan: g });
  const physics = { getRapier: () => ({}) };
  const guard = new GacoanStallGuard({ session, physics, stallTimeMs: 600, speedThresholdPx: 5 });

  let now = 0;
  // run frames until we cross threshold
  for (let i = 0; i < 10; i++) {
    guard.update(now, 1 / 60);
    now += 100;
  }

  // After ~1000ms, an impulse should have been applied exactly once
  assert.ok(body._calls.applyImpulse + body._calls.setLinvel === 1, 'exactly one escape impulse applied');

  // E. Continued frames immediately after impulse -> no spam
  for (let i = 0; i < 5; i++) { guard.update(now, 1 / 60); now += 100; }
  assert.ok(body._calls.applyImpulse + body._calls.setLinvel === 1, 'no spam after impulse');

  // F. Meaningful movement resumes -> guard rearms correctly
  body.setLinvel({ x: 0.5, y: 0 }, true); // meaningful horiz movement
  guard.update(now, 1 / 60);
  now += 100;

  // Now stall again
  body.setLinvel({ x: 0, y: 0 }, true);
  for (let i = 0; i < 8; i++) { guard.update(now, 1 / 60); now += 100; }

  assert.ok(body._calls.applyImpulse + body._calls.setLinvel >= 2, 'guard rearmed and applied second impulse after movement resumed');
}

// G/H. HOLDING and SUMMARY -> no anti-stall impulse
{
  const body = makeFakeBody({ linvel: { x: 0, y: 0 } });
  const g = makeFakeGacoan({ body });
  const session = makeFakeSession({ gacoan: g });
  session.setState('HOLDING');
  const physics = { getRapier: () => ({}) };
  const guard = new GacoanStallGuard({ session, physics, stallTimeMs: 600, speedThresholdPx: 5 });

  let now = 0;
  for (let i = 0; i < 10; i++) { guard.update(now, 1 / 60); now += 100; }
  assert.equal(body._calls.applyImpulse + body._calls.setLinvel, 0, 'no impulse during HOLDING');

  session.setState('SUMMARY');
  for (let i = 0; i < 10; i++) { guard.update(now, 1 / 60); now += 100; }
  assert.equal(body._calls.applyImpulse + body._calls.setLinvel, 0, 'no impulse during SUMMARY');
}

// I. reset/new drop clears previous stall state
{
  const body = makeFakeBody({ linvel: { x: 0, y: 0 } });
  const g = makeFakeGacoan({ body });
  const session = makeFakeSession({ gacoan: g });
  const physics = { getRapier: () => ({}) };
  const guard = new GacoanStallGuard({ session, physics, stallTimeMs: 600, speedThresholdPx: 5 });

  let now = 0;
  for (let i = 0; i < 8; i++) { guard.update(now, 1 / 60); now += 100; }

  // reset before impulse threshold reached
  guard.onReset();

  // Continue simulation -- should not immediately fire based on old timer
  for (let i = 0; i < 10; i++) { guard.update(now, 1 / 60); now += 100; }

  // At most one impulse from fresh run
  assert.ok(body._calls.applyImpulse + body._calls.setLinvel <= 1, 'reset cleared previous stall timer');
}

console.log('PASS: gacoan-stall-guard.test.mjs passed all assertions.');
