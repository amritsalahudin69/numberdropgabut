export const LEVEL_1 = Object.freeze({
  id: 'level-1',
  name: 'Level 1 - Dasar',
  world: {
    width: 1920,
    height: 1080,
  },
  startingValue: 80,
  maxOps: 6,
  valueDomain: {
    min: 0,
    max: 100,
  },
  dropZone: {
    minX: 58,
    maxX: 1862,
    y: 80,
  },
  pegs: [
    { id: 'peg-19', x: 560, y: 250, radius: 15 },
    { id: 'peg-1', x: 960, y: 250, radius: 15 },
    { id: 'peg-20', x: 1360, y: 250, radius: 15 },

    { id: 'peg-18', x: 115, y: 380, radius: 15 },
    { id: 'peg-17', x: 460, y: 380, radius: 15 },
    { id: 'peg-2', x: 760, y: 380, radius: 15 },
    { id: 'peg-3', x: 1160, y: 380, radius: 15 },
    { id: 'peg-15', x: 1460, y: 380, radius: 15 },
    { id: 'peg-16', x: 1780, y: 380, radius: 15 },
    
    { id: 'peg-14', x: 260, y: 510, radius: 15 },
    { id: 'peg-4', x: 560, y: 510, radius: 15 },
    { id: 'peg-5', x: 960, y: 510, radius: 15 },
    { id: 'peg-6', x: 1360, y: 510, radius: 15 },
    { id: 'peg-13', x: 1660, y: 510, radius: 15 },
    
    { id: 'peg-12', x: 115, y: 640, radius: 15 },
    { id: 'peg-7', x: 360, y: 640, radius: 15 },
    { id: 'peg-8', x: 760, y: 640, radius: 15 },
    { id: 'peg-9', x: 1160, y: 640, radius: 15 },
    { id: 'peg-10', x: 1560, y: 640, radius: 15 },
    { id: 'peg-11', x: 1780, y: 640, radius: 15 },
  ],
  gates: [
    { id: 'gate-1', x: 600, y: 320, operator: '-', operand: 1, speed: 2, range: 300, width: 140, height: 50 },
    { id: 'gate-2', x: 1320, y: 320, operator: '-', operand: 2, speed: 1.1, range: 100, width: 140, height: 50 },
    { id: 'gate-3', x: 960, y: 580, operator: '*', operand: 1, speed: 0.8, range: 150, width: 140, height: 50 },
  ],
  goals: [
    { id: 'goal-1', x: 120, y: 960, value: 50, operator: '-', width: 160, height: 80 },
    { id: 'goal-2', x: 440, y: 960, value: 20, operator: '+', width: 160, height: 80 },
    { id: 'goal-3', x: 700, y: 960, value: 26, operator: '+', width: 160, height: 80 },
    { id: 'goal-4', x: 960, y: 960, value: 4, operator: '+', width: 160, height: 80 },
    { id: 'goal-5', x: 1220, y: 960, value: 15, operator: '-', width: 160, height: 80 },
    { id: 'goal-6', x: 1480, y: 960, value: 20, operator: '-', width: 160, height: 80 },
    { id: 'goal-7', x: 1760, y: 960, value: 35, operator: '-', width: 160, height: 80 },
  ],
});
