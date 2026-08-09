import assert from 'assert';
import { Goal } from '../src/entities/Goal.js';
import { Container, Sprite } from 'pixi.js';

console.log('Running goal-character.test.mjs');

const fakeTexture = { width: 64, height: 64 };
const parent = new Container();
const goal = new Goal({});
const value = 42;

// spawn with texture
goal.spawn({ id: 'g1', value, texture: fakeTexture, x: 100, y: 100, width: 160, height: 80, parentContainer: parent });

// verify container created and child is sprite when texture provided
assert(goal.container, 'goal.container must exist after spawn');
assert(goal.container.children.length > 0, 'goal.container must have children');
const child = goal.container.children[0];
// PIXI Sprite created from texture will have constructor name 'Sprite'
const childName = child && child.constructor && child.constructor.name;
assert(childName === 'Sprite', `Expected first child to be Sprite but was ${childName}`);

// verify goal.value remains unchanged
assert.strictEqual(goal.value, value, 'Goal.value must remain unchanged after spawn');

console.log('PASS goal-character');
process.exit(0);
