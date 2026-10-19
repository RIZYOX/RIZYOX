const fs = require('fs');
const path = require('path');

class ConfigStore {
  constructor() {
    this.configPath = path.join(process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Preferences' : '/var/local'), 'cyd-deck-studio', 'config.json');
    this.config = this.getDefaultConfig();
    this.load();
  }

  getDefaultConfig() {
    return {
      version: '1.0.0',
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
      activeProfile: 'Default',
      profiles: {
        'Default': {
          currentPage: 0,
          pages: [
            {
              id: 'page_stream',
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
                  label: 'SCENE 1',
                  sub: 'Jeu / Main',
                  icon: 'monitor',
                  bgColor: '#312e81',
                  textColor: '#ffffff',
                  pluginId: 'obs',
                  action: 'set_scene',
                  params: { sceneName: 'Gaming' }
                },
                {
                  id: 4,
                  label: 'REPLAY',
                  sub: 'Clip 30s',
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
              id: 'page_media',
              name: '🎵 Médias & Système',
              buttons: [
                {
                  id: 0,
                  label: 'PLAY/PAUSE',
                  sub: 'Spotify/PC',
                  icon: 'play',
                  bgColor: '#064e3b',
                  textColor: '#ffffff',
                  pluginId: 'system',
                  action: 'media_play_pause',
                  params: {}
                },
                {
                  id: 1,
                  label: 'PISTE SUIV.',
                  sub: 'Next track',
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
                  sub: 'Windows',
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
