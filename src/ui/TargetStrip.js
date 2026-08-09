import { Container, Sprite, Text } from 'pixi.js';

export class TargetStrip extends Container {
  constructor({ level, numberTextureCache, assetService } = {}) {
    super();
    this.level = level;
    this.numberTextureCache = numberTextureCache;
    this.assetService = assetService;
    this.cards = [];
  }

  mount(parent) {
    if (!parent || typeof parent.addChild !== 'function') {
      throw new Error('TargetStrip.mount requires a parent container');
    }
    parent.addChild(this);
    this._renderCards();
  }

  _renderCards() {
    this.removeChildren();
    this.cards = [];

    const goals = (this.level && Array.isArray(this.level.goals)) ? this.level.goals : [];
    const spacing = 160;
    const centerX = 960;
    const y = 60; // top strip

    goals.forEach((g, i) => {
      const x = Math.round(centerX + (i - Math.floor(goals.length / 2)) * spacing);
      const card = new Container();
      card.position.set(x, y);

      // Background label
      const label = new Text('TARGET', { fill: '#ffffff', fontSize: 12 });
      label.anchor.set(0.5, 0);
      label.position.set(0, -22);
      card.addChild(label);

      // Character image from number texture cache (if available)
      try {
        const tex = this.numberTextureCache.get(g.value);
        const sprite = new Sprite(tex);
        sprite.anchor.set(0.5);
        sprite.width = 48;
        sprite.height = 48;
        card.addChild(sprite);
      } catch (e) {
        // fallback: show value as text
        const t = new Text(String(g.value), { fill: '#ffffff', fontSize: 20 });
        t.anchor.set(0.5);
        card.addChild(t);
      }

      this.addChild(card);
      this.cards.push(card);
    });
  }

  refresh() {
    this._renderCards();
  }

  destroy(options) {
    this.removeChildren();
    this.cards = [];
    super.destroy(options);
  }
}
