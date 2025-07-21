// Final popup.js - Production ready with simple Clerk integration

class PromptEnhancer {
  constructor() {
    this.init();
  }

  async init() {
    this.initElements();
    await this.checkAuthStatus();
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
    this.selectedEnhancement = 'improve';
  }

  async checkAuthStatus() {
    try {
      // Check local storage first
      const result = await chrome.storage.local.get(['user', 'authToken', 'tokenExpiry']);
      
      if (result.authToken && result.tokenExpiry && Date.now() < result.tokenExpiry) {
        this.showAuthenticatedState(result.user);
        return;
      }

      // Check with backend
      const response = await fetch('https://superprompt-lac.vercel.app/api/auth/session', {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.authenticated) {
          await this.saveAuthData(data);
          this.showAuthenticatedState(data.user);
          return;
        }
      }

      this.showUnauthenticatedState();
      
    } catch (error) {
      console.error('Auth check error:', error);
      this.showUnauthenticatedState();
    }
  }

  async saveAuthData(authData) {
    const expiryTime = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
    
    await chrome.storage.local.set({
      user: authData.user,
      authToken: authData.token,
      tokenExpiry: expiryTime
    });
  }

  showAuthenticatedState(user) {
    this.authScreen.classList.add('hidden');
    this.appScreen.classList.remove('hidden');
    this.userInfo.classList.remove('hidden');
    this.userEmail.textContent = user.email || user.id || 'User';
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
    
    // Enhancement selection
    this.enhancementBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.enhancementBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.selectedEnhancement = e.target.dataset.type;
      });
    });
    
    if (this.enhancementBtns.length > 0) {
      this.enhancementBtns[0].classList.add('active');
    }
    
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
      const baseUrl = 'https://modest-shrew-1.accounts.dev';
      const redirectUrl = encodeURIComponent('https://superprompt-lac.vercel.app/auth/callback');
      
      const authUrl = type === 'signup' 
        ? `${baseUrl}/sign-up?redirect_url=${redirectUrl}`
        : `${baseUrl}/sign-in?redirect_url=${redirectUrl}`;
      
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
    let pollCount = 0;
    const maxPolls = 30; // 1 minute max
    
    const pollForAuth = async () => {
      try {
        pollCount++;
        
        // Check if auth completed
        const response = await fetch('https://superprompt-lac.vercel.app/api/auth/session', {
          method: 'GET',
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          if (data.authenticated) {
            await this.saveAuthData(data);
            this.showAuthenticatedState(data.user);
            this.showSuccess('Successfully signed in!');
            
            // Close auth tab
            try {
              await chrome.tabs.remove(tabId);
            } catch (e) {
              // Tab might already be closed
            }
            return;
          }
        }
        
        // Continue polling
        if (pollCount < maxPolls) {
          setTimeout(pollForAuth, 2000);
        }
        
      } catch (error) {
        console.error('Auth polling error:', error);
      }
    };
    
    // Start polling
    setTimeout(pollForAuth, 3000);
  }

  async handleLogout() {
    try {
      // Clear local storage
      await chrome.storage.local.remove(['user', 'authToken', 'tokenExpiry']);
      
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

    const authData = await chrome.storage.local.get(['authToken']);
    if (!authData.authToken) {
      this.showError('Please sign in to use prompt enhancement.');
      return;
    }

    this.setLoadingState(true);
    this.clearMessages();

    try {
      const response = await fetch('https://superprompt-lac.vercel.app/api/enhance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          prompt: prompt,
          enhancementType: this.selectedEnhancement
        })
      });

      if (!response.ok) {
        if (response.status === 401) {
          await this.handleLogout();
          throw new Error('Session expired. Please sign in again.');
        }
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      this.showResult(data.enhancedPrompt);
      this.showSuccess('Prompt enhanced successfully!');
      
    } catch (error) {
      console.error('Enhancement error:', error);
      this.showError(error.message || 'Failed to enhance prompt. Please try again.');
    } finally {
      this.setLoadingState(false);
    }
  }

  showResult(enhancedPrompt) {
    this.resultText.textContent = enhancedPrompt;
    this.resultContainer.classList.remove('hidden');
  }

  async copyResult() {
    try {
      const text = this.resultText.textContent;
      await navigator.clipboard.writeText(text);
      
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
    
    setTimeout(() => {
      this.errorState.classList.add('hidden');
    }, 5000);
  }

  showSuccess(message) {
    this.successState.textContent = message;
    this.successState.classList.remove('hidden');
    this.errorState.classList.add('hidden');
    
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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new PromptEnhancer();
});