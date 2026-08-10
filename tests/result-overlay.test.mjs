import { ResultOverlay } from '../src/ui/ResultOverlay.js';

// Skip in Node.js environment
if (typeof document === 'undefined') {
  console.log('=== RESULT OVERLAY TEST ===\n');
  console.log('⚠ Skipping: document not available in Node.js environment');
  console.log('✓ ResultOverlay module imported successfully\n');
  process.exit(0);
}

console.log('=== RESULT OVERLAY TEST ===\n');

// Test 1: Create overlay with result
const mockResult = {
  schemaVersion: 1,
  game: 'marbledrop',
  levelId: 'level-1',
  startingValue: 100,
  targetValue: 50,
  finalValue: 50,
  maxOps: 6,
  opsUsed: 3,
  opsRemaining: 3,
  success: true,
  completionReason: 'target_reached',
  operations: [
    { seq: 1, previousValue: 100, operator: '-', operand: 1, nextValue: 99 },
    { seq: 2, previousValue: 99, operator: '-', operand: 1, nextValue: 98 },
    { seq: 3, previousValue: 98, operator: '-', operand: 48, nextValue: 50 },
  ],
  collisions: [],
  evolutions: [
    { seq: 1, previousValue: 100, nextValue: 99, source: 'gate', sourceId: 'gate-1' },
    { seq: 2, previousValue: 99, nextValue: 98, source: 'gate', sourceId: 'gate-1' },
    { seq: 3, previousValue: 98, nextValue: 50, source: 'goal', sourceId: 'goal-1' },
  ],
  startedAt: Date.now() - 30000,
  completedAt: Date.now(),
};

let restartCalled = false;
let exportCalled = false;

const overlay = new ResultOverlay({
  result: mockResult,
  onRestart: () => { restartCalled = true; },
  onExport: () => { exportCalled = true; },
});

const container = document.createElement('div');
overlay.mount(container);

console.log(`✓ ResultOverlay mounted`);
if (!overlay.cardElement) {
  throw new Error('FAIL: cardElement not created');
}

// Test 2: Card contains result data
const cardHTML = overlay.cardElement.innerHTML;
if (!cardHTML.includes('SUCCESS') || !cardHTML.includes('50') || !cardHTML.includes('target_reached')) {
  throw new Error('FAIL: Card missing result data');
}
console.log(`✓ Card displays success/final value/completion reason`);

// Test 3: Card shows operations
if (!cardHTML.includes('seq 1:') || !cardHTML.includes('100 - 1 = 99')) {
  throw new Error('FAIL: Card missing operation recap');
}
console.log(`✓ Card displays operation recap`);

// Test 4: Restart button exists and works
const restartBtn = overlay.cardElement.querySelector('#restart-btn');
if (!restartBtn) {
  throw new Error('FAIL: Restart button not found');
}
restartBtn.click();
if (!restartCalled) {
  throw new Error('FAIL: Restart callback not invoked');
}
console.log(`✓ Restart button exists and callback fires`);

// Test 5: Export button exists and works
const exportBtn = overlay.cardElement.querySelector('#export-btn');
if (!exportBtn) {
  throw new Error('FAIL: Export button not found');
}
exportBtn.click();
if (!exportCalled) {
  throw new Error('FAIL: Export callback not invoked');
}
console.log(`✓ Export button exists and callback fires`);

// Test 6: Background overlay exists
if (!overlay.overlayBg) {
  throw new Error('FAIL: overlayBg not created');
}
console.log(`✓ Background overlay exists`);

// Test 7: Destroy removes elements
overlay.destroy();
if (overlay.cardElement !== null || overlay.overlayBg !== null) {
  throw new Error('FAIL: elements not cleared after destroy');
}
console.log(`✓ Destroy clears all elements`);

// Test 8: No duplicate overlay on second mount
const overlay2 = new ResultOverlay({ result: mockResult });
const container2 = document.createElement('div');
overlay2.mount(container2);
overlay2.mount(container2);
const cardCount = container2.querySelectorAll('#result-card').length;
if (cardCount > 1) {
  throw new Error('FAIL: Duplicate overlay detected');
}
overlay2.destroy();
console.log(`✓ No duplicate overlay`);

console.log('\n=== ALL RESULT OVERLAY TESTS PASSED ===');
