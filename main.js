const { app, BrowserWindow, ipcMain, Tray, Menu, powerMonitor, nativeImage, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// ─── Singleton: prevent multiple instances ────────────────────────────────────
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.log('[Main] Une instance est déjà en cours. Fermeture.');
  app.quit();
  process.exit(0);
}
const configStore = require('./src/backend/config-store');
const serialManager = require('./src/backend/serial-manager');
const wsServer = require('./src/backend/websocket-server');
const pluginManager = require('./src/backend/plugin-manager');
const obsPlugin = require('./src/backend/plugins/obs-plugin');
const systemMonitor = require('./src/backend/system-monitor');

let mainWindow = null;
let tray = null;
let isQuitting = false;

// Redirect Electron cache to a local folder (avoids Windows permission errors)
app.setPath('userData', path.join(__dirname, '.electron-data'));

function createWindow() {
  Menu.setApplicationMenu(null);

  const appSettings = configStore.get('settings') || {};
  const launchMode = appSettings.launchMode || 'normal';

  mainWindow = new BrowserWindow({
    width: 1340,
    height: 880,
    minWidth: 1080,
    minHeight: 740,
    backgroundColor: '#070a12',
    title: 'CYD-Deck Studio — ESP32 Stream Deck Companion',
    icon: path.join(__dirname, 'src', 'renderer', 'icons', 'deck-icon.png'),
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#070a12',
      symbolColor: '#94a3b8',
      height: 38
    },
    autoHideMenuBar: true,
    show: launchMode !== 'minimized',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    if (launchMode === 'maximized') {
      mainWindow.maximize();
      mainWindow.show();
    } else if (launchMode === 'minimized') {
      // stays hidden, shows in tray only
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  // Focus existing window if second instance tries to launch
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized() || !mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    }
  });
}

function createTray() {
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setToolTip('CYD-Deck Studio — Actif');

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Afficher CYD-Deck', click: () => { if (mainWindow) mainWindow.show(); } },
    { label: 'Reconnecter ESP32 CYD', click: () => { serialManager.autoConnect(configStore.get('settings').serialPort); } },
    { type: 'separator' },
    { label: 'Quitter', click: () => { isQuitting = true; app.quit(); } }
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => {
    if (mainWindow) mainWindow.show();
  });
}

// Function to push current page layout to ESP32 CYD (via Serial and WebSocket)
function syncCYDCurrentPage() {
  const activePage = configStore.getActivePage();
  if (!activePage) return;

  const payload = {
    cmd: 'PAGE_SYNC',
    pageName: activePage.name,
    profileName: configStore.get('activeProfile'),
    pageIndex: configStore.get('profiles')[configStore.get('activeProfile')].currentPage,
    buttons: activePage.buttons.map(b => ({
      id: b.id,
      label: b.label || '',
      sub: b.sub || '',
      icon: b.icon || 'square',
      color: b.bgColor || '#1e293b',
      textColor: b.textColor || '#ffffff'
    }))
  };

  serialManager.send(payload);
  wsServer.broadcast(payload);
}

// Handle Touch Event from physical CYD
async function handleCYDTouchEvent(eventData) {
  const buttonIndex = eventData.idx !== undefined ? eventData.idx : eventData.button;
  if (buttonIndex === undefined) return;

  const activePage = configStore.getActivePage();
  if (!activePage) return;

  const button = activePage.buttons.find(b => b.id === buttonIndex);
  if (!button) return;

  console.log(`[CYD-Deck] Touche appuyée: #${buttonIndex} (${button.label})`);

  // Forward event to UI simulator
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('cyd-event', {
      type: 'touch',
      buttonIndex,
      button
    });
  }

  // Execute button action
  await pluginManager.executeButtonAction(button);

  // Sync back to CYD
  syncCYDCurrentPage();
}

