const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const net = require('net');
const { exec } = require('child_process');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

// Known MAC OUI vendor prefixes (first 6 hex chars without separators)
const MAC_VENDORS = {
  '000C29': 'VMware Virtual Host',
  '005056': 'VMware Virtual Host',
  '525400': 'QEMU/KVM Virtual Machine',
  'BC2411': 'Router / Firewall Gateway',
  '7CF17E': 'TP-Link Corporation',
  '50C7BF': 'TP-Link Corporation',
  'E848B8': 'TP-Link Corporation',
  '7483C2': 'Ubiquiti Networks (UniFi)',
  'B4FBE4': 'Ubiquiti Networks (UniFi)',
  '9483C4': 'Apple Inc. (iPhone / Mac / iPad)',
  'AC7F3E': 'Apple Inc.',
  'F01898': 'Apple Inc.',
  'B827EB': 'Raspberry Pi Foundation',
  'DCA632': 'Raspberry Pi Foundation',
  'E45F01': 'Raspberry Pi Foundation',
  '28CDC1': 'Raspberry Pi Foundation',
  '10FFE0': 'Realtek Gaming Controller',
  '00E04C': 'Realtek Semiconductor',
  '001132': 'Synology NAS',
  '002590': 'Supermicro Server',
  'A00460': 'Netgear Device',
  '001788': 'Philips Lighting (Hue Bridge)',
  '001247': 'Samsung Electronics'
};

function lookupVendor(mac) {
  if (!mac) return 'Périphérique Réseau';
  const clean = mac.replace(/[:-]/g, '').toUpperCase().slice(0, 6);
  return MAC_VENDORS[clean] || 'Périphérique Connecté';
}

function parseRequestBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch {
        resolve({});
      }
    });
  });
}

function getDefaultGateway() {
  return new Promise((resolve) => {
    const isWin = process.platform === 'win32';
    const isMac = process.platform === 'darwin';

    if (isWin) {
      exec('route print 0.0.0.0', (err, stdout) => {
        const m = (stdout || '').match(/0\.0\.0\.0\s+0\.0\.0\.0\s+([\d.]+)/);
        resolve(m ? m[1] : '192.168.1.1');
      });
    } else if (isMac) {
      exec('netstat -nr | grep default', (err, stdout) => {
        const m = (stdout || '').match(/default\s+([\d.]+)/);
        resolve(m ? m[1] : '192.168.1.1');
      });
    } else {
      // Linux
      exec("ip route show default | awk '{print $3}'", (err, stdout) => {
        const gw = (stdout || '').trim();
        resolve(gw || '192.168.1.1');
      });
    }
  });
}

function getLocalSubnet() {
  const ifaces = os.networkInterfaces();
  for (const name in ifaces) {
    for (const iface of ifaces[name]) {
      if (!iface.internal && iface.family === 'IPv4' && !iface.address.startsWith('169.254.')) {
        // Exclude virtualbox default host-only unless it's the only one
        if (iface.address.startsWith('192.168.56.')) continue;
        const parts = iface.address.split('.');
        return {
          ip: iface.address,
          prefix: `${parts[0]}.${parts[1]}.${parts[2]}`,
          name: name
        };
      }
    }
  }
  return { ip: '192.168.1.100', prefix: '192.168.1', name: 'Ethernet' };
}

function checkPort(host, port, timeoutMs = 350) {
  return new Promise((resolve) => {
    const s = new net.Socket();
    s.setTimeout(timeoutMs);
    s.on('connect', () => { s.destroy(); resolve(port); });
    s.on('error', () => resolve(null));
    s.on('timeout', () => { s.destroy(); resolve(null); });
    s.connect(port, host);
  });
}

