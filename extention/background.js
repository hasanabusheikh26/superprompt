// background.js - SuperPrompt Service Worker

// Store for cross-tab communication
let extensionData = {
  history: [],
  settings: {},
  stats: {}
};

chrome.runtime.onInstalled.addListener((details) => {
  console.log('SuperPrompt extension installed/updated:', details.reason);
  
  // Initialize default settings on install
  if (details.reason === 'install') {
    chrome.storage.local.set({
      superPromptSettings: {
        darkMode: false,
        soundEffects: true,
        autoCopy: false
      },
      superPromptStats: {
        totalEnhancements: 0,
        sitesUsed: 0
      },
      promptHistory: []
    });
  }
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request.action, sender.tab?.url);
  
  switch (request.action) {
    case 'openMainPopup':
      // Open the extension popup
      chrome.action.openPopup()
        .then(() => {
          sendResponse({ success: true });
        })
        .catch((error) => {
          console.error('Failed to open popup:', error);
          sendResponse({ success: false, error: error.message });
        });
      break;
      
    case 'saveToHistory':
      // Forward to popup if it's open, otherwise store for later
      handleHistoryUpdate(request.data, sendResponse);
      break;
      
    case 'getStats':
      // Return current stats
      chrome.storage.local.get(['superPromptStats'])
        .then((result) => {
          sendResponse({ 
            success: true, 
            stats: result.superPromptStats || { totalEnhancements: 0, sitesUsed: 0 }
          });
        })
        .catch((error) => {
          sendResponse({ success: false, error: error.message });
        });
      break;
      
    case 'ping':
      sendResponse({ status: 'pong', timestamp: Date.now() });
      break;
      
    default:
      console.warn('Unknown action in background:', request.action);
      sendResponse({ success: false, error: 'Unknown action' });
  }
  
  return true; // Keep message channel open for async response
});

async function handleHistoryUpdate(historyData, sendResponse) {
  try {
    // Save to storage
    const result = await chrome.storage.local.get(['promptHistory', 'superPromptStats']);
    const currentHistory = result.promptHistory || [];
    const currentStats = result.superPromptStats || { totalEnhancements: 0, sitesUsed: 0 };
    
    // Add new item to history
    currentHistory.unshift(historyData);
    
    // Keep only last 100 items
    if (currentHistory.length > 100) {
      currentHistory.splice(100);
    }
    
    // Update stats
    const uniqueSites = new Set(currentHistory.map(item => item.site));
    const updatedStats = {
      totalEnhancements: currentHistory.length,
      sitesUsed: uniqueSites.size
    };
    
    // Save to storage
    await chrome.storage.local.set({
      promptHistory: currentHistory,
      superPromptStats: updatedStats
    });
    
    // Try to notify popup if it's open
    try {
      const views = chrome.extension.getViews({ type: 'popup' });
      if (views.length > 0) {
        // Popup is open, send message to it
        chrome.runtime.sendMessage({
          action: 'historyUpdated',
          data: historyData
        });
      }
    } catch (error) {
      // Popup not open, that's fine
      console.log('Popup not open, saved to storage only');
    }
    
    sendResponse({ success: true });
    
  } catch (error) {
    console.error('Failed to update history:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  console.log('Extension icon clicked on tab:', tab.url);
  // This will only fire if popup is not defined or fails to open
  // The popup should open automatically due to manifest.json configuration
});

// Handle tab updates to inject content script if needed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only inject on complete page loads
  if (changeInfo.status === 'complete' && tab.url) {
    // Skip special chrome:// pages and extensions
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('moz-extension://')) {
      return;
    }
    
    // Check if content script is already injected
    chrome.tabs.sendMessage(tabId, { action: 'ping' })
      .then((response) => {
        if (!response || response.status !== 'alive') {
          // Content script not responding, might need injection
          console.log('Content script not detected, but should be auto-injected');
        }
      })
      .catch((error) => {
        // Content script not loaded, but it should be auto-injected via manifest
        console.log('Content script not loaded on tab:', tab.url);
      });
  }
});

// Handle storage changes for sync across tabs
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    console.log('Storage changed:', Object.keys(changes));
    
    // Update local cache
    if (changes.promptHistory) {
      extensionData.history = changes.promptHistory.newValue || [];
    }
    
    if (changes.superPromptSettings) {
      extensionData.settings = changes.superPromptSettings.newValue || {};
    }
    
    if (changes.superPromptStats) {
      extensionData.stats = changes.superPromptStats.newValue || {};
    }
  }
});

// Cleanup function
chrome.runtime.onSuspend.addListener(() => {
  console.log('SuperPrompt background script suspending');
  // Any cleanup code here
});

// Handle installation/update
chrome.runtime.onStartup.addListener(() => {
  console.log('SuperPrompt extension starting up');
  
  // Load data into memory
  chrome.storage.local.get(['promptHistory', 'superPromptSettings', 'superPromptStats'])
    .then((result) => {
      extensionData.history = result.promptHistory || [];
      extensionData.settings = result.superPromptSettings || {};
      extensionData.stats = result.superPromptStats || {};
      
      console.log('Loaded extension data:', {
        historyCount: extensionData.history.length,
        settings: Object.keys(extensionData.settings),
        stats: extensionData.stats
      });
    })
    .catch((error) => {
      console.error('Failed to load extension data on startup:', error);
    });
});

// Utility function to broadcast message to all tabs
async function broadcastToTabs(message) {
  try {
    const tabs = await chrome.tabs.query({});
    const promises = tabs.map(tab => 
      chrome.tabs.sendMessage(tab.id, message)
        .catch(() => {
          // Tab doesn't have content script, ignore
        })
    );
    
    await Promise.allSettled(promises);
  } catch (error) {
    console.error('Failed to broadcast to tabs:', error);
  }
}

// Export utility for other scripts if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { extensionData, broadcastToTabs };
}