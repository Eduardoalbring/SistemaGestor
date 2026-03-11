// ============ Toast Notifications ============

const Toast = {
  container: null,

  init() {
    this.container = document.getElementById('toast-container');
  },

  show(message, type = 'info') {
    if (!this.container) this.init();

    const icons = {
      success: Helpers.icons.check,
      error: Helpers.icons.close,
      warning: Helpers.icons.alert,
      info: Helpers.icons.info
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      ${icons[type] || icons.info}
      <span class="toast-message">${message}</span>
      <button class="toast-close" onclick="this.parentElement.remove()">
        ${Helpers.icons.close}
      </button>
    `;

    this.container.appendChild(toast);

    // Auto remove after 4 seconds
    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 4000);
  },

  success(message) { this.show(message, 'success'); },
  error(message) { this.show(message, 'error'); },
  warning(message) { this.show(message, 'warning'); },
  info(message) { this.show(message, 'info'); }
};