function pingHost(host) {
  return new Promise((resolve) => {
    const isWin = process.platform === 'win32';
    const cmd = isWin ? `ping -n 1 -w 1000 ${host}` : `ping -c 1 -W 1 ${host}`;
    const start = Date.now();
    exec(cmd, (error, stdout) => {
      const elapsed = Date.now() - start;
      if (error) {
        resolve({ host, alive: false, timeMs: null, raw: stdout });
      } else {
        const match = (stdout || '').match(/(?:time[=<]|temps[=<])\s*([\d.]+)\s*ms/i);
        const timeMs = match ? parseFloat(match[1]) : elapsed;
        resolve({ host, alive: true, timeMs, raw: stdout });
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Live Automatic Discovery API (Works for ANY machine!)
  if (pathname === '/api/discover-topology' && req.method === 'POST') {
    const isWin = process.platform === 'win32';
    const subnet = getLocalSubnet();
    const gateway = await getDefaultGateway();
    
    // Fast sweep of the user's actual subnet
    for (let i = 1; i <= 254; i++) {
      exec(isWin ? `ping -n 1 -w 100 ${subnet.prefix}.${i}` : `ping -c 1 -W 1 ${subnet.prefix}.${i}`);
    }

    setTimeout(async () => {
      exec('arp -a', async (err, stdout) => {
        const lines = (stdout || '').split('\n');
        const discovered = [];
        const seenIps = new Set();

        for (const line of lines) {
          const regex = new RegExp(`(${subnet.prefix.replace(/\./g, '\\.')}\\.\\d+)\\s+([0-9a-fA-F:-]+)`);
          const match = line.match(regex);
          if (match) {
            const ip = match[1];
            const mac = match[2].toUpperCase().replace(/-/g, ':');
            if (ip.endsWith('.255') || seenIps.has(ip)) continue;
            seenIps.add(ip);

            // Fast port probe
            const commonPorts = [22, 53, 80, 443, 8000, 8006, 8080];
            const openPorts = [];
            for (const p of commonPorts) {
              const open = await checkPort(ip, p, 200);
              if (open) openPorts.push(open);
            }

            const vendor = lookupVendor(mac);
            let type = 'workstation';
            let label = ip;

            if (ip === gateway) {
              type = 'firewall';
              label = `Passerelle / Routeur (${ip})`;
            } else if (openPorts.includes(8006)) {
              type = 'proxmox';
              label = `Serveur Proxmox VE (${ip})`;
            } else if (vendor.includes('TP-Link') || vendor.includes('Ubiquiti')) {
              type = 'switch';
              label = `${vendor} (${ip})`;
            } else if (vendor.includes('Apple')) {
              type = 'phone';
              label = `Client Apple (${ip})`;
            } else if (ip === subnet.ip) {
              type = 'workstation';
              label = `Ce PC (${os.hostname()})`;
            } else if (openPorts.includes(8000) || openPorts.includes(8080) || openPorts.includes(80) || openPorts.includes(443)) {
              type = 'server';
              label = `Serveur Web / App (${ip})`;
            }

            discovered.push({
              ip,
              mac,
              vendor,
              type,
              label,
              ports: openPorts,
              isGateway: ip === gateway,
              isLocalMachine: ip === subnet.ip
            });
          }
        }

        // Always ensure local machine is in the list
        if (!seenIps.has(subnet.ip)) {
          discovered.push({
            ip: subnet.ip,
            mac: 'Auto-Detect',
            vendor: 'Cette Machine',
            type: 'workstation',
            label: `Ce PC (${os.hostname()})`,
            ports: [3000],
            isLocalMachine: true
          });
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          subnet: `${subnet.prefix}.0/24`,
          gateway,
          localIp: subnet.ip,
          hostname: os.hostname(),
          hosts: discovered
        }));
      });
    }, 2200);
    return;
  }

  if (pathname === '/api/ping' && req.method === 'POST') {
    const data = await parseRequestBody(req);
    const host = data.host || '127.0.0.1';
    if (!/^[a-zA-Z0-9.-]+$/.test(host)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid hostname or IP' }));
      return;
    }
    const result = await pingHost(host);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
    return;
  }

  // Static File Serving
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 NetTopology Visualizer running at: http://localhost:${PORT}`);
  console.log(`📡 Universal LAN Auto-Discovery & Ping API active`);
  console.log(`======================================================\n`);
});
