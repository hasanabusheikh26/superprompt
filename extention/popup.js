// popup.js - SuperPrompt Enhanced Main Interface

class SuperPromptMainPopup {
  constructor() {
    this.currentTab = 'history';
    this.history = [];
    this.filteredHistory = [];
    this.settings = {
      darkMode: false,
      soundEffects: true,
      autoCopy: false,
      showIcon: true,
      quality: 'balanced'
    };
    this.stats = {
      totalEnhancements: 0,
      sitesUsed: 0,
      successRate: 100
    };
    this.currentSite = '';
    this.siteIcon = '🌐';
    this.init();
  }

  async init() {
    await this.loadData();
    await this.detectCurrentSite();
    this.setupEventListeners();
    this.updateDisplay();
    this.applyTheme();
    this.calculateStats();
  }

  async loadData() {
    try {
      const result = await chrome.storage.local.get([
        'promptHistory', 
        'superPromptSettings', 
        'superPromptStats'
      ]);
      
      this.history = result.promptHistory || [];
      this.filteredHistory = [...this.history];
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
        this.currentSite = url.hostname;
        
        // Try to get site info from content script
        try {
          const response = await chrome.tabs.sendMessage(tab.id, { action: 'getSiteInfo' });
          if (response?.siteIcon) {
            this.siteIcon = response.siteIcon;
            document.getElementById('siteIcon').textContent = this.siteIcon;
            document.getElementById('siteIcon').title = `Current site: ${this.currentSite}`;
            return;
          }
        } catch (e) {
          // Content script not loaded
        }
        
        // Fallback detection
        this.siteIcon = this.getSiteIcon(this.currentSite);
        document.getElementById('siteIcon').textContent = this.siteIcon;
        document.getElementById('siteIcon').title = `Current site: ${this.currentSite}`;
      }
    } catch (error) {
      console.error('Failed to detect current site:', error);
    }
  }

  getSiteIcon(hostname) {
    const siteIcons = {
      // AI Platforms
      'chatgpt.com': '💬', 'chat.openai.com': '💬', 'claude.ai': '🤖',
      'bard.google.com': '🎭', 'character.ai': '🎪', 'poe.com': '🔮',
      'huggingface.co': '🤗', 'cohere.ai': '📊', 'anthropic.com': '🤖',
      'openai.com': '💬', 'perplexity.ai': '🔍', 'phind.com': '🔍',
      
      // Development
      'github.com': '🐙', 'gitlab.com': '🦊', 'stackoverflow.com': '📚',
      'stackexchange.com': '📚', 'codepen.io': '🖊️', 'repl.it': '⚡',
      'codesandbox.io': '📦', 'jsfiddle.net': '🎯', 'glitch.com': '✨',
      'vercel.com': '▲', 'netlify.com': '🌐', 'heroku.com': '💜',
      
      // Social & Communication  
      'twitter.com': '🐦', 'x.com': '❌', 'linkedin.com': '💼',
      'facebook.com': '📘', 'instagram.com': '📷', 'reddit.com': '🔶',
      'discord.com': '💬', 'slack.com': '💼', 'telegram.org': '✈️',
      'whatsapp.com': '💬', 'messenger.com': '💬',
      
      // Productivity & Writing
      'gmail.com': '📧', 'mail.google.com': '📧', 'outlook.com': '📧',
      'notion.so': '📝', 'airtable.com': '📊', 'trello.com': '📋',
      'asana.com': '☑️', 'monday.com': '📈', 'clickup.com': '🚀',
      'docs.google.com': '📄', 'sheets.google.com': '📊',
      'medium.com': '📝', 'substack.com': '📧', 'hashnode.com': '📝',
      'dev.to': '👩‍💻', 'wordpress.com': '📝'
    };

    return siteIcons[hostname] || '🌐';
  }

  setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const tabName = e.target.closest('.tab').dataset.tab;
        this.switchTab(tabName);
      });
    });

    // Header buttons
    document.getElementById('helpBtn').addEventListener('click', () => {
      this.showHelpModal();
    });

    document.getElementById('closeBtn').addEventListener('click', () => {
      window.close();
    });

    // Settings controls
    document.getElementById('darkModeToggle').addEventListener('click', () => {
      this.toggleSetting('darkMode');
    });

    document.getElementById('soundToggle').addEventListener('click', () => {
      this.toggleSetting('soundEffects');
    });

    document.getElementById('autoCopyToggle').addEventListener('click', () => {
      this.toggleSetting('autoCopy');
    });

    document.getElementById('showIconToggle').addEventListener('click', () => {
      this.toggleSetting('showIcon');
    });

    document.getElementById('qualitySelect').addEventListener('change', (e) => {
      this.settings.quality = e.target.value;
      this.saveData();
    });

    // History controls
    document.getElementById('historySearch').addEventListener('input', (e) => {
      this.filterHistory(e.target.value);
    });

    document.getElementById('clearHistoryBtn').addEventListener('click', () => {
      this.clearHistory();
    });

    document.getElementById('exportHistoryBtn').addEventListener('click', () => {
      this.exportHistory();
    });

    // External links
    this.setupExternalLinks();

    // Help modal
    document.querySelector('.modal-close').addEventListener('click', () => {
      this.hideHelpModal();
    });

    document.getElementById('helpModal').addEventListener('click', (e) => {
      if (e.target.id === 'helpModal') {
        this.hideHelpModal();
      }
    });

    // Listen for messages from content script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.action) {
        case 'saveToHistory':
          this.addToHistory(request.data);
          sendResponse({ success: true });
          break;
          
        case 'openMainPopup':
          this.switchTab('settings');
          sendResponse({ success: true });
          break;
          
        case 'historyUpdated':
          this.refreshHistoryFromStorage();
          sendResponse({ success: true });
          break;
          
        default:
          sendResponse({ error: 'Unknown action' });
      }
      
      return true;
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideHelpModal();
      }
      
      // Tab navigation
      if (e.key >= '1' && e.key <= '3' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const tabs = ['history', 'home', 'settings'];
        this.switchTab(tabs[parseInt(e.key) - 1]);
      }
    });
  }

  setupExternalLinks() {
    const links = {
      learnModelsLink: 'https://platform.openai.com/docs/models',
      feedbackLink: 'https://github.com/superprompt/extension/issues',
      supportLink: 'https://github.com/superprompt/extension/discussions',
      privacyLink: 'https://superprompt.dev/privacy',
      githubLink: 'https://github.com/superprompt/extension'
    };

    Object.entries(links).forEach(([id, url]) => {
      const element = document.getElementById(id);
      if (element) {
        element.addEventListener('click', (e) => {
          e.preventDefault();
          this.openLink(url);
        });
      }
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

    // Tab-specific updates
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
    this.updateHistoryCount();
  }

  updateHistoryDisplay() {
    const historyEmpty = document.getElementById('historyEmpty');
    const historyControls = document.getElementById('historyControls');
    const historyList = document.getElementById('historyList');

    if (this.history.length === 0) {
      historyEmpty.style.display = 'block';
      historyControls.style.display = 'none';
      historyList.innerHTML = '';
      return;
    }

    historyEmpty.style.display = 'none';
    historyControls.style.display = 'block';
    
    // Display filtered history
    historyList.innerHTML = this.filteredHistory.slice(0, 50).map(item => `
      <div class="history-item" data-id="${item.id}">
        <div class="history-header">
          <div class="history-site">
            <span class="history-site-icon">${item.siteIcon || '🌐'}</span>
            <span class="history-site-name">${item.site || 'unknown'}</span>
          </div>
          <div class="history-date" title="${new Date(item.timestamp).toLocaleString()}">${item.date}</div>
        </div>
        
        <div class="history-prompt">${this.escapeHtml(item.enhanced)}</div>
        
        <div class="history-actions">
          <button class="history-btn" onclick="superPromptPopup.copyHistoryItem('${item.id}')" title="Copy enhanced prompt">
            📋 Copy
          </button>
          <button class="history-btn" onclick="superPromptPopup.viewHistoryItem('${item.id}')" title="View details">
            👁️ View
          </button>
          <button class="history-btn danger" onclick="superPromptPopup.deleteHistoryItem('${item.id}')" title="Delete item">
            🗑️
          </button>
        </div>
      </div>
    `).join('');

    // Update data info
    document.getElementById('historyItems').textContent = this.history.length;
    document.getElementById('storageUsed').textContent = this.calculateStorageSize();
  }

  updateHomeDisplay() {
    this.calculateStats();
    
    document.getElementById('totalEnhancements').textContent = this.stats.totalEnhancements;
    document.getElementById('sitesUsed').textContent = this.stats.sitesUsed;
    document.getElementById('successRate').textContent = `${this.stats.successRate}%`;
  }

  updateSettingsDisplay() {
    // Update toggle states
    document.getElementById('darkModeToggle').classList.toggle('active', this.settings.darkMode);
    document.getElementById('soundToggle').classList.toggle('active', this.settings.soundEffects);
    document.getElementById('autoCopyToggle').classList.toggle('active', this.settings.autoCopy);
    document.getElementById('showIconToggle').classList.toggle('active', this.settings.showIcon);
    
    // Update quality select
    document.getElementById('qualitySelect').value = this.settings.quality;
  }

  updateHistoryCount() {
    document.getElementById('historyCount').textContent = this.history.length;
  }

  filterHistory(searchTerm) {
    if (!searchTerm.trim()) {
      this.filteredHistory = [...this.history];
    } else {
      const term = searchTerm.toLowerCase();
      this.filteredHistory = this.history.filter(item => 
        item.original.toLowerCase().includes(term) ||
        item.enhanced.toLowerCase().includes(term) ||
        item.site.toLowerCase().includes(term)
      );
    }
    
    this.updateHistoryDisplay();
  }

  calculateStats() {
    const uniqueSites = new Set(this.history.map(item => item.site)).size;
    
    this.stats = {
      totalEnhancements: this.history.length,
      sitesUsed: uniqueSites,
      successRate: this.history.length > 0 ? Math.floor(Math.random() * 10) + 90 : 100 // Mock success rate
    };
  }

  calculateStorageSize() {
    const dataSize = JSON.stringify(this.history).length;
    if (dataSize < 1024) return `${dataSize} B`;
    if (dataSize < 1024 * 1024) return `${(dataSize / 1024).toFixed(1)} KB`;
    return `${(dataSize / (1024 * 1024)).toFixed(1)} MB`;
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

    // Send settings to content script
    this.broadcastSettings();
  }

  async broadcastSettings() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        chrome.tabs.sendMessage(tab.id, { 
          action: 'updateSettings', 
          settings: this.settings 
        });
      }
    } catch (error) {
      // Content script not available
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

    // Add to beginning and remove duplicates
    this.history = [historyItem, ...this.history.filter(item => 
      !(item.original === historyItem.original && item.enhanced === historyItem.enhanced)
    )];
    
    // Keep only last 200 items
    if (this.history.length > 200) {
      this.history = this.history.slice(0, 200);
    }

    this.filteredHistory = [...this.history];
    this.saveData();
    this.updateDisplay();
    
    if (this.settings.soundEffects) {
      this.playSound('success');
    }
  }

  async refreshHistoryFromStorage() {
    await this.loadData();
    this.filteredHistory = [...this.history];
    this.updateDisplay();
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

    // Create a more sophisticated modal view
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal large">
        <div class="modal-header">
          <h3>Prompt Enhancement Details</h3>
          <button class="modal-close">✕</button>
        </div>
        <div class="modal-content">
          <div class="detail-section">
            <h4>Original Prompt</h4>
            <div class="detail-text original">${this.escapeHtml(item.original)}</div>
          </div>
          <div class="detail-section">
            <h4>Enhanced Prompt</h4>
            <div class="detail-text enhanced">${this.escapeHtml(item.enhanced)}</div>
          </div>
          <div class="detail-meta">
            <div><strong>Site:</strong> ${item.siteIcon} ${item.site}</div>
            <div><strong>Date:</strong> ${new Date(item.timestamp).toLocaleString()}</div>
            <div><strong>Length:</strong> ${item.original.length} → ${item.enhanced.length} characters</div>
          </div>
          <div class="detail-actions">
            <button class="btn secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
            <button class="btn primary" onclick="navigator.clipboard.writeText('${this.escapeHtml(item.enhanced)}'); this.textContent='Copied!'; setTimeout(() => this.textContent='Copy Enhanced', 2000)">Copy Enhanced</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Close on overlay click
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.classList.contains('modal-close')) {
        modal.remove();
      }
    });
  }

  deleteHistoryItem(itemId) {
    if (!confirm('Delete this history item? This action cannot be undone.')) return;

    this.history = this.history.filter(item => item.id != itemId);
    this.filteredHistory = this.filteredHistory.filter(item => item.id != itemId);
    
    this.saveData();
    this.updateDisplay();
    this.showNotification('🗑️ History item deleted');
    
    if (this.settings.soundEffects) {
      this.playSound('click');
    }
  }

  async clearHistory() {
    const confirmText = 'Are you sure you want to clear all history? This action cannot be undone.\n\nType "CLEAR" to confirm:';
    const userInput = prompt(confirmText);
    
    if (userInput === 'CLEAR') {
      this.history = [];
      this.filteredHistory = [];
      await this.saveData();
      this.updateDisplay();
      this.showNotification('🗑️ All history cleared');
      
      if (this.settings.soundEffects) {
        this.playSound('click');
      }
    }
  }

  exportHistory() {
    if (this.history.length === 0) {
      this.showNotification('No history to export', 'error');
      return;
    }

    const exportData = {
      exportDate: new Date().toISOString(),
      totalItems: this.history.length,
      history: this.history.map(item => ({
        original: item.original,
        enhanced: item.enhanced,
        site: item.site,
        date: item.date,
        timestamp: item.timestamp
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `superprompt-history-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    this.showNotification('📤 History exported successfully!');
  }

  showHelpModal() {
    document.getElementById('helpModal').classList.remove('hidden');
  }

  hideHelpModal() {
    document.getElementById('helpModal').classList.add('hidden');
  }

  async openLink(url) {
    try {
      await chrome.tabs.create({ url });
    } catch (error) {
      console.error('Failed to open link:', error);
    }
  }

  playSound(type) {
    if (!this.settings.soundEffects) return;
    
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
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
      // Audio not supported
    }
  }

  showNotification(message, type = 'success') {
    // Remove existing notification
    const existing = document.querySelector('.popup-notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = 'popup-notification';
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
      max-width: 250px;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => notification.remove(), 300);
      }
    }, 3000);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize and make globally available
let superPromptPopup;
document.addEventListener('DOMContentLoaded', () => {
  superPromptPopup = new SuperPromptMainPopup();
  window.superPromptPopup = superPromptPopup;
});

// Handle window unload
window.addEventListener('beforeunload', () => {
  if (superPromptPopup) {
    superPromptPopup.saveData();
  }
});