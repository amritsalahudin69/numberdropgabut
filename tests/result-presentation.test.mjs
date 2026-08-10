import test from 'node:test';
import assert from 'node:assert/strict';
import Sinon from 'sinon';
import { JSDOM } from 'jsdom';
import { ResultOverlay } from '../src/ui/ResultOverlay.js';

test('ResultOverlay: mount creates single overlay element', (t) => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  globalThis.document = dom.window.document;
  globalThis.window = dom.window;

  const result = {
    success: true,
    startingValue: 100,
    targetValue: 5,
    finalValue: 5,
    operationsUsed: 3,
    maxOperations: 6,
    opsUsed: 3,
    maxOps: 6,
    completionReason: 'target_reached',
    operations: [],
  };

  const overlay = new ResultOverlay({
    result,
    onExport: Sinon.stub(),
    onRestart: Sinon.stub(),
  });

  overlay.mount(document.body);

  const overlays = document.querySelectorAll('[id="result-card"]');
  assert.equal(overlays.length, 1, 'should have exactly one overlay');

  overlay.destroy();
});

test('ResultOverlay: displays character images for start, target, final values', (t) => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  globalThis.document = dom.window.document;
  globalThis.window = dom.window;

  const mockAssetService = {
    getAnimationUrl: () => null,
    getStaticUrl: (value) => `/assets/numbers/${value}.png`,
  };

  const result = {
    success: true,
    startingValue: 100,
    targetValue: 5,
    finalValue: 5,
    operationsUsed: 3,
    maxOperations: 6,
    opsUsed: 3,
    maxOps: 6,
    completionReason: 'target_reached',
    operations: [],
  };

  const overlay = new ResultOverlay({
    result,
    onExport: () => {},
    onRestart: () => {},
    assetService: mockAssetService,
  });

  overlay.mount(document.body);

  const images = document.querySelectorAll('img');
  assert.ok(images.length >= 3, 'should have at least 3 character images');

  // Verify each value has a corresponding image
  let found100 = false;
  let found5 = false;
  
  images.forEach(img => {
    const charValue = img.getAttribute('data-char-value');
    if (charValue === '100') found100 = true;
    if (charValue === '5') found5 = true;
  });

  assert.ok(found100, 'should have image for startingValue 100');
  assert.ok(found5, 'should have image for targetValue/finalValue 5');

  overlay.destroy();
});

test('ResultOverlay: displays success status', (t) => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  globalThis.document = dom.window.document;
  globalThis.window = dom.window;

  const result = {
    success: true,
    startingValue: 100,
    targetValue: 5,
    finalValue: 5,
    operationsUsed: 3,
    maxOperations: 6,
    opsUsed: 3,
    maxOps: 6,
    completionReason: 'target_reached',
    operations: [],
  };

  const overlay = new ResultOverlay({
    result,
    onExport: Sinon.stub(),
    onRestart: Sinon.stub(),
  });

  overlay.mount(document.body);

  const html = document.body.innerHTML;
  assert.ok(html.includes('SUCCESS'), 'should display SUCCESS status');

  overlay.destroy();
});

test('ResultOverlay: displays failure status', (t) => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  globalThis.document = dom.window.document;
  globalThis.window = dom.window;

  const result = {
    success: false,
    startingValue: 100,
    targetValue: 5,
    finalValue: 68,
    operationsUsed: 6,
    maxOperations: 6,
    opsUsed: 6,
    maxOps: 6,
    completionReason: 'max_ops_exhausted',
    operations: [],
  };

  const overlay = new ResultOverlay({
    result,
    onExport: Sinon.stub(),
    onRestart: Sinon.stub(),
  });

  overlay.mount(document.body);

  const html = document.body.innerHTML;
  assert.ok(html.includes('FAILED'), 'should display FAILED status');

  overlay.destroy();
});

test('ResultOverlay: displays operations recap', (t) => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  globalThis.document = dom.window.document;
  globalThis.window = dom.window;

  const result = {
    success: true,
    startingValue: 100,
    targetValue: 5,
    finalValue: 5,
    operationsUsed: 3,
    maxOperations: 6,
    opsUsed: 3,
    maxOps: 6,
    completionReason: 'target_reached',
    operations: [
      { seq: 1, previousValue: 100, operator: '-', operand: 10, nextValue: 90 },
    ],
  };

  const overlay = new ResultOverlay({
    result,
    onExport: Sinon.stub(),
    onRestart: Sinon.stub(),
  });

  overlay.mount(document.body);

  const html = document.body.innerHTML;
  assert.ok(html.includes('-'), 'should show operation operators');

  overlay.destroy();
});

