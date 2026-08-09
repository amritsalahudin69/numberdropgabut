export const GAMEPLAY_STATE = Object.freeze({
  BOOT: 'BOOT',
  READY: 'READY',
  FALLING: 'FALLING',
  RESOLVING: 'RESOLVING',
  HOLDING: 'HOLDING',
  CLEANUP: 'CLEANUP',
  SUMMARY: 'SUMMARY',
  ERROR: 'ERROR',
  DESTROYED: 'DESTROYED',
});

let sessionCounter = 0;

export class MarbleDropSession {
  constructor() {
    this.sessionId = null;
    this.state = GAMEPLAY_STATE.BOOT;
    this.startingValue = 0;
    this.currentValue = 0;
    this.opsUsed = 0;
    this.maxOps = 6;
    this.activeGacoan = null;
    this.completed = false;

    this.holdStartedAt = 0;
    this.holdUntil = 0;
    this.postHoldAction = null;
  }

  transitionTo(newState) {
    const validTransitions = {
      [GAMEPLAY_STATE.BOOT]: [GAMEPLAY_STATE.READY, GAMEPLAY_STATE.ERROR, GAMEPLAY_STATE.DESTROYED],
      [GAMEPLAY_STATE.READY]: [GAMEPLAY_STATE.FALLING, GAMEPLAY_STATE.SUMMARY, GAMEPLAY_STATE.ERROR, GAMEPLAY_STATE.DESTROYED],
      [GAMEPLAY_STATE.FALLING]: [GAMEPLAY_STATE.RESOLVING, GAMEPLAY_STATE.CLEANUP, GAMEPLAY_STATE.ERROR, GAMEPLAY_STATE.DESTROYED],
      [GAMEPLAY_STATE.RESOLVING]: [GAMEPLAY_STATE.HOLDING, GAMEPLAY_STATE.CLEANUP, GAMEPLAY_STATE.ERROR, GAMEPLAY_STATE.DESTROYED],
      [GAMEPLAY_STATE.HOLDING]: [GAMEPLAY_STATE.FALLING, GAMEPLAY_STATE.CLEANUP, GAMEPLAY_STATE.ERROR, GAMEPLAY_STATE.DESTROYED],
      [GAMEPLAY_STATE.CLEANUP]: [GAMEPLAY_STATE.READY, GAMEPLAY_STATE.SUMMARY, GAMEPLAY_STATE.ERROR, GAMEPLAY_STATE.DESTROYED],
      [GAMEPLAY_STATE.SUMMARY]: [GAMEPLAY_STATE.READY, GAMEPLAY_STATE.ERROR, GAMEPLAY_STATE.DESTROYED],
      [GAMEPLAY_STATE.ERROR]: [GAMEPLAY_STATE.READY, GAMEPLAY_STATE.DESTROYED],
      [GAMEPLAY_STATE.DESTROYED]: [],
    };

    const allowed = validTransitions[this.state] || [];
    if (!allowed.includes(newState)) {
      const errMessage = `Invalid session state transition: ${this.state} -> ${newState}`;
      this.state = GAMEPLAY_STATE.ERROR;
      throw new Error(errMessage);
    }
    this.state = newState;
  }

  start(level) {
    if (!level || typeof level.startingValue !== 'number') {
      throw new Error('MarbleDropSession.start requires a valid level config');
    }
    sessionCounter++;
    this.sessionId = `session-${sessionCounter}-${Date.now()}`;
    this.startingValue = level.startingValue;
    this.currentValue = level.startingValue;
    this.opsUsed = 0;
    this.maxOps = level.maxOps || 6;
    this.activeGacoan = null;
    this.completed = false;

    this.holdStartedAt = 0;
    this.holdUntil = 0;
    this.postHoldAction = null;

    this.state = GAMEPLAY_STATE.BOOT;
    this.transitionTo(GAMEPLAY_STATE.READY);
  }

  getState() {
    return this.state;
  }

  getCurrentValue() {
    return this.currentValue;
  }

  getOpsUsed() {
    return this.opsUsed;
  }

  getOpsRemaining() {
    return Math.max(0, this.maxOps - this.opsUsed);
  }

  getActiveGacoan() {
    return this.activeGacoan;
  }

  canDrop() {
    return this.state === GAMEPLAY_STATE.READY && this.opsUsed < this.maxOps && this.activeGacoan === null;
  }

  beginDrop(gacoan) {
    if (!this.canDrop()) {
      throw new Error(`Cannot begin drop from state ${this.state} (activeGacoan=${!!this.activeGacoan}, opsRemaining=${this.getOpsRemaining()})`);
    }
    if (!gacoan) {
      throw new Error('beginDrop requires a gacoan instance');
    }
    this.activeGacoan = gacoan;
    this.opsUsed += 1;
    this.transitionTo(GAMEPLAY_STATE.FALLING);
  }

  beginResolve() {
    this.transitionTo(GAMEPLAY_STATE.RESOLVING);
  }

  beginHold({ durationMs = 5000, postHoldAction = 'RESUME_FALL', startNowMs = 0 }) {
    if (this.state !== GAMEPLAY_STATE.RESOLVING) {
      throw new Error(`Cannot enter HOLDING from state: ${this.state}`);
    }
    this.holdStartedAt = startNowMs;
    this.holdUntil = startNowMs + durationMs;
    this.postHoldAction = postHoldAction;
    this.transitionTo(GAMEPLAY_STATE.HOLDING);
  }

  isHoldExpired(nowMs) {
    if (this.state !== GAMEPLAY_STATE.HOLDING) return false;
    return nowMs >= this.holdUntil;
  }

  getHoldContext() {
    if (this.state !== GAMEPLAY_STATE.HOLDING) return null;
    return {
      startedAt: this.holdStartedAt,
      until: this.holdUntil,
      postHoldAction: this.postHoldAction,
    };
  }

  finishGateHold() {
    if (this.state !== GAMEPLAY_STATE.HOLDING) {
      throw new Error(`Cannot finishGateHold from state: ${this.state}`);
    }
    this.holdStartedAt = 0;
    this.holdUntil = 0;
    this.postHoldAction = null;
    this.transitionTo(GAMEPLAY_STATE.FALLING);
  }

  finishGoalHold() {
    if (this.state !== GAMEPLAY_STATE.HOLDING) {
      throw new Error(`Cannot finishGoalHold from state: ${this.state}`);
    }
    this.holdStartedAt = 0;
    this.holdUntil = 0;
    this.postHoldAction = null;
    this.transitionTo(GAMEPLAY_STATE.CLEANUP);
  }

  resumeFall() {
    this.transitionTo(GAMEPLAY_STATE.FALLING);
  }

  beginCleanup() {
    this.transitionTo(GAMEPLAY_STATE.CLEANUP);
  }

  finishCleanup() {
    this.activeGacoan = null;
    this.holdStartedAt = 0;
    this.holdUntil = 0;
    this.postHoldAction = null;
    if (this.opsUsed >= this.maxOps) {
      this.completed = true;
      this.transitionTo(GAMEPLAY_STATE.SUMMARY);
    } else {
      this.transitionTo(GAMEPLAY_STATE.READY);
    }
  }

  complete() {
    this.completed = true;
    if (this.state !== GAMEPLAY_STATE.SUMMARY) {
      this.transitionTo(GAMEPLAY_STATE.SUMMARY);
    }
  }

  reset(level) {
    this.start(level);
  }

  destroy() {
    this.activeGacoan = null;
    this.holdStartedAt = 0;
    this.holdUntil = 0;
    this.postHoldAction = null;
    this.state = GAMEPLAY_STATE.DESTROYED;
  }
}
