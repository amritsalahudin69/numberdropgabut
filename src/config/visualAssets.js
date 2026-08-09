export const VISUAL_ASSETS = Object.freeze({
  // Background used by legacy manifest
  background: {
    layer1: '/assets/marbledrop/background/bg (2).jpg',
    layer2: '/assets/marbledrop/background/bg (2).jpg',
    layer3: '/assets/marbledrop/background/bg (2).jpg',
  },

  // Pegs are procedural in legacy; leave null to indicate procedural rendering
  peg: null,

  // Gates: legacy used procedural gate visuals unless manifest provided a custom image.
  // No mandatory gate image declared in legacy manifest for level-1; keep null.
  gate: null,

  // Goals use numeric targets (PNG) via existing NumberTextureCache; no separate assets required
  goal: null,

  // Effects present in legacy assets (optional)
  // Effects not provided in legacy manifest for this standalone extraction — declare null to indicate procedural/optional
  effects: null,
});
