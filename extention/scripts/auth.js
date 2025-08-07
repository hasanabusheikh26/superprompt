// auth.js - SuperPrompt Authentication System
class SuperPromptAuth {
  constructor() {
    this.baseURL = 'https://superprompt-nwhqu7jm8-hass-projects-b72778ab.vercel.app/api';
    this.currentUser = null;
    this.isAuthenticated = false;
    this.init();
  }

  async init() {
    // Check for existing session
    const token = this.getStoredToken();
    if (token) {
      try {
        const user = await this.validateToken(token);
        if (user) {
          this.currentUser = user;
          this.isAuthenticated = true;
          this.setupTokenRefresh();
        }
      } catch (error) {
        this.logout();
      }
    }
  }

  // Session Management
  getStoredToken() {
    return localStorage.getItem('superprompt_token');
  }

  setStoredToken(token) {
    localStorage.setItem('superprompt_token', token);
  }

  clearStoredToken() {
    localStorage.removeItem('superprompt_token');
  }

  // API Request Helper
  async apiRequest(endpoint, options = {}) {
    const token = this.getStoredToken();
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      
      if (response.status === 401) {
        this.logout();
        throw new Error('Session expired');
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Request failed');
      }

      return await response.json();
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  }

  // Authentication Methods
  async signup(email, password) {
    // Authentication not implemented in backend yet
    // For now, simulate successful signup
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Create mock user data
      const mockUser = { id: 'user_' + Date.now(), email };
      const mockToken = 'mock_token_' + Date.now();
      
      this.setStoredToken(mockToken);
      this.currentUser = mockUser;
      this.isAuthenticated = true;

      return { success: true, user: mockUser };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async login(email, password) {
    // Authentication not implemented in backend yet
    // For now, simulate successful login
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Create mock user data
      const mockUser = { id: 'user_' + Date.now(), email };
      const mockToken = 'mock_token_' + Date.now();
      
      this.setStoredToken(mockToken);
      this.currentUser = mockUser;
      this.isAuthenticated = true;

      return { success: true, user: mockUser };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async oauthLogin(provider, token) {
    try {
      const response = await this.apiRequest('/auth/oauth', {
        method: 'POST',
        body: JSON.stringify({ provider, token })
      });

      this.setStoredToken(response.token);
      this.currentUser = response.user;
      this.isAuthenticated = true;
      this.setupTokenRefresh();

      return { success: true, user: response.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async resetPassword(email) {
    // Authentication not implemented in backend yet
    // For now, simulate successful password reset
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async validateToken(token) {
    // Authentication not implemented in backend yet
    // For now, always return null to force re-authentication
    return null;
  }

  async refreshToken() {
    // Authentication not implemented in backend yet
    // For now, always fail to force re-authentication
    this.logout();
    return false;
  }

  setupTokenRefresh() {
    // Refresh token every 50 minutes (assuming 1-hour expiry)
    setInterval(() => {
      this.refreshToken();
    }, 50 * 60 * 1000);
  }

  logout() {
    this.clearStoredToken();
    this.currentUser = null;
    this.isAuthenticated = false;
    
    // Clear any stored prompts
    localStorage.removeItem('superprompt_prompts');
    
    // Trigger logout event
    window.dispatchEvent(new CustomEvent('superprompt:logout'));
  }

  getCurrentUser() {
    return this.currentUser;
  }

  isLoggedIn() {
    return this.isAuthenticated && this.currentUser;
  }
}

// Export for use in other modules
window.SuperPromptAuth = SuperPromptAuth; 