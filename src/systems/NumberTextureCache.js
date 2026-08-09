import { Assets, Texture } from 'pixi.js';

export class NumberTextureCache {
  constructor() {
    this.cache = new Map();
  }

  async preload(values, assetService) {
    if (!assetService) {
      throw new Error('NumberTextureCache.preload requires an AssetService instance');
    }

    const uniqueValues = Array.from(new Set(values.map((v) => Number(v))));

    for (const val of uniqueValues) {
      const url = assetService.getStaticUrl(val);
      if (!url) {
        throw new Error(`Failed to resolve static PNG URL for value: ${val}`);
      }

      try {
        let texture = Assets.get(url);
        if (!texture || texture === Texture.WHITE) {
          texture = await Assets.load(url);
        }
        if (!texture || texture === Texture.WHITE) {
          throw new Error(`Texture loaded for ${val} at ${url} is invalid`);
        }
        this.cache.set(val, texture);
      } catch (err) {
        throw new Error(`NumberTextureCache failed to preload texture for value ${val} (${url}): ${err.message}`);
      }
    }
  }

  get(value) {
    const key = Number(value);
    const texture = this.cache.get(key);
    if (!texture || texture === Texture.WHITE) {
      throw new Error(`Texture cache miss for value: ${value}. All required textures must be preloaded.`);
    }
    return texture;
  }

  has(value) {
    const key = Number(value);
    return this.cache.has(key);
  }

  destroy() {
    this.cache.clear();
  }
}
