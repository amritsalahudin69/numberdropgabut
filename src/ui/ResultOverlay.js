export class ResultOverlay {
  constructor(config = {}) {
    this.result = config.result;
    this.onRestart = config.onRestart || (() => {});
    this.onExport = config.onExport || (() => {});
    this.assetService = config.assetService;

    this.domElement = null;
    this.overlayBg = null;
    this.cardElement = null;
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

  _renderCharacterCard(value, label, color) {
    const imageUrl = this._getCharacterImageUrl(value);
    if (imageUrl) {
      return `
        <div style="text-align: center;">
          <div style="color: #888; font-size: 11px; margin-bottom: 4px;">${label}</div>
          <img src="${imageUrl}" alt="${value}" style="height: 80px; object-fit: contain; margin-bottom: 4px;" data-char-value="${value}" />
          <div style="font-size: 12px; color: #aaa;">${value}</div>
        </div>
      `;
    } else {
      // Fallback to text if image not available
      return `
        <div style="text-align: center;">
          <div style="color: #888; font-size: 11px; margin-bottom: 4px;">${label}</div>
          <div style="font-size: 20px; font-weight: bold; color: ${color};">${value}</div>
        </div>
      `;
    }
  }

  mount(parentElement) {
    if (!parentElement) {
      console.warn('[ResultOverlay] no parent element, skipping mount');
      return;
    }

    // Background overlay
    this.overlayBg = document.createElement('div');
    this.overlayBg.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      z-index: 2000;
    `;

    // Card
    this.cardElement = document.createElement('div');
    this.cardElement.id = 'result-card';
    this.cardElement.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, #1a1a2e, #16213e);
      color: #fff;
      font-family: monospace;
      font-size: 14px;
      padding: 32px;
      border: 3px solid #00ff00;
      border-radius: 12px;
      max-width: 700px;
      max-height: 85vh;
      overflow-y: auto;
      z-index: 2001;
      box-shadow: 0 0 30px rgba(0, 255, 0, 0.3);
    `;

    if (this.result) {
      const result = this.result;
      const statusStr = result.success ? '✓ SUCCESS' : '✗ FAILED';
      const statusColor = result.success ? '#00ff00' : '#ff0000';

      const operationsList = result.operations && result.operations.length > 0
        ? result.operations.map(op => `<div style="padding: 4px 0; opacity: 0.8;">${op.seq}. ${op.previousValue} <strong>${op.operator}</strong> ${op.operand} = <strong>${op.nextValue}</strong></div>`).join('')
        : '<div style="opacity: 0.6;">(no operations)</div>';

      // Render character cards with images
      const startCard = this._renderCharacterCard(result.startingValue, 'START', '#00ff00');
      const targetCard = this._renderCharacterCard(result.targetValue, 'TARGET', '#00aaff');
      const finalCard = this._renderCharacterCard(result.finalValue, 'FINAL', result.finalValue === result.targetValue ? '#00ff00' : '#ffaa00');

      this.cardElement.innerHTML = `
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="color: ${statusColor}; font-size: 32px; font-weight: bold; margin-bottom: 8px;">${statusStr}</div>
          <div style="color: #aaa; font-size: 12px;">${result.completionReason}</div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 24px; border-bottom: 2px solid #444; padding-bottom: 16px;">
          ${startCard}
          ${targetCard}
          ${finalCard}
        </div>

        <div style="margin-bottom: 16px; padding: 12px; background: rgba(0, 0, 0, 0.5); border-radius: 6px;">
          <div style="color: #aaa; font-size: 12px; margin-bottom: 6px;">OPERATIONS USED</div>
          <div style="font-size: 16px; font-weight: bold;">${result.opsUsed || result.operationsUsed || 0} / ${result.maxOps || result.maxOperations || 0}</div>
        </div>

        <div style="margin-bottom: 16px; padding: 12px; background: rgba(0, 0, 0, 0.5); border-radius: 6px;">
          <div style="color: #aaa; font-size: 12px; margin-bottom: 8px;">OPERATION RECAP</div>
          ${operationsList}
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 24px;">
          <button id="restart-btn" style="padding: 12px; background: #0066ff; color: #fff; border: 2px solid #0088ff; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: bold; transition: all 0.2s;">Restart</button>
          <button id="export-btn" style="padding: 12px; background: #00aa00; color: #000; border: 2px solid #00ff00; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: bold; transition: all 0.2s;">Export JSON</button>
        </div>
      `;

      const restartBtn = this.cardElement.querySelector('#restart-btn');
      const exportBtn = this.cardElement.querySelector('#export-btn');

      if (restartBtn) {
        restartBtn.addEventListener('mouseover', () => {
          restartBtn.style.background = '#0088ff';
          restartBtn.style.boxShadow = '0 0 10px rgba(0, 136, 255, 0.6)';
        });
        restartBtn.addEventListener('mouseout', () => {
          restartBtn.style.background = '#0066ff';
          restartBtn.style.boxShadow = 'none';
        });
        restartBtn.addEventListener('click', () => this.onRestart());
      }

      if (exportBtn) {
        exportBtn.addEventListener('mouseover', () => {
          exportBtn.style.background = '#00ff00';
          exportBtn.style.color = '#000';
          exportBtn.style.boxShadow = '0 0 10px rgba(0, 255, 0, 0.6)';
        });
        exportBtn.addEventListener('mouseout', () => {
          exportBtn.style.background = '#00aa00';
          exportBtn.style.boxShadow = 'none';
        });
        exportBtn.addEventListener('click', () => this.onExport(this.result));
      }
    }

    parentElement.appendChild(this.overlayBg);
    parentElement.appendChild(this.cardElement);
    this.domElement = this.cardElement;
  }

  destroy() {
    if (this.overlayBg && this.overlayBg.parentElement) {
      this.overlayBg.parentElement.removeChild(this.overlayBg);
    }
    if (this.cardElement && this.cardElement.parentElement) {
      this.cardElement.parentElement.removeChild(this.cardElement);
    }
    this.overlayBg = null;
    this.cardElement = null;
    this.domElement = null;
  }
}
