let popup;
let auth = null;

// Initialize auth system
document.addEventListener('DOMContentLoaded', () => {
  auth = new SuperPromptAuth();
  
  // Listen for auth success events
  window.addEventListener('superprompt:auth-success', () => {
    // Refresh any open popups
    if (popup) {
      const text = document.querySelector('.original')?.textContent || '';
      openPopup(text, null);
    }
  });
  
  window.addEventListener('superprompt:logout', () => {
    // Refresh any open popups
    if (popup) {
      const text = document.querySelector('.original')?.textContent || '';
      openPopup(text, null);
    }
  });
});

document.addEventListener("mouseup", (e) => {
  // Don't create icon if clicking on existing icon or popup
  if (e.target.closest('.superprompt-icon') || e.target.closest('.superprompt-popup')) {
    return;
  }

  const selection = window.getSelection().toString().trim();
  if (!selection) {
    removeExistingIcon();
    return;
  }

  removeExistingIcon();
  const icon = document.createElement("img");
  icon.src = chrome.runtime.getURL("assets/icon.png");
  icon.className = "superprompt-icon";
  icon.style.position = "absolute";
  icon.style.top = `${e.pageY + 10}px`;
  icon.style.left = `${e.pageX + 10}px`;
  icon.style.transition = "opacity 0.3s ease";
  icon.style.opacity = "0";
  icon.style.cursor = "pointer";
  document.body.appendChild(icon);
  requestAnimationFrame(() => (icon.style.opacity = "1"));

  icon.onclick = (e) => {
    e.stopPropagation();
    openPopup(selection, icon);
  };
});

function removeExistingIcon() {
  const existing = document.querySelector(".superprompt-icon");
  if (existing) existing.remove();
}

function openPopup(text, icon) {
  if (popup) popup.remove();

  // Get user info for display
  const currentUser = auth ? auth.getCurrentUser() : null;
  const isLoggedIn = auth ? auth.isLoggedIn() : false;
  
  const userInfo = isLoggedIn && currentUser ? 
    `<div class="user-info">
      <span class="user-email">${currentUser.email}</span>
      <button id="logout-btn" class="logout-btn">Logout</button>
    </div>` : 
    `<div class="user-info">
      <span class="login-status">Not logged in</span>
      <button id="login-btn" class="login-btn">Login</button>
    </div>`;

  popup = document.createElement("div");
  popup.className = "superprompt-popup";
  popup.innerHTML = `
    <div class="popup-header">
      <img src="${chrome.runtime.getURL('assets/icon.png')}" style="width: 20px; height: 20px;" />
      <span style="flex: 1; text-align: center; font-weight: 600;">SuperPrompt</span>
      <button id="close-popup">✕</button>
    </div>
    ${userInfo}
    <pre class="original">${text}</pre>
    <textarea id="instruction" placeholder="Give feedback or add style (e.g., formal, concise)"></textarea>
    <div class="presets">
      <button class="preset">Step-by-step guide</button>
      <button class="preset">Clear and concise</button>
      <button class="preset">Make it friendly</button>
      <button class="preset">Detailed explanation</button>
      <button class="preset">Simple language</button>
    </div>
    <button id="generate">Superprompt it</button>
    <pre id="result"></pre>
    <div id="post-actions" style="display: none">
      <button id="edit">Edit prompt</button>
      <button id="replace">Replace in page</button>
    </div>
  `;

  popup.style.position = "fixed";
  popup.style.top = "20%";
  popup.style.left = "50%";
  popup.style.transform = "translateX(-50%)";
  popup.style.background = "white";
  popup.style.padding = "20px";
  popup.style.zIndex = "9999";
  popup.style.boxShadow = "0 0 15px rgba(0,0,0,0.2)";
  popup.style.borderRadius = "10px";
  popup.style.width = "340px";
  popup.style.transition = "opacity 0.3s ease, transform 0.3s ease";
  popup.style.opacity = "0";

  document.body.appendChild(popup);
  requestAnimationFrame(() => (popup.style.opacity = "1"));

  document.getElementById("close-popup").onclick = () => popup.remove();

  // Display user info if logged in
  if (auth && auth.isLoggedIn()) {
    const user = auth.getCurrentUser();
    if (user) {
      const userInfo = document.createElement('div');
      userInfo.className = 'user-info';
      userInfo.innerHTML = `
        <span class="user-email">${user.email}</span>
        <button class="logout-btn" onclick="localStorage.removeItem('superprompt_token'); this.parentElement.remove();">Logout</button>
      `;
      popup.insertBefore(userInfo, popup.firstChild);
    }
  }

  // Handle login/logout buttons
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");
  
  if (loginBtn) {
    loginBtn.onclick = () => {
      // Open auth page in new tab
      chrome.tabs.create({ url: chrome.runtime.getURL('auth-ui.html') });
    };
  }
  
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      if (auth) {
        auth.logout();
        // Refresh the popup to show login status
        openPopup(text, icon);
      }
    };
  }

  document.querySelectorAll(".preset").forEach((btn) => {
    btn.onclick = () => {
      document.getElementById("instruction").value = btn.innerText;
    };
  });

  document.getElementById("generate").onclick = async () => {
    const instruction = document.getElementById("instruction").value;
    const prompt = `${instruction}\n\n${text}`;
    document.getElementById("generate").innerText = "Analyzing...";
    const result = await fetchGPT(prompt);
    document.getElementById("result").textContent = result;
    document.getElementById("generate").style.display = "none";
    document.getElementById("post-actions").style.display = "flex";
  };

  document.getElementById("replace").onclick = () => {
    const range = window.getSelection().getRangeAt(0);
    const resultText = document.getElementById("result").textContent;
    if (range) {
      range.deleteContents();
      range.insertNode(document.createTextNode(resultText));
    }
    popup.remove();
  };

  document.getElementById("edit").onclick = () => {
    document.getElementById("generate").innerText = "Superprompt it";
    document.getElementById("generate").style.display = "block";
    document.getElementById("post-actions").style.display = "none";
  };
}

