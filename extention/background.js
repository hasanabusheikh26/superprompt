// background.js - SuperPrompt Background Service Worker

chrome.runtime.onInstalled.addListener(() => {
  // Init storage if not set
  chrome.storage.local.get(['promptHistory', 'superPromptSettings', 'superPromptStats'], (result) => {
    if (!result.promptHistory) chrome.storage.local.set({ promptHistory: [] });
    if (!result.superPromptSettings) chrome.storage.local.set({
      superPromptSettings: { darkMode: false, soundEffects: true, autoCopy: false, showIcon: true, quality: 'balanced' }
    });
    if (!result.superPromptStats) chrome.storage.local.set({
      superPromptStats: { totalEnhancements: 0, sitesUsed: 0, successRate: 100 }
    });
  });
});

// Handle saveToHistory from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveToHistory' && request.data) {
    chrome.storage.local.get(['promptHistory'], (result) => {
      const promptHistory = result.promptHistory || [];
      const id = Date.now().toString() + Math.floor(Math.random() * 10000);
      promptHistory.unshift({ ...request.data, id });
      chrome.storage.local.set({ promptHistory });
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'openMainPopup') {
    chrome.action.openPopup();
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'historyUpdated') {
    // just a broadcast
    return true;
  }
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "enhance_selected") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "enhanceSelected" });
      }
    });
  }
});