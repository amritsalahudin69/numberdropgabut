import { Renderer } from '../core/Renderer.js';
import { PhysicsWorld } from '../core/PhysicsWorld.js';
import { AssetService } from '../systems/AssetService.js';
import { NumberTextureCache } from '../systems/NumberTextureCache.js';
import { MarbleDropGame } from '../game/MarbleDropGame.js';
import { MarbleDropRules } from '../game/MarbleDropRules.js';
import { LEVEL_1 } from '../config/levels/level1.js';
import { VisualTextureCache } from '../systems/VisualTextureCache.js';
import { VISUAL_ASSETS } from '../config/visualAssets.js';
import { TargetStrip } from '../ui/TargetStrip.js';
import { OperationCard } from '../ui/OperationCard.js';
import { FeedbackService } from '../systems/FeedbackService.js';
import { SoundService } from '../systems/SoundService.js';
import { GameHud } from '../ui/GameHud.js';
import { ResultOverlay } from '../ui/ResultOverlay.js';
import { ResultService } from '../systems/ResultService.js';
import { JsonExporter } from '../systems/JsonExporter.js';

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
    this.visualTextureCache = deps.visualTextureCache || new VisualTextureCache();
    this._visualTextureCacheProvided = !!deps.visualTextureCache;
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

      const requiredValues = MarbleDropRules.getRequiredNumberAssetValues(this.level);
      await this.textureCache.preload(requiredValues, this.assets);

      // Preload visual assets (must be ready before game init) — always required, not conditional
      await this.visualTextureCache.preload(VISUAL_ASSETS);

      // Create UI root and services owned by the app
      if (!this.uiRoot && this.renderer && this.renderer.app && this.renderer.app.stage) {
        this.uiRoot = new this.renderer.app.stage.constructor(); // Container
        this.renderer.app.stage.addChild(this.uiRoot);
      }

      this.soundService = this.soundService || new SoundService({ assetService: this.assets });
      this.feedbackService = this.feedbackService || new FeedbackService(null, this.renderer);
      this.operationCard = this.operationCard || new OperationCard({ numberTextureCache: this.textureCache, assetService: this.assets });

      // Target strip
      this.targetStrip = new TargetStrip({ level: this.level, numberTextureCache: this.textureCache, assetService: this.assets });
      if (this.uiRoot) {
        this.targetStrip.mount(this.uiRoot);
      }

      // Mount OperationCard to document.body for overlay presentation
      if (typeof document !== 'undefined') {
        this.operationCard.mount(document.body);
      }

      if (!this.game) {
        this.game = new MarbleDropGame({
          renderer: this.renderer,
          physics: this.physics,
          textureCache: this.textureCache,
          visualTextureCache: this.visualTextureCache,
          assetService: this.assets,
          level: this.level,
          feedbackService: this.feedbackService,
          soundService: this.soundService,
          operationCard: this.operationCard,
        });
      }
      await this.game.init();
      this.game.start();

      // Setup HUD and overlay wiring state
      this.hud = null;
      this.resultOverlay = null;
      this.cachedResult = null;
      this._overlayMounted = false;
      this._lastHudSnapshot = null;

      // Create HUD instance (mount to renderer.hostElement if available)
      try {
        const hostEl = this.renderer && this.renderer.hostElement ? this.renderer.hostElement : null;
        this.hud = new GameHud({ session: this.game.session, level: this.level, runRecorder: this.game.runRecorder });
        if (hostEl) this.hud.mount(hostEl);
      } catch (e) {
        // Non-fatal: HUD may not mount in test environment without DOM
        // Leave this.hud as created instance for tests to inspect
      }

      if (this.renderer && this.renderer.app && this.renderer.app.ticker) {
        this.tickerCallback = (ticker) => {
          const deltaSeconds = ticker.deltaTime / 60;
          if (this.game) {
            this.game.update(deltaSeconds);
          }

          // Post-frame: deterministic HUD refresh and SUMMARY detection
          try {
            // HUD update only when mounted and values changed
            if (this.hud && typeof this.hud.update === 'function') {
              const snap = {
                current: this.game.session.getCurrentValue(),
                opsUsed: this.game.session.getOpsUsed(),
                opsRemaining: this.game.session.getOpsRemaining(),
                lastOpSeq: this.game.runRecorder.getLastOperation() ? this.game.runRecorder.getLastOperation().seq : 0,
              };
              const last = this._lastHudSnapshot || {};
              const changed = snap.current !== last.current || snap.opsUsed !== last.opsUsed || snap.opsRemaining !== last.opsRemaining || snap.lastOpSeq !== last.lastOpSeq;
              if (changed) {
                this.hud.update();
                this._lastHudSnapshot = snap;
              }
            }

            // SUMMARY handling: build once and mount overlay once
            const sessionState = this.game.session.getState();
            const hostEl = this.renderer && this.renderer.hostElement ? this.renderer.hostElement : null;
            if (sessionState === 'SUMMARY' && !this._overlayMounted) {
              this.cachedResult = ResultService.buildResult({
                level: this.level,
                session: this.game.session,
                runRecorder: this.game.runRecorder,
                startedAtMs: this.game.startedAtMs,
                completedAtMs: this.game.completedAtMs,
              });

              // Create overlay instance and mount it if a host DOM element exists
              this.resultOverlay = new ResultOverlay({
                result: this.cachedResult,
                onExport: () => {
                  try { JsonExporter.export({ result: this.cachedResult }); } catch (e) {}
                },
                onRestart: () => this._handleRestart(),
                assetService: this.assets,
              });
              if (hostEl) {
                try { this.resultOverlay.mount(hostEl); } catch (e) {}
              }

              this._overlayMounted = true;
            }
          } catch (e) {
            // swallow to avoid breaking ticker loop
            // errors during UI mount in test env are non-fatal
          }
        };
        this.renderer.app.ticker.add(this.tickerCallback);
      }

      this.state = APP_STATE.READY;
    } catch (err) {
      this.state = APP_STATE.FAILED;
      this._cleanupAfterFailedInit();
      throw err;
    }
  }

  _cleanupAfterFailedInit() {
    // Rollback all initialized resources without entering DESTROYED state
    // (FAILED is the final state for init failures)
    
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

    if (this.visualTextureCache && typeof this.visualTextureCache.destroy === 'function') {
      this.visualTextureCache.destroy();
    }

    if (this.targetStrip && typeof this.targetStrip.destroy === 'function') {
      this.targetStrip.destroy();
      this.targetStrip = null;
    }

    if (this.uiRoot && this.renderer && this.renderer.app && this.renderer.app.stage) {
      try {
        this.renderer.app.stage.removeChild(this.uiRoot);
      } catch (e) {}
      this.uiRoot = null;
    }

    if (this.soundService && typeof this.soundService.destroy === 'function') {
      try { this.soundService.destroy(); } catch (e) {}
      this.soundService = null;
    }

    if (this.feedbackService && typeof this.feedbackService.destroy === 'function') {
      try { this.feedbackService.destroy(); } catch (e) {}
      this.feedbackService = null;
    }

    if (this.operationCard && typeof this.operationCard.destroy === 'function') {
      try { this.operationCard.destroy(); } catch (e) {}
      this.operationCard = null;
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

  _handleRestart() {
    // Called when ResultOverlay requests an authoritative restart
    try {
      // Remove overlay if mounted
      if (this.resultOverlay && typeof this.resultOverlay.destroy === 'function') {
        try { this.resultOverlay.destroy(); } catch (e) {}
        this.resultOverlay = null;
      }
      this._overlayMounted = false;
      this.cachedResult = null;

      // Clear recorder then reset game/session state
      try { if (this.game && this.game.runRecorder && typeof this.game.runRecorder.clear === 'function') this.game.runRecorder.clear(); } catch (e) {}

      // Clear session completion flags explicitly before reset
      try { if (this.game && this.game.session) { this.game.session._completionRequested = false; this.game.session._completionReason = null; this.game.session._completionSuccess = null; } } catch (e) {}

      if (this.game && typeof this.game.reset === 'function') {
        this.game.reset();
      }

      // Reset HUD
      try { if (this.hud && typeof this.hud.reset === 'function') this.hud.reset(); } catch (e) {}

    } catch (e) {
      // swallow non-fatal
    }
  }

  destroy() {
    this.state = APP_STATE.DESTROYED;
    if (this.renderer && this.renderer.app && this.renderer.app.ticker && this.tickerCallback) {
      this.renderer.app.ticker.remove(this.tickerCallback);
      this.tickerCallback = null;
    }

    // Destroy overlay/hud if present
    if (this.resultOverlay && typeof this.resultOverlay.destroy === 'function') {
      try { this.resultOverlay.destroy(); } catch (e) {}
      this.resultOverlay = null;
    }
    if (this.hud && typeof this.hud.destroy === 'function') {
      try { this.hud.destroy(); } catch (e) {}
      this.hud = null;
    }

    if (this.game && typeof this.game.destroy === 'function') {
      this.game.destroy();
      this.game = null;
    }
    if (this.textureCache && typeof this.textureCache.destroy === 'function') {
      this.textureCache.destroy();
    }
    if (this.visualTextureCache && typeof this.visualTextureCache.destroy === 'function') {
      this.visualTextureCache.destroy();
    }

    if (this.targetStrip && typeof this.targetStrip.destroy === 'function') {
      this.targetStrip.destroy();
      this.targetStrip = null;
    }

    if (this.uiRoot && this.renderer && this.renderer.app && this.renderer.app.stage) {
      try { this.renderer.app.stage.removeChild(this.uiRoot); } catch (e) {}
      this.uiRoot = null;
    }

    if (this.soundService && typeof this.soundService.destroy === 'function') {
      try { this.soundService.destroy(); } catch (e) {}
      this.soundService = null;
    }

    if (this.feedbackService && typeof this.feedbackService.destroy === 'function') {
      try { this.feedbackService.destroy(); } catch (e) {}
      this.feedbackService = null;
    }

    if (this.operationCard && typeof this.operationCard.destroy === 'function') {
      try { this.operationCard.destroy(); } catch (e) {}
      this.operationCard = null;
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
