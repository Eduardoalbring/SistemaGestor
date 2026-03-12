// ============ Metas Page ============

const MetasPage = {
  async render() {
    const content = document.getElementById('main-content');
    content.innerHTML = `<div class="page-content fade-in">
      <div class="page-header">
        <div>
          <h2>🎯 Objetivos & Metas</h2>
          <p class="page-subtitle">Acompanhe seu saldo e planeje compras futuras</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-primary" onclick="MetasPage.openForm()">
            ${Helpers.icons.plus} Nova Meta/Compra
          </button>
        </div>
      </div>

      <!-- Resumo Financeiro -->
      <div class="metrics-grid" id="metas-resumo" style="margin-bottom: var(--spacing-2xl);">
        <div class="metric-card skeleton" style="height:120px"></div>
        <div class="metric-card skeleton" style="height:120px"></div>
      </div>

      <h3 style="margin-bottom: var(--spacing-md); font-size: var(--font-size-lg); font-weight: 700;">Suas Metas e Desejos</h3>
      
      <div id="metas-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: var(--spacing-lg);">
        <!-- Metas Rendered Here -->
      </div>
    </div>`;

    this.loadData();
  },

  async loadData() {
    try {
      const [metas, saldoData] = await Promise.all([
        electronAPI.metas.listar(),
        electronAPI.metas.saldo()
      ]);

      this.renderResumo(saldoData);
      this.renderMetas(metas, saldoData.saldo);
    } catch (err) {
      console.error(err);
      Toast.error('Erro ao carregar metas');
    }
  },

  renderResumo(data) {
    const grid = document.getElementById('metas-resumo');
    const { saldo, faturamento, custos, metas_compradas } = data;

    grid.innerHTML = `
      <div class="metric-card" style="background: linear-gradient(135deg, var(--text-primary) 0%, #333 100%); color: white;">
        <div class="metric-icon" style="background: rgba(255,255,255,0.1); color: white;">${Helpers.icons.dollarSign}</div>
        <div class="metric-value" style="color: white; font-size: var(--font-size-2xl);">${Helpers.formatCurrency(saldo)}</div>
        <div class="metric-label" style="color: rgba(255,255,255,0.8);">Saldo Real Disponível</div>
      </div>

      <div class="metric-card">
        <div style="display: flex; flex-direction: column; gap: 12px; height: 100%; justify-content: center;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: var(--text-secondary); font-size: var(--font-size-sm);">Faturamento Total (Aprovado)</span>
            <strong style="color: var(--color-success);">${Helpers.formatCurrency(faturamento)}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: var(--text-secondary); font-size: var(--font-size-sm);">Despesas & Materiais</span>
            <strong style="color: var(--color-danger);">${Helpers.formatCurrency(custos)}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: var(--text-secondary); font-size: var(--font-size-sm);">Metas/Compras Realizadas</span>
            <strong style="color: var(--color-warning);">${Helpers.formatCurrency(metas_compradas)}</strong>
          </div>
        </div>
      </div>
    `;
  },

  renderMetas(metas, saldoLivre) {
    const grid = document.getElementById('metas-grid');

    if (metas.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1; padding: 4rem 2rem;">
          <div style="font-size: 3rem; margin-bottom: 1rem;">🎯</div>
          <h3>Nenhuma meta cadastrada</h3>
          <p>Adicione equipamentos, ferramentas ou objetivos financeiros para acompanhar se o saldo do negócio permite a compra.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = metas.map(m => {
      const isConcluido = m.status === 'concluido';
      const podeComprar = saldoLivre >= m.valor_alvo;
      const progresso = Math.min(100, (saldoLivre / m.valor_alvo) * 100);
      const falta = m.valor_alvo - saldoLivre;
      const sobra = saldoLivre - m.valor_alvo;

      let statusHtml = '';
      if (isConcluido) {
        statusHtml = `<div style="color: var(--color-success); font-weight: 600; font-size: var(--font-size-sm); display: flex; align-items: center; gap: 4px;">✅ Comprado/Alcançado</div>`;
      } else if (podeComprar) {
        statusHtml = `
          <div style="color: var(--color-success); font-size: var(--font-size-sm); line-height: 1.4;">
            <strong>Você já pode comprar!</strong><br>
            Se comprar hoje, vai sobrar <span style="font-weight:700">${Helpers.formatCurrency(sobra)}</span> no caixa.
          </div>
        `;
      } else {
        statusHtml = `
          <div style="color: var(--color-danger); font-size: var(--font-size-sm); line-height: 1.4;">
            <strong>Falta ${Helpers.formatCurrency(falta)}</strong><br>
            Você tem ${progresso.toFixed(1)}% do valor.
          </div>
        `;
      }

      return `
        <div class="card" style="display: flex; flex-direction: column; opacity: ${isConcluido ? '0.7' : '1'}; position: relative;">
          
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--spacing-md);">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 40px; height: 40px; border-radius: var(--radius-md); background: ${isConcluido ? 'var(--color-success-bg)' : 'var(--bg-tertiary)'}; display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">
                ${m.icone === 'target' ? '🎯' : m.icone === 'laptop' ? '💻' : m.icone === 'tool' ? '🧰' : m.icone === 'car' ? '🚗' : '📦'}
              </div>
              <div>
                <h4 style="font-weight: 700; font-size: var(--font-size-md); margin-bottom: 2px;">${m.titulo}</h4>
                <div style="color: var(--text-primary); font-weight: 800; font-size: var(--font-size-lg);">${Helpers.formatCurrency(m.valor_alvo)}</div>
              </div>
            </div>
          </div>

          <!-- Progress Bar -->
          ${!isConcluido ? `
            <div style="width: 100%; height: 6px; background: var(--bg-tertiary); border-radius: 3px; margin-bottom: var(--spacing-md); overflow: hidden;">
              <div style="height: 100%; background: ${podeComprar ? 'var(--color-success)' : 'var(--text-primary)'}; width: ${progresso}%"></div>
            </div>
          ` : ''}

          <div style="flex: 1; margin-bottom: var(--spacing-lg);">
            ${statusHtml}
          </div>

          <div style="display: flex; gap: 8px; border-top: 1px solid var(--border-color); padding-top: var(--spacing-md);">
            ${!isConcluido ? `
              <button class="btn btn-primary btn-sm" style="flex: 1;" onclick="MetasPage.marcarComprado(${m.id})">
                Marcar como Comprado
              </button>
            ` : `
              <button class="btn btn-secondary btn-sm" style="flex: 1;" onclick="MetasPage.marcarPendente(${m.id})">
                Reverter
              </button>
            `}
            <button class="btn-icon" style="width: 32px; height: 32px;" onclick="MetasPage.openForm(${m.id})" title="Editar">
              ${Helpers.icons.edit}
            </button>
            <button class="btn-icon" style="width: 32px; height: 32px; color: var(--color-danger);" onclick="MetasPage.confirmDelete(${m.id}, '${m.titulo.replace(/'/g, "\\'")}')" title="Excluir">
              ${Helpers.icons.trash}
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  async openForm(id = null) {
    let meta = null;
    if (id) {
      const todas = await electronAPI.metas.listar();
      meta = todas.find(m => m.id === id);
    }
    const isEdit = meta !== null;

    Modal.open(`
      <div class="modal-header">
        <h3>${isEdit ? 'Editar Meta' : 'Nova Meta/Compra'}</h3>
        <button class="modal-close" onclick="Modal.close()">${Helpers.icons.close}</button>
      </div>
      <div class="modal-body">
        
        <div class="form-group">
          <label class="form-label">Nome do Item/Objetivo *</label>
          <input type="text" class="form-input" id="meta-titulo" placeholder="Ex: Placa de Vídeo RTX 4060, Jogo de Chaves..." value="${isEdit ? meta.titulo : ''}">
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Valor Alvo (R$) *</label>
            <input type="number" class="form-input" id="meta-valor" step="0.01" value="${isEdit ? meta.valor_alvo : ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Ícone</label>
            <select class="form-select" id="meta-icone">
              <option value="target" ${isEdit && meta.icone === 'target' ? 'selected' : ''}>🎯 Objetivo Geral</option>
              <option value="laptop" ${isEdit && meta.icone === 'laptop' ? 'selected' : ''}>💻 Eletrônicos / PC</option>
              <option value="tool" ${isEdit && meta.icone === 'tool' ? 'selected' : ''}>🧰 Ferramentas</option>
              <option value="car" ${isEdit && meta.icone === 'car' ? 'selected' : ''}>🚗 Veículo</option>
              <option value="box" ${isEdit && meta.icone === 'box' ? 'selected' : ''}>📦 Outros</option>
            </select>
          </div>
        </div>

      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
        <button class="btn btn-primary" onclick="MetasPage.saveForm(${isEdit ? meta.id : 'null'})">
          ${Helpers.icons.check} ${isEdit ? 'Salvar Alterações' : 'Criar Meta'}
        </button>
      </div>
    `);
  },

  async saveForm(id) {
    const dados = {
      titulo: document.getElementById('meta-titulo').value.trim(),
      valor_alvo: parseFloat(document.getElementById('meta-valor').value),
      icone: document.getElementById('meta-icone').value
    };

    if (!dados.titulo) return Toast.warning('O título é obrigatório');
    if (!dados.valor_alvo || dados.valor_alvo <= 0) return Toast.warning('O valor deve ser válido e maior que zero');

    try {
      if (id) {
        // preserve status
        const todas = await electronAPI.metas.listar();
        dados.status = todas.find(m => m.id === id).status;
        await electronAPI.metas.atualizar(id, dados);
        Toast.success('Meta atualizada!');
      } else {
        await electronAPI.metas.criar(dados);
        Toast.success('Meta criada!');
      }
      Modal.close();
      this.loadData();
    } catch (err) {
      Toast.error('Erro ao salvar meta');
    }
  },

  async marcarComprado(id) {
    try {
      const todas = await electronAPI.metas.listar();
      const meta = todas.find(m => m.id === id);
      meta.status = 'concluido';
      await electronAPI.metas.atualizar(id, meta);
      Toast.success(`Meta '${meta.titulo}' marcada como comprada! O valor foi debitado do seu saldo geral.`);
      this.loadData();
    } catch (err) {
      Toast.error('Erro ao atualizar meta');
    }
  },

  async marcarPendente(id) {
    try {
      const todas = await electronAPI.metas.listar();
      const meta = todas.find(m => m.id === id);
      meta.status = 'pendente';
      await electronAPI.metas.atualizar(id, meta);
      Toast.success(`Meta '${meta.titulo}' revertida para pendente.`);
      this.loadData();
    } catch (err) {
      Toast.error('Erro ao atualizar meta');
    }
  },

  confirmDelete(id, titulo) {
    Modal.confirm(`Tem certeza que deseja excluir a meta <strong>${titulo}</strong>?`, async () => {
      try {
        await electronAPI.metas.excluir(id);
        Toast.success('Meta excluída');
        this.loadData();
      } catch (err) {
        Toast.error('Erro ao excluir meta');
      }
    });
  }
};
