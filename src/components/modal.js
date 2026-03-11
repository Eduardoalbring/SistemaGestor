// ============ Modal Component ============

const Modal = {
  overlay: null,
  container: null,

  init() {
    this.overlay = document.getElementById('modal-overlay');
    this.container = document.getElementById('modal-container');

    // Close on overlay click
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.close();
    });
  },

  open(content, options = {}) {
    if (!this.overlay) this.init();

    this.container.className = `modal ${options.large ? 'modal-lg' : ''}`;
    this.container.innerHTML = content;
    this.overlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Focus first input if exists
    setTimeout(() => {
      const firstInput = this.container.querySelector('input, select, textarea');
      if (firstInput) firstInput.focus();
    }, 100);
  },

  close() {
    if (!this.overlay) return;
    this.overlay.classList.remove('active');
    document.body.style.overflow = '';
  },

  confirm(message, onConfirm) {
    this.open(`
      <div class="modal-header">
        <h3>Confirmar</h3>
        <button class="modal-close" onclick="Modal.close()">${Helpers.icons.close}</button>
      </div>
      <div class="modal-body">
        <p class="confirm-message">${message}</p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
        <button class="btn btn-danger" id="modal-confirm-btn">Confirmar</button>
      </div>
    `);

    document.getElementById('modal-confirm-btn').addEventListener('click', () => {
      onConfirm();
      this.close();
    });
  }
};
