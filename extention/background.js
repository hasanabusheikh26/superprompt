// Simple background.js - Minimal functionality

chrome.runtime.onInstalled.addListener(() => {
  console.log('Text Enhancer extension installed');
});

// Handle messages if needed
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'ping') {
    sendResponse({ status: 'pong' });
  }
  return true;
});