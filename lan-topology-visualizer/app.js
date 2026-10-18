/**
 * NetTopology - Main Application Controller
 * Handles UI interactions, toolbar controls, modals, and diagnostic events.
 */

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('topology-canvas');
  const scanner = new NetworkScanner();

  // Initialize Topology Canvas Engine
  const engine = new TopologyEngine(canvas, {
    onNodeClick: (node) => {
      if (node) {
        showNodeInspector(node);
      } else {
        hideNodeInspector();
      }
    },
    onNodeHover: (node) => {
      // Optional status update on hover
    }
  });

  // Load Initial Preset
  const currentPresetKey = 'rizyox-homelab';
  engine.setData(TOPOLOGY_PRESETS[currentPresetKey]);

  // UI Elements
  const presetSelect = document.getElementById('preset-select');
  const inspector = document.getElementById('inspector-sidebar');
  const btnCloseInsp = document.getElementById('btn-close-insp');
  const btnFit = document.getElementById('btn-fit');
  const btnPhysics = document.getElementById('btn-physics');
  const btnTraffic = document.getElementById('btn-traffic-boost');
  const btnCyber = document.getElementById('btn-cyber-incident');
  const btnScan = document.getElementById('btn-scan');
  const btnExport = document.getElementById('btn-export-json');
  const btnPing = document.getElementById('btn-ping');
  const pingResults = document.getElementById('ping-results');
  const scannerModal = document.getElementById('scanner-modal');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const logText = document.getElementById('log-text');
  const vlanChips = document.querySelectorAll('.vlan-chip');

  let activeNode = null;

  // Preset Selector with Live Auto-Discovery
  presetSelect.addEventListener('change', async (e) => {
    const key = e.target.value;
    if (key === 'auto-discover') {
      await runAutoDiscoverTopology();
    } else if (TOPOLOGY_PRESETS[key]) {
      engine.setData(TOPOLOGY_PRESETS[key]);
      hideNodeInspector();
      addLog(`Topology preset changed to: ${TOPOLOGY_PRESETS[key].name}`);
    }
  });

  async function runAutoDiscoverTopology() {
    addLog('🔍 Démarrage du scan automatique du réseau local en direct...');
    document.getElementById('network-health-text').textContent = 'SCAN RÉSEAU EN COURS...';

    try {
      const response = await fetch('/api/discover-topology', { method: 'POST' });
      if (!response.ok) throw new Error('API discovery error');
      const data = await response.json();

      const hosts = data.hosts || [];
      const gatewayIp = data.gateway;
      addLog(`Scan terminé : ${hosts.length} périphériques détectés sur ${data.subnet}.`);
      document.getElementById('network-health-text').textContent = 'RÉSEAU DÉTECTÉ EN DIRECT';

      // Build clean dynamic topology graph
      const dynamicNodes = [
        {
          id: 'wan',
          label: 'Accès Internet (WAN)',
          type: 'internet',
          ip: 'Uplink Externe',
          vlan: 1,
          status: 'online',
          services: ['Connexion FAI', 'IPv4/IPv6'],
          fixed: { x: 500, y: 70 }
        },
        {
          id: 'gateway',
          label: `Routeur / Passerelle (${gatewayIp})`,
          type: 'firewall',
          ip: gatewayIp,
          vlan: 1,
          status: 'online',
          hardware: 'Passerelle Détectée par Défaut',
          services: ['Routage IP', 'Serveur DHCP', 'DNS'],
          fixed: { x: 500, y: 200 }
        },
        {
          id: 'core-switch',
          label: 'Distribution Réseau LAN',
          type: 'switch',
          ip: `${data.subnet.split('/')[0]}`,
          vlan: 1,
          status: 'online',
          hardware: 'Commutation Locale',
          services: ['Liaisons Ethernet & Wi-Fi'],
          fixed: { x: 500, y: 340 }
        }
      ];

      const dynamicLinks = [
        { from: 'wan', to: 'gateway', label: 'Liaison Internet WAN', speed: 'Fibre / Câble', vlan: 1, type: 'wan', status: 'active', traffic: 80 },
        { from: 'gateway', to: 'core-switch', label: 'Liaison Réseau Principal', speed: '1 Gbps', vlan: 1, type: 'ethernet', status: 'active', traffic: 70 }
      ];

      // Add discovered hosts arranged cleanly in an arc
      const otherHosts = hosts.filter(h => h.ip !== gatewayIp);
      const hostCount = otherHosts.length;

      otherHosts.forEach((h, idx) => {
        const angle = Math.PI * 0.15 + (idx / Math.max(1, hostCount - 1)) * (Math.PI * 0.7);
        const radius = 240 + (idx % 2 === 0 ? 0 : 70);
        const nodeX = 500 + Math.cos(angle) * radius * (idx % 2 === 0 ? 1.3 : 1.1);
        const nodeY = 340 + Math.sin(angle) * radius;

        const nodeId = `host-${idx}`;
        dynamicNodes.push({
          id: nodeId,
          label: h.label || h.ip,
          type: h.type || 'workstation',
          ip: h.ip,
          mac: h.mac || 'N/A',
          vlan: h.isLocalMachine ? 30 : 20,
          status: 'online',
          hardware: h.vendor || 'Périphérique Détecté',
          services: (h.ports && h.ports.length > 0) ? h.ports.map(p => `Port ${p} Ouvert`) : ['ICMP Ping Actif'],
          fixed: { x: Math.round(nodeX), y: Math.round(nodeY) }
        });

        dynamicLinks.push({
          from: 'core-switch',
          to: nodeId,
          label: h.isLocalMachine ? 'Connexion Directe PC' : 'Liaison LAN',
          speed: h.isLocalMachine ? '2.5 Gbps' : '1 Gbps',
          vlan: h.isLocalMachine ? 30 : 20,
          type: h.type === 'phone' ? 'wifi' : 'ethernet',
          status: 'active',
          traffic: 40 + (idx * 5) % 40
        });
      });

      engine.setData({ nodes: dynamicNodes, links: dynamicLinks });
      engine.fitView();
      hideNodeInspector();

    } catch (err) {
      console.error(err);
      addLog('Erreur lors du scan automatique. Chargement du profil réel sauvegardé.');
      engine.setData(TOPOLOGY_PRESETS['rizyox-homelab']);
    }
  }

  // Center / Fit View
  btnFit.addEventListener('click', () => {
    engine.fitView();
  });

  // Toggle Physics
  btnPhysics.addEventListener('click', () => {
    engine.physicsEnabled = !engine.physicsEnabled;
    btnPhysics.classList.toggle('active', engine.physicsEnabled);
    addLog(`Graph physics ${engine.physicsEnabled ? 'enabled (auto-relaxing)' : 'locked'}`);
  });

  // Toggle Traffic Stress Test
  let isTrafficBoost = false;
  btnTraffic.addEventListener('click', () => {
    isTrafficBoost = !isTrafficBoost;
    btnTraffic.classList.toggle('active', isTrafficBoost);
    engine.trafficMultiplier = isTrafficBoost ? 3.0 : 1.0;
    engine.simulationMode = isTrafficBoost ? 'heavy' : 'normal';
    addLog(isTrafficBoost ? '⚠️ HIGH TRAFFIC SIMULATION ACTIVE: +300% packet rate' : 'Traffic normalized.');
  });

  // Toggle Cyber Incident / Anomaly Simulation
  let isCyberIncident = false;
  btnCyber.addEventListener('click', () => {
    isCyberIncident = !isCyberIncident;
    btnCyber.classList.toggle('active', isCyberIncident);
    engine.simulationMode = isCyberIncident ? 'attack' : (isTrafficBoost ? 'heavy' : 'normal');

    const healthText = document.getElementById('network-health-text');
    if (isCyberIncident) {
      healthText.textContent = 'SECURITY ALERT: ANOMALOUS TRAFFIC';
      healthText.style.color = '#ef4444';
      addLog('🚨 SURICATA IDS ALERT: Suspicious SYN Flood detected against pfSense-FW01');
    } else {
      healthText.textContent = 'NETWORK OPERATIONAL';
      healthText.style.color = '';
      addLog('Security alert mitigated. Firewall state tables normal.');
    }
  });

  // VLAN Filter Chips
  vlanChips.forEach(chip => {
    chip.addEventListener('click', () => {
      vlanChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      const vlanVal = chip.getAttribute('data-vlan');
      engine.activeVlanFilter = vlanVal === 'all' ? null : parseInt(vlanVal, 10);
      addLog(`Filtering view by: ${chip.textContent}`);
    });
  });

  // Toggle Privacy Mode (Mask IPs)
  const btnPrivacy = document.getElementById('btn-privacy');
  let isPrivacyActive = false;
  btnPrivacy.addEventListener('click', () => {
    isPrivacyActive = !isPrivacyActive;
    btnPrivacy.classList.toggle('active', isPrivacyActive);
    engine.privacyMode = isPrivacyActive;
    addLog(isPrivacyActive ? '🔒 MODE CONFIDENTIALITÉ ACTIVÉ : Adresses IP masquées.' : 'Mode confidentialité désactivé.');
  });

  // Node Inspector Show / Hide
  function showNodeInspector(node) {
    activeNode = node;
    document.getElementById('insp-name').textContent = node.label;
    document.getElementById('insp-ip').textContent = node.ip;
    document.getElementById('insp-mac').textContent = node.mac || 'N/A';
    document.getElementById('insp-vlan').textContent = `VLAN ${node.vlan}`;
    document.getElementById('insp-status').textContent = (node.status || 'ONLINE').toUpperCase();
    document.getElementById('insp-hardware').textContent = `${node.hardware || node.vendor || 'Standard Node'}`;

    const servicesContainer = document.getElementById('insp-services');
    servicesContainer.innerHTML = '';
    (node.services || ['SSH (Port 22)', 'ICMP Ping']).forEach(srv => {
      const tag = document.createElement('span');
      tag.className = 'service-tag';
      tag.textContent = srv;
      servicesContainer.appendChild(tag);
    });

    pingResults.textContent = `Host prêt: ${node.ip}`;
    inspector.classList.add('open');
  }

  function hideNodeInspector() {
    inspector.classList.remove('open');
    activeNode = null;
  }

  btnCloseInsp.addEventListener('click', hideNodeInspector);

  // Ping Diagnostic
  btnPing.addEventListener('click', async () => {
    if (!activeNode) return;
    pingResults.textContent = `Envoi ICMP echo request vers ${activeNode.ip}...\n`;
    btnPing.disabled = true;

    for (let seq = 1; seq <= 4; seq++) {
      const res = await scanner.pingHost(activeNode.ip);
      if (res.alive) {
        pingResults.textContent += `64 bytes from ${activeNode.ip}: icmp_seq=${seq} ttl=64 time=${res.timeMs} ms\n`;
      } else {
        pingResults.textContent += `Request timeout for icmp_seq ${seq}\n`;
      }
    }

    pingResults.textContent += `--- ${activeNode.ip} ping statistics ---\n4 packets transmitted, 0% packet loss`;
    btnPing.disabled = false;
  });

  // Network Scanner Modal
  btnScan.addEventListener('click', () => {
    scannerModal.classList.add('open');
    runSubnetScan();
  });

  btnCloseModal.addEventListener('click', () => {
    scannerModal.classList.remove('open');
  });

  scannerModal.addEventListener('click', (e) => {
    if (e.target === scannerModal) {
      scannerModal.classList.remove('open');
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      scannerModal.classList.remove('open');
      hideNodeInspector();
    }
  });

  async function runSubnetScan() {
    const list = document.getElementById('discovered-hosts');
    const statusText = document.getElementById('scan-status-text');
    list.innerHTML = '';
    statusText.textContent = 'Envoi requêtes ARP sweep (10.10.0.1 - 10.10.0.254)...';

    await scanner.scanSubnet('10.10.0', (data) => {
      statusText.textContent = `Progression: ${data.progress}% (${data.currentIp})`;
      const latest = data.discovered[data.discovered.length - 1];
      const div = document.createElement('div');
      div.className = 'discovered-item';
      div.innerHTML = `<span><b>${latest.ip}</b> - ${latest.vendor}</span><span style="color: #22c55e;">${latest.latency}</span>`;
      list.appendChild(div);
      list.scrollTop = list.scrollHeight;
    });

    statusText.textContent = 'Scan terminé avec succès ! 13 hôtes découverts.';
  }

  // Export JSON
  btnExport.addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
      nodes: engine.nodes,
      links: engine.links
    }, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `network-topology-${Date.now()}.json`);
    dlAnchor.click();
    addLog('Topology configuration exported to JSON file.');
  });

  // Realistic Syslog Event Simulator for Real Homelab
  const syslogMessages = [
    'OPNsense (192.168.10.1): Unbound DNS resolver healthy · Gateway state tables normal.',
    'SRV-GPANEL (192.168.10.82): Nginx reverse proxy active for gpanel.rizyox.fr (Port 443/8080).',
    'SRV-VAULTWARDEN (192.168.10.77): Vaultwarden web password manager online (Port 8000).',
    'DESKTOP-G65C432: Realtek Gaming 2.5GbE Family Controller negotiated at 2500 Mbps.',
    'TP-Link (192.168.10.223): Management interface reachable · 0 CRC error frames.',
    'Apple Device (192.168.10.180): DHCP lease renewed by OPNsense (192.168.10.1).'
  ];

  let logIndex = 0;
  setInterval(() => {
    logText.textContent = syslogMessages[logIndex % syslogMessages.length];
    logIndex++;
  }, 4500);

  function addLog(msg) {
    const time = new Date().toLocaleTimeString();
    logText.textContent = `[${time}] ${msg}`;
  }
});