app.whenReady().then(() => {
  createWindow();
  createTray();

  const settings = configStore.get('settings');

  // Start WebSocket Server
  wsServer.start(settings.wsPort || 8765);
  wsServer.on('message', (msg) => {
    if (msg.event === 'TOUCH') {
      handleCYDTouchEvent(msg);
    } else if (msg.event === 'GET_PAGE') {
      syncCYDCurrentPage();
    }
  });

  // Start Serial Manager
  serialManager.autoConnect(settings.serialPort || 'AUTO', settings.baudRate || 115200);
  serialManager.on('message', (msg) => {
    if (msg.event === 'TOUCH') {
      handleCYDTouchEvent(msg);
    } else if (msg.event === 'READY') {
      console.log('[CYD] ESP32 CYD démarré, synchronisation...');
      syncCYDCurrentPage();
    }
  });

  serialManager.on('connectionChanged', (status) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('serial-status', status);
    }
    if (status.connected) {
      setTimeout(() => syncCYDCurrentPage(), 1000);
    }
  });

  // Start System Monitor
  systemMonitor.start(2000);
  systemMonitor.on('stats', (stats) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('system-stats', stats);
    }
    const statsPayload = { cmd: 'STATS', cpu: stats.cpuUsage, ram: stats.memUsage };
    serialManager.send(statsPayload);
    wsServer.broadcast(statsPayload);
  });

  // Power monitor (Sleep/Wake backlight management)
  if (powerMonitor) {
    powerMonitor.on('lock-screen', () => {
      console.log('[Power] Écran verrouillé -> Veille CYD');
      serialManager.send({ cmd: 'SLEEP', state: true });
      wsServer.broadcast({ cmd: 'SLEEP', state: true });
    });

    powerMonitor.on('unlock-screen', () => {
      console.log('[Power] Écran déverrouillé -> Réveil CYD');
      serialManager.send({ cmd: 'SLEEP', state: false });
      wsServer.broadcast({ cmd: 'SLEEP', state: false });
      syncCYDCurrentPage();
    });
  }

  // Auto connect OBS if address configured
  if (settings.obsAddress) {
    obsPlugin.connect(settings.obsAddress, settings.obsPassword).catch(() => {});
  }

  obsPlugin.on('stateChanged', (obsState) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('obs-status', { connected: obsPlugin.isConnected, state: obsState });
    }
    syncCYDCurrentPage();
  });

  pluginManager.on('pageChanged', (pageIndex) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('page-changed', pageIndex);
    }
    syncCYDCurrentPage();
  });

  pluginManager.on('profileChanged', (profileName) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('profile-changed', profileName);
    }
    syncCYDCurrentPage();
  });
});

// IPC Handlers: Config & Actions
ipcMain.handle('get-config', () => configStore.config);
ipcMain.handle('save-config', (_, newConfig) => {
  configStore.config = newConfig;
  configStore.save();
  syncCYDCurrentPage();
  return { success: true };
});
ipcMain.handle('get-available-actions', () => pluginManager.getAllActions());

// IPC Handlers: Profiles Management
ipcMain.handle('profile-list', () => configStore.getProfilesList());
ipcMain.handle('profile-create', (_, { name, template }) => {
  const res = configStore.createProfile(name, template);
  syncCYDCurrentPage();
  return res;
});
ipcMain.handle('profile-switch', (_, name) => {
  const res = configStore.switchProfile(name);
  syncCYDCurrentPage();
  return res;
});
ipcMain.handle('profile-duplicate', (_, { sourceName, newName }) => {
  const res = configStore.duplicateProfile(sourceName, newName);
  syncCYDCurrentPage();
  return res;
});
ipcMain.handle('profile-delete', (_, name) => {
  const res = configStore.deleteProfile(name);
  syncCYDCurrentPage();
  return res;
});

// IPC Handlers: Custom Icons
ipcMain.handle('custom-icon-select-file', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Sélectionner une icône personnalisée',
    filters: [
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif'] }
    ],
    properties: ['openFile']
  });

  if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
    return null;
  }

  const filePath = result.filePaths[0];
  const ext = path.extname(filePath).slice(1).toLowerCase();
  const mimeType = ext === 'svg' ? 'image/svg+xml' : `image/${ext === 'jpg' ? 'jpeg' : ext}`;
  const fileBuffer = fs.readFileSync(filePath);
  const dataUrl = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
  const baseName = path.basename(filePath, path.extname(filePath));

  return configStore.addCustomIcon(baseName, dataUrl);
});

