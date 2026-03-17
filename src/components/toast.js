// ============ Toast Notifications ============

const Toast = {
  container: null,

  init() {
    this.container = document.getElementById('toast-container');
  },

  show(message, type = 'info', options = {}) {
    if (!this.container) this.init();
    const { action } = options;

    const icons = {
      success: Helpers.icons.check,
      error: Helpers.icons.close,
      warning: Helpers.icons.alert,
      info: Helpers.icons.info
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let actionHtml = '';
    if (action) {
      const actionId = `toast-action-${Date.now()}`;
      actionHtml = `<button id="${actionId}" class="btn btn-sm btn-ghost" style="color: inherit; border: 1px solid currentColor; margin-left: var(--spacing-md); padding: 2px 8px; font-weight: 600;">${action.label}</button>`;
      
      // We need to attach the listener after appending to DOM
      setTimeout(() => {
        const btn = document.getElementById(actionId);
        if (btn) {
          btn.onclick = (e) => {
            e.stopPropagation();
            action.callback();
            toast.remove();
          };
        }
      }, 0);
    }

    toast.innerHTML = `
      ${icons[type] || icons.info}
      <span class="toast-message">${message}</span>
      ${actionHtml}
      <button class="toast-close" onclick="this.parentElement.remove()">
        ${Helpers.icons.close}
      </button>
    `;

    this.container.appendChild(toast);

    // Auto remove after 5 seconds if it has an action, or 4 otherwise
    const duration = action ? 6000 : 4000;
    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, duration);
  },

  success(message, options) { this.show(message, 'success', options); },
  error(message, options) { this.show(message, 'error', options); },
  warning(message, options) { this.show(message, 'warning', options); },
  info(message, options) { this.show(message, 'info', options); }
};
