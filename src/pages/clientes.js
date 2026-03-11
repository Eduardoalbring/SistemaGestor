// ============ Clientes Page ============

const ClientesPage = {
  filtros: { busca: '', tipo: '' },

  async render() {
    const content = document.getElementById('main-content');
    content.innerHTML = `<div class="page-content fade-in">
      <div class="page-header">
        <div>
          <h2>${Helpers.icons.clientes} Clientes</h2>
          <p class="page-subtitle">Gerencie seus clientes</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-primary" onclick="ClientesPage.openForm()">
            ${Helpers.icons.plus} Novo Cliente
          </button>
        </div>
      </div>
      <div class="table-container">
        <div class="table-toolbar">
          <div class="search-container" style="width: 320px;">
            ${Helpers.icons.search}
            <input type="text" class="search-input" placeholder="Buscar por nome, telefone, email..."
                   id="clientes-search" oninput="ClientesPage.onSearch(this.value)">
          </div>
          <div class="table-filters">
            <button class="filter-chip ${!this.filtros.tipo ? 'active' : ''}" onclick="ClientesPage.filterTipo('')">Todos</button>
            <button class="filter-chip ${this.filtros.tipo === 'residencial' ? 'active' : ''}" onclick="ClientesPage.filterTipo('residencial')">Residencial</button>
            <button class="filter-chip ${this.filtros.tipo === 'predial' ? 'active' : ''}" onclick="ClientesPage.filterTipo('predial')">Predial</button>
            <button class="filter-chip ${this.filtros.tipo === 'comercial' ? 'active' : ''}" onclick="ClientesPage.filterTipo('comercial')">Comercial</button>
          </div>
        </div>
        <div id="clientes-table-body"></div>
      </div>
    </div>`;

    this.loadData();
  },

  async loadData() {
    try {
      const clientes = await electronAPI.clientes.listar(this.filtros);
      this.renderTable(clientes);
    } catch (err) {
      Toast.error('Erro ao carregar clientes');
      console.error(err);
    }
  },

  renderTable(clientes) {
    document.getElementById('clientes-table-body').innerHTML = Table.render({
      columns: [
        {
          label: 'Cliente', 
          render: (row) => `
            <div style="display: flex; align-items: center; gap: 12px;">
              <div class="client-avatar" style="width:36px;height:36px;font-size:0.8rem;border-radius:8px;">
                ${Helpers.getInitials(row.nome)}
              </div>
              <div>
                <div style="font-weight: 600;">${row.nome}</div>
                <div style="font-size: 0.75rem; color: var(--text-tertiary);">${row.email || '—'}</div>
              </div>
            </div>
          `
        },
        { label: 'Telefone', key: 'telefone' },
        { 
          label: 'Tipo', 
          render: (row) => `<span class="badge badge-${row.tipo === 'residencial' ? 'enviado' : 'em_andamento'}">${Helpers.tipoLabel(row.tipo)}</span>`
        },
        { label: 'Endereço', render: (row) => `<span style="max-width:200px; display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${row.endereco || '—'}</span>` },
        { label: 'Criado em', render: (row) => Helpers.formatDate(row.criado_em) }
      ],
      data: clientes,
      emptyMessage: 'Nenhum cliente cadastrado',
      emptyIcon: Helpers.icons.users,
      actions: (row) => `
        <button class="btn-icon" title="Detalhes" onclick="ClientesPage.viewDetails(${row.id})">
          ${Helpers.icons.eye}
        </button>
        <button class="btn-icon" title="Editar" onclick="ClientesPage.openForm(${row.id})">
          ${Helpers.icons.edit}
        </button>
        <button class="btn-icon" title="Excluir" onclick="ClientesPage.confirmDelete(${row.id}, '${row.nome.replace(/'/g, "\\'")}')">
          ${Helpers.icons.trash}
        </button>
      `
    });
  },

  onSearch: Helpers.debounce(function(value) {
    ClientesPage.filtros.busca = value;
    ClientesPage.loadData();
  }, 300),

  filterTipo(tipo) {
    this.filtros.tipo = tipo;
    this.render();
  },

  openForm(id = null) {
    const isEdit = id !== null;
    
    if (isEdit) {
      electronAPI.clientes.buscar(id).then(cliente => {
        this._renderForm(cliente);
      });
    } else {
      this._renderForm(null);
    }
  },

  _renderForm(cliente) {
    const isEdit = cliente !== null;
    Modal.open(`
      <div class="modal-header">
        <h3>${isEdit ? 'Editar Cliente' : 'Novo Cliente'}</h3>
        <button class="modal-close" onclick="Modal.close()">${Helpers.icons.close}</button>
      </div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Nome *</label>
            <input type="text" class="form-input" id="cliente-nome" placeholder="Nome completo" value="${isEdit ? cliente.nome : ''}">
          </div>
          <div class="form-group">
            <label class="form-label">CPF/CNPJ</label>
            <input type="text" class="form-input" id="cliente-cpf" placeholder="000.000.000-00" value="${isEdit ? (cliente.cpf_cnpj || '') : ''}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Telefone</label>
            <input type="text" class="form-input" id="cliente-telefone" placeholder="(00) 00000-0000" value="${isEdit ? (cliente.telefone || '') : ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Email</label>
            <input type="email" class="form-input" id="cliente-email" placeholder="email@exemplo.com" value="${isEdit ? (cliente.email || '') : ''}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Tipo</label>
            <select class="form-select" id="cliente-tipo">
              <option value="residencial" ${isEdit && cliente.tipo === 'residencial' ? 'selected' : ''}>Residencial</option>
              <option value="predial" ${isEdit && cliente.tipo === 'predial' ? 'selected' : ''}>Predial</option>
              <option value="comercial" ${isEdit && cliente.tipo === 'comercial' ? 'selected' : ''}>Comercial</option>
              <option value="industrial" ${isEdit && cliente.tipo === 'industrial' ? 'selected' : ''}>Industrial</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Endereço</label>
            <input type="text" class="form-input" id="cliente-endereco" placeholder="Rua, número, bairro, cidade" value="${isEdit ? (cliente.endereco || '') : ''}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Observações</label>
          <textarea class="form-textarea" id="cliente-notas" placeholder="Notas adicionais...">${isEdit ? (cliente.notas || '') : ''}</textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
        <button class="btn btn-primary" onclick="ClientesPage.saveForm(${isEdit ? cliente.id : 'null'})">
          ${Helpers.icons.check} ${isEdit ? 'Salvar' : 'Criar Cliente'}
        </button>
      </div>
    `);
  },

  async saveForm(id) {
    const dados = {
      nome: document.getElementById('cliente-nome').value.trim(),
      telefone: document.getElementById('cliente-telefone').value.trim(),
      email: document.getElementById('cliente-email').value.trim(),
      endereco: document.getElementById('cliente-endereco').value.trim(),
      cpf_cnpj: document.getElementById('cliente-cpf').value.trim(),
      tipo: document.getElementById('cliente-tipo').value,
      notas: document.getElementById('cliente-notas').value.trim(),
    };

    if (!dados.nome) {
      Toast.warning('Nome é obrigatório');
      return;
    }

    try {
      if (id) {
        await electronAPI.clientes.atualizar(id, dados);
        Toast.success('Cliente atualizado com sucesso!');
      } else {
        await electronAPI.clientes.criar(dados);
        Toast.success('Cliente criado com sucesso!');
      }
      Modal.close();
      this.loadData();
    } catch (err) {
      Toast.error('Erro ao salvar cliente');
      console.error(err);
    }
  },

  confirmDelete(id, nome) {
    Modal.confirm(
      `Tem certeza que deseja excluir o cliente <strong>${nome}</strong>? Esta ação não pode ser desfeita e irá excluir todos os orçamentos e serviços associados.`,
      async () => {
        try {
          await electronAPI.clientes.excluir(id);
          Toast.success('Cliente excluído com sucesso');
          this.loadData();
        } catch (err) {
          Toast.error('Erro ao excluir cliente');
        }
      }
    );
  },

  async viewDetails(id) {
    try {
      const cliente = await electronAPI.clientes.buscar(id);
      if (!cliente) return Toast.error('Cliente não encontrado');

      const content = document.getElementById('main-content');
      content.innerHTML = `<div class="page-content fade-in">
        <div class="page-header">
          <div style="display: flex; align-items: center; gap: 16px;">
            <button class="btn-icon" onclick="ClientesPage.render()" title="Voltar">
              ${Helpers.icons.arrowLeft}
            </button>
            <div>
              <h2>Detalhes do Cliente</h2>
              <p class="page-subtitle">${cliente.nome}</p>
            </div>
          </div>
          <div class="header-actions">
            <button class="btn btn-secondary" onclick="ClientesPage.openForm(${cliente.id})">
              ${Helpers.icons.edit} Editar
            </button>
          </div>
        </div>

        <div class="client-header">
          <div class="client-avatar">${Helpers.getInitials(cliente.nome)}</div>
          <div class="client-info">
            <h3>${cliente.nome}</h3>
            <p>${Helpers.tipoLabel(cliente.tipo)} · Cadastrado em ${Helpers.formatDate(cliente.criado_em)}</p>
          </div>
        </div>

        <div class="detail-grid">
          <div class="detail-item">
            <div class="detail-label">${Helpers.icons.phone} Telefone</div>
            <div class="detail-value">${cliente.telefone || '—'}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">${Helpers.icons.mail} Email</div>
            <div class="detail-value">${cliente.email || '—'}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">${Helpers.icons.mapPin} Endereço</div>
            <div class="detail-value">${cliente.endereco || '—'}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">CPF/CNPJ</div>
            <div class="detail-value">${cliente.cpf_cnpj || '—'}</div>
          </div>
        </div>

        ${cliente.notas ? `<div class="card" style="margin-bottom: var(--spacing-xl);"><div class="card-header"><span class="card-title">Observações</span></div><p style="color: var(--text-secondary); font-size: var(--font-size-sm); line-height: 1.6;">${cliente.notas}</p></div>` : ''}

        <div class="tabs">
          <button class="tab-btn active" onclick="ClientesPage.showTab('orcamentos', ${id})">Orçamentos (${cliente.orcamentos.length})</button>
          <button class="tab-btn" onclick="ClientesPage.showTab('servicos', ${id})">Serviços (${cliente.servicos.length})</button>
        </div>

        <div id="client-tab-content">
          ${this.renderClientOrcamentos(cliente.orcamentos)}
        </div>
      </div>`;
    } catch (err) {
      Toast.error('Erro ao carregar detalhes');
      console.error(err);
    }
  },

  showTab(tab, clienteId) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');

    electronAPI.clientes.buscar(clienteId).then(cliente => {
      const tabContent = document.getElementById('client-tab-content');
      if (tab === 'orcamentos') {
        tabContent.innerHTML = this.renderClientOrcamentos(cliente.orcamentos);
      } else {
        tabContent.innerHTML = this.renderClientServicos(cliente.servicos);
      }
    });
  },

  renderClientOrcamentos(orcamentos) {
    if (!orcamentos.length) return '<div class="empty-state"><p>Nenhum orçamento para este cliente</p></div>';
    return `<div class="table-container">${Table.render({
      columns: [
        { label: 'Título', key: 'titulo' },
        { label: 'Status', render: (r) => `<span class="badge badge-${r.status}">${Helpers.statusLabel(r.status)}</span>` },
        { label: 'Criado em', render: (r) => Helpers.formatDate(r.criado_em) }
      ],
      data: orcamentos,
      actions: (r) => `
        <button class="btn-icon" title="Ver" onclick="OrcamentosPage.viewDetails(${r.id})">${Helpers.icons.eye}</button>
      `
    })}</div>`;
  },

  renderClientServicos(servicos) {
    if (!servicos.length) return '<div class="empty-state"><p>Nenhum serviço para este cliente</p></div>';
    return `<div class="table-container">${Table.render({
      columns: [
        { label: 'Título', key: 'titulo' },
        { label: 'Status', render: (r) => `<span class="badge badge-${r.status}">${Helpers.statusLabel(r.status)}</span>` },
        { label: 'Criado em', render: (r) => Helpers.formatDate(r.criado_em) }
      ],
      data: servicos,
      actions: (r) => `
        <button class="btn-icon" title="Ver" onclick="ServicosPage.viewDetails(${r.id})">${Helpers.icons.eye}</button>
      `
    })}</div>`;
  }
};
