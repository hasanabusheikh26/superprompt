/**
 * @fileoverview Enhanced Authentication Manager
 * @description React-style authentication manager with error handling
 * @author SuperPrompt Team
 * @version 2.0.0
 */

class AuthManager {
  constructor() {
    this.listeners = new Set();
    this.state = {
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null
    };
    
    this.init();
  }

  /**
   * Initialize auth manager
   */
  async init() {
    try {
      this.setState({ isLoading: true, error: null });
      await this.validateSession();
    } catch (error) {
      this.handleError('Initialization failed', error);
    } finally {
      this.setState({ isLoading: false });
    }
  }

  /**
   * State management (React-like)
   */
  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.notifyListeners();
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of state changes
   */
  notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener(this.state);
      } catch (error) {
        console.error('Listener error:', error);
      }
    });
  }

  /**
   * Validate current session
   */
  async validateSession() {
    try {
      const token = await chrome.storage.local.get(['authToken']);
      
      if (!token.authToken) {
        this.setState({ 
          user: null, 
          isAuthenticated: false,
          error: null 
        });
        return false;
      }

      // Check if token is mock token
      if (token.authToken.startsWith('mock_token_')) {
        const mockUser = await chrome.storage.local.get(['superprompt_mock_user']);
        if (mockUser.superprompt_mock_user) {
          this.setState({
            user: mockUser.superprompt_mock_user,
            isAuthenticated: true,
            error: null
          });
          return true;
        }
      }

      // Validate with server (fallback)
      const response = await this.apiRequest('/auth/validate', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token.authToken}`
        }
      });

      if (response.success) {
        this.setState({
          user: response.user,
          isAuthenticated: true,
          error: null
        });
        return true;
      } else {
        throw new Error('Invalid session');
      }

    } catch (error) {
      // Clear invalid session
      await chrome.storage.local.remove(['authToken', 'superprompt_mock_user']);
      this.setState({ 
        user: null, 
        isAuthenticated: false,
        error: 'Session expired' 
      });
      return false;
    }
  }

  /**
   * Login user
   */
  async login(credentials) {
    try {
      this.setState({ isLoading: true, error: null });

      const response = await this.apiRequest('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });

      if (response.success) {
        // Store auth data
        await chrome.storage.local.set({
          authToken: response.token,
          superprompt_mock_user: response.user
        });

        this.setState({
          user: response.user,
          isAuthenticated: true,
          error: null
        });

        return { success: true, user: response.user };
      } else {
        throw new Error(response.error || 'Login failed');
      }

    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      this.setState({ error: errorMessage });
      return { success: false, error: errorMessage };
    } finally {
      this.setState({ isLoading: false });
    }
  }

  /**
   * Register user
   */
  async register(userData) {
    try {
      this.setState({ isLoading: true, error: null });

      const response = await this.apiRequest('/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      if (response.success) {
        // Store auth data
        await chrome.storage.local.set({
          authToken: response.token,
          superprompt_mock_user: response.user
        });

        this.setState({
          user: response.user,
          isAuthenticated: true,
          error: null
        });

        return { success: true, user: response.user };
      } else {
        throw new Error(response.error || 'Registration failed');
      }

    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      this.setState({ error: errorMessage });
      return { success: false, error: errorMessage };
    } finally {
      this.setState({ isLoading: false });
    }
  }

  /**
   * Logout user
   */
  async logout() {
    try {
      this.setState({ isLoading: true, error: null });

      // Clear storage
      await chrome.storage.local.remove([
        'authToken', 
        'superprompt_mock_user',
        'superprompt_prompts'
      ]);

      this.setState({
        user: null,
        isAuthenticated: false,
        error: null
      });

      return { success: true };

    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      this.setState({ error: errorMessage });
      return { success: false, error: errorMessage };
    } finally {
      this.setState({ isLoading: false });
    }
  }

  /**
   * Make authenticated API request
   */
  async apiRequest(endpoint, options = {}) {
    try {
      // Get auth token
      const storage = await chrome.storage.local.get(['authToken']);
      const token = storage.authToken;

      // Handle mock authentication
      if (endpoint.startsWith('/auth/') && this.useMockAuth) {
        return await this.handleMockAuth(endpoint, options);
      }

      // Prepare headers
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers
      };

      if (token && !endpoint.includes('login') && !endpoint.includes('signup')) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Make request
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();

    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  }

  /**
   * Handle mock authentication
   */
  async handleMockAuth(endpoint, options) {
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    await delay(500); // Simulate network delay

    if (endpoint === '/auth/login') {
      return this.mockLogin(JSON.parse(options.body));
    } else if (endpoint === '/auth/signup') {
      return this.mockSignup(JSON.parse(options.body));
    } else if (endpoint === '/auth/validate') {
      return this.mockValidateToken();
    }

    throw new Error('Endpoint not supported in mock mode');
  }

  /**
   * Mock login
   */
  mockLogin(credentials) {
    const { email, password } = credentials;
    
    if (email && password) {
      const user = {
        id: 'mock-user-id',
        email: email,
        name: email.split('@')[0],
        isVerified: true,
        subscription: { plan: 'free' },
        createdAt: new Date().toISOString()
      };

      return {
        success: true,
        token: `mock_token_${Date.now()}`,
        user: user
      };
    }

    throw new Error('Invalid credentials');
  }

  /**
   * Mock signup
   */
  mockSignup(userData) {
    const { email, password, name } = userData;
    
    if (email && password) {
      const user = {
        id: 'mock-user-id',
        email: email,
        name: name || email.split('@')[0],
        isVerified: true,
        subscription: { plan: 'free' },
        createdAt: new Date().toISOString()
      };

      return {
        success: true,
        token: `mock_token_${Date.now()}`,
        user: user
      };
    }

    throw new Error('Invalid user data');
  }

  /**
   * Mock token validation
   */
  async mockValidateToken() {
    const storage = await chrome.storage.local.get(['superprompt_mock_user']);
    
    if (storage.superprompt_mock_user) {
      return {
        success: true,
        user: storage.superprompt_mock_user
      };
    }

    throw new Error('Invalid token');
  }

  /**
   * Get user-friendly error message
   */
  getErrorMessage(error) {
    if (error.message.includes('Failed to fetch')) {
      return 'Network error. Please check your connection.';
    } else if (error.message.includes('401')) {
      return 'Authentication failed. Please check your credentials.';
    } else if (error.message.includes('429')) {
      return 'Too many requests. Please wait a moment.';
    } else if (error.message.includes('500')) {
      return 'Server error. Please try again later.';
    }
    
    return error.message || 'An unexpected error occurred.';
  }

  /**
   * Handle and log errors
   */
  handleError(context, error) {
    console.error(`${context}:`, error);
    const errorMessage = this.getErrorMessage(error);
    this.setState({ error: errorMessage });
  }

  /**
   * Configuration
   */
  get useMockAuth() {
    return true; // Enable mock auth for development
  }

  get baseURL() {
    return this.useMockAuth 
      ? 'https://mock-superprompt-api.local/api' 
      : 'https://superprompt-emug3iang-hass-projects-b72778ab.vercel.app/api';
  }
}

// Export singleton instance
window.AuthManager = window.AuthManager || new AuthManager();
window.authManager = window.AuthManager;