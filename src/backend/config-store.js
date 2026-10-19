const fs = require('fs');
const path = require('path');

class ConfigStore {
  constructor() {
    this.configPath = path.join(
      process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Preferences' : '/var/local'),
      'cyd-deck-studio',
      'config.json'
    );
    this.config = this.getDefaultConfig();
    this.load();
  }

  getDefaultConfig() {
    return {
      version: '1.1.0',
      settings: {
        serialPort: 'AUTO',
        baudRate: 115200,
        wsPort: 8765,
        gridRows: 2,
        gridCols: 3,
        brightness: 100,
        sleepOnLock: true,
        obsAddress: 'ws://127.0.0.1:4455',
        obsPassword: ''
      },
      activeProfile: '🔴 Streaming & Live',
      customIcons: [],
      profiles: {
        '🔴 Streaming & Live': {
          currentPage: 0,
          pages: [
            {
              id: 'page_stream_main',
              name: '🔴 Studio & Live',
              buttons: [
                {
                  id: 0,
                  label: 'REC OBS',
                  sub: 'Toggle',
                  icon: 'record',
                  bgColor: '#7f1d1d',
                  textColor: '#ffffff',
                  pluginId: 'obs',
                  action: 'toggle_record',
                  params: {}
                },
                {
                  id: 1,
                  label: 'STREAM',
                  sub: 'Live',
                  icon: 'radio',
                  bgColor: '#1e3a8a',
                  textColor: '#ffffff',
                  pluginId: 'obs',
                  action: 'toggle_stream',
                  params: {}
                },
                {
                  id: 2,
                  label: 'MICRO',
                  sub: 'Mute/On',
                  icon: 'mic',
                  bgColor: '#14532d',
                  textColor: '#ffffff',
                  pluginId: 'discord',
                  action: 'toggle_mute',
                  params: {}
                },
                {
                  id: 3,
                  label: 'SCÈNE JEU',
                  sub: 'OBS',
                  icon: 'gamepad',
                  bgColor: '#312e81',
                  textColor: '#ffffff',
                  pluginId: 'obs',
                  action: 'set_scene',
                  params: { sceneName: 'Gaming' }
                },
                {
                  id: 4,
                  label: 'REPLAY 30s',
                  sub: 'Buffer',
                  icon: 'film',
                  bgColor: '#701a75',
                  textColor: '#ffffff',
                  pluginId: 'obs',
                  action: 'save_replay_buffer',
                  params: {}
                },
                {
                  id: 5,
                  label: 'PAGE SUIV.',
                  sub: 'Médias ➡️',
                  icon: 'arrow-right',
                  bgColor: '#18181b',
                  textColor: '#60a5fa',
                  pluginId: 'internal',
                  action: 'next_page',
                  params: {}
                }
              ]
            },
            {
              id: 'page_stream_audio',
              name: '🎵 Audio & Médias',
              buttons: [
                {
                  id: 0,
                  label: 'PLAY/PAUSE',
                  sub: 'Spotify',
                  icon: 'play',
                  bgColor: '#064e3b',
                  textColor: '#ffffff',
                  pluginId: 'system',
                  action: 'media_play_pause',
                  params: {}
                },
                {
                  id: 1,
                  label: 'SUIVANT',
                  sub: 'Piste +1',
                  icon: 'skip-forward',
                  bgColor: '#1e293b',
                  textColor: '#ffffff',
                  pluginId: 'system',
                  action: 'media_next',
                  params: {}
                },
                {
                  id: 2,
                  label: 'MUTE SON',
                  sub: 'PC',
                  icon: 'volume-x',
                  bgColor: '#450a0a',
                  textColor: '#ffffff',
                  pluginId: 'system',
                  action: 'media_mute',
                  params: {}
                },
                {
                  id: 3,
                  label: 'VOL +',
                  sub: '+5 %',
                  icon: 'volume-2',
                  bgColor: '#1e293b',
                  textColor: '#ffffff',
                  pluginId: 'system',
                  action: 'media_vol_up',
                  params: {}
                },
                {
                  id: 4,
                  label: 'VOL -',
                  sub: '-5 %',
                  icon: 'volume-1',
                  bgColor: '#1e293b',
                  textColor: '#ffffff',
                  pluginId: 'system',
                  action: 'media_vol_down',
                  params: {}
                },
                {
                  id: 5,
                  label: 'PAGE PRÉC.',
                  sub: '⬅️ Studio',
                  icon: 'arrow-left',
                  bgColor: '#18181b',
                  textColor: '#60a5fa',
                  pluginId: 'internal',
                  action: 'prev_page',
                  params: {}
                }
              ]
            }
          ]
        },
        '💻 Dev & Productivité': {
          currentPage: 0,
          pages: [
            {
              id: 'page_dev_main',
              name: '💻 Dev Workflow',
              buttons: [
                {
                  id: 0,
                  label: 'VS CODE',
                  sub: 'Lancer',
                  icon: 'code',
                  bgColor: '#0284c7',
                  textColor: '#ffffff',
                  pluginId: 'system',
                  action: 'launch_app',
                  params: { target: 'code .' }
                },
                {
                  id: 1,
                  label: 'TERMINAL',
                  sub: 'PowerShell',
                  icon: 'terminal',
                  bgColor: '#0f172a',
                  textColor: '#38bdf8',
                  pluginId: 'system',
                  action: 'launch_app',
                  params: { target: 'wt.exe' }
                },
                {
                  id: 2,
                  label: 'GITHUB',
                  sub: 'Profil Web',
                  icon: 'github',
                  bgColor: '#18181b',
                  textColor: '#ffffff',
                  pluginId: 'system',
                  action: 'launch_app',
                  params: { target: 'https://github.com/RIZYOX' }
                },
                {
                  id: 3,
                  label: 'GIT STATUS',
                  sub: 'Shell',
                  icon: 'git-branch',
                  bgColor: '#c2410c',
                  textColor: '#ffffff',
                  pluginId: 'system',
                  action: 'run_command',
                  params: { command: 'git status' }
                },
                {
                  id: 4,
                  label: 'LOCK PC',
                  sub: 'Sécurité',
                  icon: 'lock',
                  bgColor: '#991b1b',
                  textColor: '#ffffff',
                  pluginId: 'system',
                  action: 'lock_pc',
                  params: {}
                },
                {
                  id: 5,
                  label: 'SPOTIFY',
                  sub: 'Play/Pause',
                  icon: 'music',
                  bgColor: '#059669',
                  textColor: '#ffffff',
                  pluginId: 'system',
                  action: 'media_play_pause',
                  params: {}
                }
              ]
            }
          ]
        },
        '🎮 Gaming & Discord': {
          currentPage: 0,
          pages: [
            {
              id: 'page_game_main',
              name: '🎮 Gaming & Comms',
              buttons: [
                {
                  id: 0,
                  label: 'MUTE DISCORD',
                  sub: 'Micro',
                  icon: 'mic-off',
                  bgColor: '#450a0a',
                  textColor: '#ffffff',
                  pluginId: 'discord',
                  action: 'toggle_mute',
                  params: {}
                },
                {
                  id: 1,
                  label: 'DEAFEN',
                  sub: 'Casque',
                  icon: 'headphones',
                  bgColor: '#581c87',
                  textColor: '#ffffff',
                  pluginId: 'discord',
                  action: 'toggle_deaf',
                  params: {}
                },
                {
                  id: 2,
                  label: 'DISCORD',
                  sub: 'Ouvrir',
                  icon: 'discord',
                  bgColor: '#4338ca',
                  textColor: '#ffffff',
                  pluginId: 'discord',
                  action: 'open_discord',
                  params: {}
                },
                {
                  id: 3,
                  label: 'CLIP INSTANT',
                  sub: 'Replay Buffer',
                  icon: 'camera',
                  bgColor: '#b45309',
                  textColor: '#ffffff',
                  pluginId: 'obs',
                  action: 'save_replay_buffer',
                  params: {}
                },
                {
                  id: 4,
                  label: 'MUTE SON',
                  sub: 'Urgence',
                  icon: 'volume-x',
                  bgColor: '#881337',
                  textColor: '#ffffff',
                  pluginId: 'system',
                  action: 'media_mute',
                  params: {}
                },
                {
                  id: 5,
                  label: 'PROFIL STREAM',
                  sub: 'Changer 🔄',
                  icon: 'refresh-cw',
                  bgColor: '#1e3a8a',
                  textColor: '#60a5fa',
                  pluginId: 'internal',
                  action: 'switch_profile',
                  params: { profileName: '🔴 Streaming & Live' }
                }
              ]
            }
          ]
        }
      }
    };
  }

