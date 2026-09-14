import { Container, Graphics } from 'pixi.js';
import { MarbleDropObstacleBase } from './MarbleDropObstacleBase.js';
const TAU = Math.PI * 2;
export class MarbleDropMovingBlock extends MarbleDropObstacleBase {
  constructor({ definition = {}, physicsWorld = null, parentContainer = null } = {}) {
    super({ definition, physicsWorld, parentContainer });
    this.baseX = Number(definition.x) || 0;
    this.baseY = Number(definition.y) || 0;
    this.currentX = this.baseX;
    this.currentY = this.baseY;
    this.width = Math.max(24, Number(definition.width) || 180);
    this.height = Math.max(18, Number(definition.height) || 36);
    this.axis = definition.axis === 'y' ? 'y' : 'x';
    this.distance = Math.max(0, Number(definition.distance) || 120);
    this.speed = Math.max(0, Number(definition.speed) || 0.2);
    this.phase = Number.isFinite(definition.phase) ? definition.phase : 0;
    this.restitution = Number.isFinite(definition.restitution) ? definition.restitution : 0.72;
    this.friction = Number.isFinite(definition.friction) ? definition.friction : 0.12;
    this.color = Number.isFinite(definition.color) ? definition.color : 0x5cc8ff;
    this.elapsed = 0;
  }
  spawn() {
    if (this.destroyed) return;
    this.container = new Container();
    this.container.position.set(this.currentX, this.currentY);
    const block = new Graphics();
    block.roundRect(-this.width / 2, -this.height / 2, this.width, this.height, 10).fill({ color: this.color }).stroke({ width: 5, color: 0xffffff, alpha: 0.88 });
    const highlight = new Graphics();
    highlight.roundRect(-this.width * 0.32, -this.height * 0.16, this.width * 0.64, this.height * 0.32, 6).fill({ color: 0xffffff, alpha: 0.2 });
    this.container.addChild(block, highlight);
    if (this.parentContainer) this.parentContainer.addChild(this.container);
    this._attachPhysics();
  }
  _attachPhysics() {
    if (!this.physicsWorld || typeof this.physicsWorld.getWorld !== 'function') return;
    const world = this.physicsWorld.getWorld();
    const rapier = this.physicsWorld.getRapier();
    if (!world || !rapier) return;
    const bodyDesc = rapier.RigidBodyDesc.kinematicPositionBased().setTranslation(this.physicsWorld.toMeters(this.currentX), this.physicsWorld.toMeters(this.currentY));
    this.body = world.createRigidBody(bodyDesc);
    const colliderDesc = rapier.ColliderDesc.cuboid(this.physicsWorld.toMeters(this.width / 2), this.physicsWorld.toMeters(this.height / 2));
    colliderDesc.setRestitution(this.restitution);
    colliderDesc.setFriction(this.friction);
    if (typeof colliderDesc.setActiveEvents === 'function' && rapier.ActiveEvents) colliderDesc.setActiveEvents(rapier.ActiveEvents.COLLISION_EVENTS);
    this.collider = world.createCollider(colliderDesc, this.body);
  }
  update(deltaSeconds = 1 / 60) {
    if (this.destroyed || !this.container) return;
    const dt = Math.max(0, Math.min(0.05, Number(deltaSeconds) || 0));
    this.elapsed += dt;
    const wave = Math.sin((this.elapsed * this.speed + this.phase) * TAU);
    if (this.axis === 'x') { this.currentX = this.baseX + wave * this.distance; this.currentY = this.baseY; }
    else { this.currentX = this.baseX; this.currentY = this.baseY + wave * this.distance; }
    this.container.position.set(this.currentX, this.currentY);
    if (this.body && this.physicsWorld) {
      try { this.body.setNextKinematicTranslation({ x: this.physicsWorld.toMeters(this.currentX), y: this.physicsWorld.toMeters(this.currentY) }); } catch {}
    }
  }
}
