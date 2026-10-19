const { EventEmitter } = require('events');
const { WebSocketServer } = require('ws');

class StreamDeckWSServer extends EventEmitter {
  constructor() {
    super();
    this.wss = null;
    this.clients = new Set();
    this.port = 8765;
  }

  start(port = 8765) {
    this.port = port;
    try {
      this.wss = new WebSocketServer({ port: this.port });

      this.wss.on('connection', (ws, req) => {
        const clientIp = req.socket.remoteAddress;
        console.log(`[WebSocket] Client CYD/Web connecté: ${clientIp}`);
        this.clients.add(ws);
        this.emit('clientConnected', { ip: clientIp, total: this.clients.size });

        ws.on('message', (message) => {
          try {
            const data = JSON.parse(message.toString());
            this.emit('message', data, ws);
          } catch (e) {
            console.warn('[WebSocket] Invalid JSON from client:', message.toString());
          }
        });

        ws.on('close', () => {
          this.clients.delete(ws);
          console.log(`[WebSocket] Client déconnecté (${this.clients.size} restants)`);
          this.emit('clientDisconnected', { total: this.clients.size });
        });

        ws.on('error', (err) => {
          console.error('[WebSocket] Error:', err.message);
        });

        // Send welcome / ready ping
        ws.send(JSON.stringify({ cmd: 'HANDSHAKE', status: 'ready', server: 'CYD-Deck Studio' }));
      });

      console.log(`[WebSocket] Serveur actif sur ws://0.0.0.0:${this.port}`);
    } catch (err) {
      console.error(`[WebSocket] Failed to start server on port ${this.port}:`, err.message);
    }
  }

  stop() {
    if (this.wss) {
      this.wss.close();
      this.clients.clear();
      this.wss = null;
    }
  }

  broadcast(data) {
    const jsonStr = typeof data === 'string' ? data : JSON.stringify(data);
    for (const client of this.clients) {
      if (client.readyState === 1) { // OPEN
        client.send(jsonStr);
      }
    }
  }
}

module.exports = new StreamDeckWSServer();
