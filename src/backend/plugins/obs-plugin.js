const { EventEmitter } = require('events');
const OBSWebSocket = require('obs-websocket-js').default || require('obs-websocket-js');

class ObsPlugin extends EventEmitter {
  constructor() {
    super();
    this.id = 'obs';
    this.name = 'OBS Studio';
    this.obs = new OBSWebSocket();
    this.isConnected = false;
    this.config = {
      address: 'ws://127.0.0.1:4455',
      password: ''
    };

    this.state = {
      isStreaming: false,
      isRecording: false,
      isRecordingPaused: false,
      currentScene: '',
      scenes: [],
      audioSources: {}
    };

    this.initListeners();
  }

  initListeners() {
    this.obs.on('ConnectionClosed', () => {
      this.isConnected = false;
      this.emit('connectionChanged', false);
      this.emit('stateChanged', this.state);
    });

    this.obs.on('StreamStateChanged', (data) => {
      this.state.isStreaming = data.outputActive;
      this.emit('stateChanged', this.state);
    });

    this.obs.on('RecordStateChanged', (data) => {
      this.state.isRecording = data.outputActive;
      this.state.isRecordingPaused = data.outputPaused || false;
      this.emit('stateChanged', this.state);
    });

    this.obs.on('CurrentProgramSceneChanged', (data) => {
      this.state.currentScene = data.sceneName;
      this.emit('stateChanged', this.state);
    });

    this.obs.on('InputMuteStateChanged', (data) => {
      this.state.audioSources[data.inputName] = data.inputMuted;
      this.emit('stateChanged', this.state);
    });
  }

  async connect(address = this.config.address, password = this.config.password) {
    this.config.address = address;
    this.config.password = password;

    try {
      await this.obs.connect(this.config.address, this.config.password || undefined);
      this.isConnected = true;
      
      // Fetch initial state
      await this.refreshState();
      this.emit('connectionChanged', true);
      return { success: true };
    } catch (err) {
      this.isConnected = false;
      this.emit('connectionChanged', false);
      return { success: false, error: err.message || 'Connection failed' };
    }
  }

  async disconnect() {
    if (this.isConnected) {
      await this.obs.disconnect();
      this.isConnected = false;
      this.emit('connectionChanged', false);
    }
  }

  async refreshState() {
    if (!this.isConnected) return;
    try {
      // Stream & Record Status
      const streamStatus = await this.obs.call('GetStreamStatus').catch(() => ({ outputActive: false }));
      const recordStatus = await this.obs.call('GetRecordStatus').catch(() => ({ outputActive: false, outputPaused: false }));
      this.state.isStreaming = streamStatus.outputActive;
      this.state.isRecording = recordStatus.outputActive;
      this.state.isRecordingPaused = recordStatus.outputPaused;

      // Scenes
      const sceneData = await this.obs.call('GetSceneList').catch(() => ({ scenes: [], currentProgramSceneName: '' }));
      this.state.scenes = sceneData.scenes.map(s => s.sceneName);
      this.state.currentScene = sceneData.currentProgramSceneName;

      // Audio inputs
      const inputs = await this.obs.call('GetInputList').catch(() => ({ inputs: [] }));
      for (const input of inputs.inputs) {
        try {
          const mute = await this.obs.call('GetInputMute', { inputName: input.inputName });
          this.state.audioSources[input.inputName] = mute.inputMuted;
        } catch (_) {}
      }

      this.emit('stateChanged', this.state);
    } catch (e) {
      console.warn('[OBS] State refresh error:', e.message);
    }
  }

  async executeAction(action, params = {}) {
    if (!this.isConnected) {
      throw new Error('OBS is not connected. Check WebSocket settings (Tools > WebSocket Server Settings).');
    }

    switch (action) {
      case 'toggle_stream':
        return await this.obs.call('ToggleStream');

      case 'toggle_record':
        return await this.obs.call('ToggleRecord');

      case 'pause_record':
        return await this.obs.call('ToggleRecordPause');

      case 'set_scene':
        if (!params.sceneName) throw new Error('Scene name is required');
        return await this.obs.call('SetCurrentProgramScene', { sceneName: params.sceneName });

      case 'toggle_mute':
        if (!params.sourceName) throw new Error('Source name is required');
        return await this.obs.call('ToggleInputMute', { inputName: params.sourceName });

      case 'save_replay_buffer':
        return await this.obs.call('SaveReplayBuffer');

      case 'take_screenshot':
        return await this.obs.call('SaveSourceScreenshot', {
          sourceName: this.state.currentScene,
          imageFormat: 'png',
          imageFilePath: params.path || ''
        });

      default:
        throw new Error(`Unknown OBS action: ${action}`);
    }
  }

  getActionsList() {
    return [
      { id: 'toggle_stream', label: 'Toggle Stream (Live)', params: [] },
      { id: 'toggle_record', label: 'Toggle Enregistrement', params: [] },
      { id: 'pause_record', label: 'Pause/Reprendre Record', params: [] },
      { id: 'set_scene', label: 'Changer de Scène', params: [{ name: 'sceneName', type: 'select', options: this.state.scenes }] },
      { id: 'toggle_mute', label: 'Toggle Mute Source Audio', params: [{ name: 'sourceName', type: 'select', options: Object.keys(this.state.audioSources) }] },
      { id: 'save_replay_buffer', label: 'Sauvegarder Replay Buffer', params: [] }
    ];
  }
}

module.exports = new ObsPlugin();
