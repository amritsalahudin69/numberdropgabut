export class Clock {
  now() {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
      return performance.now();
    }
    return Date.now();
  }
}

export class FakeClock {
  constructor(initialTime = 0) {
    this.currentTime = initialTime;
  }

  now() {
    return this.currentTime;
  }

  advance(ms) {
    this.currentTime += ms;
  }

  setTime(timeMs) {
    this.currentTime = timeMs;
  }
}
