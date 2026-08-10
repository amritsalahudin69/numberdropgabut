import { PIXELS_PER_METER } from '../config/constants.js';

// Defaults tuned for peg-aware detection
const DEFAULT_STALL_TIME_MS = 700; // 600-800 ms recommended
const DEFAULT_CONTACT_TOLERANCE_PX = 2; // extra envelope around colliders
const DEFAULT_MIN_DOWNWARD_PROGRESS_PX = 4; // required downward progress to not be considered stalled
const DEFAULT_MIN_DOWNWARD_SPEED_MPS = 0.05; // small downward speed counts as progress (m/s)
const DEFAULT_ESCAPE_MIN_SPEED_MPS = 0.4; // 0.4 m/s recommended

export class GacoanStallGuard {
  constructor({ session, physics, getPegs = () => [], gacoanColliderRadius = 40, stallTimeMs = DEFAULT_STALL_TIME_MS, contactTolerancePx = DEFAULT_CONTACT_TOLERANCE_PX, minDownwardProgressPx = DEFAULT_MIN_DOWNWARD_PROGRESS_PX, minDownwardSpeedMps = DEFAULT_MIN_DOWNWARD_SPEED_MPS, escapeMinSpeedMps = DEFAULT_ESCAPE_MIN_SPEED_MPS } = {}) {
    this.session = session;
    this.physics = physics;
    this.getPegs = getPegs;
    this.gacoanColliderRadius = gacoanColliderRadius;
    this.stallTimeMs = stallTimeMs;
    this.contactTolerancePx = contactTolerancePx;
    this.minDownwardProgressPx = minDownwardProgressPx;
    this.minDownwardSpeedMps = minDownwardSpeedMps;
    this.escapeMinSpeedMps = escapeMinSpeedMps;

    // runtime tracking
    this._trackingGacoan = null;
    this._trackingPegId = null;
    this._stallStartAt = null; // ms
    this._initialY = null;
    this._maxYSeen = null;
    this._armed = true; // allow initial detection
  }

  resetTracking() {
    this._trackingGacoan = null;
    this._trackingPegId = null;
    this._stallStartAt = null;
    this._initialY = null;
    this._maxYSeen = null;
    this._armed = true;
  }

  // Should be called every update tick from MarbleDropGame.update
  update(nowMs, deltaSeconds = 1 / 60) {
    if (!this.session || !this.physics) return;

    const state = this.session.getState ? this.session.getState() : null;
    // Only operate in FALLING
    if (state !== 'FALLING') {
      if (this._trackingGacoan) this.resetTracking();
      return;
    }

    const g = this.session.getActiveGacoan ? this.session.getActiveGacoan() : null;
    if (!g || !g.body) {
      if (this._trackingGacoan) this.resetTracking();
      return;
    }

    // If new gacoan, reset
    if (this._trackingGacoan !== g) {
      this._trackingGacoan = g;
      this._trackingPegId = null;
      this._stallStartAt = null;
      this._initialY = null;
      this._maxYSeen = null;
      this._armed = true;
    }

    const pos = g.getPosition ? g.getPosition() : null;
    if (!pos) return;

    // Find nearest peg within contact envelope
    const pegs = (typeof this.getPegs === 'function') ? this.getPegs() : [];
    let nearestPeg = null;
    let nearestDist = Infinity;
    for (const p of pegs || []) {
      if (!p) continue;
      const dx = pos.x - p.x;
      const dy = pos.y - p.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      const envelope = this.gacoanColliderRadius + (p.radius || 0) + this.contactTolerancePx;
      if (d <= envelope && d < nearestDist) {
        nearestDist = d;
        nearestPeg = p;
      }
    }

    if (!nearestPeg) {
      // Not near any peg — clear tracking if any
      if (this._trackingPegId) this.resetTracking();
      return;
    }

    const pegId = nearestPeg.id || `${nearestPeg.x}:${nearestPeg.y}`;

    // If tracking different peg, reset tracking window
    if (this._trackingPegId && this._trackingPegId !== pegId) {
      this._trackingPegId = pegId;
      this._stallStartAt = null;
      this._initialY = pos.y;
      this._maxYSeen = pos.y;
      this._armed = true;
    }

    if (!this._trackingPegId) {
      // start tracking this peg
      this._trackingPegId = pegId;
      this._stallStartAt = null;
      this._initialY = pos.y;
      this._maxYSeen = pos.y;
      this._armed = true;
    }

    // Update maxYSeen
    if (pos.y > this._maxYSeen) this._maxYSeen = pos.y;

    const downwardProgress = this._maxYSeen - this._initialY;

    // Consider downward velocity as meaningful progress as well
    let linvel = { x: 0, y: 0 };
    try { linvel = g.body.linvel ? g.body.linvel() : linvel; } catch (e) { linvel = linvel; }
    const downwardSpeedMps = linvel.y || 0; // positive y is downward in world

    // If sufficient downward progress observed, or vertical speed indicates downward movement, reset stall window
    if (downwardProgress >= this.minDownwardProgressPx || downwardSpeedMps >= this.minDownwardSpeedMps) {
      this._stallStartAt = null;
      this._initialY = pos.y;
      this._maxYSeen = pos.y;
      this._armed = true;
      return;
    }

    // Otherwise, start/continue stall timer while near same peg
    if (!this._stallStartAt) {
      this._stallStartAt = nowMs;
      return;
    }

    const dt = nowMs - this._stallStartAt;
    if (dt >= this.stallTimeMs && this._armed) {
      // Confirmed peg-stall — escape horizontally away from peg
      const dir = (pos.x < nearestPeg.x) ? -1 : (pos.x > nearestPeg.x) ? 1 : -1; // tie-break: left
      try {
        if (typeof g.ensureHorizontalEscapeVelocity === 'function') {
          g.ensureHorizontalEscapeVelocity(dir, this.escapeMinSpeedMps);
        } else {
          // fallback: modify linvel directly
          const curr = g.body.linvel ? g.body.linvel() : { x: 0, y: 0 };
          const desiredX = (Math.abs(curr.x || 0) >= this.escapeMinSpeedMps) ? curr.x : (this.escapeMinSpeedMps * (dir >= 0 ? 1 : -1));
          if (typeof g.body.setLinvel === 'function') {
            g.body.setLinvel({ x: desiredX, y: curr.y || 0 }, true);
          }
        }
      } catch (e) {
        // non-fatal
      }

      // prevent immediate rearm until leaves envelope or makes downward progress
      this._armed = false;
      this._stallStartAt = null;
    }
  }

  // lifecycle helpers
  onNewDrop() { this.resetTracking(); }
  onActiveGacoanCleanup() { this.resetTracking(); }
  onReset() { this.resetTracking(); }
  onDestroy() { this.resetTracking(); }
}
