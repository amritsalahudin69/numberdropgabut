import assert from 'node:assert/strict';
import { MarbleDropGame } from '../src/game/MarbleDropGame.js';
import { LEVEL_1 } from '../src/config/levels/level1.js';
import { GAMEPLAY_STATE } from '../src/game/MarbleDropSession.js';

async function runRestartCleanupTests() {
  console.log('Running restart-cleanup.test.mjs...');

  const fakeTextureCache = {
    get(val) {
      return { id: `tex-${val}` };
    },
    has(val) {
      return true;
    },
  };

  const fakeRenderer = {
    getStage() {
      return { addChild() {}, removeChild() {} };
    },
    getCanvas() {
      return null;
    },
  };

  const game = new MarbleDropGame({
    renderer: fakeRenderer,
    physics: null,
    textureCache: fakeTextureCache,
    level: LEVEL_1,
  });

  await game.init();
  game.start();

  assert.equal(game.session.getState(), GAMEPLAY_STATE.READY);
  const initialEntityCount = game.pegs.length + game.gates.length + game.goals.length;

  // Run reset 10 consecutive times
  for (let i = 1; i <= 10; i++) {
    game.reset();

    const snapshot = game.getSnapshot();
    assert.equal(snapshot.gameState, GAMEPLAY_STATE.READY, `Reset iteration ${i} must return gameState to READY`);
    assert.equal(snapshot.activeGacoanCount, 0, `Reset iteration ${i} must have zero active gacoan`);
    assert.equal(snapshot.currentValue, LEVEL_1.startingValue, `Reset iteration ${i} must reset currentValue to startingValue`);
    assert.equal(snapshot.opsUsed, 0, `Reset iteration ${i} must reset opsUsed to 0`);

    const currentEntityCount = game.pegs.length + game.gates.length + game.goals.length;
    assert.equal(currentEntityCount, initialEntityCount, `Reset iteration ${i} must maintain exact entity count without duplication`);
  }

  game.destroy();
  console.log('PASS: restart-cleanup.test.mjs passed all 10 reset iteration assertions.');
}

runRestartCleanupTests().catch((err) => {
  console.error('FAIL: restart-cleanup.test.mjs failed with error:', err);
  process.exit(1);
});
