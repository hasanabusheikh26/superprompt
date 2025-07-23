// auth.js - Modular Supabase Authentication for Chrome Extension
// All Supabase logic centralized in one place

import { createClient } from '@supabase/supabase-js';

// Supabase Configuration
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Storage keys
const STORAGE_KEYS = {
  USER: 'superpromptUser',
  SESSION: 'superpromptSession',
  SETTINGS: 'superpromptSettings'
};

/**
 * Sign up a new user
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<{session: Object, user: Object, error: string}>}
 */
export async function signup(email, password) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: chrome.runtime.getURL('popup.html')
      }
    });

    if (error) {
      console.error('Signup error:', error);
      return { error: error.message };
    }

    if (data.user && data.session) {
      await saveUserSession(data.session, data.user);
      return { session: data.session, user: data.user };
    } else {
      // Email confirmation required
      return { 
        pending: true, 
        message: 'Please check your email to confirm your account' 
      };
    }
  } catch (error) {
    console.error('Signup exception:', error);
    return { error: 'Network error. Please try again.' };
  }
}

/**
 * Sign in existing user
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<{session: Object, user: Object, error: string}>}
 */
export async function login(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error('Login error:', error);
      return { error: error.message };
    }

    if (data.user && data.session) {
      await saveUserSession(data.session, data.user);
      return { session: data.session, user: data.user };
    }

    return { error: 'Login failed. Please try again.' };
  } catch (error) {
    console.error('Login exception:', error);
    return { error: 'Network error. Please try again.' };
  }
}

/**
 * Sign out current user
 * @returns {Promise<void>}
 */
export async function logout() {
  try {
    // Sign out from Supabase
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout error:', error);
    }

    // Clear local storage
    await chrome.storage.local.remove([
      STORAGE_KEYS.USER,
      STORAGE_KEYS.SESSION,
      STORAGE_KEYS.SETTINGS
    ]);

    console.log('User logged out successfully');
  } catch (error) {
    console.error('Logout exception:', error);
  }
}

/**
 * Get current session from storage
 * @returns {Promise<Object|null>}
 */
export async function getSession() {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEYS.SESSION], (result) => {
      const session = result[STORAGE_KEYS.SESSION];
      
      if (session && session.expires_at) {
        // Check if session is expired
        const now = Math.floor(Date.now() / 1000);
        if (session.expires_at > now) {
          resolve(session);
        } else {
          // Session expired, clear it
          chrome.storage.local.remove([STORAGE_KEYS.SESSION]);
          resolve(null);
        }
      } else {
        resolve(null);
      }
    });
  });
}

/**
 * Get current user from storage
 * @returns {Promise<Object|null>}
 */
export async function getCurrentUser() {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEYS.USER], (result) => {
      resolve(result[STORAGE_KEYS.USER] || null);
    });
  });
}

/**
 * Check if user is logged in
 * @returns {Promise<boolean>}
 */
export async function isLoggedIn() {
  const session = await getSession();
  const user = await getCurrentUser();
  return !!(session && user);
}

/**
 * Refresh session if needed
 * @returns {Promise<{session: Object, error: string}>}
 */
export async function refreshSession() {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error('Session refresh error:', error);
      return { error: error.message };
    }

    if (data.session) {
      await saveUserSession(data.session, data.user);
      return { session: data.session };
    }

    return { error: 'Failed to refresh session' };
  } catch (error) {
    console.error('Session refresh exception:', error);
    return { error: 'Network error during session refresh' };
  }
}

/**
 * Save user session to chrome storage
 * @param {Object} session - Supabase session
 * @param {Object} user - Supabase user
 */
async function saveUserSession(session, user) {
  const sessionData = {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    user_id: session.user.id
  };

  const userData = {
    id: user.id,
    email: user.email,
    created_at: user.created_at,
    last_sign_in: user.last_sign_in_at
  };

  await chrome.storage.local.set({
    [STORAGE_KEYS.SESSION]: sessionData,
    [STORAGE_KEYS.USER]: userData
  });

  console.log('Session saved to storage');
}

/**
 * Get user settings
 * @returns {Promise<Object>}
 */
export async function getUserSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEYS.SETTINGS], (result) => {
      resolve(result[STORAGE_KEYS.SETTINGS] || getDefaultSettings());
    });
  });
}

/**
 * Save user settings
 * @param {Object} settings - User settings
 */
export async function saveUserSettings(settings) {
  await chrome.storage.local.set({
    [STORAGE_KEYS.SETTINGS]: settings
  });
}

/**
 * Get default settings
 * @returns {Object}
 */
function getDefaultSettings() {
  return {
    darkMode: false,
    soundEffects: true,
    autoCopy: false,
    showIcon: true,
    quality: 'balanced',
    notifications: true
  };
}

/**
 * Initialize auth state
 * @returns {Promise<boolean>}
 */
export async function initializeAuth() {
  try {
    // Check if we have a stored session
    const session = await getSession();
    
    if (session) {
      // Verify session is still valid with Supabase
      const { data, error } = await supabase.auth.getUser(session.access_token);
      
      if (error || !data.user) {
        // Session is invalid, clear it
        await logout();
        return false;
      }
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Auth initialization error:', error);
    return false;
  }
}

/**
 * Reset password
 * @param {string} email - User email
 * @returns {Promise<{success: boolean, error: string}>}
 */
export async function resetPassword(email) {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: chrome.runtime.getURL('popup.html')
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Password reset error:', error);
    return { success: false, error: 'Network error. Please try again.' };
  }
}

/**
 * Update user profile
 * @param {Object} updates - Profile updates
 * @returns {Promise<{user: Object, error: string}>}
 */
export async function updateProfile(updates) {
  try {
    const { data, error } = await supabase.auth.updateUser(updates);

    if (error) {
      return { error: error.message };
    }

    if (data.user) {
      await saveUserSession(data.session, data.user);
      return { user: data.user };
    }

    return { error: 'Failed to update profile' };
  } catch (error) {
    console.error('Profile update error:', error);
    return { error: 'Network error. Please try again.' };
  }
}

// Export constants for use in other modules
export { STORAGE_KEYS }; 