import { Sprite, Container, Graphics } from 'pixi.js';

export class Gacoan {
  constructor() {
    this.value = 0;
    this.sprite = null;
    this.container = null;
    this.body = null;
    this.collider = null;
    this.physicsWorld = null;
    this.radiusPx = 40;
    this.destroyed = false;

    this._frozen = false;
    this._savedLinvel = null;
    this._savedAngvel = null;
  }

  spawn({ value, texture, x, y, radiusPx = 40, physicsWorld, parentContainer }) {
    this.value = value;
    this.radiusPx = radiusPx;
    this.physicsWorld = physicsWorld;

    this.container = new Container();
    this.container.position.set(x, y);

    if (texture) {
      this.sprite = new Sprite(texture);
      this.sprite.anchor.set(0.5);
      this.sprite.width = radiusPx * 2;
      this.sprite.height = radiusPx * 2;
      this.container.addChild(this.sprite);
    } else {
      const fallbackGfx = new Graphics();
      fallbackGfx.circle(0, 0, radiusPx).fill(0xffcc00);
      this.container.addChild(fallbackGfx);
    }

    if (parentContainer) {
      parentContainer.addChild(this.container);
    }

    if (this.physicsWorld && typeof this.physicsWorld.getWorld === 'function') {
      const world = this.physicsWorld.getWorld();
      const rapier = this.physicsWorld.getRapier();

      if (world && rapier) {
        const bodyDesc = rapier.RigidBodyDesc.dynamic()
          .setTranslation(this.physicsWorld.toMeters(x), this.physicsWorld.toMeters(y))
          .setCcdEnabled(true);
        this.body = world.createRigidBody(bodyDesc);

        const colliderDesc = rapier.ColliderDesc.ball(this.physicsWorld.toMeters(radiusPx))
          .setRestitution(0.6)
          .setFriction(0.2);

        if (typeof colliderDesc.setActiveEvents === 'function' && rapier.ActiveEvents) {
          colliderDesc.setActiveEvents(rapier.ActiveEvents.COLLISION_EVENTS);
        }

        this.collider = world.createCollider(colliderDesc, this.body);
      }
    }
  }

  setValue(newValue, newTexture) {
    this.value = newValue;
    if (this.sprite && newTexture) {
      this.sprite.texture = newTexture;
      this.sprite.width = this.radiusPx * 2;
      this.sprite.height = this.radiusPx * 2;
    }
  }

  freeze() {
    if (this._frozen || !this.body) return;

    const rapier = this.physicsWorld && this.physicsWorld.getRapier();
    if (!rapier) return;

    // Save current velocity before freezing
    const linvel = this.body.linvel();
    this._savedLinvel = { x: linvel.x, y: linvel.y };
    this._savedAngvel = this.body.angvel();

    // Switch to Fixed type to stop all physics motion
    this.body.setBodyType(rapier.RigidBodyType.Fixed, true);
    this._frozen = true;
  }

  unfreeze() {
    if (!this._frozen || !this.body) return;

    const rapier = this.physicsWorld && this.physicsWorld.getRapier();
    if (!rapier) return;

    // Restore Dynamic type
    this.body.setBodyType(rapier.RigidBodyType.Dynamic, true);

    // Restore saved velocity
    if (this._savedLinvel) {
      this.body.setLinvel(this._savedLinvel, true);
      this._savedLinvel = null;
    }
    if (this._savedAngvel !== null) {
      this.body.setAngvel(this._savedAngvel, true);
      this._savedAngvel = null;
    }

    this._frozen = false;
  }

  isFrozen() {
    return this._frozen;
  }

  syncFromPhysics() {
    if (this._frozen) return; // Position locked during freeze
    if (this.body && this.physicsWorld && this.container) {
      const pos = this.body.translation();
      const pxX = this.physicsWorld.toPixels(pos.x);
      const pxY = this.physicsWorld.toPixels(pos.y);
      this.container.position.set(pxX, pxY);

      if (this.sprite) {
        this.sprite.rotation = this.body.rotation();
      }
    }
  }

  getColliderHandle() {
    return this.collider ? this.collider.handle : null;
  }

  getBodyHandle() {
    return this.body ? this.body.handle : null;
  }

  getPosition() {
    if (this.container) {
      return { x: this.container.x, y: this.container.y };
    }
    return { x: 0, y: 0 };
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;

    // Unfreeze before destroying to clean up properly
    if (this._frozen && this.body) {
      const rapier = this.physicsWorld && this.physicsWorld.getRapier();
      if (rapier) {
        try {
          this.body.setBodyType(rapier.RigidBodyType.Dynamic, true);
        } catch {}
      }
      this._frozen = false;
    }

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
      this.sprite = null;
    }
  }
}
