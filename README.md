# Selectable - Browser Extension

![Manifest](https://img.shields.io/badge/manifest-v3-orange) ![License](https://img.shields.io/badge/license-MIT-blue.svg)

**Selectable** is a lightweight browser extension that allows users to extract structured data from web tables and text elements. Unlike standard browser selection, Selectable preserves row and column structure, making it perfect for copying data directly into Excel, Google Sheets, or CSV files.

**Published by:** [Black Ninja](https://blackninja.com)

## 🚀 Features

- **Smart Table Detection:** Automatically identifies `<table>` elements on any webpage.
- **Structural Selection:** Adds interactive handles to select entire rows or columns with a single click.
- **Precision Control:** Click individual cells to add/remove them from your selection.
- **Spreadsheet Ready:** Copies data to the clipboard in Tab-Separated Values (TSV) format, preserving the grid layout.
- **Privacy First:** Runs entirely offline. No data is ever sent to external servers.

## 🌐 Browser Compatibility

| Browser                     | Status     | Notes                                               |
| :-------------------------- | :--------- | :-------------------------------------------------- |
| **Microsoft Edge**          | ✅ Native  | Fully supported via Add-ons Store.                  |
| **Google Chrome**           | ✅ Native  | Fully supported.                                    |
| **Brave / Opera / Vivaldi** | ✅ Native  | Fully supported (Chromium engine).                  |
| **Mozilla Firefox**         | ⚠️ Tweaks  | Requires simple `manifest.json` change (see below). |
| **Safari**                  | 🛠️ Convert | Requires Xcode conversion.                          |

## 📦 Installation

### Method 1: Microsoft Edge / Chrome Web Store

_Links coming soon!_

### Method 2: Manual Installation (Developer Mode)

#### For Edge, Chrome, Brave, Opera, Vivaldi:

1.  Clone or download this repository.
2.  Open your browser's extension dashboard:
    - **Edge:** `edge://extensions`
    - **Chrome/Brave:** `chrome://extensions`
3.  Enable **Developer mode** (usually a toggle in the corner).
4.  Click **Load unpacked**.
5.  Select the folder containing `manifest.json`.

#### For Mozilla Firefox:

Firefox uses a slightly different background script configuration for Manifest V3.

1.  Open `manifest.json` in a text editor.
2.  Locate the `"background"` section (lines 14-16).
3.  Change `"service_worker"` to `"scripts"`.

    **Change this:**

    ```json
    "background": {
      "service_worker": "background.js"
    },
    ```

    **To this:**

    ```json
    "background": {
      "scripts": ["background.js"]
    },
    ```

4.  Open Firefox and go to `about:debugging#/runtime/this-firefox`.
5.  Click **Load Temporary Add-on**.
6.  Select any file in the extension folder (e.g., `manifest.json`).

## 🛠️ Usage

1.  Navigate to a web page containing a table (e.g., [Wikipedia List of Presidents](https://en.wikipedia.org/wiki/List_of_Presidents_of_the_United_States)).
2.  Click the **Selectable** icon in the browser toolbar.
3.  **Phase 1 (Table Selection):** Hover over any table and click it to "lock" the selection mode to that table.
4.  **Phase 2 (Cell Selection):**
    - Click **Row/Column Handles** (arrows) to select lines.
    - Click individual cells to toggle them.
    - Use the **Control Panel** (bottom right) to "Select All", "Clear", or "Copy".
5.  Click **"Copy Cells"** to save the data to your clipboard.

## 🔧 Tech Stack

- **Core:** Vanilla JavaScript (ES6+), HTML5, CSS3.
- **Architecture:** Manifest V3 (Background Service Worker + Content Script Injection).
- **Storage:** None (In-memory only).

## 🔒 Privacy Policy

This extension does not collect, store, or transmit any user data. All processing happens locally on your device.
For more details, please see our [Privacy Policy](privacy.md).

## 📄 License

Distributed under the MIT License. See `LICENSE.md` for more information.

---

**Contact:** jweek@blackninja.com | [BlackNinja.com](https://blackninja.com)
