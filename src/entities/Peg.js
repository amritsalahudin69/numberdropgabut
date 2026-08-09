import { Graphics, Container } from 'pixi.js';

export class Peg {
  constructor(config = {}) {
    this.id = config.id || `peg-${Math.random()}`;
    this.x = config.x || 0;
    this.y = config.y || 0;
    this.radius = config.radius || 15;

    this.container = null;
    this.body = null;
    this.collider = null;
    this.physicsWorld = null;
    this.destroyed = false;

    if (config.physicsWorld && config.parentContainer) {
      this.spawn(config);
    }
  }

  spawn({ id, x, y, radius = 15, physicsWorld, parentContainer }) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.physicsWorld = physicsWorld;

    this.container = new Container();
    this.container.position.set(x, y);

    const gfx = new Graphics();
    gfx.circle(0, 0, radius).fill(0xffffff);
    this.container.addChild(gfx);

    if (parentContainer) {
      parentContainer.addChild(this.container);
    }

    if (this.physicsWorld && typeof this.physicsWorld.getWorld === 'function') {
      const world = this.physicsWorld.getWorld();
      const rapier = this.physicsWorld.getRapier();

      if (world && rapier) {
        const bodyDesc = rapier.RigidBodyDesc.fixed()
          .setTranslation(this.physicsWorld.toMeters(x), this.physicsWorld.toMeters(y));
        this.body = world.createRigidBody(bodyDesc);

        const colliderDesc = rapier.ColliderDesc.ball(this.physicsWorld.toMeters(radius))
          .setRestitution(0.7)
          .setFriction(0.1);

        this.collider = world.createCollider(colliderDesc, this.body);
      }
    }
  }

  getColliderHandle() {
    return this.collider ? this.collider.handle : null;
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;

    if (this.physicsWorld && typeof this.physicsWorld.getWorld === 'function') {
      const world = this.physicsWorld.getWorld();
      if (world) {
        if (this.collider) {
          try {
            world.removeCollider(this.collider, true);
          } catch {}
          this.collider = null;
        }
        if (this.body) {
          try {
            world.removeRigidBody(this.body);
          } catch {}
          this.body = null;
        }
      }
    }

    if (this.container) {
      if (this.container.parent) {
        this.container.parent.removeChild(this.container);
      }
      this.container.destroy({ children: true });
      this.container = null;
    }
  }
}
