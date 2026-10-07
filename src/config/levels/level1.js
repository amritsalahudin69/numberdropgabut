export const LEVEL_1 = Object.freeze({
  id: 'level-1',
  name: 'Level 1 - Dasar',
  world: {
    width: 1920,
    height: 1080,
  },
  startingValue: 300,
  maxOps: 6,
  valueDomain: {
    min: 0,
    max: 800,
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
    { id: 'gate-1', x: 600, y: 320, operator: '-', operand: 30, speed: 2, range: 300, width: 140, height: 50 },
    { id: 'gate-2', x: 1320, y: 320, operator: '-', operand: 10, speed: 1.1, range: 100, width: 140, height: 50 },
    { id: 'gate-3', x: 960, y: 580, operator: '-', operand: 50, speed: 0.8, range: 150, width: 140, height: 50 },
  ],
  obstacles: [
    { id: 'moving-block-1', type: 'moving-block', x: 620, y: 760, width: 180, height: 36, axis: 'x', distance: 140, speed: 0.18, phase: 0, restitution: 0.72, friction: 0.12, color: 0x5cc8ff },

    { id: 'moving-block-2', type: 'moving-block', x: 1320, y: 760, width: 180, height: 36, axis: 'y', distance: 70, speed: 0.16, phase: 0.25, restitution: 0.72, friction: 0.12, color: 0x7ae582 },
    
    { id: 'gear-1', type: 'gear', x: 560, y: 250, radius: 54, teeth: 12, rotationSpeed: 2.4, clockwise: false, tangentialDeltaV: 3.4, radialDeltaV: 1.2, maxResultSpeed: 11, cooldownMs: 90, restitution: 0.52, friction: 0.24, color: 0xffc857, innerColor: 0xf28f3b },
    { id: 'gear-2', type: 'gear', x: 960, y: 250, radius: 54, teeth: 12, rotationSpeed: 2.4, clockwise: true, tangentialDeltaV: 3.4, radialDeltaV: 1.2, maxResultSpeed: 11, cooldownMs: 90, restitution: 0.52, friction: 0.24, color: 0xffc857, innerColor: 0xf28f3b },
    { id: 'gear-3', type: 'gear', x: 1360, y: 250, radius: 54, teeth: 12, rotationSpeed: 2.4, clockwise: false, tangentialDeltaV: 3.4, radialDeltaV: 1.2, maxResultSpeed: 11, cooldownMs: 90, restitution: 0.52, friction: 0.24, color: 0xffc857, innerColor: 0xf28f3b },
    { id: 'gear-4', type: 'gear', x: 115, y: 380, radius: 54, teeth: 12, rotationSpeed: 2.4, clockwise: false, tangentialDeltaV: 3.4, radialDeltaV: 1.2, maxResultSpeed: 11, cooldownMs: 90, restitution: 0.52, friction: 0.24, color: 0xffc857, innerColor: 0xf28f3b },
    { id: 'gear-5', type: 'gear', x: 1780, y: 380, radius: 54, teeth: 12, rotationSpeed: 2.4, clockwise: false, tangentialDeltaV: 3.4, radialDeltaV: 1.2, maxResultSpeed: 11, cooldownMs: 90, restitution: 0.52, friction: 0.24, color: 0xffc857, innerColor: 0xf28f3b },    
    { id: 'gear-6', type: 'gear', x: 960, y: 510, radius: 54, teeth: 12, rotationSpeed: 2.4, clockwise: false, tangentialDeltaV: 3.4, radialDeltaV: 1.2, maxResultSpeed: 11, cooldownMs: 90, restitution: 0.52, friction: 0.24, color: 0xffc857, innerColor: 0xf28f3b },
    { id: 'gear-7', type: 'gear', x: 360, y: 640, radius: 12, teeth: 12, rotationSpeed: 2.4, clockwise: true, tangentialDeltaV: 3.4, radialDeltaV: 1.2, maxResultSpeed: 11, cooldownMs: 90, restitution: 0.52, friction: 0.24, color: 0xffc857, innerColor: 0xf28f3b },
    { id: 'gear-8', type: 'gear', x: 1560, y: 640, radius: 12, teeth: 12, rotationSpeed: 2.4, clockwise: false, tangentialDeltaV: 3.4, radialDeltaV: 1.2, maxResultSpeed: 11, cooldownMs: 90, restitution: 0.52, friction: 0.24, color: 0xffc857, innerColor: 0xf28f3b },
    

    { id: 'hammer-1', type: 'hammer', x: 460, y: 380, length: 150, headRadius: 34, armWidth: 14, speed: 0.46, swingAngleDeg: 52, phase: 0, clockwise: true, impactDeltaV: 12, radialDeltaV: 2.5, minimumExitSpeed: 10, maxResultSpeed: 16, cooldownMs: 140, restitution: 0.68, friction: 0.12, color: 0xff4d4d, armColor: 0x6c757d },
  { id: 'hammer-2', type: 'hammer', x: 1460, y: 380, length: 150, headRadius: 34, armWidth: 14, speed: 0.46, swingAngleDeg: 52, phase: 0, clockwise: true, impactDeltaV: 12, radialDeltaV: 2.5, minimumExitSpeed: 10, maxResultSpeed: 16, cooldownMs: 140, restitution: 0.68, friction: 0.12, color: 0xff4d4d, armColor: 0x6c757d },
    { id: 'hammer-3', type: 'hammer', x: 1160, y: 380, length: 150, headRadius: 34, armWidth: 14, speed: 0.46, swingAngleDeg: 52, phase: 0, clockwise: true, impactDeltaV: 12, radialDeltaV: 2.5, minimumExitSpeed: 10, maxResultSpeed: 16, cooldownMs: 140, restitution: 0.68, friction: 0.12, color: 0xff4d4d, armColor: 0x6c757d },
    { id: 'hammer-4', type: 'hammer', x: 115, y: 640, length: 150, headRadius: 34, armWidth: 14, speed: 0.46, swingAngleDeg: 52, phase: 0, clockwise: true, impactDeltaV: 12, radialDeltaV: 2.5, minimumExitSpeed: 10, maxResultSpeed: 16, cooldownMs: 140, restitution: 0.68, friction: 0.12, color: 0xff4d4d, armColor: 0x6c757d },
    { id: 'hammer-5', type: 'hammer', x: 1780, y: 640, length: 150, headRadius: 34, armWidth: 14, speed: 0.46, swingAngleDeg: 52, phase: 0, clockwise: true, impactDeltaV: 12, radialDeltaV: 2.5, minimumExitSpeed: 10, maxResultSpeed: 16, cooldownMs: 140, restitution: 0.68, friction: 0.12, color: 0xff4d4d, armColor: 0x6c757d },
    { id: 'hammer-8', type: 'hammer', x: 760, y: 640, length: 150, headRadius: 34, armWidth: 14, speed: 2, swingAngleDeg: 52, phase: 0, clockwise: true, impactDeltaV: 12, radialDeltaV: 2.5, minimumExitSpeed: 10, maxResultSpeed: 16, cooldownMs: 140, restitution: 0.68, friction: 0.12, color: 0xff4d4d, armColor: 0x6c757d },
    { id: 'hammer-8', type: 'hammer', x: 1160, y: 640, length: 150, headRadius: 34, armWidth: 14, speed: 2, swingAngleDeg: 52, phase: 0, clockwise: true, impactDeltaV: 12, radialDeltaV: 2.5, minimumExitSpeed: 10, maxResultSpeed: 16, cooldownMs: 140, restitution: 0.68, friction: 0.12, color: 0xff4d4d, armColor: 0x6c757d },

     { id: 'hammer-6', type: 'hammer', x: 460, y: 380, length: 150, headRadius: 34, armWidth: 14, speed: 0.46, swingAngleDeg: 52, phase: 0, clockwise: true, impactDeltaV: 12, radialDeltaV: 2.5, minimumExitSpeed: 10, maxResultSpeed: 16, cooldownMs: 140, restitution: 0.68, friction: 0.12, color: 0xff4d4d, armColor: 0x6c757d },
     { id: 'hammer-7', type: 'hammer', x: 560, y: 510, length: 80, headRadius: 20, armWidth: 10, speed: 0.7, swingAngleDeg: 52, phase: 0, clockwise: true, impactDeltaV: 12, radialDeltaV: 2.5, minimumExitSpeed: 10, maxResultSpeed: 16, cooldownMs: 140, restitution: 0.68, friction: 0.12, color: 0xff4d4d, armColor: 0x6c757d },
     { id: 'hammer-7', type: 'hammer', x: 1360, y: 510, length: 80, headRadius: 20, armWidth: 10, speed: 0.7, swingAngleDeg: 52, phase: 0, clockwise: true, impactDeltaV: 12, radialDeltaV: 2.5, minimumExitSpeed: 10, maxResultSpeed: 16, cooldownMs: 140, restitution: 0.68, friction: 0.12, color: 0xff4d4d, armColor: 0x6c757d },
    
  ],
  goals: [
    { id: 'goal-1', x: 120, y: 960, value: 60, operator: '+', width: 160, height: 80 },
    { id: 'goal-2', x: 440, y: 960, value: 100, operator: '+', width: 160, height: 80 },
    { id: 'goal-3', x: 700, y: 960, value: 50, operator: '+', width: 160, height: 80 },
    { id: 'goal-4', x: 960, y: 960, value: 500, operator: '+', width: 160, height: 80 },
    { id: 'goal-5', x: 1220, y: 960, value: 10, operator: '-', width: 160, height: 80 },
    { id: 'goal-6', x: 1480, y: 960, value: 80, operator: '-', width: 160, height: 80 },
    { id: 'goal-7', x: 1760, y: 960, value: 70, operator: '-', width: 160, height: 80 },
  ],
});
