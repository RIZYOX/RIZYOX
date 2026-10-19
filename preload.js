const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cydDeck', {
  // Configuration
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (cfg) => ipcRenderer.invoke('save-config', cfg),
  getAvailableActions: () => ipcRenderer.invoke('get-available-actions'),

  // Profiles Management
  getProfilesList: () => ipcRenderer.invoke('profile-list'),
  createProfile: (name, template) => ipcRenderer.invoke('profile-create', { name, template }),
  switchProfile: (name) => ipcRenderer.invoke('profile-switch', name),
  duplicateProfile: (sourceName, newName) => ipcRenderer.invoke('profile-duplicate', { sourceName, newName }),
  deleteProfile: (name) => ipcRenderer.invoke('profile-delete', name),

  // Custom Icons Management
  selectIconFile: () => ipcRenderer.invoke('custom-icon-select-file'),
  saveCustomIcon: (name, dataUrl) => ipcRenderer.invoke('custom-icon-save', { name, dataUrl }),
  deleteCustomIcon: (id) => ipcRenderer.invoke('custom-icon-delete', id),

  // Hardware / Serial Port
  listSerialPorts: () => ipcRenderer.invoke('serial-list-ports'),
  connectSerial: (portPath, baudRate) => ipcRenderer.invoke('serial-connect', portPath, baudRate),
  disconnectSerial: () => ipcRenderer.invoke('serial-disconnect'),

  // OBS Studio
  connectOBS: (address, password) => ipcRenderer.invoke('obs-connect', address, password),
  disconnectOBS: () => ipcRenderer.invoke('obs-disconnect'),
  refreshOBS: () => ipcRenderer.invoke('obs-refresh'),

  // Page & Button Actions
  executeAction: (button) => ipcRenderer.invoke('execute-button-action', button),
  setActivePage: (pageIndex) => ipcRenderer.invoke('set-active-page', pageIndex),
  saveButtonConfig: (pageIndex, buttonIndex, buttonData) => ipcRenderer.invoke('save-button-config', { pageIndex, buttonIndex, buttonData }),
  syncCYD: () => ipcRenderer.invoke('cyd-sync-page'),
  setBrightness: (val) => ipcRenderer.invoke('cyd-set-brightness', val),

  // Events from Main Process
  onSerialStatus: (callback) => ipcRenderer.on('serial-status', (_, data) => callback(data)),
  onOBSStatus: (callback) => ipcRenderer.on('obs-status', (_, data) => callback(data)),
  onSystemStats: (callback) => ipcRenderer.on('system-stats', (_, data) => callback(data)),
  onCYDEvent: (callback) => ipcRenderer.on('cyd-event', (_, data) => callback(data)),
  onPageChanged: (callback) => ipcRenderer.on('page-changed', (_, data) => callback(data)),
  onProfileChanged: (callback) => ipcRenderer.on('profile-changed', (_, data) => callback(data))
});
