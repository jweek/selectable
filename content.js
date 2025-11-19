console.log("Selectable Content Script Loaded");

// --- Prevent Duplicate Injection Crash ---
if (typeof window.selectableHasRun === "undefined") {
  window.selectableHasRun = true;

  // State
  var isActive = false;
  var mode = "IDLE";
  var activeTable = null;
  var selectedElements = new Set();
  var hoverTarget = null;

  // UI Elements
  var controlPanel = null;
  var handleContainer = null;

  // --- Initialization ---
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.command === "toggle") {
      const newStatus =
        request.status !== undefined ? request.status : !isActive;
      toggleExtension(newStatus);
    }
  });

  function toggleExtension(status) {
    isActive = status;
    if (isActive) {
      mode = "SELECT_TABLE";
      createTableSelectionPanel(); // PHASE 1 UI
      document.body.style.cursor = "crosshair";
      document.addEventListener("mouseover", handleMouseOver);
      document.addEventListener("click", handleClick, true);
      document.addEventListener("mouseout", handleMouseOut);
    } else {
      shutdown();
    }
  }

  function shutdown() {
    isActive = false;
    mode = "IDLE";
    activeTable = null;
    clearSelection();
    removeUI();
    document.body.style.cursor = "default";
    document.removeEventListener("mouseover", handleMouseOver);
    document.removeEventListener("click", handleClick, true);
    document.removeEventListener("mouseout", handleMouseOut);
  }

  // --- UI PHASE 1: Select Table ---
  function createTableSelectionPanel() {
    let panel = document.getElementById("selectable-control-panel");
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "selectable-control-panel";
      document.body.appendChild(panel);
    }
    controlPanel = panel;

    // Simple Layout: Label + Cancel
    panel.innerHTML = `
      <div class="selectable-phase1-layout">
        <span class="selectable-label">Select a Table</span>
        <button id="btn-cancel-phase1" class="selectable-btn danger" style="padding: 6px 15px; font-size: 12px;">Cancel</button>
      </div>
    `;

    document
      .getElementById("btn-cancel-phase1")
      .addEventListener("click", () => shutdown());
  }

  // --- UI PHASE 2: Select Cells (2x2 Grid) ---
  function createCellSelectionPanel() {
    let panel = document.getElementById("selectable-control-panel");
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "selectable-control-panel";
      document.body.appendChild(panel);
    }
    controlPanel = panel;

    // Overwrite with Grid Layout
    controlPanel.innerHTML = `
      <div class="selectable-grid">
        <button id="btn-select-all" class="selectable-btn secondary">Select All</button>
        <button id="btn-clear" class="selectable-btn secondary">Clear</button>
        <button id="btn-copy" class="selectable-btn primary" disabled>Copy 0 Cells</button>
        <button id="btn-cancel" class="selectable-btn danger">Cancel</button>
      </div>
    `;

    document
      .getElementById("btn-select-all")
      .addEventListener("click", selectAllInTable);
    document
      .getElementById("btn-clear")
      .addEventListener("click", clearSelection);
    document
      .getElementById("btn-copy")
      .addEventListener("click", copySelection);
    document
      .getElementById("btn-cancel")
      .addEventListener("click", () => shutdown());
  }

  function updateControlPanel() {
    if (!controlPanel || mode !== "SELECT_CELLS") return;

    const copyBtn = document.getElementById("btn-copy");
    if (!copyBtn) return; // Safety check

    const count = selectedElements.size;

    copyBtn.innerText = `Copy ${count} Cells`;
    copyBtn.disabled = count === 0;

    if (count > 0) {
      copyBtn.classList.remove("disabled");
    } else {
      copyBtn.classList.add("disabled");
    }
  }

  function removeUI() {
    const panel = document.getElementById("selectable-control-panel");
    if (panel) panel.remove();

    const handles = document.getElementById("selectable-handle-container");
    if (handles) handles.remove();

    document
      .querySelectorAll(
        ".selectable-highlight-hover, .selectable-selected, .selectable-table-locked"
      )
      .forEach((el) => {
        el.classList.remove(
          "selectable-highlight-hover",
          "selectable-selected",
          "selectable-table-locked"
        );
      });
  }

  function showToast(msg) {
    const toast = document.createElement("div");
    toast.className = "selectable-toast";
    toast.innerText = msg;
    document.body.appendChild(toast);
    setTimeout(() => (toast.style.opacity = "1"), 10);
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  function handleMouseOver(e) {
    if (!isActive) return;
    e.stopPropagation();
    const target = e.target;

    if (
      target.closest("#selectable-control-panel") ||
      target.closest(".selectable-handle-container")
    )
      return;

    if (mode === "SELECT_TABLE") {
      const table = target.closest("table");
      if (table) {
        if (hoverTarget && hoverTarget !== table) {
          hoverTarget.classList.remove("selectable-highlight-hover");
        }
        table.classList.add("selectable-highlight-hover");
        hoverTarget = table;
      }
    } else if (mode === "SELECT_CELLS") {
      const cell = target.closest("td, th");
      if (cell && target.closest("table") === activeTable) {
        cell.classList.add("selectable-highlight-hover");
        hoverTarget = cell;
      }
    }
  }

  function handleMouseOut(e) {
    if (!isActive) return;
    if (e.target && e.target.classList.contains("selectable-highlight-hover")) {
      e.target.classList.remove("selectable-highlight-hover");
    }
  }

  function handleClick(e) {
    if (!isActive) return;
    const target = e.target;

    if (
      target.closest("#selectable-control-panel") ||
      target.classList.contains("selectable-handle-btn")
    )
      return;

    e.preventDefault();
    e.stopPropagation();

    if (mode === "SELECT_TABLE") {
      const table = target.closest("table");
      if (table) {
        lockTable(table);
      } else {
        showToast("Please click on a Table");
      }
    } else if (mode === "SELECT_CELLS") {
      const cell = target.closest("td, th");
      if (cell && target.closest("table") === activeTable) {
        toggleCell(cell);
      }
    }
  }

  function lockTable(table) {
    activeTable = table;
    mode = "SELECT_CELLS";

    document
      .querySelectorAll(".selectable-highlight-hover")
      .forEach((el) => el.classList.remove("selectable-highlight-hover"));
    table.classList.add("selectable-table-locked");

    // SWITCH TO PHASE 2 UI
    createCellSelectionPanel();

    if (!document.getElementById("selectable-handle-container")) {
      handleContainer = document.createElement("div");
      handleContainer.id = "selectable-handle-container";
      handleContainer.className = "selectable-handle-container";
      document.body.appendChild(handleContainer);
    }
    injectTableHandles(table);
  }

  function toggleCell(cell) {
    if (selectedElements.has(cell)) {
      selectedElements.delete(cell);
      cell.classList.remove("selectable-selected");
    } else {
      selectedElements.add(cell);
      cell.classList.add("selectable-selected");
    }
    updateControlPanel();
  }

  function selectAllInTable() {
    if (!activeTable) return;
    activeTable.querySelectorAll("td, th").forEach((cell) => {
      selectedElements.add(cell);
      cell.classList.add("selectable-selected");
    });
    updateControlPanel();
  }

  function injectTableHandles(table) {
    handleContainer.innerHTML = "";

    const rect = table.getBoundingClientRect();
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    const firstRow = table.rows[0];
    if (firstRow) {
      for (let i = 0; i < firstRow.cells.length; i++) {
        const cell = firstRow.cells[i];
        const cellRect = cell.getBoundingClientRect();

        const btn = document.createElement("button");
        btn.className = "selectable-handle-btn selectable-col-handle";
        btn.innerText = "↓";
        btn.style.left =
          cellRect.left + scrollX + cellRect.width / 2 - 10 + "px";
        btn.style.top = cellRect.top + scrollY - 25 + "px";

        btn.onclick = (e) => selectColumn(table, i, e);
        handleContainer.appendChild(btn);
      }
    }

    for (let i = 0; i < table.rows.length; i++) {
      const row = table.rows[i];
      const rowRect = row.getBoundingClientRect();

      const btn = document.createElement("button");
      btn.className = "selectable-handle-btn selectable-row-handle";
      btn.innerText = "→";
      btn.style.left = rowRect.left + scrollX - 25 + "px";
      btn.style.top = rowRect.top + scrollY + rowRect.height / 2 - 10 + "px";

      btn.onclick = (e) => selectRow(row, e);
      handleContainer.appendChild(btn);
    }
  }

  function selectColumn(table, colIndex, e) {
    e.stopPropagation();

    const cellsInCol = [];
    for (let row of table.rows) {
      if (row.cells[colIndex]) cellsInCol.push(row.cells[colIndex]);
    }

    if (cellsInCol.length === 0) return;

    const firstState = selectedElements.has(cellsInCol[0]);

    cellsInCol.forEach((cell) => {
      if (firstState) {
        selectedElements.delete(cell);
        cell.classList.remove("selectable-selected");
      } else {
        selectedElements.add(cell);
        cell.classList.add("selectable-selected");
      }
    });
    updateControlPanel();
  }

  function selectRow(row, e) {
    e.stopPropagation();
    const cells = Array.from(row.cells);

    if (cells.length === 0) return;

    const firstState = selectedElements.has(cells[0]);

    cells.forEach((cell) => {
      if (firstState) {
        selectedElements.delete(cell);
        cell.classList.remove("selectable-selected");
      } else {
        selectedElements.add(cell);
        cell.classList.add("selectable-selected");
      }
    });
    updateControlPanel();
  }

  function clearSelection() {
    selectedElements.forEach((el) =>
      el.classList.remove("selectable-selected")
    );
    selectedElements.clear();
    updateControlPanel();
  }

  function copySelection() {
    const selectedElsArray = Array.from(selectedElements);
    const cells = selectedElsArray.filter(
      (el) => el.tagName === "TD" || el.tagName === "TH"
    );

    if (cells.length === 0) return;

    const activeRows = new Set();
    const activeColIndices = new Set();

    cells.forEach((cell) => {
      activeRows.add(cell.parentElement);
      activeColIndices.add(cell.cellIndex);
    });

    const sortedColIndices = Array.from(activeColIndices).sort((a, b) => a - b);

    const sortedRows = Array.from(activeRows).sort((a, b) => {
      return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING
        ? -1
        : 1;
    });

    let outputLines = [];

    sortedRows.forEach((row) => {
      let rowData = [];
      const rowCellMap = new Map();
      for (let cell of row.cells) {
        rowCellMap.set(cell.cellIndex, cell);
      }

      sortedColIndices.forEach((colIndex) => {
        const cell = rowCellMap.get(colIndex);

        if (cell && selectedElements.has(cell)) {
          let text = cell.innerText.trim();
          if (text.includes("\t") || text.includes("\n")) {
            text = `"${text.replace(/"/g, '""')}"`;
          }
          rowData.push(text);
        } else {
          rowData.push("");
        }
      });

      outputLines.push(rowData.join("\t"));
    });

    const textToCopy = outputLines.join("\n");

    try {
      if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard
          .writeText(textToCopy)
          .then(onCopySuccess)
          .catch(() => fallbackCopy(textToCopy));
      } else {
        throw new Error("Clipboard API unavailable");
      }
    } catch (err) {
      fallbackCopy(textToCopy);
    }
  }

  function fallbackCopy(text) {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "0";

      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);

      if (successful) {
        onCopySuccess();
      } else {
        showToast("Clipboard access denied");
      }
    } catch (err) {
      console.error("Fallback copy failed", err);
      showToast("Error copying data");
    }
  }

  function onCopySuccess() {
    const btn = document.getElementById("btn-copy");
    if (btn) btn.innerText = "Copied!";
    setTimeout(() => shutdown(), 800);
  }
}
