// Background.js - Service worker for Chrome extension

class BackgroundManager {
  constructor() {
    this.init();
  }

  init() {
    // Listen for extension installation
    chrome.runtime.onInstalled.addListener(() => {
      this.handleInstall();
    });

    // Listen for messages from popup and content scripts
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep message channel open for async responses
    });

    // Listen for tab updates to detect auth completion
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      this.handleTabUpdate(tabId, changeInfo, tab);
    });

    // Handle auth token refresh
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'refreshAuthToken') {
        this.refreshAuthToken();
      }
    });
  }

  async handleInstall() {
    console.log('Prompt Enhancer extension installed');
    
    // Set up default storage values
    await chrome.storage.local.set({
      installDate: new Date().toISOString(),
      version: chrome.runtime.getManifest().version
    });

    // Clear any existing auth state on fresh install
    await chrome.storage.local.remove(['user', 'authToken']);
  }

  async handleMessage(request, sender, sendResponse) {
    try {
      switch (request.action) {
        case 'checkAuth':
          const authStatus = await this.checkAuthStatus();
          sendResponse({ success: true, authenticated: authStatus.authenticated, user: authStatus.user });
          break;

        case 'enhancePrompt':
          const result = await this.enhancePrompt(request.prompt, request.enhancementType);
          sendResponse({ success: true, enhancedPrompt: result });
          break;

        case 'logout':
          await this.handleLogout();
          sendResponse({ success: true });
          break;

        case 'verifyAuth':
          const verification = await this.verifyAuthWithClerk(request.token);
          sendResponse({ success: verification.success, user: verification.user });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Background message handling error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleTabUpdate(tabId, changeInfo, tab) {
    // Detect Clerk auth completion
    if (changeInfo.url && this.isClerkAuthUrl(changeInfo.url)) {
      // Check if auth was successful
      if (changeInfo.url.includes('success') || changeInfo.url.includes('dashboard')) {
        await this.handleAuthCompletion(tab);
      }
    }
  }

  isClerkAuthUrl(url) {
    // Replace with your actual Clerk domain
    return url.includes('clerk.accounts.dev') || url.includes('your-clerk-domain');
  }

  async handleAuthCompletion(tab) {
    try {
      // Extract auth information from the tab if possible
      // This is a simplified version - you'd implement actual Clerk integration
      
      // For now, simulate successful auth detection
      const simulatedUser = {
        id: 'user_' + Date.now(),
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe'
      };

      const simulatedToken = 'jwt_token_' + Date.now();

      // Store auth data
      await chrome.storage.local.set({
        user: simulatedUser,
        authToken: simulatedToken,
        authTimestamp: Date.now()
      });

      // Set up token refresh alarm (24 hours)
      chrome.alarms.create('refreshAuthToken', {
        delayInMinutes: 24 * 60
      });

      // Notify popup of successful auth
      this.notifyAuthSuccess();

      console.log('Auth completed successfully');
      
    } catch (error) {
      console.error('Auth completion handling error:', error);
    }
  }

  async checkAuthStatus() {
    try {
      const data = await chrome.storage.local.get(['user', 'authToken', 'authTimestamp']);
      
      if (!data.user || !data.authToken) {
        return { authenticated: false };
      }

      // Check if token is still valid (24 hours)
      const tokenAge = Date.now() - (data.authTimestamp || 0);
      const isExpired = tokenAge > (24 * 60 * 60 * 1000);

      if (isExpired) {
        await this.handleLogout();
        return { authenticated: false };
      }

      return { 
        authenticated: true, 
        user: data.user 
      };
      
    } catch (error) {
      console.error('Auth status check error:', error);
      return { authenticated: false };
    }
  }

  async enhancePrompt(prompt, enhancementType) {
    // Verify authentication before making API call
    const authStatus = await this.checkAuthStatus();
    if (!authStatus.authenticated) {
      throw new Error('Authentication required');
    }

    try {
      const authData = await chrome.storage.local.get(['authToken']);
      
      // Call your secure backend API
      const response = await fetch('https://your-api-domain.com/api/enhance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authData.authToken}`,
          'User-Agent': 'PromptEnhancer/1.0.0'
        },
        body: JSON.stringify({
          prompt: prompt,
          enhancementType: enhancementType,
          userId: authStatus.user.id
        })
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired
          await this.handleLogout();
          throw new Error('Session expired. Please sign in again.');
        }
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      // Log usage for analytics (anonymized)
      this.logUsage(enhancementType);
      
      return result.enhancedPrompt;
      
    } catch (error) {
      console.error('Prompt enhancement error:', error);
      throw error;
    }
  }

  async verifyAuthWithClerk(token) {
    try {
      // This would verify the token with Clerk's API
      // For now, return a simulated response
      
      const response = await fetch('https://api.clerk.dev/v1/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        return { success: false };
      }

      const userData = await response.json();
      
      return {
        success: true,
        user: {
          id: userData.id,
          email: userData.email_addresses[0]?.email_address,
          firstName: userData.first_name,
          lastName: userData.last_name
        }
      };
      
    } catch (error) {
      console.error('Clerk verification error:', error);
      return { success: false };
    }
  }

  async handleLogout() {
    try {
      // Clear local storage
      await chrome.storage.local.remove(['user', 'authToken', 'authTimestamp']);
      
      // Clear any alarms
      chrome.alarms.clear('refreshAuthToken');
      
      // Notify popup
      this.notifyLogout();
      
      console.log('User logged out successfully');
      
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  async refreshAuthToken() {
    try {
      const authData = await chrome.storage.local.get(['authToken']);
      
      if (!authData.authToken) {
        return; // No token to refresh
      }

      // Call Clerk's token refresh endpoint
      const response = await fetch('https://api.clerk.dev/v1/refresh', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authData.authToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        await chrome.storage.local.set({
          authToken: data.token,
          authTimestamp: Date.now()
        });

        // Schedule next refresh
        chrome.alarms.create('refreshAuthToken', {
          delayInMinutes: 24 * 60
        });
        
        console.log('Auth token refreshed successfully');
      } else {
        // Refresh failed, logout user
        await this.handleLogout();
      }
      
    } catch (error) {
      console.error('Token refresh error:', error);
      await this.handleLogout();
    }
  }

  async logUsage(enhancementType) {
    try {
      // Log anonymous usage data for analytics
      const usage = await chrome.storage.local.get(['usageStats']) || { usageStats: {} };
      const stats = usage.usageStats || {};
      
      const today = new Date().toISOString().split('T')[0];
      if (!stats[today]) {
        stats[today] = {};
      }
      
      stats[today][enhancementType] = (stats[today][enhancementType] || 0) + 1;
      
      await chrome.storage.local.set({ usageStats: stats });
      
    } catch (error) {
      console.error('Usage logging error:', error);
    }
  }

  notifyAuthSuccess() {
    // Notify all open popups
    chrome.runtime.sendMessage({
      action: 'authStatusChanged',
      authenticated: true
    }).catch(() => {
      // Popup might be closed, ignore error
    });
  }

  notifyLogout() {
    // Notify all open popups
    chrome.runtime.sendMessage({
      action: 'authStatusChanged',
      authenticated: false
    }).catch(() => {
      // Popup might be closed, ignore error
    });
  }
}

// Initialize background manager
new BackgroundManager();

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log('Prompt Enhancer extension started');
});

// Handle extension suspend
chrome.runtime.onSuspend.addListener(() => {
  console.log('Prompt Enhancer extension suspended');
});