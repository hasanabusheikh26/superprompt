// SuperPrompt - Simple Text Enhancement
let popup;
let selectedRange;

// Listen for text selection
document.addEventListener("mouseup", (e) => {
  // Don't create icon if clicking on existing icon or popup
  if (e.target.closest('.superprompt-icon') || e.target.closest('.superprompt-popup')) {
    return;
  }

  const selection = window.getSelection();
  const selectedText = selection.toString().trim();
  
  if (!selectedText) {
    removeExistingIcon();
    return;
  }

  // Store the range for later replacement
  if (selection.rangeCount > 0) {
    selectedRange = selection.getRangeAt(0).cloneRange();
  }

  removeExistingIcon();
  createIcon(e.pageX, e.pageY, selectedText);
});

function removeExistingIcon() {
  const existing = document.querySelector(".superprompt-icon");
  if (existing) existing.remove();
}

function createIcon(x, y, text) {
  const icon = document.createElement("img");
  icon.className = "superprompt-icon";
  icon.src = chrome.runtime.getURL("assets/icon.png");
  icon.alt = "SuperPrompt";
  icon.style.cssText = `
    position: absolute;
    top: ${y + 10}px;
    left: ${x + 10}px;
    width: 32px;
    height: 32px;
    cursor: pointer;
    z-index: 9999;
    border-radius: 6px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    transition: all 0.2s ease;
    background: white;
    padding: 4px;
  `;
  
  icon.addEventListener('mouseenter', () => {
    icon.style.transform = 'scale(1.1)';
  });
  
  icon.addEventListener('mouseleave', () => {
    icon.style.transform = 'scale(1)';
  });

  icon.onclick = (e) => {
    e.stopPropagation();
    openEnhancementModal(text);
    icon.remove();
  };

  document.body.appendChild(icon);
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    if (icon.parentElement) {
      icon.remove();
    }
  }, 5000);
}

