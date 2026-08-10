export class RunRecorder {
  constructor() {
    this.operations = [];
    this.collisions = [];
    this.evolutions = [];
    this._operationSeq = 0;
    this._collisionSeq = 0;
    this._evolutionSeq = 0;
  }

  recordOperation({ source, sourceId, operator, operand, previousValue, nextValue, timestampMs }) {
    const record = {
      seq: ++this._operationSeq,
      source,
      sourceId,
      operator,
      operand,
      previousValue,
      nextValue,
      timestampMs,
    };
    this.operations.push(record);
    return record;
  }

  recordCollision({ type, entityId, accepted, reason, timestampMs }) {
    const record = {
      seq: ++this._collisionSeq,
      type,
      entityId,
      accepted,
      reason,
      timestampMs,
    };
    this.collisions.push(record);
    return record;
  }

  recordEvolution({ previousValue, nextValue, source, sourceId, timestampMs }) {
    const record = {
      seq: ++this._evolutionSeq,
      previousValue,
      nextValue,
      source,
      sourceId,
      timestampMs,
    };
    this.evolutions.push(record);
    return record;
  }

  getSnapshot() {
    return {
      operations: this.operations.map(op => ({ ...op })),
      collisions: this.collisions.map(col => ({ ...col })),
      evolutions: this.evolutions.map(evo => ({ ...evo })),
    };
  }

  getLastOperation() {
    return this.operations.length > 0 ? this.operations[this.operations.length - 1] : null;
  }

  clear() {
    this.operations = [];
    this.collisions = [];
    this.evolutions = [];
    this._operationSeq = 0;
    this._collisionSeq = 0;
    this._evolutionSeq = 0;
  }

  destroy() {
    this.clear();
  }
}
