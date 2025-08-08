/**
 * @fileoverview Enhanced Prompt Manager
 * @description React-style prompt manager with error handling and offline support
 * @author SuperPrompt Team
 * @version 2.0.0
 */

class PromptManager {
  constructor() {
    this.listeners = new Set();
    this.state = {
      prompts: [],
      isLoading: false,
      error: null,
      lastSync: null,
      isOnline: navigator.onLine
    };
    
    this.init();
    this.setupEventListeners();
  }

  /**
   * Initialize prompt manager
   */
  async init() {
    try {
      this.setState({ isLoading: true, error: null });
      
      // Load cached prompts first
      await this.loadCachedPrompts();
      
      // Sync with server if online
      if (this.state.isOnline) {
        await this.syncPrompts();
      }
      
    } catch (error) {
      this.handleError('Initialization failed', error);
    } finally {
      this.setState({ isLoading: false });
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Online/offline detection
    window.addEventListener('online', () => {
      this.setState({ isOnline: true });
      this.syncPrompts();
    });
    
    window.addEventListener('offline', () => {
      this.setState({ isOnline: false });
    });
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
   * Load cached prompts from storage
   */
  async loadCachedPrompts() {
    try {
      const storage = await chrome.storage.local.get(['superprompt_prompts']);
      const cachedPrompts = storage.superprompt_prompts || [];
      
      this.setState({ 
        prompts: cachedPrompts,
        lastSync: storage.superprompt_last_sync || null
      });
      
    } catch (error) {
      console.error('Failed to load cached prompts:', error);
    }
  }

  /**
   * Save prompts to cache
   */
  async saveToCache() {
    try {
      await chrome.storage.local.set({
        superprompt_prompts: this.state.prompts,
        superprompt_last_sync: Date.now()
      });
    } catch (error) {
      console.error('Failed to save to cache:', error);
    }
  }

  /**
   * Sync prompts with server
   */
  async syncPrompts() {
    if (!window.authManager?.state.isAuthenticated) {
      return;
    }

    try {
      this.setState({ isLoading: true, error: null });

      const response = await window.authManager.apiRequest('/prompts', {
        method: 'GET'
      });

      if (response.success) {
        this.setState({ 
          prompts: response.prompts || [],
          lastSync: Date.now()
        });
        
        await this.saveToCache();
      }

    } catch (error) {
      this.handleError('Sync failed', error);
    } finally {
      this.setState({ isLoading: false });
    }
  }

  /**
   * Create a new prompt
   */
  async createPrompt(promptData) {
    try {
      this.setState({ isLoading: true, error: null });

      const tempId = `temp_${Date.now()}`;
      const tempPrompt = {
        id: tempId,
        ...promptData,
        createdAt: new Date().toISOString(),
        isTemp: true
      };

      // Add to local state immediately (optimistic update)
      this.setState({
        prompts: [tempPrompt, ...this.state.prompts]
      });

      if (this.state.isOnline && window.authManager?.state.isAuthenticated) {
        // Sync with server
        const response = await window.authManager.apiRequest('/prompts', {
          method: 'POST',
          body: JSON.stringify(promptData)
        });

        if (response.success) {
          // Replace temp prompt with server response
          this.setState({
            prompts: this.state.prompts.map(p => 
              p.id === tempId ? { ...response.prompt, isTemp: false } : p
            )
          });
        } else {
          throw new Error(response.error || 'Failed to create prompt');
        }
      }

      await this.saveToCache();
      return { success: true, prompt: tempPrompt };

    } catch (error) {
      // Remove temp prompt on error
      this.setState({
        prompts: this.state.prompts.filter(p => p.id !== tempId)
      });
      
      const errorMessage = this.getErrorMessage(error);
      this.setState({ error: errorMessage });
      return { success: false, error: errorMessage };
    } finally {
      this.setState({ isLoading: false });
    }
  }

  /**
   * Update an existing prompt
   */
  async updatePrompt(promptId, updates) {
    try {
      this.setState({ isLoading: true, error: null });

      const originalPrompt = this.state.prompts.find(p => p.id === promptId);
      if (!originalPrompt) {
        throw new Error('Prompt not found');
      }

      // Update local state immediately (optimistic update)
      this.setState({
        prompts: this.state.prompts.map(p => 
          p.id === promptId ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
        )
      });

      if (this.state.isOnline && window.authManager?.state.isAuthenticated) {
        // Sync with server
        const response = await window.authManager.apiRequest(`/prompts/${promptId}`, {
          method: 'PUT',
          body: JSON.stringify(updates)
        });

        if (response.success) {
          // Update with server response
          this.setState({
            prompts: this.state.prompts.map(p => 
              p.id === promptId ? response.prompt : p
            )
          });
        } else {
          throw new Error(response.error || 'Failed to update prompt');
        }
      }

      await this.saveToCache();
      return { success: true };

    } catch (error) {
      // Revert on error
      this.setState({
        prompts: this.state.prompts.map(p => 
          p.id === promptId ? originalPrompt : p
        )
      });
      
      const errorMessage = this.getErrorMessage(error);
      this.setState({ error: errorMessage });
      return { success: false, error: errorMessage };
    } finally {
      this.setState({ isLoading: false });
    }
  }

  /**
   * Delete a prompt
   */
  async deletePrompt(promptId) {
    try {
      this.setState({ isLoading: true, error: null });

      const originalPrompts = [...this.state.prompts];
      
      // Remove from local state immediately (optimistic update)
      this.setState({
        prompts: this.state.prompts.filter(p => p.id !== promptId)
      });

      if (this.state.isOnline && window.authManager?.state.isAuthenticated) {
        // Sync with server
        const response = await window.authManager.apiRequest(`/prompts/${promptId}`, {
          method: 'DELETE'
        });

        if (!response.success) {
          throw new Error(response.error || 'Failed to delete prompt');
        }
      }

      await this.saveToCache();
      return { success: true };

    } catch (error) {
      // Revert on error
      this.setState({ prompts: originalPrompts });
      
      const errorMessage = this.getErrorMessage(error);
      this.setState({ error: errorMessage });
      return { success: false, error: errorMessage };
    } finally {
      this.setState({ isLoading: false });
    }
  }

  /**
   * Search prompts
   */
  searchPrompts(query, filters = {}) {
    const { prompts } = this.state;
    
    if (!query && Object.keys(filters).length === 0) {
      return prompts;
    }

    return prompts.filter(prompt => {
      // Text search
      if (query) {
        const searchText = query.toLowerCase();
        const matchesText = 
          prompt.title?.toLowerCase().includes(searchText) ||
          prompt.content?.toLowerCase().includes(searchText) ||
          prompt.tags?.some(tag => tag.toLowerCase().includes(searchText));
        
        if (!matchesText) return false;
      }

      // Category filter
      if (filters.category && prompt.category !== filters.category) {
        return false;
      }

      // Tags filter
      if (filters.tags && filters.tags.length > 0) {
        const hasTag = filters.tags.some(tag => 
          prompt.tags?.includes(tag)
        );
        if (!hasTag) return false;
      }

      // Folder filter
      if (filters.folder && prompt.folder !== filters.folder) {
        return false;
      }

      return true;
    });
  }

  /**
   * Get prompt by ID
   */
  getPrompt(promptId) {
    return this.state.prompts.find(p => p.id === promptId);
  }

  /**
   * Get prompts by category
   */
  getPromptsByCategory(category) {
    return this.state.prompts.filter(p => p.category === category);
  }

  /**
   * Get recent prompts
   */
  getRecentPrompts(limit = 10) {
    return [...this.state.prompts]
      .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
      .slice(0, limit);
  }

  /**
   * Get favorite prompts
   */
  getFavoritePrompts() {
    return this.state.prompts.filter(p => p.isFavorite);
  }

  /**
   * Toggle favorite status
   */
  async toggleFavorite(promptId) {
    const prompt = this.getPrompt(promptId);
    if (!prompt) return { success: false, error: 'Prompt not found' };

    return await this.updatePrompt(promptId, {
      isFavorite: !prompt.isFavorite
    });
  }

  /**
   * Get usage statistics
   */
  getStats() {
    const { prompts } = this.state;
    
    return {
      total: prompts.length,
      categories: this.getCategoryStats(),
      recent: this.getRecentPrompts(5).length,
      favorites: this.getFavoritePrompts().length,
      lastSync: this.state.lastSync
    };
  }

  /**
   * Get category statistics
   */
  getCategoryStats() {
    const stats = {};
    
    this.state.prompts.forEach(prompt => {
      const category = prompt.category || 'uncategorized';
      stats[category] = (stats[category] || 0) + 1;
    });
    
    return stats;
  }

  /**
   * Export prompts
   */
  exportPrompts() {
    const exportData = {
      prompts: this.state.prompts,
      exportDate: new Date().toISOString(),
      version: '2.0.0'
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import prompts
   */
  async importPrompts(jsonData) {
    try {
      const data = JSON.parse(jsonData);
      
      if (!data.prompts || !Array.isArray(data.prompts)) {
        throw new Error('Invalid import data format');
      }

      // Merge with existing prompts
      const importedPrompts = data.prompts.map(prompt => ({
        ...prompt,
        id: `imported_${Date.now()}_${Math.random()}`,
        importedAt: new Date().toISOString()
      }));

      this.setState({
        prompts: [...this.state.prompts, ...importedPrompts]
      });

      await this.saveToCache();
      return { success: true, count: importedPrompts.length };

    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      this.setState({ error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get user-friendly error message
   */
  getErrorMessage(error) {
    if (error.message.includes('Failed to fetch')) {
      return 'Network error. Working offline.';
    } else if (error.message.includes('401')) {
      return 'Authentication failed. Please log in again.';
    } else if (error.message.includes('429')) {
      return 'Too many requests. Please wait a moment.';
    } else if (error.message.includes('500')) {
      return 'Server error. Changes saved locally.';
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
   * Clear error state
   */
  clearError() {
    this.setState({ error: null });
  }
}

// Export singleton instance
window.PromptManager = window.PromptManager || new PromptManager();
window.promptManager = window.PromptManager;