// Popup.js - Main frontend logic for the extension

class PromptEnhancer {
  constructor() {
    this.init();
  }

  async init() {
    // Initialize UI elements
    this.initElements();
    
    // Check authentication status
    await this.checkAuthStatus();
    
    // Setup event listeners
    this.setupEventListeners();
  }

  initElements() {
    // Screens
    this.authScreen = document.getElementById('authScreen');
    this.appScreen = document.getElementById('appScreen');
    
    // Auth elements
    this.signUpBtn = document.getElementById('signUpBtn');
    this.signInBtn = document.getElementById('signInBtn');
    this.logoutBtn = document.getElementById('logoutBtn');
    this.userInfo = document.getElementById('userInfo');
    this.userEmail = document.getElementById('userEmail');
    
    // App elements
    this.promptInput = document.getElementById('promptInput');
    this.enhanceBtn = document.getElementById('enhanceBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.resultContainer = document.getElementById('resultContainer');
    this.resultText = document.getElementById('resultText');
    this.loadingState = document.getElementById('loadingState');
    this.errorState = document.getElementById('errorState');
    this.successState = document.getElementById('successState');
    
    // Enhancement buttons
    this.enhancementBtns = document.querySelectorAll('.enhancement-btn');
    this.selectedEnhancement = 'improve'; // default
  }

  async checkAuthStatus() {
    try {
      const result = await chrome.storage.local.get(['user', 'authToken']);
      
      if (result.user && result.authToken) {
        this.showAuthenticatedState(result.user);
      } else {
        this.showUnauthenticatedState();
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      this.showUnauthenticatedState();
    }
  }

  showAuthenticatedState(user) {
    this.authScreen.classList.add('hidden');
    this.appScreen.classList.remove('hidden');
    this.userInfo.classList.remove('hidden');
    this.userEmail.textContent = user.email || 'User';
  }

  showUnauthenticatedState() {
    this.authScreen.classList.remove('hidden');
    this.appScreen.classList.add('hidden');
    this.userInfo.classList.add('hidden');
  }

  setupEventListeners() {
    // Auth buttons
    this.signUpBtn.addEventListener('click', () => this.handleAuth('signup'));
    this.signInBtn.addEventListener('click', () => this.handleAuth('signin'));
    this.logoutBtn.addEventListener('click', () => this.handleLogout());
    
    // Enhancement type selection
    this.enhancementBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        // Remove active class from all buttons
        this.enhancementBtns.forEach(b => b.classList.remove('active'));
        // Add active class to clicked button
        e.target.classList.add('active');
        this.selectedEnhancement = e.target.dataset.type;
      });
    });
    
    // Set default active enhancement
    this.enhancementBtns[0].classList.add('active');
    
    // Main functionality
    this.enhanceBtn.addEventListener('click', () => this.enhancePrompt());
    this.copyBtn.addEventListener('click', () => this.copyResult());
    
    // Input validation
    this.promptInput.addEventListener('input', () => {
      const hasText = this.promptInput.value.trim().length > 0;
      this.enhanceBtn.disabled = !hasText;
    });
  }

  async handleAuth(type) {
    try {
      // Replace with your actual Clerk domain and configuration
      const authUrl = type === 'signup' 
        ? 'https://modest-shrew-1.accounts.dev/sign-up' 
        : 'https://modest-shrew-1.accounts.dev/sign-in';
      
      // Open auth in new tab
      const authTab = await chrome.tabs.create({ url: authUrl });
      
      // Listen for auth completion
      this.listenForAuthCompletion(authTab.id);
      
    } catch (error) {
      console.error('Auth error:', error);
      this.showError('Authentication failed. Please try again.');
    }
  }

  listenForAuthCompletion(tabId) {
    // Listen for tab updates to detect auth completion
    const listener = async (updatedTabId, changeInfo, tab) => {
      if (updatedTabId === tabId && changeInfo.url) {
        // Check if redirected to success URL
        if (changeInfo.url.includes('success') || changeInfo.url.includes('dashboard')) {
          // Auth likely completed, verify with backend
          await this.verifyAuthWithBackend();
          chrome.tabs.onUpdated.removeListener(listener);
          chrome.tabs.remove(tabId); // Close auth tab
        }
      }
    };
    
    chrome.tabs.onUpdated.addListener(listener);
    
    // Also listen for tab closure
    const closeListener = (closedTabId) => {
      if (closedTabId === tabId) {
        chrome.tabs.onRemoved.removeListener(closeListener);
        chrome.tabs.onUpdated.removeListener(listener);
        // Check auth status when user returns
        setTimeout(() => this.checkAuthStatus(), 1000);
      }
    };
    
    chrome.tabs.onRemoved.addListener(closeListener);
  }

  async verifyAuthWithBackend() {
    try {
      // This would call your backend to verify the Clerk session
      // For now, we'll simulate successful auth
      const mockUser = {
        email: 'user@example.com',
        id: 'user_123'
      };
      
      const mockToken = 'auth_token_123';
      
      await chrome.storage.local.set({
        user: mockUser,
        authToken: mockToken
      });
      
      this.showAuthenticatedState(mockUser);
      this.showSuccess('Successfully signed in!');
      
    } catch (error) {
      console.error('Auth verification failed:', error);
      this.showError('Authentication verification failed.');
    }
  }

  async handleLogout() {
    try {
      // Clear local storage
      await chrome.storage.local.remove(['user', 'authToken']);
      
      // Reset UI
      this.showUnauthenticatedState();
      this.clearResults();
      this.showSuccess('Successfully signed out.');
      
    } catch (error) {
      console.error('Logout error:', error);
      this.showError('Logout failed. Please try again.');
    }
  }

  async enhancePrompt() {
    const prompt = this.promptInput.value.trim();
    
    if (!prompt) {
      this.showError('Please enter a prompt to enhance.');
      return;
    }

    // Check auth before making API call
    const authData = await chrome.storage.local.get(['authToken']);
    if (!authData.authToken) {
      this.showError('Please sign in to use prompt enhancement.');
      return;
    }

    this.setLoadingState(true);
    this.clearMessages();

    try {
      const enhancedPrompt = await this.callEnhancementAPI(prompt, this.selectedEnhancement);
      this.showResult(enhancedPrompt);
      this.showSuccess('Prompt enhanced successfully!');
      
    } catch (error) {
      console.error('Enhancement error:', error);
      this.showError('Failed to enhance prompt. Please try again.');
    } finally {
      this.setLoadingState(false);
    }
  }

  async callEnhancementAPI(prompt, enhancementType) {
    const authData = await chrome.storage.local.get(['authToken']);
    
    // Replace with your actual API endpoint
    const response = await fetch('https://superprompt-lac.vercel.app/api/enhance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData.authToken}`
      },
      body: JSON.stringify({
        prompt: prompt,
        enhancementType: enhancementType
      })
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired, logout user
        await this.handleLogout();
        throw new Error('Session expired. Please sign in again.');
      }
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.enhancedPrompt;
  }

  showResult(enhancedPrompt) {
    this.resultText.textContent = enhancedPrompt;
    this.resultContainer.classList.remove('hidden');
  }

  async copyResult() {
    try {
      const text = this.resultText.textContent;
      await navigator.clipboard.writeText(text);
      
      // Visual feedback
      const originalText = this.copyBtn.textContent;
      this.copyBtn.textContent = 'Copied!';
      this.copyBtn.style.background = '#059669';
      
      setTimeout(() => {
        this.copyBtn.textContent = originalText;
        this.copyBtn.style.background = '#10b981';
      }, 2000);
      
    } catch (error) {
      console.error('Copy failed:', error);
      this.showError('Failed to copy. Please select and copy manually.');
    }
  }

  setLoadingState(loading) {
    if (loading) {
      this.loadingState.classList.remove('hidden');
      this.enhanceBtn.disabled = true;
      this.resultContainer.classList.add('hidden');
    } else {
      this.loadingState.classList.add('hidden');
      this.enhanceBtn.disabled = false;
    }
  }

  showError(message) {
    this.errorState.textContent = message;
    this.errorState.classList.remove('hidden');
    this.successState.classList.add('hidden');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      this.errorState.classList.add('hidden');
    }, 5000);
  }

  showSuccess(message) {
    this.successState.textContent = message;
    this.successState.classList.remove('hidden');
    this.errorState.classList.add('hidden');
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      this.successState.classList.add('hidden');
    }, 3000);
  }

  clearMessages() {
    this.errorState.classList.add('hidden');
    this.successState.classList.add('hidden');
  }

  clearResults() {
    this.resultContainer.classList.add('hidden');
    this.promptInput.value = '';
  }
}

// Initialize the extension when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PromptEnhancer();
});

// Handle messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'authCompleted') {
    // Refresh auth status when notified by background script
    const enhancer = new PromptEnhancer();
    enhancer.checkAuthStatus();
  }
});