async function fetchGPT(prompt) {
  try {
    // Split the prompt into instruction and text
    const parts = prompt.split('\n\n');
    const instruction = parts[0] || 'improve';
    const text = parts[1] || prompt;
    
    // Use mock enhancement for now since backend has authentication issues
    return await mockEnhancement(text, instruction);
  } catch (error) {
    console.error('Fetch error:', error);
    return `Error: ${error.message}`;
  }
}

// Mock enhancement function
function mockEnhancement(text, instruction) {
  return new Promise((resolve) => {
    setTimeout(() => {
      let enhancedText = text;
      
      if (instruction) {
        switch (instruction.toLowerCase()) {
          case 'make it formal':
          case 'formal':
            enhancedText = `Dear Reader,\n\nI would like to present the following information: ${text}\n\nThank you for your attention.\n\nSincerely,\nSuperPrompt`;
            break;
          case 'make it friendly':
          case 'friendly':
            enhancedText = `Hey there! 😊\n\n${text}\n\nHope this helps! Let me know if you need anything else!`;
            break;
          case 'clear and concise':
          case 'concise':
            enhancedText = text.split('.')[0] + '.';
            break;
          case 'detailed explanation':
          case 'detailed':
            enhancedText = `${text}\n\nLet me explain this in more detail:\n- This is an important point\n- Consider the context\n- Think about the implications\n\nIn summary: ${text}`;
            break;
          case 'simple language':
          case 'simple':
            enhancedText = `In simple terms: ${text}`;
            break;
          case 'step-by-step guide':
            enhancedText = `Here's a step-by-step guide:\n\n1. Start with: ${text}\n2. Consider the context\n3. Apply the changes\n4. Review the results\n\nThis approach ensures clarity and effectiveness.`;
            break;
          default:
            enhancedText = `✨ Enhanced version: ${text}\n\nInstruction applied: ${instruction}`;
        }
      } else {
        enhancedText = `✨ Enhanced: ${text}\n\nThis text has been processed by SuperPrompt for better clarity and impact.`;
      }
      
      resolve(enhancedText);
    }, 800); // Simulate processing time
  });
}