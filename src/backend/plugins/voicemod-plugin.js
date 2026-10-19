const { EventEmitter } = require('events');
const WebSocket = require('ws');

class VoicemodPlugin extends EventEmitter {
  constructor() {
    super();
    this.id = 'voicemod';
    this.name = 'Voicemod';
    this.ws = null;
    this.isConnected = false;
    this.reconnectTimer = null;
    this.state = {
      voiceChangerActive: true,
      hearMyVoiceActive: false,
      isMuted: false
    };

    this.connect();
  }

  connect() {
    try {
      this.ws = new WebSocket('ws://127.0.0.1:59129/v1/');

      this.ws.on('open', () => {
        this.isConnected = true;
        console.log('[Voicemod] Connecté au serveur Voicemod Desktop (Port 59129)');
        this.emit('connectionChanged', true);

        // Handshake registration
        this.ws.send(JSON.stringify({
          action: 'registerClient',
          id: 'reg_client',
          payload: { clientKey: 'cyd-deck-studio' }
        }));
      });

      this.ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.action === 'voiceChangerDisabledEvent') {
            this.state.voiceChangerActive = false;
          } else if (msg.action === 'voiceChangerEnabledEvent') {
            this.state.voiceChangerActive = true;
          }
          this.emit('stateChanged', this.state);
        } catch (_) {}
      });

      this.ws.on('close', () => {
        this.isConnected = false;
        this.ws = null;
        this.scheduleReconnect();
      });

      this.ws.on('error', () => {
        this.isConnected = false;
        if (this.ws) {
          try { this.ws.close(); } catch (_) {}
          this.ws = null;
        }
        this.scheduleReconnect();
      });
    } catch (_) {
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.isConnected) this.connect();
    }, 10000);
  }

  sendVoicemodCommand(action, payload = {}) {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        // Try fast connect
        try {
          const tempWs = new WebSocket('ws://127.0.0.1:59129/v1/');
          tempWs.on('open', () => {
            tempWs.send(JSON.stringify({ action: 'registerClient', payload: { clientKey: 'cyd-deck-studio' } }));
            tempWs.send(JSON.stringify({ action, id: `req_${Date.now()}`, payload }));
            setTimeout(() => {
              try { tempWs.close(); } catch (_) {}
              resolve({ success: true });
            }, 80);
          });
          tempWs.on('error', () => {
            resolve({ success: false, error: 'Voicemod n\'est pas lancé sur votre PC.' });
          });
          return;
        } catch (e) {
          return resolve({ success: false, error: 'Voicemod non joignable.' });
        }
      }

      this.ws.send(JSON.stringify({ action, id: `req_${Date.now()}`, payload }));
      resolve({ success: true });
    });
  }

  async executeAction(action, params = {}) {
    switch (action) {
      case 'toggle_voice':
        this.state.voiceChangerActive = !this.state.voiceChangerActive;
        this.emit('stateChanged', this.state);
        return await this.sendVoicemodCommand('toggleVoiceChanger');

      case 'toggle_hear':
        this.state.hearMyVoiceActive = !this.state.hearMyVoiceActive;
        this.emit('stateChanged', this.state);
        return await this.sendVoicemodCommand('toggleHearMyVoice');

      case 'toggle_mute':
        this.state.isMuted = !this.state.isMuted;
        this.emit('stateChanged', this.state);
        return await this.sendVoicemodCommand('toggleMuteMic');

      case 'select_voice':
        return await this.sendVoicemodCommand('loadVoice', {
          voiceID: params.voiceId || 'clean'
        });

      case 'stop_all_sounds':
        return await this.sendVoicemodCommand('stopAllMemeSounds');

      case 'play_meme':
        return await this.sendVoicemodCommand('playMeme', {
          FileName: params.soundName || ''
        });

      default:
        throw new Error(`Unknown Voicemod action: ${action}`);
    }
  }

  getActionsList() {
    return [
      { id: 'toggle_voice', label: 'Voix: On / Off (Voice Changer)', params: [] },
      { id: 'toggle_hear', label: 'M\'entendre: On / Off (Hear Myself)', params: [] },
      { id: 'toggle_mute', label: 'Micro Voicemod: Mute / Unmute', params: [] },
      { id: 'stop_all_sounds', label: 'Soundboard: Stop tous les sons 🛑', params: [] },
      {
        id: 'select_voice',
        label: 'Changer de Voix',
        params: [
          {
            name: 'voiceId',
            type: 'select',
            options: ['clean', 'cave', 'titan', 'magicchords', 'baby', 'robot', 'radio', 'custom']
          }
        ]
      }
    ];
  }
}

module.exports = new VoicemodPlugin();
