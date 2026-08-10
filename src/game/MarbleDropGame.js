import { Container } from 'pixi.js';
import { LEVEL_1 } from '../config/levels/level1.js';
import { MarbleDropSession, GAMEPLAY_STATE } from './MarbleDropSession.js';
import { CollisionRegistry } from '../core/CollisionRegistry.js';
import { CollisionResolver } from '../systems/CollisionResolver.js';
import { FeedbackService } from '../systems/FeedbackService.js';
import { Clock } from '../core/Clock.js';
import { COLLISION_FEEDBACK_MS } from '../config/constants.js';
import { Gacoan } from '../entities/Gacoan.js';
import { Peg } from '../entities/Peg.js';
import { Gate } from '../entities/Gate.js';
import { Goal } from '../entities/Goal.js';
import { RunRecorder } from '../systems/RunRecorder.js';
import { GacoanStallGuard } from '../systems/GacoanStallGuard.js';

import { BackgroundLayer } from '../rendering/BackgroundLayer.js';
import { VISUAL_ASSETS } from '../config/visualAssets.js';

export class MarbleDropGame {
  constructor({ renderer, physics, textureCache, visualTextureCache = null, assetService, level = LEVEL_1, clock = null, feedbackService = null, soundService = null, runRecorder = null, operationCard = null } = {}) {
    this.renderer = renderer;
    this.physics = physics;
    this.textureCache = textureCache;
    this.visualTextureCache = visualTextureCache;
    this.assetService = assetService;
    this.level = level;
    this.clock = clock || new Clock();

    this.session = new MarbleDropSession();
    this.registry = new CollisionRegistry();
    this.resolver = null;

    // RunRecorder: injected in tests, created in production
    if (runRecorder !== undefined && runRecorder !== null) {
      this.runRecorder = runRecorder;
    } else {
      this.runRecorder = new RunRecorder();
    }

    // Timing for telemetry
    this.startedAtMs = null;
    this.completedAtMs = null;

    // consumedGateIds: gates consumed by current active gacoan (one-drop lifetime)
    this.consumedGateIds = new Set();

    // FeedbackService: injected in tests, created in production
    if (feedbackService !== undefined && feedbackService !== null) {
      this.feedback = feedbackService;
    } else if (typeof document !== 'undefined') {
      const hostEl = renderer && typeof renderer.getCanvas === 'function'
        ? (renderer.getCanvas() && renderer.getCanvas().parentElement)
        : null;
      this.feedback = new FeedbackService(hostEl);
    } else {
      this.feedback = null;
    }

    this.container = new Container();
    this.pegs = [];
    this.gates = [];
    this.goals = [];
    this.activeGacoan = null;
    this.backgroundLayer = null;

    this.eventQueue = null;
    this.pointerHandler = null;

    this.soundService = soundService || null;
    this.operationCard = operationCard || null;

    // Stall guard: monitors active gacoan during FALLING and applies small deterministic impulse to escape peg stalls
    this.stallGuard = new GacoanStallGuard({ session: this.session, physics: this.physics });
  }

  async init() {
    this.resolver = new CollisionResolver({
      session: this.session,
      textureCache: this.textureCache,
      assetService: this.assetService,
      levelDomain: this.level.valueDomain,
    });

    if (this.renderer && typeof this.renderer.getStage === 'function') {
      const stage = this.renderer.getStage();
      
      // Check if background is required
      const bgKey = VISUAL_ASSETS && VISUAL_ASSETS.background ? VISUAL_ASSETS.background : null;
      if (bgKey && !stage) {
        throw new Error(`Required background cannot be mounted: renderer stage unavailable`);
      }
      
      if (stage) {
        // Mount required background if declared (strict, no catch)
        if (bgKey) {
          // Background is declared as required
          if (!this.visualTextureCache || typeof this.visualTextureCache.get !== 'function') {
            throw new Error('VisualTextureCache not available but VISUAL_ASSETS.background is declared (required)');
          }

          const bgTex = this.visualTextureCache.get(bgKey);
          if (!bgTex) {
            throw new Error(`Required MarbleDrop background texture was not preloaded: ${bgKey}`);
          }

          // Create and mount background (may throw; error propagates to app.init)
          this.backgroundLayer = new BackgroundLayer({ stage, texture: bgTex, world: this.level.world });
          this.backgroundLayer.mount(stage);

          // Verify mount succeeded
          if (!this.backgroundLayer || !this.backgroundLayer.sprite) {
            throw new Error('MarbleDrop background failed to mount: sprite is null after mount');
          }
        }

        // Add game container above background (index > 0 if background exists)
        stage.addChild(this.container);
      }

      const canvas = this.renderer.getCanvas();
      if (canvas) {
        // Ensure we don't attach duplicate pointer handlers across init/reset cycles
        if (this.pointerHandler && typeof this.pointerHandler === 'function') {
          try {
            canvas.removeEventListener('pointerdown', this.pointerHandler);
          } catch (e) {
            // ignore
          }
        }
        this.pointerHandler = (evt) => this.handlePointerDrop(evt);
        canvas.addEventListener('pointerdown', this.pointerHandler);
      }
    }

    if (this.physics && typeof this.physics.getRapier === 'function') {
      const rapier = this.physics.getRapier();
      if (rapier && rapier.EventQueue) {
        this.eventQueue = new rapier.EventQueue(true);
      }
    }
  }

