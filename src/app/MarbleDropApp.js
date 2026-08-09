import { Renderer } from '../core/Renderer.js';
import { PhysicsWorld } from '../core/PhysicsWorld.js';
import { AssetService } from '../systems/AssetService.js';
import { NumberTextureCache } from '../systems/NumberTextureCache.js';
import { MarbleDropGame } from '../game/MarbleDropGame.js';
import { MarbleDropRules } from '../game/MarbleDropRules.js';
import { LEVEL_1 } from '../config/levels/level1.js';

export const APP_STATE = Object.freeze({
  CREATED: 'CREATED',
  BOOTING: 'BOOTING',
  READY: 'READY',
  FAILED: 'FAILED',
  DESTROYED: 'DESTROYED',
});

export class MarbleDropApp {
  constructor(deps = {}) {
    this.renderer = deps.renderer || new Renderer();
    this.physics = deps.physics || new PhysicsWorld();
    this.assets = deps.assets || new AssetService();
    this.textureCache = deps.textureCache || new NumberTextureCache();
    this.level = deps.level || LEVEL_1;
    this.game = deps.game || null;
    this.state = APP_STATE.CREATED;
    this.tickerCallback = null;
  }

  getState() {
    return this.state;
  }

  async init(hostElement) {
    if (this.state !== APP_STATE.CREATED) {
      throw new Error(`Cannot initialize MarbleDropApp from state: ${this.state}`);
    }

    this.state = APP_STATE.BOOTING;

    try {
      await this.renderer.init(hostElement);
      await this.physics.init();
      await this.assets.init();

      MarbleDropRules.validateLevelConfig(this.level);

      const requiredValues = MarbleDropRules.getReachableValues(this.level);
      await this.textureCache.preload(requiredValues, this.assets);

      if (!this.game) {
        this.game = new MarbleDropGame({
          renderer: this.renderer,
          physics: this.physics,
          textureCache: this.textureCache,
          assetService: this.assets,
          level: this.level,
        });
      }
      await this.game.init();
      this.game.start();

      if (this.renderer && this.renderer.app && this.renderer.app.ticker) {
        this.tickerCallback = (ticker) => {
          const deltaSeconds = ticker.deltaTime / 60;
          if (this.game) {
            this.game.update(deltaSeconds);
          }
        };
        this.renderer.app.ticker.add(this.tickerCallback);
      }

      this.state = APP_STATE.READY;
    } catch (err) {
      this.state = APP_STATE.FAILED;
      throw err;
    }
  }

  getGameSnapshot() {
    if (this.game) {
      const snap = this.game.getSnapshot();
      snap.appState = this.state;
      return snap;
    }
    return {
      appState: this.state,
      gameState: 'UNINITIALIZED',
    };
  }

  reset() {
    if (this.game) {
      this.game.reset();
    }
  }

  destroy() {
    this.state = APP_STATE.DESTROYED;
    if (this.renderer && this.renderer.app && this.renderer.app.ticker && this.tickerCallback) {
      this.renderer.app.ticker.remove(this.tickerCallback);
      this.tickerCallback = null;
    }
    if (this.game && typeof this.game.destroy === 'function') {
      this.game.destroy();
      this.game = null;
    }
    if (this.textureCache && typeof this.textureCache.destroy === 'function') {
      this.textureCache.destroy();
    }
    if (this.renderer && typeof this.renderer.destroy === 'function') {
      this.renderer.destroy();
    }
    if (this.physics && typeof this.physics.destroy === 'function') {
      this.physics.destroy();
    }
    if (this.assets && typeof this.assets.destroy === 'function') {
      this.assets.destroy();
    }
  }
}
