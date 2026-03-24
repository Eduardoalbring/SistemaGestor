// ============ Materiais Page ============

const MateriaisPage = {
  filtros: { busca: '', categoria: '' },

  // Default categories (not removable)
  defaultCategorias: [
    { value: 'fios_cabos', label: 'Fios e Cabos' },
    { value: 'disjuntores', label: 'Disjuntores' },
    { value: 'tomadas_interruptores', label: 'Tomadas/Interruptores' },
    { value: 'iluminacao', label: 'Iluminação' },
    { value: 'quadros', label: 'Quadros Elétricos' },
    { value: 'automacao', label: 'Automação' },
    { value: 'tubulacao', label: 'Tubulação' },
    { value: 'ferramentas', label: 'Ferramentas' },
    { value: 'outros', label: 'Outros' },
  ],

  // Get custom categories from localStorage
  getCustomCategorias() {
    try {
      return JSON.parse(localStorage.getItem('materiais_categorias_custom') || '[]');
    } catch { return []; }
  },

  // Get deleted default categories
  getDeletedDefaultCategorias() {
    try {
      return JSON.parse(localStorage.getItem('materiais_categorias_deleted_defaults') || '[]');
    } catch { return []; }
  },

  // Save deleted default categories
  saveDeletedDefaultCategorias(cats) {
    localStorage.setItem('materiais_categorias_deleted_defaults', JSON.stringify(cats));
  },

  // Save custom categories to localStorage
  saveCustomCategorias(cats) {
    localStorage.setItem('materiais_categorias_custom', JSON.stringify(cats));
  },

  // All categories merged
  get categorias() {
    const custom = this.getCustomCategorias();
    const deletedDefaults = this.getDeletedDefaultCategorias();
    const activeDefaults = this.defaultCategorias.filter(c => !deletedDefaults.includes(c.value));
    
    return [
      { value: '', label: 'Todas' },
      ...activeDefaults,
      ...custom
    ];
  },

  async render() {
    const content = document.getElementById('main-content');
    const categorias = this.categorias;
    const customCats = this.getCustomCategorias();

    content.innerHTML = `<div class="page-content fade-in">
      <div class="page-header">
        <div>
          <h2>${Helpers.icons.materiais} Materiais</h2>
          <p class="page-subtitle">Catálogo de materiais elétricos</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-secondary" onclick="MateriaisPage.openCategoryManager()">
            ${Helpers.icons.settings} Categorias
          </button>
          <button class="btn btn-primary" onclick="MateriaisPage.openForm()">
            ${Helpers.icons.plus} Novo Material
          </button>
        </div>
      </div>
      <div class="table-container">
        <div class="table-toolbar">
          <div class="search-container" style="width: 320px;">
            ${Helpers.icons.search}
            <input type="text" class="search-input" placeholder="Buscar material..."
                   oninput="MateriaisPage.onSearch(this.value)">
          </div>
          <div class="table-filters" style="flex-wrap: wrap;">
            ${categorias.map(c => `
              <button class="filter-chip ${this.filtros.categoria === c.value ? 'active' : ''}" 
                      onclick="MateriaisPage.filterCategoria('${c.value}')">${c.label}</button>
            `).join('')}
          </div>
        </div>
        <div id="materiais-table-body"></div>
      </div>
    </div>`;

    this.loadData();
  },

  async loadData() {
    try {
      const materiais = await electronAPI.materiais.listar(this.filtros);
      this.renderTable(materiais);
    } catch (err) {
      Toast.error('Erro ao carregar materiais');
    }
  },

  renderTable(materiais) {
    document.getElementById('materiais-table-body').innerHTML = Table.render({
      columns: [
        { label: 'Material', render: (r) => `<strong>${r.nome}</strong>` },
        { label: 'Preço Venda', render: (r) => `<strong style="color: var(--accent-primary);">${Helpers.formatCurrency(r.preco_venda || 0)}</strong>` },
        { label: 'Categoria', render: (r) => `<span class="badge badge-enviado">${this._categoriaLabel(r.categoria)}</span>` },
        { label: 'Unidade', render: (r) => Helpers.unidadeLabel(r.unidade) },
        { 
          label: 'Performance', 
          render: (r) => {
            const lucro = (r.receita_total || 0) - (r.custo_total || 0);
            const statusClass = lucro >= 0 ? 'text-success' : 'text-danger';
            return `
              <div class="perf-stats">
                <div title="Vendido">${Helpers.icons.package} <strong>${r.total_vendido || 0}</strong> ${r.unidade}</div>
                <div class="${statusClass}" title="Lucro/Prejuízo">
                  <strong>${Helpers.formatCurrency(lucro)}</strong>
                  <span style="font-size: 0.7rem; opacity: 0.7; display: block;">
                    Rec: ${Helpers.formatCurrency(r.receita_total || 0)} | Custo: ${Helpers.formatCurrency(r.custo_total || 0)}
                  </span>
                </div>
              </div>
            `;
          }
        },
        {
          label: 'Amazon',
          render: (r) => `
            <button class="amazon-btn" onclick="MateriaisPage.searchAmazon('${r.nome.replace(/'/g, "\\'")}')">
              ${Helpers.icons.shoppingCart} Buscar ${Helpers.icons.externalLink}
            </button>
          `
        }
      ],
      data: materiais,
      emptyMessage: 'Nenhum material cadastrado',
      emptyIcon: Helpers.icons.package,
      actions: (r) => `
        <button class="btn-icon" title="Editar" onclick="MateriaisPage.openForm(${r.id})">${Helpers.icons.edit}</button>
        <button class="btn-icon" title="Excluir" onclick="MateriaisPage.confirmDelete(${r.id}, '${r.nome.replace(/'/g, "\\'")}')">${Helpers.icons.trash}</button>
      `
    });
  },

  // Category label (includes custom cats)
  _categoriaLabel(cat) {
    const custom = this.getCustomCategorias().find(c => c.value === cat);
    if (custom) return custom.label;
    return Helpers.categoriaLabel(cat);
  },

  onSearch: Helpers.debounce(function(value) {
    MateriaisPage.filtros.busca = value;
    MateriaisPage.loadData();
  }, 300),

  filterCategoria(cat) {
    this.filtros.categoria = cat;
    this.render();
  },

  // ============ Category Manager ============
  openCategoryManager() {
    const customCats = this.getCustomCategorias();
    Modal.open(`
      <div class="modal-header">
        <h3>${Helpers.icons.settings} Gerenciar Categorias</h3>
        <button class="modal-close" onclick="Modal.close()">${Helpers.icons.close}</button>
      </div>
      <div class="modal-body">
        <p style="color: var(--text-secondary); font-size: var(--font-size-sm); margin-bottom: var(--spacing-md);">
          Categorias padrão não podem ser removidas. Adicione categorias personalizadas abaixo.
        </p>

        <div class="form-group">
          <label class="form-label">Categorias Padrão</label>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            ${this.defaultCategorias.filter(c => !this.getDeletedDefaultCategorias().includes(c.value)).map(c => {
              return `
                <div style="display: flex; align-items: center; gap: 4px;">
                  <span class="filter-chip active" style="pointer-events: none;">${c.label}</span>
                  <button class="btn-icon" style="width:24px;height:24px; font-size: 10px;" 
                          onclick="MateriaisPage._toggleDefaultCategory('${c.value}')" 
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
                        onclick="MateriaisPage._toggleDefaultCategory('${c.value}')" title="Restaurar">
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
                          onclick="MateriaisPage._removeCustomCategory('${c.value}')" title="Remover">
                    ${Helpers.icons.trash}
                  </button>
                </div>
              `).join('')
            }
          </div>
          <div style="display: flex; gap: 8px; margin-top: 8px;">
            <input type="text" class="form-input" id="new-cat-name" 
                   placeholder="Nome da nova categoria..." style="flex: 1;"
                   onkeydown="if(event.key==='Enter') MateriaisPage._addCustomCategory()">
            <button class="btn btn-primary" onclick="MateriaisPage._addCustomCategory()">
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
    const input = document.getElementById('new-cat-name');
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
    this.openCategoryManager(); // refresh modal
  },

  _removeCustomCategory(value) {
    const cats = this.getCustomCategorias().filter(c => c.value !== value);
    this.saveCustomCategorias(cats);
    this.openCategoryManager(); // refresh modal
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
    this.render(); // update chips in background
  },

  // ============ Form ============
  async openForm(id = null) {
    let material = null;
    if (id) {
      material = await electronAPI.materiais.buscar(id);
    }
    const isEdit = material !== null;
    const allCats = [...this.defaultCategorias, ...this.getCustomCategorias()];

    Modal.open(`
      <div class="modal-header">
        <h3>${isEdit ? 'Editar Material' : 'Novo Material'}</h3>
        <button class="modal-close" onclick="Modal.close()">${Helpers.icons.close}</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Nome do Material *</label>
          <input type="text" class="form-input" id="mat-nome" placeholder="Ex: Cabo flexível 2.5mm" value="${isEdit ? material.nome : ''}">
        </div>
        <div class="form-row-3">
          <div class="form-group">
            <label class="form-label">Categoria</label>
            <select class="form-select" id="mat-categoria">
              ${allCats.map(c => `
                <option value="${c.value}" ${isEdit && material.categoria === c.value ? 'selected' : ''}>${c.label}</option>
              `).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Unidade</label>
            <select class="form-select" id="mat-unidade">
              <option value="un" ${isEdit && material.unidade === 'un' ? 'selected' : ''}>Unidade</option>
              <option value="m" ${isEdit && material.unidade === 'm' ? 'selected' : ''}>Metro</option>
              <option value="kg" ${isEdit && material.unidade === 'kg' ? 'selected' : ''}>Quilograma</option>
              <option value="cx" ${isEdit && material.unidade === 'cx' ? 'selected' : ''}>Caixa</option>
              <option value="rl" ${isEdit && material.unidade === 'rl' ? 'selected' : ''}>Rolo</option>
              <option value="pc" ${isEdit && material.unidade === 'pc' ? 'selected' : ''}>Peça</option>
              <option value="jg" ${isEdit && material.unidade === 'jg' ? 'selected' : ''}>Jogo</option>
              <option value="pct" ${isEdit && material.unidade === 'pct' ? 'selected' : ''}>Pacote</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Preço de Custo (R$)</label>
            <input type="number" class="form-input" id="mat-custo" placeholder="0,00" step="0.01" 
                   value="${isEdit ? material.preco_custo : '0'}" oninput="MateriaisPage.calcMargin()">
          </div>
          <div class="form-group">
            <label class="form-label">Preço de Venda (R$)</label>
            <input type="number" class="form-input" id="mat-venda" placeholder="0,00" step="0.01" 
                   value="${isEdit ? material.preco_venda : '0'}" oninput="MateriaisPage.calcMargin()">
          </div>
          <div class="form-group">
            <label class="form-label">Lucro / Markup (%)</label>
            <div id="mat-margem-display" class="badge" style="display: block; text-align: center; padding: 10px; font-weight: 700; font-size: 1rem; background: var(--bg-secondary);">
              0%
            </div>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Descrição</label>
          <textarea class="form-textarea" id="mat-descricao" placeholder="Características do material...">${isEdit ? (material.descricao || '') : ''}</textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
        <button class="btn btn-primary" onclick="MateriaisPage.saveForm(${isEdit ? material.id : 'null'})">
          ${Helpers.icons.check} ${isEdit ? 'Salvar' : 'Criar Material'}
        </button>
      </div>
    `);

    // Fix: Calculate margin immediately on open
    this.calcMargin();
  },

  async saveForm(id) {
    const dados = {
      nome: document.getElementById('mat-nome').value.trim() || 'Material sem Nome',
      categoria: document.getElementById('mat-categoria').value,
      unidade: document.getElementById('mat-unidade').value,
      preco_custo: parseFloat(document.getElementById('mat-custo').value) || 0,
      preco_venda: parseFloat(document.getElementById('mat-venda').value) || 0,
      descricao: document.getElementById('mat-descricao').value.trim(),
    };

    try {
      if (id) {
        await electronAPI.materiais.atualizar(id, dados);
        Toast.success('Material atualizado!');
      } else {
        await electronAPI.materiais.criar(dados);
        Toast.success('Material criado!');
      }
      Modal.close();
      this.loadData();
    } catch (err) {
      Toast.error('Erro ao salvar material');
    }
  },

  confirmDelete(id, nome) {
    Modal.confirm(`Tem certeza que deseja excluir o material <strong>${nome}</strong>?`, async () => {
      try {
        await electronAPI.materiais.excluir(id);
        Toast.success('Material excluído');
        this.loadData();
      } catch (err) {
        Toast.error('Erro ao excluir');
      }
    });
  },

  searchAmazon(term) {
    const url = Helpers.amazonSearchUrl(term);
    electronAPI.openExternal(url);
  },

  calcMargin() {
    const custo = parseFloat(document.getElementById('mat-custo').value) || 0;
    const venda = parseFloat(document.getElementById('mat-venda').value) || 0;
    const display = document.getElementById('mat-margem-display');
    if (!display) return;

    if (custo > 0) {
      const markup = ((venda - custo) / custo) * 100;
      display.textContent = `${markup.toFixed(1)}%`;
      display.className = `badge ${markup >= 0 ? 'badge-aprovado' : 'badge-rejeitado'}`;
    } else if (venda > 0) {
      display.textContent = '100%+';
      display.className = 'badge badge-aprovado';
    } else {
      display.textContent = '0%';
      display.className = 'badge';
    }
  }
};
