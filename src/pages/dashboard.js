// ============ Dashboard Page ============

const DashboardPage = {
  async render() {
    const content = document.getElementById('main-content');
    content.innerHTML = `<div class="page-content fade-in">
      <div class="page-header">
        <div>
          <h2>${Helpers.icons.zap} Dashboard</h2>
          <p class="page-subtitle">Visão geral do seu negócio</p>
        </div>
      </div>
      <div class="metrics-grid" id="metrics-grid">
        <div class="metric-card skeleton" style="height:120px"></div>
        <div class="metric-card skeleton" style="height:120px"></div>
        <div class="metric-card skeleton" style="height:120px"></div>
        <div class="metric-card skeleton" style="height:120px"></div>
      </div>
      <div class="dashboard-grid" id="dashboard-grid"></div>
    </div>`;

    try {
      const metricas = await electronAPI.dashboard.metricas();
      const atividades = await electronAPI.dashboard.atividadesRecentes();
      this.renderMetrics(metricas);
      this.renderDashboardCards(metricas, atividades);
    } catch (err) {
      console.error('Dashboard error:', err);
    }
  },

  renderMetrics(m) {
    document.getElementById('metrics-grid').innerHTML = `
      <div class="metric-card">
        <div class="metric-icon blue">${Helpers.icons.users}</div>
        <div class="metric-value">${m.totalClientes}</div>
        <div class="metric-label">Total de Clientes</div>
      </div>
      <div class="metric-card">
        <div class="metric-icon yellow">${Helpers.icons.fileText}</div>
        <div class="metric-value">${m.orcamentosPendentes}</div>
        <div class="metric-label">Orçamentos Pendentes</div>
      </div>
      <div class="metric-card">
        <div class="metric-icon purple">${Helpers.icons.wrench}</div>
        <div class="metric-value">${m.servicosAndamento}</div>
        <div class="metric-label">Serviços em Andamento</div>
      </div>
      <div class="metric-card">
        <div class="metric-icon green">${Helpers.icons.dollarSign}</div>
        <div class="metric-value">${Helpers.formatCurrency(m.faturamento)}</div>
        <div class="metric-label">Faturamento (Aprovados)</div>
      </div>
    `;
  },

  renderDashboardCards(metricas, atividades) {
    const totalOrcamentos = metricas.orcamentosPorStatus.reduce((sum, s) => sum + s.total, 0) || 1;
    const totalServicos = metricas.servicosPorStatus.reduce((sum, s) => sum + s.total, 0) || 1;

    const statusColors = {
      rascunho: 'blue', enviado: 'yellow', aprovado: 'green', rejeitado: 'red',
      pendente: 'blue', em_andamento: 'yellow', concluido: 'green', cancelado: 'red'
    };

    document.getElementById('dashboard-grid').innerHTML = `
      <div class="card">
        <div class="card-header">
          <span class="card-title">Atividades Recentes</span>
        </div>
        <div class="activity-list">
          ${atividades.length === 0 ? `
            <div class="empty-state" style="padding: 1rem;">
              <p style="color: var(--text-tertiary); font-size: var(--font-size-sm);">Nenhuma atividade registrada ainda</p>
            </div>
          ` : atividades.map(a => `
            <div class="activity-item">
              <div class="activity-icon ${a.tipo}">
                ${a.tipo === 'orcamento' ? Helpers.icons.fileText : a.tipo === 'servico' ? Helpers.icons.wrench : Helpers.icons.users}
              </div>
              <div class="activity-info">
                <div class="activity-desc">${a.descricao}</div>
                <div class="activity-meta">${a.cliente_nome} · ${Helpers.timeAgo(a.criado_em)}</div>
              </div>
              <span class="badge badge-${a.status}">${Helpers.statusLabel(a.status)}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title">Status dos Orçamentos</span>
        </div>
        <div class="stat-bars">
          ${metricas.orcamentosPorStatus.map(s => `
            <div class="stat-bar-item">
              <div class="stat-bar-header">
                <span class="stat-bar-label">${Helpers.statusLabel(s.status)}</span>
                <span class="stat-bar-value">${s.total}</span>
              </div>
              <div class="stat-bar-track">
                <div class="stat-bar-fill ${statusColors[s.status] || 'blue'}" style="width: ${(s.total / totalOrcamentos * 100)}%"></div>
              </div>
            </div>
          `).join('')}
          ${metricas.orcamentosPorStatus.length === 0 ? '<p style="color: var(--text-tertiary); font-size: var(--font-size-sm); text-align: center; padding: 1rem;">Nenhum orçamento criado</p>' : ''}
        </div>

        <div class="card-header" style="margin-top: var(--spacing-xl);">
          <span class="card-title">Status dos Serviços</span>
        </div>
        <div class="stat-bars">
          ${metricas.servicosPorStatus.map(s => `
            <div class="stat-bar-item">
              <div class="stat-bar-header">
                <span class="stat-bar-label">${Helpers.statusLabel(s.status)}</span>
                <span class="stat-bar-value">${s.total}</span>
              </div>
              <div class="stat-bar-track">
                <div class="stat-bar-fill ${statusColors[s.status] || 'blue'}" style="width: ${(s.total / totalServicos * 100)}%"></div>
              </div>
            </div>
          `).join('')}
          ${metricas.servicosPorStatus.length === 0 ? '<p style="color: var(--text-tertiary); font-size: var(--font-size-sm); text-align: center; padding: 1rem;">Nenhum serviço criado</p>' : ''}
        </div>
      </div>
    `;
  }
};
