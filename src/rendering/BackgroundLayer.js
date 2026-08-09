import { Sprite } from 'pixi.js';

export class BackgroundLayer {
  constructor({ stage, texture, world = { width: 1920, height: 1080 } } = {}) {
    this.stage = stage;
    this.texture = texture;
    this.sprite = null;
    this.world = world;
  }

  mount(parentContainer) {
    if (!parentContainer) throw new Error('BackgroundLayer.mount requires a valid parentContainer');
    if (!this.texture) throw new Error('BackgroundLayer.mount requires a texture');

    // Support test seam fake textures
    if (this.texture._isFakeTexture) {
      const texW = this.texture.width || this.world.width;
      const texH = this.texture.height || this.world.height;
      const sx = this.world.width / texW;
      const sy = this.world.height / texH;
      const sc = Math.max(sx, sy);

      const sprite = {
        _isFakeSprite: true,
        anchor: { x: 0.5, y: 0.5, set(x, y) { this.x = x; this.y = y; } },
        scale: { x: sc, y: sc, set(v) { this.x = v; this.y = v; } },
        position: { x: this.world.width / 2, y: this.world.height / 2, set(x, y) { this.x = x; this.y = y; } },
        parent: null,
        destroy() { /* nothing */ },
      };
      this.sprite = sprite;
      if (typeof parentContainer.addChildAt !== 'function') {
        throw new Error('BackgroundLayer.mount: parentContainer must support addChildAt method');
      }
      try {
        parentContainer.addChildAt(this.sprite, 0);
      } catch (e) {
        this.sprite = null;
        throw new Error(`BackgroundLayer.mount: failed to add sprite to parent: ${e.message}`);
      }
      return;
    }

    // Create real PIXI sprite
    let sprite;
    try {
      sprite = new Sprite(this.texture);
    } catch (e) {
      throw new Error(`BackgroundLayer.mount: failed to create Sprite: ${e.message}`);
    }

    sprite.anchor.set(0.5);
    const texW = this.texture?.width || this.world.width;
    const texH = this.texture?.height || this.world.height;
    const sx = this.world.width / texW;
    const sy = this.world.height / texH;
    const sc = Math.max(sx, sy);
    sprite.scale.set(sc);
    sprite.position.set(this.world.width / 2, this.world.height / 2);

    if (typeof parentContainer.addChildAt !== 'function') {
      throw new Error('BackgroundLayer.mount: parentContainer must support addChildAt method');
    }

    try {
      parentContainer.addChildAt(sprite, 0);
      this.sprite = sprite;
    } catch (e) {
      // Sprite was created but mount failed; clean without destroying shared texture
      throw new Error(`BackgroundLayer.mount: failed to add sprite to parent: ${e.message}`);
    }
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
