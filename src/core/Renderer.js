import { Application } from 'pixi.js';
import { DESIGN_WIDTH, DESIGN_HEIGHT } from '../config/constants.js';

export class Renderer {
  constructor() {
    this.app = null;
    this.hostElement = null;
    this.resizeHandler = null;
  }

  async init(hostElement) {
    if (!hostElement) {
      throw new Error('Renderer.init requires a valid hostElement');
    }
    this.hostElement = hostElement;
    this.app = new Application();
    await this.app.init({
      width: DESIGN_WIDTH,
      height: DESIGN_HEIGHT,
      resolution: 1,
      autoDensity: true,
      backgroundColor: 0x121214,
    });

    if (this.app.canvas && hostElement) {
      hostElement.appendChild(this.app.canvas);
    }

    this.resizeHandler = () => this.handleResize();
    window.addEventListener('resize', this.resizeHandler);
    this.handleResize();
  }

  handleResize() {
    if (!this.app || !this.app.canvas || !this.hostElement) return;
    const containerWidth = this.hostElement.clientWidth || window.innerWidth;
    const containerHeight = this.hostElement.clientHeight || window.innerHeight;
    const targetAspect = DESIGN_WIDTH / DESIGN_HEIGHT;
    const containerAspect = containerWidth / containerHeight;

    let width, height;
    if (containerAspect > targetAspect) {
      height = containerHeight;
      width = height * targetAspect;
    } else {
      width = containerWidth;
      height = width / targetAspect;
    }

    this.app.canvas.style.width = `${Math.floor(width)}px`;
    this.app.canvas.style.height = `${Math.floor(height)}px`;
  }

  worldToClient(x, y) {
    if (!this.app || !this.app.canvas) {
      return { clientX: x, clientY: y };
    }
    const canvas = this.app.canvas;
    const rect = canvas.getBoundingClientRect();
    const hostRect = this.hostElement ? this.hostElement.getBoundingClientRect() : rect;

    const scaleX = rect.width / DESIGN_WIDTH;
    const scaleY = rect.height / DESIGN_HEIGHT;

    const clientX = (rect.left - hostRect.left) + (x * scaleX);
    const clientY = (rect.top - hostRect.top) + (y * scaleY);

    return { clientX, clientY, scaleX, scaleY };
  }

  getStage() {
    return this.app ? this.app.stage : null;
  }

  getCanvas() {
    return this.app ? this.app.canvas : null;
  }

  getWidth() {
    return DESIGN_WIDTH;
  }

  getHeight() {
    return DESIGN_HEIGHT;
  }

  destroy() {
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }
    if (this.app) {
      if (this.app.canvas && this.app.canvas.parentNode) {
        this.app.canvas.parentNode.removeChild(this.app.canvas);
      }
      this.app.destroy(true, { children: true, texture: true });
      this.app = null;
    }
    this.hostElement = null;
  }
}
