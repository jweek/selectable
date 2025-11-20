window.Selectable = window.Selectable || {};

window.Selectable.TableScanner = class TableScanner {
  constructor(tableElement) {
    this.table = tableElement;
    this.virtualGrid = [];
    this.maxCols = 0;
    this.maxRows = 0;
    this.colGroups = [];
    this.rowGroups = [];

    this._scan();
  }

  _scan() {
    this._buildVirtualGrid();
    this._identifyGroups();
  }

  _buildVirtualGrid() {
    this.virtualGrid = [];
    let currentGridRow = 0;

    for (let r = 0; r < this.table.rows.length; r++) {
      let row = this.table.rows[r];

      if (row.offsetParent === null) continue;

      if (!this.virtualGrid[currentGridRow])
        this.virtualGrid[currentGridRow] = [];

      let currentGridCol = 0;

      for (let c = 0; c < row.cells.length; c++) {
        let cell = row.cells[c];

        while (this.virtualGrid[currentGridRow][currentGridCol]) {
          currentGridCol++;
        }

        let spanX = cell.colSpan || 1;
        let spanY = cell.rowSpan || 1;

        for (let i = 0; i < spanX; i++) {
          for (let j = 0; j < spanY; j++) {
            let targetRow = currentGridRow + j;
            let targetCol = currentGridCol + i;

            if (!this.virtualGrid[targetRow]) this.virtualGrid[targetRow] = [];
            this.virtualGrid[targetRow][targetCol] = cell;
          }
        }
        currentGridCol += spanX;
      }

      if (currentGridCol > this.maxCols) this.maxCols = currentGridCol;
      currentGridRow++;
    }
    this.maxRows = currentGridRow;
  }

  _identifyGroups() {
    // 1. Column Groups (Header Driven)
    let headerRowIndex = 0;
    const threshold = Math.floor(this.maxCols * 0.9);

    for (let r = 0; r < Math.min(5, this.maxRows); r++) {
      if (!this.virtualGrid[r]) continue;
      const firstCell = this.virtualGrid[r][0];
      if (firstCell && firstCell.colSpan >= threshold && this.maxCols > 1) {
        continue;
      }
      headerRowIndex = r;
      break;
    }

    const colCells = this.virtualGrid[headerRowIndex] || [];
    let processedCols = new Set();

    for (let c = 0; c < this.maxCols; c++) {
      if (processedCols.has(c)) continue;

      const cell = colCells[c];
      let group = { start: c, end: c + 1 };

      if (cell && cell.colSpan > 1) {
        let end = c;
        while (end < this.maxCols && colCells[end] === cell) end++;
        group.end = end;
      }

      for (let k = group.start; k < group.end; k++) processedCols.add(k);
      this.colGroups.push(group);
    }

    // 2. Row Groups (Identifier Driven - Multi-Column Scan)
    // Fix: Scan first 3 columns to find the dominant rowspan
    let processedRows = new Set();
    const SCAN_DEPTH = 3;

    for (let r = 0; r < this.maxRows; r++) {
      if (processedRows.has(r)) continue;

      let maxSpan = 1;
      for (let c = 0; c < Math.min(this.maxCols, SCAN_DEPTH); c++) {
        const cell = this.virtualGrid[r] ? this.virtualGrid[r][c] : null;
        const cellAbove =
          r > 0 && this.virtualGrid[r - 1] ? this.virtualGrid[r - 1][c] : null;

        // It is a span start if it spans more than 1 row AND it's not just a continuation
        if (cell && cell !== cellAbove && cell.rowSpan > 1) {
          if (cell.rowSpan > maxSpan) maxSpan = cell.rowSpan;
        }
      }

      let group = { start: r, end: Math.min(r + maxSpan, this.maxRows) };
      for (let k = group.start; k < group.end; k++) processedRows.add(k);
      this.rowGroups.push(group);
    }
  }

  // --- REQUIRED FOR DEBUGGER & CLIPBOARD ---
  getMappings() {
    const rowMap = new Array(this.maxRows).fill(-1);
    const colMap = new Array(this.maxCols).fill(-1);

    this.rowGroups.forEach((group, index) => {
      for (let i = group.start; i < group.end; i++) rowMap[i] = index;
    });

    this.colGroups.forEach((group, index) => {
      for (let i = group.start; i < group.end; i++) colMap[i] = index;
    });

    return { rowMap, colMap };
  }

  getVisualBounds(group, type) {
    let minLeft = Infinity,
      minTop = Infinity;
    let maxRight = -Infinity,
      maxBottom = -Infinity;
    let found = false;

    if (type === "col") {
      for (let c = group.start; c < group.end; c++) {
        for (let r = 0; r < Math.min(5, this.maxRows); r++) {
          const cell = this.virtualGrid[r][c];
          if (cell) {
            const rect = cell.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              minLeft = Math.min(minLeft, rect.left);
              maxRight = Math.max(maxRight, rect.right);
              minTop = Math.min(minTop, rect.top);
              found = true;
              break;
            }
          }
        }
      }
    } else {
      for (let r = group.start; r < group.end; r++) {
        for (let c = 0; c < Math.min(this.maxCols, 3); c++) {
          const cell = this.virtualGrid[r] ? this.virtualGrid[r][c] : null;
          if (cell) {
            const rect = cell.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              minTop = Math.min(minTop, rect.top);
              maxBottom = Math.max(maxBottom, rect.bottom);
              found = true;
              break;
            }
          }
        }
      }
    }

    if (!found) return null;
    return { left: minLeft, right: maxRight, top: minTop, bottom: maxBottom };
  }
};
