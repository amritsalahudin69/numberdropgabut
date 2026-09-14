import { Container, Graphics } from 'pixi.js';
import { MarbleDropObstacleBase } from './MarbleDropObstacleBase.js';

const TAU = Math.PI * 2;
const DEG_TO_RAD = Math.PI / 180;

export class MarbleDropHammerObstacle extends MarbleDropObstacleBase {
  constructor({ definition = {}, physicsWorld = null, parentContainer = null } = {}) {
    super({ definition, physicsWorld, parentContainer });
    this.x = Number(definition.x) || 0; this.y = Number(definition.y) || 0;
    this.length = Math.max(70, Number(definition.length) || 150);
    this.headRadius = Math.max(20, Number(definition.headRadius) || 34);
    this.armWidth = Math.max(8, Number(definition.armWidth) || 14);
    this.speed = Math.max(0.05, Number(definition.speed) || 0.46);
    this.swingAngleDeg = Math.max(10, Math.min(78, Number(definition.swingAngleDeg) || 54));
    this.phase = Number.isFinite(definition.phase) ? definition.phase : 0;
    this.clockwise = definition.clockwise !== false;
    this.color = Number.isFinite(definition.color) ? definition.color : 0xff4d4d;
    this.armColor = Number.isFinite(definition.armColor) ? definition.armColor : 0x6c757d;
    this.restitution = Number.isFinite(definition.restitution) ? definition.restitution : 0.68;
    this.friction = Number.isFinite(definition.friction) ? definition.friction : 0.12;
    this.impactDeltaV = Math.max(5, Number(definition.impactDeltaV) || 10.5);
    this.radialDeltaV = Math.max(0, Number(definition.radialDeltaV) || 2.5);
    this.minimumExitSpeed = Math.max(4, Number(definition.minimumExitSpeed) || 9);
    this.maxResultSpeed = Math.max(this.minimumExitSpeed, Number(definition.maxResultSpeed) || 16);
    this.cooldownMs = Math.max(0, Number(definition.cooldownMs) || 140);
    this.elapsed = 0; this.rotation = 0;
    this.currentHeadX = this.x; this.currentHeadY = this.y + this.length;
    this.previousHeadX = this.currentHeadX; this.previousHeadY = this.currentHeadY;
    this.headVelocityX = 0; this.headVelocityY = 0; this._lastHitAt = -Infinity;
  }
  spawn() {
    if (this.destroyed) return;
    this.container = new Container(); this.container.position.set(this.x, this.y);
    const arm = new Graphics(); arm.roundRect(-this.armWidth / 2, 0, this.armWidth, this.length, this.armWidth / 2).fill({ color: this.armColor }).stroke({ width: 2, color: 0xffffff, alpha: 0.34 });
    const headWidth = this.headRadius * 2.6; const headHeight = this.headRadius * 1.5;
    const head = new Graphics(); head.roundRect(-headWidth / 2, this.length - headHeight / 2, headWidth, headHeight, 8).fill({ color: this.color }).stroke({ width: 5, color: 0xffffff, alpha: 0.78 });
    const pivot = new Graphics(); pivot.circle(0, 0, 14).fill({ color: 0x343a40 }).stroke({ width: 4, color: 0xffffff, alpha: 0.72 });
    this.container.addChild(arm, head, pivot); if (this.parentContainer) this.parentContainer.addChild(this.container);
    this._updateHeadPosition(); this.previousHeadX = this.currentHeadX; this.previousHeadY = this.currentHeadY; this._attachPhysics();
  }
  _updateHeadPosition() { this.currentHeadX = this.x - Math.sin(this.rotation) * this.length; this.currentHeadY = this.y + Math.cos(this.rotation) * this.length; }
  _attachPhysics() {
    if (!this.physicsWorld || typeof this.physicsWorld.getWorld !== 'function') return;
    const world = this.physicsWorld.getWorld(); const rapier = this.physicsWorld.getRapier(); if (!world || !rapier) return;
    const bodyDesc = rapier.RigidBodyDesc.kinematicPositionBased().setTranslation(this.physicsWorld.toMeters(this.currentHeadX), this.physicsWorld.toMeters(this.currentHeadY));
    this.body = world.createRigidBody(bodyDesc);
    const colliderDesc = rapier.ColliderDesc.ball(this.physicsWorld.toMeters(this.headRadius)); colliderDesc.setRestitution(this.restitution); colliderDesc.setFriction(this.friction);
    if (typeof colliderDesc.setActiveEvents === 'function' && rapier.ActiveEvents) colliderDesc.setActiveEvents(rapier.ActiveEvents.COLLISION_EVENTS);
    this.collider = world.createCollider(colliderDesc, this.body);
  }
  update(deltaSeconds = 1 / 60) {
    if (this.destroyed || !this.container) return; const dt = Math.max(0, Math.min(0.05, Number(deltaSeconds) || 0)); if (dt <= 0) return;
    this.previousHeadX = this.currentHeadX; this.previousHeadY = this.currentHeadY; this.elapsed += dt;
    const direction = this.clockwise ? 1 : -1; this.rotation = Math.sin((this.elapsed * this.speed + this.phase) * TAU) * this.swingAngleDeg * DEG_TO_RAD * direction; this.container.rotation = this.rotation; this._updateHeadPosition();
    this.headVelocityX = (this.currentHeadX - this.previousHeadX) / dt; this.headVelocityY = (this.currentHeadY - this.previousHeadY) / dt;
    if (this.body && this.physicsWorld) try { this.body.setNextKinematicTranslation({ x: this.physicsWorld.toMeters(this.currentHeadX), y: this.physicsWorld.toMeters(this.currentHeadY) }); } catch {}
  }
  onGacoanCollision(gacoan) {
    const body = gacoan?.body; if (!body || !this.physicsWorld) return { accepted: false, reason: 'hammer_missing_body' };
    const now = Date.now(); if (now - this._lastHitAt < this.cooldownMs) return { accepted: false, reason: 'hammer_cooldown' };
    try {
      const p = body.translation(); const headX = this.physicsWorld.toMeters(this.currentHeadX); const headY = this.physicsWorld.toMeters(this.currentHeadY);
      const rdx = p.x - headX; const rdy = p.y - headY; const rd = Math.hypot(rdx, rdy) || 1; const rx = rdx / rd; const ry = rdy / rd;
      let ix = this.headVelocityX; let iy = this.headVelocityY; let il = Math.hypot(ix, iy);
      if (il > 0.001) { ix /= il; iy /= il; } else { ix = rx; iy = ry; }
      const massValue = body.mass?.(); const mass = Number.isFinite(massValue) && massValue > 0 ? massValue : 1;
      body.applyImpulse?.({ x: (ix * this.impactDeltaV + rx * this.radialDeltaV) * mass, y: (iy * this.impactDeltaV + ry * this.radialDeltaV) * mass }, true);
      let v = body.linvel(); let vx = Number(v?.x) || 0; let vy = Number(v?.y) || 0; const component = vx * ix + vy * iy;
      if (component < this.minimumExitSpeed) { const missing = this.minimumExitSpeed - component; vx += ix * missing; vy += iy * missing; }
      const radial = vx * rx + vy * ry; if (radial < this.radialDeltaV) { const missing = this.radialDeltaV - radial; vx += rx * missing; vy += ry * missing; }
      let speed = Math.hypot(vx, vy);
      if (speed < this.minimumExitSpeed) {
        if (speed > 0.001) {
          vx *= this.minimumExitSpeed / speed;
          vy *= this.minimumExitSpeed / speed;
        } else {
          vx = ix * this.minimumExitSpeed;
          vy = iy * this.minimumExitSpeed;
        }
        speed = this.minimumExitSpeed;
      }
      if (speed > this.maxResultSpeed) { vx *= this.maxResultSpeed / speed; vy *= this.maxResultSpeed / speed; }
      body.setLinvel?.({ x: vx, y: vy }, true); this._lastHitAt = now;
      return { accepted: true, reason: 'hammer_strong_whack', impactDeltaV: this.impactDeltaV, minimumExitSpeed: this.minimumExitSpeed };
    } catch (error) { console.error('[MarbleDropHammerObstacle] impact failed', error); return { accepted: false, reason: 'hammer_impact_error' }; }
  }
}
