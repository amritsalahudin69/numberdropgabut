let feedbackSequence = 0;

export class FeedbackService {
  constructor(hostElement = null) {
    this.hostElement = hostElement;
    this.imgEl = null;
    this.visible = false;
    this.currentAsset = null;
    this.destroyed = false;
  }

  _ensureElement() {
    if (this.imgEl) return;
    if (typeof document === 'undefined') return;

    const host = this.hostElement || document.body;
    if (!host) return;

    const img = document.createElement('img');
    img.className = 'marbledrop-feedback';
    img.alt = '';
    img.draggable = false;

    // Injected style — minimal positioning for functionality
    Object.assign(img.style, {
      position: 'absolute',
      display: 'none',
      pointerEvents: 'none',
      zIndex: '9999',
      transform: 'translate(-50%, -50%)',
      maxWidth: '200px',
      maxHeight: '200px',
      objectFit: 'contain',
    });

    img.addEventListener('error', () => {
      if (!this.visible || !this.currentAsset) return;
      // Runtime GIF load failure: fall back to PNG for same value
      if (this.currentAsset.type === 'gif' && this.currentAsset.fallbackUrl) {
        const fallback = this.currentAsset.fallbackUrl;
        this.currentAsset = {
          type: 'png',
          url: fallback,
        };
        img.src = fallback;
      } else {
        // PNG also failed — clear feedback, log error
        console.error('[FeedbackService] Fallback PNG also failed to load:', this.currentAsset);
        this.clear();
      }
    });

    host.appendChild(img);
    this.imgEl = img;
  }

  show(asset, screenPosition = { clientX: 0, clientY: 0 }) {
    if (this.destroyed) return;
    this._ensureElement();
    if (!this.imgEl) return;

    feedbackSequence++;

    this.currentAsset = asset;
    this.visible = true;

    let src = asset.url;
    if (asset.type === 'gif') {
      // Cache-bust to force GIF restart from frame 1
      src = `${asset.url}?play=${feedbackSequence}`;
    }

    this.imgEl.src = src;

    const left = typeof screenPosition.clientX === 'number' ? screenPosition.clientX : 0;
    const top = typeof screenPosition.clientY === 'number' ? screenPosition.clientY : 0;

    this.imgEl.style.left = `${left}px`;
    this.imgEl.style.top = `${top}px`;
    this.imgEl.style.display = 'block';
  }

  updatePosition(screenPosition) {
    if (!this.imgEl || !this.visible) return;
    if (typeof screenPosition.clientX === 'number') {
      this.imgEl.style.left = `${screenPosition.clientX}px`;
    }
    if (typeof screenPosition.clientY === 'number') {
      this.imgEl.style.top = `${screenPosition.clientY}px`;
    }
  }

  clear() {
    if (this.imgEl) {
      this.imgEl.style.display = 'none';
      this.imgEl.src = '';
    }
    this.visible = false;
    this.currentAsset = null;
  }

  isVisible() {
    return this.visible;
  }

  getCurrentAsset() {
    return this.currentAsset;
  }

  destroy() {
    this.clear();
    if (this.imgEl && this.imgEl.parentNode) {
      this.imgEl.parentNode.removeChild(this.imgEl);
    }
    this.imgEl = null;
    this.destroyed = true;
  }
}
