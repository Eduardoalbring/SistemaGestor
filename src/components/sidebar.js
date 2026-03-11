// ============ Sidebar Component ============

const Sidebar = {
  currentPage: 'dashboard',

  pages: [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'clientes', label: 'Clientes', icon: 'clientes' },
    { id: 'orcamentos', label: 'Orçamentos', icon: 'orcamentos' },
    { id: 'servicos', label: 'Serviços', icon: 'servicos' },
    { id: 'materiais', label: 'Materiais', icon: 'materiais' },
  ],

  init() {
    this.render();
  },

  render() {
    const sidebar = document.getElementById('sidebar');
    sidebar.innerHTML = `
      <div class="sidebar-brand">
        <h1>⚡ ElectriPRO</h1>
        <span>Gestão Elétrica</span>
      </div>
      <nav class="sidebar-nav">
        ${this.pages.map(page => `
          <div class="nav-item ${this.currentPage === page.id ? 'active' : ''}" 
               onclick="Sidebar.navigate('${page.id}')"
               data-page="${page.id}">
            ${Helpers.icons[page.icon]}
            <span>${page.label}</span>
          </div>
        `).join('')}
      </nav>
      <div class="sidebar-footer">
        <p>ElectriPRO v1.0.0</p>
      </div>
    `;
  },

  navigate(pageId) {
    this.currentPage = pageId;
    this.render();

    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = '<div class="page-content"></div>';

    switch (pageId) {
      case 'dashboard': DashboardPage.render(); break;
      case 'clientes': ClientesPage.render(); break;
      case 'orcamentos': OrcamentosPage.render(); break;
      case 'servicos': ServicosPage.render(); break;
      case 'materiais': MateriaisPage.render(); break;
    }
  }
};
