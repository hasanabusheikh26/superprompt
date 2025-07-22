// popup.js - SuperPrompt Main Toolbar Popup

class SuperPromptPopup {
  constructor() {
    this.currentTab = 'history';
    this.history = [];
    this.settings = {
      darkMode: false,
      soundEffects: true,
      autoCopy: false
    };
    this.stats = {
      totalEnhancements: 0,
      sitesUsed: 0
    };
    this.init();
  }

  async init() {
    await this.loadData();
    await this.detectCurrentSite();
    this.setupEventListeners();
    this.updateDisplay();
    this.applyTheme();
  }

  async loadData() {
    try {
      const result = await chrome.storage.local.get(['promptHistory', 'superPromptSettings', 'superPromptStats']);
      
      this.history = result.promptHistory || [];
      this.settings = { ...this.settings, ...(result.superPromptSettings || {}) };
      this.stats = { ...this.stats, ...(result.superPromptStats || {}) };
      
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }

  async saveData() {
    try {
      await chrome.storage.local.set({
        promptHistory: this.history,
        superPromptSettings: this.settings,
        superPromptStats: this.stats
      });
    } catch (error) {
      console.error('Failed to save data:', error);
    }
  }

  async detectCurrentSite() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url) {
        const url = new URL(tab.url);
        const hostname = url.hostname;
        
        // Try to get site info from content script
        try {
          const response = await chrome.tabs.sendMessage(tab.id, { action: 'getSiteInfo' });
          if (response?.siteIcon) {
            document.getElementById('siteIcon').textContent = response.siteIcon;
            return;
          }
        } catch (e) {
          // Content script not loaded, use fallback
        }
        
        // Fallback site icon detection
        const siteIcons = {
          'chatgpt.com': '💬',
          'chat.openai.com': '💬',
          'claude.ai': '🤖',
          'bard.google.com': '🎭',
          'character.ai': '🎪',
          'poe.com': '🔮',
          'github.com': '🐙',
          'stackoverflow.com': '📚',
          'reddit.com': '🔶',
          'twitter.com': '🐦',
          'x.com': '❌',
          'linkedin.com': '💼',
          'discord.com': '💬',
          'slack.com': '💼',
          'notion.so': '📝',
          'docs.google.com': '📄',
          'medium.com': '📝',
          'substack.com': '📧',
          'gmail.com': '📧'
        };
        
        const icon = siteIcons[hostname] || '🌐';
        document.getElementById('siteIcon').textContent = icon;
      }
    } catch (error) {
      console.error('Failed to detect current site:', error);
      document.getElementById('siteIcon').textContent = '🌐';
    }
  }

  setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const tabName = e.target.dataset.tab;
        this.switchTab(tabName);
      });
    });

    // Header close button
    document.getElementById('closeBtn').addEventListener('click', () => {
      window.close();
    });

    // Settings toggles
    document.getElementById('darkModeToggle').addEventListener('click', () => {
      this.toggleSetting('darkMode');
    });

    document.getElementById('soundToggle').addEventListener('click', () => {
      this.toggleSetting('soundEffects');
    });

    document.getElementById('autoCopyToggle').addEventListener('click', () => {
      this.toggleSetting('autoCopy');
    });

    // External links
    document.getElementById('learnModelsLink').addEventListener('click', (e) => {
      e.preventDefault();
      this.openLink('https://platform.openai.com/docs/models');
    });

    document.getElementById('feedbackLink').addEventListener('click', (e) => {
      e.preventDefault();
      this.openLink('https://forms.gle/your-feedback-form');
    });

    document.getElementById('supportLink').addEventListener('click', (e) => {
      e.preventDefault();
      this.openLink('https://github.com/your-repo/issues');
    });

    document.getElementById('privacyLink').addEventListener('click', (e) => {
      e.preventDefault();
      this.openLink('https://your-website.com/privacy');
    });

    // Listen for messages from content script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.action) {
        case 'saveToHistory':
          this.addToHistory(request.data);
          sendResponse({ success: true });
          break;
          
        case 'openMainPopup':
          // Already open, just switch to settings
          this.switchTab('settings');
          sendResponse({ success: true });
          break;
          
        default:
          sendResponse({ error: 'Unknown action' });
      }
      
      return true;
    });
  }

  switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === tabName + 'Tab');
    });

    this.currentTab = tabName;

    // Update display for current tab
    if (tabName === 'history') {
      this.updateHistoryDisplay();
    } else if (tabName === 'home') {
      this.updateHomeDisplay();
    } else if (tabName === 'settings') {
      this.updateSettingsDisplay();
    }
  }

  updateDisplay() {
    this.updateHistoryDisplay();
    this.updateHomeDisplay();
    this.updateSettingsDisplay();
  }

  updateHistoryDisplay() {
    const historyEmpty = document.getElementById('historyEmpty');
    const historyList = document.getElementById('historyList');

    if (this.history.length === 0) {
      historyEmpty.classList.remove('hidden');
      historyList.innerHTML = '';
      return;
    }

    historyEmpty.classList.add('hidden');
    
    // Show latest 20 items
    const recentHistory = this.history.slice(0, 20);
    
    historyList.innerHTML = recentHistory.map(item => `
      <div class="history-item" data-id="${item.id}">
        <div class="history-header">
          <div class="history-site">
            <span class="history-site-icon">${item.siteIcon || '🌐'}</span>
            <span>Enhanced on ${item.site || 'unknown site'}</span>
          </div>
          <div class="history-date">${item.date}</div>
        </div>
        
        <div class="history-prompt">${this.escapeHtml(item.enhanced)}</div>
        
        <div class="history-actions">
          <button class="history-btn" onclick="superPromptPopup.copyHistoryItem('${item.id}')">
            📋 Copy
          </button>
          <button class="history-btn" onclick="superPromptPopup.viewHistoryItem('${item.id}')">
            👁️ View
          </button>
        </div>
      </div>
    `).join('');
  }

  updateHomeDisplay() {
    // Calculate stats
    const uniqueSites = new Set(this.history.map(item => item.site)).size;
    
    document.getElementById('totalEnhancements').textContent = this.history.length;
    document.getElementById('sitesUsed').textContent = uniqueSites;
  }

  updateSettingsDisplay() {
    // Update toggle states
    document.getElementById('darkModeToggle').classList.toggle('active', this.settings.darkMode);
    document.getElementById('soundToggle').classList.toggle('active', this.settings.soundEffects);
    document.getElementById('autoCopyToggle').classList.toggle('active', this.settings.autoCopy);
  }

  toggleSetting(settingName) {
    this.settings[settingName] = !this.settings[settingName];
    this.updateSettingsDisplay();
    this.saveData();
    
    // Apply changes immediately
    if (settingName === 'darkMode') {
      this.applyTheme();
    }
    
    // Play sound if enabled
    if (this.settings.soundEffects && settingName !== 'soundEffects') {
      this.playSound('click');
    }
  }

  applyTheme() {
    if (this.settings.darkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }

  addToHistory(data) {
    const historyItem = {
      id: data.timestamp || Date.now(),
      original: data.original,
      enhanced: data.enhanced,
      site: data.site,
      siteIcon: data.siteIcon,
      timestamp: data.timestamp || Date.now(),
      date: data.date || new Date().toLocaleDateString()
    };

    // Add to beginning of history
    this.history.unshift(historyItem);
    
    // Keep only last 100 items
    if (this.history.length > 100) {
      this.history = this.history.slice(0, 100);
    }

    // Update stats
    this.stats.totalEnhancements = this.history.length;
    this.stats.sitesUsed = new Set(this.history.map(item => item.site)).size;

    this.saveData();
    
    // Update display if we're on history tab
    if (this.currentTab === 'history') {
      this.updateHistoryDisplay();
    }
    
    // Update home stats
    this.updateHomeDisplay();
    
    // Play sound if enabled
    if (this.settings.soundEffects) {
      this.playSound('success');
    }
  }

  async copyHistoryItem(itemId) {
    const item = this.history.find(h => h.id == itemId);
    if (!item) return;

    try {
      await navigator.clipboard.writeText(item.enhanced);
      this.showNotification('📋 Copied to clipboard!');
      
      if (this.settings.soundEffects) {
        this.playSound('copy');
      }
      
    } catch (error) {
      console.error('Copy failed:', error);
      this.showNotification('❌ Failed to copy', 'error');
    }
  }

  viewHistoryItem(itemId) {
    const item = this.history.find(h => h.id == itemId);
    if (!item) return;

    // Create a modal-like view (simple alert for now, can be enhanced)
    const modal = `
Original: ${item.original}

Enhanced: ${item.enhanced}

Site: ${item.site}
Date: ${item.date}
    `;
    
    alert(modal);
  }

  async openLink(url) {
    try {
      await chrome.tabs.create({ url });
    } catch (error) {
      console.error('Failed to open link:', error);
    }
  }

  playSound(type) {
    // Simple audio feedback using Web Audio API
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Different frequencies for different sounds
      const frequencies = {
        click: 800,
        success: 1000,
        copy: 600,
        error: 400
      };
      
      oscillator.frequency.setValueAtTime(frequencies[type] || 800, audioContext.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
      
    } catch (error) {
      // Audio not supported or blocked
      console.log('Audio feedback not available');
    }
  }

  showNotification(message, type = 'success') {
    // Simple notification system
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: ${type === 'error' ? '#ef4444' : '#22d3ee'};
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Auto-remove after 2 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => notification.remove(), 300);
      }
    }, 2000);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Public methods for HTML onclick handlers
  static instance = null;
}

// Initialize and make globally available
let superPromptPopup;
document.addEventListener('DOMContentLoaded', () => {
  superPromptPopup = new SuperPromptPopup();
  SuperPromptPopup.instance = superPromptPopup;
  
  // Make methods available globally for onclick handlers
  window.superPromptPopup = superPromptPopup;
});

// Handle window unload
window.addEventListener('beforeunload', () => {
  if (superPromptPopup) {
    superPromptPopup.saveData();
  }
});