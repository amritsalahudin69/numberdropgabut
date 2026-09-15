function jsonPrimitive(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  return undefined;
}

export class RunRecorder {
  constructor() { this.clear(); }

  recordOperation({ source, sourceId, operator, operand, previousValue, nextValue, timestampMs }) {
    const record = { seq: ++this._operationSeq, source, sourceId, operator, operand, previousValue, nextValue, timestampMs };
    this.operations.push(record);
    return record;
  }

  recordCollision({ type, entityId, accepted, reason, timestampMs }) {
    const record = { seq: ++this._collisionSeq, type, entityId, accepted, reason, timestampMs };
    this.collisions.push(record);
    return record;
  }

  recordEvolution({ previousValue, nextValue, source, sourceId, timestampMs }) {
    const record = { seq: ++this._evolutionSeq, previousValue, nextValue, source, sourceId, timestampMs };
    this.evolutions.push(record);
    return record;
  }

  beginAttempt({ startValue, metadata = null, startedAtMs = Date.now() } = {}) {
    if (this.activeAttempt) return false;
    const attempt = {
      attemptId: this.nextAttemptId++,
      startValue: jsonPrimitive(startValue),
      finalValue: null,
      outcome: null,
      reason: null,
      startedAt: jsonPrimitive(startedAtMs),
      completedAt: null,
      operationRange: { start: this.operations.length, endExclusive: null },
      collisionRange: { start: this.collisions.length, endExclusive: null },
      evolutionRange: { start: this.evolutions.length, endExclusive: null },
      events: [],
    };
    if (metadata && typeof metadata === 'object') {
      const safeMetadata = {};
      for (const [key, value] of Object.entries(metadata)) {
        const primitive = jsonPrimitive(value);
        if (primitive !== undefined) safeMetadata[key] = primitive;
      }
      if (Object.keys(safeMetadata).length) attempt.metadata = safeMetadata;
    }
    this.activeAttempt = attempt;
    return { ...attempt, events: [] };
  }

  recordAttemptEvent(type, payload = {}) {
    if (!this.activeAttempt || typeof type !== 'string' || !type) return false;
    const event = { eventId: this.nextEventId++, type, at: jsonPrimitive(payload.at ?? payload.timestampMs ?? Date.now()) };
    for (const [key, value] of Object.entries(payload)) {
      if (key === 'at' || key === 'timestampMs') continue;
      const primitive = jsonPrimitive(value);
      if (primitive !== undefined) event[key] = primitive;
    }
    this.activeAttempt.events.push(event);
    return event;
  }

  finishAttempt({ outcome, reason = null, finalValue = null, completedAtMs = Date.now() } = {}) {
    if (!this.activeAttempt || !['success', 'failed', 'out_of_play', 'error'].includes(outcome)) return false;
    const attempt = this.activeAttempt;
    attempt.finalValue = jsonPrimitive(finalValue);
    attempt.outcome = outcome;
    attempt.reason = reason === null ? null : String(reason);
    attempt.completedAt = jsonPrimitive(completedAtMs);
    attempt.operationRange.endExclusive = this.operations.length;
    attempt.collisionRange.endExclusive = this.collisions.length;
    attempt.evolutionRange.endExclusive = this.evolutions.length;
    this.attempts.push(attempt);
    this.activeAttempt = null;
    return true;
  }

  getSnapshot() {
    return {
      operations: this.operations.map(op => ({ ...op })),
      collisions: this.collisions.map(col => ({ ...col })),
      evolutions: this.evolutions.map(evo => ({ ...evo })),
      attempts: this.attempts.map(attempt => ({
        ...attempt,
        operationRange: { ...attempt.operationRange },
        collisionRange: { ...attempt.collisionRange },
        evolutionRange: { ...attempt.evolutionRange },
        events: attempt.events.map(event => ({ ...event })),
      })),
    };
  }

  getLastOperation() {
    return this.operations.length > 0 ? this.operations[this.operations.length - 1] : null;
  }

  clear() {
    this.operations = [];
    this.collisions = [];
    this.evolutions = [];
    this.attempts = [];
    this.activeAttempt = null;
    this.nextAttemptId = 1;
    this.nextEventId = 1;
    this._operationSeq = 0;
    this._collisionSeq = 0;
    this._evolutionSeq = 0;
  }

  destroy() { this.clear(); }
}
