chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "superPromptRewrite",
    title: "Rewrite with SuperPrompt",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "superPromptRewrite") {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: rewriteSelectedText
    });
  }
});

function rewriteSelectedText() {
  const selectedText = window.getSelection().toString();
  if (selectedText) {
    const prompt = `Rewrite this clearly: ${selectedText}`;
    fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer YOUR_OPENAI_KEY"  // 🔁 Replace this with your actual key
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }]
      })
    })
    .then(res => res.json())
    .then(data => {
      const result = data.choices[0].message.content;
      alert("Rewritten:\\n" + result);
    })
    .catch(err => {
      alert("Error fetching rewrite: " + err.message);
    });
  }
}