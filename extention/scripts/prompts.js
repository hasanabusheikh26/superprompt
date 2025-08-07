// prompts.js - SuperPrompt Prompt Library & Sync System
class SuperPromptLibrary {
  constructor(auth) {
    this.auth = auth;
    this.prompts = [];
    this.syncQueue = [];
    this.isOnline = navigator.onLine;
    this.init();
  }

  async init() {
    // Load local prompts
    this.loadLocalPrompts();
    
    // Setup online/offline detection
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
    
    // If authenticated and online, sync
    if (this.auth.isLoggedIn() && this.isOnline) {
      await this.syncPrompts();
    }
  }

  // Local Storage Management
  loadLocalPrompts() {
    try {
      const stored = localStorage.getItem('superprompt_prompts');
      this.prompts = stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading local prompts:', error);
      this.prompts = [];
    }
  }

  saveLocalPrompts() {
    try {
      localStorage.setItem('superprompt_prompts', JSON.stringify(this.prompts));
    } catch (error) {
      console.error('Error saving local prompts:', error);
    }
  }

  // Prompt CRUD Operations
  async createPrompt(content, tags = [], folder = null) {
    const prompt = {
      id: this.generateId(),
      content,
      tags,
      folder,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      synced: false
    };

    this.prompts.unshift(prompt);
    this.saveLocalPrompts();

    // Queue for sync
    if (this.auth.isLoggedIn()) {
      this.queueForSync('create', prompt);
    }

    return prompt;
  }

  async updatePrompt(id, updates) {
    const promptIndex = this.prompts.findIndex(p => p.id === id);
    if (promptIndex === -1) return null;

    const updatedPrompt = {
      ...this.prompts[promptIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
      synced: false
    };

    this.prompts[promptIndex] = updatedPrompt;
    this.saveLocalPrompts();

    // Queue for sync
    if (this.auth.isLoggedIn()) {
      this.queueForSync('update', updatedPrompt);
    }

    return updatedPrompt;
  }

  async deletePrompt(id) {
    const promptIndex = this.prompts.findIndex(p => p.id === id);
    if (promptIndex === -1) return false;

    const prompt = this.prompts[promptIndex];
    this.prompts.splice(promptIndex, 1);
    this.saveLocalPrompts();

    // Queue for sync
    if (this.auth.isLoggedIn()) {
      this.queueForSync('delete', { id: prompt.id });
    }

    return true;
  }

  getPrompt(id) {
    return this.prompts.find(p => p.id === id);
  }

  getAllPrompts() {
    return [...this.prompts];
  }

  searchPrompts(query, filters = {}) {
    let results = this.prompts;

    // Text search
    if (query) {
      const searchTerm = query.toLowerCase();
      results = results.filter(prompt => 
        prompt.content.toLowerCase().includes(searchTerm) ||
        prompt.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    }

    // Tag filter
    if (filters.tags && filters.tags.length > 0) {
      results = results.filter(prompt => 
        filters.tags.some(tag => prompt.tags.includes(tag))
      );
    }

    // Folder filter
    if (filters.folder) {
      results = results.filter(prompt => prompt.folder === filters.folder);
    }

    return results;
  }

  // Sync Management
  queueForSync(action, data) {
    const syncItem = {
      id: this.generateId(),
      action,
      data,
      timestamp: Date.now(),
      retries: 0
    };

    this.syncQueue.push(syncItem);
    this.saveSyncQueue();
  }

  saveSyncQueue() {
    try {
      localStorage.setItem('superprompt_sync_queue', JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('Error saving sync queue:', error);
    }
  }

  loadSyncQueue() {
    try {
      const stored = localStorage.getItem('superprompt_sync_queue');
      this.syncQueue = stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading sync queue:', error);
      this.syncQueue = [];
    }
  }

  async syncPrompts() {
    if (!this.auth.isLoggedIn() || !this.isOnline) return;

    try {
      // First, sync any pending changes
      await this.processSyncQueue();

      // Then, fetch latest from server
      const response = await this.auth.apiRequest('/prompts');
      const serverPrompts = response.prompts || [];

      // Merge with local prompts
      await this.mergePrompts(serverPrompts);

    } catch (error) {
      console.error('Sync error:', error);
    }
  }

  async processSyncQueue() {
    if (this.syncQueue.length === 0) return;

    const queue = [...this.syncQueue];
    this.syncQueue = [];

    for (const item of queue) {
      try {
        switch (item.action) {
          case 'create':
            await this.auth.apiRequest('/prompts', {
              method: 'POST',
              body: JSON.stringify(item.data)
            });
            break;

          case 'update':
            await this.auth.apiRequest(`/prompts/${item.data.id}`, {
              method: 'PUT',
              body: JSON.stringify(item.data)
            });
            break;

          case 'delete':
            await this.auth.apiRequest(`/prompts/${item.data.id}`, {
              method: 'DELETE'
            });
            break;
        }
      } catch (error) {
        console.error(`Sync failed for ${item.action}:`, error);
        // Re-queue if retries < 3
        if (item.retries < 3) {
          item.retries++;
          this.syncQueue.push(item);
        }
      }
    }

    this.saveSyncQueue();
  }

  async mergePrompts(serverPrompts) {
    const localPrompts = [...this.prompts];
    const merged = [];

    // Create a map of server prompts by ID
    const serverMap = new Map(serverPrompts.map(p => [p.id, p]));

    for (const localPrompt of localPrompts) {
      const serverPrompt = serverMap.get(localPrompt.id);

      if (!serverPrompt) {
        // Local prompt doesn't exist on server, keep local
        merged.push(localPrompt);
      } else {
        // Both exist, use the most recent
        const localTime = new Date(localPrompt.updatedAt);
        const serverTime = new Date(serverPrompt.updatedAt);

        if (localTime > serverTime) {
          merged.push(localPrompt);
        } else {
          merged.push({ ...serverPrompt, synced: true });
        }
      }
    }

    // Add server prompts that don't exist locally
    for (const serverPrompt of serverPrompts) {
      if (!localPrompts.find(p => p.id === serverPrompt.id)) {
        merged.push({ ...serverPrompt, synced: true });
      }
    }

    this.prompts = merged;
    this.saveLocalPrompts();
  }

  // Conflict Resolution
  async resolveConflict(localPrompt, serverPrompt) {
    // This would typically show a UI dialog
    // For now, we'll use a simple strategy
    const localTime = new Date(localPrompt.updatedAt);
    const serverTime = new Date(serverPrompt.updatedAt);

    if (localTime > serverTime) {
      return 'local';
    } else {
      return 'server';
    }
  }

  // Online/Offline Handling
  handleOnline() {
    this.isOnline = true;
    if (this.auth.isLoggedIn()) {
      this.syncPrompts();
    }
  }

  handleOffline() {
    this.isOnline = false;
  }

  // Utility Methods
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  getFolders() {
    const folders = new Set();
    this.prompts.forEach(prompt => {
      if (prompt.folder) folders.add(prompt.folder);
    });
    return Array.from(folders);
  }

  getTags() {
    const tags = new Set();
    this.prompts.forEach(prompt => {
      prompt.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags);
  }

  getStats() {
    return {
      total: this.prompts.length,
      synced: this.prompts.filter(p => p.synced).length,
      unsynced: this.prompts.filter(p => !p.synced).length,
      folders: this.getFolders().length,
      tags: this.getTags().length
    };
  }
}

// Export for use in other modules
window.SuperPromptLibrary = SuperPromptLibrary; 