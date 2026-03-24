// ============ Orçamentos Page ============

const OrcamentosPage = {
  filtros: { busca: '', status: '', mes: new Date().toISOString().slice(0, 7) },

  async render() {
    this._currentViewingId = null;
    this._materiaisCache = null; // Reset cache on page load
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
          <div class="table-filters" style="display: flex; gap: var(--spacing-sm); align-items: center; flex-wrap: wrap;">
            <input type="month" class="form-input" style="width: 160px; padding: 6px 10px;" 
                   value="${this.filtros.mes}" onchange="OrcamentosPage.filterMes(this.value)">
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
        { 
          label: 'Status', 
          render: (r) => `
            <select class="form-select status-select-mini bg-${r.status}" onchange="OrcamentosPage.changeStatus(${r.id}, this.value)" style="width: 120px; font-size: 0.75rem; padding: 4px 8px; height: auto;">
                <option value="rascunho" ${r.status === 'rascunho' ? 'selected' : ''}>Rascunho</option>
                <option value="enviado" ${r.status === 'enviado' ? 'selected' : ''}>Enviado</option>
                <option value="aprovado" ${r.status === 'aprovado' ? 'selected' : ''}>Aprovado</option>
                <option value="rejeitado" ${r.status === 'rejeitado' ? 'selected' : ''}>Rejeitado</option>
            </select>
          ` 
        },
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

  filterMes(mes) {
    this.filtros.mes = mes;
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
      titulo: document.getElementById('orc-titulo').value.trim() || 'Sem Título',
      descricao: document.getElementById('orc-descricao').value.trim(),
    };

    if (!dados.cliente_id) return Toast.warning('Selecione um cliente');

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
      this._currentViewingId = id;
      this._materiaisCache = null; // Reset cache to ensure latest materials are available

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
            <div class="status-change-group">
              <span class="badge badge-${orc.status}" style="font-size: 0.8rem; padding: 6px 16px;">${Helpers.statusLabel(orc.status)}</span>
              <select class="form-select status-select" onchange="OrcamentosPage.changeStatus(${orc.id}, this.value)" title="Alterar status">
                <option value="rascunho" ${orc.status === 'rascunho' ? 'selected' : ''}>Rascunho</option>
                <option value="enviado" ${orc.status === 'enviado' ? 'selected' : ''}>Enviado</option>
                <option value="aprovado" ${orc.status === 'aprovado' ? 'selected' : ''}>Aprovado</option>
                <option value="rejeitado" ${orc.status === 'rejeitado' ? 'selected' : ''}>Rejeitado</option>
              </select>
            </div>
            <button class="btn btn-sm btn-primary" onclick="OrcamentosPage.exportToPDF(${orc.id})">
              ${Helpers.icons.printer} Exportar PDF
            </button>
            ${orc.servico_id ? `<button class="btn btn-sm btn-secondary" onclick="ServicosPage.viewDetails(${orc.servico_id})">${Helpers.icons.wrench} Ver Serviço</button>` : ''}
          </div>
        </div>

        <div style="display: flex; gap: 8px; margin-bottom: var(--spacing-md);">
            <span class="badge badge-enviado">${orc.tipo === 'inicial' ? 'Orçamento Inicial' : 'Adicional de Execução'}</span>
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
            <div class="itens-header" style="display: grid; grid-template-columns: 1fr 50px 100px 100px 100px 40px 70px; gap: 8px; padding: 8px; background: var(--bg-secondary); border-radius: 6px 6px 0 0; font-size: 0.7rem; font-weight: 700; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.5px;">
                <div>Nome / Descrição</div>
                <div style="text-align: center;">Qtd.</div>
                <div>Preço Unit.</div>
                <div>Custo Unit.</div>
                <div style="text-align: right;">Total</div>
                <div style="text-align: center;" title="Fornecido pelo Cliente">Cli.</div>
                <div></div>
            </div>
            <div class="itens-list" id="orc-itens-list">
              ${orc.itens.length === 0 ? `
                <div class="empty-state">
                  ${Helpers.icons.package}
                  <h3>Nenhum item adicionado</h3>
                  <p>Adicione materiais e recursos ao orçamento</p>
                </div>
              ` : orc.itens.map(item => `
                <div class="item-row ${item.comprado_pelo_cliente ? 'item-client-provided' : ''}" data-item-id="${item.id}" data-material-id="${item.material_id || ''}" style="display: grid; grid-template-columns: 1fr 50px 100px 100px 100px 40px 70px; align-items: center; gap: 8px; padding: 8px; border-bottom: 1px solid var(--border-color); position: relative; ${item.comprado_pelo_cliente ? 'background: var(--bg-secondary);' : ''}">
                  <div style="display: flex; flex-direction: column; gap: 4px; width: 100%;">
                    <input type="text" value="${item.descricao}" placeholder="Nome do item"
                           list="materiais-list"
                           onchange="OrcamentosPage.updateItem(${item.id}, 'descricao', this.value)"
                           oninput="OrcamentosPage.onItemNameInput(${item.id}, this.value)"
                           onfocus="OrcamentosPage.onItemNameInput(${item.id}, this.value)"
                           onblur="setTimeout(function(){ OrcamentosPage.clearMaterialSuggestions(${item.id}); }, 150)">
                    <input type="text" value="${item.detalhes || ''}" placeholder="Detalhes (opcional)"
                           style="font-size: 0.75rem; padding: 4px 8px; color: var(--text-secondary);"
                           onchange="OrcamentosPage.updateItem(${item.id}, 'detalhes', this.value)">
                  </div>
                  <input type="number" value="${item.quantidade}" placeholder="Qtd" min="0.01" step="0.01"
                         onchange="OrcamentosPage.updateItem(${item.id}, 'quantidade', this.value)"
                         style="text-align: center;">
                   <div class="input-prefix-wrapper">
                     <span class="input-prefix-text">R$</span>
                     <input type="number" value="${item.valor_unitario}" placeholder="Venda" min="0" step="0.01"
                            class="input-with-prefix"
                            onchange="OrcamentosPage.updateItem(${item.id}, 'valor_unitario', this.value)">
                   </div>
                   <div class="input-prefix-wrapper">
                     <span class="input-prefix-text" style="color: var(--color-warning);">R$</span>
                     <input type="number" value="${item.preco_custo_unitario || 0}" placeholder="Custo" min="0" step="0.01"
                            class="input-with-prefix" style="color: var(--color-warning);"
                            onchange="OrcamentosPage.updateItem(${item.id}, 'preco_custo_unitario', this.value)">
                   </div>
                  <div style="text-align: right; font-weight: 600; color: ${item.comprado_pelo_cliente ? 'var(--text-tertiary)' : 'var(--text-primary)'}; font-size: var(--font-size-sm); padding: 0 8px; ${item.comprado_pelo_cliente ? 'text-decoration: line-through;' : ''}">
                    ${Helpers.formatCurrency(item.quantidade * item.valor_unitario)}
                  </div>
                  <div style="display: flex; justify-content: center;">
                    <input type="checkbox" style="width: 18px; height: 18px; cursor: pointer;" 
                           ${item.comprado_pelo_cliente ? 'checked' : ''} 
                           onchange="OrcamentosPage.updateItem(${item.id}, 'comprado_pelo_cliente', this.checked ? 1 : 0)">
                  </div>
                  <div style="display: flex; gap: 4px; justify-content: flex-end;">
                    <button class="btn-icon" style="width:28px;height:28px;" onclick="OrcamentosPage.searchMaterial(${item.id}, ${orc.id})" title="Procurar Material">
                      ${Helpers.icons.search}
                    </button>
                    <button class="btn-icon" style="width:28px;height:28px;" onclick="OrcamentosPage.removeItem(${item.id}, ${orc.id})" title="Remover">
                      ${Helpers.icons.trash}
                    </button>
                  </div>
                  <div class="material-suggestions" data-item-id="${item.id}" style="position: absolute; top: 40px; left: 8px; right: 8px; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 6px; box-shadow: 0 10px 25px rgba(15, 23, 42, 0.22); max-height: 220px; overflow-y: auto; display: none; z-index: 50;"></div>
                </div>
              `).join('')}
            </div>
            <datalist id="materiais-list"></datalist>
          </div>

          <div class="orcamento-summary" id="orc-summary-container">
            ${this.renderSummary(orc)}
          </div>
        </div>
      </div>`;

      // Load materials for autocomplete
      this.loadMateriaisDatalist();
    } catch (err) {
      Toast.error('Erro ao carregar orçamento');
      console.error(err);
    }
  },

  renderSummary(orc) {
    const totalItens = (orc.itens || [])
      .filter(i => !i.comprado_pelo_cliente)
      .reduce((s, i) => s + (i.quantidade * i.valor_unitario), 0);
    const total = totalItens + (orc.mao_de_obra || 0) - (orc.desconto || 0);

    return `
      <div class="summary-card">
        <div class="card-header"><span class="card-title">Resumo</span></div>
        <div class="summary-line">
          <span>Subtotal Materiais</span>
          <span id="summary-subtotal">${Helpers.formatCurrency(totalItens)}</span>
        </div>
        <div class="summary-line" style="align-items: center;">
          <span>Mão de Obra</span>
          <div class="summary-input-wrapper">
             <span class="currency-symbol">R$</span>
             <input type="number" class="summary-input" value="${orc.mao_de_obra || 0}" step="0.01"
                    onchange="OrcamentosPage.updateOrcamentoField(${orc.id}, 'mao_de_obra', this.value)">
          </div>
        </div>
        <div class="summary-line" style="color: var(--color-danger); align-items: center;">
          <span>Desconto</span>
          <div class="summary-input-wrapper">
             <span class="currency-symbol" style="color: var(--color-danger);">- R$</span>
             <input type="number" class="summary-input" value="${orc.desconto || 0}" step="0.01"
                    style="color: var(--color-danger);"
                    onchange="OrcamentosPage.updateOrcamentoField(${orc.id}, 'desconto', this.value)">
          </div>
        </div>
        <div class="summary-line total">
          <span>Total</span>
          <span id="summary-total">${Helpers.formatCurrency(total)}</span>
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
    `;
  },

  async refreshSummary(orcamentoId) {
    try {
      const orc = await electronAPI.orcamentos.buscar(orcamentoId);
      const container = document.getElementById('orc-summary-container');
      if (container && orc) {
        // Find focused element to restore it later if it's an input in summary
        const focusedId = document.activeElement ? document.activeElement.onchange?.name || document.activeElement.closest('.summary-input-wrapper')?.querySelector('input')?.onchange?.name : null;
        
        container.innerHTML = this.renderSummary(orc);
      }
    } catch (err) {
      console.error('Erro ao atualizar resumo:', err);
    }
  },

  async updateOrcamentoField(id, field, value) {
    try {
      const orc = await electronAPI.orcamentos.buscar(id);
      if (!orc) return;
      
      const dados = {
        cliente_id: orc.cliente_id,
        titulo: orc.titulo,
        descricao: orc.descricao,
        mao_de_obra: orc.mao_de_obra,
        desconto: orc.desconto
      };
      
      dados[field] = parseFloat(value) || 0;
      
      await electronAPI.orcamentos.atualizar(id, dados);
      this.refreshSummary(id);
    } catch (err) {
      console.error('Erro ao atualizar campo do orçamento:', err);
      Toast.error('Erro ao atualizar valor');
    }
  },

  async addItem(orcamentoId) {
    try {
      await electronAPI.orcamentoItens.criar({
        orcamento_id: orcamentoId,
        descricao: '',
        detalhes: '',
        quantidade: 0,
        valor_unitario: 0,
        preco_custo_unitario: 0,
        categoria: 'material',
        comprado_pelo_cliente: 0
      });
      this.viewDetails(orcamentoId);
    } catch (err) {
      Toast.error('Erro ao adicionar item');
    }
  },

  async updateItem(itemId, field, value) {
    try {
      const container = document.querySelector(`.item-row[data-item-id="${itemId}"]`);
      if (!container) return;

      const inputs = container.querySelectorAll('input');
      const dados = {
        material_id: container.dataset.materialId ? parseInt(container.dataset.materialId) : null,
        descricao: inputs[0].value,
        detalhes: inputs[1].value,
        quantidade: parseFloat(inputs[2].value) || 0,
        valor_unitario: parseFloat(inputs[3].value) || 0,
        preco_custo_unitario: parseFloat(inputs[4].value) || 0, // Novo campo
        comprado_pelo_cliente: inputs[5].checked ? 1 : 0,
        categoria: 'material'
      };

      // Atualiza o campo específico que mudou
      if (field) {
        dados[field] = (field === 'quantidade' || field === 'valor_unitario' || field === 'preco_custo_unitario') ? parseFloat(value) || 0 : value;
      }

      await electronAPI.orcamentoItens.atualizar(itemId, dados);

      // Se estamos em detalhes, o resumo total precisa ser atualizado. 
      if (this._currentViewingId) {
         // Pequeno delay para garantir que o banco persistiu a mudança antes do refresh
         setTimeout(() => {
            if (this._currentViewingId) this.refreshSummary(this._currentViewingId);
         }, 100);
      }

      // Atualiza o estilo visual da linha se necessário
      const subtotalEl = container.querySelector('div[style*="text-align: right"]');
      if (subtotalEl) {
        subtotalEl.textContent = Helpers.formatCurrency(dados.quantidade * dados.valor_unitario);
        
        if (dados.comprado_pelo_cliente) {
          subtotalEl.style.textDecoration = 'line-through';
          subtotalEl.style.color = 'var(--text-tertiary)';
          container.classList.add('item-client-provided');
          container.style.background = 'var(--bg-secondary)';
        } else {
          subtotalEl.style.textDecoration = 'none';
          subtotalEl.style.color = 'var(--text-primary)';
          container.classList.remove('item-client-provided');
          container.style.background = 'transparent';
        }
      }
    } catch (err) {
      console.error('Erro ao atualizar item:', err);
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

  async searchMaterial(itemId, orcamentoId) {
    const materiais = await electronAPI.materiais.listar({});

    Modal.open(`
      <div class="modal-header">
        <h3>${Helpers.icons.package} Buscar Material</h3>
        <button class="modal-close" onclick="Modal.close()">${Helpers.icons.close}</button>
      </div>
      <div class="modal-body">
        <div class="search-container" style="margin-bottom: var(--spacing-md);">
          ${Helpers.icons.search}
          <input type="text" class="search-input" id="material-search-input"
                 placeholder="Pesquisar material..."
                 oninput="OrcamentosPage._filterMaterialList(this.value)">
        </div>
        <div id="material-search-results" style="max-height: 360px; overflow-y: auto;">
          ${materiais.length === 0
            ? '<p style="color: var(--text-tertiary); text-align: center; padding: 2rem;">Nenhum material cadastrado ainda</p>'
            : materiais.map(m => `
              <div class="material-search-item" data-nome="${m.nome.toLowerCase()}" onclick="OrcamentosPage._selectMaterial(${itemId}, ${orcamentoId}, '${m.nome.replace(/'/g, "\\'")}', ${m.preco_venda || m.valor_referencia}, ${m.preco_custo || 0}, ${m.id})">
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; cursor: pointer; border-radius: 6px; transition: background 0.15s;" onmouseover="this.style.background='var(--bg-tertiary)'" onmouseout="this.style.background='transparent'">
                  <div>
                    <div style="font-weight: 600; font-size: var(--font-size-sm);">${m.nome}</div>
                    <div style="font-size: 0.75rem; color: var(--text-tertiary);">${Helpers.categoriaLabel(m.categoria)} · ${Helpers.unidadeLabel(m.unidade)}</div>
                  </div>
                  <div style="font-weight: 600; color: var(--accent-primary); font-size: var(--font-size-sm); white-space: nowrap; margin-left: 12px;">${Helpers.formatCurrency(m.valor_referencia)}</div>
                </div>
              </div>
            `).join('')
          }
        </div>
      </div>
    `);
  },

  _filterMaterialList(query) {
    const items = document.querySelectorAll('.material-search-item');
    const q = query.toLowerCase();
    items.forEach(el => {
      el.style.display = el.dataset.nome.includes(q) ? '' : 'none';
    });
  },

  async _selectMaterial(itemId, orcamentoId, nome, valorVenda, valorCusto, materialId) {
    Modal.close();
    this.applyMaterialToItem(itemId, nome, valorVenda, valorCusto, materialId);
    Toast.success(`Material "${nome}" aplicado ao item`);
  },

  async changeStatus(id, status) {
    try {
      await electronAPI.orcamentos.atualizarStatus(id, status);
      Toast.success(`Status atualizado para ${Helpers.statusLabel(status)}`);
      // check if we are in list or details
      if (document.getElementById('orc-table-body')) {
        this.loadData();
      } else {
        this.viewDetails(id);
      }
    } catch (err) {
      Toast.error('Erro ao atualizar status');
    }
  },

  async loadMateriaisDatalist() {
    try {
      // Mantém cache em memória para autocomplete rápido
      if (!this._materiaisCache) {
        const materiais = await electronAPI.materiais.listar({});
        this._materiaisCache = materiais;
      }

      const datalist = document.getElementById('materiais-list');
      if (datalist && this._materiaisCache) {
        datalist.innerHTML = this._materiaisCache.map(m => `<option value="${m.nome}">`).join('');
      }
    } catch (err) {
      console.error('Erro ao carregar datalist de materiais:', err);
    }
  },

  async onItemNameInput(itemId, value) {
    // Garante que temos os materiais em cache
    if (!this._materiaisCache) {
      await this.loadMateriaisDatalist();
    }
    if (!this._materiaisCache) return;

    const term = (value || '').toLowerCase().trim();

    // Se o nome bate exatamente com um material, preenche o valor automaticamente
    const exact = this._materiaisCache.find(m => m.nome.toLowerCase() === term);
    if (exact) {
      const container = document.querySelector(`.item-row[data-item-id="${itemId}"]`);
      if (container) {
        const inputs = container.querySelectorAll('input');
        inputs[3].value = exact.preco_venda || exact.valor_referencia;
        inputs[4].value = exact.preco_custo || 0;
        container.dataset.materialId = exact.id;
        
        const q = parseFloat(inputs[2].value) || 0;
        const v = exact.preco_venda || exact.valor_referencia;
        
        // Update subtotal in UI immediately
        const subtotalEl = container.querySelector('div[style*="text-align: right"]');
        if (subtotalEl) subtotalEl.textContent = Helpers.formatCurrency(q * v);

        // Atualiza múltiplos campos
        await electronAPI.orcamentoItens.atualizar(itemId, {
            material_id: exact.id,
            descricao: exact.nome,
            detalhes: inputs[1].value,
            quantidade: q,
            valor_unitario: v,
            preco_custo_unitario: exact.preco_custo || 0,
            categoria: 'material'
        });
        
        if (this._currentViewingId) this.refreshSummary(this._currentViewingId);
      }
    }

    // Monta lista de sugestões conforme digita ou foca
    const matches = term 
      ? this._materiaisCache.filter(m => m.nome.toLowerCase().includes(term)).slice(0, 15)
      : this._materiaisCache.slice(0, 15); // Mostra primeiros 15 se vazio

    const container = document.querySelector(`.material-suggestions[data-item-id="${itemId}"]`);
    if (!container) return;

    if (!matches.length) {
      this.clearMaterialSuggestions(itemId);
      return;
    }

    container.innerHTML = `
      <div style="padding: 6px 10px; font-size: 0.65rem; color: var(--text-tertiary); text-transform: uppercase; font-weight: 700; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between;">
        <span>${term ? 'Resultados' : 'Materiais Cadastrados'}</span>
        <span>Preço</span>
      </div>
      ${matches.map(m => `
        <button type="button"
                style="width: 100%; text-align: left; padding: 10px 12px; border: none; background: transparent; cursor: pointer; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.03);"
                onmouseover="this.style.background='var(--bg-tertiary)'"
                onmouseout="this.style.background='transparent'"
                onclick="OrcamentosPage.applyMaterialToItem(${itemId}, '${m.nome.replace(/'/g, "\\'")}', ${m.preco_venda || m.valor_referencia}, ${m.preco_custo || 0}, ${m.id})">
          <div>
            <div style="font-size: 0.8rem; color: var(--text-primary); font-weight: 500;">${m.nome}</div>
            <div style="font-size: 0.65rem; color: var(--text-tertiary);">${m.categoria} · ${m.unidade}</div>
          </div>
          <span style="font-size: 0.8rem; color: var(--accent-primary); font-weight: 600;">${Helpers.formatCurrency(m.preco_venda || m.valor_referencia)}</span>
        </button>
      `).join('')}
    `;
    container.style.display = 'block';
  },

  clearMaterialSuggestions(itemId) {
    const container = document.querySelector(`.material-suggestions[data-item-id="${itemId}"]`);
    if (container) {
      container.style.display = 'none';
      container.innerHTML = '';
    }
  },

  applyMaterialToItem(itemId, nome, valorVenda, valorCusto, materialId) {
    const container = document.querySelector(`.item-row[data-item-id="${itemId}"]`);
    if (!container) return;

    const inputs = container.querySelectorAll('input');
    if (inputs[0]) inputs[0].value = nome;
    if (inputs[3]) inputs[3].value = valorVenda;
    if (inputs[4]) inputs[4].value = valorCusto;
    if (materialId) container.dataset.materialId = materialId;

    const q = parseFloat(inputs[2].value) || 0;
    
    // Update subtotal in UI immediately
    const subtotalEl = container.querySelector('div[style*="text-align: right"]');
    if (subtotalEl) subtotalEl.textContent = Helpers.formatCurrency(q * valorVenda);

    // Salva alteração do item com os preços do material
    electronAPI.orcamentoItens.atualizar(itemId, {
        material_id: materialId,
        descricao: nome,
        detalhes: inputs[1]?.value || '',
        quantidade: q,
        valor_unitario: valorVenda,
        preco_custo_unitario: valorCusto,
        categoria: 'material'
    }).then(() => {
        if (this._currentViewingId) this.refreshSummary(this._currentViewingId);
    });
    
    this.clearMaterialSuggestions(itemId);
  },

  async exportToPDF(id) {
    try {
      const orc = await electronAPI.orcamentos.buscar(id);
      if (!orc) return Toast.error('Orçamento não encontrado');
      
      Toast.info('Gerando PDF...');
      await PDFExport.generateOrcamento(orc);
      Toast.success('PDF gerado com sucesso!');
    } catch (err) {
      console.error('Erro ao exportar PDF:', err);
      Toast.error('Erro ao gerar PDF');
    }
  }
};
