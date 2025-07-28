let popup;
document.addEventListener("mouseup", (e) => {
  const selection = window.getSelection().toString().trim();
  if (!selection) return;

  removeExistingIcon();
  const icon = document.createElement("img");
  icon.src = chrome.runtime.getURL("assets/icon.png");
  icon.className = "superprompt-icon";
  icon.style.position = "absolute";
  icon.style.top = `${e.pageY + 10}px`;
  icon.style.left = `${e.pageX + 10}px`;
  icon.style.transition = "opacity 0.3s ease";
  icon.style.opacity = "0";
  document.body.appendChild(icon);
  requestAnimationFrame(() => (icon.style.opacity = "1"));

  icon.onclick = () => openPopup(selection, icon);
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
      <span>SuperPrompt</span>
      <button id="close-popup">✕</button>
    </div>
    <textarea id="instruction">Improve this prompt</textarea>
    <pre class="original">${text}</pre>
    <button id="generate">Superprompt it</button>
    <pre id="result"></pre>
    <button id="replace">Replace in page</button>
  `;

  popup.style.position = "fixed";
  popup.style.top = "20%";
  popup.style.left = "50%";
  popup.style.transform = "translateX(-50%)";
  popup.style.background = "white";
  popup.style.padding = "20px";
  popup.style.zIndex = "9999";
  popup.style.boxShadow = "0 0 15px rgba(0,0,0,0.2)";
  popup.style.transition = "opacity 0.3s ease, transform 0.3s ease";
  popup.style.opacity = "0";

  document.body.appendChild(popup);
  requestAnimationFrame(() => (popup.style.opacity = "1"));

  document.getElementById("close-popup").onclick = () => popup.remove();

  document.getElementById("generate").onclick = async () => {
    const instruction = document.getElementById("instruction").value;
    const prompt = `${instruction}\n\n${text}`;
    const result = await fetchGPT(prompt);
    document.getElementById("result").textContent = result;
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
}

async function fetchGPT(prompt) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer YOUR_OPENAI_API_KEY"
    },
    body: JSON.stringify({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }]
    })
  });
  const data = await response.json();
  return data.choices?.[0]?.message?.content || "Error fetching GPT response";
} 