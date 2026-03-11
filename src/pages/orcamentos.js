// ============ Orçamentos Page ============

const OrcamentosPage = {
  filtros: { busca: '', status: '' },

  async render() {
    const content = document.getElementById('main-content');
    content.innerHTML = `<div class="page-content fade-in">
      <div class="page-header">
        <div>
          <h2>${Helpers.icons.orcamentos} Orçamentos</h2>
          <p class="page-subtitle">Gerencie seus orçamentos e propostas</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-primary" onclick="OrcamentosPage.openForm()">
            ${Helpers.icons.plus} Novo Orçamento
          </button>
        </div>
      </div>
      <div class="table-container">
        <div class="table-toolbar">
          <div class="search-container" style="width: 320px;">
            ${Helpers.icons.search}
            <input type="text" class="search-input" placeholder="Buscar orçamento ou cliente..."
                   id="orc-search" oninput="OrcamentosPage.onSearch(this.value)">
          </div>
          <div class="table-filters">
            <button class="filter-chip ${!this.filtros.status ? 'active' : ''}" onclick="OrcamentosPage.filterStatus('')">Todos</button>
            <button class="filter-chip ${this.filtros.status === 'rascunho' ? 'active' : ''}" onclick="OrcamentosPage.filterStatus('rascunho')">Rascunho</button>
            <button class="filter-chip ${this.filtros.status === 'enviado' ? 'active' : ''}" onclick="OrcamentosPage.filterStatus('enviado')">Enviado</button>
            <button class="filter-chip ${this.filtros.status === 'aprovado' ? 'active' : ''}" onclick="OrcamentosPage.filterStatus('aprovado')">Aprovado</button>
            <button class="filter-chip ${this.filtros.status === 'rejeitado' ? 'active' : ''}" onclick="OrcamentosPage.filterStatus('rejeitado')">Rejeitado</button>
          </div>
        </div>
        <div id="orc-table-body"></div>
      </div>
    </div>`;

    this.loadData();
  },

  async loadData() {
    try {
      const orcamentos = await electronAPI.orcamentos.listar(this.filtros);
      this.renderTable(orcamentos);
    } catch (err) {
      Toast.error('Erro ao carregar orçamentos');
    }
  },

  renderTable(orcamentos) {
    document.getElementById('orc-table-body').innerHTML = Table.render({
      columns: [
        { label: 'Título', render: (r) => `<strong>${r.titulo}</strong>` },
        { label: 'Cliente', key: 'cliente_nome' },
        { label: 'Status', render: (r) => `<span class="badge badge-${r.status}">${Helpers.statusLabel(r.status)}</span>` },
        {
          label: 'Total',
          render: (r) => {
            const total = (r.total_itens || 0) + (r.mao_de_obra || 0) - (r.desconto || 0);
            return `<strong>${Helpers.formatCurrency(total)}</strong>`;
          }
        },
        { label: 'Criado em', render: (r) => Helpers.formatDate(r.criado_em) }
      ],
      data: orcamentos,
      emptyMessage: 'Nenhum orçamento encontrado',
      emptyIcon: Helpers.icons.fileText,
      actions: (r) => `
        <button class="btn-icon" title="Detalhes" onclick="OrcamentosPage.viewDetails(${r.id})">${Helpers.icons.eye}</button>
        <button class="btn-icon" title="Editar" onclick="OrcamentosPage.openForm(${r.id})">${Helpers.icons.edit}</button>
        <button class="btn-icon" title="Excluir" onclick="OrcamentosPage.confirmDelete(${r.id})">${Helpers.icons.trash}</button>
      `
    });
  },

  onSearch: Helpers.debounce(function(value) {
    OrcamentosPage.filtros.busca = value;
    OrcamentosPage.loadData();
  }, 300),

  filterStatus(status) {
    this.filtros.status = status;
    this.render();
  },

  async openForm(id = null) {
    const clientes = await electronAPI.clientes.listar({});
    let orcamento = null;

    if (id) {
      orcamento = await electronAPI.orcamentos.buscar(id);
    }

    const isEdit = orcamento !== null;

    Modal.open(`
      <div class="modal-header">
        <h3>${isEdit ? 'Editar Orçamento' : 'Novo Orçamento'}</h3>
        <button class="modal-close" onclick="Modal.close()">${Helpers.icons.close}</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Cliente *</label>
          <select class="form-select" id="orc-cliente">
            <option value="">Selecione um cliente</option>
            ${clientes.map(c => `<option value="${c.id}" ${isEdit && orcamento.cliente_id === c.id ? 'selected' : ''}>${c.nome}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Título *</label>
          <input type="text" class="form-input" id="orc-titulo" placeholder="Ex: Instalação elétrica sala de estar" value="${isEdit ? orcamento.titulo : ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Descrição</label>
          <textarea class="form-textarea" id="orc-descricao" placeholder="Descreva o serviço a ser realizado...">${isEdit ? (orcamento.descricao || '') : ''}</textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Mão de Obra (R$)</label>
            <input type="number" class="form-input" id="orc-mao-obra" placeholder="0,00" step="0.01" value="${isEdit ? orcamento.mao_de_obra : '0'}">
          </div>
          <div class="form-group">
            <label class="form-label">Desconto (R$)</label>
            <input type="number" class="form-input" id="orc-desconto" placeholder="0,00" step="0.01" value="${isEdit ? orcamento.desconto : '0'}">
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
        <button class="btn btn-primary" onclick="OrcamentosPage.saveForm(${isEdit ? orcamento.id : 'null'})">
          ${Helpers.icons.check} ${isEdit ? 'Salvar' : 'Criar Orçamento'}
        </button>
      </div>
    `, { large: false });
  },

  async saveForm(id) {
    const dados = {
      cliente_id: parseInt(document.getElementById('orc-cliente').value),
      titulo: document.getElementById('orc-titulo').value.trim(),
      descricao: document.getElementById('orc-descricao').value.trim(),
      mao_de_obra: parseFloat(document.getElementById('orc-mao-obra').value) || 0,
      desconto: parseFloat(document.getElementById('orc-desconto').value) || 0,
    };

    if (!dados.cliente_id) return Toast.warning('Selecione um cliente');
    if (!dados.titulo) return Toast.warning('Título é obrigatório');

    try {
      if (id) {
        await electronAPI.orcamentos.atualizar(id, dados);
        Toast.success('Orçamento atualizado!');
      } else {
        await electronAPI.orcamentos.criar(dados);
        Toast.success('Orçamento criado!');
      }
      Modal.close();
      this.loadData();
    } catch (err) {
      Toast.error('Erro ao salvar orçamento');
    }
  },

  confirmDelete(id) {
    Modal.confirm('Tem certeza que deseja excluir este orçamento? Todos os itens serão removidos.', async () => {
      try {
        await electronAPI.orcamentos.excluir(id);
        Toast.success('Orçamento excluído');
        this.loadData();
      } catch (err) {
        Toast.error('Erro ao excluir');
      }
    });
  },

  // ============ Detail View with Items ============
  async viewDetails(id) {
    try {
      const orc = await electronAPI.orcamentos.buscar(id);
      if (!orc) return Toast.error('Orçamento não encontrado');

      const totalItens = orc.itens.reduce((s, i) => s + (i.quantidade * i.valor_unitario), 0);
      const total = totalItens + (orc.mao_de_obra || 0) - (orc.desconto || 0);

      const content = document.getElementById('main-content');
      content.innerHTML = `<div class="page-content fade-in">
        <div class="page-header">
          <div style="display: flex; align-items: center; gap: 16px;">
            <button class="btn-icon" onclick="OrcamentosPage.render()" title="Voltar">${Helpers.icons.arrowLeft}</button>
            <div>
              <h2>${orc.titulo}</h2>
              <p class="page-subtitle">${orc.cliente_nome} · ${Helpers.formatDate(orc.criado_em)}</p>
            </div>
          </div>
          <div class="header-actions">
            <span class="badge badge-${orc.status}" style="font-size: 0.8rem; padding: 6px 16px;">${Helpers.statusLabel(orc.status)}</span>
            ${orc.status === 'rascunho' ? `<button class="btn btn-sm btn-secondary" onclick="OrcamentosPage.changeStatus(${orc.id}, 'enviado')">Marcar como Enviado</button>` : ''}
            ${orc.status === 'enviado' ? `
              <button class="btn btn-sm btn-success" onclick="OrcamentosPage.changeStatus(${orc.id}, 'aprovado')">Aprovar</button>
              <button class="btn btn-sm btn-danger" onclick="OrcamentosPage.changeStatus(${orc.id}, 'rejeitado')">Rejeitar</button>
            ` : ''}
            ${orc.status === 'aprovado' ? `<button class="btn btn-sm btn-primary" onclick="ServicosPage.openFormFromOrcamento(${orc.id}, ${orc.cliente_id})">Criar Ordem de Serviço</button>` : ''}
          </div>
        </div>

        ${orc.descricao ? `<div class="card" style="margin-bottom: var(--spacing-lg);"><p style="color: var(--text-secondary); font-size: var(--font-size-sm);">${orc.descricao}</p></div>` : ''}

        <div class="orcamento-builder">
          <div>
            <div class="card-header" style="margin-bottom: var(--spacing-md);">
              <span class="card-title">Itens do Orçamento</span>
              <button class="btn btn-sm btn-primary" onclick="OrcamentosPage.addItem(${orc.id})">
                ${Helpers.icons.plus} Adicionar Item
              </button>
            </div>
            <div class="itens-list" id="orc-itens-list">
              ${orc.itens.length === 0 ? `
                <div class="empty-state">
                  ${Helpers.icons.package}
                  <h3>Nenhum item adicionado</h3>
                  <p>Adicione materiais e recursos ao orçamento</p>
                </div>
              ` : orc.itens.map(item => `
                <div class="item-row">
                  <input type="text" value="${item.descricao}" placeholder="Descrição do item"
                         onchange="OrcamentosPage.updateItem(${item.id}, 'descricao', this.value)">
                  <input type="number" value="${item.quantidade}" placeholder="Qtd" min="0.01" step="0.01"
                         onchange="OrcamentosPage.updateItem(${item.id}, 'quantidade', this.value)"
                         style="text-align: center;">
                  <input type="number" value="${item.valor_unitario}" placeholder="Valor un." min="0" step="0.01"
                         onchange="OrcamentosPage.updateItem(${item.id}, 'valor_unitario', this.value)">
                  <div style="text-align: right; font-weight: 600; color: var(--text-primary); font-size: var(--font-size-sm); padding: 0 8px;">
                    ${Helpers.formatCurrency(item.quantidade * item.valor_unitario)}
                  </div>
                  <div style="display: flex; gap: 4px;">
                    <button class="amazon-btn" onclick="OrcamentosPage.searchAmazon('${item.descricao.replace(/'/g, "\\'")}')" title="Buscar na Amazon">
                      ${Helpers.icons.shoppingCart} Amazon
                    </button>
                    <button class="btn-icon" style="width:28px;height:28px;" onclick="OrcamentosPage.removeItem(${item.id}, ${orc.id})" title="Remover">
                      ${Helpers.icons.trash}
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="orcamento-summary">
            <div class="summary-card">
              <div class="card-header"><span class="card-title">Resumo</span></div>
              <div class="summary-line">
                <span>Subtotal Materiais</span>
                <span>${Helpers.formatCurrency(totalItens)}</span>
              </div>
              <div class="summary-line">
                <span>Mão de Obra</span>
                <span>${Helpers.formatCurrency(orc.mao_de_obra)}</span>
              </div>
              <div class="summary-line" style="color: var(--color-danger);">
                <span>Desconto</span>
                <span>- ${Helpers.formatCurrency(orc.desconto)}</span>
              </div>
              <div class="summary-line total">
                <span>Total</span>
                <span>${Helpers.formatCurrency(total)}</span>
              </div>
            </div>

            <div style="margin-top: var(--spacing-lg);">
              <div class="card-header"><span class="card-title">Cliente</span></div>
              <div class="detail-item" style="margin-top: 8px;">
                <div class="detail-label">Nome</div>
                <div class="detail-value">${orc.cliente_nome}</div>
              </div>
              ${orc.cliente_telefone ? `<div class="detail-item" style="margin-top: 8px;"><div class="detail-label">Telefone</div><div class="detail-value">${orc.cliente_telefone}</div></div>` : ''}
              ${orc.cliente_email ? `<div class="detail-item" style="margin-top: 8px;"><div class="detail-label">Email</div><div class="detail-value">${orc.cliente_email}</div></div>` : ''}
            </div>
          </div>
        </div>
      </div>`;
    } catch (err) {
      Toast.error('Erro ao carregar orçamento');
      console.error(err);
    }
  },

  async addItem(orcamentoId) {
    try {
      await electronAPI.orcamentoItens.criar({
        orcamento_id: orcamentoId,
        descricao: 'Novo item',
        quantidade: 1,
        valor_unitario: 0,
        categoria: 'material'
      });
      this.viewDetails(orcamentoId);
    } catch (err) {
      Toast.error('Erro ao adicionar item');
    }
  },

  async updateItem(itemId, field, value) {
    try {
      const item = { [field]: field === 'quantidade' || field === 'valor_unitario' ? parseFloat(value) || 0 : value };

      // Get current item data to merge
      const container = event.target.closest('.item-row');
      const inputs = container.querySelectorAll('input');
      const dados = {
        descricao: inputs[0].value,
        quantidade: parseFloat(inputs[1].value) || 1,
        valor_unitario: parseFloat(inputs[2].value) || 0,
        categoria: 'material',
        ...item
      };

      await electronAPI.orcamentoItens.atualizar(itemId, dados);

      // Update subtotal display
      const subtotalEl = container.querySelector('div[style*="text-align: right"]');
      if (subtotalEl) {
        subtotalEl.textContent = Helpers.formatCurrency(dados.quantidade * dados.valor_unitario);
      }
    } catch (err) {
      Toast.error('Erro ao atualizar item');
    }
  },

  async removeItem(itemId, orcamentoId) {
    try {
      await electronAPI.orcamentoItens.excluir(itemId);
      this.viewDetails(orcamentoId);
      Toast.success('Item removido');
    } catch (err) {
      Toast.error('Erro ao remover item');
    }
  },

  searchAmazon(term) {
    const url = Helpers.amazonSearchUrl(term);
    electronAPI.openExternal(url);
  },

  async changeStatus(id, status) {
    try {
      await electronAPI.orcamentos.atualizarStatus(id, status);
      Toast.success(`Status atualizado para ${Helpers.statusLabel(status)}`);
      this.viewDetails(id);
    } catch (err) {
      Toast.error('Erro ao atualizar status');
    }
  }
};
