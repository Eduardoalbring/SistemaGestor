const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const Database = require('./database');

let mainWindow;
let db;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1380,
    height: 860,
    minWidth: 1100,
    minHeight: 700,
    title: 'ElectriPRO',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    backgroundColor: '#0a0e1a',
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
  createWindow();
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
