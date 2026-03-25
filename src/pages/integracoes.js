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

      // Load orçamentos for selector if exporting orçamentos
      let orcamentosOptions = '';
      if (tipo === 'orcamentos') {
        const orcamentos = await electronAPI.orcamentos.listar({});
        orcamentosOptions = `
          <div class="form-group" id="container-filtro-orcamento">
            <label class="form-label">Selecionar Orçamento (Opcional)</label>
            <select class="form-select" id="export-orcamento-id">
              <option value="">Todos os Orçamentos</option>
              ${orcamentos.map(o => {
                const total = (o.total_itens || 0) + (o.mao_de_obra || 0) - (o.desconto || 0);
                return `<option value="${o.id}">${o.titulo} — ${o.cliente_nome} (${Helpers.formatCurrency(total)})</option>`;
              }).join('')}
            </select>
          </div>
        `;
      }

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

          ${orcamentosOptions}
          
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
        const orcamentoIdEl = document.getElementById('export-orcamento-id');
        const orcamentoId = orcamentoIdEl ? orcamentoIdEl.value : '';
        
        if (orcamentoId) {
          // Export specific orçamento as full document
          const orc = await electronAPI.orcamentos.buscar(parseInt(orcamentoId));
          if (!orc) {
            Toast.warning('Orçamento não encontrado.');
            return;
          }

          const totalItens = (orc.itens || [])
            .filter(i => !i.comprado_pelo_cliente)
            .reduce((s, i) => s + (i.quantidade * i.valor_unitario), 0);
          const totalGeral = totalItens + (orc.mao_de_obra || 0) - (orc.desconto || 0);

          if (formato === 'pdf') {
            this._gerarPDFOrcamento(orc, totalItens, totalGeral);
            Modal.close();
            return;
          }

          // CSV: export items table
          data = orc.itens || [];
          title = `Orcamento_${orc.titulo}`;
          headers = ['Item', 'Detalhes', 'Qtd', 'Preço Unit.', 'Custo Unit.', 'Total', 'Fornecido pelo Cliente'];
          rows = (orc.itens || []).map(i => [
            i.descricao || 'Sem descrição',
            i.detalhes || '',
            i.quantidade,
            Helpers.formatCurrency(i.valor_unitario),
            Helpers.formatCurrency(i.preco_custo_unitario || 0),
            Helpers.formatCurrency(i.quantidade * i.valor_unitario),
            i.comprado_pelo_cliente ? 'Sim' : 'Não'
          ]);
          // Add summary rows
          rows.push(['', '', '', '', '', '', '']);
          rows.push(['', '', '', '', 'Subtotal Materiais', Helpers.formatCurrency(totalItens), '']);
          rows.push(['', '', '', '', 'Mão de Obra', Helpers.formatCurrency(orc.mao_de_obra || 0), '']);
          rows.push(['', '', '', '', 'Desconto', `- ${Helpers.formatCurrency(orc.desconto || 0)}`, '']);
          rows.push(['', '', '', '', 'TOTAL GERAL', Helpers.formatCurrency(totalGeral), '']);

          if (data.length === 0) data = [orc]; // ensure we don't hit empty check
        } else {
          const lista = await electronAPI.orcamentos.listar(filtros);
          data = lista.filter(dateFilter);

          headers = ['Título', 'Cliente', 'Status', 'Mão de Obra', 'Desconto', 'Total', 'Criado em'];
          rows = data.map(o => {
            const total = (o.total_itens || 0) + (o.mao_de_obra || 0) - (o.desconto || 0);
            return [
              o.titulo, o.cliente_nome, Helpers.statusLabel(o.status),
              Helpers.formatCurrency(o.mao_de_obra), Helpers.formatCurrency(o.desconto),
              Helpers.formatCurrency(total), Helpers.formatDate(o.criado_em)
            ];
          });
        }
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

  _gerarPDFOrcamento(orc, totalItens, totalGeral) {
    Toast.success('Gerando PDF do orçamento...');
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    setTimeout(() => {
      const doc = iframe.contentWindow.document;

      const itensHtml = (orc.itens || []).map((item, idx) => {
        const subtotal = item.quantidade * item.valor_unitario;
        const isCliente = item.comprado_pelo_cliente;
        return `
          <tr style="${isCliente ? 'background: #f9fafb; color: #9ca3af;' : ''}">
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 12px;">${idx + 1}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">
              <div style="font-weight: 600; font-size: 13px; ${isCliente ? 'text-decoration: line-through;' : ''}">${item.descricao || 'Sem descrição'}</div>
              ${item.detalhes ? `<div style="font-size: 11px; color: #6b7280; margin-top: 2px;">${item.detalhes}</div>` : ''}
              ${isCliente ? '<div style="font-size: 10px; color: #f59e0b; margin-top: 2px;">⚠ Fornecido pelo cliente</div>' : ''}
            </td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 13px;">${item.quantidade}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 13px;">${Helpers.formatCurrency(item.valor_unitario)}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600; font-size: 13px; ${isCliente ? 'text-decoration: line-through;' : ''}">${Helpers.formatCurrency(subtotal)}</td>
          </tr>
        `;
      }).join('');

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Orçamento - ${orc.titulo}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', sans-serif; padding: 30px 40px; color: #1f2937; line-height: 1.5; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #111; }
            .brand { font-size: 22px; font-weight: 800; color: #111; }
            .brand-sub { font-size: 10px; color: #9ca3af; text-transform: uppercase; letter-spacing: 2px; }
            .doc-info { text-align: right; font-size: 12px; color: #6b7280; }
            .doc-title { font-size: 20px; font-weight: 700; margin-bottom: 20px; color: #111; }
            .info-grid { display: flex; gap: 40px; margin-bottom: 24px; }
            .info-block label { font-size: 10px; text-transform: uppercase; color: #9ca3af; letter-spacing: 1px; font-weight: 600; display: block; margin-bottom: 4px; }
            .info-block span { font-size: 13px; font-weight: 600; color: #111; }
            .description { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px 16px; margin-bottom: 24px; font-size: 13px; color: #4b5563; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
            thead tr { background: #f3f4f6; }
            th { padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb; }
            th.right { text-align: right; }
            th.center { text-align: center; }
            .summary { margin-left: auto; width: 280px; }
            .summary-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: #4b5563; }
            .summary-row.total { border-top: 2px solid #111; margin-top: 8px; padding-top: 10px; font-size: 16px; font-weight: 800; color: #111; }
            .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; }
            @media print { body { padding: 15px 25px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="brand">Albring's</div>
              <div class="brand-sub">Serviços Elétricos</div>
            </div>
            <div class="doc-info">
              <div>Orçamento #${orc.id}</div>
              <div>${Helpers.formatDate(orc.criado_em)}</div>
              <div style="margin-top: 4px; font-weight: 600; color: #111;">${Helpers.statusLabel(orc.status).toUpperCase()}</div>
            </div>
          </div>

          <div class="doc-title">${orc.titulo}</div>

          <div class="info-grid">
            <div class="info-block">
              <label>Cliente</label>
              <span>${orc.cliente_nome}</span>
            </div>
            ${orc.cliente_telefone ? `
              <div class="info-block">
                <label>Telefone</label>
                <span>${orc.cliente_telefone}</span>
              </div>
            ` : ''}
            ${orc.cliente_email ? `
              <div class="info-block">
                <label>Email</label>
                <span>${orc.cliente_email}</span>
              </div>
            ` : ''}
            <div class="info-block">
              <label>Tipo</label>
              <span>${orc.tipo === 'inicial' ? 'Orçamento Inicial' : 'Adicional de Execução'}</span>
            </div>
          </div>

          ${orc.descricao ? `<div class="description">${orc.descricao}</div>` : ''}

          <table>
            <thead>
              <tr>
                <th style="width: 30px;">#</th>
                <th>Descrição</th>
                <th class="center" style="width: 60px;">Qtd</th>
                <th class="right" style="width: 100px;">Preço Unit.</th>
                <th class="right" style="width: 100px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itensHtml || '<tr><td colspan="5" style="padding: 20px; text-align: center; color: #9ca3af;">Nenhum item adicionado</td></tr>'}
            </tbody>
          </table>

          <div class="summary">
            <div class="summary-row">
              <span>Subtotal Materiais</span>
              <span>${Helpers.formatCurrency(totalItens)}</span>
            </div>
            <div class="summary-row">
              <span>Mão de Obra</span>
              <span>${Helpers.formatCurrency(orc.mao_de_obra || 0)}</span>
            </div>
            ${(orc.desconto || 0) > 0 ? `
              <div class="summary-row" style="color: #dc2626;">
                <span>Desconto</span>
                <span>- ${Helpers.formatCurrency(orc.desconto)}</span>
              </div>
            ` : ''}
            <div class="summary-row total">
              <span>Total Geral</span>
              <span>${Helpers.formatCurrency(totalGeral)}</span>
            </div>
          </div>

          <div class="footer">
            Gerado em ${new Date().toLocaleString('pt-BR')} · Albring's LTDA
          </div>
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
