import { MarbleDropMovingBlock } from '../entities/obstacles/MarbleDropMovingBlock.js';
import { MarbleDropGearObstacle } from '../entities/obstacles/MarbleDropGearObstacle.js';
import { MarbleDropHammerObstacle } from '../entities/obstacles/MarbleDropHammerObstacle.js';
export class MarbleDropObstacleSystem {
  constructor({ physicsWorld = null, parentContainer = null, registry = null } = {}) { this.physicsWorld = physicsWorld; this.parentContainer = parentContainer; this.registry = registry; this.obstacles = []; this.byId = new Map(); this.destroyed = false; }
  build(definitions = []) { if (this.destroyed) return; this.clear(); for (const definition of (Array.isArray(definitions) ? definitions : [])) { if (!definition || definition.enabled === false) continue; const obstacle = this._createObstacle(definition); if (!obstacle) continue; obstacle.spawn(); this.obstacles.push(obstacle); this.byId.set(obstacle.id, obstacle); const handle = obstacle.getColliderHandle(); if (handle !== null && handle !== undefined && this.registry) this.registry.register(handle, { type: 'obstacle', id: obstacle.id, obstacleType: obstacle.type, entity: obstacle }); } }
  _createObstacle(definition) {
    const type = String(definition?.type || '').trim().toLowerCase();
    if (type === 'moving-block' || type === 'moving_block' || type === 'movingblock') return new MarbleDropMovingBlock({ definition, physicsWorld: this.physicsWorld, parentContainer: this.parentContainer });
    if (type === 'gear') return new MarbleDropGearObstacle({ definition, physicsWorld: this.physicsWorld, parentContainer: this.parentContainer });
    if (type === 'hammer') return new MarbleDropHammerObstacle({ definition, physicsWorld: this.physicsWorld, parentContainer: this.parentContainer });
    console.warn('[MarbleDropObstacleSystem] unknown obstacle type:', definition?.type);
    return null;
  }
  update(deltaSeconds = 1 / 60) { if (this.destroyed) return; for (const obstacle of this.obstacles) obstacle.update(deltaSeconds); }
  getById(id) { return this.byId.get(id) || null; }
  handleGacoanCollision({ obstacleId, gacoan } = {}) { if (this.destroyed) return { accepted: false, reason: 'system_destroyed' }; const obstacle = this.getById(obstacleId); if (!obstacle) return { accepted: false, reason: 'unknown_obstacle' }; if (typeof obstacle.onGacoanCollision === 'function') return obstacle.onGacoanCollision(gacoan) || { accepted: true, reason: 'physics_only' }; return { accepted: true, reason: 'physics_only' }; }
  clear() { for (const obstacle of this.obstacles) { const handle = obstacle?.getColliderHandle?.(); if (handle !== null && handle !== undefined && this.registry) { try { this.registry.unregister(handle); } catch {} } try { obstacle?.destroy?.(); } catch (error) { console.error('[MarbleDropObstacleSystem] obstacle destroy failed', error); } } this.obstacles = []; this.byId.clear(); }
  destroy() { if (this.destroyed) return; this.clear(); this.destroyed = true; this.physicsWorld = null; this.parentContainer = null; this.registry = null; }
}
