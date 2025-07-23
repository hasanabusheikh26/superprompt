// background.js - SuperPrompt Background Service Worker

chrome.runtime.onInstalled.addListener(() => {
  console.log('SuperPrompt extension installed');
  
  // Initialize storage with default values
  chrome.storage.local.get(['promptHistory', 'superPromptSettings', 'superPromptStats'], (result) => {
    if (!result.promptHistory) {
      chrome.storage.local.set({ promptHistory: [] });
    }
    
    if (!result.superPromptSettings) {
      chrome.storage.local.set({
        superPromptSettings: {
          darkMode: false,
          soundEffects: true,
          autoCopy: false,
          showIcon: true,
          quality: 'balanced',
          apiKey: '',
          model: 'gpt-3.5-turbo'
        }
      });
    }
    
    if (!result.superPromptStats) {
      chrome.storage.local.set({
        superPromptStats: {
          totalEnhancements: 0,
          sitesUsed: 0,
          successRate: 100
        }
      });
    }
  });
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request.action);
  
  switch (request.action) {
    case 'saveToHistory':
      if (request.data) {
        savePromptToHistory(request.data)
          .then(() => sendResponse({ success: true }))
          .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Will respond asynchronously
      }
      break;

    case 'openMainPopup':
      chrome.action.openPopup()
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case 'historyUpdated':
      // Just acknowledge the broadcast
      sendResponse({ success: true });
      break;

    case 'updateStats':
      if (request.stats) {
        updateStats(request.stats)
          .then(() => sendResponse({ success: true }))
          .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
      }
      break;

    default:
      sendResponse({ error: 'Unknown action' });
  }
});

// Handle keyboard commands
chrome.commands.onCommand.addListener((command) => {
  console.log('Command received:', command);
  
  switch (command) {
    case 'enhance_selected':
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { action: "enhanceSelected" })
            .catch(error => console.log('Could not send message to content script:', error));
        }
      });
      break;
      
    case '_execute_action':
      // This is handled automatically by Chrome
      break;
  }
});

// Save prompt enhancement to history
async function savePromptToHistory(data) {
  try {
    const result = await chrome.storage.local.get(['promptHistory']);
    const promptHistory = result.promptHistory || [];
    
    // Create history item with unique ID
    const historyItem = {
      id: Date.now().toString() + Math.floor(Math.random() * 10000),
      original: data.original,
      enhanced: data.enhanced,
      site: data.site,
      siteIcon: data.siteIcon,
      timestamp: data.timestamp || Date.now(),
      date: data.date || new Date().toLocaleDateString()
    };
    
    // Add to beginning of array
    promptHistory.unshift(historyItem);
    
    // Keep only last 500 items to prevent storage bloat
    if (promptHistory.length > 500) {
      promptHistory.splice(500);
    }
    
    // Save back to storage
    await chrome.storage.local.set({ promptHistory });
    
    // Update stats
    await updateStatsAfterEnhancement(data.site);
    
    console.log('Prompt saved to history:', historyItem.id);
    
  } catch (error) {
    console.error('Error saving to history:', error);
    throw error;
  }
}

// Update statistics after enhancement
async function updateStatsAfterEnhancement(site) {
  try {
    const result = await chrome.storage.local.get(['superPromptStats', 'promptHistory']);
    const stats = result.superPromptStats || { totalEnhancements: 0, sitesUsed: 0, successRate: 100 };
    const history = result.promptHistory || [];
    
    // Calculate new stats
    const uniqueSites = new Set(history.map(item => item.site)).size;
    
    const newStats = {
      totalEnhancements: history.length,
      sitesUsed: uniqueSites,
      successRate: Math.max(85, Math.min(100, 95 + Math.floor(Math.random() * 6))) // Mock success rate 85-100%
    };
    
    await chrome.storage.local.set({ superPromptStats: newStats });
    console.log('Stats updated:', newStats);
    
  } catch (error) {
    console.error('Error updating stats:', error);
  }
}

// Update stats manually
async function updateStats(newStats) {
  try {
    const result = await chrome.storage.local.get(['superPromptStats']);
    const currentStats = result.superPromptStats || {};
    
    const updatedStats = { ...currentStats, ...newStats };
    await chrome.storage.local.set({ superPromptStats: updatedStats });
    
    console.log('Stats manually updated:', updatedStats);
    
  } catch (error) {
    console.error('Error updating stats:', error);
    throw error;
  }
}

// Handle extension icon click (fallback)
chrome.action.onClicked.addListener((tab) => {
  console.log('Extension icon clicked');
  // This will open the popup automatically due to default_popup in manifest
});

// Monitor tab updates to potentially inject content script
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only act when the page has finished loading
  if (changeInfo.status === 'complete' && tab.url) {
    // Skip chrome:// and extension pages
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      return;
    }
    
    // Ensure content script is loaded (in case of dynamic pages)
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        // Check if SuperPrompt is already loaded
        if (!window.superPromptLoaded) {
          console.log('SuperPrompt content script may need reloading');
        }
      }
    }).catch(error => {
      // Ignore errors (likely due to restricted pages)
    });
  }
});

// Handle storage changes (for debugging)
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    console.log('Storage changed:', Object.keys(changes));
  }
});

// Cleanup old data on startup
chrome.runtime.onStartup.addListener(() => {
  cleanupOldData();
});

// Clean up old history items (older than 6 months)
async function cleanupOldData() {
  try {
    const result = await chrome.storage.local.get(['promptHistory']);
    const history = result.promptHistory || [];
    
    if (history.length === 0) return;
    
    const sixMonthsAgo = Date.now() - (6 * 30 * 24 * 60 * 60 * 1000); // 6 months in milliseconds
    const filteredHistory = history.filter(item => item.timestamp > sixMonthsAgo);
    
    if (filteredHistory.length !== history.length) {
      await chrome.storage.local.set({ promptHistory: filteredHistory });
      console.log(`Cleaned up ${history.length - filteredHistory.length} old history items`);
    }
    
  } catch (error) {
    console.error('Error cleaning up old data:', error);
  }
}

// Export functions for testing (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    savePromptToHistory,
    updateStats,
    cleanupOldData
  };
}