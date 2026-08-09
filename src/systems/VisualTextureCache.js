import { Assets } from 'pixi.js';

// VisualTextureCache is a browser/runtime texture preloader using PIXI Assets.
// Accepts an injectable loader for tests.
export class VisualTextureCache {
  constructor({ loader = Assets } = {}) {
    this.loader = loader;
    this.map = new Map();
    this.loaded = false;
  }

  // catalog: object tree with string paths (e.g. '/assets/marbledrop/background/bg.jpg')
  async preload(catalog) {
    if (!catalog || typeof catalog !== 'object') return false;
    const toLoad = [];
    const collect = (obj) => {
      for (const k of Object.keys(obj)) {
        const v = obj[k];
        if (v && typeof v === 'string') toLoad.push(v);
        else if (v && typeof v === 'object') collect(v);
      }
    };
    collect(catalog);

    // Use PIXI Assets loader to load each declared path. Throw on missing.
    for (const url of toLoad) {
      try {
        // Preserve declared url as key (do not mutate) — Assets.load accepts leading '/'
        await this.loader.load(url);
        const tex = this.loader.get(url);
        if (!tex) throw new Error(`Loader did not return texture for ${url}`);
        this.map.set(url, tex);
      } catch (e) {
        // Do not fallback silently — required visual asset missing/failed load
        throw new Error(`Missing visual asset or load failure: ${url} — ${e && e.message}`);
      }
    }

    this.loaded = true;
    return true;
  }

  has(key) {
    return this.map.has(key);
  }

  get(key) {
    return this.map.get(key) || null;
  }

  destroy() {
    this.map.clear();
    this.loaded = false;
  }
}
