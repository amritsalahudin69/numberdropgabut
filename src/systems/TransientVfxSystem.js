import { Container, Graphics } from 'pixi.js';

export const EFFECT_LIFETIME_SEC = 0.34;
export const MAX_ACTIVE_EFFECTS = 8;
export const SHAKE_DURATION_SEC = 0.28;
export const SHAKE_AMPLITUDE_PX = 7;
export const MAX_SHAKE_AMPLITUDE_PX = 9;

const MAX_UPDATE_DT_SEC = 0.05;
const LINE_COUNT = 9;

function finiteNumber(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function isFiniteNumber(value) {
  return Number.isFinite(Number(value));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export class TransientVfxSystem {
  constructor({ parent, shakeTarget = null } = {}) {
    this.parent = parent || null;
    this.shakeTarget = shakeTarget || null;
    this.vfxContainer = new Container();
    this.effects = [];
    this.shakeRemaining = 0;
    this.shakeDuration = 0;
    this.shakeAmplitude = 0;
    this.shakeBaseX = 0;
    this.shakeBaseY = 0;
    this.shakePhase = 0;
    if (this.parent && typeof this.parent.addChild === 'function') this.parent.addChild(this.vfxContainer);
  }

  getActiveEffectCount() { return this.effects.length; }

  trigger(event) {
    if (!event || !['hammer-impact', 'gear-impact', 'goal-success', 'peg-impact', 'moving-block-impact'].includes(event.type)) return false;
    if (!isFiniteNumber(event.x) || !isFiniteNumber(event.y)) return false;
    if (event.type === 'hammer-impact') return this._triggerHammerImpact(event);
    if (event.type === 'gear-impact') return this._triggerGearImpact(event);
    if (event.type === 'goal-success') return this._triggerGoalSuccess(event);
    if (event.type === 'peg-impact') return this._triggerPegImpact(event);
    return this._triggerMovingBlockImpact(event);
  }

  _ensureRenderOrder() {
    if (this.parent && this.vfxContainer && typeof this.parent.addChild === 'function') this.parent.addChild(this.vfxContainer);
  }

  _beginEffect(type, x, y, duration, children) {
    this._ensureRenderOrder();
    while (this.effects.length >= MAX_ACTIVE_EFFECTS) this._removeEffect(this.effects[0]);
    const root = new Container();
    root.position.set(x, y);
    root.visible = true;
    root.renderable = true;
    root.alpha = 1;
    root.scale.set(1);
    root.addChild(...children);
    this.vfxContainer.addChild(root);
    const effect = { type, age: 0, duration, root };
    this.effects.push(effect);
    return effect;
  }

  _triggerHammerImpact(event) {
    const x = Number(event.x);
    const y = Number(event.y);
    const directionX = finiteNumber(event.directionX);
    const directionY = finiteNumber(event.directionY);
    const directionLength = Math.hypot(directionX, directionY);
    const normalizedX = directionLength > 0 ? directionX / directionLength : 0;
    const normalizedY = directionLength > 0 ? directionY / directionLength : 1;
    const strength = clamp(finiteNumber(event.strength, 1), 0.25, 2);
    const flash = new Graphics();
    flash.circle(0, 0, 28).fill({ color: 0xffffff, alpha: 1 });
    const ring = new Graphics();
    ring.circle(0, 0, 32).stroke({ width: 5, color: 0xffd166, alpha: 0.9 });
    const lines = [];
    const directionAngle = Math.atan2(normalizedY, normalizedX);
    for (let index = 0; index < LINE_COUNT; index += 1) {
      const ratio = (index / (LINE_COUNT - 1)) * 2 - 1;
      const angle = directionAngle + ratio * 1.1;
      const startRadius = 18;
      const length = 34 + (index % 3) * 7;
      const line = new Graphics();
      line.moveTo(Math.cos(angle) * startRadius, Math.sin(angle) * startRadius);
      line.lineTo(Math.cos(angle) * (startRadius + length), Math.sin(angle) * (startRadius + length));
      line.stroke({ width: 4, color: 0xfff3b0, alpha: 0.95 });
      lines.push(line);
    }
    const effect = this._beginEffect('hammer-impact', x, y, EFFECT_LIFETIME_SEC, [ring, ...lines, flash]);
    Object.assign(effect, { flash, ring, lines, strength });
    this._startShake({ strength, duration: SHAKE_DURATION_SEC, amplitude: SHAKE_AMPLITUDE_PX });
    return true;
  }

  _triggerGearImpact(event) {
    const radius = clamp(finiteNumber(event.radius, 54), 24, 120);
    const clockwise = event.clockwise !== false;
    const sparks = [];
    const streaks = [];
    for (let index = 0; index < 7; index += 1) {
      const angle = (index / 7) * Math.PI * 2;
      const inner = radius * 0.42;
      const outer = inner + radius * 0.34;
      const spark = new Graphics();
      spark.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
      spark.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
      spark.stroke({ width: 4, color: 0xffe08a, alpha: 0.95 });
      sparks.push(spark);
      const streakAngle = angle + (clockwise ? 0.18 : -0.18);
      const streak = new Graphics();
      streak.moveTo(Math.cos(streakAngle) * radius * 0.72, Math.sin(streakAngle) * radius * 0.72);
      streak.lineTo(Math.cos(streakAngle) * radius * 1.04, Math.sin(streakAngle) * radius * 1.04);
      streak.stroke({ width: 3, color: 0xffffff, alpha: 0.8 });
      streaks.push(streak);
    }
    const ring = new Graphics();
    ring.circle(0, 0, radius * 0.56).stroke({ width: 3, color: 0xffc857, alpha: 0.8 });
    const effect = this._beginEffect('gear-impact', Number(event.x), Number(event.y), 0.20, [ring, ...sparks, ...streaks]);
    Object.assign(effect, { ring, sparks, streaks, clockwise });
    return true;
  }

  _triggerGoalSuccess(event) {
    const flash = new Graphics();
    flash.circle(0, 0, 36).fill({ color: 0xffffff, alpha: 1 });
    const ring1 = new Graphics();
    ring1.circle(0, 0, 50).stroke({ width: 5, color: 0x9dffb0, alpha: 0.95 });
    const ring2 = new Graphics();
    ring2.circle(0, 0, 70).stroke({ width: 4, color: 0x4ee87a, alpha: 0.8 });
    const rays = [];
    for (let index = 0; index < 11; index += 1) {
      const angle = (index / 11) * Math.PI * 2;
      const ray = new Graphics();
      ray.moveTo(Math.cos(angle) * 28, Math.sin(angle) * 28);
      ray.lineTo(Math.cos(angle) * 92, Math.sin(angle) * 92);
      ray.stroke({ width: 4, color: 0xd8ffe1, alpha: 0.9 });
      rays.push(ray);
    }
    const effect = this._beginEffect('goal-success', Number(event.x), Number(event.y), 0.36, [ring2, ring1, ...rays, flash]);
    Object.assign(effect, { flash, ring1, ring2, rays });
    return true;
  }

  _triggerPegImpact(event) {
    const radius = clamp(finiteNumber(event.radius, 15), 8, 60);
    const pulse = new Graphics();
    pulse.circle(0, 0, clamp(radius * 0.62, 8, 14)).fill({ color: 0xffffff, alpha: 0.7 });
    const ring = new Graphics();
    ring.circle(0, 0, clamp(radius * 1.45, 18, 28)).stroke({ width: 3, color: 0xfff1a8, alpha: 0.85 });
    const effect = this._beginEffect('peg-impact', Number(event.x), Number(event.y), 0.14, [ring, pulse]);
    Object.assign(effect, { pulse, ring });
    return true;
  }

  _triggerMovingBlockImpact(event) {
    const width = clamp(finiteNumber(event.width, 180), 24, 500);
    const height = clamp(finiteNumber(event.height, 36), 18, 300);
    const flash = new Graphics();
    flash.roundRect(-width / 2, -height / 2, width, height, 6).stroke({ width: 4, color: 0xffffff, alpha: 1 });
    const outer = new Graphics();
    outer.roundRect(-width / 2, -height / 2, width, height, 8).stroke({ width: 3, color: 0x9deaff, alpha: 0.8 });
    const effect = this._beginEffect('moving-block-impact', Number(event.x), Number(event.y), 0.18, [outer, flash]);
    Object.assign(effect, { flash, outer });
    return true;
  }

  _startShake({ strength = 1, duration, amplitude } = {}) {
    if (!this.shakeTarget) return;
    const startingNewShake = this.shakeRemaining <= 0;
    if (startingNewShake) {
      this.shakeBaseX = finiteNumber(this.shakeTarget.x);
      this.shakeBaseY = finiteNumber(this.shakeTarget.y);
      this.shakePhase = 0;
    }
    this.shakeDuration = startingNewShake ? duration : Math.max(this.shakeDuration, duration);
    this.shakeRemaining = Math.max(this.shakeRemaining, duration);
    this.shakeAmplitude = Math.min(MAX_SHAKE_AMPLITUDE_PX, Math.max(this.shakeAmplitude, amplitude * strength));
  }

  update(dt) {
    const safeDt = clamp(finiteNumber(dt), 0, MAX_UPDATE_DT_SEC);
    for (const effect of [...this.effects]) {
      effect.age += safeDt;
      const progress = clamp(effect.age / effect.duration, 0, 1);
      const fade = 1 - progress;
      if (effect.type === 'hammer-impact') {
        effect.flash.alpha = Math.max(0, 1 - progress * 2.5) * effect.strength;
        effect.ring.scale.set(0.7 + progress * 1.2);
        effect.ring.alpha = fade * 0.9 * effect.strength;
        for (const line of effect.lines) {
          line.scale.set(0.9 + progress * 0.5);
          line.alpha = Math.max(0, 1 - progress * 1.4) * effect.strength;
        }
      } else if (effect.type === 'gear-impact') {
        effect.root.rotation = (effect.clockwise ? 1 : -1) * progress * 2.2;
        effect.root.scale.set(0.9 + progress * 0.35);
        effect.ring.scale.set(0.9 + progress * 0.45);
        effect.ring.alpha = fade * 0.8;
        for (const spark of effect.sparks) spark.alpha = Math.max(0, 1 - progress * 1.5);
        for (const streak of effect.streaks) streak.alpha = Math.max(0, 1 - progress * 2);
      } else if (effect.type === 'goal-success') {
        effect.root.scale.set(0.8 + progress * 0.6);
        effect.flash.alpha = Math.max(0, 1 - progress * 2.8);
        effect.ring1.scale.set(0.85 + progress * 0.75);
        effect.ring2.scale.set(0.75 + progress * 0.9);
        effect.ring1.alpha = fade * 0.95;
        effect.ring2.alpha = fade * 0.8;
        for (const ray of effect.rays) ray.alpha = Math.max(0, 1 - progress * 1.6);
      }
      if (effect.type === 'peg-impact') {
        effect.root.scale.set(0.85 + progress * 0.45);
        effect.pulse.alpha = Math.max(0, 0.7 - progress);
        effect.ring.scale.set(0.85 + progress * 0.45);
        effect.ring.alpha = (1 - progress) * 0.85;
      } else if (effect.type === 'moving-block-impact') {
        effect.root.scale.set(0.96 + progress * 0.18);
        effect.flash.alpha = Math.max(0, 1 - progress * 1.35);
        effect.outer.alpha = (1 - progress) * 0.8;
      }
      if (progress >= 1) this._removeEffect(effect);
    }
    this._updateShake(safeDt);
  }

  _updateShake(dt) {
    if (!this.shakeTarget || this.shakeRemaining <= 0) return;
    this.shakeRemaining = Math.max(0, this.shakeRemaining - dt);
    const ratio = this.shakeDuration > 0 ? this.shakeRemaining / this.shakeDuration : 0;
    const amplitude = this.shakeAmplitude * ratio;
    this.shakePhase += dt * 44;
    this.shakeTarget.x = this.shakeBaseX + Math.sin(this.shakePhase) * amplitude;
    this.shakeTarget.y = this.shakeBaseY + Math.cos(this.shakePhase * 1.37) * amplitude * 0.65;
    if (this.shakeRemaining <= 0) this._restoreShakeTarget();
  }

  _restoreShakeTarget() {
    if (this.shakeTarget) {
      this.shakeTarget.x = this.shakeBaseX;
      this.shakeTarget.y = this.shakeBaseY;
    }
    this.shakeDuration = 0;
    this.shakeAmplitude = 0;
    this.shakePhase = 0;
  }

  _removeEffect(effect) {
    const index = this.effects.indexOf(effect);
    if (index >= 0) this.effects.splice(index, 1);
    try { effect?.root?.destroy({ children: true }); } catch {}
  }

  clear() {
    for (const effect of [...this.effects]) this._removeEffect(effect);
    this.effects = [];
    this.shakeRemaining = 0;
    this._restoreShakeTarget();
  }

  destroy() {
    this.clear();
    if (this.vfxContainer) {
      try { this.vfxContainer.parent?.removeChild(this.vfxContainer); } catch {}
      try { this.vfxContainer.destroy({ children: true }); } catch {}
    }
    this.vfxContainer = null;
    this.parent = null;
    this.shakeTarget = null;
  }
}
