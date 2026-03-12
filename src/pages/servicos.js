// ============ Serviços Page ============

const ServicosPage = {
  filtros: { busca: '', status: '', prioridade: '' },

  async render() {
    const content = document.getElementById('main-content');
    content.innerHTML = `<div class="page-content fade-in">
      <div class="page-header">
        <div>
          <h2>${Helpers.icons.servicos} Serviços</h2>
          <p class="page-subtitle">Gerencie suas ordens de serviço</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-primary" onclick="ServicosPage.openForm()">
            ${Helpers.icons.plus} Nova Ordem de Serviço
          </button>
        </div>
      </div>
      <div class="table-container">
        <div class="table-toolbar">
          <div class="search-container" style="width: 320px;">
            ${Helpers.icons.search}
            <input type="text" class="search-input" placeholder="Buscar serviço ou cliente..."
                   oninput="ServicosPage.onSearch(this.value)">
          </div>
          <div class="table-filters">
            <button class="filter-chip ${!this.filtros.status ? 'active' : ''}" onclick="ServicosPage.filterStatus('')">Todos</button>
            <button class="filter-chip ${this.filtros.status === 'pendente' ? 'active' : ''}" onclick="ServicosPage.filterStatus('pendente')">Pendente</button>
            <button class="filter-chip ${this.filtros.status === 'em_andamento' ? 'active' : ''}" onclick="ServicosPage.filterStatus('em_andamento')">Em Andamento</button>
            <button class="filter-chip ${this.filtros.status === 'concluido' ? 'active' : ''}" onclick="ServicosPage.filterStatus('concluido')">Concluído</button>
            <button class="filter-chip ${this.filtros.status === 'cancelado' ? 'active' : ''}" onclick="ServicosPage.filterStatus('cancelado')">Cancelado</button>
          </div>
        </div>
        <div id="servicos-table-body"></div>
      </div>
    </div>`;

    this.loadData();
  },

  async loadData() {
    try {
      const servicos = await electronAPI.servicos.listar(this.filtros);
      this.renderTable(servicos);
    } catch (err) {
      Toast.error('Erro ao carregar serviços');
    }
  },

  renderTable(servicos) {
    document.getElementById('servicos-table-body').innerHTML = Table.render({
      columns: [
        { label: 'Título', render: (r) => `<strong>${r.titulo}</strong>` },
        { label: 'Cliente', key: 'cliente_nome' },
        { 
          label: 'Status', 
          render: (r) => `
            <select class="form-select status-select-mini bg-${r.status}" onchange="ServicosPage.changeStatus(${r.id}, this.value)" style="width: 120px; font-size: 0.75rem; padding: 4px 8px; height: auto;">
                <option value="pendente" ${r.status === 'pendente' ? 'selected' : ''}>Pendente</option>
                <option value="em_andamento" ${r.status === 'em_andamento' ? 'selected' : ''}>Em Andamento</option>
                <option value="concluido" ${r.status === 'concluido' ? 'selected' : ''}>Concluído</option>
                <option value="cancelado" ${r.status === 'cancelado' ? 'selected' : ''}>Cancelado</option>
            </select>
          `
        },
        { label: 'Prioridade', render: (r) => `<span class="priority-${r.prioridade}">${Helpers.priorityLabel(r.prioridade)}</span>` },
        { label: 'Início', render: (r) => Helpers.formatDate(r.data_inicio) },
        { label: 'Prazo', render: (r) => Helpers.formatDate(r.data_fim) }
      ],
      data: servicos,
      emptyMessage: 'Nenhuma ordem de serviço encontrada',
      emptyIcon: Helpers.icons.wrench,
      actions: (r) => `
        <button class="btn-icon" title="Detalhes" onclick="ServicosPage.viewDetails(${r.id})">${Helpers.icons.eye}</button>
        <button class="btn-icon" title="Editar" onclick="ServicosPage.openForm(${r.id})">${Helpers.icons.edit}</button>
        <button class="btn-icon" title="Excluir" onclick="ServicosPage.confirmDelete(${r.id})">${Helpers.icons.trash}</button>
      `
    });
  },

  onSearch: Helpers.debounce(function(value) {
    ServicosPage.filtros.busca = value;
    ServicosPage.loadData();
  }, 300),

  filterStatus(status) {
    this.filtros.status = status;
    this.render();
  },

  async openForm(id = null) {
    const clientes = await electronAPI.clientes.listar({});
    const orcamentos = await electronAPI.orcamentos.listar({ status: 'aprovado' });
    let servico = null;

    if (id) {
      servico = await electronAPI.servicos.buscar(id);
    }

    const isEdit = servico !== null;

    Modal.open(`
      <div class="modal-header">
        <h3>${isEdit ? 'Editar Serviço' : 'Nova Ordem de Serviço'}</h3>
        <button class="modal-close" onclick="Modal.close()">${Helpers.icons.close}</button>
      </div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Cliente *</label>
            <select class="form-select" id="serv-cliente">
              <option value="">Selecione um cliente</option>
              ${clientes.map(c => `<option value="${c.id}" ${isEdit && servico.cliente_id === c.id ? 'selected' : ''}>${c.nome}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Orçamento Vinculado</label>
            <select class="form-select" id="serv-orcamento">
              <option value="">Nenhum</option>
              ${orcamentos.map(o => `<option value="${o.id}" ${isEdit && servico.orcamento_id === o.id ? 'selected' : ''}>${o.titulo} — ${o.cliente_nome}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Título *</label>
          <input type="text" class="form-input" id="serv-titulo" placeholder="Ex: Instalação elétrica residencial" value="${isEdit ? servico.titulo : ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Descrição</label>
          <textarea class="form-textarea" id="serv-descricao" placeholder="Descreva o serviço...">${isEdit ? (servico.descricao || '') : ''}</textarea>
        </div>
        <div class="form-row-3">
          <div class="form-group">
            <label class="form-label">Prioridade</label>
            <select class="form-select" id="serv-prioridade">
              <option value="baixa" ${isEdit && servico.prioridade === 'baixa' ? 'selected' : ''}>Baixa</option>
              <option value="normal" ${!isEdit || servico.prioridade === 'normal' ? 'selected' : ''}>Normal</option>
              <option value="alta" ${isEdit && servico.prioridade === 'alta' ? 'selected' : ''}>Alta</option>
              <option value="urgente" ${isEdit && servico.prioridade === 'urgente' ? 'selected' : ''}>Urgente</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Data Início</label>
            <input type="date" class="form-input" id="serv-data-inicio" value="${isEdit && servico.data_inicio ? servico.data_inicio : ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Data Prazo</label>
            <input type="date" class="form-input" id="serv-data-fim" value="${isEdit && servico.data_fim ? servico.data_fim : ''}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Observações</label>
          <textarea class="form-textarea" id="serv-notas" placeholder="Notas adicionais...">${isEdit ? (servico.notas || '') : ''}</textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
        <button class="btn btn-primary" onclick="ServicosPage.saveForm(${isEdit ? servico.id : 'null'})">
          ${Helpers.icons.check} ${isEdit ? 'Salvar' : 'Criar Serviço'}
        </button>
      </div>
    `, { large: true });
  },

  // Open form pre-filled from an approved orcamento
  async openFormFromOrcamento(orcamentoId, clienteId) {
    const orc = await electronAPI.orcamentos.buscar(orcamentoId);
    const clientes = await electronAPI.clientes.listar({});

    Modal.open(`
      <div class="modal-header">
        <h3>Nova Ordem de Serviço</h3>
        <button class="modal-close" onclick="Modal.close()">${Helpers.icons.close}</button>
      </div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Cliente *</label>
            <select class="form-select" id="serv-cliente">
              ${clientes.map(c => `<option value="${c.id}" ${c.id === clienteId ? 'selected' : ''}>${c.nome}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Orçamento Vinculado</label>
            <input type="text" class="form-input" value="${orc.titulo}" disabled>
            <input type="hidden" id="serv-orcamento" value="${orcamentoId}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Título *</label>
          <input type="text" class="form-input" id="serv-titulo" value="Execução: ${orc.titulo}">
        </div>
        <div class="form-group">
          <label class="form-label">Descrição</label>
          <textarea class="form-textarea" id="serv-descricao">${orc.descricao || ''}</textarea>
        </div>
        <div class="form-row-3">
          <div class="form-group">
            <label class="form-label">Prioridade</label>
            <select class="form-select" id="serv-prioridade">
              <option value="baixa">Baixa</option>
              <option value="normal" selected>Normal</option>
              <option value="alta">Alta</option>
              <option value="urgente">Urgente</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Data Início</label>
            <input type="date" class="form-input" id="serv-data-inicio">
          </div>
          <div class="form-group">
            <label class="form-label">Data Prazo</label>
            <input type="date" class="form-input" id="serv-data-fim">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Observações</label>
          <textarea class="form-textarea" id="serv-notas" placeholder="Notas adicionais..."></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
        <button class="btn btn-primary" onclick="ServicosPage.saveForm(null)">
          ${Helpers.icons.check} Criar Serviço
        </button>
      </div>
    `, { large: true });
  },

  async saveForm(id) {
    const dados = {
      cliente_id: parseInt(document.getElementById('serv-cliente').value),
      orcamento_id: parseInt(document.getElementById('serv-orcamento').value) || null,
      titulo: document.getElementById('serv-titulo').value.trim(),
      descricao: document.getElementById('serv-descricao').value.trim(),
      prioridade: document.getElementById('serv-prioridade').value,
      data_inicio: document.getElementById('serv-data-inicio').value || null,
      data_fim: document.getElementById('serv-data-fim').value || null,
      notas: document.getElementById('serv-notas').value.trim(),
    };

    if (!dados.cliente_id) return Toast.warning('Selecione um cliente');
    if (!dados.titulo) return Toast.warning('Título é obrigatório');

    try {
      if (id) {
        await electronAPI.servicos.atualizar(id, dados);
        Toast.success('Serviço atualizado!');
      } else {
        await electronAPI.servicos.criar(dados);
        Toast.success('Ordem de serviço criada!');
      }
      Modal.close();
      this.loadData();
    } catch (err) {
      Toast.error('Erro ao salvar serviço');
    }
  },

  confirmDelete(id) {
    Modal.confirm('Tem certeza que deseja excluir esta ordem de serviço?', async () => {
      try {
        await electronAPI.servicos.excluir(id);
        Toast.success('Serviço excluído');
        this.loadData();
      } catch (err) {
        Toast.error('Erro ao excluir');
      }
    });
  },

  async viewDetails(id) {
    try {
      const serv = await electronAPI.servicos.buscar(id);
      if (!serv) return Toast.error('Serviço não encontrado');

      const statusFlow = ['pendente', 'em_andamento', 'concluido'];
      const currentIdx = statusFlow.indexOf(serv.status);

      const content = document.getElementById('main-content');
      content.innerHTML = `<div class="page-content fade-in">
        <div class="page-header">
          <div style="display: flex; align-items: center; gap: 16px;">
            <button class="btn-icon" onclick="ServicosPage.render()" title="Voltar">${Helpers.icons.arrowLeft}</button>
            <div>
              <h2>${serv.titulo}</h2>
              <p class="page-subtitle">${serv.cliente_nome} · ${Helpers.formatDate(serv.criado_em)}</p>
            </div>
          </div>
          <div class="header-actions">
            <div class="status-change-group">
              <span class="badge badge-${serv.status}" style="font-size: 0.8rem; padding: 6px 16px;">${Helpers.statusLabel(serv.status)}</span>
              <select class="form-select status-select" onchange="ServicosPage.changeStatus(${serv.id}, this.value)" title="Alterar status">
                <option value="pendente" ${serv.status === 'pendente' ? 'selected' : ''}>Pendente</option>
                <option value="em_andamento" ${serv.status === 'em_andamento' ? 'selected' : ''}>Em Andamento</option>
                <option value="concluido" ${serv.status === 'concluido' ? 'selected' : ''}>Concluído</option>
                <option value="cancelado" ${serv.status === 'cancelado' ? 'selected' : ''}>Cancelado</option>
              </select>
            </div>
            <button class="btn btn-sm btn-secondary" onclick="ServicosPage.openForm(${serv.id})">${Helpers.icons.edit} Editar</button>
          </div>
        </div>

        <!-- Status Timeline -->
        <div class="card" style="margin-bottom: var(--spacing-lg);">
          <div class="card-header"><span class="card-title">Progresso</span></div>
          <div style="display: flex; align-items: center; gap: 8px; padding: var(--spacing-md) 0;">
            ${statusFlow.map((s, i) => `
              <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px;">
                <div style="width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
                  ${i <= currentIdx ? 'background: var(--accent-primary); color: white;' : 'background: var(--bg-tertiary); color: var(--text-tertiary);'}
                  font-size: 0.75rem; font-weight: 700;">
                  ${i < currentIdx ? Helpers.icons.check : i + 1}
                </div>
                <span style="font-size: 0.75rem; color: ${i <= currentIdx ? 'var(--text-primary)' : 'var(--text-tertiary)'}; font-weight: ${i === currentIdx ? '600' : '400'};">
                  ${Helpers.statusLabel(s)}
                </span>
              </div>
              ${i < statusFlow.length - 1 ? `<div style="flex: 2; height: 2px; ${i < currentIdx ? 'background: var(--accent-primary);' : 'background: var(--bg-tertiary);'} border-radius: 99px;"></div>` : ''}
            `).join('')}
          </div>
        </div>

        <div class="detail-grid">
          <div class="detail-item">
            <div class="detail-label">Prioridade</div>
            <div class="detail-value priority-${serv.prioridade}">${Helpers.priorityLabel(serv.prioridade)}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">${Helpers.icons.calendar} Data Início</div>
            <div class="detail-value">${Helpers.formatDate(serv.data_inicio)}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">${Helpers.icons.calendar} Prazo</div>
            <div class="detail-value">${Helpers.formatDate(serv.data_fim)}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Conclusão</div>
            <div class="detail-value">${Helpers.formatDate(serv.data_conclusao)}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Cliente</div>
            <div class="detail-value">${serv.cliente_nome}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Orçamento</div>
            <div class="detail-value">
              ${serv.orcamento_id 
                ? `<a href="#" onclick="OrcamentosPage.viewDetails(${serv.orcamento_id})" style="color: var(--accent-primary); font-weight: 600; text-decoration: none;">${Helpers.icons.orcamentos} ${serv.orcamento_titulo}</a>` 
                : 'Nenhum vinculado'
              }
            </div>
          </div>
        </div>

        ${serv.descricao ? `<div class="card" style="margin-bottom: var(--spacing-lg);"><div class="card-header"><span class="card-title">Descrição</span></div><p style="color: var(--text-secondary); font-size: var(--font-size-sm);">${serv.descricao}</p></div>` : ''}
        ${serv.notas ? `<div class="card"><div class="card-header"><span class="card-title">Observações</span></div><p style="color: var(--text-secondary); font-size: var(--font-size-sm);">${serv.notas}</p></div>` : ''}
      </div>`;
    } catch (err) {
      Toast.error('Erro ao carregar serviço');
    }
  },

  async changeStatus(id, status) {
    try {
      await electronAPI.servicos.atualizarStatus(id, status);
      Toast.success(`Status atualizado para ${Helpers.statusLabel(status)}`);
      // check if we are in list or details
      if (document.getElementById('servicos-table-body')) {
        this.loadData();
      } else {
        this.viewDetails(id);
      }
    } catch (err) {
      Toast.error('Erro ao atualizar status');
    }
  }
};
