const SQLite = require('better-sqlite3');
const path = require('path');

class Database {
  constructor(userDataPath) {
    const dbPath = path.join(userDataPath, 'electripro.db');
    this.db = new SQLite(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.init();
  }

  init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS clientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
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
        titulo TEXT NOT NULL,
        descricao TEXT,
        status TEXT DEFAULT 'rascunho',
        mao_de_obra REAL DEFAULT 0,
        desconto REAL DEFAULT 0,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
        atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS orcamento_itens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        orcamento_id INTEGER NOT NULL,
        descricao TEXT NOT NULL,
        quantidade REAL DEFAULT 1,
        valor_unitario REAL DEFAULT 0,
        categoria TEXT DEFAULT 'material',
        FOREIGN KEY (orcamento_id) REFERENCES orcamentos(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS servicos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        orcamento_id INTEGER,
        cliente_id INTEGER NOT NULL,
        titulo TEXT NOT NULL,
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
        FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS materiais (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        categoria TEXT DEFAULT 'geral',
        unidade TEXT DEFAULT 'un',
        valor_referencia REAL DEFAULT 0,
        descricao TEXT,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
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
        (SELECT COALESCE(SUM(quantidade * valor_unitario), 0) FROM orcamento_itens WHERE orcamento_id = o.id) as total_itens
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
      INSERT INTO orcamento_itens (orcamento_id, descricao, quantidade, valor_unitario, categoria)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(dados.orcamento_id, dados.descricao, dados.quantidade || 1, dados.valor_unitario || 0, dados.categoria || 'material');
    return { id: result.lastInsertRowid };
  }

  atualizarItemOrcamento(id, dados) {
    const stmt = this.db.prepare(`
      UPDATE orcamento_itens SET descricao=?, quantidade=?, valor_unitario=?, categoria=?
      WHERE id=?
    `);
    stmt.run(dados.descricao, dados.quantidade, dados.valor_unitario, dados.categoria, id);
    return { id, ...dados };
  }

  excluirItemOrcamento(id) {
    this.db.prepare('DELETE FROM orcamento_itens WHERE id = ?').run(id);
    return { success: true };
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
      INSERT INTO servicos (orcamento_id, cliente_id, titulo, descricao, status, prioridade, data_inicio, data_fim, notas)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      dados.orcamento_id || null, dados.cliente_id, dados.titulo, dados.descricao,
      dados.status || 'pendente', dados.prioridade || 'normal',
      dados.data_inicio || null, dados.data_fim || null, dados.notas || null
    );
    return { id: result.lastInsertRowid };
  }

  atualizarServico(id, dados) {
    const stmt = this.db.prepare(`
      UPDATE servicos SET orcamento_id=?, cliente_id=?, titulo=?, descricao=?, prioridade=?,
        data_inicio=?, data_fim=?, notas=?, atualizado_em=CURRENT_TIMESTAMP
      WHERE id=?
    `);
    stmt.run(
      dados.orcamento_id || null, dados.cliente_id, dados.titulo, dados.descricao,
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
    let query = 'SELECT * FROM materiais WHERE 1=1';
    const params = [];

    if (filtros.busca) {
      query += ' AND (nome LIKE ? OR descricao LIKE ?)';
      const term = `%${filtros.busca}%`;
      params.push(term, term);
    }
    if (filtros.categoria) {
      query += ' AND categoria = ?';
      params.push(filtros.categoria);
    }

    query += ' ORDER BY nome ASC';
    return this.db.prepare(query).all(...params);
  }

  buscarMaterial(id) {
    return this.db.prepare('SELECT * FROM materiais WHERE id = ?').get(id);
  }

  criarMaterial(dados) {
    const stmt = this.db.prepare(`
      INSERT INTO materiais (nome, categoria, unidade, valor_referencia, descricao)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(dados.nome, dados.categoria || 'geral', dados.unidade || 'un', dados.valor_referencia || 0, dados.descricao || '');
    return { id: result.lastInsertRowid, ...dados };
  }

  atualizarMaterial(id, dados) {
    const stmt = this.db.prepare(`
      UPDATE materiais SET nome=?, categoria=?, unidade=?, valor_referencia=?, descricao=?
      WHERE id=?
    `);
    stmt.run(dados.nome, dados.categoria, dados.unidade, dados.valor_referencia, dados.descricao, id);
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
        (SELECT COALESCE(SUM(oi.quantidade * oi.valor_unitario), 0) FROM orcamento_itens oi WHERE oi.orcamento_id = o.id)
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

    return {
      totalClientes,
      orcamentosPendentes,
      servicosAndamento,
      servicosConcluidos,
      faturamento,
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
}

module.exports = Database;
