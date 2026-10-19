const { EventEmitter } = require('events');
const si = require('systeminformation');

class SystemMonitor extends EventEmitter {
  constructor() {
    super();
    this.intervalId = null;
    this.stats = {
      cpuUsage: 0,
      cpuTemp: 0,
      memUsage: 0,
      memUsedGb: 0,
      memTotalGb: 0,
      netRxSec: 0,
      netTxSec: 0,
      uptime: 0
    };
  }

  start(intervalMs = 2000) {
    if (this.intervalId) return;

    // Immediate first tick
    this.tick();

    this.intervalId = setInterval(() => {
      this.tick();
    }, intervalMs);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async tick() {
    try {
      const [load, mem, time] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.time()
      ]);

      this.stats = {
        cpuUsage: Math.round(load.currentLoad || 0),
        memUsage: Math.round((mem.active / mem.total) * 100),
        memUsedGb: (mem.active / (1024 ** 3)).toFixed(1),
        memTotalGb: (mem.total / (1024 ** 3)).toFixed(1),
        uptime: Math.round(time.uptime || 0)
      };

      this.emit('stats', this.stats);
    } catch (err) {
      // Quiet fail to avoid logging loop
    }
  }

  getStats() {
    return this.stats;
  }
}

module.exports = new SystemMonitor();
