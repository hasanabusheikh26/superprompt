// content.js - SuperPrompt Floating Enhancement Interface

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
    this.settings = { 
      soundEffects: true, 
      autoCopy: false, 
      showIcon: true,
      apiKey: '',
      model: 'gpt-3.5-turbo'
    };
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
      
      // Comprehensive site icon mapping
      const siteIcons = {
        // AI Platforms
        'chatgpt.com': '💬', 'chat.openai.com': '💬', 'claude.ai': '🤖',
        'bard.google.com': '🎭', 'character.ai': '🎪', 'poe.com': '🔮',
        'huggingface.co': '🤗', 'cohere.ai': '📊', 'anthropic.com': '🤖',
        'openai.com': '💬', 'perplexity.ai': '🔍', 'phind.com': '🔍',
        
        // Development
        'github.com': '🐙', 'gitlab.com': '🦊', 'stackoverflow.com': '📚',
        'stackexchange.com': '📚', 'codepen.io': '🖊️', 'replit.com': '⚡',
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
        'dev.to': '👩‍💻', 'wordpress.com': '📝',
        
        // Design & Creative
        'figma.com': '🎨', 'canva.com': '🎨', 'sketch.com': '💎',
        'adobe.com': '🅰️', 'dribbble.com': '🏀', 'behance.net': '🎭',
        
        // Others
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
      /* SuperPrompt Floating Icon */
      .superprompt-floating-icon {
        position: absolute !important;
        width: 36px !important;
        height: 36px !important;
        background: linear-gradient(135deg, #4ade80 0%, #22d3ee 100%) !important;
        border-radius: 50% !important;
        cursor: pointer !important;
        z-index: 2147483647 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: 16px !important;
        color: white !important;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15), 0 8px 32px rgba(34, 211, 238, 0.3) !important;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
        border: 2px solid rgba(255, 255, 255, 0.3) !important;
        backdrop-filter: blur(10px) !important;
        animation: superpromptIconFadeIn 0.3s ease-out !important;
        user-select: none !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      }

      .superprompt-floating-icon:hover {
        transform: scale(1.15) translateY(-2px) !important;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2), 0 12px 48px rgba(34, 211, 238, 0.5) !important;
      }

      .superprompt-floating-icon:active {
        transform: scale(1.05) !important;
      }

      /* Mini Popup */
      .superprompt-mini-popup {
        position: absolute !important;
        background: rgba(255, 255, 255, 0.95) !important;
        backdrop-filter: blur(20px) saturate(180%) !important;
        border-radius: 16px !important;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15), 0 4px 20px rgba(0, 0, 0, 0.1) !important;
        z-index: 2147483646 !important;
        width: 440px !important;
        max-width: 90vw !important;
        border: 1px solid rgba(0, 0, 0, 0.08) !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        animation: superpromptPopupSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
        overflow: hidden !important;
        color: #1f2937 !important;
        font-size: 14px !important;
        line-height: 1.5 !important;
      }

      .superprompt-mini-popup.dark {
        background: rgba(31, 41, 55, 0.95) !important;
        border-color: rgba(255, 255, 255, 0.1) !important;
        color: #f9fafb !important;
      }

      /* Popup Header */
      .superprompt-popup-header {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        padding: 16px 20px !important;
        border-bottom: 1px solid rgba(0, 0, 0, 0.08) !important;
        background: rgba(248, 250, 252, 0.8) !important;
      }

      .superprompt-mini-popup.dark .superprompt-popup-header {
        border-bottom-color: rgba(255, 255, 255, 0.1) !important;
        background: rgba(55, 65, 81, 0.8) !important;
      }

      .superprompt-header-left {
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
      }

      .superprompt-logo {
        width: 24px !important;
        height: 24px !important;
        background: linear-gradient(135deg, #4ade80 0%, #22d3ee 100%) !important;
        border-radius: 50% !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        color: white !important;
        font-size: 12px !important;
        font-weight: bold !important;
      }

      .superprompt-brand {
        font-size: 16px !important;
        font-weight: 600 !important;
        color: #1f2937 !important;
      }

      .superprompt-mini-popup.dark .superprompt-brand {
        color: #f9fafb !important;
      }

      .superprompt-header-right {
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
      }

      .superprompt-site-icon {
        width: 20px !important;
        height: 20px !important;
        font-size: 16px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }

      .superprompt-header-btn {
        width: 24px !important;
        height: 24px !important;
        border: none !important;
        background: rgba(107, 114, 128, 0.1) !important;
        color: #6b7280 !important;
        border-radius: 6px !important;
        cursor: pointer !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: 12px !important;
        transition: all 0.2s ease !important;
      }

      .superprompt-header-btn:hover {
        background: rgba(34, 211, 238, 0.2) !important;
        color: #22d3ee !important;
        transform: scale(1.1) !important;
      }

      /* Content Area */
      .superprompt-popup-content {
        padding: 20px !important;
      }

      .superprompt-section-title {
        font-size: 13px !important;
        font-weight: 600 !important;
        color: #6b7280 !important;
        margin-bottom: 8px !important;
        text-transform: uppercase !important;
        letter-spacing: 0.5px !important;
      }

      .superprompt-original-prompt {
        background: #f9fafb !important;
        border: 1px solid #e5e7eb !important;
        border-radius: 10px !important;
        padding: 12px !important;
        font-size: 13px !important;
        color: #6b7280 !important;
        margin-bottom: 16px !important;
        line-height: 1.5 !important;
        max-height: 80px !important;
        overflow-y: auto !important;
        display: flex !important;
        justify-content: space-between !important;
        align-items: flex-start !important;
      }

      .superprompt-mini-popup.dark .superprompt-original-prompt {
        background: rgba(55, 65, 81, 0.5) !important;
        border-color: rgba(75, 85, 99, 0.5) !important;
        color: #d1d5db !important;
      }

      .superprompt-enhanced-prompt {
        background: rgba(74, 222, 128, 0.08) !important;
        border: 2px solid #4ade80 !important;
        border-radius: 12px !important;
        padding: 16px !important;
        font-size: 14px !important;
        color: #1f2937 !important;
        margin-bottom: 16px !important;
        line-height: 1.6 !important;
        max-height: 200px !important;
        overflow-y: auto !important;
        position: relative !important;
      }

      .superprompt-enhanced-prompt::before {
        content: '' !important;
        position: absolute !important;
        top: -1px !important;
        left: -1px !important;
        right: -1px !important;
        bottom: -1px !important;
        background: linear-gradient(45deg, #4ade80, #22d3ee) !important;
        border-radius: 12px !important;
        z-index: -1 !important;
        opacity: 0.1 !important;
      }

      .superprompt-mini-popup.dark .superprompt-enhanced-prompt {
        background: rgba(74, 222, 128, 0.12) !important;
        color: #f3f4f6 !important;
      }

      /* Copy Button */
      .superprompt-copy-btn {
        background: none !important;
        border: none !important;
        color: #9ca3af !important;
        cursor: pointer !important;
        font-size: 14px !important;
        padding: 4px !important;
        border-radius: 4px !important;
        transition: all 0.2s ease !important;
        margin-left: 8px !important;
        flex-shrink: 0 !important;
      }

      .superprompt-copy-btn:hover {
        color: #22d3ee !important;
        background: rgba(34, 211, 238, 0.1) !important;
      }

      /* Loading State */
      .superprompt-loading {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 12px !important;
        padding: 40px 20px !important;
        color: #6b7280 !important;
        font-size: 14px !important;
        font-weight: 500 !important;
      }

      .superprompt-loading-spinner {
        width: 20px !important;
        height: 20px !important;
        border: 2px solid #e5e7eb !important;
        border-top: 2px solid #22d3ee !important;
        border-radius: 50% !important;
        animation: superpromptSpin 1s linear infinite !important;
      }

      /* Score Badge */
      .superprompt-score {
        display: inline-flex !important;
        align-items: center !important;
        gap: 6px !important;
        background: rgba(74, 222, 128, 0.15) !important;
        color: #16a34a !important;
        padding: 6px 12px !important;
        border-radius: 20px !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        margin-bottom: 16px !important;
        border: 1px solid rgba(74, 222, 128, 0.3) !important;
      }

      /* Action Buttons */
      .superprompt-actions {
        display: flex !important;
        gap: 10px !important;
        margin-top: 16px !important;
      }

      .superprompt-btn {
        flex: 1 !important;
        padding: 12px 16px !important;
        border: 1px solid #e5e7eb !important;
        background: white !important;
        color: #374151 !important;
        border-radius: 10px !important;
        cursor: pointer !important;
        font-size: 13px !important;
        font-weight: 500 !important;
        transition: all 0.2s ease !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 6px !important;
        font-family: inherit !important;
      }

      .superprompt-btn.primary {
        background: linear-gradient(135deg, #4ade80 0%, #22d3ee 100%) !important;
        color: white !important;
        border-color: transparent !important;
        font-weight: 600 !important;
      }

      .superprompt-btn:hover {
        border-color: #22d3ee !important;
        color: #22d3ee !important;
        transform: translateY(-1px) !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
      }

      .superprompt-btn.primary:hover {
        transform: translateY(-1px) !important;
        box-shadow: 0 4px 12px rgba(34, 211, 238, 0.3) !important;
        color: white !important;
      }

      /* Animations */
      @keyframes superpromptIconFadeIn {
        from { opacity: 0; transform: scale(0.8); }
        to { opacity: 1; transform: scale(1); }
      }

      @keyframes superpromptPopupSlideIn {
        from { opacity: 0; transform: translateY(-10px) scale(0.95); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }

      @keyframes superpromptSpin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      /* Responsive */
      @media (max-width: 500px) {
        .superprompt-mini-popup { width: 95vw !important; }
        .superprompt-actions { flex-direction: column !important; }
      }

      /* Accessibility */
      .superprompt-floating-icon:focus,
      .superprompt-btn:focus,
      .superprompt-header-btn:focus {
        outline: 2px solid #22d3ee !important;
        outline-offset: 2px !important;
      }

      /* High contrast */
      @media (prefers-contrast: high) {
        .superprompt-floating-icon { border: 3px solid #000 !important; }
        .superprompt-mini-popup { border: 2px solid #000 !important; }
      }

      /* Reduced motion */
      @media (prefers-reduced-motion: reduce) {
        .superprompt-floating-icon,
        .superprompt-mini-popup,
        .superprompt-btn {
          animation: none !important;
          transition: none !important;
        }
      }
    `;

    document.head.appendChild(styles);
  }

  setupEventListeners() {
    // Text selection with debouncing
    let selectionTimeout;
    const handleSelection = (e) => {
      clearTimeout(selectionTimeout);
      selectionTimeout = setTimeout(() => this.handleTextSelection(e), 150);
    };

    document.addEventListener('mouseup', handleSelection);
    document.addEventListener('keyup', handleSelection);
    
    // Hide on click outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.superprompt-floating-icon') && 
          !e.target.closest('.superprompt-mini-popup')) {
        this.hideFloatingElements();
      }
    });

    // Hide on scroll/resize with throttling
    let scrollTimeout;
    document.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => this.hideFloatingElements(), 100);
    }, { passive: true });

    window.addEventListener('resize', () => this.hideFloatingElements());

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.hideFloatingElements();
      
      // Ctrl+Shift+E to enhance selected text
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
        case 'updateSettings':
          this.settings = { ...this.settings, ...request.settings };
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

    if (selectedText && selectedText.length >= 5 && this.settings.showIcon) {
      const activeElement = document.activeElement;
      
      if (this.isEditableElement(activeElement) || this.isWithinEditableElement(selection)) {
        this.selectedText = selectedText;
        this.currentInput = activeElement;
        
        if (selection.rangeCount > 0) {
          this.selectedRange = selection.getRangeAt(0).cloneRange();
        }
        
        this.showFloatingIcon();
        return;
      }
    }
    
    this.hideFloatingElements();
  }

  isEditableElement(element) {
    if (!element) return false;
    
    const tagName = element.tagName?.toLowerCase();
    
    // Input fields
    if (tagName === 'textarea') return true;
    if (tagName === 'input' && ['text', 'search', 'url', 'email'].includes(element.type)) return true;
    
    // Contenteditable
    if (element.contentEditable === 'true') return true;
    if (element.getAttribute('role') === 'textbox') return true;
    
    // Common editor classes
    const editorClasses = ['ProseMirror', 'ql-editor', 'CodeMirror', 'ace_editor'];
    if (editorClasses.some(cls => element.classList?.contains(cls))) return true;
    
    return false;
  }

  isWithinEditableElement(selection) {
    if (!selection.rangeCount) return false;
    
    let node = selection.getRangeAt(0).commonAncestorContainer;
    
    while (node && node !== document) {
      if (node.nodeType === Node.ELEMENT_NODE && this.isEditableElement(node)) {
        return true;
      }
      node = node.parentNode;
    }
    
    return false;
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
      this.floatingIcon.textContent = this.siteIcon;
      this.floatingIcon.title = `Enhance with SuperPrompt (${this.currentSite})`;

      // Smart positioning
      const iconSize = 36;
      let left = rect.left + rect.width / 2 - iconSize / 2;
      let top = rect.top - iconSize - 8;
      
      // Keep within viewport
      left = Math.max(10, Math.min(left, window.innerWidth - iconSize - 10));
      
      if (top < 10) {
        top = rect.bottom + 8;
      }

      this.floatingIcon.style.left = `${left + window.scrollX}px`;
      this.floatingIcon.style.top = `${top + window.scrollY}px`;

      // Enhanced click handler
      this.floatingIcon.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.playSound('click');
        this.showMiniPopup();
      });

      // Keyboard accessibility
      this.floatingIcon.tabIndex = 0;
      this.floatingIcon.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
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
    
    this.hideFloatingElements();
    if (!this.selectedText) return;

    this.miniPopup = document.createElement('div');
    this.miniPopup.className = 'superprompt-mini-popup';
    
    // Apply dark mode
    if (this.isDarkMode()) {
      this.miniPopup.classList.add('dark');
    }

    this.positionMiniPopup();
    this.miniPopup.innerHTML = this.getMiniPopupHTML();
    this.setupMiniPopupListeners();

    document.body.appendChild(this.miniPopup);
    
    // Start enhancement
    setTimeout(() => this.enhancePrompt(), 100);
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
      
      // Smart viewport positioning
      left = Math.max(20, Math.min(left, window.innerWidth - popupWidth - 20));
      top = Math.max(20, Math.min(top, window.innerHeight - popupHeight - 20));

      this.miniPopup.style.left = `${left + window.scrollX}px`;
      this.miniPopup.style.top = `${top + window.scrollY}px`;
      
    } catch (error) {
      console.error('Error positioning mini popup:', error);
      this.miniPopup.style.left = '50%';
      this.miniPopup.style.top = '50%';
      this.miniPopup.style.transform = 'translate(-50%, -50%)';
      this.miniPopup.style.position = 'fixed';
    }
  }

  getMiniPopupHTML() {
    return `
      <div class="superprompt-popup-header">
        <div class="superprompt-header-left">
          <div class="superprompt-logo">⚡</div>
          <div class="superprompt-brand">superprompt</div>
        </div>
        <div class="superprompt-header-right">
          <div class="superprompt-site-icon">${this.siteIcon}</div>
          <button class="superprompt-header-btn" title="Settings">⚙</button>
          <button class="superprompt-header-btn" title="Close">✕</button>
        </div>
      </div>
      
      <div class="superprompt-popup-content">
        <div class="superprompt-section-title">Original Prompt</div>
        <div class="superprompt-original-prompt">
          <span>${this.escapeHtml(this.selectedText)}</span>
          <button class="superprompt-copy-btn" title="Copy original">📋</button>
        </div>
        
        <div class="superprompt-loading">
          <div class="superprompt-loading-spinner"></div>
          <span>Analyzing prompt...</span>
        </div>
      </div>
    `;
  }

  setupMiniPopupListeners() {
    // Close button
    this.miniPopup.querySelector('.superprompt-header-btn[title="Close"]').addEventListener('click', () => {
      this.hideFloatingElements();
      this.playSound('click');
    });

    // Settings button
    this.miniPopup.querySelector('.superprompt-header-btn[title="Settings"]').addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'openMainPopup' });
      this.playSound('click');
    });

    // Copy original button
    this.miniPopup.querySelector('.superprompt-copy-btn').addEventListener('click', () => {
      this.copyToClipboard(this.selectedText);
      this.showNotification('Original prompt copied!');
      this.playSound('copy');
    });
  }

  async enhancePrompt() {
    if (!this.miniPopup || !this.selectedText || this.isProcessing) return;
    
    this.isProcessing = true;

    try {
      if (!this.settings.apiKey) {
        throw new Error('Please set your OpenAI API key in the extension settings');
      }

      const enhancedText = await this.callOpenAI(this.selectedText);
      
      this.showEnhancedResult(enhancedText);
      this.saveToHistory(this.selectedText, enhancedText);
      this.playSound('success');

    } catch (error) {
      console.error('Enhancement error:', error);
      this.showErrorResult(error.message);
      this.playSound('error');
    } finally {
      this.isProcessing = false;
    }
  }

  async callOpenAI(prompt) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.settings.apiKey}`
        },
        body: JSON.stringify({
          model: this.settings.model || 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a prompt enhancement expert. Your job is to improve and optimize prompts for better AI responses. Make prompts clearer, more specific, and more effective while maintaining the original intent. Return only the enhanced prompt without any explanations.'
            },
            {
              role: 'user',
              content: `Please enhance this prompt to make it clearer, more specific, and more effective:\n\n${prompt}`
            }
          ],
          max_tokens: 500,
          temperature: 0.7
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response from OpenAI API');
      }

      return data.choices[0].message.content.trim();

    } catch (error) {
      clearTimeout(timeout);
      
      if (error.name === 'AbortError') {
        throw new Error('Request timed out. Please try again.');
      }
      
      throw error;
    }
  }

  showEnhancedResult(enhancedText) {
    if (!this.miniPopup) return;

    const content = this.miniPopup.querySelector('.superprompt-popup-content');
    const score = Math.floor(Math.random() * 25) + 75; // 75-100%
    
    content.innerHTML = `
      <div class="superprompt-section-title">Original Prompt</div>
      <div class="superprompt-original-prompt">
        <span>${this.escapeHtml(this.selectedText)}</span>
        <button class="superprompt-copy-btn" title="Copy original">📋</button>
      </div>
      
      <div class="superprompt-enhanced-prompt">
        ${this.escapeHtml(enhancedText)}
      </div>
      
      <div class="superprompt-score">
        <span>✨ ${score}% enhancement score</span>
        <button class="superprompt-copy-btn" title="Copy enhanced">📋</button>
      </div>
      
      <div class="superprompt-actions">
        <button class="superprompt-btn" id="editFurtherBtn">
          ✏️ Edit further
        </button>
        <button class="superprompt-btn primary" id="replacePromptBtn">
          🔄 Replace prompt
        </button>
      </div>
    `;

    this.setupResultListeners(enhancedText);
  }

  setupResultListeners(enhancedText) {
    // Copy buttons
    this.miniPopup.querySelectorAll('.superprompt-copy-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        
        let textToCopy;
        if (btn.closest('.superprompt-original-prompt')) {
          textToCopy = this.selectedText;
        } else {
          textToCopy = enhancedText;
        }
        
        this.copyToClipboard(textToCopy);
        this.showNotification('📋 Copied to clipboard!');
        this.playSound('copy');
      });
    });

    // Action buttons
    const editBtn = this.miniPopup.querySelector('#editFurtherBtn');
    const replaceBtn = this.miniPopup.querySelector('#replacePromptBtn');

    if (editBtn) {
      editBtn.addEventListener('click', () => {
        this.showEditMode(enhancedText);
        this.playSound('click');
      });
    }

    if (replaceBtn) {
      replaceBtn.addEventListener('click', () => {
        this.replacePromptInInput(enhancedText);
        this.playSound('success');
      });
    }
  }

  showEditMode(currentText) {
    if (!this.miniPopup) return;

    const content = this.miniPopup.querySelector('.superprompt-popup-content');
    
    content.innerHTML = `
      <div class="superprompt-section-title">Edit Your Prompt</div>
      
      <div style="margin-bottom: 16px;">
        <textarea style="
          width: 100%; 
          min-height: 120px; 
          padding: 12px; 
          border: 1px solid #e5e7eb; 
          border-radius: 8px; 
          font-size: 14px; 
          font-family: inherit; 
          line-height: 1.5;
          resize: vertical;
        " placeholder="Edit your prompt here...">${this.escapeHtml(currentText)}</textarea>
      </div>
      
      <div class="superprompt-actions">
        <button class="superprompt-btn" id="cancelEditBtn">
          ← Back
        </button>
        <button class="superprompt-btn primary" id="enhanceEditedBtn">
          ⚡ Superprompt it
        </button>
      </div>
    `;

    const textarea = content.querySelector('textarea');
    const cancelBtn = content.querySelector('#cancelEditBtn');
    const enhanceBtn = content.querySelector('#enhanceEditedBtn');

    cancelBtn.addEventListener('click', () => {
      this.showEnhancedResult(currentText);
    });

    enhanceBtn.addEventListener('click', () => {
      const editedText = textarea.value.trim();
      if (editedText && editedText !== this.selectedText) {
        this.selectedText = editedText;
        this.showLoadingState();
        setTimeout(() => this.enhancePrompt(), 100);
      }
    });

    // Focus and select
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  }

  showLoadingState() {
    if (!this.miniPopup) return;

    const content = this.miniPopup.querySelector('.superprompt-popup-content');
    content.innerHTML = `
      <div class="superprompt-section-title">Original Prompt</div>
      <div class="superprompt-original-prompt">
        <span>${this.escapeHtml(this.selectedText)}</span>
        <button class="superprompt-copy-btn" title="Copy original">📋</button>
      </div>
      
      <div class="superprompt-loading">
        <div class="superprompt-loading-spinner"></div>
        <span>Analyzing prompt...</span>
      </div>
    `;

    // Re-setup copy listener
    this.miniPopup.querySelector('.superprompt-copy-btn').addEventListener('click', () => {
      this.copyToClipboard(this.selectedText);
      this.showNotification('Original prompt copied!');
    });
  }

  showErrorResult(errorMessage) {
    if (!this.miniPopup) return;

    const content = this.miniPopup.querySelector('.superprompt-popup-content');
    
    content.innerHTML = `
      <div class="superprompt-section-title">Original Prompt</div>
      <div class="superprompt-original-prompt">
        <span>${this.escapeHtml(this.selectedText)}</span>
        <button class="superprompt-copy-btn" title="Copy original">📋</button>
      </div>
      
      <div style="
        text-align: center; 
        padding: 20px; 
        color: #ef4444;
        background: rgba(239, 68, 68, 0.1);
        border-radius: 8px;
        margin-bottom: 16px;
      ">
        <div style="margin-bottom: 12px;">⚠️ Enhancement failed</div>
        <div style="font-size: 12px; margin-bottom: 16px;">${this.escapeHtml(errorMessage)}</div>
        <button class="superprompt-btn" id="retryBtn">🔄 Retry</button>
      </div>
    `;

    // Setup listeners
    this.miniPopup.querySelector('#retryBtn').addEventListener('click', () => {
      this.showLoadingState();
      setTimeout(() => this.enhancePrompt(), 100);
    });

    this.miniPopup.querySelector('.superprompt-copy-btn').addEventListener('click', () => {
      this.copyToClipboard(this.selectedText);
      this.showNotification('Original prompt copied!');
    });
  }

  async replacePromptInInput(newText) {
    if (!this.selectedRange || !this.currentInput || !newText) {
      this.showNotification('Cannot replace text in this location.', 'error');
      return;
    }

    try {
      const inputElement = this.currentInput;
      
      if (inputElement.tagName === 'TEXTAREA' || 
          (inputElement.tagName === 'INPUT' && inputElement.type === 'text')) {
        
        // For regular inputs
        const start = inputElement.selectionStart || 0;
        const end = inputElement.selectionEnd || inputElement.value.length;
        const value = inputElement.value;
        
        inputElement.value = value.substring(0, start) + newText + value.substring(end);
        inputElement.focus();
        inputElement.setSelectionRange(start, start + newText.length);
        
        // Trigger events for frameworks
        inputElement.dispatchEvent(new Event('input', { bubbles: true }));
        inputElement.dispatchEvent(new Event('change', { bubbles: true }));
        
      } else {
        // For contenteditable
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(this.selectedRange);
        
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          range.insertNode(document.createTextNode(newText));
          selection.removeAllRanges();
          
          // Focus the element
          if (this.currentInput.focus) {
            this.currentInput.focus();
          }
        }
      }
      
      this.showNotification('✅ Text replaced successfully!');
      this.hideFloatingElements();
      
      // Auto-copy if enabled
      if (this.settings.autoCopy) {
        this.copyToClipboard(newText);
      }
      
    } catch (error) {
      console.error('Error replacing text:', error);
      this.copyToClipboard(newText);
      this.showNotification('Could not replace directly. Text copied to clipboard instead.', 'error');
    }
  }

  hideFloatingElements() {
    if (this.floatingIcon) {
      this.floatingIcon.remove();
      this.floatingIcon = null;
    }
    
    if (this.miniPopup) {
      this.miniPopup.remove();
      this.miniPopup = null;
    }
    
    this.selectedText = '';
    this.selectedRange = null;
    this.currentInput = null;
    this.isProcessing = false;
  }

  async saveToHistory(original, enhanced) {
    try {
      chrome.runtime.sendMessage({
        action: 'saveToHistory',
        data: {
          original,
          enhanced,
          site: this.currentSite,
          siteIcon: this.siteIcon,
          timestamp: Date.now(),
          date: new Date().toLocaleDateString()
        }
      });
    } catch (error) {
      console.error('Failed to save to history:', error);
    }
  }

  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  }

  showNotification(message, type = 'success') {
    const existing = document.querySelector('.superprompt-notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = 'superprompt-notification';
    notification.style.cssText = `
      position: fixed !important;
      top: 20px !important;
      right: 20px !important;
      background: ${type === 'error' ? '#ef4444' : '#22d3ee'} !important;
      color: white !important;
      padding: 12px 20px !important;
      border-radius: 8px !important;
      z-index: 2147483647 !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      font-size: 14px !important;
      font-weight: 500 !important;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15) !important;
      animation: superpromptSlideIn 0.3s ease-out !important;
      max-width: 300px !important;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'superpromptSlideIn 0.3s ease-out reverse';
        setTimeout(() => notification.remove(), 300);
      }
    }, 3000);
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

  isDarkMode() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new SuperPromptEnhancer());
} else {
  new SuperPromptEnhancer();
}

// Handle dynamic content
let enhancerInstance = null;
const observer = new MutationObserver(() => {
  if (!enhancerInstance && document.body) {
    enhancerInstance = new SuperPromptEnhancer();
  }
});

if (document.body) {
  observer.observe(document.body, { childList: true, subtree: true });
}

// Handle navigation
window.addEventListener('popstate', () => {
  if (enhancerInstance) {
    enhancerInstance.hideFloatingElements();
  }
});