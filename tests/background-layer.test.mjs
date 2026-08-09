import assert from 'node:assert/strict';
import { BackgroundLayer } from '../src/rendering/BackgroundLayer.js';

async function run() {
  console.log('Running background-layer.test.mjs...');

  // Fake parent container that mimics addChildAt/removeChild behavior
  const parent = {
    children: [],
    addChildAt(child, idx) {
      if (!this.children) this.children = [];
      this.children.splice(idx, 0, child);
      child.parent = this;
    },
    addChild(child) {
      if (!this.children) this.children = [];
      this.children.push(child);
      child.parent = this;
    },
    removeChild(child) {
      if (!this.children) return;
      const i = this.children.indexOf(child);
      if (i >= 0) this.children.splice(i, 1);
      child.parent = null;
    }
  };

  const fakeTexture = { _isFakeTexture: true, width: 800, height: 600 };
  const world = { width: 1920, height: 1080 };

  const layer = new BackgroundLayer({ texture: fakeTexture, world });
  layer.mount(parent);

  assert.ok(layer.sprite, 'BackgroundLayer must create a sprite on mount');
  assert.equal(layer.sprite.parent, parent, 'sprite.parent must equal the passed parent container');
  assert.equal(layer.sprite.position.x, world.width / 2, 'sprite centered horizontally');
  assert.equal(layer.sprite.position.y, world.height / 2, 'sprite centered vertically');

  layer.destroy();
  assert.equal(layer.sprite, null, 'sprite must be null after destroy');
  assert.equal(parent.children.length, 0, 'parent should have no children after destroy');

  console.log('PASS: background-layer.test.mjs passed.');
}

run().catch((err) => { console.error('FAIL: background-layer.test.mjs', err); process.exit(1); });