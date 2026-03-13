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
    // Carrega todos os orçamentos para permitir vincular qualquer um existente
    const orcamentos = await electronAPI.orcamentos.listar({});
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
    const budgetVal = document.getElementById('serv-orcamento') ? document.getElementById('serv-orcamento').value : null;
    const dados = {
      cliente_id: parseInt(document.getElementById('serv-cliente').value),
      orcamento_id: budgetVal ? parseInt(budgetVal) : null,
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
        const result = await electronAPI.servicos.criar(dados);
        
        // Se for um novo serviço sem orçamento, já cria o "Orçamento Inicial" automaticamente
        if (!dados.orcamento_id) {
          const orcResult = await electronAPI.orcamentos.criar({
            cliente_id: dados.cliente_id,
            servico_id: result.id, // Links back to service
            titulo: `Orçamento: ${dados.titulo}`,
            status: 'rascunho',
            tipo: 'inicial'
          });
          // Update the service with this budget ID
          await electronAPI.servicos.atualizar(result.id, { ...dados, orcamento_id: orcResult.id });
        }
        
        Toast.success('Ordem de serviço criada!');
      }
      Modal.close();
      this.loadData();
    } catch (err) {
      console.error(err);
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

      // Busca orçamentos vinculados (Inicial e Adicionais)
      const orcamentos = await electronAPI.orcamentos.listar({ servico_id: id });
      const initialBudget = orcamentos.find(o => o.id === serv.orcamento_id);
      const additionalBudgets = orcamentos.filter(o => o.id !== serv.orcamento_id);

      // Busca OS vinculadas (OS filhas)
      const linkedOS = await electronAPI.servicos.listar({ servico_pai_id: id });

      const content = document.getElementById('main-content');
      content.innerHTML = `<div class="page-content fade-in">
        <div class="page-header">
          <div style="display: flex; align-items: center; gap: 16px;">
            <button class="btn-icon" onclick="ServicosPage.render()" title="Voltar">${Helpers.icons.arrowLeft}</button>
            <div>
              <div style="display:flex; align-items:center; gap:8px;">
                <h2>${serv.titulo}</h2>
                ${serv.servico_pai_id ? `<span class="badge badge-enviado" style="font-size:0.65rem;">Vinculada</span>` : ''}
              </div>
              <p class="page-subtitle">${serv.cliente_nome} · ${Helpers.formatDate(serv.criado_em)}</p>
            </div>
          </div>
          <div class="header-actions">
            <button class="btn btn-secondary" onclick="ServicosPage.createLinkedOS(${serv.id}, ${serv.cliente_id})">
              ${Helpers.icons.plus} Nova OS Vinculada
            </button>
            <div class="status-change-group">
              <span class="badge badge-${serv.status}" style="font-size: 0.8rem; padding: 6px 16px;">${Helpers.statusLabel(serv.status)}</span>
              <select class="form-select status-select" onchange="ServicosPage.changeStatus(${serv.id}, this.value)" title="Alterar status">
                <option value="pendente" ${serv.status === 'pendente' ? 'selected' : ''}>Pendente</option>
                <option value="em_andamento" ${serv.status === 'em_andamento' ? 'selected' : ''}>Em Andamento</option>
                <option value="concluido" ${serv.status === 'concluido' ? 'selected' : ''}>Concluído</option>
                <option value="cancelado" ${serv.status === 'cancelado' ? 'selected' : ''}>Cancelado</option>
              </select>
            </div>
          </div>
        </div>

        <div class="service-layout" style="display: grid; grid-template-columns: 1fr 320px; gap: var(--spacing-lg); align-items: start;">
          <div class="service-main-col">
            <!-- Orçamento Inicial -->
            <div class="card" style="margin-bottom: var(--spacing-lg);">
              <div class="card-header">
                <span class="card-title">${Helpers.icons.orcamentos} Orçamento Inicial</span>
                ${initialBudget ? `<button class="btn btn-sm btn-secondary" onclick="OrcamentosPage.viewDetails(${initialBudget.id})">Gerenciar Itens</button>` : ''}
              </div>
              <div class="card-body">
                ${initialBudget ? `
                  <div class="budget-summary-mini">
                    <p><strong>${initialBudget.titulo}</strong></p>
                    <div style="display:flex; gap:16px; margin-top:8px;">
                        <div><small>Mão de Obra:</small> <br> ${Helpers.formatCurrency(initialBudget.mao_de_obra || 0)}</div>
                        <div><small>Materiais:</small> <br> ${Helpers.formatCurrency(initialBudget.total_itens || 0)}</div>
                        <div><small>Total:</small> <br> <strong style="color:var(--accent-primary);">${Helpers.formatCurrency((initialBudget.total_itens || 0) + (initialBudget.mao_de_obra || 0) - (initialBudget.desconto || 0))}</strong></div>
                    </div>
                  </div>
                ` : `
                  <div class="empty-state-mini">
                    <p>Nenhum orçamento inicial vinculado.</p>
                    <button class="btn btn-sm btn-primary" onclick="ServicosPage.addInitialBudget(${serv.id})">Criar Orçamento</button>
                  </div>
                `}
              </div>
            </div>

            <!-- Adicionais -->
            <div class="card" style="margin-bottom: var(--spacing-lg);">
              <div class="card-header">
                <span class="card-title">${Helpers.icons.plus} Adicionais durante execução</span>
                <button class="btn btn-sm btn-primary" onclick="ServicosPage.addAdditionalBudget(${serv.id})">${Helpers.icons.plus} Novo Adicional</button>
              </div>
              <div class="card-body">
                ${additionalBudgets.length === 0 ? `
                  <p style="color:var(--text-tertiary); font-size:var(--font-size-sm); text-align:center; padding: 12px;">Nenhum custo adicional registrado.</p>
                ` : `
                   <div class="additional-list">
                    ${additionalBudgets.map(o => `
                      <div class="additional-item" style="padding:12px; border:1px solid var(--border-color); border-radius:8px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
                        <div>
                          <div style="font-weight:600; font-size:var(--font-size-sm);">${o.titulo}</div>
                          <div style="color:var(--text-tertiary); font-size:0.75rem;">Total: ${Helpers.formatCurrency((o.total_itens || 0) + (o.mao_de_obra || 0) - (o.desconto || 0))}</div>
                        </div>
                        <button class="btn btn-icon" onclick="OrcamentosPage.viewDetails(${o.id})" title="Gerenciar">${Helpers.icons.edit}</button>
                      </div>
                    `).join('')}
                   </div>
                `}
              </div>
            </div>

            <!-- OS Vinculadas -->
            <div class="card">
                <div class="card-header"><span class="card-title">${Helpers.icons.wrench} Ordens de Serviço Vinculadas</span></div>
                <div class="card-body">
                    ${linkedOS.length === 0 ? `
                        <p style="color:var(--text-tertiary); font-size:var(--font-size-sm); text-align:center; padding: 12px;">Nenhuma OS vinculada.</p>
                    ` : `
                        <div class="linked-os-list">
                            ${linkedOS.map(l => `
                                <div class="additional-item" style="padding:12px; border:1px solid var(--border-color); border-radius:8px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
                                    <div>
                                        <div style="font-weight:600; font-size:var(--font-size-sm);">${l.titulo}</div>
                                        <div style="font-size:0.75rem;"><span class="badge badge-${l.status}">${Helpers.statusLabel(l.status)}</span></div>
                                    </div>
                                    <button class="btn btn-icon" onclick="ServicosPage.viewDetails(${l.id})" title="Ver OS">${Helpers.icons.eye}</button>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>
            </div>
          </div>

          <div class="service-side-col">
            <div class="card" style="margin-bottom: var(--spacing-lg);">
              <div class="card-header"><span class="card-title">Informações</span></div>
              <div class="card-body">
                <div class="detail-item-compact">
                  <div class="label">Prioridade</div>
                  <div class="value priority-${serv.prioridade}">${Helpers.priorityLabel(serv.prioridade)}</div>
                </div>
                <div class="detail-item-compact">
                  <div class="label">Prazo</div>
                  <div class="value">${Helpers.formatDate(serv.data_fim) || 'Não definido'}</div>
                </div>
                ${serv.data_conclusao ? `
                   <div class="detail-item-compact">
                    <div class="label">Concluído em</div>
                    <div class="value">${Helpers.formatDate(serv.data_conclusao)}</div>
                  </div>
                ` : ''}
              </div>
            </div>

            <div class="card">
              <div class="card-header"><span class="card-title">Descrição & Notas</span></div>
              <div class="card-body">
                <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:12px;">${serv.descricao || 'Sem descrição.'}</p>
                <div style="border-top: 1px solid var(--border-color); padding-top:12px;">
                  <small style="color:var(--text-tertiary); display:block; margin-bottom:4px;">Notas Internas:</small>
                  <p style="font-size:0.8rem;">${serv.notas || 'Nenhuma nota.'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>`;
    } catch (err) {
      console.error(err);
      Toast.error('Erro ao carregar serviço');
    }
  },

  async addInitialBudget(servicoId) {
    const serv = await electronAPI.servicos.buscar(servicoId);
    try {
      const result = await electronAPI.orcamentos.criar({
        cliente_id: serv.cliente_id,
        servico_id: servicoId,
        titulo: `Orçamento: ${serv.titulo}`,
        status: 'rascunho',
        tipo: 'inicial'
      });
      await electronAPI.servicos.atualizar(servicoId, { ...serv, orcamento_id: result.id });
      this.viewDetails(servicoId);
      Toast.success('Orçamento inicial criado!');
    } catch (err) {
      Toast.error('Erro ao criar orçamento');
    }
  },

  async addAdditionalBudget(servicoId) {
    const serv = await electronAPI.servicos.buscar(servicoId);
    try {
      const result = await electronAPI.orcamentos.criar({
        cliente_id: serv.cliente_id,
        servico_id: servicoId,
        titulo: `Adicional em ${Helpers.formatDate(new Date())}`,
        status: 'rascunho',
        tipo: 'adicional'
      });
      // No need to update the main service, as it's just a linked additional
      OrcamentosPage.viewDetails(result.id);
      Toast.success('Novo adicional criado!');
    } catch (err) {
      Toast.error('Erro ao criar adicional');
    }
  },

  async createLinkedOS(parentServId, clienteId) {
    const parent = await electronAPI.servicos.buscar(parentServId);
    
    // Open service form with parent link
    Modal.open(`
      <div class="modal-header">
        <h3>Nova OS Vinculada</h3>
        <button class="modal-close" onclick="Modal.close()">${Helpers.icons.close}</button>
      </div>
      <div class="modal-body">
        <p style="color:var(--text-tertiary); font-size:var(--font-size-sm); margin-bottom:16px;">
          Esta nova ordem de serviço será vinculada a <strong>${parent.titulo}</strong>.
        </p>
        <input type="hidden" id="serv-cliente" value="${clienteId}">
        <input type="hidden" id="serv-pai" value="${parentServId}">
        
        <div class="form-group">
          <label class="form-label">Título *</label>
          <input type="text" class="form-input" id="serv-titulo" placeholder="Ex: Novo reparo solicitado">
        </div>
        <div class="form-group">
          <label class="form-label">Descrição</label>
          <textarea class="form-textarea" id="serv-descricao" placeholder="O que mais o cliente pediu?"></textarea>
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
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
        <button class="btn btn-primary" onclick="ServicosPage.saveLinkedOS()">
          ${Helpers.icons.check} Criar OS Vinculada
        </button>
      </div>
    `, { large: true });
  },

  async saveLinkedOS() {
    const dados = {
      cliente_id: parseInt(document.getElementById('serv-cliente').value),
      servico_pai_id: parseInt(document.getElementById('serv-pai').value),
      titulo: document.getElementById('serv-titulo').value.trim(),
      descricao: document.getElementById('serv-descricao').value.trim(),
      prioridade: document.getElementById('serv-prioridade').value,
      data_inicio: document.getElementById('serv-data-inicio').value || null,
      data_fim: document.getElementById('serv-data-fim').value || null,
      status: 'pendente'
    };

    if (!dados.titulo) return Toast.warning('Título é obrigatório');

    try {
      const result = await electronAPI.servicos.criar(dados);
      
      // Auto-create initial budget for the linked OS too
      await electronAPI.orcamentos.criar({
        cliente_id: dados.cliente_id,
        servico_id: result.id,
        titulo: `Orçamento (Vinculado): ${dados.titulo}`,
        status: 'rascunho',
        tipo: 'inicial'
      });

      Toast.success('OS Vinculada criada!');
      Modal.close();
      this.viewDetails(dados.servico_pai_id); // Stay on parent view
    } catch (err) {
      Toast.error('Erro ao criar OS vinculada');
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
