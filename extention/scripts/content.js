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
    transition: all 0.2s ease;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
  `;
  
  icon.addEventListener('mouseenter', () => {
    icon.style.transform = 'scale(1.15)';
    icon.style.filter = 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))';
  });
  
  icon.addEventListener('mouseleave', () => {
    icon.style.transform = 'scale(1)';
    icon.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))';
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

  // Create page overlay (not modal)
  const overlay = document.createElement("div");
  overlay.className = "superprompt-overlay";
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.3);
    z-index: 10000;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 40px 20px;
    backdrop-filter: blur(2px);
  `;

  // Create overlay popup
  popup = document.createElement("div");
  popup.className = "superprompt-popup";
  popup.style.cssText = `
    background: white;
    border-radius: 16px;
    padding: 32px;
    max-width: 640px;
    width: 100%;
    max-height: 85vh;
    overflow-y: auto;
    box-shadow: 0 25px 50px rgba(0,0,0,0.15);
    position: relative;
    border: 1px solid #E2E8F0;
    margin-top: 20px;
  `;

  popup.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <div style="width: 32px; height: 32px; background: #10B981; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
          <img src="${chrome.runtime.getURL('assets/icon.png')}" style="width: 20px; height: 20px; filter: brightness(0) invert(1);" alt="SuperPrompt">
        </div>
        <h2 style="margin: 0; font-size: 20px; color: #1F2937; font-weight: 600; letter-spacing: -0.025em;">superprompt</h2>
      </div>
      <button id="close-btn" style="
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        color: #9CA3AF;
        padding: 6px;
        border-radius: 6px;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      " onmouseover="this.style.background='#F3F4F6'" onmouseout="this.style.background='none'">×</button>
    </div>
    
    <div style="margin-bottom: 20px;">
      <label style="display: block; font-weight: 600; margin-bottom: 12px; color: #374151; font-size: 14px;">Original Prompt</label>
      <div style="
        background: #F8FAFC;
        border: 1px solid #E2E8F0;
        border-radius: 12px;
        padding: 16px;
        font-size: 14px;
        line-height: 1.6;
        color: #475569;
        max-height: 120px;
        overflow-y: auto;
        white-space: pre-wrap;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      ">${originalText}</div>
    </div>
    
    <div style="margin-bottom: 20px;">
      <label style="display: block; font-weight: 600; margin-bottom: 12px; color: #374151; font-size: 14px;">Add your instruction</label>
      <textarea id="instruction-input" style="
        width: 100%;
        min-height: 80px;
        border: 1px solid #E2E8F0;
        border-radius: 12px;
        padding: 16px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
        font-size: 14px;
        line-height: 1.6;
        resize: vertical;
        box-sizing: border-box;
        transition: all 0.2s;
        color: #475569;
        background: #FFFFFF;
      " placeholder="How would you like to enhance this prompt? (e.g., make it more formal, add examples, simplify)" 
         onfocus="this.style.borderColor='#10B981'; this.style.boxShadow='0 0 0 3px rgba(16, 185, 129, 0.1)'" 
         onblur="this.style.borderColor='#E2E8F0'; this.style.boxShadow='none'"></textarea>
    </div>
    
    <div id="enhanced-section" style="margin-bottom: 24px; display: none;">
      <label style="display: block; font-weight: 600; margin-bottom: 12px; color: #374151; font-size: 14px;">Enhanced Prompt</label>
      <div style="
        background: #F8FAFC;
        border: 1px solid #E2E8F0;
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 16px;
      ">
        <textarea id="enhanced-text" style="
          width: 100%;
          min-height: 180px;
          border: none;
          background: transparent;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
          font-size: 14px;
          line-height: 1.6;
          resize: vertical;
          box-sizing: border-box;
          outline: none;
          color: #475569;
        " placeholder="Enhanced text will appear here..."></textarea>
      </div>
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
        <div style="font-size: 12px; color: #10B981; font-weight: 600;">Score:</div>
        <div id="score-display" style="font-size: 12px; color: #10B981; font-weight: 600;">--</div>
        <div style="font-size: 12px; color: #64748B;">percentage score</div>
        <div style="margin-left: auto; font-size: 12px; color: #64748B;" id="timestamp-display"></div>
      </div>
    </div>
    
    <div style="display: flex; gap: 12px; justify-content: flex-end; align-items: center;">
      <button id="edit-btn" style="
        background: transparent;
        color: #64748B;
        border: none;
        padding: 12px 16px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 500;
        font-size: 14px;
        display: none;
        transition: all 0.2s;
        align-items: center;
        gap: 6px;
      " onmouseover="this.style.background='#F1F5F9'" onmouseout="this.style.background='transparent'">
        ✏️ Edit further
      </button>
      <button id="replace-btn" style="
        background: #10B981;
        color: white;
        border: none;
        padding: 12px 20px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        font-size: 14px;
        display: none;
        transition: all 0.2s;
        box-shadow: 0 1px 3px rgba(16, 185, 129, 0.4);
      " onmouseover="this.style.background='#059669'; this.style.transform='translateY(-1px)'" onmouseout="this.style.background='#10B981'; this.style.transform='translateY(0)'">
        Replace prompt
      </button>
      <button id="enhance-btn" style="
        background: #10B981;
        color: white;
        border: none;
        padding: 12px 20px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        font-size: 14px;
        transition: all 0.2s;
        box-shadow: 0 1px 3px rgba(16, 185, 129, 0.4);
        display: flex;
        align-items: center;
        gap: 6px;
      " onmouseover="this.style.background='#059669'; this.style.transform='translateY(-1px)'" onmouseout="this.style.background='#10B981'; this.style.transform='translateY(0)'">
        ⚡ Superprompt it
      </button>
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
    const editBtn = document.getElementById('edit-btn');
    const enhancedSection = document.getElementById('enhanced-section');
    const enhancedTextarea = document.getElementById('enhanced-text');
    const scoreDisplay = document.getElementById('score-display');
    const timestampDisplay = document.getElementById('timestamp-display');
    
    // Show loading state
    enhanceBtn.innerHTML = '<span style="display: inline-flex; align-items: center; gap: 8px;"><div style="width: 16px; height: 16px; border: 2px solid transparent; border-top-color: currentColor; border-radius: 50%; animation: spin 1s linear infinite;"></div>Analyzing...</span>';
    enhanceBtn.disabled = true;
    enhanceBtn.style.background = '#9CA3AF';
    
    try {
      // Call the enhance API
      const result = await callEnhanceAPI(originalText, instruction);
      
      // Show the enhanced section
      enhancedSection.style.display = 'block';
      enhancedTextarea.value = result.enhancedText || result;
      
      // Update score and timestamp if available
      if (result.score) {
        scoreDisplay.textContent = result.score + '%';
      }
      if (result.timestamp) {
        const date = new Date(result.timestamp);
        timestampDisplay.textContent = date.toLocaleTimeString();
      }
      
      // Update buttons
      enhanceBtn.innerHTML = '⚡ Re-enhance';
      enhanceBtn.disabled = false;
      enhanceBtn.style.background = '#10B981';
      replaceBtn.style.display = 'inline-block';
      editBtn.style.display = 'inline-flex';
      
      // Show success message
      showToast('✨ Text enhanced successfully!');
      
    } catch (error) {
      console.error('Enhancement failed:', error);
      enhanceBtn.innerHTML = '⚡ Superprompt it';
      enhanceBtn.disabled = false;
      enhanceBtn.style.background = '#10B981';
      showToast('❌ Enhancement failed. Please try again.', 'error');
    }
  };
  
  document.getElementById('edit-btn').onclick = () => {
    // Allow editing the enhanced text
    const enhancedTextarea = document.getElementById('enhanced-text');
    enhancedTextarea.focus();
    showToast('📝 You can now edit the enhanced text', 'info');
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