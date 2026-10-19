const { EventEmitter } = require('events');
const obsPlugin = require('./plugins/obs-plugin');
const discordPlugin = require('./plugins/discord-plugin');
const systemPlugin = require('./plugins/system-plugin');
const configStore = require('./config-store');

class PluginManager extends EventEmitter {
  constructor() {
    super();
    this.plugins = {
      obs: obsPlugin,
      discord: discordPlugin,
      system: systemPlugin
    };

    this.initPluginEvents();
  }

  initPluginEvents() {
    obsPlugin.on('stateChanged', (state) => {
      this.emit('pluginStateUpdate', { pluginId: 'obs', state });
    });

    obsPlugin.on('connectionChanged', (connected) => {
      this.emit('pluginConnectionUpdate', { pluginId: 'obs', connected });
    });

    discordPlugin.on('stateChanged', (state) => {
      this.emit('pluginStateUpdate', { pluginId: 'discord', state });
    });
  }

  async executeButtonAction(button) {
    if (!button || !button.pluginId) return;

    const { pluginId, action, params } = button;

    // Internal navigation & Profile actions
    if (pluginId === 'internal') {
      const profile = configStore.get('profiles')[configStore.get('activeProfile')];

      if (action === 'next_page' && profile) {
        const nextIdx = (profile.currentPage + 1) % profile.pages.length;
        configStore.setCurrentPage(nextIdx);
        this.emit('pageChanged', nextIdx);
        return { success: true, pageIndex: nextIdx };
      } else if (action === 'prev_page' && profile) {
        const prevIdx = (profile.currentPage - 1 + profile.pages.length) % profile.pages.length;
        configStore.setCurrentPage(prevIdx);
        this.emit('pageChanged', prevIdx);
        return { success: true, pageIndex: prevIdx };
      } else if (action === 'home_page' && profile) {
        configStore.setCurrentPage(0);
        this.emit('pageChanged', 0);
        return { success: true, pageIndex: 0 };
      } else if (action === 'go_to_page') {
        const targetIdx = parseInt(params.pageIndex, 10) || 0;
        configStore.setCurrentPage(targetIdx);
        this.emit('pageChanged', targetIdx);
        return { success: true, pageIndex: targetIdx };
      } else if (action === 'switch_profile') {
        if (params.profileName) {
          configStore.switchProfile(params.profileName);
          this.emit('profileChanged', params.profileName);
          return { success: true, profileName: params.profileName };
        }
      }
    }

    // External plugins
    const plugin = this.plugins[pluginId];
    if (!plugin) {
      console.warn(`[PluginManager] Unknown plugin: ${pluginId}`);
      return { success: false, error: `Plugin inconnu: ${pluginId}` };
    }

    try {
      const result = await plugin.executeAction(action, params);
      return { success: true, result };
    } catch (err) {
      console.error(`[PluginManager] Error executing ${pluginId}.${action}:`, err.message);
      return { success: false, error: err.message };
    }
  }

  getAllActions() {
    const list = {};
    for (const [id, plugin] of Object.entries(this.plugins)) {
      list[id] = {
        name: plugin.name,
        actions: plugin.getActionsList()
      };
    }

    // Internal navigation & profile switching
    const profilesList = configStore.getProfilesList();
    list['internal'] = {
      name: 'Navigation & Profils CYD',
      actions: [
        { id: 'next_page', label: 'Page Suivante ➡️', params: [] },
        { id: 'prev_page', label: 'Page Précédente ⬅️', params: [] },
        { id: 'home_page', label: 'Page Accueil 🏠', params: [] },
        { id: 'go_to_page', label: 'Aller à la page...', params: [{ name: 'pageIndex', type: 'number', placeholder: 'Numéro de page' }] },
        { id: 'switch_profile', label: 'Changer de Profil...', params: [{ name: 'profileName', type: 'select', options: profilesList }] }
      ]
    };

    return list;
  }
}

module.exports = new PluginManager();
