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
  // Transactional: all assets must succeed or all are discarded. loaded remains false on any failure.
  async preload(catalog) {
    if (!catalog || typeof catalog !== 'object') {
      throw new Error('VisualTextureCache.preload requires an object catalog');
    }

    const toLoad = [];
    const collect = (obj) => {
      for (const k of Object.keys(obj)) {
        const v = obj[k];
        if (v && typeof v === 'string') toLoad.push(v);
        else if (v && typeof v === 'object') collect(v);
      }
    };
    collect(catalog);

    // Start transaction: clear any stale entries from prior preload attempt
    this.map.clear();
    this.loaded = false;

    const tempMap = new Map();

    // Use PIXI Assets loader to load each declared path. Throw on first failure (transactional).
    for (const url of toLoad) {
      try {
        // Preserve declared url as key (do not mutate) — Assets.load accepts leading '/'
        await this.loader.load(url);
        const tex = this.loader.get(url);
        if (!tex) throw new Error(`Loader did not return texture for ${url}`);
        tempMap.set(url, tex);
      } catch (e) {
        // On ANY failure, do not commit the partial transaction
        this.map.clear();
        this.loaded = false;
        throw new Error(`Visual asset preload failed (transactional rollback): ${url} — ${e && e.message}`);
      }
    }

    // All assets succeeded: commit transaction
    this.map = tempMap;
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
