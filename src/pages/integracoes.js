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
          <button class="btn btn-primary" onclick="IntegracoesPage.abrirModalExportacao('clientes')">
            ${Helpers.icons.users} Exportar Clientes
          </button>
          <button class="btn btn-secondary" onclick="IntegracoesPage.abrirModalExportacao('orcamentos')">
            ${Helpers.icons.fileText} Exportar Orçamentos
          </button>
          <button class="btn btn-secondary" onclick="IntegracoesPage.abrirModalExportacao('servicos')">
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

  async abrirModalExportacao(tipo) {
    try {
      const clientes = await electronAPI.clientes.listar({});
      let titulo = '';
      if (tipo === 'orcamentos') titulo = 'Orçamentos';
      else if (tipo === 'servicos') titulo = 'Serviços';
      else titulo = 'Clientes';

      Modal.open(`
        <div class="modal-header">
          <h3>📊 Exportar ${titulo}</h3>
          <button class="modal-close" onclick="Modal.close()">${Helpers.icons.close}</button>
        </div>
        <div class="modal-body">
          <div class="form-group" id="container-filtro-cliente">
            <label class="form-label">Filtrar por Cliente (Opcional)</label>
            <select class="form-select" id="export-cliente-id">
              <option value="">Todos os Clientes</option>
              ${clientes.map(c => `<option value="${c.id}">${c.nome}</option>`).join('')}
            </select>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md); margin-top: var(--spacing-md);">
            <div class="form-group">
              <label class="form-label">Data Inicial (Opcional)</label>
              <input type="date" class="form-input" id="export-data-inicio">
            </div>
            <div class="form-group">
              <label class="form-label">Data Final (Opcional)</label>
              <input type="date" class="form-input" id="export-data-fim">
            </div>
          </div>
          <p style="font-size: var(--font-size-sm); color: var(--text-secondary); margin-top: 8px;">
            Deixe vazio para exportar todos os registros (ou sem restrição de data).
          </p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="IntegracoesPage.executarExportacao('${tipo}', 'csv')">
            📄 CSV
          </button>
          <button class="btn btn-primary" onclick="IntegracoesPage.executarExportacao('${tipo}', 'pdf')">
            📑 PDF
          </button>
        </div>
      `);
      
      if (tipo === 'clientes') {
        document.getElementById('container-filtro-cliente').style.display = 'none';
      }
    } catch (err) {
      Toast.error('Erro ao abrir exportação: ' + err.message);
    }
  },

  async executarExportacao(tipo, formato) {
    const clienteId = document.getElementById('export-cliente-id').value;
    const dataInicio = document.getElementById('export-data-inicio').value;
    const dataFim = document.getElementById('export-data-fim').value;

    let filtros = {};
    if (clienteId) filtros.cliente_id = parseInt(clienteId);

    try {
      let data = [];
      let headers = [];
      let rows = [];
      let title = '';
      
      const inicio = dataInicio ? new Date(dataInicio + 'T00:00:00') : null;
      const fim = dataFim ? new Date(dataFim + 'T23:59:59') : null;

      const dateFilter = (item) => {
        const itemDateStr = item.criado_em || item.data_inicio || item.data;
        if (!itemDateStr) return true;
        
        const itemDate = new Date(itemDateStr);
        if (inicio && itemDate < inicio) return false;
        if (fim && itemDate > fim) return false;
        return true;
      };

      if (tipo === 'clientes') {
        title = 'Clientes';
        const lista = await electronAPI.clientes.listar({});
        data = lista.filter(dateFilter);
        
        headers = ['Nome', 'Telefone', 'Email', 'Endereço', 'CPF/CNPJ', 'Tipo', 'Cadastrado em'];
        rows = data.map(c => [
          c.nome, c.telefone || '', c.email || '', c.endereco || '',
          c.cpf_cnpj || '', Helpers.tipoLabel(c.tipo), Helpers.formatDate(c.criado_em)
        ]);
      } else if (tipo === 'orcamentos') {
        title = 'Orçamentos';
        const lista = await electronAPI.orcamentos.listar(filtros);
        data = lista.filter(dateFilter);

        headers = ['Título', 'Cliente', 'Status', 'Mão de Obra', 'Desconto', 'Total', 'Criado em'];
        rows = data.map(o => {
          const total = (o.total_itens || 0) + (o.mao_de_obra || 0) - (o.desconto || 0);
          return [
            o.titulo, o.cliente_nome, Helpers.statusLabel(o.status),
            Helpers.formatCurrency ? Helpers.formatCurrency(o.mao_de_obra) : o.mao_de_obra,
            Helpers.formatCurrency ? Helpers.formatCurrency(o.desconto) : o.desconto,
            Helpers.formatCurrency ? Helpers.formatCurrency(total) : total,
            Helpers.formatDate(o.criado_em)
          ];
        });
      } else if (tipo === 'servicos') {
        title = 'Serviços';
        const lista = await electronAPI.servicos.listar(filtros);
        data = lista.filter(dateFilter);

        headers = ['Título', 'Cliente', 'Status', 'Prioridade', 'Início', 'Prazo', 'Criado em'];
        rows = data.map(s => [
          s.titulo, s.cliente_nome, Helpers.statusLabel(s.status),
          Helpers.priorityLabel(s.prioridade), Helpers.formatDate(s.data_inicio),
          Helpers.formatDate(s.data_fim), Helpers.formatDate(s.criado_em)
        ]);
      }

      if (data.length === 0) {
        Toast.warning('Nenhum dado encontrado com os filtros selecionados.');
        return;
      }

      if (formato === 'csv') {
        this._gerarCSV(headers, rows, title);
      } else if (formato === 'pdf') {
        this._gerarPDF(headers, rows, title);
      }
      
      Modal.close();
    } catch (err) {
      Toast.error('Erro ao gerar exportação: ' + err.message);
    }
  },

  _gerarCSV(headers, rows, nome) {
    const bom = '\uFEFF'; 
    const csv = bom + [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nome}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    Toast.success(`${nome} exportado(s) com sucesso em CSV!`);
  },

  _gerarPDF(headers, rows, nome) {
    Toast.success('Gerando PDF e abrindo impressão...');
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
    
    setTimeout(() => {
      const doc = iframe.contentWindow.document;
      
      let tableHtml = `
        <table style="width: 100%; border-collapse: collapse; font-family: sans-serif; font-size: 12px;">
          <thead>
            <tr style="background-color: #f3f4f6; text-align: left;">
              ${headers.map(h => `<th style="padding: 8px; border: 1px solid #e5e7eb;">${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows.map(row => `
              <tr>
                ${row.map(cell => `<td style="padding: 8px; border: 1px solid #e5e7eb;">${cell || '-'}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Exportação ${nome}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #1f2937; }
            h1 { font-size: 18px; margin-bottom: 20px; font-weight: bold; }
            .header-info { margin-bottom: 20px; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <h1>Relatório de ${nome}</h1>
          <div class="header-info">Gerado em: ${new Date().toLocaleString()}</div>
          ${tableHtml}
        </body>
        </html>
      `;

      doc.open();
      doc.write(html);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 500);
    }, 100);
  }
};
