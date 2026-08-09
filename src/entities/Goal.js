import { Container, Sprite, Graphics, Text } from 'pixi.js';

export class Goal {
  constructor(config = {}) {
    this.id = config.id || `goal-${Math.random()}`;
    this.value = typeof config.value === 'number' ? config.value : 0;
    this.operator = config.operator || '-';
    this.x = config.x || 0;
    this.y = config.y || 0;
    this.width = config.width || 160;
    this.height = config.height || 80;

    this.container = null;
    this.body = null;
    this.collider = null;
    this.physicsWorld = null;
    this.destroyed = false;

    if (config.physicsWorld && config.parentContainer) {
      this.spawn(config);
    }
  }

  spawn({ id, value, operator = '-', x, y, width = 160, height = 80, texture, physicsWorld, parentContainer }) {
    this.id = id;
    this.value = value;
    this.operator = operator;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.physicsWorld = physicsWorld;

    this.container = new Container();
    this.container.position.set(x, y);

    const bucketBg = new Graphics();
    bucketBg.roundRect(-width / 2, -height / 2, width, height, 12).fill(0x2c3e50);
    this.container.addChild(bucketBg);

    if (texture) {
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.width = height * 0.7;
      sprite.height = height * 0.7;
      this.container.addChild(sprite);
    } else {
      const label = new Text({
        text: `GOAL ${value}`,
        style: {
          fill: '#ffffff',
          fontSize: 20,
          fontWeight: 'bold',
        },
      });
      label.anchor.set(0.5);
      this.container.addChild(label);
    }

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

        const colliderDesc = rapier.ColliderDesc.cuboid(
          this.physicsWorld.toMeters(width / 2),
          this.physicsWorld.toMeters(height / 2)
        ).setSensor(true);

        if (typeof colliderDesc.setActiveEvents === 'function' && rapier.ActiveEvents) {
          colliderDesc.setActiveEvents(rapier.ActiveEvents.COLLISION_EVENTS);
        }

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
