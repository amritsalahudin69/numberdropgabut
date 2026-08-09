import assert from 'assert';
import { SoundService } from '../src/systems/SoundService.js';

console.log('Running sound-service.test.mjs');

class FakeAudioContext {
  constructor() {
    this.state = 'running';
    this.currentTime = 0;
    this.destination = {};
  }
  createGain() { return { connect: () => {} , gain: { value: 1}}; }
  createOscillator() { return { connect: () => {}, frequency: { value: 440 }, start: () => {}, stop: () => {}, type: 'sine' }; }
  resume() { this.state = 'running'; return Promise.resolve(); }
  close() { this.state = 'closed'; return Promise.resolve(); }
}

const svc = new SoundService({ AudioContextImpl: FakeAudioContext });
try {
  svc.playPeg();
  svc.playGate();
  svc.playGoal();
  svc.playSuccess();
  console.log('Sound methods invoked');
} catch (e) {
  console.error('Sound methods threw', e);
  process.exit(1);
}

// simulate suspended context
class SuspendedAudioContext extends FakeAudioContext {
  constructor() { super(); this.state = 'suspended'; }
  resume() { this.state = 'running'; return Promise.resolve(); }
}
const svc2 = new SoundService({ AudioContextImpl: SuspendedAudioContext });
(async ()=>{
  const ok = await svc2._ensureStarted();
  // if resume allowed, ok true
  assert(ok === true, 'suspended context should resume when possible');
  svc2.destroy();
  svc.destroy();
  console.log('PASS sound-service');
  process.exit(0);
})();
