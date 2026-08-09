import RAPIER from '@dimforge/rapier2d-compat';
import { PIXELS_PER_METER } from '../config/constants.js';

export class PhysicsWorld {
  constructor() {
    this.rapier = null;
    this.world = null;
  }

  async init() {
    await RAPIER.init();
    this.rapier = RAPIER;
    const gravity = new RAPIER.Vector2(0.0, 9.81);
    this.world = new RAPIER.World(gravity);
  }

  step(deltaSeconds = 1 / 60) {
    if (this.world) {
      this.world.step();
    }
  }

  getWorld() {
    return this.world;
  }

  getRapier() {
    return this.rapier;
  }

  toMeters(px) {
    return px / PIXELS_PER_METER;
  }

  toPixels(meters) {
    return meters * PIXELS_PER_METER;
  }

  destroy() {
    if (this.world) {
      this.world.free();
      this.world = null;
    }
    this.rapier = null;
  }
}
