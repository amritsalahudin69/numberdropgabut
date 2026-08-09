/**
 * feedback-service.test.mjs
 * Behavioral tests for FeedbackService.
 * Runs in Node.js — provides minimal DOM stub (no real browser).
 */

import assert from 'node:assert/strict';

// ── Minimal DOM stub ──────────────────────────────────────────────────────────
class FakeImg {
  constructor() {
    this.src = '';
    this.style = {};
    this.className = '';
    this.alt = '';
    this.draggable = true;
    this._listeners = {};
    this.parentNode = null;
  }
  addEventListener(event, fn) {
    this._listeners[event] = fn;
  }
  removeEventListener(event, fn) {
    delete this._listeners[event];
  }
  _triggerError() {
    if (this._listeners['error']) this._listeners['error']();
  }
}

class FakeHost {
  constructor() {
    this.children = [];
  }
  appendChild(el) {
    el.parentNode = this;
    this.children.push(el);
  }
  removeChild(el) {
    const idx = this.children.indexOf(el);
    if (idx !== -1) this.children.splice(idx, 1);
    el.parentNode = null;
  }
}

// Patch global document for FeedbackService construction
let createdImg = null;
global.document = {
  createElement(tag) {
    if (tag === 'img') {
      createdImg = new FakeImg();
      return createdImg;
    }
    throw new Error('unexpected createElement: ' + tag);
  },
  body: new FakeHost(),
};

// Now import AFTER patching document
const { FeedbackService } = await import('../src/systems/FeedbackService.js');

// ──────────────────────────────────────────────────────────────────────────────

function runFeedbackServiceTests() {
  console.log('Running feedback-service.test.mjs...');

  const host = new FakeHost();

  // --- GIF available ---
  {
    createdImg = null;
    const svc = new FeedbackService(host);
    const asset = { type: 'gif', url: '/assets/gif/99.gif', fallbackUrl: '/assets/numbers/99.png' };
    svc.show(asset, { clientX: 100, clientY: 200 });

    assert.ok(svc.isVisible(), 'should be visible after show');
    const cur = svc.getCurrentAsset();
    assert.equal(cur.type, 'gif');
    assert.equal(cur.url, '/assets/gif/99.gif');
    // img.src should contain the GIF URL (with cache-bust query)
    assert.ok(createdImg.src.includes('/assets/gif/99.gif'), 'img src should contain gif url');
    assert.ok(createdImg.src.includes('?play='), 'gif src should have cache-bust query');
    assert.equal(createdImg.style.display, 'block');

    svc.destroy();
  }

  // --- PNG only (GIF unavailable in index) ---
  {
    createdImg = null;
    const svc = new FeedbackService(host);
    const asset = { type: 'png', url: '/assets/numbers/98.png' };
    svc.show(asset, { clientX: 50, clientY: 60 });

    assert.ok(svc.isVisible());
    assert.equal(svc.getCurrentAsset().type, 'png');
    assert.equal(createdImg.src, '/assets/numbers/98.png');

    svc.destroy();
  }

  // --- Runtime GIF load error → falls back to PNG ---
  {
    createdImg = null;
    const svc = new FeedbackService(host);
    const asset = { type: 'gif', url: '/assets/gif/99.gif', fallbackUrl: '/assets/numbers/99.png' };
    svc.show(asset, { clientX: 10, clientY: 10 });
    assert.equal(svc.getCurrentAsset().type, 'gif');

    // Simulate browser error on GIF
    createdImg._triggerError();

    assert.equal(svc.getCurrentAsset().type, 'png', 'after GIF error, type should switch to png');
    assert.equal(createdImg.src, '/assets/numbers/99.png', 'img src should be fallback PNG');
    assert.ok(svc.isVisible(), 'still visible after fallback');

    svc.destroy();
  }

  // --- clear ---
  {
    createdImg = null;
    const svc = new FeedbackService(host);
    svc.show({ type: 'png', url: '/assets/numbers/50.png' }, { clientX: 0, clientY: 0 });
    assert.ok(svc.isVisible());

    svc.clear();
    assert.equal(svc.isVisible(), false, 'should not be visible after clear');
    assert.equal(svc.getCurrentAsset(), null, 'currentAsset should be null after clear');
    assert.equal(createdImg.style.display, 'none');

    svc.destroy();
  }

  // --- repeated show — one element, latest asset wins ---
  {
    createdImg = null;
    const svc = new FeedbackService(host);

    svc.show({ type: 'gif', url: '/assets/gif/99.gif', fallbackUrl: '/assets/numbers/99.png' }, { clientX: 0, clientY: 0 });
    const imgAfterFirst = createdImg;

    svc.show({ type: 'png', url: '/assets/numbers/98.png' }, { clientX: 10, clientY: 10 });
    const imgAfterSecond = createdImg;

    assert.equal(imgAfterFirst, imgAfterSecond, 'must reuse the same DOM element');
    assert.equal(svc.getCurrentAsset().type, 'png', 'second show should update asset to png');
    assert.equal(svc.getCurrentAsset().url, '/assets/numbers/98.png');

    svc.destroy();
  }

  console.log('PASS: feedback-service.test.mjs passed all assertions.');
}

runFeedbackServiceTests();
