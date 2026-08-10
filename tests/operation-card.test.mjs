import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { OperationCard } from '../src/ui/OperationCard.js';

test('OperationCard: mount creates DOM elements', (t) => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  globalThis.document = dom.window.document;
  globalThis.window = dom.window;

  const card = new OperationCard();
  const container = document.body;
  
  card.mount(container);
  
  assert.ok(card.domElement, 'domElement should exist');
  assert.ok(card.overlayBg, 'overlayBg should exist');
  assert.equal(card.domElement.id, 'operation-card', 'should have correct id');
  
  card.destroy();
});

test('OperationCard: show displays character images for numeric values', (t) => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  globalThis.document = dom.window.document;
  globalThis.window = dom.window;

  const mockAssetService = {
    getAnimationUrl: (value) => {
      // Mock: return GIF URL for specific values
      return null;
    },
    getStaticUrl: (value) => {
      // Mock: return PNG URL for numeric values
      return `/assets/numbers/${value}.png`;
    },
  };

  const card = new OperationCard({ assetService: mockAssetService });
  card.mount(document.body);
  
  card.show({
    previousValue: 100,
    operator: '-',
    operand: 7,
    nextValue: 93,
  });
  
  const images = card.domElement.querySelectorAll('img');
  assert.ok(images.length >= 3, 'should have at least 3 images for previousValue, operand, and nextValue');
  
  // Verify image src attributes contain correct values
  let found100 = false;
  let found7 = false;
  let found93 = false;
  
  images.forEach(img => {
    const charValue = img.getAttribute('data-char-value');
    if (charValue === '100') found100 = true;
    if (charValue === '7') found7 = true;
    if (charValue === '93') found93 = true;
  });
  
  assert.ok(found100, 'should have image for previousValue 100');
  assert.ok(found7, 'should have image for operand 7');
  assert.ok(found93, 'should have image for nextValue 93');
  
  // Operator should be text
  const html = card.domElement.innerHTML;
  assert.ok(html.includes('-'), 'should display operator as text');
  
  assert.equal(card.domElement.style.display, 'block', 'should be visible');
  
  card.destroy();
});

test('OperationCard: uses PNG fallback when GIF unavailable', (t) => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  globalThis.document = dom.window.document;
  globalThis.window = dom.window;

  const mockAssetService = {
    getAnimationUrl: () => null, // No GIF available
    getStaticUrl: (value) => `/assets/numbers/${value}.png`, // PNG fallback
  };

  const card = new OperationCard({ assetService: mockAssetService });
  card.mount(document.body);
  
  card.show({
    previousValue: 100,
    operator: '-',
    operand: 7,
    nextValue: 93,
  });
  
  const images = card.domElement.querySelectorAll('img');
  assert.ok(images.length >= 3, 'should have images');
  
  // All images should use PNG URLs
  images.forEach(img => {
    const src = img.getAttribute('src');
    assert.ok(src.includes('.png'), 'should use PNG fallback');
  });
  
  card.destroy();
});

test('OperationCard: show updates existing card without duplication', (t) => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  globalThis.document = dom.window.document;
  globalThis.window = dom.window;

  const card = new OperationCard();
  card.mount(document.body);
  
  // Show first operation
  card.show({
    previousValue: 100,
    operator: '-',
    operand: 7,
    nextValue: 93,
  });
  
  const firstHtml = card.domElement.innerHTML;
  assert.ok(firstHtml.includes('93'), 'should show first result');
  
  // Show second operation
  card.show({
    previousValue: 93,
    operator: '+',
    operand: 5,
    nextValue: 98,
  });
  
  const secondHtml = card.domElement.innerHTML;
  assert.ok(secondHtml.includes('98'), 'should show second result');
  
  // Should still be only one card in DOM
  const cards = document.querySelectorAll('#operation-card');
  assert.equal(cards.length, 1, 'should have exactly one card');
  
  // Verify that the content was replaced (compare innerHTML lengths or structure)
  const firstCardCount = (firstHtml.match(/100/g) || []).length;
  const secondCardCount = (secondHtml.match(/100/g) || []).length;
  // Both should have 100, but the content should differ
  assert.notEqual(firstHtml, secondHtml, 'HTML content should be different between operations');
  
  card.destroy();
});

test('OperationCard: clear hides display', (t) => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  globalThis.document = dom.window.document;
  globalThis.window = dom.window;

  const card = new OperationCard();
  card.mount(document.body);
  
  card.show({
    previousValue: 100,
    operator: '-',
    operand: 7,
    nextValue: 93,
  });
  
  assert.equal(card.domElement.style.display, 'block', 'should be visible after show');
  
  card.clear();
  
  assert.equal(card.domElement.style.display, 'none', 'should be hidden after clear');
  assert.equal(card.overlayBg.style.display, 'none', 'overlay should be hidden');
  assert.equal(card.currentOperation, null, 'should clear current operation');
  
  card.destroy();
});

test('OperationCard: destroy removes DOM elements', (t) => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  globalThis.document = dom.window.document;
  globalThis.window = dom.window;

  const card = new OperationCard();
  card.mount(document.body);
  
  card.show({
    previousValue: 100,
    operator: '-',
    operand: 7,
    nextValue: 93,
  });
  
  const originalCount = document.querySelectorAll('#operation-card').length;
  assert.equal(originalCount, 1, 'should have one card initially');
  
  card.destroy();
  
  const afterCount = document.querySelectorAll('#operation-card').length;
  assert.equal(afterCount, 0, 'should have no cards after destroy');
  assert.equal(card.domElement, null, 'domElement should be null');
  assert.equal(card.overlayBg, null, 'overlayBg should be null');
});

test('OperationCard: clear cancels auto-hide timeout', (t) => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  globalThis.document = dom.window.document;
  globalThis.window = dom.window;

  const card = new OperationCard();
  card.mount(document.body);
  
  card.show({
    previousValue: 100,
    operator: '-',
    operand: 7,
    nextValue: 93,
  });
  
  assert.ok(card.autoHideTimeout !== null, 'should have pending timeout');
  
  card.clear();
  
  assert.equal(card.autoHideTimeout, null, 'should clear timeout');
  
  card.destroy();
});

test('OperationCard: successive show calls cancel previous timeout', (t) => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  globalThis.document = dom.window.document;
  globalThis.window = dom.window;

  const card = new OperationCard();
  card.mount(document.body);
  
  card.show({
    previousValue: 100,
    operator: '-',
    operand: 7,
    nextValue: 93,
  });
  
  const firstTimeout = card.autoHideTimeout;
  
  // Show another operation before first timeout fires
  card.show({
    previousValue: 93,
    operator: '+',
    operand: 5,
    nextValue: 98,
  });
  
  const secondTimeout = card.autoHideTimeout;
  
  assert.notEqual(firstTimeout, secondTimeout, 'should have different timeout IDs');
  assert.notEqual(secondTimeout, null, 'should have new timeout');
  
  card.destroy();
});
