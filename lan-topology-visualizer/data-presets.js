/**
 * Network Topology Presets & Data Definitions
 * Curated for RIZYOX Homelab & Enterprise Scenarios
 */

const VLANS = {
  1: { id: 1, name: 'MGMT - Management', subnet: '10.10.0.0/24', color: '#38bdf8' },
  10: { id: 10, name: 'INFRA - Proxmox & TrueNAS', subnet: '10.10.10.0/24', color: '#a855f7' },
  20: { id: 20, name: 'SERVERS - Docker & Web', subnet: '10.10.20.0/24', color: '#10b981' },
  30: { id: 30, name: 'CLIENTS - Workstations', subnet: '10.10.30.0/24', color: '#3b82f6' },
  40: { id: 40, name: 'IOT - Smart Devices', subnet: '10.10.40.0/24', color: '#f59e0b' },
  50: { id: 50, name: 'GUEST - Isolated Wi-Fi', subnet: '10.10.50.0/24', color: '#ef4444' }
};

const DEVICE_TYPES = {
  internet: { name: 'Internet / WAN', icon: 'globe', category: 'wan', color: '#60a5fa' },
  router: { name: 'Router / Gateway', icon: 'router', category: 'network', color: '#38bdf8' },
  firewall: { name: 'Firewall / IDS', icon: 'shield', category: 'security', color: '#ef4444' },
  switch: { name: 'Managed Switch', icon: 'switch', category: 'network', color: '#818cf8' },
  proxmox: { name: 'Proxmox VE Host', icon: 'server', category: 'compute', color: '#f97316' },
  server: { name: 'Server / VM', icon: 'cpu', category: 'compute', color: '#a855f7' },
  docker: { name: 'Docker Host / CT', icon: 'container', category: 'compute', color: '#06b6d4' },
  nas: { name: 'NAS Storage', icon: 'database', category: 'storage', color: '#10b981' },
  ap: { name: 'Access Point', icon: 'wifi', category: 'wireless', color: '#e879f9' },
  workstation: { name: 'Workstation PC', icon: 'desktop', category: 'client', color: '#3b82f6' },
  laptop: { name: 'Laptop', icon: 'laptop', category: 'client', color: '#6366f1' },
  phone: { name: 'Mobile Device', icon: 'smartphone', category: 'client', color: '#ec4899' },
  iot: { name: 'IoT / Smart Device', icon: 'iot', category: 'iot', color: '#f59e0b' }
};

