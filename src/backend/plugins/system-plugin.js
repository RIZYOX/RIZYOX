const { EventEmitter } = require('events');
const windowsKeys = require('../../utils/windows-keys');

class SystemPlugin extends EventEmitter {
  constructor() {
    super();
    this.id = 'system';
    this.name = 'Système & Macros';
    this.isConnected = true;
  }

  async executeAction(action, params = {}) {
    switch (action) {
      // Media keys
      case 'media_play_pause':
        return await windowsKeys.sendMediaKey('play_pause');
      case 'media_next':
        return await windowsKeys.sendMediaKey('next');
      case 'media_prev':
        return await windowsKeys.sendMediaKey('prev');
      case 'media_vol_up':
        return await windowsKeys.sendMediaKey('vol_up');
      case 'media_vol_down':
        return await windowsKeys.sendMediaKey('vol_down');
      case 'media_mute':
        return await windowsKeys.sendMediaKey('mute');

      // Shortcuts & Macros
      case 'send_keys':
        if (!params.keys) throw new Error('Keys expression is required');
        return await windowsKeys.sendShortcut(params.keys);

      // Launchers
      case 'launch_app':
        if (!params.target) throw new Error('Target executable or URL is required');
        return await windowsKeys.launch(params.target);

      case 'run_command':
        if (!params.command) throw new Error('Command is required');
        return await windowsKeys.executeCommand(params.command);

      // Windows system actions
      case 'lock_pc':
        return await windowsKeys.executeCommand('rundll32.exe user32.dll,LockWorkStation');

      default:
        throw new Error(`Unknown System action: ${action}`);
    }
  }

  getActionsList() {
    return [
      { id: 'media_play_pause', label: 'Média: Play / Pause', params: [] },
      { id: 'media_next', label: 'Média: Piste Suivante', params: [] },
      { id: 'media_prev', label: 'Média: Piste Précédente', params: [] },
      { id: 'media_vol_up', label: 'Volume: Augmenter (+)', params: [] },
      { id: 'media_vol_down', label: 'Volume: Diminuer (-)', params: [] },
      { id: 'media_mute', label: 'Volume: Couper le son (Mute)', params: [] },
      { id: 'send_keys', label: 'Macro Clavier (Touches)', params: [{ name: 'keys', type: 'text', placeholder: '^c ou %{F4} ou {ENTER}' }] },
      { id: 'launch_app', label: 'Lancer Application / URL', params: [{ name: 'target', type: 'text', placeholder: 'spotify: ou code . ou https://...' }] },
      { id: 'run_command', label: 'Exécuter Commande Shell', params: [{ name: 'command', type: 'text', placeholder: 'shutdown /s /t 60' }] },
      { id: 'lock_pc', label: 'Verrouiller la session Windows', params: [] }
    ];
  }
}

module.exports = new SystemPlugin();
