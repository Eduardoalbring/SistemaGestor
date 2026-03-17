const SQLite = require('better-sqlite3');
const path = require('path');

class Database {
  constructor(userDataPath) {
    try {
      const dbPath = path.join(userDataPath, 'albrings.db');
      console.log('Iniciando banco de dados em:', dbPath);
      this.db = new SQLite(dbPath);
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('foreign_keys = ON');
      this.init();
    } catch (err) {
      console.error('CRITICAL: Erro ao inicializar o banco de dados:', err);
      throw err;
    }
  }

  init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS clientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT DEFAULT 'Sem Nome',
        telefone TEXT,
        email TEXT,
        endereco TEXT,
        cpf_cnpj TEXT,
        tipo TEXT DEFAULT 'residencial',
        notas TEXT,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
        atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS orcamentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente_id INTEGER NOT NULL,
        servico_id INTEGER,
        titulo TEXT DEFAULT 'Sem Título',
        descricao TEXT,
        status TEXT DEFAULT 'rascunho',
        mao_de_obra REAL DEFAULT 0,
        desconto REAL DEFAULT 0,
        tipo TEXT DEFAULT 'inicial',
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
        atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS orcamento_itens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        orcamento_id INTEGER NOT NULL,
        material_id INTEGER,
        descricao TEXT DEFAULT 'Novo Item',
        quantidade REAL DEFAULT 1,
        valor_unitario REAL DEFAULT 0,
        categoria TEXT DEFAULT 'material',
        comprado_pelo_cliente INTEGER DEFAULT 0,
        FOREIGN KEY (orcamento_id) REFERENCES orcamentos(id) ON DELETE CASCADE,
        FOREIGN KEY (material_id) REFERENCES materiais(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS servicos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        servico_pai_id INTEGER,
        orcamento_id INTEGER,
        cliente_id INTEGER NOT NULL,
        titulo TEXT DEFAULT 'Sem Título',
        descricao TEXT,
        status TEXT DEFAULT 'pendente',
        prioridade TEXT DEFAULT 'normal',
        data_inicio DATE,
        data_fim DATE,
        data_conclusao DATE,
        notas TEXT,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
        atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (orcamento_id) REFERENCES orcamentos(id) ON DELETE SET NULL,
        FOREIGN KEY (servico_pai_id) REFERENCES servicos(id) ON DELETE SET NULL,
        FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS materiais (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT DEFAULT 'Material sem Nome',
        categoria TEXT DEFAULT 'geral',
        unidade TEXT DEFAULT 'un',
        preco_custo REAL DEFAULT 0,
        preco_venda REAL DEFAULT 0,
        valor_referencia REAL DEFAULT 0,
        descricao TEXT,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS custos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo TEXT NOT NULL DEFAULT 'materiais',
        categoria TEXT DEFAULT 'outros',
        descricao TEXT DEFAULT 'Sem Descrição',
        valor REAL NOT NULL DEFAULT 0,
        data DATE NOT NULL,
        observacoes TEXT,
        status TEXT DEFAULT 'pago',
        orcamento_item_id INTEGER,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (orcamento_item_id) REFERENCES orcamento_itens(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS eventos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        titulo TEXT DEFAULT 'Sem Título',
        descricao TEXT,
        data_inicio DATETIME NOT NULL,
        data_fim DATETIME NOT NULL,
        cor TEXT DEFAULT '#2563EB',
        notificado INTEGER DEFAULT 0,
        google_event_id TEXT,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS metas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        titulo TEXT DEFAULT 'Meta sem Nome',
        valor_alvo REAL NOT NULL,
        status TEXT DEFAULT 'pendente',
        icone TEXT DEFAULT 'target',
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS custos_fixos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        descricao TEXT DEFAULT 'Despesa sem Nome',
        valor REAL NOT NULL,
        dia_vencimento INTEGER NOT NULL,
        categoria TEXT DEFAULT 'outros',
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migrações seguras (adiciona colunas se não existirem)
    try {
      this.db.prepare("ALTER TABLE custos ADD COLUMN status TEXT DEFAULT 'pago'").run();
    } catch (e) { /* Coluna já existe */ }

    try {
      this.db.prepare("ALTER TABLE eventos ADD COLUMN google_event_id TEXT").run();
    } catch (e) { /* Coluna já existe */ }

    // Novo relacionamento entre orçamentos e serviços
    try {
      this.db.prepare("ALTER TABLE orcamentos ADD COLUMN servico_id INTEGER").run();
    } catch (e) { /* Coluna já existe */ }

    try {
      this.db.prepare("ALTER TABLE orcamentos ADD COLUMN tipo TEXT DEFAULT 'inicial'").run();
    } catch (e) { /* Coluna já existe */ }

    // Relacionamento de hierarquia entre serviços (OS pai/filha)
    try {
      this.db.prepare("ALTER TABLE servicos ADD COLUMN servico_pai_id INTEGER").run();
    } catch (e) { /* Coluna já existe */ }

    // Novas colunas para controle de compras pelo cliente
    try {
      this.db.prepare("ALTER TABLE orcamento_itens ADD COLUMN comprado_pelo_cliente INTEGER DEFAULT 0").run();
    } catch (e) { /* Coluna já existe */ }

    try {
      this.db.prepare("ALTER TABLE materiais ADD COLUMN preco_custo REAL DEFAULT 0").run();
    } catch (e) { }

    try {
      this.db.prepare("ALTER TABLE materiais ADD COLUMN preco_venda REAL DEFAULT 0").run();
    } catch (e) { }

    try {
      this.db.prepare("ALTER TABLE orcamento_itens ADD COLUMN material_id INTEGER").run();
    } catch (e) { }

    try {
      this.db.prepare("ALTER TABLE custos ADD COLUMN orcamento_item_id INTEGER").run();
    } catch (e) { /* Coluna já existe */ }

    // Roda verificação/geração de despesas fixas para o mês atual
    try {
      this.gerarCustosFixosDoMes();
    } catch (e) {
      console.error('Erro ao gerar custos fixos do mes:', e);
    }
  }

  close() {
    this.db.close();
  }

  // ============ CLIENTES ============
  listarClientes(filtros = {}) {
    let query = 'SELECT * FROM clientes WHERE 1=1';
    const params = [];

    if (filtros.busca) {
      query += ' AND (nome LIKE ? OR telefone LIKE ? OR email LIKE ? OR cpf_cnpj LIKE ?)';
      const term = `%${filtros.busca}%`;
      params.push(term, term, term, term);
    }
    if (filtros.tipo) {
      query += ' AND tipo = ?';
      params.push(filtros.tipo);
    }

    query += ' ORDER BY criado_em DESC';
    return this.db.prepare(query).all(...params);
  }

  buscarCliente(id) {
    const cliente = this.db.prepare('SELECT * FROM clientes WHERE id = ?').get(id);
    if (cliente) {
      cliente.orcamentos = this.db.prepare('SELECT * FROM orcamentos WHERE cliente_id = ? ORDER BY criado_em DESC').all(id);
      cliente.servicos = this.db.prepare('SELECT * FROM servicos WHERE cliente_id = ? ORDER BY criado_em DESC').all(id);
    }
    return cliente;
  }

  criarCliente(dados) {
    const stmt = this.db.prepare(`
      INSERT INTO clientes (nome, telefone, email, endereco, cpf_cnpj, tipo, notas)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(dados.nome, dados.telefone, dados.email, dados.endereco, dados.cpf_cnpj, dados.tipo, dados.notas);
    return { id: result.lastInsertRowid, ...dados };
  }

  atualizarCliente(id, dados) {
    const stmt = this.db.prepare(`
      UPDATE clientes SET nome=?, telefone=?, email=?, endereco=?, cpf_cnpj=?, tipo=?, notas=?, atualizado_em=CURRENT_TIMESTAMP
      WHERE id=?
    `);
    stmt.run(dados.nome, dados.telefone, dados.email, dados.endereco, dados.cpf_cnpj, dados.tipo, dados.notas, id);
    return this.buscarCliente(id);
  }

  excluirCliente(id) {
    this.db.prepare('DELETE FROM clientes WHERE id = ?').run(id);
    return { success: true };
  }

  // ============ ORÇAMENTOS ============
  listarOrcamentos(filtros = {}) {
    let query = `
      SELECT o.*, c.nome as cliente_nome,
        (SELECT COALESCE(SUM(quantidade * valor_unitario), 0) FROM orcamento_itens WHERE orcamento_id = o.id AND comprado_pelo_cliente = 0) as total_itens
      FROM orcamentos o
      LEFT JOIN clientes c ON o.cliente_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (filtros.busca) {
      query += ' AND (o.titulo LIKE ? OR c.nome LIKE ?)';
      const term = `%${filtros.busca}%`;
      params.push(term, term);
    }
    if (filtros.status) {
      query += ' AND o.status = ?';
      params.push(filtros.status);
    }
    if (filtros.cliente_id) {
      query += ' AND o.cliente_id = ?';
      params.push(filtros.cliente_id);
    }
    if (filtros.servico_id) {
      query += ' AND o.servico_id = ?';
      params.push(filtros.servico_id);
    }
    if (filtros.tipo) {
      query += ' AND o.tipo = ?';
      params.push(filtros.tipo);
    }

    query += ' ORDER BY o.criado_em DESC';
    return this.db.prepare(query).all(...params);
  }

  buscarOrcamento(id) {
    const orc = this.db.prepare(`
      SELECT o.*, c.nome as cliente_nome, c.telefone as cliente_telefone, c.email as cliente_email
      FROM orcamentos o
      LEFT JOIN clientes c ON o.cliente_id = c.id
      WHERE o.id = ?
    `).get(id);
    if (orc) {
      orc.itens = this.db.prepare('SELECT * FROM orcamento_itens WHERE orcamento_id = ?').all(id);
    }
    return orc;
  }

  criarOrcamento(dados) {
    const stmt = this.db.prepare(`
      INSERT INTO orcamentos (cliente_id, titulo, descricao, status, mao_de_obra, desconto)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(dados.cliente_id, dados.titulo, dados.descricao, dados.status || 'rascunho', dados.mao_de_obra || 0, dados.desconto || 0);
    return { id: result.lastInsertRowid };
  }

  atualizarOrcamento(id, dados) {
    const stmt = this.db.prepare(`
      UPDATE orcamentos SET cliente_id=?, titulo=?, descricao=?, mao_de_obra=?, desconto=?, atualizado_em=CURRENT_TIMESTAMP
      WHERE id=?
    `);
    stmt.run(dados.cliente_id, dados.titulo, dados.descricao, dados.mao_de_obra || 0, dados.desconto || 0, id);
    return this.buscarOrcamento(id);
  }

  atualizarStatusOrcamento(id, status) {
    this.db.prepare('UPDATE orcamentos SET status=?, atualizado_em=CURRENT_TIMESTAMP WHERE id=?').run(status, id);
    return this.buscarOrcamento(id);
  }

  excluirOrcamento(id) {
    this.db.prepare('DELETE FROM orcamentos WHERE id = ?').run(id);
    return { success: true };
  }

  // ============ ORÇAMENTO ITENS ============
  listarItensOrcamento(orcamentoId) {
    return this.db.prepare('SELECT * FROM orcamento_itens WHERE orcamento_id = ?').all(orcamentoId);
  }

  criarItemOrcamento(dados) {
    const stmt = this.db.prepare(`
      INSERT INTO orcamento_itens (orcamento_id, material_id, descricao, quantidade, valor_unitario, categoria, comprado_pelo_cliente)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      dados.orcamento_id,
      dados.material_id || null, 
      dados.descricao, 
      dados.quantidade || 1, 
      dados.valor_unitario || 0, 
      dados.categoria || 'material',
      dados.comprado_pelo_cliente || 0
    );
    const itemId = result.lastInsertRowid;
    this.syncCostFromItem(itemId, { ...dados, id: itemId });
    return { id: itemId };
  }

  atualizarItemOrcamento(id, dados) {
    const stmt = this.db.prepare(`
      UPDATE orcamento_itens SET material_id=?, descricao=?, quantidade=?, valor_unitario=?, categoria=?, comprado_pelo_cliente=?
      WHERE id=?
    `);
    stmt.run(
      dados.material_id || null,
      dados.descricao, 
      dados.quantidade, 
      dados.valor_unitario, 
      dados.categoria, 
      dados.comprado_pelo_cliente || 0,
      id
    );
    this.syncCostFromItem(id, { ...dados, id });
    return { id, ...dados };
  }

  excluirItemOrcamento(id) {
    // A FK constraints (ON DELETE CASCADE) no banco cuidará da exclusão na tabela 'custos' 
    // se tivermos definido corretamente (adicionamos na migração).
    this.db.prepare('DELETE FROM orcamento_itens WHERE id = ?').run(id);
    return { success: true };
  }

  syncCostFromItem(itemId, itemData) {
    // Se comprado pelo cliente, remove o custo se existir
    if (itemData.comprado_pelo_cliente) {
      this.db.prepare('DELETE FROM custos WHERE orcamento_item_id = ?').run(itemId);
      return;
    }

    // Se NÃO comprado pelo cliente, garante que existe o custo previsto
    const orcamento = this.db.prepare(`
      SELECT o.titulo, o.criado_em 
      FROM orcamentos o 
      JOIN orcamento_itens i ON i.orcamento_id = o.id 
      WHERE i.id = ?
    `).get(itemId);

    if (!orcamento) return;

    // Determina o valor do custo
    let valorCusto = itemData.quantidade * itemData.valor_unitario; // Default: preço de venda
    if (itemData.material_id) {
      const material = this.db.prepare('SELECT preco_custo FROM materiais WHERE id = ?').get(itemData.material_id);
      // Se existe o material e tem preço de custo (mesmo que seja 0, se o ID está presente usamos a lógica de custo)
      if (material) {
        valorCusto = itemData.quantidade * (material.preco_custo || 0);
      }
    }

    // Se o valor total do custo for 0 e não houver descrição útil, podemos ignorar ou manter rascunho
    // Mas para orçamento faz sentido manter para o usuário ver na lista de custos previstos
    
    const dataCusto = orcamento.criado_em ? orcamento.criado_em.split(' ')[0] : new Date().toISOString().slice(0, 10);
    const descricaoCusto = `[Orç: ${orcamento.titulo}] ${itemData.descricao}`;

    const custoExistente = this.db.prepare('SELECT id, status FROM custos WHERE orcamento_item_id = ?').get(itemId);

    if (custoExistente) {
      // IMPORTANTE: Mantém o status atual (se já estiver pago, continua pago)
      this.db.prepare(`
        UPDATE custos SET descricao=?, valor=?, data=?
        WHERE orcamento_item_id=?
      `).run(descricaoCusto, valorCusto, dataCusto, itemId);
    } else {
      this.db.prepare(`
        INSERT INTO custos (tipo, categoria, descricao, valor, data, status, orcamento_item_id)
        VALUES ('materiais', 'outros', ?, ?, ?, 'previsto', ?)
      `).run(descricaoCusto, valorCusto, dataCusto, itemId);
    }
  }

  // ============ SERVIÇOS ============
  listarServicos(filtros = {}) {
    let query = `
      SELECT s.*, c.nome as cliente_nome, o.titulo as orcamento_titulo
      FROM servicos s
      LEFT JOIN clientes c ON s.cliente_id = c.id
      LEFT JOIN orcamentos o ON s.orcamento_id = o.id
      WHERE 1=1
    `;
    const params = [];

    if (filtros.busca) {
      query += ' AND (s.titulo LIKE ? OR c.nome LIKE ?)';
      const term = `%${filtros.busca}%`;
      params.push(term, term);
    }
    if (filtros.status) {
      query += ' AND s.status = ?';
      params.push(filtros.status);
    }
    if (filtros.prioridade) {
      query += ' AND s.prioridade = ?';
      params.push(filtros.prioridade);
    }
    if (filtros.cliente_id) {
      query += ' AND s.cliente_id = ?';
      params.push(filtros.cliente_id);
    }
    if (filtros.servico_pai_id) {
      query += ' AND s.servico_pai_id = ?';
      params.push(filtros.servico_pai_id);
    }

    query += ' ORDER BY s.criado_em DESC';
    return this.db.prepare(query).all(...params);
  }

  buscarServico(id) {
    return this.db.prepare(`
      SELECT s.*, c.nome as cliente_nome, c.telefone as cliente_telefone,
        o.titulo as orcamento_titulo
      FROM servicos s
      LEFT JOIN clientes c ON s.cliente_id = c.id
      LEFT JOIN orcamentos o ON s.orcamento_id = o.id
      WHERE s.id = ?
    `).get(id);
  }

  criarServico(dados) {
    const stmt = this.db.prepare(`
      INSERT INTO servicos (servico_pai_id, orcamento_id, cliente_id, titulo, descricao, status, prioridade, data_inicio, data_fim, notas)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    // Safety check for orcamento_id
    const orcamentoId = (dados.orcamento_id && !isNaN(parseInt(dados.orcamento_id))) ? parseInt(dados.orcamento_id) : null;

    const result = stmt.run(
      dados.servico_pai_id || null,
      orcamentoId, dados.cliente_id, dados.titulo, dados.descricao,
      dados.status || 'pendente', dados.prioridade || 'normal',
      dados.data_inicio || null, dados.data_fim || null, dados.notas || null
    );
    return { id: result.lastInsertRowid };
  }

  atualizarServico(id, dados) {
    const stmt = this.db.prepare(`
      UPDATE servicos SET servico_pai_id=?, orcamento_id=?, cliente_id=?, titulo=?, descricao=?, prioridade=?,
        data_inicio=?, data_fim=?, notas=?, atualizado_em=CURRENT_TIMESTAMP
      WHERE id=?
    `);

    // Safety check for orcamento_id
    const orcamentoId = (dados.orcamento_id && !isNaN(parseInt(dados.orcamento_id))) ? parseInt(dados.orcamento_id) : null;

    stmt.run(
      dados.servico_pai_id || null,
      orcamentoId, dados.cliente_id, dados.titulo, dados.descricao,
      dados.prioridade || 'normal', dados.data_inicio || null, dados.data_fim || null,
      dados.notas || null, id
    );
    return this.buscarServico(id);
  }

  atualizarStatusServico(id, status) {
    let query = 'UPDATE servicos SET status=?, atualizado_em=CURRENT_TIMESTAMP';
    const params = [status];
    if (status === 'concluido') {
      query += ', data_conclusao=CURRENT_TIMESTAMP';
    }
    query += ' WHERE id=?';
    params.push(id);
    this.db.prepare(query).run(...params);
    return this.buscarServico(id);
  }

  excluirServico(id) {
    this.db.prepare('DELETE FROM servicos WHERE id = ?').run(id);
    return { success: true };
  }

  // ============ MATERIAIS ============
  listarMateriais(filtros = {}) {
    let query = `
      SELECT m.*,
        (SELECT COALESCE(SUM(oi.quantidade), 0) FROM orcamento_itens oi JOIN orcamentos o ON oi.orcamento_id = o.id WHERE oi.material_id = m.id AND o.status = 'aprovado') as total_vendido,
        (SELECT COALESCE(SUM(oi.quantidade * oi.valor_unitario), 0) FROM orcamento_itens oi JOIN orcamentos o ON oi.orcamento_id = o.id WHERE oi.material_id = m.id AND o.status = 'aprovado') as receita_total,
        (SELECT COALESCE(SUM(c.valor), 0) FROM custos c JOIN orcamento_itens oi ON c.orcamento_item_id = oi.id JOIN orcamentos o ON oi.orcamento_id = o.id WHERE oi.material_id = m.id AND o.status = 'aprovado') as custo_total
      FROM materiais m
      WHERE 1=1
    `;
    const params = [];

    if (filtros.busca) {
      query += ' AND (m.nome LIKE ? OR m.descricao LIKE ?)';
      const term = `%${filtros.busca}%`;
      params.push(term, term);
    }
    if (filtros.categoria) {
      query += ' AND m.categoria = ?';
      params.push(filtros.categoria);
    }

    query += ' ORDER BY m.nome ASC';
    return this.db.prepare(query).all(...params);
  }

  buscarMaterial(id) {
    return this.db.prepare('SELECT * FROM materiais WHERE id = ?').get(id);
  }

  criarMaterial(dados) {
    const stmt = this.db.prepare(`
      INSERT INTO materiais (nome, categoria, unidade, preco_custo, preco_venda, valor_referencia, descricao)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      dados.nome, 
      dados.categoria || 'geral', 
      dados.unidade || 'un', 
      dados.preco_custo || 0,
      dados.preco_venda || 0,
      dados.preco_venda || 0, // valor_referencia keeps sync with preco_venda
      dados.descricao || ''
    );
    return { id: result.lastInsertRowid, ...dados };
  }

  atualizarMaterial(id, dados) {
    const stmt = this.db.prepare(`
      UPDATE materiais SET nome=?, categoria=?, unidade=?, preco_custo=?, preco_venda=?, valor_referencia=?, descricao=?
      WHERE id=?
    `);
    stmt.run(
      dados.nome, 
      dados.categoria, 
      dados.unidade, 
      dados.preco_custo || 0,
      dados.preco_venda || 0,
      dados.preco_venda || 0, // valor_referencia keeps sync with preco_venda
      dados.descricao, 
      id
    );
    return this.buscarMaterial(id);
  }

  excluirMaterial(id) {
    this.db.prepare('DELETE FROM materiais WHERE id = ?').run(id);
    return { success: true };
  }

  // ============ DASHBOARD ============
  getMetricas() {
    const totalClientes = this.db.prepare('SELECT COUNT(*) as total FROM clientes').get().total;
    const orcamentosPendentes = this.db.prepare("SELECT COUNT(*) as total FROM orcamentos WHERE status IN ('rascunho', 'enviado')").get().total;
    const servicosAndamento = this.db.prepare("SELECT COUNT(*) as total FROM servicos WHERE status = 'em_andamento'").get().total;
    const servicosConcluidos = this.db.prepare("SELECT COUNT(*) as total FROM servicos WHERE status = 'concluido'").get().total;

    const faturamento = this.db.prepare(`
      SELECT COALESCE(SUM(
        (SELECT COALESCE(SUM(oi.quantidade * oi.valor_unitario), 0) FROM orcamento_itens oi WHERE oi.orcamento_id = o.id AND oi.comprado_pelo_cliente = 0)
        + o.mao_de_obra - o.desconto
      ), 0) as total
      FROM orcamentos o WHERE o.status = 'aprovado'
    `).get().total;

    const orcamentosPorStatus = this.db.prepare(`
      SELECT status, COUNT(*) as total FROM orcamentos GROUP BY status
    `).all();

    const servicosPorStatus = this.db.prepare(`
      SELECT status, COUNT(*) as total FROM servicos GROUP BY status
    `).all();

    const mesAtual = new Date().toISOString().slice(0, 7);
    const custosMes = this.db.prepare(`
      SELECT COALESCE(SUM(valor), 0) as total FROM custos 
      WHERE strftime('%Y-%m', data) = ?
    `).get(mesAtual).total;

    return {
      totalClientes,
      orcamentosPendentes,
      servicosAndamento,
      servicosConcluidos,
      faturamento,
      custosMes,
      orcamentosPorStatus,
      servicosPorStatus
    };
  }

  getAtividadesRecentes() {
    const orcamentos = this.db.prepare(`
      SELECT o.id, o.titulo as descricao, o.status, o.criado_em, 'orcamento' as tipo, c.nome as cliente_nome
      FROM orcamentos o LEFT JOIN clientes c ON o.cliente_id = c.id
      ORDER BY o.criado_em DESC LIMIT 5
    `).all();

    const servicos = this.db.prepare(`
      SELECT s.id, s.titulo as descricao, s.status, s.criado_em, 'servico' as tipo, c.nome as cliente_nome
      FROM servicos s LEFT JOIN clientes c ON s.cliente_id = c.id
      ORDER BY s.criado_em DESC LIMIT 5
    `).all();

    const clientes = this.db.prepare(`
      SELECT id, nome as descricao, 'novo' as status, criado_em, 'cliente' as tipo, nome as cliente_nome
      FROM clientes ORDER BY criado_em DESC LIMIT 5
    `).all();

    return [...orcamentos, ...servicos, ...clientes]
      .sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em))
      .slice(0, 10);
  }

  getMetricasMensais() {
    const clientesPorMes = this.db.prepare(`
      SELECT strftime('%Y-%m', criado_em) as mes, COUNT(*) as total
      FROM clientes
      WHERE criado_em >= date('now', '-12 months')
      GROUP BY mes
      ORDER BY mes DESC
      LIMIT 12
    `).all();

    const faturamentoPorMes = this.db.prepare(`
      SELECT strftime('%Y-%m', o.criado_em) as mes,
        COALESCE(SUM(
          (SELECT COALESCE(SUM(oi.quantidade * oi.valor_unitario), 0) FROM orcamento_itens oi WHERE oi.orcamento_id = o.id AND oi.comprado_pelo_cliente = 0)
          + o.mao_de_obra - o.desconto
        ), 0) as total
      FROM orcamentos o
      WHERE o.status = 'aprovado'
        AND o.criado_em >= date('now', '-12 months')
      GROUP BY mes
      ORDER BY mes DESC
      LIMIT 12
    `).all();

    const custosPorMes = this.db.prepare(`
      SELECT strftime('%Y-%m', data) as mes,
        COALESCE(SUM(valor), 0) as total
      FROM custos
      WHERE status = 'pago'
        AND data >= date('now', '-12 months')
      GROUP BY mes
      ORDER BY mes DESC
      LIMIT 12
    `).all();

    return { clientesPorMes, faturamentoPorMes, custosPorMes };
  }

  // ============ CUSTOS ============
  listarCustos(filtros = {}) {
    let query = 'SELECT * FROM custos WHERE 1=1';
    const params = [];

    if (filtros.busca) {
      query += ' AND (descricao LIKE ? OR categoria LIKE ? OR observacoes LIKE ?)';
      const term = `%${filtros.busca}%`;
      params.push(term, term, term);
    }
    if (filtros.tipo) {
      query += ' AND tipo = ?';
      params.push(filtros.tipo);
    }
    if (filtros.mes) {
      query += " AND strftime('%Y-%m', data) = ?";
      params.push(filtros.mes);
    }
    if (filtros.categoria) {
      query += ' AND categoria = ?';
      params.push(filtros.categoria);
    }
    if (filtros.status) {
      query += ' AND status = ?';
      params.push(filtros.status);
    }

    query += ' ORDER BY data DESC, criado_em DESC';
    return this.db.prepare(query).all(...params);
  }

  buscarCusto(id) {
    return this.db.prepare('SELECT * FROM custos WHERE id = ?').get(id);
  }

  criarCusto(dados) {
    const stmt = this.db.prepare(`
      INSERT INTO custos (tipo, categoria, descricao, valor, data, observacoes, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const ids = [];
    const parcelas = parseInt(dados.parcelas) || 1;
    const baseDate = new Date(dados.data);
    const baseDescricao = dados.descricao;

    this.db.transaction(() => {
      for (let i = 0; i < parcelas; i++) {
        const currentDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, baseDate.getDate());
        const dataStr = currentDate.toISOString().slice(0, 10);
        const isParcelado = parcelas > 1;
        const finalDesc = isParcelado ? `${baseDescricao} (${i+1}/${parcelas})` : baseDescricao;
        
        const result = stmt.run(
          dados.tipo || 'materiais',
          dados.categoria || 'outros',
          finalDesc,
          dados.valor || 0,
          dataStr,
          dados.observacoes || null,
          dados.status || 'pago'
        );
        ids.push(result.lastInsertRowid);
      }
    })();

    return { ids, ...dados };
  }

  atualizarCusto(id, dados) {
    const stmt = this.db.prepare(`
      UPDATE custos SET tipo=?, categoria=?, descricao=?, valor=?, data=?, observacoes=?, status=?
      WHERE id=?
    `);
    stmt.run(
      dados.tipo,
      dados.categoria,
      dados.descricao,
      dados.valor,
      dados.data,
      dados.observacoes || null,
      dados.status || 'pago',
      id
    );
    return { id, ...dados };
  }

  marcarCustoStatus(id, status) {
    this.db.prepare('UPDATE custos SET status = ? WHERE id = ?').run(status, id);
    return { id, status };
  }

  excluirCusto(id) {
    this.db.prepare('DELETE FROM custos WHERE id = ?').run(id);
    return { success: true };
  }

  // ============ CUSTOS FIXOS (Recorrentes) ============
  listarCustosFixos() {
    return this.db.prepare('SELECT * FROM custos_fixos ORDER BY dia_vencimento ASC').all();
  }

  criarCustoFixo(dados) {
    const stmt = this.db.prepare(`
      INSERT INTO custos_fixos (descricao, valor, dia_vencimento, categoria)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(dados.descricao, dados.valor, dados.dia_vencimento, dados.categoria || 'outros');
    
    // Na hora da criação, checa se precisa gerar pro mês atual
    this.gerarCustosFixosDoMes();
    return { id: result.lastInsertRowid, ...dados };
  }

  atualizarCustoFixo(id, dados) {
    this.db.prepare(`
      UPDATE custos_fixos SET descricao=?, valor=?, dia_vencimento=?, categoria=?
      WHERE id=?
    `).run(dados.descricao, dados.valor, dados.dia_vencimento, dados.categoria, id);
    return { id, ...dados };
  }

  excluirCustoFixo(id) {
    this.db.prepare('DELETE FROM custos_fixos WHERE id = ?').run(id);
    return { success: true };
  }

  gerarCustosFixosDoMes() {
    const todosFixos = this.listarCustosFixos();
    if (todosFixos.length === 0) return;

    const authMonth = new Date().toISOString().slice(0, 7); // ex: 2026-03
    const insertStmt = this.db.prepare(`
      INSERT INTO custos (tipo, categoria, descricao, valor, data, status, observacoes)
      VALUES ('despesas', ?, ?, ?, ?, 'previsto', 'Lançamento Automático - Custo Fixo')
    `);

    // Checa se já existe o lançamento de cada custo fixo neste mês (baseado na descrição exata)
    const getExistente = this.db.prepare(`
      SELECT id FROM custos WHERE descricao = ? AND strftime('%Y-%m', data) = ?
    `);

    this.db.transaction(() => {
      for (const fixo of todosFixos) {
        const jaFoiLancado = getExistente.get(fixo.descricao, authMonth);
        if (!jaFoiLancado) {
          const diaFormatado = fixo.dia_vencimento.toString().padStart(2, '0');
          // constroi a data pro mês atual, padronizado (ano-mes-dia)
          let dataLancamento = `${authMonth}-${diaFormatado}`;
          
          insertStmt.run(
            fixo.categoria,
            fixo.descricao,
            fixo.valor,
            dataLancamento
          );
        }
      }
    })();
  }

  // ============ RELATÓRIO ============
  getRelatorioCustos() {
    // Summary per month for last 12 months
    const porMes = this.db.prepare(`
      SELECT strftime('%Y-%m', data) as mes,
        tipo,
        COUNT(*) as qtd,
        SUM(valor) as total
      FROM custos
      WHERE data >= date('now', '-12 months')
      GROUP BY mes, tipo
      ORDER BY mes DESC
    `).all();

    // Current month totals
    const mesAtual = new Date().toISOString().slice(0, 7);
    const resumoMesAtual = this.db.prepare(`
      SELECT tipo, SUM(valor) as total, COUNT(*) as qtd
      FROM custos
      WHERE strftime('%Y-%m', data) = ?
      GROUP BY tipo
    `).all(mesAtual);

    // Top categories current month
    const topCategorias = this.db.prepare(`
      SELECT categoria, tipo, SUM(valor) as total, COUNT(*) as qtd
      FROM custos
      WHERE strftime('%Y-%m', data) = ? AND status = 'pago'
      GROUP BY categoria, tipo
      ORDER BY total DESC
      LIMIT 10
    `).all(mesAtual);

    // Totais de previstos no mês
    const previstosMesAtual = this.db.prepare(`
      SELECT SUM(valor) as total, COUNT(*) as qtd
      FROM custos
      WHERE strftime('%Y-%m', data) = ? AND status = 'previsto'
    `).get(mesAtual);

    // Faturamento do mês atual (orçamentos aprovados)
    const faturamentoMes = this.db.prepare(`
      SELECT COALESCE(SUM(
        (SELECT COALESCE(SUM(oi.quantidade * oi.valor_unitario), 0) FROM orcamento_itens oi WHERE oi.orcamento_id = o.id AND oi.comprado_pelo_cliente = 0)
        + o.mao_de_obra - o.desconto
      ), 0) as total
      FROM orcamentos o
      WHERE o.status = 'aprovado' AND strftime('%Y-%m', o.criado_em) = ?
    `).get(mesAtual);

    return {
      porMes,
      resumoMesAtual,
      topCategorias,
      previstosMesAtual: previstosMesAtual || { total: 0, qtd: 0 },
      faturamentoMes: faturamentoMes?.total || 0,
      mesAtual
    };
  }

  // ============ EVENTOS (AGENDA) ============
  listarEventos(filtros = {}) {
    let query = 'SELECT * FROM eventos WHERE 1=1';
    const params = [];

    if (filtros.inicio && filtros.fim) {
      query += ' AND (data_inicio BETWEEN ? AND ? OR data_fim BETWEEN ? AND ?)';
      params.push(filtros.inicio, filtros.fim, filtros.inicio, filtros.fim);
    }
    
    query += ' ORDER BY data_inicio ASC';
    return this.db.prepare(query).all(...params);
  }

  getEventosProximos(minutos = 30) {
    // Busca eventos que começam nos próximos X minutos e ainda não foram notificados
    return this.db.prepare(`
      SELECT * FROM eventos 
      WHERE notificado = 0 
      AND data_inicio > datetime('now', 'localtime')
      AND data_inicio <= datetime('now', 'localtime', '+' || ? || ' minutes')
    `).all(minutos);
  }

  marcarEventoNotificado(id) {
    this.db.prepare('UPDATE eventos SET notificado = 1 WHERE id = ?').run(id);
  }

  criarEvento(dados) {
    const stmt = this.db.prepare(`
      INSERT INTO eventos (titulo, descricao, data_inicio, data_fim, cor, google_event_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      dados.titulo,
      dados.descricao,
      dados.data_inicio,
      dados.data_fim,
      dados.cor || '#2563EB',
      dados.google_event_id || null
    );
    return { id: result.lastInsertRowid, ...dados };
  }

  atualizarEvento(id, dados) {
    const stmt = this.db.prepare(`
      UPDATE eventos SET titulo=?, descricao=?, data_inicio=?, data_fim=?, cor=?, notificado=?, google_event_id=?
      WHERE id=?
    `);
    stmt.run(
      dados.titulo,
      dados.descricao,
      dados.data_inicio,
      dados.data_fim,
      dados.cor,
      dados.notificado || 0,
      dados.google_event_id,
      id
    );
    return { id, ...dados };
  }

  excluirEvento(id) {
    this.db.prepare('DELETE FROM eventos WHERE id = ?').run(id);
    return { success: true };
  }

  // ============ METAS ============
  listarMetas() {
    return this.db.prepare('SELECT * FROM metas ORDER BY status DESC, criado_em DESC').all();
  }

  criarMeta(dados) {
    const stmt = this.db.prepare(`
      INSERT INTO metas (titulo, valor_alvo, status, icone)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(
      dados.titulo,
      dados.valor_alvo,
      dados.status || 'pendente',
      dados.icone || 'target'
    );
    return { id: result.lastInsertRowid, ...dados };
  }

  atualizarMeta(id, dados) {
    const stmt = this.db.prepare(`
      UPDATE metas SET titulo=?, valor_alvo=?, status=?, icone=?
      WHERE id=?
    `);
    stmt.run(
      dados.titulo,
      dados.valor_alvo,
      dados.status,
      dados.icone || 'target',
      id
    );
    return { id, ...dados };
  }

  excluirMeta(id) {
    this.db.prepare('DELETE FROM metas WHERE id = ?').run(id);
    return { success: true };
  }

  getSaldoLivre() {
    // Conta TODO o faturamento aprovado até hoje
    const fat = this.db.prepare(`
      SELECT COALESCE(SUM(
        (SELECT COALESCE(SUM(oi.quantidade * oi.valor_unitario), 0) FROM orcamento_itens oi WHERE oi.orcamento_id = o.id)
        + o.mao_de_obra - o.desconto
      ), 0) as total
      FROM orcamentos o
      WHERE o.status = 'aprovado'
    `).get();

    // Conta TODOS os custos já registrados
    const custos = this.db.prepare('SELECT COALESCE(SUM(valor), 0) as total FROM custos').get();

    // Conta TODAS as metas já concluídas (compradas)
    const metas_compradas = this.db.prepare(`
      SELECT COALESCE(SUM(valor_alvo), 0) as total FROM metas WHERE status = 'concluido'
    `).get();

    const saldo = (fat?.total || 0) - (custos?.total || 0) - (metas_compradas?.total || 0);

    return { 
      saldo, 
      faturamento: fat?.total || 0, 
      custos: custos?.total || 0,
      metas_compradas: metas_compradas?.total || 0
    };
  }

  getHistoricoMensalPagos() {
    return this.db.prepare(`
      SELECT 
        strftime('%Y-%m', data) as mes,
        tipo,
        SUM(valor) as total,
        COUNT(*) as qtd
      FROM custos
      WHERE status = 'pago'
      GROUP BY mes, tipo
      ORDER BY mes DESC
    `).all();
  }
}

module.exports = Database;
