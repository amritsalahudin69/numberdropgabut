import { Sprite } from 'pixi.js';

export class BackgroundLayer {
  constructor({ stage, texture, world = { width: 1920, height: 1080 } } = {}) {
    this.stage = stage;
    this.texture = texture;
    this.sprite = null;
    this.world = world;
  }

  mount(parentContainer) {
    if (!parentContainer) return;
    if (!this.texture) return;
    this.sprite = new Sprite(this.texture);
    this.sprite.anchor.set(0.5);
    // Cover scale similar to legacy: scale uniformly to cover 1920x1080
    const texW = this.texture?.width || this.world.width;
    const texH = this.texture?.height || this.world.height;
    const sx = this.world.width / texW;
    const sy = this.world.height / texH;
    const sc = Math.max(sx, sy);
    this.sprite.scale.set(sc);
    this.sprite.position.set(this.world.width / 2, this.world.height / 2);
    parentContainer.addChildAt(this.sprite, 0);
  }

  destroy() {
    if (this.sprite && this.sprite.parent) {
      this.sprite.parent.removeChild(this.sprite);
      this.sprite.destroy({ texture: false, baseTexture: false });
    }
    this.sprite = null;
  }
}
