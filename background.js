chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  // 1. Try to send the toggle command
  try {
    await chrome.tabs.sendMessage(tab.id, { command: "toggle" });
  } catch (err) {
    console.log("Content script not ready. Injecting now...", err);

    // 2. If that fails, we manually inject the scripts
    try {
      await chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        files: ["styles.css"],
      });

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"],
      });

      // 3. Wait a tiny bit for the script to load, then retry the command
      setTimeout(() => {
        chrome.tabs
          .sendMessage(tab.id, { command: "toggle", status: true })
          .catch((e) => console.error("Retry failed:", e));
      }, 100);
    } catch (injectionErr) {
      console.error("Cannot inject script (system page?):", injectionErr);
    }
  }
});
