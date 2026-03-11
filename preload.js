const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // External links
  openExternal: (url) => ipcRenderer.send('open-external', url),

  // Clientes
  clientes: {
    listar: (filtros) => ipcRenderer.invoke('clientes:listar', filtros),
    buscar: (id) => ipcRenderer.invoke('clientes:buscar', id),
    criar: (dados) => ipcRenderer.invoke('clientes:criar', dados),
    atualizar: (id, dados) => ipcRenderer.invoke('clientes:atualizar', id, dados),
    excluir: (id) => ipcRenderer.invoke('clientes:excluir', id),
  },

  // Orçamentos
  orcamentos: {
    listar: (filtros) => ipcRenderer.invoke('orcamentos:listar', filtros),
    buscar: (id) => ipcRenderer.invoke('orcamentos:buscar', id),
    criar: (dados) => ipcRenderer.invoke('orcamentos:criar', dados),
    atualizar: (id, dados) => ipcRenderer.invoke('orcamentos:atualizar', id, dados),
    excluir: (id) => ipcRenderer.invoke('orcamentos:excluir', id),
    atualizarStatus: (id, status) => ipcRenderer.invoke('orcamentos:atualizarStatus', id, status),
  },

  // Itens do Orçamento
  orcamentoItens: {
    listar: (orcamentoId) => ipcRenderer.invoke('orcamentoItens:listar', orcamentoId),
    criar: (dados) => ipcRenderer.invoke('orcamentoItens:criar', dados),
    atualizar: (id, dados) => ipcRenderer.invoke('orcamentoItens:atualizar', id, dados),
    excluir: (id) => ipcRenderer.invoke('orcamentoItens:excluir', id),
  },

  // Serviços
  servicos: {
    listar: (filtros) => ipcRenderer.invoke('servicos:listar', filtros),
    buscar: (id) => ipcRenderer.invoke('servicos:buscar', id),
    criar: (dados) => ipcRenderer.invoke('servicos:criar', dados),
    atualizar: (id, dados) => ipcRenderer.invoke('servicos:atualizar', id, dados),
    excluir: (id) => ipcRenderer.invoke('servicos:excluir', id),
    atualizarStatus: (id, status) => ipcRenderer.invoke('servicos:atualizarStatus', id, status),
  },

  // Materiais
  materiais: {
    listar: (filtros) => ipcRenderer.invoke('materiais:listar', filtros),
    buscar: (id) => ipcRenderer.invoke('materiais:buscar', id),
    criar: (dados) => ipcRenderer.invoke('materiais:criar', dados),
    atualizar: (id, dados) => ipcRenderer.invoke('materiais:atualizar', id, dados),
    excluir: (id) => ipcRenderer.invoke('materiais:excluir', id),
  },

  // Dashboard
  dashboard: {
    metricas: () => ipcRenderer.invoke('dashboard:metricas'),
    atividadesRecentes: () => ipcRenderer.invoke('dashboard:atividadesRecentes'),
  }
});
