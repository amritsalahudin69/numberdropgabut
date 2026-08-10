export class OperationCard {
  constructor(config = {}) {
    this.numberTextureCache = config.numberTextureCache;
    this.assetService = config.assetService;

    this.domElement = null;
    this.overlayBg = null;
    this.currentOperation = null;
    this.autoHideTimeout = null;
  }

  mount(parentElement) {
    if (!parentElement) {
      console.warn('[OperationCard] no parent element, skipping mount');
      return;
    }

    // Background overlay (semi-transparent)
    this.overlayBg = document.createElement('div');
    this.overlayBg.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.3);
      z-index: 1100;
      display: none;
      pointer-events: none;
    `;

    // Card element (centered near top)
    this.domElement = document.createElement('div');
    this.domElement.id = 'operation-card';
    this.domElement.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(34, 34, 34, 0.95);
      border: 2px solid #00ff00;
      border-radius: 8px;
      padding: 24px;
      color: #fff;
      font-family: monospace;
      font-size: 16px;
      z-index: 1101;
      display: none;
      min-width: 300px;
      text-align: center;
      pointer-events: none;
    `;

    parentElement.appendChild(this.overlayBg);
    parentElement.appendChild(this.domElement);
  }

  _getCharacterImageUrl(value) {
    if (!this.assetService) return null;
    try {
      const gifUrl = this.assetService.getAnimationUrl(value);
      if (gifUrl) return gifUrl;
      const pngUrl = this.assetService.getStaticUrl(value);
      if (pngUrl) return pngUrl;
    } catch (e) {
      // Asset missing or service error
    }
    return null;
  }

  show(operation) {
    if (!this.domElement || !this.overlayBg) return;

    // Cancel existing auto-hide timeout if present
    if (this.autoHideTimeout) {
      clearTimeout(this.autoHideTimeout);
      this.autoHideTimeout = null;
    }

    this.currentOperation = operation;

    const prevValue = operation.previousValue;
    const opStr = operation.operator;
    const operandValue = operation.operand;
    const nextValue = operation.nextValue;

    // Get image URLs (GIF preferred, PNG fallback)
    const prevUrl = this._getCharacterImageUrl(prevValue);
    const operandUrl = this._getCharacterImageUrl(operandValue);
    const nextUrl = this._getCharacterImageUrl(nextValue);

    let html = `
      <div style="display: flex; justify-content: center; align-items: center; gap: 12px; margin-bottom: 12px;">
    `;

    // Previous value (character image)
    if (prevUrl) {
      html += `<div style="display: flex; flex-direction: column; align-items: center;">
        <img src="${prevUrl}" alt="${prevValue}" style="height: 60px; object-fit: contain;" data-char-value="${prevValue}" />
      </div>`;
    } else {
      html += `<div>${prevValue}</div>`;
    }

    // Operator (text)
    html += `<div style="font-weight: bold; font-size: 20px;">${opStr}</div>`;

    // Operand (character image)
    if (operandUrl) {
      html += `<div style="display: flex; flex-direction: column; align-items: center;">
        <img src="${operandUrl}" alt="${operandValue}" style="height: 60px; object-fit: contain;" data-char-value="${operandValue}" />
      </div>`;
    } else {
      html += `<div>${operandValue}</div>`;
    }

    // Equals sign
    html += `<div style="font-weight: bold; font-size: 20px;">=</div>`;

    // Result (character image)
    if (nextUrl) {
      html += `<div style="display: flex; flex-direction: column; align-items: center;">
        <img src="${nextUrl}" alt="${nextValue}" style="height: 60px; object-fit: contain; color: #00ff00;" data-char-value="${nextValue}" />
      </div>`;
    } else {
      html += `<div style="color: #00ff00; font-weight: bold;">${nextValue}</div>`;
    }

    html += `</div>`;

    this.domElement.innerHTML = html;
    this.overlayBg.style.display = 'block';
    this.domElement.style.display = 'block';

    // Auto-hide after 1.5 seconds
    this.autoHideTimeout = setTimeout(() => {
      this.autoHideTimeout = null;
      this.clear();
    }, 1500);
  }

  clear() {
    // Cancel pending auto-hide timeout
    if (this.autoHideTimeout) {
      clearTimeout(this.autoHideTimeout);
      this.autoHideTimeout = null;
    }

    if (!this.domElement || !this.overlayBg) return;
    this.overlayBg.style.display = 'none';
    this.domElement.style.display = 'none';
    this.currentOperation = null;
  }

  destroy() {
    this.clear();
    if (this.overlayBg && this.overlayBg.parentElement) {
      this.overlayBg.parentElement.removeChild(this.overlayBg);
    }
    if (this.domElement && this.domElement.parentElement) {
      this.domElement.parentElement.removeChild(this.domElement);
    }
    this.overlayBg = null;
    this.domElement = null;
  }
}