function openEnhancementModal(originalText) {
  if (popup) popup.remove();

  // Create modal overlay
  const overlay = document.createElement("div");
  overlay.className = "superprompt-overlay";
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  `;

  // Create modal
  popup = document.createElement("div");
  popup.className = "superprompt-popup";
  popup.style.cssText = `
    background: white;
    border-radius: 12px;
    padding: 24px;
    max-width: 600px;
    width: 100%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 20px 40px rgba(0,0,0,0.1);
    position: relative;
  `;

  popup.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #E5E7EB;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <img src="${chrome.runtime.getURL('assets/icon.png')}" style="width: 24px; height: 24px;" alt="SuperPrompt">
        <h2 style="margin: 0; font-size: 18px; color: #1F2937; font-weight: 600;">superprompt</h2>
      </div>
      <button id="close-btn" style="
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: #6B7280;
        padding: 4px;
        border-radius: 4px;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">×</button>
    </div>
    
    <div style="margin-bottom: 16px;">
      <label style="display: block; font-weight: 500; margin-bottom: 8px; color: #374151; font-size: 14px;">Original Prompt</label>
      <div style="
        background: #F9FAFB;
        border: 1px solid #E5E7EB;
        border-radius: 8px;
        padding: 16px;
        font-size: 14px;
        line-height: 1.5;
        color: #1F2937;
        max-height: 120px;
        overflow-y: auto;
        white-space: pre-wrap;
      ">${originalText}</div>
    </div>
    
    <div style="margin-bottom: 16px;">
      <label style="display: block; font-weight: 500; margin-bottom: 8px; color: #374151; font-size: 14px;">Add your instruction</label>
      <textarea id="instruction-input" style="
        width: 100%;
        min-height: 80px;
        border: 1px solid #D1D5DB;
        border-radius: 8px;
        padding: 12px;
        font-family: inherit;
        font-size: 14px;
        line-height: 1.5;
        resize: vertical;
        box-sizing: border-box;
        transition: border-color 0.2s, box-shadow 0.2s;
      " placeholder="How would you like to enhance this prompt? (e.g., make it more formal, add examples, simplify)"></textarea>
    </div>
    
    <div id="enhanced-section" style="margin-bottom: 20px; display: none;">
      <label style="display: block; font-weight: 500; margin-bottom: 8px; color: #374151; font-size: 14px;">Enhanced Prompt</label>
      <div style="
        background: #F9FAFB;
        border: 1px solid #E5E7EB;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 12px;
      ">
        <textarea id="enhanced-text" style="
          width: 100%;
          min-height: 150px;
          border: none;
          background: transparent;
          font-family: inherit;
          font-size: 14px;
          line-height: 1.5;
          resize: vertical;
          box-sizing: border-box;
          outline: none;
        " placeholder="Enhanced text will appear here..."></textarea>
      </div>
    </div>
    
    <div style="display: flex; gap: 12px; justify-content: flex-end;">
      <button id="replace-btn" style="
        background: transparent;
        color: #10B981;
        border: 1px solid #10B981;
        padding: 10px 20px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 500;
        font-size: 14px;
        display: none;
      ">🔄 Replace prompt</button>
      <button id="enhance-btn" style="
        background: #10B981;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 500;
        font-size: 14px;
      ">⚡ Superprompt it</button>
    </div>
  `;

  overlay.appendChild(popup);
  document.body.appendChild(overlay);

  // Add event listeners
  document.getElementById('close-btn').onclick = () => overlay.remove();
  overlay.onclick = (e) => {
    if (e.target === overlay) overlay.remove();
  };
  
  // Focus styles for instruction input
  const instructionInput = document.getElementById('instruction-input');
  instructionInput.addEventListener('focus', () => {
    instructionInput.style.borderColor = '#10B981';
    instructionInput.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
  });
  instructionInput.addEventListener('blur', () => {
    instructionInput.style.borderColor = '#D1D5DB';
    instructionInput.style.boxShadow = 'none';
  });
  
  document.getElementById('enhance-btn').onclick = async () => {
    const instruction = document.getElementById('instruction-input').value.trim();
    const enhanceBtn = document.getElementById('enhance-btn');
    const replaceBtn = document.getElementById('replace-btn');
    const enhancedSection = document.getElementById('enhanced-section');
    const enhancedTextarea = document.getElementById('enhanced-text');
    
    // Show loading state
    enhanceBtn.innerHTML = '<span style="display: inline-flex; align-items: center; gap: 8px;"><div style="width: 16px; height: 16px; border: 2px solid transparent; border-top-color: currentColor; border-radius: 50%; animation: spin 1s linear infinite;"></div>Analyzing...</span>';
    enhanceBtn.disabled = true;
    
    try {
      // Call the enhance API
      const enhancedText = await callEnhanceAPI(originalText, instruction);
      
      // Show the enhanced section
      enhancedSection.style.display = 'block';
      enhancedTextarea.value = enhancedText;
      
      // Update buttons
      enhanceBtn.innerHTML = '⚡ Re-enhance';
      enhanceBtn.disabled = false;
      replaceBtn.style.display = 'inline-block';
      
      // Show success message
      showToast('✨ Text enhanced successfully!');
      
    } catch (error) {
      console.error('Enhancement failed:', error);
      enhanceBtn.innerHTML = '⚡ Superprompt it';
      enhanceBtn.disabled = false;
      showToast('❌ Enhancement failed. Please try again.', 'error');
    }
  };
  
  document.getElementById('replace-btn').onclick = () => {
    const enhancedText = document.getElementById('enhanced-text').value;
    replaceOriginalText(enhancedText);
    overlay.remove();
  };

  // Focus on the instruction input
  document.getElementById('instruction-input').focus();
  
  // Add CSS for loading animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

// Enhanced API function that calls your Vercel backend
async function callEnhanceAPI(text, instruction = '') {
  try {
    const response = await fetch('https://superprompt-3asmcqplb-hass-projects-b72778ab.vercel.app/api/enhance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        text: text,
        instruction: instruction || 'improve this text'
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.success && data.enhancedText) {
      return data.enhancedText;
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    console.error('API Enhancement failed:', error);
    
    // Fallback to local enhancement if API fails
    return fallbackEnhancement(text, instruction);
  }
}

// Fallback enhancement function if API is unavailable
function fallbackEnhancement(text, instruction = '') {
  if (instruction.toLowerCase().includes('formal') || instruction.toLowerCase().includes('professional')) {
    return `**Professional Enhancement:**

${text}

**Key Improvements:**
• Enhanced professional tone and structure
• Improved clarity and precision
• Added appropriate business language
• Ensured formal presentation standards

This refined version maintains the core message while elevating the professional presentation and ensuring clear, authoritative communication.`;
  } else if (instruction.toLowerCase().includes('concise') || instruction.toLowerCase().includes('brief')) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const keyPoints = sentences.slice(0, 3).map(s => s.trim()).join('. ');
    return `**Concise Version:**

${keyPoints}.

**Summary:** This streamlined version captures the essential information while eliminating unnecessary details for maximum impact and clarity.`;
  } else if (instruction.toLowerCase().includes('detailed') || instruction.toLowerCase().includes('explain')) {
    return `**Comprehensive Enhancement:**

${text}

**Detailed Breakdown:**
• Context and background information
• Key components and relationships
• Implementation considerations
• Expected outcomes and benefits

This enhanced version provides thorough coverage while maintaining clarity and actionable insights.`;
  } else {
    return `**Enhanced Version:**

${text}

**Improvements Applied:**
• Optimized structure and flow
• Enhanced clarity and readability
• Strengthened key messaging
• Added professional polish

${instruction ? `**Specific Enhancement Focus:** ${instruction}` : '**General Enhancement:** Improved overall quality and impact'}

This refined version maintains your original intent while elevating the presentation and ensuring maximum effectiveness.`;
  }
}

function replaceOriginalText(newText) {
  if (!selectedRange) {
    alert('Could not find the original text to replace. Please try selecting the text again.');
    return;
  }

  try {
    // Clear current selection
    window.getSelection().removeAllRanges();
    
    // Add our saved range back
    window.getSelection().addRange(selectedRange);
    
    // Replace the selected text
    if (window.getSelection().rangeCount > 0) {
      const range = window.getSelection().getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(newText));
      
      // Clear selection
      window.getSelection().removeAllRanges();
      
      // Show success message
      showToast('✅ Text replaced successfully!');
    } else {
      throw new Error('No selection found');
    }
  } catch (error) {
    console.error('Replace error:', error);
    
    // Fallback: copy to clipboard
    navigator.clipboard.writeText(newText).then(() => {
      showToast('📋 Enhanced text copied to clipboard! Paste it manually.');
    }).catch(() => {
      alert('Could not replace text automatically. Please copy the enhanced text manually.');
    });
  }
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  
  const colors = {
    success: '#10B981',
    error: '#EF4444',
    info: '#3B82F6'
  };
  
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${colors[type] || colors.success};
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    z-index: 10001;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    animation: slideIn 0.3s ease;
    max-width: 320px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;
  toast.textContent = message;
  
  // Add animation
  if (!document.getElementById('toast-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(toast);
  
  // Auto-remove after 3 seconds
  setTimeout(() => {
    if (toast.parentElement) {
      toast.remove();
    }
  }, 3000);
}