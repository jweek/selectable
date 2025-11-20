// /lib/uicontroller.js

window.Selectable = window.Selectable || {};

window.Selectable.UIController = class UIController {
  constructor() {
    this.panel = null;
    this.handleContainer = null;
  }

  renderPhase1Panel(onCancel) {
    this._ensurePanel();
    this.panel.innerHTML = `
      <div class="selectable-phase1-layout">
        <span class="selectable-label">Select a Table</span>
        <button id="btn-cancel-phase1" class="selectable-btn danger" style="padding: 6px 15px; font-size: 12px;">Cancel</button>
      </div>
    `;
    document.getElementById("btn-cancel-phase1").onclick = onCancel;
  }

  renderPhase2Panel(handlers) {
    this._ensurePanel();
    this.panel.innerHTML = `
      <div class="selectable-grid">
        <button id="btn-select-all" class="selectable-btn secondary">Select All</button>
        <button id="btn-clear" class="selectable-btn secondary">Clear</button>
        <button id="btn-copy" class="selectable-btn primary" disabled>Copy 0 Cells</button>
        <button id="btn-cancel" class="selectable-btn danger">Cancel</button>
      </div>
    `;

    document.getElementById("btn-select-all").onclick = handlers.onSelectAll;
    document.getElementById("btn-clear").onclick = handlers.onClear;
    document.getElementById("btn-copy").onclick = handlers.onCopy;
    document.getElementById("btn-cancel").onclick = handlers.onCancel;
  }

  updatePanel(count) {
    const copyBtn = document.getElementById("btn-copy");
    if (!copyBtn) return;
    copyBtn.innerText = `Copy ${count} Cells`;
    copyBtn.disabled = count === 0;
    copyBtn.classList.toggle("disabled", count === 0);
  }

  _ensurePanel() {
    if (!this.panel) {
      this.panel = document.createElement("div");
      this.panel.id = "selectable-control-panel";
      document.body.appendChild(this.panel);
    }
  }

  injectHandles(scanner, onSelectGroup) {
    this._ensureHandleContainer();
    this.handleContainer.innerHTML = "";
    if (!scanner || !scanner.colGroups) return;

    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const tableRect = scanner.table.getBoundingClientRect();

    scanner.colGroups.forEach((group) => {
      const bounds = scanner.getVisualBounds(group, "col");
      if (bounds) {
        const btn = this._createHandle("↓", "col");
        const centerX = (bounds.left + bounds.right) / 2;
        btn.style.left = centerX + scrollX - 10 + "px";
        btn.style.top = bounds.top + scrollY - 25 + "px";
        btn.onclick = (e) => onSelectGroup(group, "col", e);
        this.handleContainer.appendChild(btn);
      }
    });

    scanner.rowGroups.forEach((group) => {
      const bounds = scanner.getVisualBounds(group, "row");
      if (bounds) {
        const btn = this._createHandle("→", "row");
        const centerY = (bounds.top + bounds.bottom) / 2;
        btn.style.left = tableRect.left + scrollX - 25 + "px";
        btn.style.top = centerY + scrollY - 10 + "px";
        btn.onclick = (e) => onSelectGroup(group, "row", e);
        this.handleContainer.appendChild(btn);
      }
    });
  }

  _createHandle(text, type) {
    const btn = document.createElement("button");
    btn.className = `selectable-handle-btn selectable-${type}-handle`;
    btn.innerText = text;
    return btn;
  }

  _ensureHandleContainer() {
    if (!this.handleContainer) {
      this.handleContainer = document.createElement("div");
      this.handleContainer.id = "selectable-handle-container";
      this.handleContainer.className = "selectable-handle-container";
      document.body.appendChild(this.handleContainer);
    }
  }

  clear() {
    if (this.panel) this.panel.remove();
    this.panel = null;
    if (this.handleContainer) this.handleContainer.remove();
    this.handleContainer = null;
    document
      .querySelectorAll(
        ".selectable-highlight-hover, .selectable-selected, .selectable-table-locked, .selectable-table-candidate"
      )
      .forEach((el) =>
        el.classList.remove(
          "selectable-highlight-hover",
          "selectable-selected",
          "selectable-table-locked",
          "selectable-table-candidate"
        )
      );
  }
};
