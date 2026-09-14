export class MarbleDropObstacleBase {
  constructor({ definition = {}, physicsWorld = null, parentContainer = null } = {}) {
    this.definition = definition;
    this.id = String(definition.id || 'marbledrop-obstacle');
    this.type = String(definition.type || 'unknown');
    this.physicsWorld = physicsWorld;
    this.parentContainer = parentContainer;
    this.container = null;
    this.body = null;
    this.collider = null;
    this.destroyed = false;
  }
  spawn() { throw new Error('MarbleDropObstacleBase.spawn() must be implemented'); }
  update(_deltaSeconds = 1 / 60) {}
  onGacoanCollision(_gacoan) { return { accepted: true, reason: 'physics_only' }; }
  getColliderHandle() { return this.collider ? this.collider.handle : null; }
  _removePhysics() {
    if (!this.physicsWorld || typeof this.physicsWorld.getWorld !== 'function') { this.collider = null; this.body = null; return; }
    const world = this.physicsWorld.getWorld();
    if (!world) { this.collider = null; this.body = null; return; }
    if (this.collider) { try { world.removeCollider(this.collider, true); } catch {} this.collider = null; }
    if (this.body) { try { world.removeRigidBody(this.body); } catch {} this.body = null; }
  }
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this._removePhysics();
    if (this.container) {
      try { if (this.container.parent) this.container.parent.removeChild(this.container); } catch {}
      try { this.container.destroy({ children: true }); } catch {}
      this.container = null;
    }
    this.parentContainer = null;
    this.physicsWorld = null;
  }
}
