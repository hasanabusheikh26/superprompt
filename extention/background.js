// background.js - Service Worker for AI Prompt Enhancer

chrome.runtime.onInstalled.addListener(() => {
  console.log('AI Prompt Enhancer extension installed');
});

// Handle messages if needed
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'ping') {
    sendResponse({ status: 'pong' });
  }
  return true;
});