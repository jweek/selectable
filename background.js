chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  // 1. Try to send the toggle command (Checks if script is already there)
  try {
    await chrome.tabs.sendMessage(tab.id, { command: "toggle" });
  } catch (err) {
    // 2. If that fails, it means the script isn't injected yet. Inject it now.
    try {
      // Inject CSS
      await chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        files: ["styles.css"],
      });

      // Inject JS Libraries in order (Dependencies first)
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: [
          "lib/tablescanner.js",
          "lib/selectionmanager.js",
          "lib/clipboardservice.js",
          "lib/uicontroller.js",
          "content.js",
        ],
      });

      // 3. Wait a moment for the scripts to initialize, then activate
      setTimeout(() => {
        chrome.tabs
          .sendMessage(tab.id, { command: "toggle", status: true })
          .catch((e) => console.error("Retry failed:", e));
      }, 100);
    } catch (injectionErr) {
      console.error("Cannot inject scripts (restricted page?):", injectionErr);
    }
  }
});
