let popup;
let auth = null;

// Initialize auth system
document.addEventListener('DOMContentLoaded', () => {
  auth = new SuperPromptAuth();
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

  popup = document.createElement("div");
  popup.className = "superprompt-popup";
  popup.innerHTML = `
    <div class="popup-header">
      <img src="${chrome.runtime.getURL('assets/icon.png')}" style="width: 20px; height: 20px;" />
      <span style="flex: 1; text-align: center; font-weight: 600;">SuperPrompt</span>
      <button id="close-popup">✕</button>
    </div>
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
    
    const response = await fetch("https://superprompt-nwhqu7jm8-hass-projects-b72778ab.vercel.app/api/enhance", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text: text,
        instruction: instruction
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.success && data.enhancedText) {
      return data.enhancedText;
    } else {
      return data.error || "Error: No enhanced text received";
    }
  } catch (error) {
    console.error('Fetch error:', error);
    return `Error: ${error.message}`;
  }
}