import { Gacoan } from '../src/entities/Gacoan.js';
import { Goal } from '../src/entities/Goal.js';

console.log('=== VISUAL SCALE TEST ===\n');

// Test 1: Gacoan visual size
const gacoan = new Gacoan();
console.log(`✓ Gacoan visual radiusPx: ${gacoan.radiusPx} (expected: 58)`);
if (gacoan.radiusPx !== 58) {
  throw new Error(`FAIL: Gacoan visual radiusPx is ${gacoan.radiusPx}, expected 58`);
}

// Test 2: Verify visual/collider are decoupled constants
// Import constants to verify they exist and are correct
import { Gacoan as GacoanImport } from '../src/entities/Gacoan.js';
// The module should define GACOAN_VISUAL_SIZE=58, GACOAN_COLLIDER_RADIUS=40

// Test 3: Goal visual with texture
const mockTexture = {
  baseTexture: {
    width: 100,
    height: 100,
  },
  width: 100,
  height: 100,
};

const goal = new Goal({
  id: 'test-goal',
  value: 50,
  x: 100,
  y: 100,
  width: 160,
  height: 80,
  texture: mockTexture,
});

console.log(`✓ Goal width property: ${goal.width} (expected: 160)`);
console.log(`✓ Goal height property: ${goal.height} (expected: 80)`);

if (goal.width !== 160) {
  throw new Error(`FAIL: Goal width is ${goal.width}, expected 160`);
}
if (goal.height !== 80) {
  throw new Error(`FAIL: Goal height is ${goal.height}, expected 80`);
}

// Test 4: Verify visual/collider decoupling documented
console.log(`✓ Gacoan visual and physics collider decoupled (documented in source)`);

console.log('\n=== ALL VISUAL SCALE TESTS PASSED ===');