const TOPOLOGY_PRESETS = {
  'rizyox-homelab': {
    name: 'RIZYOX Homelab Réel (192.168.10.0/24)',
    description: 'Topologie réelle scannée sur le réseau local : Pare-feu OPNsense, Serveur gpanel.rizyox.fr, Serveur Vaultwarden, Station 2.5GbE.',
    author: 'RIZYOX (Scanné en direct)',
    nodes: [
      {
        id: 'wan',
        label: 'Accès Internet (WAN)',
        type: 'internet',
        ip: '82.64.120.45',
        mac: '00:1B:44:11:3A:B7',
        status: 'online',
        vlan: 1,
        vendor: 'Fibre Optique FTTH',
        hardware: 'Liaison WAN Fibre',
        services: ['Accès Internet Haut Débit', 'IPv4 / IPv6'],
        metrics: { ping: 3, trafficIn: '180 Mbps', trafficOut: '45 Mbps' },
        fixed: { x: 500, y: 70 }
      },
      {
        id: 'opnsense',
        label: 'OPNsense.internal',
        type: 'firewall',
        ip: '192.168.10.1',
        mac: 'BC:24:11:89:ED:36',
        status: 'online',
        vlan: 1,
        vendor: 'OPNsense Firewall & Gateway',
        hardware: 'Appliance Pare-feu OPNsense (FreeBSD Kernel)',
        services: ['OPNsense Web GUI (443)', 'Unbound DNS Resolver (53)', 'Serveur DHCP', 'Filtrage Paquets & NAT'],
        metrics: { ping: 1, status: 'Active Gateway' },
        fixed: { x: 500, y: 200 }
      },
      {
        id: 'tplink-device',
        label: 'TP-Link Network Device',
        type: 'switch',
        ip: '192.168.10.223',
        mac: '7C:F1:7E:14:0D:CD',
        status: 'online',
        vlan: 1,
        vendor: 'TP-Link Corporation Limited',
        hardware: 'Équipement Réseau TP-Link (Switch / AP)',
        services: ['Web Management Console (Port 80)', 'Ethernet Switching'],
        metrics: { ping: 2 },
        fixed: { x: 500, y: 340 }
      },
      {
        id: 'srv-gpanel',
        label: 'SRV-GPANEL (Debian 12)',
        type: 'server',
        ip: '192.168.10.82',
        mac: 'BC:24:11:A4:AF:4F',
        status: 'online',
        vlan: 20,
        vendor: 'Debian GNU/Linux 12 (Bookworm)',
        hardware: 'Serveur de Production Linux · OpenSSH 9.2p1',
        services: ['gpanel.rizyox.fr (Port 443/80)', 'Reverse Proxy Nginx', 'Port 8080 Web Application', 'SSH (Port 22)'],
        metrics: { ping: 1, uptime: 'Production Active' },
        fixed: { x: 280, y: 480 }
      },
      {
        id: 'srv-vaultwarden',
        label: 'SRV-VAULTWARDEN (Debian)',
        type: 'server',
        ip: '192.168.10.77',
        mac: 'BC:24:11:99:C2:95',
        status: 'online',
        vlan: 20,
        vendor: 'Debian GNU/Linux (Trixie)',
        hardware: 'Serveur de Sécurité & Coffre · OpenSSH 10.0p2',
        services: ['Vaultwarden Web (Port 8000)', 'Gestionnaire Mots de Passe Chiffré', 'SSH (Port 22)'],
        metrics: { ping: 1 },
        fixed: { x: 720, y: 480 }
      },
      {
        id: 'pc-rizyox',
        label: 'DESKTOP-G65C432 (RIZYOX)',
        type: 'workstation',
        ip: '192.168.10.136',
        mac: '10:FF:E0:64:8A:14',
        status: 'online',
        vlan: 30,
        vendor: 'Station de Travail & Dev Windows',
        hardware: 'Realtek Gaming 2.5GbE Family Controller · Wi-Fi 6E Realtek 8852CE',
        services: ['Node.js Visualizer (Port 3000)', 'Partage SMB (Port 445)', 'VS Code Dev', '2.5 Gbps LAN'],
        metrics: { ping: 0.8, speed: '2.5 Gbps' },
        fixed: { x: 380, y: 620 }
      },
      {
        id: 'apple-device',
        label: 'Apple Client (Wi-Fi)',
        type: 'phone',
        ip: '192.168.10.180',
        mac: '94:83:C4:92:B8:3C',
        status: 'online',
        vlan: 30,
        vendor: 'Apple Inc.',
        hardware: 'Périphérique Apple (iPhone / iPad / Mac)',
        services: ['Connexion Wi-Fi Mobile', 'DHCP Client'],
        metrics: { ping: 3 },
        fixed: { x: 620, y: 620 }
      }
    ],
    links: [
      { from: 'wan', to: 'opnsense', label: 'Uplink WAN Fibre', speed: 'Fibre FTTH', vlan: 1, type: 'wan', status: 'active', traffic: 85 },
      { from: 'opnsense', to: 'tplink-device', label: 'Liaison Réseau Gigabit', speed: '1 Gbps', vlan: 1, type: 'ethernet', status: 'active', traffic: 70 },
      { from: 'tplink-device', to: 'srv-gpanel', label: 'Liaison Serveur Prod (gpanel.rizyox.fr)', speed: '1 Gbps', vlan: 20, type: 'ethernet', status: 'active', traffic: 60 },
      { from: 'tplink-device', to: 'srv-vaultwarden', label: 'Liaison Coffre Vaultwarden (Port 8000)', speed: '1 Gbps', vlan: 20, type: 'ethernet', status: 'active', traffic: 45 },
      { from: 'tplink-device', to: 'pc-rizyox', label: 'Cat6a 2.5GbE Realtek Gaming', speed: '2.5 Gbps', vlan: 30, type: 'ethernet', status: 'active', traffic: 80 },
      { from: 'tplink-device', to: 'apple-device', label: 'Wi-Fi 5GHz', speed: 'Wi-Fi', vlan: 30, type: 'wifi', status: 'active', traffic: 25 }
    ]
  },

  'corporate-multi-site': {
    name: 'Corporate Datacenter & Multi-Site SD-WAN',
    description: 'High-availability enterprise architecture with redundant HA Firewalls, Spine-Leaf Core, DMZ and branch VPN tunnels.',
    author: 'RIZYOX Architecture',
    nodes: [
      { id: 'wan-isp1', label: 'Tier-1 ISP Fiber (10G)', type: 'internet', ip: '194.2.0.1', vlan: 1, status: 'online', metrics: { trafficIn: '840 Mbps', ping: 2 }, fixed: { x: 380, y: 70 } },
      { id: 'wan-isp2', label: 'Backup ISP BGP (1G)', type: 'internet', ip: '213.41.0.1', vlan: 1, status: 'online', metrics: { trafficIn: '12 Mbps', ping: 6 }, fixed: { x: 620, y: 70 } },
      { id: 'fw-ha-master', label: 'FortiGate-100F (Primary)', type: 'firewall', ip: '172.16.0.1', vlan: 1, status: 'online', metrics: { cpu: 32, ram: 45, ping: 1 }, fixed: { x: 420, y: 190 } },
      { id: 'fw-ha-backup', label: 'FortiGate-100F (Standby)', type: 'firewall', ip: '172.16.0.2', vlan: 1, status: 'online', metrics: { cpu: 8, ram: 42, ping: 1 }, fixed: { x: 580, y: 190 } },
      { id: 'core-switch-01', label: 'Cisco Nexus 9300-A', type: 'switch', ip: '172.16.0.10', vlan: 1, status: 'online', metrics: { cpu: 14, ram: 30, ping: 1 }, fixed: { x: 360, y: 320 } },
      { id: 'core-switch-02', label: 'Cisco Nexus 9300-B', type: 'switch', ip: '172.16.0.11', vlan: 1, status: 'online', metrics: { cpu: 12, ram: 29, ping: 1 }, fixed: { x: 640, y: 320 } },
      { id: 'k8s-master-01', label: 'Kube-Control-Plane', type: 'server', ip: '172.16.20.10', vlan: 20, status: 'online', metrics: { cpu: 38, ram: 60, ping: 1 }, fixed: { x: 260, y: 460 } },
      { id: 'k8s-worker-01', label: 'Kube-Worker-Node-01', type: 'server', ip: '172.16.20.21', vlan: 20, status: 'online', metrics: { cpu: 55, ram: 72, ping: 1 }, fixed: { x: 400, y: 460 } },
      { id: 'k8s-worker-02', label: 'Kube-Worker-Node-02', type: 'server', ip: '172.16.20.22', vlan: 20, status: 'online', metrics: { cpu: 48, ram: 68, ping: 1 }, fixed: { x: 600, y: 460 } },
      { id: 'san-storage', label: 'SAN Storage Array (NVMe)', type: 'nas', ip: '172.16.10.5', vlan: 10, status: 'online', metrics: { cpu: 15, ram: 82, ping: 1 }, fixed: { x: 740, y: 460 } },
      { id: 'branch-office-vpn', label: 'Branch Office SD-WAN', type: 'router', ip: '192.168.100.1', vlan: 50, status: 'online', metrics: { ping: 18, trafficIn: '85 Mbps' }, fixed: { x: 500, y: 600 } }
    ],
    links: [
      { from: 'wan-isp1', to: 'fw-ha-master', speed: '10 Gbps', vlan: 1, type: 'wan', status: 'active', traffic: 90 },
      { from: 'wan-isp2', to: 'fw-ha-backup', speed: '1 Gbps', vlan: 1, type: 'wan', status: 'active', traffic: 10 },
      { from: 'fw-ha-master', to: 'fw-ha-backup', speed: '10 Gbps', vlan: 1, type: 'heartbeat', status: 'active', traffic: 95 },
      { from: 'fw-ha-master', to: 'core-switch-01', speed: '40 Gbps', vlan: 1, type: 'sfp', status: 'active', traffic: 80 },
      { from: 'fw-ha-master', to: 'core-switch-02', speed: '40 Gbps', vlan: 1, type: 'sfp', status: 'active', traffic: 80 },
      { from: 'core-switch-01', to: 'core-switch-02', speed: '100 Gbps VPC Peer', vlan: 1, type: 'trunk', status: 'active', traffic: 70 },
      { from: 'core-switch-01', to: 'k8s-master-01', speed: '25 Gbps', vlan: 20, type: 'sfp', status: 'active', traffic: 50 },
      { from: 'core-switch-01', to: 'k8s-worker-01', speed: '25 Gbps', vlan: 20, type: 'sfp', status: 'active', traffic: 65 },
      { from: 'core-switch-02', to: 'k8s-worker-02', speed: '25 Gbps', vlan: 20, type: 'sfp', status: 'active', traffic: 60 },
      { from: 'core-switch-02', to: 'san-storage', speed: '32G Fibre Channel', vlan: 10, type: 'sfp', status: 'active', traffic: 75 },
      { from: 'fw-ha-master', to: 'branch-office-vpn', speed: 'IPsec SD-WAN 500M', vlan: 50, type: 'wan', status: 'active', traffic: 40 }
    ]
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { VLANS, DEVICE_TYPES, TOPOLOGY_PRESETS };
}
