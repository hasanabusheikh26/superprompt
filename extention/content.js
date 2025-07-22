// content.js - SuperPrompt Floating Enhancement Interface (Final Version: S logo for floating icon, site icon in popup header)

class SuperPromptEnhancer {
  constructor() {
    this.selectedText = '';
    this.selectedRange = null;
    this.currentInput = null;
    this.floatingIcon = null;
    this.miniPopup = null;
    this.isInitialized = false;
    this.currentSite = '';
    this.siteIcon = '🌐';
    this.isProcessing = false;
    this.settings = { soundEffects: true, autoCopy: false };
    this.popupRecentlyOpened = false;
    this.sIconUrl = chrome.runtime.getURL("icon.png"); // Use your icon.png for the floating icon
    this.init();
  }

  init() {
    if (window !== window.top || this.isInitialized) return;
    this.isInitialized = true;
    this.detectCurrentSite();
    this.injectStyles();
    this.setupEventListeners();
    this.setupMessageListener();
    this.loadSettings();
    console.log('✅ SuperPrompt floating enhancer loaded for', this.currentSite);
  }

  detectCurrentSite() {
    try {
      this.currentSite = window.location.hostname;
      const siteIcons = {
        // --- Add all mappings here ---
        'chatgpt.com': '💬', 'chat.openai.com': '💬', 'claude.ai': '🤖',
        'bard.google.com': '🎭', 'character.ai': '🎪', 'poe.com': '🔮',
        'huggingface.co': '🤗', 'cohere.ai': '📊', 'anthropic.com': '🤖',
        'openai.com': '💬', 'perplexity.ai': '🔍', 'phind.com': '🔍',
        'github.com': '🐙', 'gitlab.com': '🦊', 'stackoverflow.com': '📚',
        'stackexchange.com': '📚', 'codepen.io': '🖊️', 'repl.it': '⚡',
        'codesandbox.io': '📦', 'jsfiddle.net': '🎯', 'glitch.com': '✨',
        'vercel.com': '▲', 'netlify.com': '🌐', 'heroku.com': '💜',
        'twitter.com': '🐦', 'x.com': '❌', 'linkedin.com': '💼',
        'facebook.com': '📘', 'instagram.com': '📷', 'reddit.com': '🔶',
        'discord.com': '💬', 'slack.com': '💼', 'telegram.org': '✈️',
        'whatsapp.com': '💬', 'messenger.com': '💬',
        'gmail.com': '📧', 'mail.google.com': '📧', 'outlook.com': '📧',
        'notion.so': '📝', 'airtable.com': '📊', 'trello.com': '📋',
        'asana.com': '☑️', 'monday.com': '📈', 'clickup.com': '🚀',
        'docs.google.com': '📄', 'sheets.google.com': '📊',
        'medium.com': '📝', 'substack.com': '📧', 'hashnode.com': '📝',
        'dev.to': '👩‍💻', 'wordpress.com': '📝',
        'figma.com': '🎨', 'canva.com': '🎨', 'sketch.com': '💎',
        'adobe.com': '🅰️', 'dribbble.com': '🏀', 'behance.net': '🎭',
        'google.com': '🔍', 'bing.com': '🔍', 'duckduckgo.com': '🦆',
        'youtube.com': '📺', 'netflix.com': '🎬', 'spotify.com': '🎵'
      };
      this.siteIcon = siteIcons[this.currentSite] || '🌐';
    } catch (error) {
      this.currentSite = 'unknown';
      this.siteIcon = '🌐';
    }
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.local.get(['superPromptSettings']);
      this.settings = { ...this.settings, ...(result.superPromptSettings || {}) };
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  injectStyles() {
    if (document.getElementById('superprompt-styles')) return;
    const styles = document.createElement('style');
    styles.id = 'superprompt-styles';
    styles.textContent = `
      .superprompt-floating-icon {
        position: absolute !important;
        width: 36px !important;
        height: 36px !important;
        background: none !important;
        border-radius: 50% !important;
        cursor: pointer !important;
        z-index: 2147483647 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15), 0 8px 32px rgba(34, 211, 238, 0.3) !important;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
        border: 2px solid rgba(255, 255, 255, 0.3) !important;
        backdrop-filter: blur(10px) !important;
        animation: superpromptIconFadeIn 0.3s ease-out !important;
        user-select: none !important;
      }
      .superprompt-floating-icon:hover {
        transform: scale(1.15) translateY(-2px) !important;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2), 0 12px 48px rgba(34, 211, 238, 0.5) !important;
      }
      .superprompt-mini-popup {
        position: absolute !important;
        background: rgba(255,255,255,0.97) !important;
        border-radius: 16px !important;
        box-shadow: 0 20px 60px rgba(0,0,0,0.15), 0 4px 20px rgba(0,0,0,0.1) !important;
        z-index: 2147483646 !important;
        width: 440px !important;
        max-width: 95vw !important;
        border: 1px solid rgba(0,0,0,0.08) !important;
        font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif !important;
        animation: superpromptPopupSlideIn 0.4s cubic-bezier(0.4,0,0.2,1) !important;
        overflow: hidden !important;
        color: #1f2937 !important;
        font-size: 14px !important;
        line-height: 1.5 !important;
      }
      /* Other styles as needed... */
    `;
    document.head.appendChild(styles);
  }

  setupEventListeners() {
    let selectionTimeout;
    const handleSelection = (e) => {
      clearTimeout(selectionTimeout);
      selectionTimeout = setTimeout(() => this.handleTextSelection(e), 120);
    };
    document.addEventListener('mouseup', handleSelection);
    document.addEventListener('keyup', handleSelection);

    document.addEventListener('pointerdown', (e) => {
      if (this.popupRecentlyOpened) {
        this.popupRecentlyOpened = false;
        return;
      }
      if (!e.target.closest('.superprompt-floating-icon') &&
          !e.target.closest('.superprompt-mini-popup')) {
        this.hideFloatingElements();
      }
    });

    window.addEventListener('resize', () => this.hideFloatingElements());
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.hideFloatingElements();
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        if (this.selectedText) this.showMiniPopup();
      }
    });
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.action) {
        case 'getSiteInfo':
          sendResponse({ site: this.currentSite, siteIcon: this.siteIcon });
          break;
        case 'enhanceSelected':
          if (this.selectedText) this.showMiniPopup();
          sendResponse({ success: true });
          break;
        case 'ping':
          sendResponse({ status: 'alive' });
          break;
        default:
          sendResponse({ error: 'Unknown action' });
      }
      return true;
    });
  }

  handleTextSelection(e) {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    if (selectedText && selectedText.length >= 5) {
      const activeElement = document.activeElement;
      if (activeElement && (activeElement.nodeName === 'TEXTAREA' ||
          (activeElement.nodeName === 'INPUT' && activeElement.type === 'text') ||
          activeElement.isContentEditable)) {
        this.selectedText = selectedText;
        this.selectedRange = selection.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
        this.currentInput = activeElement;
        this.showFloatingIcon();
        return;
      }
    }
    this.hideFloatingElements();
  }

  showFloatingIcon() {
    this.hideFloatingElements();
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    try {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;
      this.floatingIcon = document.createElement('div');
      this.floatingIcon.className = 'superprompt-floating-icon';
      this.floatingIcon.title = `Enhance with SuperPrompt`;
      // S logo as image
      const img = document.createElement('img');
      img.src = this.sIconUrl;
      img.alt = "SuperPrompt";
      img.style.width = "28px";
      img.style.height = "28px";
      img.style.display = "block";
      this.floatingIcon.appendChild(img);

      // Smart positioning
      const iconSize = 36;
      let left = rect.left + rect.width / 2 - iconSize / 2;
      let top = rect.top - iconSize - 8;
      left = Math.max(10, Math.min(left, window.innerWidth - iconSize - 10));
      if (top < 10) {
        top = rect.bottom + 8;
      }
      this.floatingIcon.style.left = `${left + window.scrollX}px`;
      this.floatingIcon.style.top = `${top + window.scrollY}px`;

      this.floatingIcon.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.popupRecentlyOpened = true;
        this.showMiniPopup();
      });

      this.floatingIcon.tabIndex = 0;
      this.floatingIcon.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.popupRecentlyOpened = true;
          this.showMiniPopup();
        }
      });

      document.body.appendChild(this.floatingIcon);
    } catch (error) {
      console.error('Error showing floating icon:', error);
    }
  }

  showMiniPopup() {
    if (this.isProcessing) return;
    this.hideMiniPopup();
    if (!this.selectedText) return;
    this.miniPopup = document.createElement('div');
    this.miniPopup.className = 'superprompt-mini-popup';
    if (this.isDarkMode()) {
      this.miniPopup.classList.add('dark');
    }
    this.positionMiniPopup();
    this.miniPopup.innerHTML = `
      <div class="superprompt-popup-header">
        <div class="superprompt-header-left">
          <div class="superprompt-logo"><img src="${this.sIconUrl}" alt="S" style="width:20px;height:20px;vertical-align:middle;border-radius:50%;" /></div>
          <div class="superprompt-brand">SuperPrompt</div>
        </div>
        <div class="superprompt-header-right">
          <div class="superprompt-site-icon" style="font-size:20px;">${this.siteIcon}</div>
          <button class="superprompt-header-btn" title="Close">✕</button>
        </div>
      </div>
      <div class="superprompt-popup-content">
        <div class="superprompt-section-title">Original Prompt</div>
        <div class="superprompt-original-prompt">${this.escapeHtml(this.selectedText)}</div>
        <div class="superprompt-loading" id="superpromptLoading">
          <span class="superprompt-loading-spinner"></span>Enhancing prompt...
        </div>
        <div id="superpromptEnhanced"></div>
      </div>
    `;
    this.miniPopup.querySelector('.superprompt-header-btn').onclick = () => this.hideFloatingElements();
    document.body.appendChild(this.miniPopup);
    setTimeout(() => { this.popupRecentlyOpened = false; }, 250);
    this.enhancePrompt();
  }

  positionMiniPopup() {
    if (!this.miniPopup) return;
    try {
      const popupWidth = 440;
      const popupHeight = 300;
      let left, top;
      if (this.currentInput?.getBoundingClientRect) {
        const inputRect = this.currentInput.getBoundingClientRect();
        left = inputRect.left;
        top = inputRect.bottom + 10;
      } else {
        left = (window.innerWidth - popupWidth) / 2;
        top = (window.innerHeight - popupHeight) / 2;
      }
      left = Math.max(20, Math.min(left, window.innerWidth - popupWidth - 20));
      top = Math.max(20, Math.min(top, window.innerHeight - popupHeight - 20));
      this.miniPopup.style.left = `${left + window.scrollX}px`;
      this.miniPopup.style.top = `${top + window.scrollY}px`;
    } catch (error) {
      this.miniPopup.style.left = '50%';
      this.miniPopup.style.top = '50%';
      this.miniPopup.style.transform = 'translate(-50%, -50%)';
      this.miniPopup.style.position = 'fixed';
    }
  }

  async enhancePrompt() {
    if (!this.miniPopup || !this.selectedText || this.isProcessing) return;
    this.isProcessing = true;
    try {
      // Replace this with your real API call
      const result = await new Promise((res) =>
        setTimeout(() => res({
          improved: this.selectedText + ' (improved by AI)',
          score: 95
        }), 1200)
      );
      this.isProcessing = false;
      this.miniPopup.querySelector('#superpromptLoading').style.display = 'none';
      this.miniPopup.querySelector('#superpromptEnhanced').innerHTML = `
        <div class="superprompt-score">Score: ${result.score}%</div>
        <div class="superprompt-enhanced-prompt">${this.escapeHtml(result.improved)}</div>
        <div class="superprompt-actions">
          <button class="superprompt-btn primary" id="replaceBtn">Replace Prompt</button>
          <button class="superprompt-btn" id="copyBtn">Copy</button>
        </div>
      `;
      this.miniPopup.querySelector('#replaceBtn').onclick = () => this.replacePrompt(result.improved);
      this.miniPopup.querySelector('#copyBtn').onclick = () => navigator.clipboard.writeText(result.improved);

      chrome.runtime.sendMessage({
        action: 'saveToHistory',
        data: {
          original: this.selectedText,
          enhanced: result.improved,
          site: this.currentSite,
          siteIcon: this.siteIcon,
          timestamp: Date.now(),
          date: new Date().toLocaleDateString()
        }
      });
    } catch (e) {
      this.miniPopup.querySelector('#superpromptLoading').textContent = 'Failed to enhance prompt. Please try again.';
      this.isProcessing = false;
    }
  }

  replacePrompt(newText) {
    if (this.currentInput && (this.currentInput.nodeName === 'TEXTAREA' || this.currentInput.isContentEditable)) {
      if (this.currentInput.isContentEditable) {
        document.execCommand('insertText', false, newText);
      } else {
        this.currentInput.value = newText;
      }
      this.hideFloatingElements();
    }
  }

  hideMiniPopup() {
    if (this.miniPopup) this.miniPopup.remove();
    this.miniPopup = null;
  }

  hideFloatingElements() {
    if (this.floatingIcon) this.floatingIcon.remove();
    if (this.miniPopup) this.miniPopup.remove();
    this.floatingIcon = null;
    this.miniPopup = null;
    this.selectedText = '';
    this.selectedRange = null;
    this.currentInput = null;
    this.isProcessing = false;
  }

  isDarkMode() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Only run once per page
if (!window.__superpromptEnhancerLoaded) {
  window.__superpromptEnhancerLoaded = true;
  new SuperPromptEnhancer();
}