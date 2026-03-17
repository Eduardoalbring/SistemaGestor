// ============ Custos Page ============

const CustosPage = {
  filtros: { mes: new Date().toISOString().slice(0, 7), tipo: '', categoria: '' },
  
  // Default categories for expenses
  defaultCategorias: [
    { value: 'combustivel', label: 'Combustível' },
    { value: 'alimentacao', label: 'Alimentação' },
    { value: 'ferramentas', label: 'Ferramentas/Equip.' },
    { value: 'impostos', label: 'Impostos/Taxas' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'outros', label: 'Outros' }
  ],

  getCustomCategorias() {
    try {
      return JSON.parse(localStorage.getItem('custos_categorias_custom') || '[]');
    } catch { return []; }
  },

  saveCustomCategorias(cats) {
    localStorage.setItem('custos_categorias_custom', JSON.stringify(cats));
  },

  getDeletedDefaultCategorias() {
    try {
      return JSON.parse(localStorage.getItem('custos_categorias_deleted_defaults') || '[]');
    } catch { return []; }
  },

  saveDeletedDefaultCategorias(cats) {
    localStorage.setItem('custos_categorias_deleted_defaults', JSON.stringify(cats));
  },

  get categorias() {
    const custom = this.getCustomCategorias();
    const deletedDefaults = this.getDeletedDefaultCategorias();
    const activeDefaults = this.defaultCategorias.filter(c => !deletedDefaults.includes(c.value));
    return [...activeDefaults, ...custom];
  },

  async render() {
    const content = document.getElementById('main-content');
    content.innerHTML = `<div class="page-content fade-in">
      <div class="page-header">
        <div>
          <h2>${Helpers.icons.dollarSign} Custos & Despesas</h2>
          <p class="page-subtitle">Gestão de gastos com materiais e despesas do negócio</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-secondary" onclick="CustosPage.openCategoryManager()">
            ${Helpers.icons.settings || '⚙️'} Categorias
          </button>
          <button class="btn btn-secondary" onclick="CustosPage.openFixosManager()">
            ${Helpers.icons.settings || '⚙️'} Despesas Fixas
          </button>
          <button class="btn btn-secondary" onclick="CustosPage.openHistorico()">
            ${Helpers.icons.clock || '🕒'} Histórico
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
            </select>
            
            <select class="form-select" id="filtro-categoria-custos" style="width: 180px; padding: 6px 10px;" onchange="CustosPage.filterCategoria(this.value)">
              <option value="">Todas as Categorias</option>
              <!-- Dynamic -->
            </select>

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
      this.updateCategoriaFilter();
    } catch (err) {
      console.error(err);
      Toast.error('Erro ao carregar custos');
    }
  },

  updateCategoriaFilter() {
    const select = document.getElementById('filtro-categoria-custos');
    if (!select) return;

    const tipo = this.filtros.tipo;
    const atual = this.filtros.categoria;
    let options = '<option value="">Todas as Categorias</option>';

    if (tipo === 'materiais') {
      const cats = MateriaisPage.categorias.filter(c => c.value !== '');
      options += cats.map(c => `<option value="${c.value}" ${atual === c.value ? 'selected' : ''}>${c.label}</option>`).join('');
    } else if (tipo === 'despesas') {
      options += this.categorias.map(c => `<option value="${c.value}" ${atual === c.value ? 'selected' : ''}>${c.label}</option>`).join('');
    } else {
      // Both or none
      const all = [
        ...MateriaisPage.categorias.filter(c => c.value !== ''),
        ...this.categorias
      ];
      // Unique values
      const unique = [];
      const map = new Map();
      for (const item of all) {
        if(!map.has(item.value)){
          map.set(item.value, true);
          unique.push(item);
        }
      }
      options += unique.map(c => `<option value="${c.value}" ${atual === c.value ? 'selected' : ''}>${c.label}</option>`).join('');
    }

    select.innerHTML = options;
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
        ${r.status === 'previsto' 
          ? `<button class="btn-icon" title="Marcar como Pago" style="color: var(--color-success);" onclick="CustosPage.trocarStatus(${r.id}, 'pago')">${Helpers.icons.check}</button>` 
          : `<button class="btn-icon" title="Marcar como Pendente" style="color: var(--color-warning);" onclick="CustosPage.trocarStatus(${r.id}, 'previsto')">${Helpers.icons.clock || '🕒'}</button>`
        }
        <button class="btn-icon" title="Editar" onclick="CustosPage.openForm(${r.id})">${Helpers.icons.edit}</button>
        <button class="btn-icon" title="Excluir" onclick="CustosPage.confirmDelete(${r.id}, '${r.descricao.replace(/'/g, "\\'")}')">${Helpers.icons.trash}</button>
      `
    });
  },

  async trocarStatus(id, novoStatus) {
    try {
      if (novoStatus === 'pago') {
        const custo = await electronAPI.custos.buscar(id);
        const grupoInfo = await electronAPI.custos.getGrupoInfo(custo.grupo_id);

        if (grupoInfo && grupoInfo.total > 1) {
          // Busca quantas faltam pagar (status != pago)
          // Na verdade o getGrupoInfo traz o total. Ideal seria saber quantas pendentes.
          // Por simplicidade, oferecemos as opções se houver mais de uma no grupo.
          
          Modal.open(`
            <div class="modal-header">
              <h3>Confirmar Pagamento</h3>
              <button class="modal-close" onclick="Modal.close()">${Helpers.icons.close}</button>
            </div>
            <div class="modal-body">
              <p style="margin-bottom: var(--spacing-lg)">O lançamento <strong>${custo.descricao}</strong> faz parte de uma série de <strong>${grupoInfo.total}</strong> lançamentos (<strong>${grupoInfo.pendentes}</strong> ainda pendentes). Como deseja confirmar?</p>
              
              <div style="display: flex; flex-direction: column; gap: var(--spacing-sm);">
                <button class="btn btn-success" onclick="CustosPage.execTrocarStatus(${id}, 'pago')">
                  ✅ Pagar apenas esta parcela
                </button>
                
                <div style="background: var(--bg-secondary); padding: var(--spacing-md); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                  <label class="form-label" style="font-size: 0.75rem;">Pagar próximas parcelas (Máx: ${grupoInfo.pendentes}):</label>
                  <div style="display: flex; gap: 8px;">
                    <input type="number" class="form-input" id="qtd-pagar" value="${Math.min(2, grupoInfo.pendentes)}" min="1" max="${grupoInfo.pendentes}" style="width: 80px;">
                    <button class="btn btn-secondary" style="flex: 1;" onclick="let q = document.getElementById('qtd-pagar').value; if(q > ${grupoInfo.pendentes}) { Toast.warning('Quantidade superior às pendentes'); return; } CustosPage.execTrocarStatusGrupo('${custo.grupo_id}', 'pago', q)">
                      Confirmar Quantidade
                    </button>
                  </div>
                </div>

                <button class="btn btn-primary" onclick="CustosPage.execTrocarStatusGrupo('${custo.grupo_id}', 'pago')">
                  💰 Pagar TODAS as pendentes (${grupoInfo.pendentes})
                </button>
                
                <button class="btn btn-ghost" onclick="Modal.close()">Cancelar</button>
              </div>
            </div>
          `);
          return;
        }
      }

      await this.execTrocarStatus(id, novoStatus);
    } catch (err) {
      console.error(err);
      Toast.error('Erro ao processar status');
    }
  },

  async execTrocarStatus(id, novoStatus) {
    try {
      await electronAPI.custos.marcarStatus(id, novoStatus);
      Toast.success(novoStatus === 'pago' ? 'Marcado como pago!' : 'Marcado como pendente');
      Modal.close();
      this.loadData();
    } catch (err) {
      Toast.error('Erro ao alterar status');
    }
  },

  async execTrocarStatusGrupo(grupoId, status, qtd = null) {
    try {
      await electronAPI.custos.marcarStatusGrupo(grupoId, status, qtd);
      Toast.success(qtd ? `${qtd} parcelas marcadas como pagas!` : 'Todas as parcelas marcadas como pagas!');
      Modal.close();
      this.loadData();
    } catch (err) {
      Toast.error('Erro ao atualizar grupo');
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

  filterCategoria(cat) {
    this.filtros.categoria = cat;
    this.loadData();
  },

  getCategoriaLabel(tipo, catValue) {
    if (tipo === 'materiais') {
      return MateriaisPage._categoriaLabel(catValue);
    } else {
      const cat = this.categorias.find(c => c.value === catValue);
      if (cat) return cat.label;
      // Fallback for hidden defaults or custom ones not currently active
      return Helpers.categoriaLabel(catValue);
    }
  },

  async openForm(id = null) {
    let custo = null;
    if (id) {
      custo = await electronAPI.custos.buscar(id);
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
      options = this.categorias.map(c => `<option value="${c.value}" ${atual === c.value ? 'selected' : ''}>${c.label}</option>`).join('');
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
      descricao: document.getElementById('custo-descricao').value.trim() || 'Sem Descrição',
      valor: parseFloat(document.getElementById('custo-valor').value) || 0,
      categoria: document.getElementById('custo-categoria').value,
      observacoes: document.getElementById('custo-observacoes').value.trim()
    };

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

  async confirmDelete(id, desc) {
    try {
      const custo = await electronAPI.custos.buscar(id);
      const grupoInfo = await electronAPI.custos.getGrupoInfo(custo.grupo_id);
      
      if (grupoInfo && grupoInfo.total > 1) {
        Modal.open(`
          <div class="modal-header">
            <h3>Excluir Lançamento Parcelado</h3>
            <button class="modal-close" onclick="Modal.close()">${Helpers.icons.close}</button>
          </div>
          <div class="modal-body">
            <p style="margin-bottom: var(--spacing-lg)">O lançamento <strong>${desc}</strong> faz parte de uma compra parcelada. O que deseja fazer?</p>
            
            <div style="display: flex; flex-direction: column; gap: var(--spacing-sm);">
              <button class="btn btn-secondary" onclick="CustosPage.deleteSingle(${id})">
                🗑️ Excluir apenas esta parcela
              </button>
              <button class="btn btn-danger" onclick="CustosPage.deleteGroup('${custo.grupo_id}', '${desc}')">
                💥 Excluir TODA a compra (${grupoInfo.total} parcelas)
              </button>
              <button class="btn btn-ghost" onclick="Modal.close()">Cancelar</button>
            </div>
          </div>
        `);
      } else {
        Modal.confirm(`Tem certeza que deseja excluir o lançamento <strong>${desc}</strong>?`, () => {
          this.deleteSingle(id, true);
        });
      }
    } catch (err) {
      console.error(err);
      Toast.error('Erro ao processar exclusão');
    }
  },

  async deleteSingle(id, reload = true) {
    try {
      await electronAPI.custos.excluir(id);
      if (reload) {
        Toast.success('Custo movido para a lixeira', {
          action: {
            label: 'Desfazer',
            callback: async () => {
              try {
                await electronAPI.custos.restaurar(id);
                Toast.success('Custo restaurado!');
                this.loadData();
              } catch (e) {
                Toast.error('Erro ao restaurar');
              }
            }
          }
        });
        Modal.close();
        this.loadData();
      }
    } catch (err) {
      Toast.error('Erro ao excluir parcela');
    }
  },

  async deleteGroup(grupoId, desc) {
    try {
      await electronAPI.custos.excluirPorGrupo(grupoId);
      Toast.success('Compra completa movida para a lixeira', {
        action: {
          label: 'Desfazer',
          callback: async () => {
            try {
              await electronAPI.custos.restaurarGrupo(grupoId);
              Toast.success('Compra restaurada!');
              this.loadData();
            } catch (e) {
              Toast.error('Erro ao restaurar');
            }
          }
        }
      });
      Modal.close();
      this.loadData();
    } catch (err) {
      Toast.error('Erro ao excluir grupo');
    }
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
  },

  async openHistorico() {
    try {
      const historico = await electronAPI.custos.historicoMensal();
      
      // Group by month
      const porMes = historico.reduce((acc, curr) => {
        if (!acc[curr.mes]) acc[curr.mes] = { materiais: 0, despesas: 0, total: 0 };
        acc[curr.mes][curr.tipo] = curr.total;
        acc[curr.mes].total += curr.total;
        return acc;
      }, {});

      const meses = Object.keys(porMes).sort().reverse();

      Modal.open(`
        <div class="modal-header">
          <h3>🕒 Histórico de Pagamentos Mensais</h3>
          <button class="modal-close" onclick="Modal.close()">${Helpers.icons.close}</button>
        </div>
        <div class="modal-body">
          <p class="page-subtitle" style="margin-bottom: var(--spacing-md);">Consolidado de tudo que já foi <strong>pago</strong> em meses anteriores.</p>
          
          <div style="max-height: 500px; overflow-y: auto;">
            ${meses.length === 0 
              ? '<div class="empty-state">Nenhum histórico de pagamentos encontrado.</div>' 
              : `<table class="simple-table">
                  <thead>
                    <tr>
                      <th>Mês/Ano</th>
                      <th style="text-align: right;">Materiais</th>
                      <th style="text-align: right;">Despesas</th>
                      <th style="text-align: right;">Total Pago</th>
                      <th style="text-align: center;">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${meses.map(m => {
                      const dados = porMes[m];
                      const [ano, mes] = m.split('-');
                      const nomesMeses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                      const labelMes = `${nomesMeses[parseInt(mes)-1]}/${ano}`;
                      
                      return `
                        <tr>
                          <td><strong>${labelMes}</strong></td>
                          <td style="text-align: right; color: var(--text-secondary);">${Helpers.formatCurrency(dados.materiais)}</td>
                          <td style="text-align: right; color: var(--text-secondary);">${Helpers.formatCurrency(dados.despesas)}</td>
                          <td style="text-align: right;"><strong style="color: var(--color-danger);">${Helpers.formatCurrency(dados.total)}</strong></td>
                          <td style="text-align: center;">
                            <button class="btn btn-sm btn-secondary" onclick="CustosPage.viewMonth('${m}')">Ver Detalhes</button>
                          </td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>`
            }
          </div>
        </div>
      `);
    } catch (err) {
      console.error(err);
      Toast.error('Erro ao carregar histórico');
    }
  },

  viewMonth(mes) {
    this.filtros.mes = mes;
    this.filtros.status = 'pago';
    this.loadData();
    Modal.close();
    Toast.info(`Mostrando pagamentos de ${mes}`);
  },

  // ============ Category Manager ============
  openCategoryManager() {
    const customCats = this.getCustomCategorias();
    Modal.open(`
      <div class="modal-header">
        <h3>${Helpers.icons.settings || '⚙️'} Gerenciar Categorias de Despesas</h3>
        <button class="modal-close" onclick="Modal.close()">${Helpers.icons.close}</button>
      </div>
      <div class="modal-body">
        <p style="color: var(--text-secondary); font-size: var(--font-size-sm); margin-bottom: var(--spacing-md);">
          Gerencie como você classifica seus gastos de casa e negócio.
        </p>

        <div class="form-group">
          <label class="form-label">Categorias Padrão</label>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            ${this.defaultCategorias.filter(c => !this.getDeletedDefaultCategorias().includes(c.value)).map(c => {
              return `
                <div style="display: flex; align-items: center; gap: 4px;">
                  <span class="filter-chip active" style="pointer-events: none;">${c.label}</span>
                  <button class="btn-icon" style="width:24px;height:24px; font-size: 10px;" 
                          onclick="CustosPage._toggleDefaultCategory('${c.value}')" 
                          title="Remover">
                    ${Helpers.icons.trash}
                  </button>
                </div>
              `;
            }).join('') || '<p style="color: var(--text-tertiary); font-size: var(--font-size-sm);">Todas as categorias padrão foram removidas.</p>'}
          </div>
        </div>

        ${this.getDeletedDefaultCategorias().length > 0 ? `
        <div class="form-group" style="margin-top: var(--spacing-md);">
          <label class="form-label" style="font-size: 0.75rem; opacity: 0.7;">Restaurar Categorias Padrão</label>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            ${this.defaultCategorias.filter(c => this.getDeletedDefaultCategorias().includes(c.value)).map(c => `
              <div style="display: flex; align-items: center; gap: 4px; opacity: 0.6;">
                <span class="filter-chip" style="pointer-events: none; border-style: dashed;">${c.label}</span>
                <button class="btn-icon" style="width:24px;height:24px; font-size: 10px;" 
                        onclick="CustosPage._toggleDefaultCategory('${c.value}')" title="Restaurar">
                  ${Helpers.icons.plus}
                </button>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}

        <div class="form-group" style="margin-top: var(--spacing-lg);">
          <label class="form-label">Categorias Personalizadas</label>
          <div id="custom-cats-list" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px;">
            ${customCats.length === 0
              ? '<p style="color: var(--text-tertiary); font-size: var(--font-size-sm);">Nenhuma categoria personalizada</p>'
              : customCats.map((c, i) => `
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span class="filter-chip active" style="pointer-events: none;">${c.label}</span>
                  <button class="btn-icon" style="width:28px;height:28px;" 
                          onclick="CustosPage._removeCustomCategory('${c.value}')" title="Remover">
                    ${Helpers.icons.trash}
                  </button>
                </div>
              `).join('')
            }
          </div>
          <div style="display: flex; gap: 8px; margin-top: 8px;">
            <input type="text" class="form-input" id="new-cat-name-custos" 
                   placeholder="Nova categoria de despesa..." style="flex: 1;"
                   onkeydown="if(event.key==='Enter') CustosPage._addCustomCategory()">
            <button class="btn btn-primary" onclick="CustosPage._addCustomCategory()">
              ${Helpers.icons.plus} Adicionar
            </button>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Modal.close()">Fechar</button>
      </div>
    `);
  },

  _addCustomCategory() {
    const input = document.getElementById('new-cat-name-custos');
    const label = input.value.trim();
    if (!label) return Toast.warning('Digite o nome da categoria');

    const value = label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    if (!value) return Toast.warning('Nome inválido');

    const cats = this.getCustomCategorias();
    const allValues = [...this.defaultCategorias.map(c => c.value), ...cats.map(c => c.value)];
    if (allValues.includes(value)) return Toast.warning('Categoria já existe');

    cats.push({ value, label });
    this.saveCustomCategorias(cats);
    Toast.success(`Categoria "${label}" criada!`);
    this.openCategoryManager(); 
  },

  _removeCustomCategory(value) {
    const cats = this.getCustomCategorias().filter(c => c.value !== value);
    this.saveCustomCategorias(cats);
    this.openCategoryManager();
    Toast.success('Categoria removida');
  },

  _toggleDefaultCategory(value) {
    let deleted = this.getDeletedDefaultCategorias();
    if (deleted.includes(value)) {
      deleted = deleted.filter(v => v !== value);
      Toast.success('Categoria restaurada');
    } else {
      deleted.push(value);
      Toast.success('Categoria padrão ocultada');
    }
    this.saveDeletedDefaultCategorias(deleted);
    this.openCategoryManager();
  }
};
