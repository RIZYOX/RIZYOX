const { EventEmitter } = require('events');
const { SerialPort } = require('serialport');

class SerialManager extends EventEmitter {
  constructor() {
    super();
    this.port = null;
    this.currentPortPath = null;
    this.baudRate = 115200;
    this.isConnected = false;
    this.reconnectTimer = null;
    this.rxBuffer = '';
  }

  async listAvailablePorts() {
    try {
      const ports = await SerialPort.list();
      return ports.map(p => ({
        path: p.path,
        manufacturer: p.manufacturer || 'Inconnu',
        friendlyName: p.friendlyName || p.path,
        isLikelyESP32: Boolean(
          (p.manufacturer && (p.manufacturer.includes('wch') || p.manufacturer.includes('Silicon') || p.manufacturer.includes('Espressif'))) ||
          (p.vendorId && (p.vendorId.toLowerCase().includes('1a86') || p.vendorId.toLowerCase().includes('10c4')))
        )
      }));
    } catch (err) {
      console.error('[Serial] Error listing ports:', err.message);
      return [];
    }
  }

  async autoConnect(preferredPath = 'AUTO', baud = 115200) {
    this.baudRate = baud;
    const ports = await this.listAvailablePorts();

    let targetPort = null;
    if (preferredPath !== 'AUTO') {
      targetPort = ports.find(p => p.path === preferredPath);
    }

    if (!targetPort) {
      // Find first likely ESP32 or first available COM
      targetPort = ports.find(p => p.isLikelyESP32) || ports[0];
    }

    if (!targetPort) {
      return { success: false, message: 'Aucun port COM trouvé. Connectez votre ESP32 CYD en USB.' };
    }

    return this.connect(targetPort.path, this.baudRate);
  }

  connect(path, baudRate = 115200) {
    if (this.port && this.port.isOpen) {
      this.disconnect();
    }

    this.currentPortPath = path;
    this.baudRate = baudRate;

    return new Promise((resolve) => {
      try {
        this.port = new SerialPort({
          path,
          baudRate: parseInt(baudRate, 10),
          autoOpen: false
        });

        this.port.open((err) => {
          if (err) {
            console.error(`[Serial] Erreur d'ouverture de ${path}:`, err.message);
            this.isConnected = false;
            this.emit('connectionChanged', { connected: false, error: err.message, path });
            this.scheduleReconnect();
            return resolve({ success: false, error: err.message });
          }

          this.isConnected = true;
          this.emit('connectionChanged', { connected: true, path });
          console.log(`[Serial] Connecté avec succès à ${path} (${baudRate} bauds)`);

          this.port.on('data', (chunk) => {
            this.handleData(chunk);
          });

          this.port.on('close', () => {
            console.warn(`[Serial] Port ${path} fermé`);
            this.isConnected = false;
            this.emit('connectionChanged', { connected: false, path });
            this.scheduleReconnect();
          });

          this.port.on('error', (portErr) => {
            console.error(`[Serial] Erreur sur ${path}:`, portErr.message);
            this.emit('error', portErr);
          });

          resolve({ success: true, path });
        });
      } catch (e) {
        resolve({ success: false, error: e.message });
      }
    });
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.port && this.port.isOpen) {
      this.port.close();
    }
    this.isConnected = false;
    this.emit('connectionChanged', { connected: false, path: this.currentPortPath });
  }

  scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      if (!this.isConnected && this.currentPortPath) {
        console.log('[Serial] Tentative de reconnexion automatique...');
        await this.autoConnect(this.currentPortPath, this.baudRate);
      }
    }, 4000);
  }

  handleData(chunk) {
    this.rxBuffer += chunk.toString('utf8');

    // Split messages on newlines
    const lines = this.rxBuffer.split('\n');
    this.rxBuffer = lines.pop(); // Keep partial line

    for (const line of lines) {
      const clean = line.trim();
      if (!clean) continue;

      try {
        const payload = JSON.parse(clean);
        this.emit('message', payload);
      } catch (_) {
        // Raw text line (e.g. boot logs from ESP32)
        this.emit('log', clean);
      }
    }
  }

  send(data) {
    if (!this.isConnected || !this.port || !this.port.isOpen) {
      return false;
    }

    const jsonStr = typeof data === 'string' ? data : JSON.stringify(data);
    this.port.write(jsonStr + '\n', (err) => {
      if (err) {
        console.error('[Serial] Send error:', err.message);
      }
    });
    return true;
  }
}

module.exports = new SerialManager();
