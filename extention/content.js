// content.js - AI Prompt Enhancer Content Script

class AIPromptEnhancer {
  constructor() {
    this.selectedText = '';
    this.selectedRange = null;
    this.floatingIcon = null;
    this.enhancementModal = null;
    this.currentTab = 'enhance';
    this.promptHistory = [];
    this.init();
  }

  init() {
    if (window !== window.top) return;
    
    this.loadHistory();
    this.injectStyles();
    this.setupEventListeners();
    this.showOnboarding();
    console.log('AI Prompt Enhancer loaded');
  }

  injectStyles() {
    if (document.getElementById('ai-prompt-enhancer-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'ai-prompt-enhancer-styles';
    styles.textContent = `
      /* Floating Icon */
      .ai-prompt-icon {
        position: absolute;
        width: 44px;
        height: 44px;
        background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
        border-radius: 50%;
        cursor: pointer;
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 8px 32px rgba(79, 70, 229, 0.4);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        border: 2px solid rgba(255,255,255,0.2);
        backdrop-filter: blur(10px);
      }

      .ai-prompt-icon:hover {
        transform: scale(1.1) translateY(-2px);
        box-shadow: 0 12px 40px rgba(79, 70, 229, 0.6);
      }

      /* Main Modal */
      .ai-prompt-modal {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(15, 15, 15, 0.95);
        backdrop-filter: blur(20px) saturate(180%);
        border-radius: 20px;
        padding: 0;
        box-shadow: 0 25px 60px rgba(0,0,0,0.6);
        z-index: 10001;
        width: 520px;
        max-width: 90vw;
        max-height: 80vh;
        border: 1px solid rgba(255,255,255,0.1);
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        overflow: hidden;
        animation: modalSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .ai-prompt-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.4);
        z-index: 10000;
        backdrop-filter: blur(2px);
      }

      /* Modal Header */
      .modal-header {
        padding: 24px 24px 0 24px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .modal-title {
        font-size: 20px;
        font-weight: 700;
        color: #fff;
        margin: 0;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .modal-close {
        background: rgba(255,255,255,0.1);
        border: none;
        color: #fff;
        font-size: 20px;
        cursor: pointer;
        padding: 8px;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 12px;
        transition: all 0.2s ease;
      }

      .modal-close:hover {
        background: rgba(255,255,255,0.2);
        transform: scale(1.1);
      }

      /* Tabs */
      .modal-tabs {
        display: flex;
        padding: 16px 24px 0 24px;
        gap: 4px;
        border-bottom: 1px solid rgba(255,255,255,0.1);
      }

      .tab-btn {
        background: none;
        border: none;
        color: #9ca3af;
        padding: 12px 20px;
        border-radius: 12px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        transition: all 0.2s ease;
        position: relative;
      }

      .tab-btn.active {
        color: #fff;
        background: rgba(79, 70, 229, 0.2);
      }

      .tab-btn.active::after {
        content: '';
        position: absolute;
        bottom: -1px;
        left: 20px;
        right: 20px;
        height: 2px;
        background: linear-gradient(90deg, #4f46e5, #7c3aed);
        border-radius: 1px;
      }

      /* Modal Content */
      .modal-content {
        padding: 24px;
        max-height: 60vh;
        overflow-y: auto;
      }

      /* Original Text Display */
      .original-text {
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 24px;
        font-size: 14px;
        line-height: 1.6;
        color: #e5e7eb;
        max-height: 120px;
        overflow-y: auto;
      }

      /* Action Buttons */
      .action-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-bottom: 20px;
      }

      .action-btn {
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.1);
        color: #fff;
        padding: 16px;
        border-radius: 12px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.2s ease;
        text-align: left;
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .action-btn:hover {
        background: rgba(79, 70, 229, 0.2);
        border-color: rgba(79, 70, 229, 0.5);
        transform: translateY(-2px);
      }

      .action-btn.wide {
        grid-column: 1 / -1;
      }

      /* Custom Instruction */
      .custom-instruction {
        margin-bottom: 20px;
      }

      .custom-input {
        width: 100%;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.1);
        color: #fff;
        padding: 12px 16px;
        border-radius: 12px;
        font-size: 14px;
        resize: none;
        height: 60px;
        font-family: inherit;
      }

      .custom-input::placeholder {
        color: #9ca3af;
      }

      .custom-input:focus {
        outline: none;
        border-color: rgba(79, 70, 229, 0.5);
        background: rgba(255,255,255,0.08);
      }

      /* Enhance Button */
      .enhance-btn {
        width: 100%;
        background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
        border: none;
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        cursor: pointer;
        font-size: 16px;
        font-weight: 600;
        transition: all 0.2s ease;
        margin-bottom: 20px;
      }

      .enhance-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(79, 70, 229, 0.4);
      }

      .enhance-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
      }

      /* Tips Checklist */
      .tips-section {
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 20px;
      }

      .tips-title {
        font-size: 16px;
        font-weight: 600;
        color: #fff;
        margin-bottom: 16px;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .tip-item {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
        font-size: 14px;
        color: #d1d5db;
      }

      .tip-icon {
        width: 20px;
        height: 20px;
        background: linear-gradient(135deg, #10b981, #059669);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 12px;
        font-weight: bold;
      }

      /* Result Area */
      .result-area {
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 20px;
      }

      .result-text {
        font-size: 14px;
        line-height: 1.6;
        color: #e5e7eb;
        margin-bottom: 16px;
        max-height: 200px;
        overflow-y: auto;
      }

      .result-actions {
        display: flex;
        gap: 12px;
      }

      .result-btn {
        flex: 1;
        padding: 12px 20px;
        border-radius: 10px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.2s ease;
        border: none;
      }

      .replace-btn {
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
      }

      .copy-btn {
        background: rgba(255,255,255,0.1);
        color: #fff;
        border: 1px solid rgba(255,255,255,0.2);
      }

      .result-btn:hover {
        transform: translateY(-1px);
      }

      /* History Tab */
      .history-list {
        max-height: 400px;
        overflow-y: auto;
      }

      .history-item {
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 12px;
        transition: all 0.2s ease;
      }

      .history-item:hover {
        background: rgba(255,255,255,0.08);
      }

      .history-text {
        font-size: 14px;
        color: #e5e7eb;
        margin-bottom: 12px;
        line-height: 1.5;
      }

      .history-meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .history-date {
        font-size: 12px;
        color: #9ca3af;
      }

      .history-copy {
        background: rgba(79, 70, 229, 0.2);
        border: 1px solid rgba(79, 70, 229, 0.3);
        color: #a5b4fc;
        padding: 6px 12px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.2s ease;
      }

      .history-copy:hover {
        background: rgba(79, 70, 229, 0.3);
        color: #fff;
      }

      /* Loading State */
      .loading {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        color: #9ca3af;
        font-size: 14px;
        padding: 40px 20px;
      }

      .spinner {
        width: 20px;
        height: 20px;
        border: 2px solid rgba(79, 70, 229, 0.2);
        border-top: 2px solid #4f46e5;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      /* Error State */
      .error {
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.3);
        color: #fca5a5;
        padding: 16px;
        border-radius: 12px;
        margin-bottom: 16px;
        font-size: 14px;
        text-align: center;
      }

      /* Onboarding */
      .onboarding {
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(15, 15, 15, 0.95);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 16px;
        padding: 20px;
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        z-index: 9999;
        max-width: 320px;
        animation: slideInRight 0.4s ease-out;
      }

      .onboarding-title {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 12px;
        color: #fff;
      }

      .onboarding-text {
        font-size: 14px;
        line-height: 1.5;
        color: #d1d5db;
        margin-bottom: 16px;
      }

      .onboarding-close {
        background: linear-gradient(135deg, #4f46e5, #7c3aed);
        border: none;
        color: white;
        padding: 8px 16px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 12px;
        width: 100%;
      }

      /* Animations */
      @keyframes modalSlideIn {
        from {
          opacity: 0;
          transform: translate(-50%, -50%) scale(0.9);
        }
        to {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
        }
      }

      @keyframes slideInRight {
        from {
          opacity: 0;
          transform: translateX(100%);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      /* Notification */
      .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        padding: 12px 20px;
        border-radius: 12px;
        z-index: 10002;
        font-size: 14px;
        box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
        animation: slideInRight 0.3s ease-out;
      }

      /* Scrollbar Styling */
      .modal-content::-webkit-scrollbar,
      .history-list::-webkit-scrollbar {
        width: 8px;
      }

      .modal-content::-webkit-scrollbar-track,
      .history-list::-webkit-scrollbar-track {
        background: rgba(255,255,255,0.05);
        border-radius: 4px;
      }

      .modal-content::-webkit-scrollbar-thumb,
      .history-list::-webkit-scrollbar-thumb {
        background: rgba(255,255,255,0.2);
        border-radius: 4px;
      }

      .modal-content::-webkit-scrollbar-thumb:hover,
      .history-list::-webkit-scrollbar-thumb:hover {
        background: rgba(255,255,255,0.3);
      }
    `;

    document.head.appendChild(styles);
  }

  setupEventListeners() {
    document.addEventListener('mouseup', (e) => this.handleTextSelection(e));
    document.addEventListener('keyup', (e) => this.handleTextSelection(e));
    
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.ai-prompt-icon') && !e.target.closest('.ai-prompt-modal')) {
        this.hideFloatingIcon();
      }
    });
  }

  handleTextSelection(e) {
    setTimeout(() => {
      const selection = window.getSelection();
      const selectedText = selection.toString().trim();

      if (selectedText && selectedText.length > 10) {
        this.selectedText = selectedText;
        this.selectedRange = selection.getRangeAt(0).cloneRange();
        this.showFloatingIcon(e);
      } else {
        this.hideFloatingIcon();
      }
    }, 100);
  }

  showFloatingIcon(e) {
    this.hideFloatingIcon();

    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    this.floatingIcon = document.createElement('div');
    this.floatingIcon.className = 'ai-prompt-icon';
    this.floatingIcon.style.left = `${rect.left + rect.width / 2 - 22}px`;
    this.floatingIcon.style.top = `${rect.top - 60 + window.scrollY}px`;

    // Create icon image
    const iconImg = document.createElement('img');
    iconImg.src = chrome.runtime.getURL('icon.png');
    iconImg.style.cssText = `
      width: 24px;
      height: 24px;
      filter: brightness(0) invert(1);
      pointer-events: none;
    `;
    
    this.floatingIcon.appendChild(iconImg);

    this.floatingIcon.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showEnhancementModal();
    });

    document.body.appendChild(this.floatingIcon);
  }

  hideFloatingIcon() {
    if (this.floatingIcon) {
      this.floatingIcon.remove();
      this.floatingIcon = null;
    }
  }

  showEnhancementModal() {
    this.hideEnhancementModal();

    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'ai-prompt-overlay';
    overlay.addEventListener('click', () => this.hideEnhancementModal());

    // Create modal
    this.enhancementModal = document.createElement('div');
    this.enhancementModal.className = 'ai-prompt-modal';
    this.enhancementModal.innerHTML = this.getModalHTML();

    // Setup event listeners
    this.setupModalListeners();

    document.body.appendChild(overlay);
    document.body.appendChild(this.enhancementModal);
    this.hideFloatingIcon();
  }

  getModalHTML() {
    return `
      <div class="modal-header">
        <h3 class="modal-title">🚀 AI Prompt Enhancer</h3>
        <button class="modal-close">×</button>
      </div>
      
      <div class="modal-tabs">
        <button class="tab-btn ${this.currentTab === 'enhance' ? 'active' : ''}" data-tab="enhance">
          ✨ Enhance
        </button>
        <button class="tab-btn ${this.currentTab === 'history' ? 'active' : ''}" data-tab="history">
          📚 History (${this.promptHistory.length})
        </button>
      </div>
      
      <div class="modal-content">
        ${this.currentTab === 'enhance' ? this.getEnhanceTabHTML() : this.getHistoryTabHTML()}
      </div>
    `;
  }

  getEnhanceTabHTML() {
    return `
      <div class="original-text">
        ${this.escapeHtml(this.selectedText)}
      </div>
      
      <div class="action-grid">
        <button class="action-btn" data-action="detailed">
          📋 Make it more detailed
        </button>
        <button class="action-btn" data-action="examples">
          💡 Add examples
        </button>
        <button class="action-btn" data-action="clarify">
          🔍 Shorten & clarify
        </button>
        <button class="action-btn" data-action="stepbystep">
          📝 Make it step-by-step
        </button>
        <button class="action-btn" data-action="simple">
          👶 Explain like I'm 5
        </button>
        <button class="action-btn" data-action="specific">
          🎯 Make it more specific
        </button>
      </div>
      
      <div class="custom-instruction">
        <textarea class="custom-input" placeholder="Or write custom instruction... (e.g., 'Make it sound like a pirate', 'Add technical details', 'Make it funny')"></textarea>
      </div>
      
      <button class="enhance-btn">Enhance Prompt</button>
      
      <div class="tips-section">
        <div class="tips-title">💡 What you can do with this tool</div>
        <div class="tip-item">
          <div class="tip-icon">✓</div>
          Regenerate prompts for better AI results
        </div>
        <div class="tip-item">
          <div class="tip-icon">✓</div>
          Add details and examples automatically
        </div>
        <div class="tip-item">
          <div class="tip-icon">✓</div>
          Change tone and style instantly
        </div>
        <div class="tip-item">
          <div class="tip-icon">✓</div>
          Fix unclear instructions
        </div>
        <div class="tip-item">
          <div class="tip-icon">✓</div>
          Save and reuse favorite prompts
        </div>
        <div class="tip-item">
          <div class="tip-icon">✓</div>
          Get consistently better AI responses
        </div>
      </div>
      
      <div class="content-area">
        <!-- Results will appear here -->
      </div>
    `;
  }

  getHistoryTabHTML() {
    if (this.promptHistory.length === 0) {
      return `
        <div style="text-align: center; padding: 40px 20px; color: #9ca3af;">
          <div style="font-size: 48px; margin-bottom: 16px;">📚</div>
          <div style="font-size: 16px; margin-bottom: 8px;">No prompt history yet</div>
          <div style="font-size: 14px;">Enhanced prompts will appear here</div>
        </div>
      `;
    }

    return `
      <div class="history-list">
        ${this.promptHistory.map((item, index) => `
          <div class="history-item">
            <div class="history-text">${this.escapeHtml(item.enhanced)}</div>
            <div class="history-meta">
              <div class="history-date">${item.date}</div>
              <button class="history-copy" data-text="${this.escapeHtml(item.enhanced)}">
                📋 Copy
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  setupModalListeners() {
    // Close button
    this.enhancementModal.querySelector('.modal-close').addEventListener('click', () => {
      this.hideEnhancementModal();
    });

    // Tab switching
    this.enhancementModal.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.currentTab = e.target.dataset.tab;
        this.updateModalContent();
      });
    });

    if (this.currentTab === 'enhance') {
      // Action buttons
      this.enhancementModal.querySelectorAll('.action-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          this.selectedAction = e.target.dataset.action;
          this.enhancePrompt();
        });
      });

      // Custom enhance button
      this.enhancementModal.querySelector('.enhance-btn').addEventListener('click', () => {
        const customText = this.enhancementModal.querySelector('.custom-input').value.trim();
        this.selectedAction = customText || 'improve';
        this.enhancePrompt();
      });
    } else {
      // History copy buttons
      this.enhancementModal.querySelectorAll('.history-copy').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const text = e.target.dataset.text;
          this.copyToClipboard(text);
          this.showNotification('Copied to clipboard!');
        });
      });
    }
  }

  updateModalContent() {
    const content = this.enhancementModal.querySelector('.modal-content');
    content.innerHTML = this.currentTab === 'enhance' ? this.getEnhanceTabHTML() : this.getHistoryTabHTML();
    
    // Update tabs
    this.enhancementModal.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === this.currentTab);
    });
    
    this.setupModalListeners();
  }

  async enhancePrompt() {
    const contentArea = this.enhancementModal.querySelector('.content-area');
    const enhanceButton = this.enhancementModal.querySelector('.enhance-btn');

    // Show loading
    if (enhanceButton) enhanceButton.disabled = true;
    contentArea.innerHTML = `
      <div class="loading">
        <div class="spinner"></div>
        Enhancing your prompt...
      </div>
    `;

    try {
      const instruction = this.getInstructionForAction(this.selectedAction);
      
      const response = await fetch('https://superprompt-lac.vercel.app/api/enhance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: this.selectedText,
          instruction: instruction,
          enhancementType: 'custom'
        })
      });

      const data = await response.json();

      if (data.success) {
        this.showResult(data.enhancedText);
        this.addToHistory(this.selectedText, data.enhancedText);
      } else {
        throw new Error(data.error || 'Enhancement failed');
      }

    } catch (error) {
      console.error('Enhancement error:', error);
      contentArea.innerHTML = `
        <div class="error">
          Failed to enhance prompt. Please try again.
        </div>
      `;
    } finally {
      if (enhanceButton) enhanceButton.disabled = false;
    }
  }

  getInstructionForAction(action) {
    const instructions = {
      detailed: 'Make this prompt more detailed and comprehensive with specific requirements',
      examples: 'Add concrete examples to make this prompt clearer',
      clarify: 'Shorten this prompt while making it clearer and more direct',
      stepbystep: 'Rewrite this prompt with step-by-step instructions',
      simple: 'Rewrite this prompt in very simple language that a 5-year-old could understand',
      specific: 'Make this prompt more specific and precise with exact requirements'
    };

    return instructions[action] || action;
  }

  showResult(enhancedText) {
    const contentArea = this.enhancementModal.querySelector('.content-area');
    
    contentArea.innerHTML = `
      <div class="result-area">
        <div class="result-text">${this.escapeHtml(enhancedText)}</div>
        <div class="result-actions">
          <button class="result-btn replace-btn">🔄 Replace Original</button>
          <button class="result-btn copy-btn">📋 Copy Enhanced</button>
        </div>
      </div>
    `;

    // Add action listeners
    contentArea.querySelector('.replace-btn').addEventListener('click', () => {
      this.replaceSelectedText(enhancedText);
    });

    contentArea.querySelector('.copy-btn').addEventListener('click', () => {
      this.copyToClipboard(enhancedText);
      this.showNotification('Enhanced prompt copied!');
    });
  }

  replaceSelectedText(newText) {
    if (this.selectedRange) {
      try {
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(this.selectedRange);
        
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          range.insertNode(document.createTextNode(newText));
          selection.removeAllRanges();
          
          this.hideEnhancementModal();
          this.showNotification('Text replaced successfully!');
        }
      } catch (error) {
        console.error('Replace error:', error);
        this.showNotification('Could not replace text in this location.', 'error');
      }
    }
  }

  copyToClipboard(text) {
    navigator.clipboard.writeText(text).catch(() => {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    });
  }

  addToHistory(original, enhanced) {
    const historyItem = {
      original,
      enhanced,
      date: new Date().toLocaleString(),
      timestamp: Date.now()
    };

    this.promptHistory.unshift(historyItem);
    
    // Keep only last 50 items
    if (this.promptHistory.length > 50) {
      this.promptHistory = this.promptHistory.slice(0, 50);
    }

    this.saveHistory();
  }

  saveHistory() {
    try {
      localStorage.setItem('ai-prompt-enhancer-history', JSON.stringify(this.promptHistory));
    } catch (error) {
      console.error('Failed to save history:', error);
    }
  }

  loadHistory() {
    try {
      const saved = localStorage.getItem('ai-prompt-enhancer-history');
      if (saved) {
        this.promptHistory = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
      this.promptHistory = [];
    }
  }

  showOnboarding() {
    // Only show once
    if (localStorage.getItem('ai-prompt-enhancer-onboarded')) return;

    const onboarding = document.createElement('div');
    onboarding.className = 'onboarding';
    onboarding.innerHTML = `
      <div class="onboarding-title">🚀 AI Prompt Enhancer Ready!</div>
      <div class="onboarding-text">
        Highlight any prompt text, click the floating icon, and choose how to improve it for better AI results.
      </div>
      <button class="onboarding-close">Got it!</button>
    `;

    onboarding.querySelector('.onboarding-close').addEventListener('click', () => {
      onboarding.remove();
      localStorage.setItem('ai-prompt-enhancer-onboarded', 'true');
    });

    document.body.appendChild(onboarding);

    // Auto-hide after 8 seconds
    setTimeout(() => {
      if (onboarding.parentNode) {
        onboarding.remove();
        localStorage.setItem('ai-prompt-enhancer-onboarded', 'true');
      }
    }, 8000);
  }

  showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
    if (type === 'error') {
      notification.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
    }

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideInRight 0.3s ease-out reverse';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  hideEnhancementModal() {
    const overlay = document.querySelector('.ai-prompt-overlay');
    if (overlay) overlay.remove();
    
    if (this.enhancementModal) {
      this.enhancementModal.remove();
      this.enhancementModal = null;
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new AIPromptEnhancer());
} else {
  new AIPromptEnhancer();
}