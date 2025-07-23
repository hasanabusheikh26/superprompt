chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ superprompt_signedin: false });
});