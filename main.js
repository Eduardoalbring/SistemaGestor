try {
  require('dotenv').config();
} catch (e) {
  console.log('dotenv not found, skipping...');
}

const path = require('path');
const http = require('http');
const url = require('url');

const electron = require('electron');
const { app, BrowserWindow, ipcMain, shell, Notification } = electron;
const Database = require('./database');
const GoogleCalendarService = require('./src/utils/googleService');

let mainWindow;
let db;
let googleService;
let authServer;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1380,
    height: 860,
    minWidth: 1100,
    minHeight: 700,
    title: 'SistemaGestor',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    backgroundColor: '#FFFFFF',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    frame: false,
    titleBarStyle: 'hidden',
    show: false
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Remove default menu
  mainWindow.setMenu(null);
}

app.whenReady().then(() => {
  db = new Database(app.getPath('userData'));
  googleService = new GoogleCalendarService(app.getPath('userData'));
  createWindow();

  // Rotina de checagem de Eventos da Agenda (a cada 1 minuto)
  setInterval(() => {
    if (!db) return;
    try {
      // Eventos próximos nos próximos 30 minutos
      const eventosProximos = db.getEventosProximos(30); 
      
      eventosProximos.forEach(evento => {
        if (Notification.isSupported()) {
          const notification = new Notification({
            title: '📅 Lembrete de Agenda: ' + evento.titulo,
            body: 'Começa em breve! ' + (evento.descricao ? evento.descricao : ''),
            icon: path.join(__dirname, 'assets', 'icon.png')
          });
          
          notification.show();
          
          // Marca como notificado no banco para não alertar de novo
          db.marcarEventoNotificado(evento.id);
        }
      });
    } catch (err) {
      console.error('Erro ao verificar eventos próximos:', err);
    }
  }, 60000); // 60000 ms = 1 minuto
});

