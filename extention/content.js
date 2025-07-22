// content.js - SuperPrompt Floating Mini-Popup for Input Fields

class SuperPromptFloating {
  constructor() {
    this.selectedText = '';
    this.selectedRange = null;
    this.currentInput = null;
    this.floatingIcon = null;
    this.miniPopup = null;
    this.isInitialized = false;
    this.currentSite = '';
    this.siteIcon = '🌐';
    this.init();
  }

  init() {
    // Avoid running in iframes
    if (window !== window.top) return;
    
    // Avoid double initialization
    if (this.isInitialized) return;
    this.isInitialized = true;

    this.detectCurrentSite();
    this.injectStyles();
    this.setupEventListeners();
    this.setupMessageListener();
    
    console.log('SuperPrompt floating enhancer loaded');
  }

  detectCurrentSite() {
    try {
      this.currentSite = window.location.hostname;
      
      // Site-specific icons (will be used in both mini-popup and main popup)
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

      this.siteIcon = siteIcons[this.currentSite] || '🌐';
    } catch (error) {
      console.error('Failed to detect current site:', error);
      this.currentSite = 'unknown';
      this.siteIcon = '🌐';
    }
  }

  injectStyles() {
    // Check if styles already injected
    if (document.getElementById('superprompt-floating-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'superprompt-floating-styles';
    styles.textContent = `
      /* SuperPrompt Floating Icon */
      .superprompt-floating-icon {
        position: absolute;
        width: 32px;
        height: 32px;
        background: linear-gradient(135deg, #4ade80 0%, #22d3ee 100%);
        border-radius: 50%;
        cursor: pointer;
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15), 0 4px 20px rgba(34, 211, 238, 0.3);
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        border: 2px solid rgba(255, 255, 255, 0.3);
        backdrop-filter: blur(10px);
        animation: superpromptIconFadeIn 0.3s ease-out;
        font-size: 16px;
      }

      .superprompt-floating-icon:hover {
        transform: scale(1.1);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2), 0 8px 32px rgba(34, 211, 238, 0.4);
      }

      /* Mini Popup */
      .superprompt-mini-popup {
        position: absolute;
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(20px) saturate(180%);
        border-radius: 16px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
        z-index: 999998;
        width: 420px;
        max-width: 90vw;
        border: 1px solid rgba(0, 0, 0, 0.1);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        animation: superpromptPopupSlideIn 0.3s ease-out;
        overflow: hidden;
      }

      .superprompt-mini-popup.dark {
        background: rgba(31, 41, 55, 0.95);
        border-color: rgba(255, 255, 255, 0.1);
        color: white;
      }

      /* Popup Header */
      .superprompt-popup-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        border-bottom: 1px solid rgba(0, 0, 0, 0.1);
      }

      .superprompt-mini-popup.dark .superprompt-popup-header {
        border-bottom-color: rgba(255, 255, 255, 0.1);
      }

      .superprompt-header-left {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .superprompt-logo {
        width: 24px;
        height: 24px;
        background: linear-gradient(135deg, #4ade80 0%, #22d3ee 100%);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 12px;
        font-weight: bold;
      }

      .superprompt-brand {
        font-size: 16px;
        font-weight: 600;
        color: #1f2937;
      }

      .superprompt-mini-popup.dark .superprompt-brand {
        color: white;
      }

      .superprompt-header-right {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .superprompt-site-icon {
        width: 20px;
        height: 20px;
        font-size: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .superprompt-header-btn {
        width: 24px;
        height: 24px;
        border: none;
        background: rgba(0, 0, 0, 0.1);
        color: #6b7280;
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        transition: all 0.2s ease;
      }

      .superprompt-mini-popup.dark .superprompt-header-btn {
        background: rgba(255, 255, 255, 0.1);
        color: #d1d5db;
      }

      .superprompt-header-btn:hover {
        background: rgba(0, 0, 0, 0.2);
        transform: scale(1.1);
      }

      .superprompt-mini-popup.dark .superprompt-header-btn:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      /* Popup Content */
      .superprompt-popup-content {
        padding: 20px;
      }

      .superprompt-section-title {
        font-size: 14px;
        font-weight: 600;
        color: #374151;
        margin-bottom: 8px;
      }

      .superprompt-mini-popup.dark .superprompt-section-title {
        color: #f3f4f6;
      }

      .superprompt-original-prompt {
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 12px;
        font-size: 13px;
        color: #6b7280;
        margin-bottom: 16px;
        line-height: 1.4;
        max-height: 80px;
        overflow-y: auto;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
      }

      .superprompt-mini-popup.dark .superprompt-original-prompt {
        background: rgba(55, 65, 81, 0.5);
        border-color: rgba(75, 85, 99, 0.5);
        color: #d1d5db;
      }

      .superprompt-copy-btn {
        background: none;
        border: none;
        color: #9ca3af;
        cursor: pointer;
        font-size: 14px;
        padding: 2px;
        border-radius: 4px;
        transition: color 0.2s ease;
        margin-left: 8px;
        flex-shrink: 0;
      }

      .superprompt-copy-btn:hover {
        color: #22d3ee;
      }

      /* Enhanced Prompt */
      .superprompt-enhanced-prompt {
        background: rgba(74, 222, 128, 0.1);
        border: 2px solid #4ade80;
        border-radius: 12px;
        padding: 16px;
        font-size: 14px;
        color: #1f2937;
        margin-bottom: 16px;
        line-height: 1.5;
        max-height: 200px;
        overflow-y: auto;
      }

      .superprompt-mini-popup.dark .superprompt-enhanced-prompt {
        background: rgba(74, 222, 128, 0.15);
        color: #f3f4f6;
      }

      /* Loading State */
      .superprompt-loading {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        padding: 40px 20px;
        color: #6b7280;
        font-size: 14px;
        font-weight: 500;
      }

      .superprompt-loading-spinner {
        width: 20px;
        height: 20px;
        border: 2px solid #e5e7eb;
        border-top: 2px solid #22d3ee;
        border-radius: 50%;
        animation: superpromptSpin 1s linear infinite;
      }

      /* Score Badge */
      .superprompt-score {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: rgba(74, 222, 128, 0.2);
        color: #16a34a;
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        margin-bottom: 16px;
      }

      /* Action Buttons */
      .superprompt-actions {
        display: flex;
        gap: 12px;
        justify-content: space-between;
      }

      .superprompt-btn {
        flex: 1;
        padding: 10px 16px;
        border: 1px solid #e5e7eb;
        background: white;
        color: #374151;
        border-radius: 8px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
      }

      .superprompt-btn.primary {
        background: linear-gradient(135deg, #4ade80 0%, #22d3ee 100%);
        color: white;
        border-color: transparent;
      }

      .superprompt-btn:hover {
        border-color: #22d3ee;
        color: #22d3ee;
        transform: translateY(-1px);
      }

      .superprompt-btn.primary:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(34, 211, 238, 0.3);
      }

      .superprompt-mini-popup.dark .superprompt-btn {
        background: rgba(55, 65, 81, 0.5);
        border-color: rgba(75, 85, 99, 0.5);
        color: #f3f4f6;
      }

      .superprompt-mini-popup.dark .superprompt-btn:hover {
        border-color: #22d3ee;
        color: #22d3ee;
      }

      /* Edit Further Mode */
      .superprompt-edit-mode {
        margin-bottom: 16px;
      }

      .superprompt-edit-textarea {
        width: 100%;
        min-height: 120px;
        padding: 12px;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        font-size: 14px;
        color: #1f2937;
        background: white;
        resize: vertical;
        font-family: inherit;
        line-height: 1.5;
      }

      .superprompt-mini-popup.dark .superprompt-edit-textarea {
        background: rgba(55, 65, 81, 0.5);
        border-color: rgba(75, 85, 99, 0.5);
        color: #f3f4f6;
      }

      .superprompt-edit-textarea:focus {
        outline: none;
        border-color: #22d3ee;
        box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.1);
      }

      /* Animations */
      @keyframes superpromptIconFadeIn {
        from {
          opacity: 0;
          transform: scale(0.8);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }

      @keyframes superpromptPopupSlideIn {
        from {
          opacity: 0;
          transform: translateY(-10px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      @keyframes superpromptSpin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      /* Responsive */
      @media (max-width: 500px) {
        .superprompt-mini-popup {
          width: 350px;
        }
        
        .superprompt-actions {
          flex-direction: column;
        }
      }

      /* High contrast mode */
      @media (prefers-contrast: high) {
        .superprompt-floating-icon,
        .superprompt-mini-popup {
          border: 2px solid #000;
        }
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

      /* Scrollbar */
      .superprompt-original-prompt::-webkit-scrollbar,
      .superprompt-enhanced-prompt::-webkit-scrollbar {
        width: 6px;
      }

      .superprompt-original-prompt::-webkit-scrollbar-thumb,
      .superprompt-enhanced-prompt::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 3px;
      }
    `;

    document.head.appendChild(styles);
  }

  setupEventListeners() {
    // Listen for text selection in input fields only
    document.addEventListener('mouseup', (e) => this.handleInputSelection(e));
    document.addEventListener('keyup', (e) => this.handleInputSelection(e));
    
    // Hide popup when clicking elsewhere
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.superprompt-floating-icon') && 
          !e.target.closest('.superprompt-mini-popup')) {
        this.hideFloatingElements();
      }
    });

