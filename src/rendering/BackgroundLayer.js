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

    // Support test seam fake textures (marked with _isFakeTexture) to avoid needing full PIXI renderer in Node tests
    if (this.texture && this.texture._isFakeTexture) {
      const texW = this.texture.width || this.world.width;
      const texH = this.texture.height || this.world.height;
      const sx = this.world.width / texW;
      const sy = this.world.height / texH;
      const sc = Math.max(sx, sy);

      // lightweight fake sprite object for tests
      const sprite = {
        _isFakeSprite: true,
        anchor: { x: 0.5, y: 0.5, set(x, y) { this.x = x; this.y = y; } },
        scale: { x: sc, y: sc, set(v) { this.x = v; this.y = v; } },
        position: { x: this.world.width / 2, y: this.world.height / 2, set(x, y) { this.x = x; this.y = y; } },
        parent: null,
        destroy() { /* nothing */ },
      };
      this.sprite = sprite;
      if (typeof parentContainer.addChildAt === 'function') parentContainer.addChildAt(this.sprite, 0);
      else if (typeof parentContainer.addChild === 'function') parentContainer.addChild(this.sprite);
      return;
    }

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
    if (this.sprite) {
      if (this.sprite.parent && typeof this.sprite.parent.removeChild === 'function') {
        this.sprite.parent.removeChild(this.sprite);
      }
      if (!this.sprite._isFakeSprite && typeof this.sprite.destroy === 'function') {
        this.sprite.destroy({ texture: false, baseTexture: false });
      }
    }
    this.sprite = null;
  }
}
