// Update this to match your working endpoint
const VERCEL_API_URL = "https://superprompt-lac.vercel.app/api/enhance";
// Or: const VERCEL_API_URL = "https://superprompt-rlc9qv1v1-hass-projects-b72778ab.vercel.app/api/enhance";

let userSignedIn = false;

chrome.storage.local.get(['superprompt_signedin'], (res) => userSignedIn = !!res.superprompt_signedin);
chrome.storage.onChanged.addListener((changes) => {
  if ('superprompt_signedin' in changes) userSignedIn = changes.superprompt_signedin.newValue;
});

let icon, popup, selectionRange;

function isEditable(node) {
  if (!node) return false;
  if (node.nodeType === 3) node = node.parentElement;
  return (
    node.nodeName === "TEXTAREA" ||
    (node.nodeName === "INPUT" && /^(text|search|email|url|tel|password)$/i.test(node.type)) ||
    node.isContentEditable
  );
}

document.addEventListener('mouseup', (e) => {
  setTimeout(() => {
    if (!userSignedIn) {
      removeFloatingIcon();
      removePopup();
      return;
    }
    const sel = window.getSelection();
    if (
      sel && sel.rangeCount &&
      sel.toString().length > 2 &&
      isEditable(sel.anchorNode)
    ) {
      selectionRange = sel.getRangeAt(0);
      showFloatingIcon(e.clientX, e.clientY);
    } else {
      removeFloatingIcon();
      removePopup();
    }
  }, 10);
});

function showFloatingIcon(x, y) {
  removeFloatingIcon();
  icon = document.createElement('div');
  icon.className = 'superprompt-floating-icon';
  icon.style.position = 'absolute';
  icon.style.top = (window.scrollY + y + 10) + 'px';
  icon.style.left = (window.scrollX + x - 10) + 'px';
  icon.style.width = "38px";
  icon.style.height = "38px";
  icon.style.zIndex = "2147483647";
  icon.style.background = "linear-gradient(135deg, #4ade80 0%, #22d3ee 100%)";
  icon.style.borderRadius = "50%";
  icon.style.display = "flex";
  icon.style.alignItems = "center";
  icon.style.justifyContent = "center";
  icon.style.cursor = "pointer";
  icon.style.boxShadow = "0 4px 16px rgba(0,0,0,0.13)";
  icon.innerHTML = `<img src="${chrome.runtime.getURL('icon.png')}" style="width:22px;height:22px;border-radius:50%;">`;
  icon.onclick = () => { showPopup(); removeFloatingIcon(); };
  document.body.appendChild(icon);
}

function removeFloatingIcon() { if (icon) icon.remove(); icon = null; }
function removePopup() { if (popup) popup.remove(); popup = null; }

function showPopup() {
  removePopup();
  popup = document.createElement('div');
  popup.className = 'superprompt-mini-popup';
  popup.style.position = 'fixed';
  popup.style.top = '30%';
  popup.style.left = '50%';
  popup.style.transform = 'translate(-50%, -50%)';
  popup.style.background = "#fff";
  popup.style.border = "1.5px solid #e5e7eb";
  popup.style.borderRadius = "16px";
  popup.style.boxShadow = "0 16px 56px rgba(0,0,0,0.13)";
  popup.style.zIndex = "2147483647";
  popup.style.padding = "18px";
  popup.style.width = "330px";
  popup.innerHTML = `
    <div style="font-weight:600;font-size:15px;margin-bottom:8px;">Enhance your prompt</div>
    <textarea id="superprompt_input" style="width:100%;height:65px;border-radius:9px;border:1px solid #eee;padding:8px;font-size:13px;">${window.getSelection().toString()}</textarea>
    <input id="superprompt_instruction" placeholder="How should we enhance?" style="width:100%;margin:7px 0 0 0;padding:7px 8px;border-radius:7px;border:1px solid #eee;" />
    <button id="superprompt_enhance_btn" style="width:100%;margin:10px 0 4px 0;">Enhance</button>
    <div id="superprompt_result" style="margin-top:9px;font-size:14px;"></div>
    <button id="superprompt_replace_btn" style="width:100%;margin-top:9px;display:none;">Replace selection</button>
    <button id="superprompt_close_btn" style="width:100%;margin-top:3px;">Close</button>
  `;
  document.body.appendChild(popup);

  document.getElementById("superprompt_enhance_btn").onclick = async function () {
    const text = document.getElementById("superprompt_input").value;
    const instruction = document.getElementById("superprompt_instruction").value || "Improve this";
    this.disabled = true; this.textContent = "Enhancing...";
    const res = await fetch(VERCEL_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, instruction })
    }).then(r => r.json()).catch(() => ({ error: "Network error" }));
    this.disabled = false; this.textContent = "Enhance";
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

function replaceSelection(newText) {
  if (!selectionRange) return;
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(selectionRange);
  document.execCommand('insertText', false, newText);
  sel.removeAllRanges();
  removePopup();
}

document.addEventListener("mousedown", (e) => {
  if (
    popup && !popup.contains(e.target) &&
    icon && !icon.contains(e.target)
  ) {
    removeFloatingIcon();
    removePopup();
  }
});