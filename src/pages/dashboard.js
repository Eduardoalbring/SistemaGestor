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
      <div class="metrics-grid" id="metrics-grid" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));">
        <div class="metric-card skeleton" style="height:120px"></div>
        <div class="metric-card skeleton" style="height:120px"></div>
        <div class="metric-card skeleton" style="height:120px"></div>
        <div class="metric-card skeleton" style="height:120px"></div>
        <div class="metric-card skeleton" style="height:120px"></div>
      </div>
      <div class="dashboard-grid" id="dashboard-grid"></div>
      <div class="dashboard-monthly-grid" id="dashboard-monthly-grid"></div>
    </div>`;

    try {
      const metricas = await electronAPI.dashboard.metricas();
      const atividades = await electronAPI.dashboard.atividadesRecentes();
      const mensais = await electronAPI.dashboard.metricasMensais();
      this.renderMetrics(metricas);
      this.renderDashboardCards(metricas, atividades);
      this.renderMonthlyCards(mensais);
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
      <div class="metric-card">
        <div class="metric-icon" style="background: var(--color-danger-bg); color: var(--color-danger);">${Helpers.icons.dollarSign}</div>
        <div class="metric-value" style="color: var(--color-danger);">${Helpers.formatCurrency(m.custosMes)}</div>
        <div class="metric-label">Despesas (Mês Atual)</div>
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
            <div class="activity-item activity-item-link" onclick="${
              a.tipo === 'orcamento' ? `OrcamentosPage.viewDetails(${a.id})` :
              a.tipo === 'servico' ? `ServicosPage.viewDetails(${a.id})` :
              `ClientesPage.viewDetails(${a.id})`
            }" title="Clique para abrir">
              <div class="activity-icon ${a.tipo}">
                ${a.tipo === 'orcamento' ? Helpers.icons.fileText : a.tipo === 'servico' ? Helpers.icons.wrench : Helpers.icons.users}
              </div>
              <div class="activity-info">
                <div class="activity-desc">${a.descricao}</div>
                <div class="activity-meta">${a.cliente_nome} · ${Helpers.timeAgo(a.criado_em)}</div>
              </div>
              <span class="badge badge-${a.status}">${Helpers.statusLabel(a.status)}</span>
              <div class="activity-arrow">${Helpers.icons.arrowRight}</div>
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
  },

  renderMonthlyCards(mensais) {
    const { clientesPorMes, faturamentoPorMes } = mensais;

    const mesesLabel = (mes) => {
      const [ano, m] = mes.split('-');
      const nomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
      return `${nomes[parseInt(m) - 1]}/${ano.slice(2)}`;
    };

    document.getElementById('dashboard-monthly-grid').innerHTML = `
      <div class="card">
        <div class="card-header">
          <span class="card-title">${Helpers.icons.users} Novos Clientes por Mês</span>
        </div>
        <div class="monthly-table">
          ${clientesPorMes.length === 0
            ? '<p style="color: var(--text-tertiary); text-align: center; padding: 1rem; font-size: var(--font-size-sm);">Sem dados ainda</p>'
            : `<table class="simple-table">
                <thead><tr><th>Mês</th><th style="text-align:right;">Novos Clientes</th></tr></thead>
                <tbody>
                  ${clientesPorMes.map(r => `<tr><td>${mesesLabel(r.mes)}</td><td style="text-align:right;"><strong>${r.total}</strong></td></tr>`).join('')}
                </tbody>
              </table>`
          }
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <span class="card-title">${Helpers.icons.dollarSign} Faturamento por Mês</span>
        </div>
        <div class="monthly-table">
          ${faturamentoPorMes.length === 0
            ? '<p style="color: var(--text-tertiary); text-align: center; padding: 1rem; font-size: var(--font-size-sm);">Sem dados ainda</p>'
            : `<table class="simple-table">
                <thead><tr><th>Mês</th><th style="text-align:right;">Total Aprovado</th></tr></thead>
                <tbody>
                  ${faturamentoPorMes.map(r => `<tr><td>${mesesLabel(r.mes)}</td><td style="text-align:right;"><strong style="color:var(--color-success);">${Helpers.formatCurrency(r.total)}</strong></td></tr>`).join('')}
                </tbody>
              </table>`
          }
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <span class="card-title">${Helpers.icons.dollarSign} Despesas por Mês (Pagas)</span>
        </div>
        <div class="monthly-table">
          ${mensais.custosPorMes?.length === 0
            ? '<p style="color: var(--text-tertiary); text-align: center; padding: 1rem; font-size: var(--font-size-sm);">Sem dados ainda</p>'
            : `<table class="simple-table">
                <thead><tr><th>Mês</th><th style="text-align:right;">Total Pago</th></tr></thead>
                <tbody>
                  ${mensais.custosPorMes.map(r => `<tr><td>${mesesLabel(r.mes)}</td><td style="text-align:right;"><strong style="color:var(--color-danger);">${Helpers.formatCurrency(r.total)}</strong></td></tr>`).join('')}
                </tbody>
              </table>`
          }
        </div>
      </div>
    `;
  }
};
