// SuperPrompt - Local AI Text Enhancement (v2.0)
console.log('🚀 SuperPrompt Extension loaded - Local AI Version');
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
  const icon = document.createElement("div");
  icon.className = "superprompt-icon";
  icon.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" fill="#10B981"/>
      <path d="M19 15L19.5 17.5L22 18L19.5 18.5L19 21L18.5 18.5L16 18L18.5 17.5L19 15Z" fill="#10B981"/>
      <path d="M5 15L5.5 17.5L8 18L5.5 18.5L5 21L4.5 18.5L2 18L4.5 17.5L5 15Z" fill="#10B981"/>
    </svg>
  `;
  icon.alt = "SuperPrompt";
  icon.style.cssText = `
    position: absolute;
    top: ${y + 10}px;
    left: ${x + 10}px;
    width: 24px;
    height: 24px;
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
    background: transparent;
    z-index: 10000;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 40px 20px;
    pointer-events: none;
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
    box-shadow: 0 25px 50px rgba(0,0,0,0.25);
    position: relative;
    border: 1px solid #E2E8F0;
    margin-top: 20px;
    pointer-events: auto;
  `;

  popup.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <div style="width: 32px; height: 32px; background: #10B981; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" fill="white"/>
            <path d="M19 15L19.5 17.5L22 18L19.5 18.5L19 21L18.5 18.5L16 18L18.5 17.5L19 15Z" fill="white"/>
            <path d="M5 15L5.5 17.5L8 18L5.5 18.5L5 21L4.5 18.5L2 18L4.5 17.5L5 15Z" fill="white"/>
          </svg>
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
      ">×</button>
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
      " placeholder="How would you like to enhance this prompt? (e.g., make it more formal, add examples, simplify)"></textarea>
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
      ">
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
      ">
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
      ">
        ⚡ Superprompt it
      </button>
    </div>
  `;

  overlay.appendChild(popup);
  document.body.appendChild(overlay);

  // Add event listeners
  document.getElementById('close-btn').onclick = () => overlay.remove();
  
  // Handle clicks outside the popup
  popup.addEventListener('click', (e) => {
    e.stopPropagation();
  });
  
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  
  // Focus styles for instruction input
  const instructionInput = document.getElementById('instruction-input');
  instructionInput.addEventListener('focus', () => {
    instructionInput.style.borderColor = '#10B981';
    instructionInput.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
  });
  instructionInput.addEventListener('blur', () => {
    instructionInput.style.borderColor = '#E2E8F0';
    instructionInput.style.boxShadow = 'none';
  });
  
  // Add hover effects for buttons
  const closeBtn = document.getElementById('close-btn');
  closeBtn.addEventListener('mouseenter', () => {
    closeBtn.style.background = '#F3F4F6';
  });
  closeBtn.addEventListener('mouseleave', () => {
    closeBtn.style.background = 'none';
  });
  
  const editBtn = document.getElementById('edit-btn');
  editBtn.addEventListener('mouseenter', () => {
    editBtn.style.background = '#F1F5F9';
  });
  editBtn.addEventListener('mouseleave', () => {
    editBtn.style.background = 'transparent';
  });
  
  const replaceBtn = document.getElementById('replace-btn');
  replaceBtn.addEventListener('mouseenter', () => {
    replaceBtn.style.background = '#059669';
    replaceBtn.style.transform = 'translateY(-1px)';
  });
  replaceBtn.addEventListener('mouseleave', () => {
    replaceBtn.style.background = '#10B981';
    replaceBtn.style.transform = 'translateY(0)';
  });
  
  const enhanceBtn = document.getElementById('enhance-btn');
  enhanceBtn.addEventListener('mouseenter', () => {
    enhanceBtn.style.background = '#059669';
    enhanceBtn.style.transform = 'translateY(-1px)';
  });
  enhanceBtn.addEventListener('mouseleave', () => {
    enhanceBtn.style.background = '#10B981';
    enhanceBtn.style.transform = 'translateY(0)';
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

// Local enhancement function (no API calls)
async function callEnhanceAPI(text, instruction = '') {
  console.log('🔧 Using LOCAL enhancement system (no API calls)');
  
  // Simulate API delay for realistic UX
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Use local enhancement system
  const result = localEnhancement(text, instruction);
  
  console.log('✅ Local enhancement completed:', result);
  
  return {
    enhancedText: result.enhancedText,
    score: result.score,
    timestamp: new Date().toISOString()
  };
}

// Local enhancement function with SuperPrompt AI system
function localEnhancement(text, instruction = '') {
  // Analyze input based on SuperPrompt guidelines
  if (!text || text.trim().length < 3) {
    return {
      enhancedText: "This input is unclear. Can you rephrase or give more detail?",
      score: 0
    };
  }

  // Check for vague inputs
  const vaguePatterns = ['make this better', 'improve this', 'fix this', 'help me', 'hello', 'hi', 'can you help', 'please help'];
  if (vaguePatterns.some(pattern => text.toLowerCase().includes(pattern)) && text.length < 20) {
    return {
      enhancedText: "This prompt doesn't contain a specific task or context. Please specify:\n• What you want to generate or accomplish\n• The target audience or use case\n• Any specific requirements or constraints\n\nExample: 'Create a social media campaign for a product launch' instead of 'help me with marketing'",
      score: 0
    };
  }

  const instructionLower = instruction.toLowerCase();
  let enhancedText = '';
  let score = 85; // Default score

  // Determine enhancement type based on instruction
  if (instructionLower.includes('formal') || instructionLower.includes('professional')) {
    enhancedText = `**Professional AI Prompt:**

${text}

**Context & Requirements:**
• Target audience: Professional/business context
• Output format: Structured and formal
• Tone: Authoritative and clear
• Length: Comprehensive but focused

**Success criteria:**
• Delivers actionable, professional-grade results
• Uses appropriate business language
• Maintains clarity and precision
• Follows industry best practices

*This prompt is optimized for professional AI tools like ChatGPT, Claude, or Gemini.*`;
    score = 92;
  } else if (instructionLower.includes('detailed') || instructionLower.includes('comprehensive') || instructionLower.includes('explain')) {
    enhancedText = `**Detailed AI Prompt:**

${text}

**Detailed Instructions:**
• Break down the task into clear components
• Provide comprehensive coverage of the topic
• Include relevant context and background
• Consider multiple perspectives or approaches

**Expected Output:**
• Thorough analysis or response
• Step-by-step breakdown when applicable
• Supporting details and examples
• Actionable recommendations

**Quality Standards:**
• Evidence-based information
• Clear structure and organization
• Practical applicability
• Professional presentation

*Optimized for in-depth AI analysis and detailed responses.*`;
    score = 93;
  } else if (instructionLower.includes('concise') || instructionLower.includes('brief') || instructionLower.includes('short')) {
    const coreRequest = text.split('.')[0] || text;
    enhancedText = `**Concise AI Prompt:**

${coreRequest}

**Requirements:**
• Keep response brief and focused
• Prioritize key information only
• Use bullet points or numbered lists
• Avoid unnecessary details

**Output format:**
• Direct and actionable
• Maximum clarity with minimum words
• Essential points only

*Optimized for quick, focused AI responses.*`;
    score = 88;
  } else if (instructionLower.includes('friendly') || instructionLower.includes('casual')) {
    enhancedText = `**Conversational AI Prompt:**

${text}

**Tone & Style:**
• Friendly and approachable
• Conversational but informative
• Warm and engaging
• Accessible to general audience

**Response Guidelines:**
• Use relatable examples and analogies
• Maintain enthusiasm and positivity
• Include encouraging language
• Make complex topics easy to understand

**Success criteria:**
• Creates connection with audience
• Maintains professional quality
• Easy to understand and follow
• Engaging and memorable

*This prompt creates warm, accessible AI responses while maintaining quality.*`;
    score = 87;
  } else if (instructionLower.includes('simple') || instructionLower.includes('easy')) {
    enhancedText = `**Simple AI Prompt:**

${text}

**Simplification Requirements:**
• Use plain, everyday language
• Avoid jargon and technical terms
• Break complex ideas into basic concepts
• Include relatable examples

**Output format:**
• Short sentences and paragraphs
• Clear, logical progression
• Visual elements (bullets, numbers) when helpful
• Easy to scan and understand

**Target audience:**
• General public or beginners
• No specialized knowledge assumed
• Accessible to all education levels

*This prompt ensures AI responses are clear and accessible to everyone.*`;
    score = 84;
  } else if (instructionLower.includes('step') || instructionLower.includes('guide')) {
    enhancedText = `**Step-by-Step AI Prompt:**

${text}

**Structure Requirements:**
• Break down into sequential phases
• Number each step clearly
• Include substeps when necessary
• Provide checkpoints and validation

**Expected format:**
• Phase-based organization
• Clear prerequisites for each step
• Actionable instructions
• Expected outcomes for each phase

**Success criteria:**
• Easy to follow progression
• No steps skipped or assumed
• Clear completion criteria
• Practical implementation focus

*This prompt generates systematic, implementable step-by-step guidance.*`;
    score = 90;
  } else {
    // General enhancement
    enhancedText = `**Enhanced AI Prompt:**

${text}

**Context:**
• Purpose: [Specify the goal or outcome needed]
• Audience: [Define who will use this information]
• Format: [Describe preferred response structure]

**Instructions:**
• Provide clear, actionable guidance
• Use structured formatting (bullets, numbers, headers)
• Include relevant examples where helpful
• Ensure response is immediately usable

**Success metrics:**
• Clarity and usefulness of output
• Appropriate depth and detail
• Professional quality and accuracy

${instruction ? `**Special Focus:** ${instruction}` : ''}

*This prompt is structured for optimal AI tool performance across ChatGPT, Claude, Gemini, and similar platforms.*`;
    score = 87;
  }

  return {
    enhancedText,
    score
  };
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