    // Hide on scroll and resize
    document.addEventListener('scroll', () => this.hideFloatingElements(), { passive: true });
    window.addEventListener('resize', () => this.hideFloatingElements());

    // ESC key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideFloatingElements();
      }
    });
  }

  setupMessageListener() {
    // Listen for messages from main popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.action) {
        case 'getSiteInfo':
          sendResponse({ 
            site: this.currentSite,
            siteIcon: this.siteIcon
          });
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

  handleInputSelection(e) {
    setTimeout(() => {
      const selection = window.getSelection();
      const selectedText = selection.toString().trim();

      // Only proceed if text is selected AND we're in an input field
      if (selectedText && selectedText.length >= 5) {
        const activeElement = document.activeElement;
        
        // Check if selection is within an editable element
        if (this.isEditableElement(activeElement) || this.isWithinEditableElement(selection)) {
          this.selectedText = selectedText;
          this.currentInput = activeElement;
          
          // Store the range for later replacement
          if (selection.rangeCount > 0) {
            this.selectedRange = selection.getRangeAt(0).cloneRange();
          }
          
          this.showFloatingIcon();
        } else {
          this.hideFloatingElements();
        }
      } else {
        this.hideFloatingElements();
      }
    }, 100);
  }

  isEditableElement(element) {
    if (!element) return false;
    
    const tagName = element.tagName?.toLowerCase();
    
    // Check for input fields
    if (tagName === 'textarea') return true;
    if (tagName === 'input' && ['text', 'search', 'url', 'email'].includes(element.type)) return true;
    
    // Check for contenteditable
    if (element.contentEditable === 'true') return true;
    
    // Check for common AI chat interfaces
    if (element.getAttribute('role') === 'textbox') return true;
    if (element.classList.contains('ProseMirror')) return true; // Notion, etc.
    
    return false;
  }

  isWithinEditableElement(selection) {
    if (!selection.rangeCount) return false;
    
    let node = selection.getRangeAt(0).commonAncestorContainer;
    
    // Traverse up to find editable parent
    while (node && node !== document) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        if (this.isEditableElement(node)) return true;
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
      this.floatingIcon.title = 'Enhance with SuperPrompt';

      // Position the icon
      const iconSize = 32;
      let left = rect.left + rect.width / 2 - iconSize / 2;
      let top = rect.top - iconSize - 8;
      
      // Keep within viewport
      left = Math.max(10, Math.min(left, window.innerWidth - iconSize - 10));
      
      if (top < 10) {
        top = rect.bottom + 8;
      }

      this.floatingIcon.style.left = `${left + window.scrollX}px`;
      this.floatingIcon.style.top = `${top + window.scrollY}px`;

      // Click handler
      this.floatingIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showMiniPopup();
      });

      document.body.appendChild(this.floatingIcon);

    } catch (error) {
      console.error('Error showing floating icon:', error);
    }
  }

  showMiniPopup() {
    this.hideFloatingElements();

    if (!this.selectedText) return;

    // Create mini popup
    this.miniPopup = document.createElement('div');
    this.miniPopup.className = 'superprompt-mini-popup';
    
    // Apply dark mode if detected
    if (this.isDarkMode()) {
      this.miniPopup.classList.add('dark');
    }

    // Position near the current input
    this.positionMiniPopup();

    // Initial content
    this.miniPopup.innerHTML = this.getMiniPopupHTML();

    // Setup event listeners
    this.setupMiniPopupListeners();

    document.body.appendChild(this.miniPopup);

    // Auto-enhance the prompt
    this.enhancePrompt();
  }

  getMiniPopupHTML() {
    return `
      <div class="superprompt-popup-header">
        <div class="superprompt-header-left">
          <div class="superprompt-logo">$</div>
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
          <span>Analyzing</span>
        </div>
      </div>
    `;
  }

  setupMiniPopupListeners() {
    // Close button
    this.miniPopup.querySelector('.superprompt-header-btn[title="Close"]').addEventListener('click', () => {
      this.hideFloatingElements();
    });

    // Settings button (open main popup)
    this.miniPopup.querySelector('.superprompt-header-btn[title="Settings"]').addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'openMainPopup' });
    });

    // Copy original button
    this.miniPopup.querySelector('.superprompt-copy-btn').addEventListener('click', () => {
      this.copyToClipboard(this.selectedText);
      this.showNotification('Original prompt copied!');
    });
  }

  positionMiniPopup() {
    if (!this.currentInput || !this.miniPopup) return;

    try {
      const inputRect = this.currentInput.getBoundingClientRect();
      const popupWidth = 420;
      const popupHeight = 300; // Estimated
      
      let left = inputRect.left;
      let top = inputRect.bottom + 10;
      
      // Keep within viewport
      if (left + popupWidth > window.innerWidth - 20) {
        left = window.innerWidth - popupWidth - 20;
      }
      
      if (top + popupHeight > window.innerHeight - 20) {
        top = inputRect.top - popupHeight - 10;
      }
      
      left = Math.max(20, left);
      top = Math.max(20, top);

      this.miniPopup.style.left = `${left + window.scrollX}px`;
      this.miniPopup.style.top = `${top + window.scrollY}px`;
      
    } catch (error) {
      console.error('Error positioning mini popup:', error);
      // Fallback to center of screen
      this.miniPopup.style.left = '50%';
      this.miniPopup.style.top = '50%';
      this.miniPopup.style.transform = 'translate(-50%, -50%)';
    }
  }

  async enhancePrompt() {
    if (!this.miniPopup || !this.selectedText) return;

    try {
      const response = await fetch('https://superprompt-lac.vercel.app/api/enhance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: this.selectedText,
          instruction: 'improve',
          enhancementType: 'custom'
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        this.showEnhancedResult(data.enhancedText);
        this.saveToHistory(this.selectedText, data.enhancedText);
      } else {
        throw new Error(data.error || 'Enhancement failed');
      }

    } catch (error) {
      console.error('Enhancement error:', error);
      this.showErrorResult();
    }
  }

  showEnhancedResult(enhancedText) {
    if (!this.miniPopup) return;

    const content = this.miniPopup.querySelector('.superprompt-popup-content');
    const score = Math.floor(Math.random() * 30) + 70; // Mock score 70-100%
    
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
        <span>${score}% percentage score</span>
        <button class="superprompt-copy-btn" title="Copy score">📋</button>
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

    // Re-setup listeners for new content
    this.setupResultListeners(enhancedText);
  }

  setupResultListeners(enhancedText) {
    // Copy buttons
    this.miniPopup.querySelectorAll('.superprompt-copy-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isScore = btn.title === 'Copy score';
        const textToCopy = isScore ? 
          this.miniPopup.querySelector('.superprompt-score').textContent :
          (btn.closest('.superprompt-original-prompt') ? this.selectedText : enhancedText);
        
        this.copyToClipboard(textToCopy);
        this.showNotification(isScore ? 'Score copied!' : 'Copied to clipboard!');
      });
    });

    // Edit further button
    const editBtn = this.miniPopup.querySelector('#editFurtherBtn');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        this.showEditMode(enhancedText);
      });
    }

    // Replace prompt button
    const replaceBtn = this.miniPopup.querySelector('#replacePromptBtn');
    if (replaceBtn) {
      replaceBtn.addEventListener('click', () => {
        this.replacePromptInInput(enhancedText);
      });
    }
  }

  showEditMode(currentText) {
    if (!this.miniPopup) return;

    const content = this.miniPopup.querySelector('.superprompt-popup-content');
    
    content.innerHTML = `
      <div class="superprompt-section-title">Edit Your Prompt</div>
      
      <div class="superprompt-edit-mode">
        <textarea class="superprompt-edit-textarea" placeholder="Edit your prompt here...">${this.escapeHtml(currentText)}</textarea>
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

    // Setup edit mode listeners
    const cancelBtn = this.miniPopup.querySelector('#cancelEditBtn');
    const enhanceBtn = this.miniPopup.querySelector('#enhanceEditedBtn');
    const textarea = this.miniPopup.querySelector('.superprompt-edit-textarea');

    cancelBtn.addEventListener('click', () => {
      this.showEnhancedResult(currentText);
    });

    enhanceBtn.addEventListener('click', () => {
      const editedText = textarea.value.trim();
      if (editedText) {
        this.selectedText = editedText;
        this.showLoadingState();
        this.enhancePrompt();
      }
    });

    // Focus the textarea
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
        <span>Analyzing</span>
      </div>
    `;

    // Re-setup copy listener
    this.miniPopup.querySelector('.superprompt-copy-btn').addEventListener('click', () => {
      this.copyToClipboard(this.selectedText);
      this.showNotification('Original prompt copied!');
    });
  }

  showErrorResult() {
    if (!this.miniPopup) return;

    const content = this.miniPopup.querySelector('.superprompt-popup-content');
    
    content.innerHTML = `
      <div class="superprompt-section-title">Original Prompt</div>
      <div class="superprompt-original-prompt">
        <span>${this.escapeHtml(this.selectedText)}</span>
        <button class="superprompt-copy-btn" title="Copy original">📋</button>
      </div>
      
      <div style="text-align: center; padding: 20px; color: #ef4444;">
        <div style="margin-bottom: 12px;">⚠️ Enhancement failed</div>
        <button class="superprompt-btn" id="retryBtn">🔄 Retry</button>
      </div>
    `;

    // Setup retry listener
    this.miniPopup.querySelector('#retryBtn').addEventListener('click', () => {
      this.showLoadingState();
      this.enhancePrompt();
    });

    // Copy button
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
      // For regular input/textarea elements
      if (this.currentInput.tagName === 'TEXTAREA' || 
          (this.currentInput.tagName === 'INPUT' && this.currentInput.type === 'text')) {
        
        const start = this.currentInput.selectionStart;
        const end = this.currentInput.selectionEnd;
        const value = this.currentInput.value;
        
        this.currentInput.value = value.substring(0, start) + newText + value.substring(end);
        this.currentInput.focus();
        this.currentInput.setSelectionRange(start, start + newText.length);
        
        // Trigger input event for React/Vue apps
        this.currentInput.dispatchEvent(new Event('input', { bubbles: true }));
        
      } else {
        // For contenteditable elements
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(this.selectedRange);
        
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          range.insertNode(document.createTextNode(newText));
          selection.removeAllRanges();
        }
      }
      
      this.showNotification('✅ Text replaced successfully!');
      this.hideFloatingElements();
      
    } catch (error) {
      console.error('Error replacing text:', error);
      
      // Fallback: copy to clipboard
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
    
    // Clear stored data
    this.selectedText = '';
    this.selectedRange = null;
    this.currentInput = null;
  }

  async saveToHistory(original, enhanced) {
    try {
      // Send to storage
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
    // Remove existing notification
    const existing = document.querySelector('.superprompt-notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = 'superprompt-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'error' ? '#ef4444' : '#22d3ee'};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      animation: superpromptSlideIn 0.3s ease-out;
      max-width: 300px;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'superpromptSlideIn 0.3s ease-out reverse';
        setTimeout(() => notification.remove(), 300);
      }
    }, 3000);
  }

  isDarkMode() {
    // Simple dark mode detection
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize the floating enhancer
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new SuperPromptFloating();
  });
} else {
  new SuperPromptFloating();
}

// Handle dynamic content changes
let superPromptFloating = null;
const observer = new MutationObserver(() => {
  if (!superPromptFloating && document.body) {
    superPromptFloating = new SuperPromptFloating();
  }
});

if (document.body) {
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Handle page navigation in SPAs
window.addEventListener('popstate', () => {
  if (superPromptFloating) {
    superPromptFloating.hideFloatingElements();
  }
});