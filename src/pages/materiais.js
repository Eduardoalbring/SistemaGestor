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

  // Save custom categories to localStorage
  saveCustomCategorias(cats) {
    localStorage.setItem('materiais_categorias_custom', JSON.stringify(cats));
  },

  // All categories merged
  get categorias() {
    const custom = this.getCustomCategorias();
    return [
      { value: '', label: 'Todas' },
      ...this.defaultCategorias,
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
        { label: 'Categoria', render: (r) => `<span class="badge badge-enviado">${this._categoriaLabel(r.categoria)}</span>` },
        { label: 'Unidade', render: (r) => Helpers.unidadeLabel(r.unidade) },
        { label: 'Valor Ref.', render: (r) => Helpers.formatCurrency(r.valor_referencia) },
        {
          label: 'Amazon',
          render: (r) => `
            <button class="amazon-btn" onclick="MateriaisPage.searchAmazon('${r.nome.replace(/'/g, "\\'")}')">
              ${Helpers.icons.shoppingCart} Buscar Preço ${Helpers.icons.externalLink}
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
          <div style="display: flex; flex-wrap: wrap; gap: 6px;">
            ${this.defaultCategorias.map(c => `
              <span class="filter-chip" style="cursor: default; opacity: 0.7;">${c.label}</span>
            `).join('')}
          </div>
        </div>

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
            <label class="form-label">Valor Referência (R$)</label>
            <input type="number" class="form-input" id="mat-valor" placeholder="0,00" step="0.01" value="${isEdit ? material.valor_referencia : '0'}">
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
  },

  async saveForm(id) {
    const dados = {
      nome: document.getElementById('mat-nome').value.trim(),
      categoria: document.getElementById('mat-categoria').value,
      unidade: document.getElementById('mat-unidade').value,
      valor_referencia: parseFloat(document.getElementById('mat-valor').value) || 0,
      descricao: document.getElementById('mat-descricao').value.trim(),
    };

    if (!dados.nome) return Toast.warning('Nome é obrigatório');

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
  }
};
