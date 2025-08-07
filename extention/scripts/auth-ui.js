// auth-ui.js - SuperPrompt Authentication UI Controller
class SuperPromptAuthUI {
  constructor() {
    this.auth = new SuperPromptAuth();
    this.currentForm = 'login';
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupFormValidation();
    this.checkAuthStatus();
  }

  setupEventListeners() {
    // Form navigation
    document.getElementById('show-signup').addEventListener('click', (e) => {
      e.preventDefault();
      this.showForm('signup');
    });

    document.getElementById('show-login').addEventListener('click', (e) => {
      e.preventDefault();
      this.showForm('login');
    });

    document.getElementById('forgot-password').addEventListener('click', (e) => {
      e.preventDefault();
      this.showForm('reset');
    });

    document.getElementById('back-to-login').addEventListener('click', (e) => {
      e.preventDefault();
      this.showForm('login');
    });

    // Form submissions
    document.getElementById('login-form-element').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleLogin();
    });

    document.getElementById('signup-form-element').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSignup();
    });

    document.getElementById('reset-form-element').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handlePasswordReset();
    });

    // OAuth buttons
    document.querySelectorAll('.oauth-btn.google').forEach(btn => {
      btn.addEventListener('click', () => this.handleOAuth('google'));
    });

    document.querySelectorAll('.oauth-btn.github').forEach(btn => {
      btn.addEventListener('click', () => this.handleOAuth('github'));
    });

    // Password visibility toggles
    document.querySelectorAll('.toggle-password').forEach(btn => {
      btn.addEventListener('click', (e) => this.togglePasswordVisibility(e));
    });

    // Real-time validation
    document.getElementById('signup-password').addEventListener('input', (e) => {
      this.validatePassword(e.target.value);
    });

    document.getElementById('signup-confirm').addEventListener('input', (e) => {
      this.validatePasswordMatch();
    });
  }

  setupFormValidation() {
    // Email validation
    const emailInputs = document.querySelectorAll('input[type="email"]');
    emailInputs.forEach(input => {
      input.addEventListener('blur', () => this.validateEmail(input));
    });

    // Password validation
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    passwordInputs.forEach(input => {
      input.addEventListener('blur', () => this.validatePassword(input.value));
    });
  }

  showForm(formType) {
    // Hide all forms
    document.querySelectorAll('.auth-form').forEach(form => {
      form.classList.remove('active');
    });

    // Show selected form
    document.getElementById(`${formType}-form`).classList.add('active');
    this.currentForm = formType;

    // Clear error messages
    this.clearError();
  }

  async handleLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    if (!this.validateForm('login')) return;

    this.showLoading(true);
    this.clearError();

    try {
      const result = await this.auth.login(email, password);
      
      if (result.success) {
        this.showSuccess('Login successful! Redirecting...');
        // Trigger auth success event
        window.dispatchEvent(new CustomEvent('superprompt:auth-success'));
        setTimeout(() => {
          this.redirectToMain();
        }, 1000);
      } else {
        this.showError(result.error || 'Login failed');
      }
    } catch (error) {
      this.showError('Network error. Please try again.');
    } finally {
      this.showLoading(false);
    }
  }

  async handleSignup() {
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirm = document.getElementById('signup-confirm').value;

    if (!this.validateForm('signup')) return;

    if (password !== confirm) {
      this.showError('Passwords do not match');
      return;
    }

    this.showLoading(true);
    this.clearError();

    try {
      const result = await this.auth.signup(email, password);
      
      if (result.success) {
        this.showSuccess('Account created! Please check your email to verify your account.');
        // Trigger auth success event
        window.dispatchEvent(new CustomEvent('superprompt:auth-success'));
        this.showForm('login');
      } else {
        this.showError(result.error || 'Signup failed');
      }
    } catch (error) {
      this.showError('Network error. Please try again.');
    } finally {
      this.showLoading(false);
    }
  }

  async handlePasswordReset() {
    const email = document.getElementById('reset-email').value;

    if (!this.validateEmail(document.getElementById('reset-email'))) return;

    this.showLoading(true);
    this.clearError();

    try {
      const result = await this.auth.resetPassword(email);
      
      if (result.success) {
        this.showSuccess('Password reset link sent! Check your email.');
        this.showForm('login');
      } else {
        this.showError(result.error || 'Password reset failed');
      }
    } catch (error) {
      this.showError('Network error. Please try again.');
    } finally {
      this.showLoading(false);
    }
  }

  async handleOAuth(provider) {
    this.showLoading(true);
    this.clearError();

    try {
      // This would integrate with your OAuth provider
      // For now, we'll simulate the flow
      const token = await this.getOAuthToken(provider);
      const result = await this.auth.oauthLogin(provider, token);
      
      if (result.success) {
        this.showSuccess('OAuth login successful! Redirecting...');
        setTimeout(() => {
          this.redirectToMain();
        }, 1000);
      } else {
        this.showError(result.error || 'OAuth login failed');
      }
    } catch (error) {
      this.showError('OAuth login failed. Please try again.');
    } finally {
      this.showLoading(false);
    }
  }

  async getOAuthToken(provider) {
    // This would open a popup or redirect for OAuth
    // For demo purposes, we'll simulate
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve('mock_oauth_token');
      }, 1000);
    });
  }

  validateForm(formType) {
    const form = document.getElementById(`${formType}-form-element`);
    const inputs = form.querySelectorAll('input[required]');
    
    let isValid = true;
    
    inputs.forEach(input => {
      if (!input.value.trim()) {
        this.showFieldError(input, 'This field is required');
        isValid = false;
      } else {
        this.clearFieldError(input);
      }
    });

    return isValid;
  }

  validateEmail(input) {
    const email = input.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!email) {
      this.showFieldError(input, 'Email is required');
      return false;
    }
    
    if (!emailRegex.test(email)) {
      this.showFieldError(input, 'Please enter a valid email');
      return false;
    }
    
    this.clearFieldError(input);
    return true;
  }

  validatePassword(password) {
    const strengthEl = document.getElementById('password-strength');
    if (!strengthEl) return true;

    let strength = 0;
    let feedback = [];

    if (password.length >= 8) strength++;
    else feedback.push('At least 8 characters');

    if (/[A-Z]/.test(password)) strength++;
    else feedback.push('One uppercase letter');

    if (/[a-z]/.test(password)) strength++;
    else feedback.push('One lowercase letter');

    if (/[0-9]/.test(password)) strength++;
    else feedback.push('One number');

    if (/[^A-Za-z0-9]/.test(password)) strength++;
    else feedback.push('One special character');

    const strengthClasses = ['weak', 'fair', 'good', 'strong', 'very-strong'];
    const strengthText = ['Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];

    strengthEl.className = `password-strength ${strengthClasses[strength - 1] || 'weak'}`;
    strengthEl.textContent = feedback.length > 0 ? feedback.join(', ') : strengthText[strength - 1];

    return strength >= 3;
  }

  validatePasswordMatch() {
    const password = document.getElementById('signup-password').value;
    const confirm = document.getElementById('signup-confirm').value;
    const confirmInput = document.getElementById('signup-confirm');

    if (confirm && password !== confirm) {
      this.showFieldError(confirmInput, 'Passwords do not match');
      return false;
    } else {
      this.clearFieldError(confirmInput);
      return true;
    }
  }

  togglePasswordVisibility(event) {
    const button = event.target;
    const input = button.parentElement.querySelector('input');
    
    if (input.type === 'password') {
      input.type = 'text';
      button.textContent = '🙈';
    } else {
      input.type = 'password';
      button.textContent = '👁';
    }
  }

  showFieldError(input, message) {
    const errorEl = input.parentElement.querySelector('.field-error') || 
                   document.createElement('div');
    errorEl.className = 'field-error';
    errorEl.textContent = message;
    
    if (!input.parentElement.querySelector('.field-error')) {
      input.parentElement.appendChild(errorEl);
    }
    
    input.classList.add('error');
  }

  clearFieldError(input) {
    const errorEl = input.parentElement.querySelector('.field-error');
    if (errorEl) errorEl.remove();
    input.classList.remove('error');
  }

  showError(message) {
    const errorEl = document.getElementById('error-message');
    errorEl.textContent = message;
    errorEl.classList.add('show');
    
    setTimeout(() => {
      errorEl.classList.remove('show');
    }, 5000);
  }

  showSuccess(message) {
    const errorEl = document.getElementById('error-message');
    errorEl.textContent = message;
    errorEl.className = 'error-message success show';
    
    setTimeout(() => {
      errorEl.classList.remove('show');
    }, 3000);
  }

  clearError() {
    const errorEl = document.getElementById('error-message');
    errorEl.classList.remove('show', 'success');
  }

  showLoading(show) {
    const loadingEl = document.getElementById('loading-state');
    if (show) {
      loadingEl.classList.add('show');
    } else {
      loadingEl.classList.remove('show');
    }
  }

  async checkAuthStatus() {
    if (this.auth.isLoggedIn()) {
      this.redirectToMain();
    }
  }

  redirectToMain() {
    // Redirect to main extension popup or close auth window
    if (window.opener) {
      window.opener.postMessage({ type: 'auth-success' }, '*');
      window.close();
    } else {
      // For standalone auth page
      window.location.href = 'popup.html';
    }
  }
}

// Initialize auth UI when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new SuperPromptAuthUI();
}); 