app.on('window-all-closed', () => {
  if (db) db.close();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ============ Window Controls ============
ipcMain.on('window-minimize', () => mainWindow.minimize());
ipcMain.on('window-maximize', () => {
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});
ipcMain.on('window-close', () => mainWindow.close());

// ============ External Links ============
ipcMain.on('open-external', (_, url) => {
  shell.openExternal(url);
});

// ============ CLIENTES ============
ipcMain.handle('clientes:listar', (_, filtros) => db.listarClientes(filtros));
ipcMain.handle('clientes:buscar', (_, id) => db.buscarCliente(id));
ipcMain.handle('clientes:criar', (_, dados) => db.criarCliente(dados));
ipcMain.handle('clientes:atualizar', (_, id, dados) => db.atualizarCliente(id, dados));
ipcMain.handle('clientes:excluir', (_, id) => db.excluirCliente(id));

// ============ ORÇAMENTOS ============
ipcMain.handle('orcamentos:listar', (_, filtros) => db.listarOrcamentos(filtros));
ipcMain.handle('orcamentos:buscar', (_, id) => db.buscarOrcamento(id));
ipcMain.handle('orcamentos:criar', (_, dados) => db.criarOrcamento(dados));
ipcMain.handle('orcamentos:atualizar', (_, id, dados) => db.atualizarOrcamento(id, dados));
ipcMain.handle('orcamentos:excluir', (_, id) => db.excluirOrcamento(id));
ipcMain.handle('orcamentos:atualizarStatus', (_, id, status) => db.atualizarStatusOrcamento(id, status));

// ============ ORÇAMENTO ITENS ============
ipcMain.handle('orcamentoItens:listar', (_, orcamentoId) => db.listarItensOrcamento(orcamentoId));
ipcMain.handle('orcamentoItens:criar', (_, dados) => db.criarItemOrcamento(dados));
ipcMain.handle('orcamentoItens:atualizar', (_, id, dados) => db.atualizarItemOrcamento(id, dados));
ipcMain.handle('orcamentoItens:excluir', (_, id) => db.excluirItemOrcamento(id));

// ============ SERVIÇOS ============
ipcMain.handle('servicos:listar', (_, filtros) => db.listarServicos(filtros));
ipcMain.handle('servicos:buscar', (_, id) => db.buscarServico(id));
ipcMain.handle('servicos:criar', (_, dados) => db.criarServico(dados));
ipcMain.handle('servicos:atualizar', (_, id, dados) => db.atualizarServico(id, dados));
ipcMain.handle('servicos:excluir', (_, id) => db.excluirServico(id));
ipcMain.handle('servicos:atualizarStatus', (_, id, status) => db.atualizarStatusServico(id, status));

// ============ MATERIAIS ============
ipcMain.handle('materiais:listar', (_, filtros) => db.listarMateriais(filtros));
ipcMain.handle('materiais:buscar', (_, id) => db.buscarMaterial(id));
ipcMain.handle('materiais:criar', (_, dados) => db.criarMaterial(dados));
ipcMain.handle('materiais:atualizar', (_, id, dados) => db.atualizarMaterial(id, dados));
ipcMain.handle('materiais:excluir', (_, id) => db.excluirMaterial(id));

// ============ DASHBOARD ============
ipcMain.handle('dashboard:metricas', () => db.getMetricas());
ipcMain.handle('dashboard:atividadesRecentes', () => db.getAtividadesRecentes());
ipcMain.handle('dashboard:metricasMensais', () => db.getMetricasMensais());

// ============ CUSTOS ============
ipcMain.handle('custos:listar', (_, filtros) => db.listarCustos(filtros));
ipcMain.handle('custos:criar', (_, dados) => db.criarCusto(dados));
ipcMain.handle('custos:atualizar', (_, id, dados) => db.atualizarCusto(id, dados));
ipcMain.handle('custos:buscar', (_, id) => db.buscarCusto(id));
ipcMain.handle('custos:excluir', (_, id) => db.excluirCusto(id));
ipcMain.handle('custos:relatorio', () => db.getRelatorioCustos());
ipcMain.handle('custos:marcarStatus', (_, id, status) => db.marcarCustoStatus(id, status));
ipcMain.handle('custos:historicoMensal', () => db.getHistoricoMensalPagos());
ipcMain.handle('custos:excluirPorMeta', (e, metaId) => db.excluirCustosPorMeta(metaId));
ipcMain.handle('custos:excluirPorGrupo', (e, grupoId) => db.excluirCustosPorGrupo(grupoId));
ipcMain.handle('custos:getGrupoInfo', (e, grupoId) => db.getGrupoInfo(grupoId));
ipcMain.handle('custos:marcarStatusGrupo', (e, grupoId, status, qtd) => db.marcarStatusGrupo(grupoId, status, qtd));
ipcMain.handle('custos:restaurar', (_, id) => db.restaurarCusto(id));
ipcMain.handle('custos:restaurarGrupo', (_, grupoId) => db.restaurarCustosPorGrupo(grupoId));

// ============ CUSTOS FIXOS ============
ipcMain.handle('custosFixos:listar', () => db.listarCustosFixos());
ipcMain.handle('custosFixos:criar', (_, dados) => db.criarCustoFixo(dados));
ipcMain.handle('custosFixos:atualizar', (_, id, dados) => db.atualizarCustoFixo(id, dados));
ipcMain.handle('custosFixos:excluir', (_, id) => db.excluirCustoFixo(id));

// ============ EVENTOS/AGENDA ============
ipcMain.handle('eventos:listar', async (_, filtros) => {
  const eventos = db.listarEventos(filtros);
  return eventos;
});
ipcMain.handle('eventos:criar', async (_, dados) => {
  // Se está sincronizado com Google, lança lá também
  if (googleService.isAuthenticated()) {
    try {
      const gEvent = await googleService.criarEvento(dados);
      dados.google_event_id = gEvent.id;
    } catch (e) {
      console.error('Falha ao criar evento no google', e);
    }
  }
  return db.criarEvento(dados);
});
ipcMain.handle('eventos:atualizar', async (_, id, dados) => {
  if (googleService.isAuthenticated() && dados.google_event_id) {
    try {
      await googleService.atualizarEvento(dados.google_event_id, dados);
    } catch (e) {
      console.error('Falha ao atualizar evento no google', e);
    }
  }
  return db.atualizarEvento(id, dados);
});
ipcMain.handle('eventos:excluir', async (_, id) => {
  const eventoToExcluir = db.db.prepare('SELECT google_event_id FROM eventos WHERE id = ?').get(id);
  if (googleService.isAuthenticated() && eventoToExcluir && eventoToExcluir.google_event_id) {
    try {
      await googleService.excluirEvento(eventoToExcluir.google_event_id);
    } catch(e) {}
  }
  return db.excluirEvento(id);
});
ipcMain.handle('eventos:proximos', (_, minutos) => db.getEventosProximos(minutos));
ipcMain.handle('eventos:marcarNotificado', (_, id) => db.marcarEventoNotificado(id));

// ============ GOOGLE CALENDAR OAUTH ============
ipcMain.handle('google:isAuthenticated', () => googleService.isAuthenticated());
ipcMain.handle('google:login', async () => {
  if (googleService.isAuthenticated()) return true;

  return new Promise((resolve) => {
    // Sobe o mini servidor na porta 3000 para aguardar a chave de acesso do google (callback).
    authServer = http.createServer(async (req, res) => {
      const qs = new url.URL(req.url, 'http://localhost:3000').searchParams;
      const code = qs.get('code');
      
      if (code) {
        try {
          await googleService.setTokensFromCode(code);
          res.end('<h1>Autenticado com sucesso!</h1><p>Você já pode fechar esta aba e voltar para o SistemaGestor.</p><script>window.close()</script>');
          authServer.close();
          resolve(true); // Retorna sucesso para o Front-end!
        } catch (e) {
          res.end('<h1>Erro na autenticação.</h1><p>Tente novamente.</p>');
          authServer.close();
          resolve(false);
        }
      }
    }).listen(3000, () => {
      // Assim que o servidor de espera subir, abre o navegador do usuário
      shell.openExternal(googleService.getAuthUrl());
    });
  });
});
ipcMain.handle('google:logout', async () => {
  await googleService.logout();
  return true;
});

// ============ METAS ============
ipcMain.handle('metas:listar', () => db.listarMetas());
ipcMain.handle('metas:criar', (_, dados) => db.criarMeta(dados));
ipcMain.handle('metas:atualizar', (_, id, dados) => db.atualizarMeta(id, dados));
ipcMain.handle('metas:excluir', (_, id) => db.excluirMeta(id));
ipcMain.handle('metas:saldo', (_, mes) => db.getSaldoLivre(mes));
