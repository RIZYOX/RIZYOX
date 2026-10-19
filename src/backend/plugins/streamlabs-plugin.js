const { EventEmitter } = require('events');
const WebSocket = require('ws');

class StreamlabsPlugin extends EventEmitter {
  constructor() {
    super();
    this.id = 'streamlabs';
    this.name = 'Streamlabs Desktop';
    this.ws = null;
    this.isConnected = false;
    this.token = '';
    this.port = 59650;
    this.reqId = 1;
    this.state = {
      streaming: false,
      recording: false,
      currentScene: 'Default'
    };
  }

  connect(token = '', port = 59650) {
    this.token = token;
    this.port = port;

    return new Promise((resolve) => {
      try {
        this.ws = new WebSocket(`ws://127.0.0.1:${this.port}/api`);

        this.ws.on('open', () => {
          this.isConnected = true;
          this.emit('connectionChanged', true);

          // Authenticate with Streamlabs token if provided
          if (this.token) {
            this.sendRpc('TcpServerService', 'auth', [this.token]);
          }

          resolve({ success: true });
        });

        this.ws.on('message', (data) => {
          try {
            const res = JSON.parse(data.toString());
            // Update state
            this.emit('stateChanged', this.state);
          } catch (_) {}
        });

        this.ws.on('close', () => {
          this.isConnected = false;
          this.ws = null;
        });

        this.ws.on('error', (err) => {
          this.isConnected = false;
          resolve({ success: false, error: err.message });
        });
      } catch (err) {
        resolve({ success: false, error: err.message });
      }
    });
  }

  sendRpc(resource, method, args = []) {
    return new Promise((resolve) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        // Try quick connection
        this.connect(this.token, this.port).then(conn => {
          if (!conn.success) {
            return resolve({ success: false, error: 'Streamlabs Desktop n\'est pas lancé ou port 59650 inaccessible.' });
          }
          this._dispatchRpc(resource, method, args, resolve);
        });
        return;
      }
      this._dispatchRpc(resource, method, args, resolve);
    });
  }

  _dispatchRpc(resource, method, args, resolve) {
    const id = ++this.reqId;
    const msg = {
      jsonrpc: '2.0',
      id,
      method,
      params: {
        resource,
        args
      }
    };
    try {
      this.ws.send(JSON.stringify(msg));
      resolve({ success: true });
    } catch (e) {
      resolve({ success: false, error: e.message });
    }
  }

  async executeAction(action, params = {}) {
    switch (action) {
      case 'toggle_stream':
        this.state.streaming = !this.state.streaming;
        this.emit('stateChanged', this.state);
        return await this.sendRpc('StreamingService', 'toggleStreaming');

      case 'toggle_record':
        this.state.recording = !this.state.recording;
        this.emit('stateChanged', this.state);
        return await this.sendRpc('RecordingService', 'toggleRecording');

      case 'switch_scene':
        if (!params.sceneName) return { success: false, error: 'Nom de scène requis' };
        this.state.currentScene = params.sceneName;
        this.emit('stateChanged', this.state);
        return await this.sendRpc('ScenesService', 'makeSceneActive', [params.sceneName]);

      default:
        throw new Error(`Unknown Streamlabs action: ${action}`);
    }
  }

  getActionsList() {
    return [
      { id: 'toggle_stream', label: 'Stream: Lancer / Couper le Live', params: [] },
      { id: 'toggle_record', label: 'Enregistrement: Start / Stop', params: [] },
      { id: 'switch_scene', label: 'Changer de Scène', params: [{ name: 'sceneName', type: 'text', placeholder: 'Nom exact de la scène' }] }
    ];
  }
}

module.exports = new StreamlabsPlugin();
