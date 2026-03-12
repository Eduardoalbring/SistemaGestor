// ============ Integrações Page ============

const IntegracoesPage = {
  async render() {
    const content = document.getElementById('main-content');
    content.innerHTML = `<div class="page-content fade-in">
      <div class="page-header">
        <div>
          <h2>${Helpers.icons.externalLink} Integrações</h2>
          <p class="page-subtitle">Conecte o app com ferramentas externas</p>
        </div>
      </div>

      <div class="integrations-grid">

        <!-- Google Calendar -->
        <div class="integration-card">
          <div class="integration-icon">📅</div>
          <h3>Google Calendar</h3>
          <p>Abra o Google Calendar para agendar suas visitas, instalações e compromissos com clientes.</p>
          <button class="btn btn-primary" onclick="IntegracoesPage.openCalendar()">
            ${Helpers.icons.externalLink} Abrir Google Calendar
          </button>
          <button class="btn btn-secondary" onclick="IntegracoesPage.criarEventoServico()">
            ${Helpers.icons.plus} Criar Evento de Serviço
          </button>
        </div>

        <!-- Google Sheets -->
        <div class="integration-card">
          <div class="integration-icon">📊</div>
          <h3>Google Sheets</h3>
          <p>Exporte seus dados de clientes, orçamentos ou serviços para uma planilha Google.</p>
          <button class="btn btn-primary" onclick="IntegracoesPage.exportarClientes()">
            ${Helpers.icons.users} Exportar Clientes
          </button>
          <button class="btn btn-secondary" onclick="IntegracoesPage.exportarOrcamentos()">
            ${Helpers.icons.fileText} Exportar Orçamentos
          </button>
          <button class="btn btn-secondary" onclick="IntegracoesPage.exportarServicos()">
            ${Helpers.icons.wrench} Exportar Serviços
          </button>
        </div>

      </div>

      <div class="card" style="margin-top: var(--spacing-lg); padding: var(--spacing-lg);">
        <div class="card-header">
          <span class="card-title">${Helpers.icons.info} Como funciona</span>
        </div>
        <div style="margin-top: var(--spacing-md); display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md);">
          <div>
            <h4 style="font-size: var(--font-size-sm); font-weight: 600; margin-bottom: 6px;">📅 Google Calendar</h4>
            <p style="font-size: var(--font-size-sm); color: var(--text-secondary); line-height: 1.6;">
              Clique em "Abrir Google Calendar" para abrir no navegador e gerenciar sua agenda.<br><br>
              "Criar Evento de Serviço" permite selecionar um serviço em andamento e criar um link de evento pré-preenchido para você salvar no Calendar.
            </p>
          </div>
          <div>
            <h4 style="font-size: var(--font-size-sm); font-weight: 600; margin-bottom: 6px;">📊 Google Sheets</h4>
            <p style="font-size: var(--font-size-sm); color: var(--text-secondary); line-height: 1.6;">
              Exporte dados como CSV e abra diretamente no Google Sheets.<br><br>
              Os dados são copiados para a área de transferência — basta colar em uma planilha nova no Google Sheets.
            </p>
          </div>
        </div>
      </div>
    </div>`;
  },

  openCalendar() {
    electronAPI.openExternal('https://calendar.google.com');
  },

  async criarEventoServico() {
    try {
      const servicos = await electronAPI.servicos.listar({ status: 'em_andamento' });
      if (servicos.length === 0) {
        Toast.warning('Nenhum serviço em andamento encontrado');
        return;
      }

      Modal.open(`
        <div class="modal-header">
          <h3>📅 Criar Evento no Calendar</h3>
          <button class="modal-close" onclick="Modal.close()">${Helpers.icons.close}</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Selecione o Serviço</label>
            <select class="form-select" id="cal-servico-id">
              ${servicos.map(s => `<option value="${s.id}" data-titulo="${s.titulo}" data-cliente="${s.cliente_nome}">${s.titulo} — ${s.cliente_nome}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Data e Hora do Evento</label>
            <input type="datetime-local" class="form-input" id="cal-data">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
          <button class="btn btn-primary" onclick="IntegracoesPage._abrirNoCalendar()">
            ${Helpers.icons.externalLink} Criar no Google Calendar
          </button>
        </div>
      `);

      // Set default datetime to now
      const now = new Date();
      now.setMinutes(0, 0, 0);
      document.getElementById('cal-data').value = now.toISOString().slice(0, 16);
    } catch (err) {
      Toast.error('Erro ao carregar serviços');
    }
  },

  _abrirNoCalendar() {
    const select = document.getElementById('cal-servico-id');
    const option = select.selectedOptions[0];
    const titulo = option.dataset.titulo;
    const cliente = option.dataset.cliente;
    const dataStr = document.getElementById('cal-data').value;

    if (!dataStr) return Toast.warning('Selecione uma data e hora');

    const start = new Date(dataStr);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000); // +2h

    const fmt = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const text = encodeURIComponent(`${titulo} — ${cliente}`);
    const dates = `${fmt(start)}/${fmt(end)}`;
    const details = encodeURIComponent(`Serviço: ${titulo}\nCliente: ${cliente}`);

    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}`;
    Modal.close();
    electronAPI.openExternal(url);
    Toast.success('Abrindo Google Calendar no navegador...');
  },

  async exportarClientes() {
    try {
      const clientes = await electronAPI.clientes.listar({});
      const headers = ['Nome', 'Telefone', 'Email', 'Endereço', 'CPF/CNPJ', 'Tipo', 'Cadastrado em'];
      const rows = clientes.map(c => [
        c.nome, c.telefone || '', c.email || '', c.endereco || '',
        c.cpf_cnpj || '', Helpers.tipoLabel(c.tipo), Helpers.formatDate(c.criado_em)
      ]);
      this._copiarCSV(headers, rows, 'Clientes');
    } catch (err) {
      Toast.error('Erro ao exportar clientes');
    }
  },

  async exportarOrcamentos() {
    try {
      const orcamentos = await electronAPI.orcamentos.listar({});
      const headers = ['Título', 'Cliente', 'Status', 'Mão de Obra', 'Desconto', 'Total', 'Criado em'];
      const rows = orcamentos.map(o => {
        const total = (o.total_itens || 0) + (o.mao_de_obra || 0) - (o.desconto || 0);
        return [
          o.titulo, o.cliente_nome, Helpers.statusLabel(o.status),
          o.mao_de_obra, o.desconto, total, Helpers.formatDate(o.criado_em)
        ];
      });
      this._copiarCSV(headers, rows, 'Orçamentos');
    } catch (err) {
      Toast.error('Erro ao exportar orçamentos');
    }
  },

  async exportarServicos() {
    try {
      const servicos = await electronAPI.servicos.listar({});
      const headers = ['Título', 'Cliente', 'Status', 'Prioridade', 'Início', 'Prazo', 'Criado em'];
      const rows = servicos.map(s => [
        s.titulo, s.cliente_nome, Helpers.statusLabel(s.status),
        Helpers.priorityLabel(s.prioridade), Helpers.formatDate(s.data_inicio),
        Helpers.formatDate(s.data_fim), Helpers.formatDate(s.criado_em)
      ]);
      this._copiarCSV(headers, rows, 'Serviços');
    } catch (err) {
      Toast.error('Erro ao exportar serviços');
    }
  },

  _copiarCSV(headers, rows, nome) {
    const bom = '\uFEFF'; // UTF-8 BOM for proper encoding in Excel/Sheets
    const csv = bom + [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    // Use clipboard API
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nome}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    Toast.success(`${nome} exportados! Abra o arquivo .csv e importe no Google Sheets.`);
  }
};