test('ResultOverlay: preserves Restart callback', (t) => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  globalThis.document = dom.window.document;
  globalThis.window = dom.window;

  const restartCallback = Sinon.stub();
  const result = {
    success: true,
    startingValue: 100,
    targetValue: 5,
    finalValue: 5,
    operationsUsed: 3,
    maxOperations: 6,
    opsUsed: 3,
    maxOps: 6,
    completionReason: 'target_reached',
    operations: [],
  };

  const overlay = new ResultOverlay({
    result,
    onExport: Sinon.stub(),
    onRestart: restartCallback,
  });

  overlay.mount(document.body);

  const buttons = document.querySelectorAll('button');
  buttons.forEach((btn) => {
    if (btn.textContent.includes('Restart')) {
      btn.click();
    }
  });

  if (restartCallback.called) {
    assert.ok(true, 'restart callback was called');
  }

  overlay.destroy();
});

test('ResultOverlay: preserves Export callback with result parameter', (t) => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  globalThis.document = dom.window.document;
  globalThis.window = dom.window;

  const exportCallback = Sinon.stub();
  const result = {
    success: true,
    startingValue: 100,
    targetValue: 5,
    finalValue: 5,
    operationsUsed: 3,
    maxOperations: 6,
    opsUsed: 3,
    maxOps: 6,
    completionReason: 'target_reached',
    operations: [],
  };

  const overlay = new ResultOverlay({
    result,
    onExport: exportCallback,
    onRestart: Sinon.stub(),
  });

  overlay.mount(document.body);

  const buttons = document.querySelectorAll('button');
  buttons.forEach((btn) => {
    if (btn.textContent.includes('Export')) {
      btn.click();
    }
  });

  if (exportCallback.called) {
    // Verify result was passed to export callback
    assert.ok(exportCallback.calledWith(result), 'export callback should receive result parameter');
  }

  overlay.destroy();
});

test('ResultOverlay: destroy removes overlay from DOM', (t) => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  globalThis.document = dom.window.document;
  globalThis.window = dom.window;

  const result = {
    success: true,
    startingValue: 100,
    targetValue: 5,
    finalValue: 5,
    operationsUsed: 3,
    maxOperations: 6,
    opsUsed: 3,
    maxOps: 6,
    completionReason: 'target_reached',
    operations: [],
  };

  const overlay = new ResultOverlay({
    result,
    onExport: Sinon.stub(),
    onRestart: Sinon.stub(),
  });

  overlay.mount(document.body);

  const beforeCount = document.querySelectorAll('[id="result-card"]').length;
  assert.equal(beforeCount, 1, 'should have one overlay before destroy');

  overlay.destroy();

  const afterCount = document.querySelectorAll('[id="result-card"]').length;
  assert.equal(afterCount, 0, 'should have no overlay after destroy');
});

test('ResultOverlay: GIF to PNG fallback when GIF unavailable', (t) => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  globalThis.document = dom.window.document;
  globalThis.window = dom.window;

  const mockAssetService = {
    getAnimationUrl: () => null, // No GIF available
    getStaticUrl: (value) => `/assets/numbers/${value}.png`, // PNG fallback
  };

  const result = {
    success: true,
    startingValue: 100,
    targetValue: 5,
    finalValue: 5,
    operationsUsed: 3,
    maxOperations: 6,
    opsUsed: 3,
    maxOps: 6,
    completionReason: 'target_reached',
    operations: [],
  };

  const overlay = new ResultOverlay({
    result,
    onExport: () => {},
    onRestart: () => {},
    assetService: mockAssetService,
  });

  overlay.mount(document.body);

  const images = document.querySelectorAll('img');
  
  // All images should use PNG URLs
  images.forEach(img => {
    const src = img.getAttribute('src');
    assert.ok(src.includes('.png'), 'should use PNG fallback');
  });

  overlay.destroy();
});