ipcMain.handle('custom-icon-save', (_, { name, dataUrl }) => {
  return configStore.addCustomIcon(name, dataUrl);
});

ipcMain.handle('custom-icon-delete', (_, id) => {
  return configStore.deleteCustomIcon(id);
});

// IPC Handlers: Serial & OBS
ipcMain.handle('serial-list-ports', async () => await serialManager.listAvailablePorts());
ipcMain.handle('serial-connect', async (_, portPath, baud) => {
  const result = await serialManager.connect(portPath, baud);
  if (result.success) {
    const s = configStore.get('settings');
    s.serialPort = portPath;
    s.baudRate = baud;
    configStore.set('settings', s);
    setTimeout(() => syncCYDCurrentPage(), 500);
  }
  return result;
});
ipcMain.handle('serial-disconnect', () => {
  serialManager.disconnect();
  return { success: true };
});

ipcMain.handle('obs-connect', async (_, address, password) => {
  const res = await obsPlugin.connect(address, password);
  if (res.success) {
    const s = configStore.get('settings');
    s.obsAddress = address;
    s.obsPassword = password;
    configStore.set('settings', s);
  }
  return res;
});
ipcMain.handle('obs-disconnect', async () => {
  await obsPlugin.disconnect();
  return { success: true };
});
ipcMain.handle('obs-refresh', async () => {
  await obsPlugin.refreshState();
  return obsPlugin.state;
});

// IPC Handlers: Execution & CYD
ipcMain.handle('execute-button-action', async (_, button) => {
  const res = await pluginManager.executeButtonAction(button);
  syncCYDCurrentPage();
  return res;
});

ipcMain.handle('set-active-page', (_, pageIndex) => {
  const res = configStore.setCurrentPage(pageIndex);
  syncCYDCurrentPage();
  return res;
});

ipcMain.handle('save-button-config', (_, { pageIndex, buttonIndex, buttonData }) => {
  const profile = configStore.get('profiles')[configStore.get('activeProfile')];
  if (profile && profile.pages[pageIndex]) {
    profile.pages[pageIndex].buttons[buttonIndex] = buttonData;
    configStore.save();
    syncCYDCurrentPage();
    return { success: true };
  }
  return { success: false, error: 'Page ou bouton introuvable' };
});

ipcMain.handle('cyd-sync-page', () => {
  syncCYDCurrentPage();
  return { success: true };
});

ipcMain.handle('cyd-set-brightness', (_, val) => {
  serialManager.send({ cmd: 'BRIGHTNESS', val: parseInt(val, 10) });
  wsServer.broadcast({ cmd: 'BRIGHTNESS', val: parseInt(val, 10) });
  return { success: true };
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ─── IPC: App Settings (launch mode, auto-start) ─────────────────────────────
ipcMain.handle('get-app-settings', () => {
  const s = configStore.get('settings') || {};
  const loginItem = app.getLoginItemSettings();
  return {
    launchMode: s.launchMode || 'normal',
    autoStart: loginItem.openAtLogin
  };
});

ipcMain.handle('set-launch-mode', (_, mode) => {
  const s = configStore.get('settings') || {};
  s.launchMode = mode; // 'normal' | 'maximized' | 'minimized'
  configStore.set('settings', s);
  return { success: true };
});

ipcMain.handle('set-auto-start', (_, enabled) => {
  app.setLoginItemSettings({
    openAtLogin: enabled,
    name: 'CYD-Deck Studio',
    path: process.execPath
  });
  return { success: true, enabled };
});

ipcMain.handle('window-show', () => { if (mainWindow) mainWindow.show(); });
ipcMain.handle('window-minimize', () => { if (mainWindow) mainWindow.minimize(); });
ipcMain.handle('window-maximize', () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});