  start() {
    this.session.start(this.level);
    this.startedAtMs = this.clock.now();
    this.buildLevelEntities();
  }

  buildLevelEntities() {
    this.clearLevelEntities();

    const parent = this.container;

    // Build Pegs
    for (const p of this.level.pegs) {
      const peg = new Peg();
      peg.spawn({
        id: p.id,
        x: p.x,
        y: p.y,
        radius: p.radius,
        physicsWorld: this.physics,
        parentContainer: parent,
      });
      this.pegs.push(peg);
      const handle = peg.getColliderHandle();
      if (handle !== null) {
        this.registry.register(handle, { type: 'peg', entity: peg });
      }
    }

    // Build Gates
    for (const g of this.level.gates) {
      const gate = new Gate();
      gate.spawn({
        id: g.id,
        operator: g.operator,
        operand: g.operand,
        x: g.x,
        y: g.y,
        width: g.width,
        height: g.height,
        speed: g.speed,
        range: g.range,
        physicsWorld: this.physics,
        parentContainer: parent,
        numberTextureCache: this.textureCache,
      });
      this.gates.push(gate);
      const handle = gate.getColliderHandle();
      if (handle !== null) {
        this.registry.register(handle, {
          type: 'gate',
          id: g.id,
          entity: gate,
          operator: g.operator,
          operand: g.operand,
        });
      }
    }

    // Build Goals
    for (const gl of this.level.goals) {
      const goal = new Goal();
      let goalTexture = null;
      if (this.textureCache && this.textureCache.has(gl.value)) {
        goalTexture = this.textureCache.get(gl.value);
      }
      goal.spawn({
        id: gl.id,
        value: gl.value,
        operator: gl.operator || '-',
        x: gl.x,
        y: gl.y,
        width: gl.width,
        height: gl.height,
        texture: goalTexture,
        physicsWorld: this.physics,
        parentContainer: parent,
      });
      this.goals.push(goal);
      const handle = goal.getColliderHandle();
      if (handle !== null) {
        this.registry.register(handle, {
          type: 'goal',
          id: gl.id,
          entity: goal,
          value: gl.value,
          operator: gl.operator || '-',
        });
      }
    }
  }

  clearLevelEntities() {
    if (this.activeGacoan) {
      const handle = this.activeGacoan.getColliderHandle();
      if (handle !== null) this.registry.unregister(handle);
      this.activeGacoan.destroy();
      this.activeGacoan = null;

      // Clear consumed gate IDs when active gacoan ownership ends
      this.consumedGateIds.clear();

      // Notify stall guard
      if (this.stallGuard && typeof this.stallGuard.onActiveGacoanCleanup === 'function') {
        try { this.stallGuard.onActiveGacoanCleanup(); } catch (e) {}
      }
    }

    for (const p of this.pegs) p.destroy();
    for (const g of this.gates) g.destroy();
    for (const gl of this.goals) gl.destroy();

    this.pegs = [];
    this.gates = [];
    this.goals = [];
    this.registry.clear();

    // Clear consumed gates if any — level rebuild/reset implies no active gacoan ownership
    this.consumedGateIds.clear();
  }

