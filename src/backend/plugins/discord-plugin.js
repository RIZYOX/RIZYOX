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
        this.state.isMuted = !this.state.isMuted;
        this.emit('stateChanged', this.state);
        // Intercepte globalement en arrière-plan (même en plein écran de jeu)
        return await windowsKeys.sendGlobalHotKey(params.hotkey || 'ctrl+shift+m');

      case 'toggle_deaf':
        this.state.isDeafened = !this.state.isDeafened;
        this.emit('stateChanged', this.state);
        return await windowsKeys.sendGlobalHotKey(params.hotkey || 'ctrl+shift+d');

      case 'open_discord':
        return await windowsKeys.launch('discord:');

      default:
        throw new Error(`Unknown Discord action: ${action}`);
    }
  }

  getActionsList() {
    return [
      {
        id: 'toggle_mute',
        label: 'Micro: Mute / Unmute (Global)',
        params: [
          { name: 'hotkey', type: 'text', placeholder: 'Défaut: ctrl+shift+m (ou f13)' }
        ]
      },
      {
        id: 'toggle_deaf',
        label: 'Casque: Deafen / Sourdine (Global)',
        params: [
          { name: 'hotkey', type: 'text', placeholder: 'Défaut: ctrl+shift+d (ou f14)' }
        ]
      },
      { id: 'open_discord', label: 'Ouvrir Discord', params: [] }
    ];
  }
}

module.exports = new DiscordPlugin();
