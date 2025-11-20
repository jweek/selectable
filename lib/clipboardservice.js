// /lib/clipboardservice.js

window.Selectable = window.Selectable || {};

window.Selectable.ClipboardService = class ClipboardService {
  static async copy(scanner, selectionManager, onComplete) {
    if (!selectionManager.hasSelection()) return;

    const selected = selectionManager.selectedCells;
    const grid = scanner.virtualGrid;
    const { rowMap, colMap } = scanner.getMappings();

    // outputGrid[rowGroupIndex][colGroupIndex] = Set(content strings)
    const outputGrid = new Map();

    // Iterate Atomic Grid -> Bin into Output Groups
    for (let r = 0; r < grid.length; r++) {
      if (!grid[r]) continue;

      for (let c = 0; c < grid[r].length; c++) {
        const cell = grid[r][c];
        const rowGroupIdx = rowMap[r];
        const colGroupIdx = colMap[c];

        if (
          cell &&
          selected.has(cell) &&
          rowGroupIdx !== -1 &&
          colGroupIdx !== -1
        ) {
          if (!outputGrid.has(rowGroupIdx))
            outputGrid.set(rowGroupIdx, new Map());
          const rowBucket = outputGrid.get(rowGroupIdx);

          if (!rowBucket.has(colGroupIdx))
            rowBucket.set(colGroupIdx, new Set());
          const cellBucket = rowBucket.get(colGroupIdx);

          let text = cell.innerText.trim();
          let images = this._extractImages(cell);
          let content = text;
          if (images.length > 0)
            content += (content ? "\n" : "") + images.join("\n");

          if (content) cellBucket.add(content);
        }
      }
    }

    // Convert Bins to TSV String
    const activeRowIndices = Array.from(outputGrid.keys()).sort(
      (a, b) => a - b
    );

    const allActiveCols = new Set();
    outputGrid.forEach((rowBucket) => {
      rowBucket.forEach((_, colIdx) => allActiveCols.add(colIdx));
    });
    const activeColIndices = Array.from(allActiveCols).sort((a, b) => a - b);

    let finalOutput = [];

    activeRowIndices.forEach((rIdx) => {
      const rowBucket = outputGrid.get(rIdx);
      let rowString = [];

      activeColIndices.forEach((cIdx) => {
        if (rowBucket.has(cIdx)) {
          const contentSet = rowBucket.get(cIdx);
          // Join multiple items in the same bin with newlines
          let cellText = Array.from(contentSet).join("\n");

          // CSV Escaping
          if (
            cellText.includes("\t") ||
            cellText.includes("\n") ||
            cellText.includes('"')
          ) {
            cellText = `"${cellText.replace(/"/g, '""')}"`;
          }
          rowString.push(cellText);
        } else {
          rowString.push("");
        }
      });
      finalOutput.push(rowString.join("\t"));
    });

    const textData = finalOutput.join("\n");
    await this._executeCopy(textData, onComplete);
  }

  static _extractImages(cell) {
    const imgs = cell.querySelectorAll("img");
    const sources = [];
    imgs.forEach((img) => {
      if (img.src) sources.push(img.src);
    });
    return sources;
  }

  static async _executeCopy(text, onComplete) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        onComplete();
      } else {
        throw new Error("Clipboard API unavailable");
      }
    } catch (e) {
      this._fallbackCopy(text, onComplete);
    }
  }

  static _fallbackCopy(text, onComplete) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand("copy");
      onComplete();
    } catch (err) {
      console.error("Copy failed", err);
      if (window.Selectable.utils && window.Selectable.utils.showToast) {
        window.Selectable.utils.showToast("Error copying data");
      }
    } finally {
      document.body.removeChild(textArea);
    }
  }
};
