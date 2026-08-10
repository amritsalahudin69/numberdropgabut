export class GameHud {
  constructor(config = {}) {
    this.session = config.session;
    this.level = config.level;
    this.runRecorder = config.runRecorder;

    this.domElement = null;
  }

  mount(parentElement) {
    if (!parentElement) {
      console.warn('[GameHud] no parent element, skipping mount');
      return;
    }

    this.domElement = document.createElement('div');
    this.domElement.id = 'game-hud';
    this.domElement.style.cssText = `
      position: absolute;
      top: 20px;
      left: 20px;
      background: rgba(0, 0, 0, 0.7);
      color: #fff;
      font-family: monospace;
      font-size: 14px;
      padding: 12px;
      border: 1px solid #444;
      min-width: 200px;
      z-index: 1000;
    `;

    this.update();
    parentElement.appendChild(this.domElement);
  }

  update() {
    if (!this.domElement) return;

    const current = this.session ? this.session.getCurrentValue() : 0;
    const target = this.level ? this.level.targetValue || 0 : 0;
    const opsUsed = this.session ? this.session.getOpsUsed() : 0;
    const opsRemaining = this.session ? this.session.getOpsRemaining() : 0;

    const lastOp = this.runRecorder ? this.runRecorder.getLastOperation() : null;
    const lastOpStr = lastOp
      ? `${lastOp.previousValue} ${lastOp.operator} ${lastOp.operand} = ${lastOp.nextValue}`
      : '—';

    const opHistory = this.runRecorder && this.runRecorder.operations.length > 0
      ? this.runRecorder.operations.slice(-5).map(op => `${op.seq}: ${op.operator} ${op.operand}`).join(' | ')
      : '(none)';

    this.domElement.innerHTML = `
      <div><strong>CURRENT</strong>: ${current}</div>
      <div><strong>TARGET</strong>: ${target}</div>
      <div><strong>LAST OP</strong>: ${lastOpStr}</div>
      <div><strong>OPS</strong>: ${opsUsed} / ${opsUsed + opsRemaining}</div>
      <div><strong>HISTORY</strong>: ${opHistory}</div>
    `;
  }

  reset() {
    this.update();
  }

  destroy() {
    if (this.domElement && this.domElement.parentElement) {
      this.domElement.parentElement.removeChild(this.domElement);
    }
    this.domElement = null;
  }
}
