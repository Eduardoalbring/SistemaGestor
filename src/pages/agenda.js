// ============ Agenda Page ============

const AgendaPage = {
  calendar: null,
  
  async render() {
    const content = document.getElementById('main-content');
    content.innerHTML = `<div class="page-content fade-in" style="height: 100%; display: flex; flex-direction: column;">
      <div class="page-header" style="margin-bottom: var(--spacing-md);">
        <div>
          <h2>📅 Agenda & Calendário</h2>
          <p class="page-subtitle">Gerencie seus compromissos, visitas e instalações</p>
        </div>
        <div class="header-actions" style="display: flex; gap: var(--spacing-sm); align-items: center;">
          <div id="google-sync-status"></div>
          <button class="btn btn-primary" onclick="AgendaPage.openForm()">
            ${Helpers.icons.plus} Novo Evento
          </button>
        </div>
      </div>
      
      <div class="card" style="flex: 1; padding: var(--spacing-sm); display: flex; flex-direction: column; min-height: 600px;">
        <div id="calendar-el" style="flex: 1;"></div>
      </div>
    </div>`;

    this.checkGoogleStatus();
    // Atraso curto para garantir que o DOM renderizou a altura corretamente antes do FullCalendar calcular
    setTimeout(() => {
      this.initCalendar();
    }, 50);
  },

  async checkGoogleStatus() {
    try {
      const isAuth = await electronAPI.google.isAuthenticated();
      const statusDiv = document.getElementById('google-sync-status');
      
      if (isAuth) {
        statusDiv.innerHTML = `
          <button class="btn btn-secondary" style="color: var(--color-success); border-color: var(--color-success);" onclick="AgendaPage.logoutGoogle()" title="Desconectar do Google">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg> Google Sincronizado
          </button>
        `;
      } else {
        statusDiv.innerHTML = `
          <button class="btn btn-secondary" onclick="AgendaPage.loginGoogle()" title="Sincronizar eventos com a nuvem">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6"/><path d="m21 3-9 9"/><path d="M15 3h6v6"/></svg> Sincronizar Google
          </button>
        `;
      }
    } catch(err) {
      console.log('API do Google não disponível', err);
    }
  },

  async loginGoogle() {
    Toast.info('Aguardando Login no Navegador...');
    const result = await electronAPI.google.login();
    if (result) {
      Toast.success('Google Agenda conectado com sucesso!');
      this.checkGoogleStatus();
    } else {
      Toast.error('Falha ao conectar.');
    }
  },

  async logoutGoogle() {
    Modal.confirm('Deseja desconectar a sua conta do Google Agenda? Os próximos eventos não serão mais sincronizados.', async () => {
      await electronAPI.google.logout();
      Toast.success('Conta desconectada.');
      this.checkGoogleStatus();
    });
  },

  async initCalendar() {
    const calendarEl = document.getElementById('calendar-el');
    if (!calendarEl) return;

    if (typeof FullCalendar === 'undefined') {
      calendarEl.innerHTML = `
        <div class="empty-state">
          <h3>Erro ao carregar Calendário</h3>
          <p>Não foi possível carregar a biblioteca FullCalendar. Verifique sua conexão com a internet.</p>
        </div>
      `;
      return;
    }

    try {
      const eventosRaw = await electronAPI.eventos.listar({});
      
      // Mapeia para o formato do FullCalendar
      const eventosFC = eventosRaw.map(e => ({
        id: e.id,
        title: e.titulo,
        start: e.data_inicio,
        end: e.data_fim,
        backgroundColor: e.cor,
        borderColor: e.cor,
        extendedProps: {
          descricao: e.descricao
        }
      }));

      this.calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'timeGridWeek',
        headerToolbar: {
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        locale: 'pt-br',
        buttonText: {
          today: 'Hoje',
          month: 'Mês',
          week: 'Semana',
          day: 'Dia'
        },
        events: eventosFC,
        editable: true,
        selectable: true,
        selectMirror: true,
        dayMaxEvents: true,
        slotMinTime: '06:00:00',
        slotMaxTime: '22:00:00',
        allDaySlot: false,
        height: '100%',
        
        // Ao clicar num slot vazio (Criar)
        select: (info) => {
          this.openForm(null, info.startStr, info.endStr);
          this.calendar.unselect();
        },

        // Ao clicar num evento (Editar)
        eventClick: (info) => {
          this.viewEvento(info.event);
        },

        // Ao arrastar/redimensionar um evento (Atualização rápida)
        eventDrop: (info) => this.handleEventDrop(info.event),
        eventResize: (info) => this.handleEventDrop(info.event)
      });

      this.calendar.render();
      
      // Override default FullCalendar styles to match our theme dynamically where needed
      const fcButtons = document.querySelectorAll('.fc-button-primary');
      fcButtons.forEach(btn => {
        btn.style.backgroundColor = 'var(--bg-secondary)';
        btn.style.color = 'var(--text-primary)';
        btn.style.borderColor = 'var(--border-color)';
        btn.style.textTransform = 'capitalize';
      });

    } catch (err) {
      console.error(err);
      Toast.error('Erro ao inicializar calendário');
    }
  },

  async handleEventDrop(event) {
    try {
      const id = parseInt(event.id);
      const original = (await electronAPI.eventos.listar({})).find(e => e.id === id);
      
      if (!original) return;

      const dados = {
        titulo: event.title,
        descricao: event.extendedProps.descricao,
        cor: event.backgroundColor,
        data_inicio: event.start.toISOString(),
        data_fim: event.end ? event.end.toISOString() : event.start.toISOString()
      };

      await electronAPI.eventos.atualizar(id, dados);
      Toast.success('Horário atualizado!');
    } catch (err) {
      Toast.error('Erro ao atualizar horário');
      event.revert();
    }
  },

  viewEvento(event) {
    const id = event.id;
    const titulo = event.title;
    const desc = event.extendedProps.descricao || 'Sem descrição';
    const inicioFmt = new Date(event.start).toLocaleString('pt-BR');
    const fimFmt = event.end ? new Date(event.end).toLocaleString('pt-BR') : inicioFmt;

    Modal.open(`
      <div class="modal-header">
        <h3>Detalhes do Evento</h3>
        <button class="modal-close" onclick="Modal.close()">${Helpers.icons.close}</button>
      </div>
      <div class="modal-body" style="padding-bottom: var(--spacing-sm);">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: var(--spacing-lg);">
          <div style="width: 20px; height: 20px; border-radius: 4px; background: ${event.backgroundColor};"></div>
          <h4 style="font-size: var(--font-size-lg); font-weight: 700; margin: 0;">${titulo}</h4>
        </div>
        
        <div class="detail-grid" style="grid-template-columns: 1fr;">
          <div class="detail-item" style="display: flex; align-items: center; gap: 12px;">
            <div style="color: var(--text-tertiary);">🕒</div>
            <div>
              <div class="detail-label" style="margin: 0;">Início</div>
              <div class="detail-value">${inicioFmt}</div>
            </div>
          </div>
          <div class="detail-item" style="display: flex; align-items: center; gap: 12px;">
            <div style="color: var(--text-tertiary);">🕒</div>
            <div>
              <div class="detail-label" style="margin: 0;">Fim</div>
              <div class="detail-value">${fimFmt}</div>
            </div>
          </div>
        </div>

        <div style="margin-top: var(--spacing-lg);">
          <div style="font-size: var(--font-size-sm); color: var(--text-tertiary); margin-bottom: 4px; text-transform: uppercase; font-weight: 600;">Descrição</div>
          <div style="background: var(--bg-tertiary); padding: 12px; border-radius: var(--radius-md); font-size: var(--font-size-sm); white-space: pre-wrap;">${desc}</div>
        </div>
      </div>
      <div class="modal-footer" style="justify-content: space-between;">
        <button class="btn btn-danger" onclick="AgendaPage.confirmDelete(${id}, '${titulo.replace(/'/g, "\\'")}')">
          ${Helpers.icons.trash} Excluir
        </button>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-secondary" onclick="AgendaPage.openGCalendarExport('${titulo.replace(/'/g, "\\'")}', '${desc.replace(/'/g, "\\'")}', '${event.start.toISOString()}', '${event.end ? event.end.toISOString() : event.start.toISOString()}')">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6"/><path d="m21 3-9 9"/><path d="M15 3h6v6"/></svg> Add no Google
          </button>
          <button class="btn btn-primary" onclick="AgendaPage.openForm(${id})">
            ${Helpers.icons.edit} Editar
          </button>
        </div>
      </div>
    `);
  },

  openGCalendarExport(titulo, desc, startISO, endISO) {
    const fmt = (iso) => iso.replace(/[-:]/g, '').split('.')[0] + 'Z';
    const text = encodeURIComponent(titulo);
    const dates = `${fmt(startISO)}/${fmt(endISO)}`;
    const details = encodeURIComponent(desc);
    
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}`;
    electronAPI.openExternal(url);
    Toast.success('Abrindo no Google Calendar...');
  },

  async openForm(id = null, startStr = null, endStr = null) {
    let evento = null;
    
    // Default 1h duration logic
    if (!startStr) {
      const now = new Date();
      now.setMinutes(0, 0, 0);
      startStr = now.toISOString().slice(0, 16);
      
      const end = new Date(now.getTime() + 60 * 60 * 1000);
      endStr = end.toISOString().slice(0, 16);
    } else {
      // Clean FullCalendar ISO strings to datetime-local format format (YYYY-MM-DDThh:mm)
      startStr = startStr.substring(0, 16);
      endStr = endStr ? endStr.substring(0, 16) : startStr;
    }

    if (id) {
      const todos = await electronAPI.eventos.listar({});
      evento = todos.find(e => e.id === id);
      if (evento) {
        startStr = evento.data_inicio.substring(0, 16);
        endStr = evento.data_fim.substring(0, 16);
      }
    }
    
    const isEdit = evento !== null;
    const corAtual = isEdit ? evento.cor : '#2563EB'; // default blue

    const cores = [
      { hex: '#2563EB', name: 'Azul' },
      { hex: '#059669', name: 'Verde' },
      { hex: '#DC2626', name: 'Vermelho' },
      { hex: '#D97706', name: 'Laranja' },
      { hex: '#7C3AED', name: 'Roxo' },
      { hex: '#4B5563', name: 'Cinza' }
    ];

    Modal.open(`
      <div class="modal-header">
        <h3>${isEdit ? 'Editar Evento' : 'Novo Evento'}</h3>
        <button class="modal-close" onclick="Modal.close()">${Helpers.icons.close}</button>
      </div>
      <div class="modal-body">
        
        <div class="form-group">
          <label class="form-label">Título do Compromisso *</label>
          <input type="text" class="form-input" id="evento-titulo" placeholder="Ex: Instalação Cliente X" value="${isEdit ? evento.titulo : ''}">
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Data de Início *</label>
            <input type="datetime-local" class="form-input" id="evento-inicio" value="${startStr}">
          </div>
          <div class="form-group">
            <label class="form-label">Data de Término *</label>
            <input type="datetime-local" class="form-input" id="evento-fim" value="${endStr}">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Cor no Calendário</label>
          <div style="display: flex; gap: 12px; margin-top: 8px;">
            ${cores.map(c => `
              <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                <input type="radio" name="evento-cor" value="${c.hex}" ${corAtual === c.hex ? 'checked' : ''}>
                <div style="width: 16px; height: 16px; border-radius: 50%; background: ${c.hex};"></div>
              </label>
            `).join('')}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Descrição / Observações</label>
          <textarea class="form-textarea" id="evento-descricao" placeholder="Endereço, detalhes do serviço...">${isEdit ? (evento.descricao || '') : ''}</textarea>
        </div>

      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="AgendaPage.${isEdit ? 'viewEvento(AgendaPage.calendar.getEventById('+id+'))' : 'Modal.close()'}">Cancelar</button>
        <button class="btn btn-primary" onclick="AgendaPage.saveForm(${isEdit ? evento.id : 'null'})">
          ${Helpers.icons.check} ${isEdit ? 'Salvar Alterações' : 'Criar Evento'}
        </button>
      </div>
    `);
  },

  async saveForm(id) {
    const dados = {
      titulo: document.getElementById('evento-titulo').value.trim(),
      data_inicio: new Date(document.getElementById('evento-inicio').value).toISOString(),
      data_fim: new Date(document.getElementById('evento-fim').value).toISOString(),
      cor: document.querySelector('input[name="evento-cor"]:checked').value,
      descricao: document.getElementById('evento-descricao').value.trim()
    };

    if (!dados.titulo) return Toast.warning('O título é obrigatório');
    if (new Date(dados.data_inicio) > new Date(dados.data_fim)) return Toast.warning('A data de fim não pode ser menor que a de início');

    try {
      if (id) {
        await electronAPI.eventos.atualizar(id, dados);
        Toast.success('Evento atualizado!');
      } else {
        await electronAPI.eventos.criar(dados);
        Toast.success('Evento criado!');
      }
      Modal.close();
      this.initCalendar(); // Regex fetches data and redraws
    } catch (err) {
      Toast.error('Erro ao salvar evento');
    }
  },

  confirmDelete(id, titulo) {
    Modal.confirm(`Tem certeza que deseja cancelar/excluir o evento <strong>${titulo}</strong>?`, async () => {
      try {
        await electronAPI.eventos.excluir(id);
        Toast.success('Evento excluído');
        Modal.close();
        this.initCalendar();
      } catch (err) {
        Toast.error('Erro ao excluir evento');
      }
    });
  }
};
