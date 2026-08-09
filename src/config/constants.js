export const DESIGN_WIDTH = 1920;
export const DESIGN_HEIGHT = 1080;

export const PIXELS_PER_METER = 50;
export const COLLISION_FEEDBACK_MS = 5000;

export const ASSET_PATHS = Object.freeze({
  numbers: '/assets/numbers',
  gifs: '/assets/gif',
  backgrounds: '/assets/backgrounds',
  effects: '/assets/effects',
  assetIndex: '/assets/generated/asset-index.json',
});

// Logical size (in world pixels) used by feedback visuals. Converted to client px by renderer scale.
export const FEEDBACK_LOGICAL_SIZE = 120;
