const { EventEmitter } = require('events');
const windowsKeys = require('../../utils/windows-keys');

class DiscordPlugin extends EventEmitter {
  constructor() {
    super();
    this.id = 'discord';
    this.name = 'Discord';
    this.isConnected = true;
    this.state = {
      isMuted: false,
      isDeafened: false
    };
  }

  async executeAction(action, params = {}) {
    switch (action) {
      case 'toggle_mute':
        // Default Discord global hotkey or custom user hotkey
        this.state.isMuted = !this.state.isMuted;
        this.emit('stateChanged', this.state);
        // By default on Discord, standard shortcut or simulate key
        return await windowsKeys.sendShortcut(params.hotkey || '^+m'); // Ctrl+Shift+M

      case 'toggle_deaf':
        this.state.isDeafened = !this.state.isDeafened;
        this.emit('stateChanged', this.state);
        return await windowsKeys.sendShortcut(params.hotkey || '^+d'); // Ctrl+Shift+D

      case 'open_discord':
        return await windowsKeys.launch('discord:');

      default:
        throw new Error(`Unknown Discord action: ${action}`);
    }
  }

  getActionsList() {
    return [
      { id: 'toggle_mute', label: 'Micro: Mute / Unmute', params: [{ name: 'hotkey', type: 'text', placeholder: 'Raccourci Discord (Défaut: ^+m)' }] },
      { id: 'toggle_deaf', label: 'Casque: Deafen / Activer', params: [{ name: 'hotkey', type: 'text', placeholder: 'Raccourci Discord (Défaut: ^+d)' }] },
      { id: 'open_discord', label: 'Ouvrir Discord', params: [] }
    ];
  }
}

module.exports = new DiscordPlugin();
