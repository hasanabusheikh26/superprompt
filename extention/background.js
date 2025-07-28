chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "replaceSelection" && sender.tab?.id) {
    chrome.scripting.executeScript({
      target: { tabId: sender.tab.id },
      func: (text) => {
        const range = window.getSelection().getRangeAt(0);
        if (!range) return;
        range.deleteContents();
        range.insertNode(document.createTextNode(text));
      },
      args: [message.newText]
    });
  }
});