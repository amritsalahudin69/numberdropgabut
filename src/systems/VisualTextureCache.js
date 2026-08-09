import fs from 'fs';
import path from 'path';

export class VisualTextureCache {
  constructor({ publicDir = path.resolve(process.cwd(), 'public', 'assets') } = {}) {
    this.publicDir = publicDir;
    this.map = new Map();
    this.loaded = false;
  }

  async preload(catalog) {
    if (!catalog || typeof catalog !== 'object') return false;
    const toLoad = [];
    const collect = (obj, prefix = '') => {
      for (const k of Object.keys(obj)) {
        const v = obj[k];
        if (v && typeof v === 'string') toLoad.push(v);
        else if (v && typeof v === 'object') collect(v, `${prefix}${k}.`);
      }
    };
    collect(catalog);

    for (const rel of toLoad) {
      // Ensure path is inside public assets and file exists
      try {
        // Normalize declared path: strip leading slash and optional leading 'assets/' so
        // publicDir (public/assets) + relative path -> public/assets/<...>
        let relNorm = String(rel).replace(/^\/+/, '');
        if (relNorm.startsWith('assets/')) relNorm = relNorm.slice('assets/'.length);
        const filePath = path.join(this.publicDir, relNorm);
        if (fs.existsSync(filePath)) {
          this.map.set(rel, { path: filePath });
        } else {
          // Missing required visual asset -> fail preload
          throw new Error(`Missing visual asset: ${rel}`);
        }
      } catch (e) {
        throw e;
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
