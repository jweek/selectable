// /content.js

console.log("Selectable: Initializing...");

window.Selectable = window.Selectable || {};

window.Selectable.App = class SelectableApp {
  constructor() {
    this.isActive = false;
    this.mode = "IDLE";
    this.tableScanner = null;
    this.selectionManager = null;
    this.ui = new window.Selectable.UIController();

    this.boundHandleMouseOver = this.handleMouseOver.bind(this);
    this.boundHandleClick = this.handleClick.bind(this);
    this.boundBlockEvent = this.blockEvent.bind(this);
  }

  toggle(forceState) {
    const newState = forceState !== undefined ? forceState : !this.isActive;
    if (newState) this.activate();
    else this.deactivate();
  }

  activate() {
    this.isActive = true;
    this.mode = "SELECT_TABLE";
    document.body.style.cursor = "crosshair";

    document
      .querySelectorAll("table")
      .forEach((t) => t.classList.add("selectable-table-candidate"));

    this.ui.renderPhase1Panel(() => this.deactivate());
    this.addListeners();
  }

  deactivate() {
    this.isActive = false;
    this.mode = "IDLE";
    document.body.style.cursor = "default";

    if (this.selectionManager) this.selectionManager.clear();
    this.ui.clear();
    this.removeListeners();

    document
      .querySelectorAll(".selectable-table-candidate")
      .forEach((t) => t.classList.remove("selectable-table-candidate"));
  }

  lockTable(table) {
    this.mode = "SELECT_CELLS";
    this.tableScanner = new window.Selectable.TableScanner(table);
    this.selectionManager = new window.Selectable.SelectionManager(
      this.tableScanner
    );

    document
      .querySelectorAll(".selectable-table-candidate")
      .forEach((t) => t.classList.remove("selectable-table-candidate"));
    table.classList.add("selectable-table-locked");

    // --- DEBUG: REPLACE CONTENT WITH COORDS (Uncomment to debug) ---
    // this.debugTable();
    // -----------------------------------------

    this.ui.renderPhase2Panel({
      onSelectAll: () => {
        this.selectionManager.selectAll();
        this.ui.updatePanel(this.selectionManager.getCount());
      },
      onClear: () => {
        this.selectionManager.clear();
        this.ui.updatePanel(this.selectionManager.getCount());
      },
      onCopy: () => {
        window.Selectable.ClipboardService.copy(
          this.tableScanner,
          this.selectionManager,
          () => {
            const btn = document.getElementById("btn-copy");
            if (btn) btn.innerText = "Copied!";
            setTimeout(() => this.deactivate(), 800);
          }
        );
      },
      onCancel: () => this.deactivate(),
    });

    this.ui.injectHandles(this.tableScanner, (group, type, e) => {
      e.stopPropagation();
      this.selectionManager.selectGroup(group, type);
      this.ui.updatePanel(this.selectionManager.getCount());
    });
  }

  debugTable() {
    const scanner = this.tableScanner;
    const { rowMap, colMap } = scanner.getMappings();
    const grid = scanner.virtualGrid;

    for (let r = 0; r < grid.length; r++) {
      if (!grid[r]) continue;
      for (let c = 0; c < grid[r].length; c++) {
        const cell = grid[r][c];
        if (cell) {
          const groupX = colMap[c];
          const groupY = rowMap[r];
          cell.style.fontSize = "10px";
          cell.style.color = "red";
          cell.style.border = "1px solid red";
          cell.innerText = `[${groupX}, ${groupY}]`;
        }
      }
    }
  }

  addListeners() {
    document.addEventListener("mouseover", this.boundHandleMouseOver, true);
    document.addEventListener("click", this.boundHandleClick, true);
    document.addEventListener("mouseenter", this.boundBlockEvent, true);
    document.addEventListener("mouseleave", this.boundBlockEvent, true);
  }

  removeListeners() {
    document.removeEventListener("mouseover", this.boundHandleMouseOver, true);
    document.removeEventListener("click", this.boundHandleClick, true);
    document.removeEventListener("mouseenter", this.boundBlockEvent, true);
    document.removeEventListener("mouseleave", this.boundBlockEvent, true);
  }

  blockEvent(e) {
    if (!this.isActive) return;
    if (!e.target || typeof e.target.closest !== "function") return;

    if (
      e.target.closest("#selectable-control-panel") ||
      e.target.closest(".selectable-handle-container") ||
      e.target.closest(".selectable-table-locked")
    )
      return;

    e.stopPropagation();
    e.stopImmediatePropagation();
  }

  handleMouseOver(e) {
    if (!this.isActive) return;
    if (!e.target || typeof e.target.closest !== "function") return;

    if (
      !e.target.closest("#selectable-control-panel") &&
      !e.target.closest(".selectable-handle-container")
    ) {
      e.stopPropagation();
    }

    const target = e.target;
    const old = document.querySelector(".selectable-highlight-hover");
    if (old && old !== target)
      old.classList.remove("selectable-highlight-hover");

    if (this.mode === "SELECT_TABLE") {
      const table = target.closest("table");
      if (table) table.classList.add("selectable-highlight-hover");
    } else if (this.mode === "SELECT_CELLS") {
      const cell = target.closest("td, th");
      if (
        cell &&
        this.tableScanner &&
        target.closest("table") === this.tableScanner.table
      ) {
        cell.classList.add("selectable-highlight-hover");
      }
    }
  }

  handleClick(e) {
    if (!this.isActive) return;
    if (!e.target || typeof e.target.closest !== "function") return;

    if (
      e.target.closest("#selectable-control-panel") ||
      e.target.closest(".selectable-handle-container")
    )
      return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const target = e.target;

    if (this.mode === "SELECT_TABLE") {
      const table = target.closest("table");
      if (table) this.lockTable(table);
    } else if (this.mode === "SELECT_CELLS") {
      const cell = target.closest("td, th");
      if (
        cell &&
        this.tableScanner &&
        target.closest("table") === this.tableScanner.table
      ) {
        this.selectionManager.toggleCell(cell);
        this.ui.updatePanel(this.selectionManager.getCount());
      }
    }
  }
};

if (!window.selectableAppInstance) {
  window.selectableAppInstance = new window.Selectable.App();

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.command === "toggle") {
      window.selectableAppInstance.toggle(request.status);
    }
  });
}
