import { Container, Graphics } from 'pixi.js';
import { MarbleDropObstacleBase } from './MarbleDropObstacleBase.js';

const TAU = Math.PI * 2;

export class MarbleDropGearObstacle extends MarbleDropObstacleBase {
  constructor({ definition = {}, physicsWorld = null, parentContainer = null } = {}) {
    super({ definition, physicsWorld, parentContainer });
    this.x = Number(definition.x) || 0;
    this.y = Number(definition.y) || 0;
    this.radius = Math.max(24, Number(definition.radius) || 54);
    this.teeth = Math.max(8, Math.min(20, Math.round(Number(definition.teeth) || 12)));
    this.rotationSpeed = Math.max(0, Number(definition.rotationSpeed) || 2.2);
    this.clockwise = definition.clockwise !== false;
    this.color = Number.isFinite(definition.color) ? definition.color : 0xffc857;
    this.innerColor = Number.isFinite(definition.innerColor) ? definition.innerColor : 0xf28f3b;
    this.restitution = Number.isFinite(definition.restitution) ? definition.restitution : 0.52;
    this.friction = Number.isFinite(definition.friction) ? definition.friction : 0.24;
    this.tangentialDeltaV = Math.max(0, Number(definition.tangentialDeltaV) || 3.2);
    this.radialDeltaV = Math.max(0, Number(definition.radialDeltaV) || 1.1);
    this.maxResultSpeed = Math.max(3, Number(definition.maxResultSpeed) || 11);
    this.cooldownMs = Math.max(0, Number(definition.cooldownMs) || 90);
    this._lastHitAt = -Infinity;
  }
  spawn() {
    if (this.destroyed) return;
    this.container = new Container();
    this.container.position.set(this.x, this.y);
    const toothWidth = Math.max(8, this.radius * 0.24);
    const toothHeight = Math.max(10, this.radius * 0.28);
    for (let i = 0; i < this.teeth; i += 1) {
      const tooth = new Graphics();
      tooth.roundRect(-toothWidth / 2, -this.radius - toothHeight * 0.46, toothWidth, toothHeight, 3).fill({ color: this.color }).stroke({ width: 2, color: 0xffffff, alpha: 0.42 });
      tooth.rotation = (i / this.teeth) * TAU;
      this.container.addChild(tooth);
    }
    const wheel = new Graphics();
    wheel.circle(0, 0, this.radius * 0.86).fill({ color: this.color }).stroke({ width: 5, color: 0xffffff, alpha: 0.78 });
    wheel.circle(0, 0, this.radius * 0.42).fill({ color: this.innerColor });
    wheel.circle(0, 0, this.radius * 0.16).fill({ color: 0x424b54 }).stroke({ width: 3, color: 0xffffff, alpha: 0.68 });
    this.container.addChild(wheel);
    if (this.parentContainer) this.parentContainer.addChild(this.container);
    this._attachPhysics();
  }
  _attachPhysics() {
    if (!this.physicsWorld || typeof this.physicsWorld.getWorld !== 'function') return;
    const world = this.physicsWorld.getWorld();
    const rapier = this.physicsWorld.getRapier();
    if (!world || !rapier) return;
    const bodyDesc = rapier.RigidBodyDesc.fixed().setTranslation(this.physicsWorld.toMeters(this.x), this.physicsWorld.toMeters(this.y));
    this.body = world.createRigidBody(bodyDesc);
    const colliderDesc = rapier.ColliderDesc.ball(this.physicsWorld.toMeters(this.radius));
    colliderDesc.setRestitution(this.restitution);
    colliderDesc.setFriction(this.friction);
    if (typeof colliderDesc.setActiveEvents === 'function' && rapier.ActiveEvents) colliderDesc.setActiveEvents(rapier.ActiveEvents.COLLISION_EVENTS);
    this.collider = world.createCollider(colliderDesc, this.body);
  }
  update(deltaSeconds = 1 / 60) {
    if (this.destroyed || !this.container) return;
    const dt = Math.max(0, Math.min(0.05, Number(deltaSeconds) || 0));
    this.container.rotation += (this.clockwise ? 1 : -1) * this.rotationSpeed * dt;
  }
  onGacoanCollision(gacoan) {
    const body = gacoan?.body;
    if (!body || !this.physicsWorld) return { accepted: false, reason: 'gear_missing_body' };
    const now = Date.now();
    if (now - this._lastHitAt < this.cooldownMs) return { accepted: false, reason: 'gear_cooldown' };
    try {
      const pos = body.translation();
      const dx = pos.x - this.physicsWorld.toMeters(this.x);
      const dy = pos.y - this.physicsWorld.toMeters(this.y);
      const distance = Math.hypot(dx, dy) || 1;
      const nx = dx / distance;
      const ny = dy / distance;
      const direction = this.clockwise ? 1 : -1;
      const tx = direction * ny;
      const ty = direction * -nx;
      const mass = Number.isFinite(body.mass?.()) && body.mass() > 0 ? body.mass() : 1;
      body.applyImpulse?.({ x: (tx * this.tangentialDeltaV + nx * this.radialDeltaV) * mass, y: (ty * this.tangentialDeltaV + ny * this.radialDeltaV) * mass }, true);
      try { const v = body.linvel(); const speed = Math.hypot(v.x, v.y); if (speed > this.maxResultSpeed) body.setLinvel({ x: v.x * this.maxResultSpeed / speed, y: v.y * this.maxResultSpeed / speed }, true); } catch {}
      this._lastHitAt = now;
      return { accepted: true, reason: 'gear_redirect' };
    } catch (error) { console.error('[MarbleDropGearObstacle] impact failed', error); return { accepted: false, reason: 'gear_impact_error' }; }
  }
}
