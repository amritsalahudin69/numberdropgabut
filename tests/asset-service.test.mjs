import assert from 'node:assert/strict';
import { AssetService } from '../src/systems/AssetService.js';

async function runAssetServiceTests() {
  console.log('Running asset-service.test.mjs...');

  // Mock asset index dataset for isolated behavioral testing
  const mockIndex = {
    '99': {
      png: '/assets/numbers/99.png',
      gif: '/assets/gif/99.gif',
    },
    '98': {
      png: '/assets/numbers/98.png',
      gif: null,
    },
  };

  // Test 6: service cannot operate before init
  const uninitService = new AssetService();
  assert.throws(() => {
    uninitService.getStaticUrl(99);
  }, /AssetService cannot operate before init/);

  // Initialize service with test seam / mock index
  const service = new AssetService();
  await service.init(mockIndex);

  // Test 1: static PNG resolution
  assert.equal(service.getStaticUrl(99), '/assets/numbers/99.png');
  assert.equal(service.getStaticUrl('98'), '/assets/numbers/98.png');

  // Test 2: GIF resolution
  assert.equal(service.getAnimationUrl(99), '/assets/gif/99.gif');
  assert.equal(service.getAnimationUrl(98), null);

  // Test 3: GIF -> PNG fallback behavior
  const feedbackWithGif = service.getFeedbackAsset(99);
  assert.deepEqual(feedbackWithGif, {
    type: 'gif',
    url: '/assets/gif/99.gif',
  });

  const feedbackFallbackPng = service.getFeedbackAsset(98);
  assert.deepEqual(feedbackFallbackPng, {
    type: 'png',
    url: '/assets/numbers/98.png',
  });

  // Test 4: missing PNG throws
  assert.throws(() => {
    service.getStaticUrl(999);
  }, /PNG asset missing for value: 999/);

  assert.throws(() => {
    service.getFeedbackAsset(999);
  }, /Asset missing for value: 999/);

  // Test 5: non-numeric value rejected
  assert.throws(() => {
    service.getStaticUrl('abc');
  }, /Non-numeric value rejected/);

  assert.throws(() => {
    service.getFeedbackAsset('invalid_key');
  }, /Non-numeric value rejected/);

  assert.equal(service.hasValue('xyz'), false);

  // Test 7: destroy resets service state
  service.destroy();
  assert.throws(() => {
    service.getStaticUrl(99);
  }, /AssetService cannot operate before init/);

  console.log('PASS: asset-service.test.mjs passed all behavioral assertions.');
}

runAssetServiceTests().catch((err) => {
  console.error('FAIL: asset-service.test.mjs failed with error:', err);
  process.exit(1);
});
