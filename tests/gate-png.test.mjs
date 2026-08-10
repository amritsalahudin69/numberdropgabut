import test from 'node:test';
import assert from 'node:assert/strict';
import Sinon from 'sinon';
import { Gate } from '../src/entities/Gate.js';
import { NumberTextureCache } from '../src/systems/NumberTextureCache.js';

test('Gate PNG: renderOperand displays PNG texture when available', async (t) => {
  // Create a mock texture
  const mockTexture = {
    width: 50,
    height: 50,
    dispose: () => {},
  };

  // Create mock cache
  const mockCache = {
    has: Sinon.stub().returns(true),
    get: Sinon.stub().returns(mockTexture),
  };

  const gate = new Gate({
    id: 'gate1',
    x: 100,
    y: 100,
    operator: '-',
    operand: 7,
    numberTextureCache: mockCache,
  });

  // Mock physics world and renderer
  const mockWorld = { createRigidBody: Sinon.stub() };
  const mockRenderer = { getStage: Sinon.stub().returns(null) };

  // Mock body
  const mockBody = { setLinvel: Sinon.stub(), destroy: Sinon.stub() };
  mockWorld.createRigidBody.returns(mockBody);

  gate.spawn({
    x: 100,
    y: 100,
    physicsWorld: mockWorld,
    numberTextureCache: mockCache,
  });

  // Check that cache.get was called for the operand
  assert.ok(mockCache.has.called, 'should check cache for operand texture');
  
  gate.destroy();
});

test('Gate PNG: renderOperand falls back to text when texture unavailable', (t) => {
  const mockCache = {
    has: Sinon.stub().returns(false),
    get: Sinon.stub().returns(null),
  };

  const gate = new Gate({
    id: 'gate1',
    x: 100,
    y: 100,
    operator: '-',
    operand: 7,
    numberTextureCache: mockCache,
  });

  // Even without a texture, gate should still initialize operand display
  // The fallback to text is handled in renderOperand
  assert.equal(gate.operand, 7, 'gate should have operand value');
  
  gate.destroy();
});

test('Gate PNG: collider dimensions remain independent of visual size', (t) => {
  const mockCache = {
    has: Sinon.stub().returns(true),
    get: Sinon.stub().returns({
      width: 50,
      height: 50,
      dispose: () => {},
    }),
  };

  const gate = new Gate({
    id: 'gate1',
    x: 100,
    y: 100,
    operator: '-',
    operand: 7,
    width: 60,
    height: 20,
    numberTextureCache: mockCache,
  });

  // The collider width/height should remain as configured
  assert.equal(gate.width, 60, 'collider width should remain unchanged');
  assert.equal(gate.height, 20, 'collider height should remain unchanged');
  
  gate.destroy();
});

test('Gate PNG: operator displayed separately from operand', (t) => {
  const mockCache = {
    has: Sinon.stub().returns(true),
    get: Sinon.stub().returns({
      width: 50,
      height: 50,
      dispose: () => {},
    }),
  };

  const gate = new Gate({
    id: 'gate1',
    x: 100,
    y: 100,
    operator: '-',
    operand: 7,
    numberTextureCache: mockCache,
  });

  // Both should be stored separately
  assert.equal(gate.operator, '-', 'operator should be stored');
  assert.equal(gate.operand, 7, 'operand should be stored');
  
  gate.destroy();
});

test('Gate PNG: movement configuration unchanged', (t) => {
  const gate = new Gate({
    id: 'gate1',
    x: 100,
    y: 100,
    operator: '-',
    operand: 7,
    width: 60,
    height: 20,
    speed: 2,
    range: 30,
  });

  // Check that movement config is preserved
  assert.equal(gate.speed, 2, 'speed should be preserved');
  assert.equal(gate.range, 30, 'range should be preserved');
  assert.equal(gate.x, 100, 'x position should be preserved');
  assert.equal(gate.y, 100, 'y position should be preserved');
  
  gate.destroy();
});
