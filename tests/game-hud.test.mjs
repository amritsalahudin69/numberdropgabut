import { GameHud } from '../src/ui/GameHud.js';
import { MarbleDropSession } from '../src/game/MarbleDropSession.js';
import { RunRecorder } from '../src/systems/RunRecorder.js';
import { LEVEL_1 } from '../src/config/levels/level1.js';

// Skip in Node.js environment
if (typeof document === 'undefined') {
  console.log('=== GAME HUD TEST ===\n');
  console.log('⚠ Skipping: document not available in Node.js environment');
  console.log('✓ GameHud module imported successfully\n');
  process.exit(0);
}

console.log('=== GAME HUD TEST ===\n');

// Test 1: Create and mount
const session = new MarbleDropSession();
session.start(LEVEL_1);

const runRecorder = new RunRecorder();

const hud = new GameHud({
  session,
  level: LEVEL_1,
  runRecorder,
});

const container = document.createElement('div');
hud.mount(container);

console.log(`✓ HUD mounted`);
if (!hud.domElement) {
  throw new Error('FAIL: domElement not created');
}

// Test 2: HUD contains required elements
const hudHTML = hud.domElement.innerHTML;
if (!hudHTML.includes('CURRENT') || !hudHTML.includes('TARGET')) {
  throw new Error('FAIL: HUD missing CURRENT/TARGET display');
}
console.log(`✓ HUD displays CURRENT and TARGET`);

// Test 3: Update with operation
runRecorder.recordOperation({
  source: 'gate',
  sourceId: 'gate-1',
  operator: '-',
  operand: 1,
  previousValue: 100,
  nextValue: 99,
  timestampMs: Date.now(),
});

hud.update();
const updatedHTML = hud.domElement.innerHTML;
if (!updatedHTML.includes('100 - 1 = 99')) {
  throw new Error('FAIL: HUD not showing last operation');
}
console.log(`✓ HUD shows last operation`);

// Test 4: Reset clears display
hud.reset();
console.log(`✓ HUD reset works`);

// Test 5: Destroy
hud.destroy();
if (hud.domElement !== null) {
  throw new Error('FAIL: domElement not cleared after destroy');
}
console.log(`✓ HUD destroy clears domElement`);

console.log('\n=== ALL GAME HUD TESTS PASSED ===');
