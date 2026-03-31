// ============ Sidebar Component ============

const Sidebar = {
  currentPage: 'dashboard',

  pages: [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'agenda', label: 'Agenda', icon: 'calendar' },
    { id: 'clientes', label: 'Clientes', icon: 'clientes' },
    { id: 'orcamentos', label: 'Orçamentos', icon: 'orcamentos' },
    { id: 'servicos', label: 'Serviços', icon: 'servicos' },
    { id: 'custos', label: 'Custos', icon: 'dollarSign' },
    { id: 'materiais', label: 'Materiais', icon: 'materiais' },
    { id: 'metas', label: 'Metas e Compras', icon: 'package' },
    { id: 'integracoes', label: 'Integrações', icon: 'externalLink' },
  ],

  init() {
    this.render();
  },

  render() {
    const sidebar = document.getElementById('sidebar');
    sidebar.innerHTML = `
      <div class="sidebar-brand">
        <h1>SistemaGestor</h1>
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
        <p>v1.0.0</p>
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
      case 'agenda': AgendaPage.render(); break;
      case 'clientes': ClientesPage.render(); break;
      case 'orcamentos': OrcamentosPage.render(); break;
      case 'servicos': ServicosPage.render(); break;
      case 'custos': CustosPage.render(); break;
      case 'materiais': MateriaisPage.render(); break;
      case 'metas': MetasPage.render(); break;
      case 'integracoes': IntegracoesPage.render(); break;
    }
  }
};
