/**
 * CYD-Deck Studio — Renderer App Controller
 */

// Icon SVG Catalog
const ICONS = {
  'record': `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="currentColor"/><circle cx="12" cy="12" r="4" fill="#000"/></svg>`,
  'radio': `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/></svg>`,
  'mic': `<svg viewBox="0 0 24 24"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>`,
  'mic-off': `<svg viewBox="0 0 24 24"><line x1="2" x2="22" y1="2" y2="22"/><path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/><path d="M5 10v2a7 7 0 0 0 12 5"/><path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12"/><line x1="12" x2="12" y1="19" y2="22"/></svg>`,
  'headphones': `<svg viewBox="0 0 24 24"><path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/></svg>`,
  'monitor': `<svg viewBox="0 0 24 24"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>`,
  'film': `<svg viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 3v18M17 3v18M3 8h4M3 12h18M3 16h4M17 8h4M17 16h4"/></svg>`,
  'play': `<svg viewBox="0 0 24 24"><polygon points="6 3 20 12 6 21 6 3" fill="currentColor"/></svg>`,
  'pause': `<svg viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`,
  'skip-forward': `<svg viewBox="0 0 24 24"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" x2="19" y1="5" y2="19"/></svg>`,
  'skip-back': `<svg viewBox="0 0 24 24"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" x2="5" y1="19" y2="5"/></svg>`,
  'volume-2': `<svg viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`,
  'volume-1': `<svg viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`,
  'volume-x': `<svg viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="22" x2="16" y1="9" y2="15"/><line x1="16" x2="22" y1="9" y2="15"/></svg>`,
  'arrow-right': `<svg viewBox="0 0 24 24"><line x1="5" x2="19" y1="12" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`,
  'arrow-left': `<svg viewBox="0 0 24 24"><line x1="19" x2="5" y1="12" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>`,
  'terminal': `<svg viewBox="0 0 24 24"><polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/></svg>`,
  'power': `<svg viewBox="0 0 24 24"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" x2="12" y1="2" y2="12"/></svg>`,
  'lock': `<svg viewBox="0 0 24 24"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
  'camera': `<svg viewBox="0 0 24 24"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>`,
  'square': `<svg viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="3" rx="2"/></svg>`
};

class CYDStudioApp {
  constructor() {
    this.config = null;
    this.plugins = {};
    this.selectedButtonIndex = 0;
    this.selectedIcon = 'record';
    this.selectedColor = '#1e3a8a';

    this.initElements();
    this.initEvents();
  }

  initElements() {
    // Header & Hardware
    this.serialLed = document.getElementById('serialLed');
    this.serialPortName = document.getElementById('serialPortName');
    this.btnConnectSerial = document.getElementById('btnConnectSerial');

    this.obsLed = document.getElementById('obsLed');
    this.obsStatusText = document.getElementById('obsStatusText');
    this.btnConfigOBS = document.getElementById('btnConfigOBS');

    this.cpuVal = document.getElementById('cpuVal');
    this.cpuBar = document.getElementById('cpuBar');
    this.ramVal = document.getElementById('ramVal');
    this.ramBar = document.getElementById('ramBar');

    // Pages & Simulator
    this.pagesTabContainer = document.getElementById('pagesTabContainer');
    this.btnAddPage = document.getElementById('btnAddPage');
    this.btnSyncCYD = document.getElementById('btnSyncCYD');
    this.cydVirtualScreen = document.getElementById('cydVirtualScreen');
    this.brightnessSlider = document.getElementById('brightnessSlider');
    this.brightnessVal = document.getElementById('brightnessVal');
    this.eventTerminalLogs = document.getElementById('eventTerminalLogs');
    this.btnClearTerminal = document.getElementById('btnClearTerminal');

    // Inspector
    this.inspectorTitle = document.getElementById('inspectorTitle');
    this.inspectorPageTag = document.getElementById('inspectorPageTag');
    this.inpBtnLabel = document.getElementById('inpBtnLabel');
    this.inpBtnSub = document.getElementById('inpBtnSub');
    this.iconPickerGrid = document.getElementById('iconPickerGrid');
    this.colorPresetsRow = document.getElementById('colorPresetsRow');
    this.inpCustomColor = document.getElementById('inpCustomColor');
    this.selPlugin = document.getElementById('selPlugin');
    this.selAction = document.getElementById('selAction');
    this.dynamicParamsContainer = document.getElementById('dynamicParamsContainer');
    this.btnSaveButtonConfig = document.getElementById('btnSaveButtonConfig');
    this.btnTestButtonAction = document.getElementById('btnTestButtonAction');

    // OBS Modal
    this.obsModal = document.getElementById('obsModal');
    this.btnCloseObsModal = document.getElementById('btnCloseObsModal');
    this.btnCancelObs = document.getElementById('btnCancelObs');
    this.btnSaveConnectObs = document.getElementById('btnSaveConnectObs');
    this.inpObsAddress = document.getElementById('inpObsAddress');
    this.inpObsPassword = document.getElementById('inpObsPassword');
    this.obsModalFeedback = document.getElementById('obsModalFeedback');
  }

  async start() {
    this.renderIconPicker();

    // Load initial config from Electron Main
    this.config = await window.cydDeck.getConfig();
    this.plugins = await window.cydDeck.getAvailableActions();

    this.renderPagesTabs();
    this.renderVirtualScreen();
    this.selectButton(0);

    // Initial check on ports
    const ports = await window.cydDeck.listSerialPorts();
    const likely = ports.find(p => p.isLikelyESP32);
    if (likely) {
      this.logTerminal(`[SERIAL] Port ESP32 détecté: ${likely.path} (${likely.friendlyName})`, 'info');
    }
  }

  initEvents() {
    // IPC Event listeners from backend
    window.cydDeck.onSerialStatus((status) => {
      if (status.connected) {
        this.serialLed.classList.add('active');
        this.serialPortName.textContent = status.path || 'Connecté';
        this.logTerminal(`[SERIAL] ESP32 CYD connecté sur ${status.path}`, 'touch');
      } else {
        this.serialLed.classList.remove('active');
        this.serialPortName.textContent = 'Déconnecté';
        this.logTerminal(`[SERIAL] ESP32 CYD déconnecté`, 'warn');
      }
    });

    window.cydDeck.onOBSStatus((obs) => {
      if (obs.connected) {
        this.obsLed.classList.add('active');
        this.obsStatusText.textContent = 'Connecté v5';
        this.logTerminal(`[OBS] Connecté à OBS Studio v5. Scène: ${obs.state.currentScene}`, 'info');
      } else {
        this.obsLed.classList.remove('active');
        this.obsStatusText.textContent = 'Déconnecté';
      }
    });

    window.cydDeck.onSystemStats((stats) => {
      this.cpuVal.textContent = `${stats.cpuUsage}%`;
      this.cpuBar.style.width = `${stats.cpuUsage}%`;
      this.ramVal.textContent = `${stats.memUsage}%`;
      this.ramBar.style.width = `${stats.memUsage}%`;
    });

    window.cydDeck.onCYDEvent((event) => {
      if (event.type === 'touch') {
        this.logTerminal(`[CYD TOUCH] Touche physique #${event.buttonIndex}: "${event.button.label}"`, 'touch');
        this.animateVirtualButtonPress(event.buttonIndex);
      }
    });

    window.cydDeck.onPageChanged((pageIdx) => {
      this.renderPagesTabs();
      this.renderVirtualScreen();
      this.selectButton(0);
      this.logTerminal(`[CYD NAV] Navigation automatique vers Page ${pageIdx + 1}`, 'info');
    });

    // Button Inspector events
    this.selPlugin.addEventListener('change', () => this.handlePluginChange());
    this.selAction.addEventListener('change', () => this.handleActionChange());
    this.btnSaveButtonConfig.addEventListener('click', () => this.saveCurrentButton());
    this.btnTestButtonAction.addEventListener('click', () => this.testCurrentAction());

    // Color Pickers
    this.colorPresetsRow.querySelectorAll('.color-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        this.colorPresetsRow.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
        dot.classList.add('active');
        this.selectedColor = dot.getAttribute('data-color');
        this.inpCustomColor.value = this.selectedColor;
        this.updateLivePreview();
      });
    });

    this.inpCustomColor.addEventListener('input', (e) => {
      this.selectedColor = e.target.value;
      this.colorPresetsRow.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
      this.updateLivePreview();
    });

    // Real-time text preview
    this.inpBtnLabel.addEventListener('input', () => this.updateLivePreview());
    this.inpBtnSub.addEventListener('input', () => this.updateLivePreview());

    // Hardware Buttons
    this.btnConnectSerial.addEventListener('click', async () => {
      this.btnConnectSerial.disabled = true;
      this.btnConnectSerial.textContent = 'Scan...';
      const ports = await window.cydDeck.listSerialPorts();
      const target = ports.find(p => p.isLikelyESP32) || ports[0];
      if (target) {
        const res = await window.cydDeck.connectSerial(target.path, 115200);
        if (!res.success) {
          alert('Erreur de connexion série: ' + (res.error || 'Port occupé'));
        }
      } else {
        alert('Aucun port COM trouvé. Branchez votre ESP32 CYD avec un câble de données USB.');
      }
      this.btnConnectSerial.disabled = false;
      this.btnConnectSerial.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> Scanner`;
    });

    this.btnSyncCYD.addEventListener('click', async () => {
      await window.cydDeck.syncCYD();
      this.logTerminal('[SYNC] Synchronisation manuelle envoyée au CYD.', 'info');
    });

    this.brightnessSlider.addEventListener('input', (e) => {
      const val = e.target.value;
      this.brightnessVal.textContent = `${val}%`;
      window.cydDeck.setBrightness(val);
    });

    this.btnClearTerminal.addEventListener('click', () => {
      this.eventTerminalLogs.innerHTML = '';
    });

    // OBS Modal
    this.btnConfigOBS.addEventListener('click', () => {
      this.inpObsAddress.value = this.config.settings.obsAddress || 'ws://127.0.0.1:4455';
      this.inpObsPassword.value = this.config.settings.obsPassword || '';
      this.obsModalFeedback.textContent = '';
      this.obsModal.style.display = 'flex';
    });

    this.btnCloseObsModal.addEventListener('click', () => { this.obsModal.style.display = 'none'; });
    this.btnCancelObs.addEventListener('click', () => { this.obsModal.style.display = 'none'; });

    this.btnSaveConnectObs.addEventListener('click', async () => {
      this.obsModalFeedback.textContent = 'Connexion à OBS en cours...';
      this.obsModalFeedback.style.color = '#38bdf8';
      const res = await window.cydDeck.connectOBS(this.inpObsAddress.value.trim(), this.inpObsPassword.value);
      if (res.success) {
        this.obsModalFeedback.textContent = 'Connecté avec succès !';
        this.obsModalFeedback.style.color = '#22c55e';
        setTimeout(() => { this.obsModal.style.display = 'none'; }, 800);
      } else {
        this.obsModalFeedback.textContent = `Échec: ${res.error}. Vérifiez le port WebSocket dans OBS (4455).`;
        this.obsModalFeedback.style.color = '#ef4444';
      }
    });

    // Add page
    this.btnAddPage.addEventListener('click', () => {
      const profile = this.config.profiles[this.config.activeProfile];
      const newPageIdx = profile.pages.length;
      const newPage = {
        id: `page_${Date.now()}`,
        name: `📄 Page ${newPageIdx + 1}`,
        buttons: Array.from({ length: 6 }, (_, i) => ({
          id: i,
          label: `TOUCHE ${i + 1}`,
          sub: '',
          icon: 'square',
          bgColor: '#1e293b',
          textColor: '#ffffff',
          pluginId: 'system',
          action: 'media_play_pause',
          params: {}
        }))
      };
      profile.pages.push(newPage);
      window.cydDeck.saveConfig(this.config);
      this.renderPagesTabs();
      this.switchPage(newPageIdx);
    });
  }

  renderIconPicker() {
    this.iconPickerGrid.innerHTML = '';
    for (const [key, svg] of Object.entries(ICONS)) {
      const item = document.createElement('div');
      item.className = `icon-choice ${key === this.selectedIcon ? 'active' : ''}`;
      item.innerHTML = svg;
      item.title = key;
      item.addEventListener('click', () => {
        this.iconPickerGrid.querySelectorAll('.icon-choice').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        this.selectedIcon = key;
        this.updateLivePreview();
      });
      this.iconPickerGrid.appendChild(item);
    }
  }

  getActivePage() {
    const profile = this.config.profiles[this.config.activeProfile];
    return profile.pages[profile.currentPage] || profile.pages[0];
  }

  renderPagesTabs() {
    const profile = this.config.profiles[this.config.activeProfile];
    this.pagesTabContainer.innerHTML = '';

    profile.pages.forEach((page, idx) => {
      const btn = document.createElement('button');
      btn.className = `page-tab-btn ${idx === profile.currentPage ? 'active' : ''}`;
      btn.innerHTML = `${page.name}`;
      btn.addEventListener('click', () => this.switchPage(idx));
      this.pagesTabContainer.appendChild(btn);
    });
  }

  async switchPage(pageIdx) {
    await window.cydDeck.setActivePage(pageIdx);
    this.config = await window.cydDeck.getConfig();
    this.renderPagesTabs();
    this.renderVirtualScreen();
    this.selectButton(0);
  }

  renderVirtualScreen() {
    const activePage = this.getActivePage();
    this.cydVirtualScreen.innerHTML = '';

    activePage.buttons.forEach((btnData, idx) => {
      const btnEl = document.createElement('div');
      btnEl.className = `cyd-button ${idx === this.selectedButtonIndex ? 'selected' : ''}`;
      btnEl.id = `virtualBtn_${idx}`;
      btnEl.style.backgroundColor = btnData.bgColor || '#1e293b';
      btnEl.style.color = btnData.textColor || '#ffffff';

      const iconSvg = ICONS[btnData.icon] || ICONS['square'];
      btnEl.innerHTML = `
        <div class="cyd-btn-icon-wrapper">${iconSvg}</div>
        <div class="cyd-btn-label">${btnData.label || ''}</div>
        <div class="cyd-btn-sub">${btnData.sub || ''}</div>
      `;

      // Click: select for inspection AND test action
      btnEl.addEventListener('click', () => {
        this.selectButton(idx);
        this.testVirtualButton(idx, btnData);
      });

      this.cydVirtualScreen.appendChild(btnEl);
    });
  }

  selectButton(idx) {
    this.selectedButtonIndex = idx;
    const activePage = this.getActivePage();
    const btnData = activePage.buttons[idx];

    // Highlight on virtual screen
    this.cydVirtualScreen.querySelectorAll('.cyd-button').forEach((b, i) => {
      b.classList.toggle('selected', i === idx);
    });

    this.inspectorTitle.textContent = `Édition de la touche #${idx + 1}`;
    this.inspectorPageTag.textContent = activePage.name;

    // Populate inputs
    this.inpBtnLabel.value = btnData.label || '';
    this.inpBtnSub.value = btnData.sub || '';

    // Color
    this.selectedColor = btnData.bgColor || '#1e293b';
    this.inpCustomColor.value = this.selectedColor;
    this.colorPresetsRow.querySelectorAll('.color-dot').forEach(dot => {
      dot.classList.toggle('active', dot.getAttribute('data-color') === this.selectedColor);
    });

    // Icon
    this.selectedIcon = btnData.icon || 'square';
    this.iconPickerGrid.querySelectorAll('.icon-choice').forEach(choice => {
      choice.classList.toggle('active', choice.title === this.selectedIcon);
    });

    // Plugin & Action
    this.selPlugin.value = btnData.pluginId || 'system';
    this.handlePluginChange(btnData.action, btnData.params);
  }

  handlePluginChange(defaultAction = null, defaultParams = {}) {
    const pluginId = this.selPlugin.value;
    const pluginData = this.plugins[pluginId];
    this.selAction.innerHTML = '';

    if (pluginData && pluginData.actions) {
      pluginData.actions.forEach(act => {
        const opt = document.createElement('option');
        opt.value = act.id;
        opt.textContent = act.label;
        this.selAction.appendChild(opt);
      });
      if (defaultAction) {
        this.selAction.value = defaultAction;
      }
    }

    this.handleActionChange(defaultParams);
  }

  handleActionChange(defaultParams = {}) {
    const pluginId = this.selPlugin.value;
    const actionId = this.selAction.value;
    const pluginData = this.plugins[pluginId];
    this.dynamicParamsContainer.innerHTML = '';

    if (!pluginData) return;
    const action = pluginData.actions.find(a => a.id === actionId);
    if (!action || !action.params || action.params.length === 0) return;

    action.params.forEach(param => {
      const group = document.createElement('div');
      group.className = 'form-group';

      const label = document.createElement('label');
      label.className = 'form-label';
      label.textContent = param.name || 'Paramètre';
      group.appendChild(label);

      if (param.type === 'select' && param.options && param.options.length > 0) {
        const select = document.createElement('select');
        select.className = 'form-select';
        select.id = `dynParam_${param.name}`;
        param.options.forEach(optVal => {
          const opt = document.createElement('option');
          opt.value = optVal;
          opt.textContent = optVal;
          select.appendChild(opt);
        });
        if (defaultParams[param.name]) select.value = defaultParams[param.name];
        group.appendChild(select);
      } else {
        const input = document.createElement('input');
        input.type = param.type === 'number' ? 'number' : 'text';
        input.className = 'form-input';
        input.id = `dynParam_${param.name}`;
        input.placeholder = param.placeholder || '';
        if (defaultParams[param.name] !== undefined) input.value = defaultParams[param.name];
        group.appendChild(input);
      }

      this.dynamicParamsContainer.appendChild(group);
    });
  }

  updateLivePreview() {
    const btnEl = document.getElementById(`virtualBtn_${this.selectedButtonIndex}`);
    if (!btnEl) return;

    const label = this.inpBtnLabel.value || '';
    const sub = this.inpBtnSub.value || '';
    const iconSvg = ICONS[this.selectedIcon] || ICONS['square'];

    btnEl.style.backgroundColor = this.selectedColor;
    btnEl.innerHTML = `
      <div class="cyd-btn-icon-wrapper">${iconSvg}</div>
      <div class="cyd-btn-label">${label}</div>
      <div class="cyd-btn-sub">${sub}</div>
    `;
  }

  async saveCurrentButton() {
    const activePage = this.getActivePage();
    const profile = this.config.profiles[this.config.activeProfile];
    const pageIndex = profile.currentPage;

    // Collect dynamic params
    const pluginId = this.selPlugin.value;
    const actionId = this.selAction.value;
    const pluginData = this.plugins[pluginId];
    const action = pluginData?.actions.find(a => a.id === actionId);
    const params = {};

    if (action && action.params) {
      action.params.forEach(p => {
        const el = document.getElementById(`dynParam_${p.name}`);
        if (el) params[p.name] = el.value;
      });
    }

    const buttonData = {
      id: this.selectedButtonIndex,
      label: this.inpBtnLabel.value.trim(),
      sub: this.inpBtnSub.value.trim(),
      icon: this.selectedIcon,
      bgColor: this.selectedColor,
      textColor: '#ffffff',
      pluginId,
      action: actionId,
      params
    };

    const res = await window.cydDeck.saveButtonConfig(pageIndex, this.selectedButtonIndex, buttonData);
    if (res.success) {
      this.config = await window.cydDeck.getConfig();
      this.renderVirtualScreen();
      this.selectButton(this.selectedButtonIndex);
      this.logTerminal(`[SAVE] Touche #${this.selectedButtonIndex + 1} ("${buttonData.label}") enregistrée et synchronisée sur l'ESP32.`, 'info');
    }
  }

  async testVirtualButton(idx, btnData) {
    this.animateVirtualButtonPress(idx);
    this.logTerminal(`[CLIQUÉ] Touche virtuelle #${idx + 1} (${btnData.label}) -> Action: ${btnData.pluginId}.${btnData.action}`, 'touch');
    const res = await window.cydDeck.executeAction(btnData);
    if (!res.success && res.error) {
      this.logTerminal(`[ERREUR] ${res.error}`, 'error');
    }
  }

  async testCurrentAction() {
    const activePage = this.getActivePage();
    const btnData = activePage.buttons[this.selectedButtonIndex];
    if (btnData) {
      await this.testVirtualButton(this.selectedButtonIndex, btnData);
    }
  }

  animateVirtualButtonPress(idx) {
    const btnEl = document.getElementById(`virtualBtn_${idx}`);
    if (btnEl) {
      btnEl.classList.add('pressed');
      setTimeout(() => btnEl.classList.remove('pressed'), 200);
    }
  }

  logTerminal(msg, type = 'line') {
    const line = document.createElement('div');
    line.className = `term-line ${type}`;
    const time = new Date().toLocaleTimeString();
    line.textContent = `[${time}] ${msg}`;
    this.eventTerminalLogs.appendChild(line);
    this.eventTerminalLogs.scrollTop = this.eventTerminalLogs.scrollHeight;
  }
}

// Start App when DOM ready
window.addEventListener('DOMContentLoaded', () => {
  const app = new CYDStudioApp();
  app.start();
});