  handlePointerDrop(evt) {
    if (!this.session || !this.session.canDrop()) return;
    if (!this.renderer || !this.renderer.getCanvas()) return;

    const canvas = this.renderer.getCanvas();
    const rect = canvas.getBoundingClientRect();
    const clickX = evt.clientX - rect.left;
    const scaleX = (this.level.world.width || 1920) / rect.width;
    const worldX = clickX * scaleX;

    this.dropAt(worldX);
  }

  dropAt(x) {
    if (!this.session.canDrop()) return false;

    const dropZone = this.level.dropZone || { minX: 360, maxX: 1560, y: 80 };
    const clampedX = Math.max(dropZone.minX, Math.min(x, dropZone.maxX));
    const currentValue = this.session.getCurrentValue();

    let texture;
    try {
      texture = this.textureCache.get(currentValue);
    } catch (err) {
      console.error(`Failed to get preloaded texture for value ${currentValue}:`, err);
      return false;
    }

    const gacoan = new Gacoan();
    gacoan.spawn({
      value: currentValue,
      texture,
      x: clampedX,
      y: dropZone.y,
      radiusPx: 58,
      physicsWorld: this.physics,
      parentContainer: this.container,
    });

    const handle = gacoan.getColliderHandle();
    if (handle !== null) {
      this.registry.register(handle, { type: 'gacoan', entity: gacoan });
    }

    this.activeGacoan = gacoan;

    // New active gacoan: clear consumed gate set for fresh drop lifecycle
    this.consumedGateIds.clear();

    try {
      this.session.beginDrop(gacoan);
      return true;
    } catch (err) {
      if (handle !== null) this.registry.unregister(handle);
      gacoan.destroy();
      this.activeGacoan = null;
      return false;
    }
  }

  update(deltaSeconds = 1 / 60) {
    const nowMs = this.clock.now();
    const state = this.session.getState();

    // Update gate movement
    for (const g of this.gates) {
      g.update(deltaSeconds);
    }

    // Step physics
    if (this.physics && typeof this.physics.step === 'function') {
      if (this.physics.getWorld() && this.eventQueue) {
        const world = this.physics.getWorld();
        world.step(this.eventQueue);
        // Only process collision events when eligible
        if (state === GAMEPLAY_STATE.FALLING) {
          this.processCollisionEvents();
        } else {
          // Drain without processing to keep queue clean
          this.eventQueue.drainCollisionEvents(() => {});
        }
      } else {
        this.physics.step(deltaSeconds);
      }
    }

    // Sync active gacoan position (only when not frozen / falling)
    if (this.activeGacoan && state === GAMEPLAY_STATE.FALLING) {
      this.activeGacoan.syncFromPhysics();

      // Update stall guard to detect and resolve peg stalls
      try {
        if (this.stallGuard && typeof this.stallGuard.update === 'function') {
          this.stallGuard.update(this.clock.now(), deltaSeconds);
        }
      } catch (e) {
        // Non-fatal
        console.error('[MarbleDropGame] stallGuard.update error', e);
      }

      this.checkOutOfBounds();
    }


    // Process HOLDING expiry
    if (state === GAMEPLAY_STATE.HOLDING) {
      if (this.session.isHoldExpired(nowMs)) {
        const holdCtx = this.session.getHoldContext();
        const postHoldAction = holdCtx ? holdCtx.postHoldAction : 'RESUME_FALL';

        if (this.feedback) {
          this.feedback.clear();
        }

        if (postHoldAction === 'RESUME_FALL') {
          if (this.activeGacoan) {
            this.activeGacoan.unfreeze();
          }
          this.session.finishGateHold();
        } else {
          // CLEANUP
          this.session.finishGoalHold();
          this.cleanupActiveGacoan();
        }
      } else {
        // Update feedback position to track gacoan (frozen, so position is stable)
        if (this.feedback && this.feedback.isVisible() && this.activeGacoan && this.renderer) {
          const pos = this.activeGacoan.getPosition();
          if (typeof this.renderer.worldToClient === 'function') {
            const screenPos = this.renderer.worldToClient(pos.x, pos.y);
            this.feedback.updatePosition(screenPos);
          }
        }
      }
    }
  }

