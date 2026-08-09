import { Container, Graphics, Text } from 'pixi.js';

export class Gate {
  constructor(config = {}) {
    this.id = config.id || `gate-${Math.random()}`;
    this.operator = config.operator || '+';
    this.operand = typeof config.operand === 'number' ? config.operand : 0;
    this.x = config.x || 0;
    this.y = config.y || 0;
    this.startX = this.x;
    this.width = config.width || 140;
    this.height = config.height || 50;
    this.speed = config.speed || 0;
    this.range = config.range || 0;
    this.time = 0;

    this.container = null;
    this.body = null;
    this.collider = null;
    this.physicsWorld = null;
    this.destroyed = false;

    if (config.physicsWorld && config.parentContainer) {
      this.spawn(config);
    }
  }

  spawn({ id, operator, operand, x, y, width = 140, height = 50, speed = 0, range = 0, physicsWorld, parentContainer }) {
    this.id = id;
    this.operator = operator;
    this.operand = operand;
    this.x = x;
    this.y = y;
    this.startX = x;
    this.width = width;
    this.height = height;
    this.speed = speed;
    this.range = range;
    this.physicsWorld = physicsWorld;

    this.container = new Container();
    this.container.position.set(x, y);

    const box = new Graphics();
    box.roundRect(-width / 2, -height / 2, width, height, 10).fill(0x3498db);

    const opLabelText = `${this.operator}${this.operand}`;
    const label = new Text({
      text: opLabelText,
      style: {
        fill: '#ffffff',
        fontSize: 24,
        fontWeight: 'bold',
        stroke: { color: '#122033', width: 3 },
      },
    });
    label.anchor.set(0.5);

    this.container.addChild(box, label);

    if (parentContainer) {
      parentContainer.addChild(this.container);
    }

    if (this.physicsWorld && typeof this.physicsWorld.getWorld === 'function') {
      const world = this.physicsWorld.getWorld();
      const rapier = this.physicsWorld.getRapier();

      if (world && rapier) {
        const bodyDesc = rapier.RigidBodyDesc.kinematicPositionBased()
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

  update(deltaSeconds = 1 / 60) {
    if (this.speed > 0 && this.range > 0 && this.body && this.physicsWorld) {
      this.time += deltaSeconds * this.speed;
      const offsetX = Math.sin(this.time) * this.range;
      const currentX = this.startX + offsetX;
      this.container.position.x = currentX;

      const metersX = this.physicsWorld.toMeters(currentX);
      const metersY = this.physicsWorld.toMeters(this.y);
      this.body.setNextKinematicTranslation({ x: metersX, y: metersY });
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
