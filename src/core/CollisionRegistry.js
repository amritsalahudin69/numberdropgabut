export class CollisionRegistry {
  constructor() {
    this.registry = new Map();
  }

  // Register a collider handle. Idempotent if same metadata; deterministic rejection if different metadata exists.
  register(colliderHandle, metadata) {
    if (colliderHandle === undefined || colliderHandle === null) {
      throw new Error('CollisionRegistry.register requires a valid colliderHandle');
    }

    const existing = this.registry.get(colliderHandle);
    if (existing !== undefined) {
      // If identical metadata object (strict equal) treat as idempotent no-op
      if (existing === metadata) return;
      // If shallow-equal by JSON (best-effort) also allow idempotent
      try {
        if (JSON.stringify(existing) === JSON.stringify(metadata)) return;
      } catch (e) {
        // fallthrough
      }
      // Deterministic rejection to avoid silent duplicate registration
      throw new Error(`CollisionRegistry: handle ${String(colliderHandle)} already registered with different metadata`);
    }

    this.registry.set(colliderHandle, metadata);
  }

  unregister(colliderHandle) {
    if (colliderHandle !== undefined && colliderHandle !== null) {
      this.registry.delete(colliderHandle);
    }
  }

  get(colliderHandle) {
    return this.registry.get(colliderHandle) || null;
  }

  clear() {
    this.registry.clear();
  }

  // Backwards-compatible size() and explicit getCount()
  size() {
    return this.registry.size;
  }

  getCount() {
    return this.registry.size;
  }
}
