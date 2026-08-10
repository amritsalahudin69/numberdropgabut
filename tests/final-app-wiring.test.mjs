import assert from 'node:assert/strict';
import { MarbleDropApp } from '../src/app/MarbleDropApp.js';
import { LEVEL_1 } from '../src/config/levels/level1.js';
import { GAMEPLAY_STATE } from '../src/game/MarbleDropSession.js';
import { JsonExporter } from '../src/systems/JsonExporter.js';

console.log('=== FINAL APP WIRING TEST ===\n');

// Fake renderer that provides a minimal ticker and hostElement
function createFakeRenderer() {
  const host = { children: [], appendChild(el) { this.children.push(el); }, removeChild(el) { this.children = this.children.filter(c => c !== el); }, clientWidth: 800, clientHeight: 600 };
  const ticker = {
    callbacks: [],
    add(cb) { this.callbacks.push(cb); },
    remove(cb) { this.callbacks = this.callbacks.filter(c => c !== cb); },
    run() { for (const cb of this.callbacks.slice()) cb({ deltaTime: 60 }); }
  };
  const fakeStage = { addChild() {}, addChildAt() {}, removeChild() {}, constructor: function() { return { addChild() {}, addChildAt() {}, removeChild() {} }; } };
  const fakeCanvas = { parentElement: host, addEventListener() {}, removeEventListener() {} };
  return {
    hostElement: host,
    app: { stage: fakeStage, canvas: fakeCanvas, ticker },
    async init(hostEl) { this.hostElement = hostEl || host; this.app.canvas.parentElement = this.hostElement; },
    getCanvas() { return this.app.canvas; },
    getStage() { return this.app.stage; },
    destroy() {},
  };
}

function createFakePhysics() {
  return {
    async init() {},
    destroy() {},
    step() {},
    getWorld() { return null; },
    getRapier() { return null; }
  };
}

function createFakeAssets() {
  return {
    async init() {},
    destroy() {},
    getStaticUrl(val) { return `/assets/numbers/${val}.png`; }
  };
}

function createFakeTextureCache() {
  return {
    async preload() {},
    get(v) { return { id: `tex-${v}` }; },
    has() { return true; },
    destroy() {}
  };
}

async function runTest() {
  const fakeRenderer = createFakeRenderer();
  const fakePhysics = createFakePhysics();
  const fakeAssets = createFakeAssets();
  const fakeTextureCache = createFakeTextureCache();
  const fakeVisualTextureCache = createFakeTextureCache();

  const app = new MarbleDropApp({
    renderer: fakeRenderer,
    physics: fakePhysics,
    assets: fakeAssets,
    textureCache: fakeTextureCache,
    visualTextureCache: fakeVisualTextureCache,
    level: LEVEL_1,
  });

  await app.init(fakeRenderer.hostElement);

  // GameHud should be instantiated
  if (!app.hud) throw new Error('GameHud not instantiated');
  console.log('✓ GameHud instantiated');

  // Simulate an operation and ensure HUD update snapshot changes after ticker run
  app.game.runRecorder.recordOperation({ source: 'gate', sourceId: 'g-1', operator: '-', operand: 1, previousValue: 100, nextValue: 99, timestampMs: Date.now() });
  fakeRenderer.app.ticker.run();
  if (!app._lastHudSnapshot || app._lastHudSnapshot.lastOpSeq !== 1) throw new Error('HUD did not update snapshot after operation');
  console.log('✓ HUD update seam works');

  // Spy JsonExporter
  let exported = null;
  const origExport = JsonExporter.export;
  JsonExporter.export = ({ result }) => { exported = result; };

  // Request completion and transition to SUMMARY
  app.game.session.requestCompletion({ reason: 'test', success: true });
  // Transition to SUMMARY to simulate cleanup flow completing
  app.game.session.transitionTo(GAMEPLAY_STATE.SUMMARY);

  fakeRenderer.app.ticker.run();

  if (!app.cachedResult) throw new Error('ResultService did not build cached result');
  if (!app._overlayMounted) throw new Error('Overlay not marked as mounted');
  if (!app.resultOverlay) throw new Error('ResultOverlay instance not created');
  console.log('✓ SUMMARY -> ResultService -> ResultOverlay flow executed');

  // Call export handler and verify same canonical payload used
  app.resultOverlay.onExport && app.resultOverlay.onExport();
  if (!exported) throw new Error('JsonExporter.export not invoked by overlay export');
  if (exported !== app.cachedResult) throw new Error('Exported payload is not the same cached result');
  console.log('✓ Export uses same canonical payload');

  // Call restart handler
  app.resultOverlay.onRestart && app.resultOverlay.onRestart();

  // After restart, overlay should be cleared and recorder reset and session reset (READY)
  if (app._overlayMounted) throw new Error('Overlay still marked mounted after restart');
  if (app.game.runRecorder.operations.length !== 0) throw new Error('RunRecorder not cleared on restart');
  if (app.game.session.getState() !== 'READY') throw new Error('Session not reset to READY after restart');
  console.log('✓ Restart clears overlay, recorder and resets session/HUD');

  // Restore exporter
  JsonExporter.export = origExport;

  // Cleanup
  app.destroy();
  console.log('\n=== FINAL APP WIRING TEST PASSED ===');
}

runTest().catch(err => { console.error('FAIL:', err); process.exit(1); });
