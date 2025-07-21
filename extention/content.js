// content.js - Text selection and floating enhancement icon

class TextEnhancer {
  constructor() {
    this.selectedText = '';
    this.selectedRange = null;
    this.floatingIcon = null;
    this.enhancementModal = null;
    this.init();
  }

  init() {
    // Only run on main frame
    if (window !== window.top) return;
    
    this.injectStyles();
    this.setupEventListeners();
    console.log('Text Enhancer loaded');
  }

  injectStyles() {
    if (document.getElementById('text-enhancer-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'text-enhancer-styles';
    styles.textContent = `
      .text-enhancer-icon {
        position: absolute;
        width: 40px;
        height: 40px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 50%;
        cursor: pointer;
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        transition: all 0.3s ease;
        border: 2px solid rgba(255,255,255,0.2);
      }

      .text-enhancer-icon:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 25px rgba(0,0,0,0.4);
      }

      .text-enhancer-modal {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #1a1a1a;
        border-radius: 16px;
        padding: 24px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        z-index: 10001;
        min-width: 400px;
        max-width: 500px;
        border: 1px solid #333;
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .text-enhancer-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.7);
        z-index: 10000;
        backdrop-filter: blur(5px);
      }

      .te-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
      }

      .te-title {
        font-size: 18px;
        font-weight: 600;
        color: #fff;
        margin: 0;
      }

      .te-close {
        background: none;
        border: none;
        color: #888;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        transition: all 0.2s ease;
      }

      .te-close:hover {
        background: #333;
        color: #fff;
      }

      .te-original-text {
        background: #262626;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 20px;
        border: 1px solid #333;
        max-height: 120px;
        overflow-y: auto;
        font-size: 14px;
        line-height: 1.5;
        color: #e0e0e0;
      }

      .te-enhancement-types {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-bottom: 20px;
      }

      .te-enhancement-btn {
        background: #333;
        border: 1px solid #444;
        color: #fff;
        padding: 12px 16px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s ease;
        text-align: center;
      }

      .te-enhancement-btn:hover {
        background: #444;
        border-color: #667eea;
      }

      .te-enhancement-btn.active {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-color: #667eea;
      }

      .te-enhance-button {
        width: 100%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border: none;
        color: white;
        padding: 14px 24px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 16px;
        font-weight: 600;
        transition: all 0.2s ease;
        margin-bottom: 16px;
      }

      .te-enhance-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
      }

      .te-enhance-button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
      }

      .te-loading {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        color: #888;
        font-size: 14px;
        padding: 20px;
      }

      .te-spinner {
        width: 20px;
        height: 20px;
        border: 2px solid #333;
        border-top: 2px solid #667eea;
        border-radius: 50%;
        animation: te-spin 1s linear infinite;
      }

      @keyframes te-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      .te-result {
        background: #262626;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 16px;
        border: 1px solid #333;
        max-height: 200px;
        overflow-y: auto;
        font-size: 14px;
        line-height: 1.5;
        color: #e0e0e0;
      }

      .te-actions {
        display: flex;
        gap: 12px;
      }

      .te-replace-btn {
        flex: 1;
        background: #10b981;
        border: none;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.2s ease;
      }

      .te-replace-btn:hover {
        background: #059669;
        transform: translateY(-1px);
      }

      .te-copy-btn {
        flex: 1;
        background: #6b7280;
        border: none;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.2s ease;
      }

      .te-copy-btn:hover {
        background: #4b5563;
        transform: translateY(-1px);
      }

      .te-error {
        background: #dc2626;
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        margin-bottom: 16px;
        font-size: 14px;
      }

      /* Animation for modal */
      .text-enhancer-modal {
        animation: te-fadeInScale 0.3s ease-out;
      }

      @keyframes te-fadeInScale {
        from {
          opacity: 0;
          transform: translate(-50%, -50%) scale(0.9);
        }
        to {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
        }
      }
    `;

    document.head.appendChild(styles);
  }

  setupEventListeners() {
    // Listen for text selection
    document.addEventListener('mouseup', (e) => this.handleTextSelection(e));
    document.addEventListener('keyup', (e) => this.handleTextSelection(e));
    
    // Hide icon when clicking elsewhere
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.text-enhancer-icon') && !e.target.closest('.text-enhancer-modal')) {
        this.hideFloatingIcon();
      }
    });
  }

  handleTextSelection(e) {
    setTimeout(() => {
      const selection = window.getSelection();
      const selectedText = selection.toString().trim();

      if (selectedText && selectedText.length > 5) {
        this.selectedText = selectedText;
        this.selectedRange = selection.getRangeAt(0).cloneRange();
        this.showFloatingIcon(e);
      } else {
        this.hideFloatingIcon();
      }
    }, 100);
  }

  showFloatingIcon(e) {
    this.hideFloatingIcon(); // Remove existing icon

    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    this.floatingIcon = document.createElement('div');
    this.floatingIcon.className = 'text-enhancer-icon';
    this.floatingIcon.style.left = `${rect.left + rect.width / 2 - 20}px`;
    this.floatingIcon.style.top = `${rect.top - 50 + window.scrollY}px`;

    // Create icon image element
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
    this.hideEnhancementModal(); // Remove existing modal

    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'text-enhancer-overlay';
    overlay.addEventListener('click', () => this.hideEnhancementModal());

    // Create modal
    this.enhancementModal = document.createElement('div');
    this.enhancementModal.className = 'text-enhancer-modal';
    this.enhancementModal.innerHTML = `
      <div class="te-header">
        <h3 class="te-title">✨ Enhance Text</h3>
        <button class="te-close">×</button>
      </div>
      
      <div class="te-original-text">
        ${this.escapeHtml(this.selectedText)}
      </div>
      
      <div class="te-enhancement-types">
        <button class="te-enhancement-btn active" data-type="improve">✨ Improve</button>
        <button class="te-enhancement-btn" data-type="professional">💼 Professional</button>
        <button class="te-enhancement-btn" data-type="creative">🎨 Creative</button>
        <button class="te-enhancement-btn" data-type="engaging">🎯 Engaging</button>
      </div>
      
      <button class="te-enhance-button">Enhance Text</button>
      
      <div class="te-content">
        <!-- Results will appear here -->
      </div>
    `;

    // Add event listeners
    this.enhancementModal.querySelector('.te-close').addEventListener('click', () => this.hideEnhancementModal());
    
    // Enhancement type selection
    this.enhancementModal.querySelectorAll('.te-enhancement-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.enhancementModal.querySelectorAll('.te-enhancement-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
      });
    });

    // Enhance button
    this.enhancementModal.querySelector('.te-enhance-button').addEventListener('click', () => this.enhanceText());

    document.body.appendChild(overlay);
    document.body.appendChild(this.enhancementModal);

    // Hide floating icon
    this.hideFloatingIcon();
  }

  hideEnhancementModal() {
    const overlay = document.querySelector('.text-enhancer-overlay');
    if (overlay) overlay.remove();
    
    if (this.enhancementModal) {
      this.enhancementModal.remove();
      this.enhancementModal = null;
    }
  }

  async enhanceText() {
    const activeBtn = this.enhancementModal.querySelector('.te-enhancement-btn.active');
    const enhancementType = activeBtn.dataset.type;
    const contentDiv = this.enhancementModal.querySelector('.te-content');
    const enhanceButton = this.enhancementModal.querySelector('.te-enhance-button');

    // Show loading
    enhanceButton.disabled = true;
    contentDiv.innerHTML = `
      <div class="te-loading">
        <div class="te-spinner"></div>
        Enhancing text...
      </div>
    `;

    try {
      const response = await fetch('https://superprompt-lac.vercel.app/api/enhance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: this.selectedText,
          enhancementType: enhancementType
        })
      });

      const data = await response.json();

      if (data.success) {
        contentDiv.innerHTML = `
          <div class="te-result">
            ${this.escapeHtml(data.enhancedText)}
          </div>
          <div class="te-actions">
            <button class="te-replace-btn">Replace Text</button>
            <button class="te-copy-btn">Copy Enhanced</button>
          </div>
        `;

        // Add action listeners
        contentDiv.querySelector('.te-replace-btn').addEventListener('click', () => {
          this.replaceSelectedText(data.enhancedText);
        });

        contentDiv.querySelector('.te-copy-btn').addEventListener('click', () => {
          navigator.clipboard.writeText(data.enhancedText);
          const btn = contentDiv.querySelector('.te-copy-btn');
          btn.textContent = 'Copied!';
          setTimeout(() => btn.textContent = 'Copy Enhanced', 2000);
        });
      } else {
        throw new Error(data.error || 'Enhancement failed');
      }

    } catch (error) {
      console.error('Enhancement error:', error);
      contentDiv.innerHTML = `
        <div class="te-error">
          Failed to enhance text. Please try again.
        </div>
      `;
    } finally {
      enhanceButton.disabled = false;
    }
  }

  replaceSelectedText(newText) {
    if (this.selectedRange) {
      try {
        // Clear selection and replace text
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(this.selectedRange);
        
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          range.insertNode(document.createTextNode(newText));
          
          // Clear selection
          selection.removeAllRanges();
          
          // Close modal
          this.hideEnhancementModal();
          
          // Show success feedback
          this.showNotification('Text replaced successfully!');
        }
      } catch (error) {
        console.error('Replace error:', error);
        this.showNotification('Could not replace text in this location.', 'error');
      }
    }
  }

  showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#10b981' : '#dc2626'};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      z-index: 10002;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      animation: te-slideIn 0.3s ease-out;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'te-slideOut 0.3s ease-out forwards';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new TextEnhancer());
} else {
  new TextEnhancer();
}

// Handle dynamic content
const observer = new MutationObserver(() => {
  // Reinitialize if needed
});
observer.observe(document.body, { childList: true, subtree: true });