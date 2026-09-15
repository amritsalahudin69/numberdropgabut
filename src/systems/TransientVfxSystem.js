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
    if (!event || event.type !== 'hammer-impact') return false;
    if (!isFiniteNumber(event.x) || !isFiniteNumber(event.y)) return false;
    return this._triggerHammerImpact(event);
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