  processCollisionEvents() {
    if (!this.eventQueue || !this.session) return;

    this.eventQueue.drainCollisionEvents((handle1, handle2, started) => {
      if (!started) return;

      const meta1 = this.registry.get(handle1);
      const meta2 = this.registry.get(handle2);

      if (!meta1 || !meta2) return;

      let gacoanMeta = null;
      let targetMeta = null;

      if (meta1.type === 'gacoan') {
        gacoanMeta = meta1;
        targetMeta = meta2;
      } else if (meta2.type === 'gacoan') {
        gacoanMeta = meta2;
        targetMeta = meta1;
      }

      if (!gacoanMeta || !targetMeta) return;

      // Ownership validation: event must belong to current activeGacoan and live entities
      if (!this.session || !this.activeGacoan) return;
      // Validate that registry entity matches current active gacoan instance
      if (gacoanMeta.entity !== this.activeGacoan) return;
      // Ensure session and game agree on active gacoan
      if (this.session.getActiveGacoan() !== this.activeGacoan) return;
      // Ensure entity not destroyed
      if (gacoanMeta.entity.destroyed) return;
      // Ensure collider still registered (defensive) — allow handle 0
      const gHandle = gacoanMeta.entity.getColliderHandle ? gacoanMeta.entity.getColliderHandle() : null;
      if (gHandle == null || !this.registry.get(gHandle)) return;
      // Ensure session still in FALLING (events may be from previous batch)
      if (this.session.getState() !== GAMEPLAY_STATE.FALLING) return;

      // Peg: physics only, no gameplay operation — play peg sound optionally
      if (targetMeta.type === 'peg') {
        const nowMs = this.clock.now();
        this.runRecorder.recordCollision({
          type: 'peg',
          entityId: targetMeta.entity && targetMeta.entity.id ? targetMeta.entity.id : null,
          accepted: true,
          reason: 'physics_only',
          timestampMs: nowMs,
        });
        try {
          if (this.soundService && typeof this.soundService.playPeg === 'function') {
            this.soundService.playPeg();
          }
        } catch (e) {
          // non-fatal
        }
        return;
      }

      if (targetMeta.type === 'gate') {
        // Determine gate id and check consumed set
        const gateEntity = targetMeta.entity;
        const gateId = gateEntity && gateEntity.id ? gateEntity.id : (targetMeta.id || null);
        const nowMs = this.clock.now();
        if (!gateId) return;

        // Record collision
        const isConsumed = this.consumedGateIds.has(gateId);
        this.runRecorder.recordCollision({
          type: 'gate',
          entityId: gateId,
          accepted: !isConsumed,
          reason: isConsumed ? 'already_consumed' : 'new',
          timestampMs: nowMs,
        });

        // If gate already consumed for this active gacoan, ignore
        if (isConsumed) return;

        // Mark gate consumed for this active gacoan before resolving to ensure once-per-gacoan semantics
        this.consumedGateIds.add(gateId);

        // Caller must transition session to RESOLVING before invoking resolver
        try {
          if (this.session && typeof this.session.beginResolve === 'function' && this.session.getState() === GAMEPLAY_STATE.FALLING) {
            this.session.beginResolve();
          }
        } catch (e) {
          // If transition fails, remove consumed mark and skip
          this.consumedGateIds.delete(gateId);
          console.error('[MarbleDropGame] beginResolve failed:', e);
          return;
        }

        const previousValue = (typeof this.session.getCurrentValue === 'function')
          ? this.session.getCurrentValue()
          : (this.session.currentValue !== undefined ? this.session.currentValue : 0);
        const res = this.resolver.resolveOperationHit({
          operator: targetMeta.operator,
          operand: targetMeta.operand,
          isGoal: false,
        });

        if (res && res.ok) {
                  const nextValue = (typeof this.session.getCurrentValue === 'function')
                    ? this.session.getCurrentValue()
                    : (this.session.currentValue !== undefined ? this.session.currentValue : 0);
          
          // Record operation on successful resolution
          this.runRecorder.recordOperation({
            source: 'gate',
            sourceId: gateId,
            operator: targetMeta.operator,
            operand: targetMeta.operand,
            previousValue,
            nextValue,
            timestampMs: nowMs,
          });

          // Record evolution on value change
          this.runRecorder.recordEvolution({
            previousValue,
            nextValue,
            source: 'gate',
            sourceId: gateId,
            timestampMs: nowMs,
          });

          try {
            if (this.soundService && typeof this.soundService.playGate === 'function') {
              this.soundService.playGate();
            }
          } catch (e) {}
          this._startHold(res);
        } else {
          // If resolution failed due to arithmetic/config invariant, follow existing error behavior
          // and DO NOT silently clear consumedGateIds to avoid infinite retries.
          console.error('[MarbleDropGame] resolveOperationHit failed for gate:', gateId, res && res.err);
        }
      } else if (targetMeta.type === 'goal') {
        // Goals are terminal for the gacoan lifecycle — treat normally without gate blocking
        const nowMs = this.clock.now();
        const goalId = targetMeta.id || null;
        this.runRecorder.recordCollision({
          type: 'goal',
          entityId: goalId,
          accepted: true,
          reason: 'terminal',
          timestampMs: nowMs,
        });

        try {
          if (this.session && typeof this.session.beginResolve === 'function' && this.session.getState() === GAMEPLAY_STATE.FALLING) {
            this.session.beginResolve();
          }
        } catch (e) {
          console.error('[MarbleDropGame] beginResolve failed for goal:', e);
          return;
        }

        const previousValue = (typeof this.session.getCurrentValue === 'function')
          ? this.session.getCurrentValue()
          : (this.session.currentValue !== undefined ? this.session.currentValue : 0);
        const res = this.resolver.resolveOperationHit({
          operator: targetMeta.operator,
          operand: targetMeta.value,
          isGoal: true,
        });

        if (res && res.ok) {
                  const nextValue = (typeof this.session.getCurrentValue === 'function')
                    ? this.session.getCurrentValue()
                    : (this.session.currentValue !== undefined ? this.session.currentValue : 0);
          
          // Record operation on successful resolution
          this.runRecorder.recordOperation({
            source: 'goal',
            sourceId: goalId,
            operator: targetMeta.operator,
            operand: targetMeta.value,
            previousValue,
            nextValue,
            timestampMs: nowMs,
          });

          // Record evolution on value change
          this.runRecorder.recordEvolution({
            previousValue,
            nextValue,
            source: 'goal',
            sourceId: goalId,
            timestampMs: nowMs,
          });

          // Show operation card for successful Goal collision
          if (this.operationCard && typeof this.operationCard.show === 'function') {
            try {
              this.operationCard.show({
                previousValue,
                operator: targetMeta.operator,
                operand: targetMeta.value,
                nextValue,
              });
            } catch (e) {
              // non-fatal
            }
          }

          // Check completion conditions
          if (nextValue === this.level.targetValue || (this.level.goals && this.level.goals[0] && nextValue === this.level.goals[0].value)) {
            this.session.requestCompletion({ reason: 'target_reached', success: true });
          } else {
            const opsUsed = (typeof this.session.getOpsUsed === 'function') ? this.session.getOpsUsed() : (this.session.opsUsed !== undefined ? this.session.opsUsed : 0);
            const maxOps = this.session && typeof this.session.maxOps !== 'undefined' ? this.session.maxOps : (this.level && this.level.maxOps ? this.level.maxOps : 6);
            if (opsUsed >= maxOps) {
              this.session.requestCompletion({ reason: 'max_ops_exhausted', success: false });
            }
          }

          try {
            if (this.soundService && typeof this.soundService.playGoal === 'function') {
              this.soundService.playGoal();
            }
          } catch (e) {}
          this._startHold(res);
        }
      }
    });
  }

