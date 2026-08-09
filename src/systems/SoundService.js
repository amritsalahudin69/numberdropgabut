export class SoundService {
  constructor({ AudioContextImpl = null, assetService = null } = {}) {
    this.assetService = assetService;
    this.AudioContextImpl = AudioContextImpl || (typeof window !== 'undefined' ? window.AudioContext || window.webkitAudioContext : null);
    this.ctx = null;
    this.masterGain = null;
    this.started = false;
    this._init();
  }

  _init() {
    if (!this.AudioContextImpl) return; // headless or unavailable
    try {
      this.ctx = new this.AudioContextImpl();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.masterGain.gain.value = 0.6;
    } catch (e) {
      console.warn('[SoundService] AudioContext init failed:', e && e.message);
      this.ctx = null;
      this.masterGain = null;
    }
  }

  async _ensureStarted() {
    if (!this.ctx) return false;
    if (this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch (e) {
        // resume may fail until user gesture; nonfatal
        return false;
      }
    }
    return true;
  }

  _playTone(freq = 440, duration = 0.08, type = 'sine') {
    if (!this.ctx || !this.masterGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      osc.connect(g);
      g.connect(this.masterGain);
      g.gain.value = 0.0001;
      const now = this.ctx.currentTime;
      g.gain.exponentialRampToValueAtTime(0.5, now + 0.005);
      osc.start(now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.stop(now + duration + 0.02);
    } catch (e) {
      // non-fatal
      console.warn('[SoundService] play tone failed', e && e.message);
    }
  }

  playPeg() {
    // small click
    if (!this.ctx) return;
    this._playTone(1200, 0.04, 'square');
  }

  playGate() {
    if (!this.ctx) return;
    this._playTone(660, 0.09, 'sine');
  }

  playGoal() {
    if (!this.ctx) return;
    this._playTone(880, 0.12, 'sine');
  }

  playSuccess() {
    // reserved for later composite success sound
    if (!this.ctx) return;
    this._playTone(660, 0.08, 'sine');
    setTimeout(() => this._playTone(880, 0.14, 'sine'), 120);
  }

  destroy() {
    if (this.ctx) {
      try {
        this.ctx.close();
      } catch (e) {
        // ignore
      }
    }
    this.ctx = null;
    this.masterGain = null;
  }
}