  load() {
    try {
      if (fs.existsSync(this.configPath)) {
        const raw = fs.readFileSync(this.configPath, 'utf8');
        const parsed = JSON.parse(raw);
        this.config = { ...this.getDefaultConfig(), ...parsed };
        if (!this.config.customIcons) this.config.customIcons = [];
      } else {
        this.save();
      }
    } catch (err) {
      console.warn('[ConfigStore] Failed to read config, using defaults:', err.message);
    }
  }

  save() {
    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf8');
    } catch (err) {
      console.error('[ConfigStore] Failed to save config:', err.message);
    }
  }

  get(key) {
    return this.config[key];
  }

  set(key, val) {
    this.config[key] = val;
    this.save();
  }

  getProfilesList() {
    return Object.keys(this.config.profiles || {});
  }

  createProfile(name, template = 'blank') {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Le nom du profil ne peut pas être vide.');
    if (this.config.profiles[trimmed]) throw new Error('Un profil avec ce nom existe déjà.');

    let newProfileData;
    if (template === 'streaming') {
      newProfileData = JSON.parse(JSON.stringify(this.getDefaultConfig().profiles['🔴 Streaming & Live']));
    } else if (template === 'dev') {
      newProfileData = JSON.parse(JSON.stringify(this.getDefaultConfig().profiles['💻 Dev & Productivité']));
    } else if (template === 'gaming') {
      newProfileData = JSON.parse(JSON.stringify(this.getDefaultConfig().profiles['🎮 Gaming & Discord']));
    } else {
      // Blank 6-button profile
      newProfileData = {
        currentPage: 0,
        pages: [
          {
            id: `page_${Date.now()}`,
            name: '📄 Page 1',
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
          }
        ]
      };
    }

    this.config.profiles[trimmed] = newProfileData;
    this.config.activeProfile = trimmed;
    this.save();
    return { success: true, activeProfile: trimmed };
  }

  switchProfile(name) {
    if (!this.config.profiles[name]) {
      throw new Error(`Profil "${name}" introuvable.`);
    }
    this.config.activeProfile = name;
    this.save();
    return { success: true, activeProfile: name };
  }

  duplicateProfile(sourceName, newName) {
    const trimmed = newName.trim();
    if (!this.config.profiles[sourceName]) throw new Error(`Profil source "${sourceName}" introuvable.`);
    if (!trimmed) throw new Error('Le nom du nouveau profil ne peut pas être vide.');
    if (this.config.profiles[trimmed]) throw new Error('Un profil avec ce nom existe déjà.');

    this.config.profiles[trimmed] = JSON.parse(JSON.stringify(this.config.profiles[sourceName]));
    this.config.activeProfile = trimmed;
    this.save();
    return { success: true, activeProfile: trimmed };
  }

  deleteProfile(name) {
    const keys = Object.keys(this.config.profiles);
    if (keys.length <= 1) {
      throw new Error('Impossible de supprimer le dernier profil restant.');
    }
    delete this.config.profiles[name];
    if (this.config.activeProfile === name) {
      this.config.activeProfile = Object.keys(this.config.profiles)[0];
    }
    this.save();
    return { success: true, activeProfile: this.config.activeProfile };
  }

  // Custom Icon Management
  addCustomIcon(name, dataUrl) {
    if (!this.config.customIcons) this.config.customIcons = [];
    const iconId = `custom_${Date.now()}`;
    const newIcon = {
      id: iconId,
      name: name || 'Custom Icon',
      dataUrl,
      createdAt: Date.now()
    };
    this.config.customIcons.push(newIcon);
    this.save();
    return newIcon;
  }

  deleteCustomIcon(id) {
    if (!this.config.customIcons) return false;
    this.config.customIcons = this.config.customIcons.filter(i => i.id !== id);
    this.save();
    return true;
  }

  getActivePage() {
    const profile = this.config.profiles[this.config.activeProfile];
    if (!profile) return null;
    return profile.pages[profile.currentPage] || profile.pages[0];
  }

  setCurrentPage(pageIndex) {
    const profile = this.config.profiles[this.config.activeProfile];
    if (profile && profile.pages[pageIndex]) {
      profile.currentPage = pageIndex;
      this.save();
      return profile.pages[pageIndex];
    }
    return null;
  }
}

module.exports = new ConfigStore();