  _startHold(resolveResult) {
    const { feedbackAsset, postHoldAction } = resolveResult;
    const nowMs = this.clock.now();

    // Ensure session is in RESOLVING so beginHold is allowed
    // Show feedback overlay
    if (this.feedback && feedbackAsset) {
      let screenPos = { clientX: 0, clientY: 0 };
      if (this.activeGacoan && this.renderer && typeof this.renderer.worldToClient === 'function') {
        const pos = this.activeGacoan.getPosition();
        screenPos = this.renderer.worldToClient(pos.x, pos.y);
      }
      this.feedback.show(feedbackAsset, screenPos);
    }

    // Freeze only the active gacoan
    if (this.activeGacoan) {
      this.activeGacoan.freeze();
    }

    // Transition session to HOLDING
    this.session.beginHold({
      durationMs: COLLISION_FEEDBACK_MS,
      postHoldAction,
      startNowMs: nowMs,
    });
  }

  checkOutOfBounds() {
    if (!this.activeGacoan) return;
    const pos = this.activeGacoan.getPosition();
    const worldH = this.level.world.height || 1080;
    const worldW = this.level.world.width || 1920;

    if (pos.y > worldH + 100 || pos.x < -100 || pos.x > worldW + 100) {
      if (this.session.getState() === GAMEPLAY_STATE.FALLING) {
        this.session.beginCleanup();
      }
      if (this.feedback) this.feedback.clear();
      this.cleanupActiveGacoan();
    }
  }

