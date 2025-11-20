// /lib/selectionmanager.js

window.Selectable = window.Selectable || {};

window.Selectable.SelectionManager = class SelectionManager {
  constructor(scanner) {
    this.scanner = scanner;
    this.selectedCells = new Set();
  }

  clear() {
    this.selectedCells.forEach((cell) =>
      cell.classList.remove("selectable-selected")
    );
    this.selectedCells.clear();
  }

  toggleCell(cell) {
    if (this.selectedCells.has(cell)) {
      this.selectedCells.delete(cell);
      cell.classList.remove("selectable-selected");
    } else {
      this.selectedCells.add(cell);
      cell.classList.add("selectable-selected");
    }
  }

  selectAll() {
    this.scanner.virtualGrid.forEach((row) => {
      row.forEach((cell) => {
        if (cell) {
          this.selectedCells.add(cell);
          cell.classList.add("selectable-selected");
        }
      });
    });
  }

  selectGroup(group, type) {
    const grid = this.scanner.virtualGrid;
    let cellsToToggle = new Set();

    if (type === "col") {
      for (let c = group.start; c < group.end; c++) {
        for (let r = 0; r < grid.length; r++) {
          if (grid[r][c]) cellsToToggle.add(grid[r][c]);
        }
      }
    } else {
      for (let r = group.start; r < group.end; r++) {
        for (let c = 0; c < grid[r].length; c++) {
          if (grid[r][c]) cellsToToggle.add(grid[r][c]);
        }
      }
    }

    let anyUnselected = false;
    cellsToToggle.forEach((cell) => {
      if (!this.selectedCells.has(cell)) anyUnselected = true;
    });

    cellsToToggle.forEach((cell) => {
      if (anyUnselected) {
        this.selectedCells.add(cell);
        cell.classList.add("selectable-selected");
      } else {
        this.selectedCells.delete(cell);
        cell.classList.remove("selectable-selected");
      }
    });
  }

  getCount() {
    return this.selectedCells.size;
  }

  hasSelection() {
    return this.selectedCells.size > 0;
  }
};
