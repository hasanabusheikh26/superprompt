/**
 * @fileoverview Enhanced UI Components
 * @description Reusable UI components with error states and accessibility
 * @author SuperPrompt Team
 * @version 2.0.0
 */

/**
 * Loading Spinner Component
 */
class LoadingSpinner {
  constructor(size = 'medium') {
    this.size = size;
  }

  render() {
    const sizeClass = {
      small: 'sp-spinner-small',
      medium: 'sp-spinner-medium',
      large: 'sp-spinner-large'
    }[this.size] || 'sp-spinner-medium';

    return `
      <div class="sp-spinner ${sizeClass}" role="status" aria-label="Loading">
        <div class="sp-spinner-circle"></div>
        <span class="sp-sr-only">Loading...</span>
      </div>
    `;
  }
}

/**
 * Error Message Component
 */
class ErrorMessage {
  constructor(message, type = 'error', dismissible = true) {
    this.message = message;
    this.type = type;
    this.dismissible = dismissible;
  }

  render() {
    const typeClass = {
      error: 'sp-alert-error',
      warning: 'sp-alert-warning',
      info: 'sp-alert-info',
      success: 'sp-alert-success'
    }[this.type] || 'sp-alert-error';

    return `
      <div class="sp-alert ${typeClass}" role="alert" aria-live="polite">
        <div class="sp-alert-content">
          <div class="sp-alert-icon">
            ${this.getIcon()}
          </div>
          <div class="sp-alert-message">
            ${this.escapeHtml(this.message)}
          </div>
          ${this.dismissible ? `
            <button class="sp-alert-dismiss" aria-label="Dismiss alert" onclick="this.parentElement.parentElement.remove()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 6L18 18M6 18L18 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  getIcon() {
    const icons = {
      error: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
                <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
              </svg>`,
      warning: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                 <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" stroke-width="2"/>
                 <line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" stroke-width="2"/>
                 <circle cx="12" cy="17" r="1" fill="currentColor"/>
               </svg>`,
      info: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
              <path d="M12 16v-4m0-4h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>`,
      success: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                 <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2"/>
               </svg>`
    };

    return icons[this.type] || icons.error;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

/**
 * Modal Component
 */
class Modal {
  constructor(title, content, options = {}) {
    this.title = title;
    this.content = content;
    this.options = {
      closable: true,
      backdrop: true,
      size: 'medium',
      ...options
    };
    this.isOpen = false;
  }

  render() {
    const sizeClass = {
      small: 'sp-modal-small',
      medium: 'sp-modal-medium',
      large: 'sp-modal-large'
    }[this.options.size] || 'sp-modal-medium';

    return `
      <div class="sp-modal-overlay ${this.options.backdrop ? 'sp-modal-backdrop' : ''}" 
           onclick="${this.options.backdrop ? 'this.closest(\'.sp-modal-overlay\').remove()' : ''}"
           role="dialog" 
           aria-modal="true" 
           aria-labelledby="sp-modal-title">
        <div class="sp-modal ${sizeClass}" onclick="event.stopPropagation()">
          <div class="sp-modal-header">
            <h2 id="sp-modal-title" class="sp-modal-title">${this.escapeHtml(this.title)}</h2>
            ${this.options.closable ? `
              <button class="sp-modal-close" aria-label="Close modal" onclick="this.closest('.sp-modal-overlay').remove()">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 6L18 18M6 18L18 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
            ` : ''}
          </div>
          <div class="sp-modal-content">
            ${this.content}
          </div>
        </div>
      </div>
    `;
  }

  show() {
    if (this.isOpen) return;

    const modalHtml = this.render();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    this.isOpen = true;

    // Focus management
    const modal = document.querySelector('.sp-modal-overlay:last-child');
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    // Escape key handler
    const handleEscape = (e) => {
      if (e.key === 'Escape' && this.options.closable) {
        this.close();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    
    document.addEventListener('keydown', handleEscape);
  }

  close() {
    const modal = document.querySelector('.sp-modal-overlay:last-child');
    if (modal) {
      modal.remove();
    }
    this.isOpen = false;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

/**
 * Button Component
 */
class Button {
  constructor(text, options = {}) {
    this.text = text;
    this.options = {
      type: 'primary',
      size: 'medium',
      disabled: false,
      loading: false,
      icon: null,
      onClick: null,
      ...options
    };
  }

  render() {
    const typeClass = {
      primary: 'sp-btn-primary',
      secondary: 'sp-btn-secondary',
      danger: 'sp-btn-danger',
      ghost: 'sp-btn-ghost'
    }[this.options.type] || 'sp-btn-primary';

    const sizeClass = {
      small: 'sp-btn-small',
      medium: 'sp-btn-medium',
      large: 'sp-btn-large'
    }[this.options.size] || 'sp-btn-medium';

    return `
      <button 
        class="sp-btn ${typeClass} ${sizeClass} ${this.options.disabled ? 'sp-btn-disabled' : ''} ${this.options.loading ? 'sp-btn-loading' : ''}"
        ${this.options.disabled || this.options.loading ? 'disabled' : ''}
        ${this.options.onClick ? `onclick="${this.options.onClick}"` : ''}
        type="button">
        ${this.options.loading ? new LoadingSpinner('small').render() : ''}
        ${this.options.icon ? `<span class="sp-btn-icon">${this.options.icon}</span>` : ''}
        <span class="sp-btn-text">${this.escapeHtml(this.text)}</span>
      </button>
    `;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

/**
 * Input Component
 */
class Input {
  constructor(options = {}) {
    this.options = {
      type: 'text',
      placeholder: '',
      value: '',
      label: '',
      error: '',
      required: false,
      disabled: false,
      id: `sp-input-${Date.now()}`,
      ...options
    };
  }

  render() {
    return `
      <div class="sp-input-group ${this.options.error ? 'sp-input-error' : ''}">
        ${this.options.label ? `
          <label for="${this.options.id}" class="sp-input-label">
            ${this.escapeHtml(this.options.label)}
            ${this.options.required ? '<span class="sp-required">*</span>' : ''}
          </label>
        ` : ''}
        <input 
          type="${this.options.type}"
          id="${this.options.id}"
          class="sp-input"
          placeholder="${this.escapeHtml(this.options.placeholder)}"
          value="${this.escapeHtml(this.options.value)}"
          ${this.options.required ? 'required' : ''}
          ${this.options.disabled ? 'disabled' : ''}
          aria-invalid="${this.options.error ? 'true' : 'false'}"
          ${this.options.error ? `aria-describedby="${this.options.id}-error"` : ''}
        />
        ${this.options.error ? `
          <div id="${this.options.id}-error" class="sp-input-error-text" role="alert">
            ${this.escapeHtml(this.options.error)}
          </div>
        ` : ''}
      </div>
    `;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

/**
 * Textarea Component
 */
class Textarea {
  constructor(options = {}) {
    this.options = {
      placeholder: '',
      value: '',
      label: '',
      error: '',
      required: false,
      disabled: false,
      rows: 4,
      id: `sp-textarea-${Date.now()}`,
      ...options
    };
  }

  render() {
    return `
      <div class="sp-input-group ${this.options.error ? 'sp-input-error' : ''}">
        ${this.options.label ? `
          <label for="${this.options.id}" class="sp-input-label">
            ${this.escapeHtml(this.options.label)}
            ${this.options.required ? '<span class="sp-required">*</span>' : ''}
          </label>
        ` : ''}
        <textarea 
          id="${this.options.id}"
          class="sp-textarea"
          placeholder="${this.escapeHtml(this.options.placeholder)}"
          rows="${this.options.rows}"
          ${this.options.required ? 'required' : ''}
          ${this.options.disabled ? 'disabled' : ''}
          aria-invalid="${this.options.error ? 'true' : 'false'}"
          ${this.options.error ? `aria-describedby="${this.options.id}-error"` : ''}
        >${this.escapeHtml(this.options.value)}</textarea>
        ${this.options.error ? `
          <div id="${this.options.id}-error" class="sp-input-error-text" role="alert">
            ${this.escapeHtml(this.options.error)}
          </div>
        ` : ''}
      </div>
    `;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

/**
 * Toast Notification Component
 */
class Toast {
  static show(message, type = 'info', duration = 5000) {
    const toast = new Toast(message, type, duration);
    toast.show();
    return toast;
  }

  constructor(message, type = 'info', duration = 5000) {
    this.message = message;
    this.type = type;
    this.duration = duration;
    this.id = `sp-toast-${Date.now()}-${Math.random()}`;
  }

  render() {
    const typeClass = {
      error: 'sp-toast-error',
      warning: 'sp-toast-warning',
      info: 'sp-toast-info',
      success: 'sp-toast-success'
    }[this.type] || 'sp-toast-info';

    return `
      <div id="${this.id}" class="sp-toast ${typeClass}" role="alert" aria-live="polite">
        <div class="sp-toast-content">
          <div class="sp-toast-icon">
            ${this.getIcon()}
          </div>
          <div class="sp-toast-message">
            ${this.escapeHtml(this.message)}
          </div>
          <button class="sp-toast-close" aria-label="Dismiss notification" onclick="document.getElementById('${this.id}').remove()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 6L18 18M6 18L18 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  show() {
    // Create toast container if it doesn't exist
    let container = document.getElementById('sp-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'sp-toast-container';
      container.className = 'sp-toast-container';
      document.body.appendChild(container);
    }

    // Add toast to container
    container.insertAdjacentHTML('beforeend', this.render());

    // Auto-dismiss after duration
    if (this.duration > 0) {
      setTimeout(() => {
        const toastElement = document.getElementById(this.id);
        if (toastElement) {
          toastElement.remove();
        }
      }, this.duration);
    }
  }

  getIcon() {
    const icons = {
      error: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
                <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
              </svg>`,
      warning: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                 <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" stroke-width="2"/>
                 <line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" stroke-width="2"/>
                 <circle cx="12" cy="17" r="1" fill="currentColor"/>
               </svg>`,
      info: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
              <path d="M12 16v-4m0-4h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>`,
      success: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                 <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2"/>
               </svg>`
    };

    return icons[this.type] || icons.info;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Export components
window.SuperPromptUI = {
  LoadingSpinner,
  ErrorMessage,
  Modal,
  Button,
  Input,
  Textarea,
  Toast
};