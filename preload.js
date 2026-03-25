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
    metricasMensais: () => ipcRenderer.invoke('dashboard:metricasMensais'),
  },

  // Custos
  custos: {
    listar: (filtros) => ipcRenderer.invoke('custos:listar', filtros),
    buscar: (id) => ipcRenderer.invoke('custos:buscar', id),
    criar: (dados) => ipcRenderer.invoke('custos:criar', dados),
    atualizar: (id, dados) => ipcRenderer.invoke('custos:atualizar', id, dados),
    excluir: (id) => ipcRenderer.invoke('custos:excluir', id),
    relatorio: () => ipcRenderer.invoke('custos:relatorio'),
    marcarStatus: (id, status) => ipcRenderer.invoke('custos:marcarStatus', id, status),
    historicoMensal: () => ipcRenderer.invoke('custos:historicoMensal'),
    excluirPorMeta: (metaId) => ipcRenderer.invoke('custos:excluirPorMeta', metaId),
    excluirPorGrupo: (grupoId) => ipcRenderer.invoke('custos:excluirPorGrupo', grupoId),
    getGrupoInfo: (grupoId) => ipcRenderer.invoke('custos:getGrupoInfo', grupoId),
    marcarStatusGrupo: (grupoId, status, qtd) => ipcRenderer.invoke('custos:marcarStatusGrupo', grupoId, status, qtd),
    restaurar: (id) => ipcRenderer.invoke('custos:restaurar', id),
    restaurarGrupo: (grupoId) => ipcRenderer.invoke('custos:restaurarGrupo', grupoId),
  },

  // Custos Fixos (Despesas Obrigatórias)
  custosFixos: {
    listar: () => ipcRenderer.invoke('custosFixos:listar'),
    criar: (dados) => ipcRenderer.invoke('custosFixos:criar', dados),
    atualizar: (id, dados) => ipcRenderer.invoke('custosFixos:atualizar', id, dados),
    excluir: (id) => ipcRenderer.invoke('custosFixos:excluir', id),
  },

  // Eventos / Agenda
  eventos: {
    listar: (filtros) => ipcRenderer.invoke('eventos:listar', filtros),
    criar: (dados) => ipcRenderer.invoke('eventos:criar', dados),
    atualizar: (id, dados) => ipcRenderer.invoke('eventos:atualizar', id, dados),
    excluir: (id) => ipcRenderer.invoke('eventos:excluir', id),
    proximos: (minutos) => ipcRenderer.invoke('eventos:proximos', minutos),
    marcarNotificado: (id) => ipcRenderer.invoke('eventos:marcarNotificado', id),
  },

  // Google Calendar
  google: {
    isAuthenticated: () => ipcRenderer.invoke('google:isAuthenticated'),
    login: () => ipcRenderer.invoke('google:login'),
    logout: () => ipcRenderer.invoke('google:logout'),
  },

  // Metas
  metas: {
    listar: () => ipcRenderer.invoke('metas:listar'),
    criar: (dados) => ipcRenderer.invoke('metas:criar', dados),
    atualizar: (id, dados) => ipcRenderer.invoke('metas:atualizar', id, dados),
    excluir: (id) => ipcRenderer.invoke('metas:excluir', id),
    saldo: (mes) => ipcRenderer.invoke('metas:saldo', mes),
  }
});
