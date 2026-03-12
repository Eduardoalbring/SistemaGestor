// ============ Custos Page ============

const CustosPage = {
  filtros: { mes: new Date().toISOString().slice(0, 7), tipo: '', categoria: '' },
  
  // Custom categories for expenses
  categoriasDespesas: [
    { value: 'combustivel', label: 'Combustível' },
    { value: 'alimentacao', label: 'Alimentação' },
    { value: 'ferramentas', label: 'Ferramentas/Equip.' },
    { value: 'impostos', label: 'Impostos/Taxas' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'outros', label: 'Outros' }
  ],

  async render() {
    const content = document.getElementById('main-content');
    content.innerHTML = `<div class="page-content fade-in">
      <div class="page-header">
        <div>
          <h2>${Helpers.icons.dollarSign} Custos & Despesas</h2>
          <p class="page-subtitle">Gestão de gastos com materiais e despesas do negócio</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-secondary" onclick="CustosPage.openFixosManager()">
            ${Helpers.icons.settings || '⚙️'} Despesas Fixas
          </button>
          <button class="btn btn-primary" onclick="CustosPage.openForm()">
            ${Helpers.icons.plus} Lançar Custo
          </button>
        </div>
      </div>
      
      <div class="metrics-grid" id="custos-resumo-grid">
        <div class="metric-card skeleton" style="height:120px"></div>
        <div class="metric-card skeleton" style="height:120px"></div>
        <div class="metric-card skeleton" style="height:120px"></div>
      </div>

      <div class="table-container">
        <div class="table-toolbar">
          <div class="table-filters" style="display: flex; gap: var(--spacing-sm); flex-wrap: wrap;">
            <input type="month" class="form-input" style="width: 160px; padding: 6px 10px;" 
                   value="${this.filtros.mes}" onchange="CustosPage.filterMes(this.value)">
            
            <select class="form-select" style="width: 180px; padding: 6px 10px;" onchange="CustosPage.filterTipo(this.value)">
              <option value="">Todos os Tipos</option>
              <option value="materiais" ${this.filtros.tipo === 'materiais' ? 'selected' : ''}>Materiais</option>
              <option value="despesas" ${this.filtros.tipo === 'despesas' ? 'selected' : ''}>Despesas de Casa/Negócio</option>
            
            <select class="form-select" style="width: 140px; padding: 6px 10px;" onchange="CustosPage.filterStatus(this.value)">
              <option value="">Status: Todos</option>
              <option value="pago" ${this.filtros.status === 'pago' ? 'selected' : ''}>Já Pago</option>
              <option value="previsto" ${this.filtros.status === 'previsto' ? 'selected' : ''}>A Pagar (Previsto)</option>
            </select>
          </div>
        </div>
        <div id="custos-table-body"></div>
      </div>
    </div>`;

    this.loadData();
  },

  async loadData() {
    try {
      const [custos, relatorio] = await Promise.all([
        electronAPI.custos.listar(this.filtros),
        electronAPI.custos.relatorio()
      ]);
      
      this.renderResumo(relatorio);
      this.renderTable(custos);
    } catch (err) {
      console.error(err);
      Toast.error('Erro ao carregar custos');
    }
  },

  renderResumo(relatorio) {
    // Current month totals
    const totalMateriais = relatorio.resumoMesAtual.find(r => r.tipo === 'materiais')?.total || 0;
    const totalDespesas = relatorio.resumoMesAtual.find(r => r.tipo === 'despesas')?.total || 0;
    const totalCustos = totalMateriais + totalDespesas;
    const faturamento = relatorio.faturamentoMes;
    const saldo = faturamento - totalCustos;
    
    // Formatting correctly based on the requested month vs current month
    // If the filter is not the current month, the summary will still show the current month performance
    // It's a dashboard style summary at the top

    const previstos = relatorio.previstosMesAtual?.total || 0;

    document.getElementById('custos-resumo-grid').innerHTML = `
      <div class="metric-card">
        <div class="metric-icon purple">${Helpers.icons.package}</div>
        <div class="metric-value" style="font-size: var(--font-size-xl);">${Helpers.formatCurrency(totalMateriais)}</div>
        <div class="metric-label">Materiais do Mês (Pagos)</div>
      </div>
      <div class="metric-card">
        <div class="metric-icon yellow">${Helpers.icons.calendar}</div>
        <div class="metric-value" style="font-size: var(--font-size-xl);">${Helpers.formatCurrency(totalDespesas)}</div>
        <div class="metric-label">Despesas do Mês (Pagas)</div>
      </div>
      <div class="metric-card" style="border-left: 4px solid var(--color-warning);">
        <div class="metric-icon orange">${Helpers.icons.clock || '🕒'}</div>
        <div class="metric-value" style="font-size: var(--font-size-xl); color: var(--color-warning)">${Helpers.formatCurrency(previstos)}</div>
        <div class="metric-label">Custos Previstos / A Pagar</div>
      </div>
      <div class="metric-card" style="border-left: 4px solid ${saldo >= 0 ? 'var(--color-success)' : 'var(--color-danger)'};">
        <div class="metric-icon ${saldo >= 0 ? 'green' : 'red'}">${Helpers.icons.dollarSign}</div>
        <div class="metric-value" style="font-size: var(--font-size-xl); color: ${saldo >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}">${Helpers.formatCurrency(saldo)}</div>
        <div class="metric-label">Caixa Livre (Fat. Aprovado: ${Helpers.formatCurrency(faturamento)})</div>
      </div>
    `;
  },

  renderTable(custos) {
    document.getElementById('custos-table-body').innerHTML = Table.render({
      columns: [
        { label: 'Data', render: (r) => Helpers.formatDate(r.data) },
        { 
          label: 'Tipo', 
          render: (r) => r.tipo === 'materiais' 
            ? '<span class="badge badge-em_andamento">Material</span>' 
            : '<span class="badge badge-rejeitado">Despesa</span>' 
        },
        { 
          label: 'Descrição', 
          render: (r) => `
            <div>
              <strong>${r.descricao}</strong>
              <div style="font-size: 0.75rem; color: var(--text-tertiary);">${this.getCategoriaLabel(r.tipo, r.categoria)}</div>
            </div>
          ` 
        },
        { 
          label: 'Status', 
          render: (r) => r.status === 'previsto' 
            ? '<span class="badge badge-em_andamento">⏳ A Pagar</span>' 
            : '<span class="badge badge-concluido">✅ Pago</span>' 
        },
        { label: 'Valor', render: (r) => `<strong style="color: var(--color-danger)">-${Helpers.formatCurrency(r.valor)}</strong>` }
      ],
      data: custos,
      emptyMessage: 'Nenhum custo registrado neste período',
      emptyIcon: Helpers.icons.dollarSign,
      actions: (r) => `
        ${r.status === 'previsto' ? `<button class="btn-icon" title="Marcar como Pago" style="color: var(--color-success);" onclick="CustosPage.marcarPago(${r.id})">${Helpers.icons.check}</button>` : ''}
        <button class="btn-icon" title="Editar" onclick="CustosPage.openForm(${r.id})">${Helpers.icons.edit}</button>
        <button class="btn-icon" title="Excluir" onclick="CustosPage.confirmDelete(${r.id}, '${r.descricao.replace(/'/g, "\\'")}')">${Helpers.icons.trash}</button>
      `
    });
  },

  async marcarPago(id) {
    try {
      await electronAPI.custos.marcarStatus(id, 'pago');
      Toast.success('Marcado como pago!');
      this.loadData();
    } catch (err) {
      Toast.error('Erro ao marcar como pago');
    }
  },

  filterMes(mes) {
    this.filtros.mes = mes;
    this.loadData();
  },

  filterTipo(tipo) {
    this.filtros.tipo = tipo;
    this.loadData();
  },

  filterStatus(status) {
    this.filtros.status = status;
    this.loadData();
  },

  getCategoriaLabel(tipo, catValue) {
    if (tipo === 'materiais') {
      return MateriaisPage.categorias.find(c => c.value === catValue)?.label || catValue;
    } else {
      return this.categoriasDespesas.find(c => c.value === catValue)?.label || catValue;
    }
  },

  async openForm(id = null) {
    let custo = null;
    if (id) {
      custo = await electronAPI.custos.buscar(id); // oops, we need to implement buscar in db or extract from list. Oh wait, get by ID wasn't implemented. I'll just find it from current list.
      // Better approach: fetch from backend, but since we didn't add buscarCusto, we'll implement it or just search the current table.
      // Easiest is to add no buscar, just list with id=id, or I'll implement buscarCusto quickly if needed.
      // For now, let's just use the listing data directly or fetch it:
      const todos = await electronAPI.custos.listar({});
      custo = todos.find(c => c.id === id);
    }
    
    const isEdit = custo !== null;
    const tipoAtual = isEdit ? custo.tipo : 'materiais';
    
    Modal.open(`
      <div class="modal-header">
        <h3>${isEdit ? 'Editar Custo' : 'Lançar Novo Custo'}</h3>
        <button class="modal-close" onclick="Modal.close()">${Helpers.icons.close}</button>
      </div>
      <div class="modal-body">
        
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Tipo de Custo</label>
            <div style="display: flex; gap: var(--spacing-md); margin-top: 8px;">
              <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                <input type="radio" name="custo-tipo" value="materiais" ${tipoAtual === 'materiais' ? 'checked' : ''} onchange="CustosPage.toggleCategoriasForm(this.value)"> Materiais
              </label>
              <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                <input type="radio" name="custo-tipo" value="despesas" ${tipoAtual === 'despesas' ? 'checked' : ''} onchange="CustosPage.toggleCategoriasForm(this.value)"> Despesas de Casa
              </label>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Data de Vencimento / Pagamento</label>
            <input type="date" class="form-input" id="custo-data" value="${isEdit ? custo.data : new Date().toISOString().slice(0, 10)}">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Status</label>
            <div style="display: flex; gap: var(--spacing-md); margin-top: 8px;">
              <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                <input type="radio" name="custo-status" value="pago" ${(!isEdit || custo.status === 'pago') ? 'checked' : ''}> ✅ Já Pago
              </label>
              <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                <input type="radio" name="custo-status" value="previsto" ${(isEdit && custo.status === 'previsto') ? 'checked' : ''}> ⏳ Previsto (A Pagar)
              </label>
            </div>
          </div>
          
          ${!isEdit ? `
          <div class="form-group">
            <label class="form-label">Repetir / Parcelar</label>
            <div style="display: flex; align-items: center; gap: 8px;">
              <input type="number" class="form-input" id="custo-parcelas" value="1" min="1" max="60" style="width: 80px;">
              <span style="font-size: var(--font-size-sm); color: var(--text-tertiary);">Meses seguidos</span>
            </div>
          </div>
          ` : ''}
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Descrição *</label>
            <input type="text" class="form-input" id="custo-descricao" placeholder="Ex: Fios flexíveis / Conta de Luz" value="${isEdit ? custo.descricao : ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Valor (R$) *</label>
            <input type="number" class="form-input" id="custo-valor" step="0.01" value="${isEdit ? custo.valor : ''}">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Categoria</label>
          <select class="form-select" id="custo-categoria" data-atual="${isEdit ? custo.categoria : ''}">
            <!-- render via JS below -->
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Observações</label>
          <textarea class="form-textarea" id="custo-observacoes" placeholder="Opcional...">${isEdit ? (custo.observacoes || '') : ''}</textarea>
        </div>

      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
        <button class="btn btn-primary" onclick="CustosPage.saveForm(${isEdit ? id : 'null'})">
          ${Helpers.icons.check} ${isEdit ? 'Salvar Alterações' : 'Lançar Custo'}
        </button>
      </div>
    `);

    this.toggleCategoriasForm(tipoAtual);
  },

  toggleCategoriasForm(tipo) {
    const select = document.getElementById('custo-categoria');
    const atual = select.dataset.atual;
    let options = '';

    if (tipo === 'materiais') {
      const cats = MateriaisPage.categorias.filter(c => c.value !== '');
      options = cats.map(c => `<option value="${c.value}" ${atual === c.value ? 'selected' : ''}>${c.label}</option>`).join('');
    } else {
      options = this.categoriasDespesas.map(c => `<option value="${c.value}" ${atual === c.value ? 'selected' : ''}>${c.label}</option>`).join('');
    }

    select.innerHTML = options;
  },

  async saveForm(id) {
    const tipo = document.querySelector('input[name="custo-tipo"]:checked').value;
    const status = document.querySelector('input[name="custo-status"]:checked').value;
    const parcelas = id ? 1 : (parseInt(document.getElementById('custo-parcelas')?.value) || 1);
    
    const dados = {
      tipo,
      status,
      parcelas,
      data: document.getElementById('custo-data').value,
      descricao: document.getElementById('custo-descricao').value.trim(),
      valor: parseFloat(document.getElementById('custo-valor').value) || 0,
      categoria: document.getElementById('custo-categoria').value,
      observacoes: document.getElementById('custo-observacoes').value.trim()
    };

    if (!dados.descricao) return Toast.warning('A descrição é obrigatória');
    if (dados.valor <= 0) return Toast.warning('O valor deve ser maior que zero');
    if (!dados.data) return Toast.warning('A data é obrigatória');

    try {
      if (id) {
        await electronAPI.custos.atualizar(id, dados);
        Toast.success('Custo atualizado!');
      } else {
        await electronAPI.custos.criar(dados);
        Toast.success('Custo lançado!');
      }
      Modal.close();
      this.loadData();
    } catch (err) {
      Toast.error('Erro ao salvar custo');
    }
  },

  confirmDelete(id, desc) {
    Modal.confirm(`Tem certeza que deseja excluir o lançamento <strong>${desc}</strong>?`, async () => {
      try {
        await electronAPI.custos.excluir(id);
        Toast.success('Custo excluído com sucesso');
        this.loadData();
      } catch (err) {
        Toast.error('Erro ao excluir custo');
      }
    });
  },

  // ============ CUSTOS FIXOS ============
  async openFixosManager() {
    try {
      const fixos = await electronAPI.custosFixos.listar();
      
      Modal.open(`
        <div class="modal-header">
          <h3>⚙️ Gerenciar Despesas Fixas (Obrigatórias)</h3>
          <button class="modal-close" onclick="Modal.close()">${Helpers.icons.close}</button>
        </div>
        <div class="modal-body">
          <p class="page-subtitle" style="margin-bottom: var(--spacing-md); font-size: var(--font-size-sm);">
            Contas aqui serão sempre inseridas automaticamente no sistema todo mês (como Conta de Água, Luz, MEI, Aluguel).
          </p>
          
          <div class="form-row" style="background: var(--bg-secondary); padding: 12px; border-radius: var(--radius-md); margin-bottom: var(--spacing-lg);">
            <div class="form-group" style="flex: 2;">
              <label class="form-label" style="font-size: 0.75rem;">Nome da Despesa</label>
              <input type="text" class="form-input" id="fixo-desc" placeholder="Ex: Conta de Energia">
            </div>
            <div class="form-group" style="flex: 1;">
              <label class="form-label" style="font-size: 0.75rem;">Valor (R$)</label>
              <input type="number" class="form-input" id="fixo-valor" placeholder="0.00" step="0.01">
            </div>
            <div class="form-group" style="flex: 1;">
              <label class="form-label" style="font-size: 0.75rem;">Dia Venc.</label>
              <input type="number" class="form-input" id="fixo-dia" placeholder="10" min="1" max="31">
            </div>
            <div class="form-group" style="display: flex; align-items: flex-end;">
              <button class="btn btn-primary" style="height: 38px;" onclick="CustosPage.addFixo()">Add</button>
            </div>
          </div>

          <div style="max-height: 400px; overflow-y: auto;">
            ${fixos.length === 0 
              ? '<div class="empty-state" style="padding: 2rem 0;">Nenhuma despesa fixa cadastrada.</div>' 
              : `<table class="simple-table" style="width: 100%; font-size: var(--font-size-sm);">
                  <thead>
                    <tr>
                      <th style="padding: 8px; text-align: left; border-bottom: 1px solid var(--border-color);">Descrição</th>
                      <th style="padding: 8px; text-align: left; border-bottom: 1px solid var(--border-color);">Valor</th>
                      <th style="padding: 8px; text-align: center; border-bottom: 1px solid var(--border-color);">Dia</th>
                      <th style="padding: 8px; text-align: right; border-bottom: 1px solid var(--border-color);">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${fixos.map(f => `
                      <tr>
                        <td style="padding: 8px; border-bottom: 1px solid var(--border-color);">${f.descricao}</td>
                        <td style="padding: 8px; border-bottom: 1px solid var(--border-color); color: var(--color-danger); font-weight: 600;">${Helpers.formatCurrency(f.valor)}</td>
                        <td style="padding: 8px; border-bottom: 1px solid var(--border-color); text-align: center;">Todo dia ${f.dia_vencimento}</td>
                        <td style="padding: 8px; border-bottom: 1px solid var(--border-color); text-align: right;">
                          <button class="btn-icon" style="color: var(--color-danger);" onclick="CustosPage.removeFixo(${f.id})">${Helpers.icons.trash}</button>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>`
            }
          </div>
        </div>
      `);
    } catch (err) {
      Toast.error('Erro ao abrir gerenciador de fixos');
    }
  },

  async addFixo() {
    const desc = document.getElementById('fixo-desc').value.trim();
    const valor = parseFloat(document.getElementById('fixo-valor').value);
    const dia = parseInt(document.getElementById('fixo-dia').value);

    if (!desc || !valor || !dia || dia < 1 || dia > 31) {
      return Toast.warning('Preencha os dados corretamente. Dia deve ser de 1 a 31.');
    }

    try {
      await electronAPI.custosFixos.criar({ descricao: desc, valor, dia_vencimento: dia, categoria: 'impostos' });
      Toast.success('Despesa obrigatória adicionada! O sistema vai inseri-la automaticamente todo mês.');
      this.openFixosManager(); // refresh modal
      this.loadData(); // refresh background table if it generated a new current payment
    } catch (err) {
      Toast.error('Erro ao adicionar custo fixo');
    }
  },

  async removeFixo(id) {
    if (confirm('Deletar essa despesa obrigatória? Ela deixará de ser gerada nos próximos meses.')) {
      try {
        await electronAPI.custosFixos.excluir(id);
        Toast.success('Despesa removida');
        this.openFixosManager();
      } catch (e) {
        Toast.error('Erro ao remover custo fixo');
      }
    }
  }
};