  cleanupActiveGacoan() {
    if (!this.activeGacoan) return;

    if (this.activeGacoan.isFrozen()) {
      this.activeGacoan.unfreeze();
    }

    const handle = this.activeGacoan.getColliderHandle();
    if (handle !== null) {
      this.registry.unregister(handle);
    }
    this.activeGacoan.destroy();
    this.activeGacoan = null;

    // Clear consumed gate IDs when active gacoan ownership ends
    this.consumedGateIds.clear();

    // Notify stall guard
    if (this.stallGuard && typeof this.stallGuard.onActiveGacoanCleanup === 'function') {
      try { this.stallGuard.onActiveGacoanCleanup(); } catch (e) {}
    }

    if (this.session.getState() === GAMEPLAY_STATE.CLEANUP) {
      this.session.finishCleanup();
      
      // Check if completion was requested and handle transition to SUMMARY
      if (this.session.isCompletionRequested()) {
        this.completedAtMs = this.clock.now();
        this.session.complete();
      }
    }
  }

  reset() {
    // Clear feedback immediately
    if (this.feedback) {
      this.feedback.clear();
    }

    // Clear operation card
    if (this.operationCard && typeof this.operationCard.clear === 'function') {
      try {
        this.operationCard.clear();
      } catch (e) {
        // non-fatal
      }
    }

    // Reset stall guard
    if (this.stallGuard && typeof this.stallGuard.onReset === 'function') {
      try { this.stallGuard.onReset(); } catch (e) {}
    }

    this.clearLevelEntities();
    this.session.reset(this.level);
    this.buildLevelEntities();
  }

  getSnapshot() {
    return {
      appState: 'READY',
      gameState: this.session ? this.session.getState() : 'UNINITIALIZED',
      currentValue: this.session ? this.session.getCurrentValue() : 0,
      opsUsed: this.session ? this.session.getOpsUsed() : 0,
      opsRemaining: this.session ? this.session.getOpsRemaining() : 0,
      activeGacoanValue: this.activeGacoan ? this.activeGacoan.value : null,
      activeGacoanCount: this.activeGacoan ? 1 : 0,
      pegCount: this.pegs ? this.pegs.length : 0,
      gateCount: this.gates ? this.gates.length : 0,
      goalCount: this.goals ? this.goals.length : 0,
      colliderRegistryCount: this.registry ? this.registry.size() : 0,
      feedbackVisible: this.feedback ? this.feedback.isVisible() : false,
      holding: this.session ? (this.session.getState() === GAMEPLAY_STATE.HOLDING) : false,
      pointerListenerPresent: !!this.pointerHandler,
      updateLoopPresent: true, // best-effort; consumer may maintain explicit counters if needed
    };
  }

  destroy() {
    if (this.feedback) {
      this.feedback.clear();
      if (typeof this.feedback.destroy === 'function') this.feedback.destroy();
      this.feedback = null;
    }

    if (this.renderer && this.renderer.getCanvas() && this.pointerHandler) {
      this.renderer.getCanvas().removeEventListener('pointerdown', this.pointerHandler);
      this.pointerHandler = null;
    }

    this.clearLevelEntities();
    if (this.session) this.session.destroy();
    // Clear consumed gates on destroy
    this.consumedGateIds.clear();
    if (this.eventQueue) {
      try {
        this.eventQueue.free();
      } catch {}
      this.eventQueue = null;
    }

    // Destroy background layer if present
    if (this.backgroundLayer && typeof this.backgroundLayer.destroy === 'function') {
      this.backgroundLayer.destroy();
      this.backgroundLayer = null;
    }

    if (this.container && this.container.parent) {
      this.container.parent.removeChild(this.container);
      if (typeof this.container.destroy === 'function') this.container.destroy({ children: true });
    }
  }
}
