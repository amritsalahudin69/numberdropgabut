import { PIXELS_PER_METER, DESIGN_WIDTH } from '../config/constants.js';

// Conservative defaults
const DEFAULT_STALL_TIME_MS = 700; // 600-800 ms recommended
const DEFAULT_SPEED_THRESHOLD_PX = 5; // px/s considered near-zero
const DEFAULT_POSITION_THRESHOLD_PX = 1.0; // px position change considered unchanged
const DEFAULT_IMPULSE_DELTA_M_S = 0.2; // meters/sec delta applied as small horizontal kick

export class GacoanStallGuard {
  constructor({ session, physics, stallTimeMs = DEFAULT_STALL_TIME_MS, speedThresholdPx = DEFAULT_SPEED_THRESHOLD_PX, positionThresholdPx = DEFAULT_POSITION_THRESHOLD_PX, impulseDeltaMs = DEFAULT_IMPULSE_DELTA_M_S } = {}) {
    this.session = session;
    this.physics = physics;
    this.stallTimeMs = stallTimeMs;
    this.speedThresholdPx = speedThresholdPx;
    this.positionThresholdPx = positionThresholdPx;
    this.impulseDeltaMs = impulseDeltaMs; // m/s

    // runtime tracking
    this._trackingGacoan = null;
    this._stallStartAt = null; // ms
    this._lastPos = null;
    this._lastMeaningfulDir = 0; // -1, 0, 1
    this._armed = true; // allow initial detection
    this._lastImpulseAt = 0;
  }

  resetTracking() {
    this._trackingGacoan = null;
    this._stallStartAt = null;
    this._lastPos = null;
    this._lastMeaningfulDir = 0;
    this._armed = true;
    this._lastImpulseAt = 0;
  }

  // Should be called every update tick from MarbleDropGame.update
  update(nowMs, deltaSeconds = 1 / 60) {
    if (!this.session || !this.physics) return;

    const state = this.session.getState ? this.session.getState() : null;
    // Only operate in FALLING
    if (state !== 'FALLING') {
      // Ensure tracking cleared when not falling
      if (this._trackingGacoan) this.resetTracking();
      return;
    }

    const g = this.session.getActiveGacoan ? this.session.getActiveGacoan() : null;
    if (!g || !g.body) {
      if (this._trackingGacoan) this.resetTracking();
      return;
    }

    // Only dynamic bodies
    const rapier = this.physics.getRapier && this.physics.getRapier();
    if (!rapier) return;

    // Track this gacoan instance
    if (this._trackingGacoan !== g) {
      this._trackingGacoan = g;
      this._stallStartAt = null;
      this._lastPos = g.getPosition ? g.getPosition() : null;
      this._lastMeaningfulDir = 0;
      this._armed = true;
      this._lastImpulseAt = 0;
    }

    // Get linear velocity in meters/sec
    let linvel = null;
    try {
      linvel = g.body.linvel ? g.body.linvel() : null;
    } catch (e) {
      linvel = null;
    }
    if (!linvel) {
      // cannot inspect velocity; bail
      return;
    }

    // convert to px/s
    const vx = linvel.x || 0;
    const vy = linvel.y || 0;
    const speedPx = Math.sqrt(vx * vx + vy * vy) * PIXELS_PER_METER;

    // position in px
    const pos = g.getPosition ? g.getPosition() : null;
    if (!pos) return;

    // Compute position delta since last sample
    let movedPx = 0;
    if (this._lastPos) {
      const dx = pos.x - this._lastPos.x;
      const dy = pos.y - this._lastPos.y;
      movedPx = Math.sqrt(dx * dx + dy * dy);
    }

    // If we see meaningful horizontal movement, record direction and reset stall timer
    const meaningfulSpeedPx = this.speedThresholdPx * 1.5; // slightly above threshold
    if (Math.abs(vx) * PIXELS_PER_METER > meaningfulSpeedPx || Math.abs(pos.x - (this._lastPos ? this._lastPos.x : pos.x)) > this.positionThresholdPx * 2) {
      // meaningful horizontal movement
      if (Math.abs(vx) > 1e-6) {
        this._lastMeaningfulDir = Math.sign(vx);
      } else {
        this._lastMeaningfulDir = (pos.x - (this._lastPos ? this._lastPos.x : pos.x)) > 0 ? 1 : (pos.x - (this._lastPos ? this._lastPos.x : pos.x)) < 0 ? -1 : this._lastMeaningfulDir;
      }
      this._stallStartAt = null;
      this._armed = true;
      this._lastPos = pos;
      return; // do not consider stall while meaningful movement observed
    }

    // If speed is near zero and position hasn't changed much, start/continue stall timer
    if (speedPx <= this.speedThresholdPx && movedPx <= this.positionThresholdPx) {
      if (!this._stallStartAt) {
        this._stallStartAt = nowMs;
      } else {
        const dt = nowMs - this._stallStartAt;
        if (dt >= this.stallTimeMs && this._armed) {
          // Trigger escape impulse exactly once per stall event
          this._triggerEscape(nowMs, g);
          this._armed = false;
          this._stallStartAt = null; // reset until movement seen again
        }
      }
    } else {
      // Movement not stalled; reset timer
      this._stallStartAt = null;
      this._lastPos = pos;
    }
  }

  _triggerEscape(nowMs, gacoan) {
    if (!gacoan || !gacoan.body) return;

    // Determine deterministic direction
    let dir = this._lastMeaningfulDir;
    if (!dir) {
      // fallback: use position relative to center
      let pos = gacoan.getPosition ? gacoan.getPosition() : { x: DESIGN_WIDTH / 2 };
      dir = pos.x >= (DESIGN_WIDTH / 2) ? -1 : 1;
    }

    // Compute impulse delta in meters/sec
    const dxMeters = (this.impulseDeltaMs || DEFAULT_IMPULSE_DELTA_M_S) * dir;

    // Try Rapier applyImpulse if available, otherwise adjust linear velocity directly
    try {
      if (typeof gacoan.body.applyImpulse === 'function') {
        // applyImpulse expects an impulse vector (N*s), but as a conservative safe call use small impulse
        // If mass unknown, use small value as approximation
        gacoan.body.applyImpulse({ x: dxMeters, y: 0 }, true);
      } else {
        const curr = gacoan.body.linvel();
        const newLv = { x: (curr.x || 0) + dxMeters, y: (curr.y || 0) };
        if (typeof gacoan.body.setLinvel === 'function') {
          gacoan.body.setLinvel(newLv, true);
        }
      }
    } catch (e) {
      // best-effort: try setLinvel fallback
      try {
        const curr = gacoan.body.linvel();
        const newLv = { x: (curr.x || 0) + dxMeters, y: (curr.y || 0) };
        if (typeof gacoan.body.setLinvel === 'function') {
          gacoan.body.setLinvel(newLv, true);
        }
      } catch (err) {
        // ignore; cannot recover
      }
    }

    this._lastImpulseAt = nowMs;
  }

  // lifecycle helpers
  onNewDrop() { this.resetTracking(); }
  onActiveGacoanCleanup() { this.resetTracking(); }
  onReset() { this.resetTracking(); }
  onDestroy() { this.resetTracking(); }
}
