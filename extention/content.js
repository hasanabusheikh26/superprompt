// Minimal SuperPrompt Content Script
let userSignedIn = false;

// Check sign-in status from storage
chrome.storage.local.get(['superprompt_signedin'], (res) => {
  userSignedIn = !!res.superprompt_signedin;
});

chrome.storage.onChanged.addListener((changes) => {
  if ('superprompt_signedin' in changes) {
    userSignedIn = changes.superprompt_signedin.newValue;
  }
});

// ---- UI + Enhance Logic ----
let floatingIcon, popupDiv, selectionRange;

document.addEventListener('mouseup', (e) => {
  if (!userSignedIn) return;
  const selection = window.getSelection();
  if (selection && selection.toString().length > 2 && selection.rangeCount) {
    selectionRange = selection.getRangeAt(0);
    showFloatingIcon(e.clientX, e.clientY);
  } else {
    removeFloatingIcon();
    removePopup();
  }
});

function showFloatingIcon(x, y) {
  removeFloatingIcon();
  floatingIcon = document.createElement("div");
  floatingIcon.className = "superprompt-floating-icon";
  floatingIcon.style.top = (window.scrollY + y + 10) + "px";
  floatingIcon.style.left = (window.scrollX + x - 10) + "px";
  floatingIcon.style.position = "absolute";
  floatingIcon.innerHTML = `<img src="${chrome.runtime.getURL('icon.png')}" style="width:24px;height:24px;border-radius:50%;">`;
  floatingIcon.onclick = () => {
    showPopup();
    removeFloatingIcon();
  };
  document.body.appendChild(floatingIcon);
}

function removeFloatingIcon() {
  if (floatingIcon) floatingIcon.remove();
  floatingIcon = null;
}

function showPopup() {
  removePopup();
  popupDiv = document.createElement("div");
  popupDiv.className = "superprompt-mini-popup";
  popupDiv.style.position = "fixed";
  popupDiv.style.top = "25%";
  popupDiv.style.left = "50%";
  popupDiv.style.transform = "translate(-50%, -50%)";
  popupDiv.style.zIndex = 2147483647;

  popupDiv.innerHTML = `
    <div style="font-weight:bold;font-size:15px;margin-bottom:10px;">Enhance your text</div>
    <textarea id="superprompt_input" style="width:100%;height:80px;">${window.getSelection().toString()}</textarea>
    <input id="superprompt_instruction" placeholder="How should we enhance?" style="width:100%;margin:8px 0;" />
    <button id="superprompt_enhance_btn" style="width:100%;margin-bottom:4px;">Enhance</button>
    <div id="superprompt_result" style="margin-top:8px;font-size:14px;"></div>
    <button id="superprompt_replace_btn" style="width:100%;margin-top:6px;display:none;">Replace selection</button>
    <button id="superprompt_close_btn" style="width:100%;margin-top:3px;">Close</button>
  `;

  document.body.appendChild(popupDiv);

  document.getElementById("superprompt_enhance_btn").onclick = async function () {
    const text = document.getElementById("superprompt_input").value;
    const instruction = document.getElementById("superprompt_instruction").value || "Improve this";
    const btn = this;
    btn.disabled = true;
    btn.textContent = "Enhancing...";
    const res = await fetch("https://YOUR_VERCEL_DEPLOY_URL/api/enhance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, instruction })
    }).then(r => r.json()).catch(() => ({ error: "Network error" }));

    btn.disabled = false;
    btn.textContent = "Enhance";

    if (res.enhancedText) {
      document.getElementById("superprompt_result").textContent = res.enhancedText;
      document.getElementById("superprompt_replace_btn").style.display = "block";
      document.getElementById("superprompt_replace_btn").onclick = function () {
        replaceSelection(res.enhancedText);
        removePopup();
      };
    } else {
      document.getElementById("superprompt_result").textContent = res.error || "Enhancement failed!";
    }
  };

  document.getElementById("superprompt_close_btn").onclick = removePopup;
}

function removePopup() {
  if (popupDiv) popupDiv.remove();
  popupDiv = null;
}

function replaceSelection(newText) {
  if (!selectionRange) return;
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(selectionRange);
  document.execCommand('insertText', false, newText);
  sel.removeAllRanges();
  removePopup();
}

// Hide popups if user clicks outside
document.addEventListener("mousedown", (e) => {
  if (
    popupDiv && !popupDiv.contains(e.target) &&
    floatingIcon && !floatingIcon.contains(e.target)
  ) {
    removeFloatingIcon();
    removePopup();
  }
});