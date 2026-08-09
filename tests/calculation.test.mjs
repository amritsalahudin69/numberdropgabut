import assert from 'node:assert/strict';
import { CalculationService } from '../src/systems/CalculationService.js';

function runCalculationTests() {
  console.log('Running calculation.test.mjs...');

  // Test standard arithmetic
  const r1 = CalculationService.compute(100, '-', 1);
  assert.equal(r1.ok, true);
  assert.equal(r1.value, 99);

  const r2 = CalculationService.compute(99, '-', 6);
  assert.equal(r2.ok, true);
  assert.equal(r2.value, 93);

  const r3 = CalculationService.compute(10, '+', 5);
  assert.equal(r3.ok, true);
  assert.equal(r3.value, 15);

  const r4 = CalculationService.compute(10, '*', 2);
  assert.equal(r4.ok, true);
  assert.equal(r4.value, 20);

  const r5 = CalculationService.compute(10, '/', 2);
  assert.equal(r5.ok, true);
  assert.equal(r5.value, 5);

  // Test normalized operator aliases ('x', ':')
  const rMult = CalculationService.compute(10, 'x', 2);
  assert.equal(rMult.ok, true);
  assert.equal(rMult.value, 20);

  // Test division by zero = FAIL
  const rZero = CalculationService.compute(10, '/', 0);
  assert.equal(rZero.ok, false);
  assert.match(rZero.error, /Division by zero/);

  // Test fractional result = FAIL
  const rFrac = CalculationService.compute(7, '/', 2);
  assert.equal(rFrac.ok, false);
  assert.match(rFrac.error, /Non-integer result/);

  // Test unsupported operator = FAIL
  const rOp = CalculationService.compute(10, '%', 2);
  assert.equal(rOp.ok, false);
  assert.match(rOp.error, /Unsupported operator/);

  // Test out-of-domain = FAIL
  const rDomainMin = CalculationService.compute(5, '-', 10, { min: 0, max: 2000 });
  assert.equal(rDomainMin.ok, false);
  assert.match(rDomainMin.error, /below minimum domain threshold/);

  const rDomainMax = CalculationService.compute(1500, '+', 600, { min: 0, max: 2000 });
  assert.equal(rDomainMax.ok, false);
  assert.match(rDomainMax.error, /exceeds maximum domain threshold/);

  console.log('PASS: calculation.test.mjs passed all assertions.');
}

runCalculationTests();
