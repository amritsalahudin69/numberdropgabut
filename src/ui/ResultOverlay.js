export class ResultOverlay {
  constructor(config = {}) {
    this.result = config.result;
    this.onRestart = config.onRestart || (() => {});
    this.onExport = config.onExport || (() => {});

    this.domElement = null;
    this.overlayBg = null;
    this.cardElement = null;
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
      background: rgba(0, 0, 0, 0.8);
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
      background: #222;
      color: #fff;
      font-family: monospace;
      font-size: 14px;
      padding: 24px;
      border: 2px solid #444;
      max-width: 600px;
      max-height: 80vh;
      overflow-y: auto;
      z-index: 2001;
    `;

    if (this.result) {
      const result = this.result;
      const statusStr = result.success ? '✓ SUCCESS' : '✗ FAILED';
      const statusColor = result.success ? '#0f0' : '#f00';

      const operationsList = result.operations.length > 0
        ? result.operations.map(op => `seq ${op.seq}: ${op.previousValue} ${op.operator} ${op.operand} = ${op.nextValue}`).join('<br>')
        : '(no operations)';

      this.cardElement.innerHTML = `
        <div style="color: ${statusColor}; font-size: 18px; font-weight: bold; margin-bottom: 16px;">${statusStr}</div>
        <div><strong>Starting Value</strong>: ${result.startingValue}</div>
        <div><strong>Target Value</strong>: ${result.targetValue}</div>
        <div><strong>Final Value</strong>: ${result.finalValue}</div>
        <div style="margin-top: 12px;"><strong>Ops Used</strong>: ${result.opsUsed} / ${result.maxOps}</div>
        <div><strong>Completion Reason</strong>: ${result.completionReason}</div>
        <div style="margin-top: 12px; border-top: 1px solid #444; padding-top: 12px;">
          <div><strong>Operation Recap</strong>:</div>
          <div style="margin-top: 6px; font-size: 12px;">${operationsList}</div>
        </div>
        <div style="margin-top: 16px; display: flex; gap: 8px;">
          <button id="restart-btn" style="flex: 1; padding: 8px; background: #0066ff; color: #fff; border: none; cursor: pointer; font-size: 14px;">Restart</button>
          <button id="export-btn" style="flex: 1; padding: 8px; background: #0088ff; color: #fff; border: none; cursor: pointer; font-size: 14px;">Export JSON</button>
        </div>
      `;

      this.cardElement.querySelector('#restart-btn')?.addEventListener('click', () => this.onRestart());
      this.cardElement.querySelector('#export-btn')?.addEventListener('click', () => this.onExport());
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
