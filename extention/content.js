// Content.js - Optional content script for future text selection features

class ContentManager {
  constructor() {
    this.selectedText = '';
    this.init();
  }

  init() {
    // Listen for text selection events
    document.addEventListener('mouseup', () => this.handleTextSelection());
    document.addEventListener('keyup', () => this.handleTextSelection());
    
    // Listen for messages from popup/background
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true;
    });
  }

  handleTextSelection() {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    if (selectedText && selectedText.length > 10) {
      this.selectedText = selectedText;
      
      // Optionally show a small enhancement button near selection
      // This would be implemented based on your UX requirements
      // For now, we just store the selected text
    }
  }

  handleMessage(request, sender, sendResponse) {
    switch (request.action) {
      case 'getSelectedText':
        sendResponse({ 
          success: true, 
          selectedText: this.selectedText || this.getSelectedText() 
        });
        break;
        
      case 'insertEnhancedText':
        this.insertEnhancedText(request.originalText, request.enhancedText);
        sendResponse({ success: true });
        break;
        
      default:
        sendResponse({ success: false, error: 'Unknown action' });
    }
  }

  getSelectedText() {
    const selection = window.getSelection();
    return selection.toString().trim();
  }

  insertEnhancedText(originalText, enhancedText) {
    // Find and replace the original text with enhanced text
    // This is a basic implementation - you might need more sophisticated logic
    // depending on the context and requirements
    
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      
      // Check if the selection matches the original text
      if (selection.toString().trim() === originalText.trim()) {
        // Replace the selected text with enhanced text
        range.deleteContents();
        range.insertNode(document.createTextNode(enhancedText));
        
        // Clear selection
        selection.removeAllRanges();
      }
    }
  }

  // Future feature: Show enhancement overlay
  showEnhancementOverlay(selectedText) {
    // Remove any existing overlay
    this.removeEnhancementOverlay();
    
    // Create overlay element
    const overlay = document.createElement('div');
    overlay.id = 'prompt-enhancer-overlay';
    overlay.innerHTML = `
      <div style="
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border: 1px solid #ccc;
        border-radius: 8px;
        padding: 16px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        max-width: 400px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ">
        <h3 style="margin: 0 0 12px 0; font-size: 16px;">Enhance this text?</h3>
        <p style="margin: 0 0 16px 0; font-size: 14px; color: #666; max-height: 100px; overflow-y: auto;">
          ${selectedText}
        </p>
        <div style="display: flex; gap: 8px;">
          <button id="enhance-yes" style="
            background: #2563eb;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
          ">Enhance</button>
          <button id="enhance-no" style="
            background: #6b7280;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
          ">Cancel</button>
        </div>
      </div>
    `;
    
    // Add event listeners
    overlay.querySelector('#enhance-yes').addEventListener('click', () => {
      this.enhanceSelectedText(selectedText);
      this.removeEnhancementOverlay();
    });
    
    overlay.querySelector('#enhance-no').addEventListener('click', () => {
      this.removeEnhancementOverlay();
    });
    
    // Add to page
    document.body.appendChild(overlay);
    
    // Remove on escape key
    const escapeHandler = (e) => {
      if (e.key === 'Escape') {
        this.removeEnhancementOverlay();
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);
  }

  removeEnhancementOverlay() {
    const existing = document.getElementById('prompt-enhancer-overlay');
    if (existing) {
      existing.remove();
    }
  }

  async enhanceSelectedText(text) {
    try {
      // Send message to background script to enhance text
      const response = await chrome.runtime.sendMessage({
        action: 'enhancePrompt',
        prompt: text,
        enhancementType: 'improve'
      });
      
      if (response.success) {
        // Replace the selected text with enhanced version
        this.insertEnhancedText(text, response.enhancedPrompt);
      } else {
        console.error('Enhancement failed:', response.error);
      }
      
    } catch (error) {
      console.error('Enhancement error:', error);
    }
  }
}

// Initialize content manager
new ContentManager();

// Prevent content script from running multiple times
if (!window.promptEnhancerContentLoaded) {
  window.promptEnhancerContentLoaded = true;
  console.log('Prompt Enhancer content script loaded');
}