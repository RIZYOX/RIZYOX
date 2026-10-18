/**
 * Topology Engine - High Performance Canvas 2D Network Visualizer
 * Physics simulation, animated particle packets, VLAN coloring, interactive camera.
 */

class TopologyEngine {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    this.nodes = [];
    this.links = [];
    this.nodeMap = new Map();
    this.selectedNode = null;
    this.hoveredNode = null;
    this.selectedLink = null;
    this.hoveredLink = null;
    
    // Camera Transform
    this.camera = { x: 0, y: 0, zoom: 1 };
    this.isPanning = false;
    this.panStart = { x: 0, y: 0 };
    this.draggedNode = null;
    this.isDragging = false;
    
    // Animation & Particles
    this.particles = [];
    this.lastTime = performance.now();
    this.isRunning = true;
    this.trafficMultiplier = 1.0;
    this.simulationMode = 'normal'; // 'normal', 'heavy', 'attack'
    this.activeVlanFilter = null; // null = all
    
    // Physics parameters
    this.physicsEnabled = true;
    this.springLength = 160;
    this.springStrength = 0.04;
    this.repulsionStrength = 8000;
    this.damping = 0.82;

    // Callbacks
    this.onNodeClick = options.onNodeClick || (() => {});
    this.onNodeHover = options.onNodeHover || (() => {});
    this.onLinkClick = options.onLinkClick || (() => {});
    
    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.bindEvents();
    this.startLoop();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.viewWidth = rect.width;
    this.viewHeight = rect.height;
  }

  setData(data) {
    this.nodes = JSON.parse(JSON.stringify(data.nodes || []));
    this.links = JSON.parse(JSON.stringify(data.links || []));
    this.nodeMap.clear();
    
    // Initialize node physics properties
    this.nodes.forEach((n, idx) => {
      n.vx = 0;
      n.vy = 0;
      n.radius = n.radius || (n.type === 'switch' || n.type === 'firewall' || n.type === 'proxmox' ? 32 : 26);
      if (n.fixed) {
        n.x = n.fixed.x;
        n.y = n.fixed.y;
      } else if (n.x === undefined || n.y === undefined) {
        // Arrange in circular layout by default
        const angle = (idx / this.nodes.length) * Math.PI * 2;
        n.x = 500 + Math.cos(angle) * 260;
        n.y = 400 + Math.sin(angle) * 220;
      }
      this.nodeMap.set(n.id, n);
    });

    this.particles = [];
    this.fitView();
  }

  fitView() {
    if (this.nodes.length === 0) return;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    this.nodes.forEach(n => {
      minX = Math.min(minX, n.x - 60);
      maxX = Math.max(maxX, n.x + 60);
      minY = Math.min(minY, n.y - 60);
      maxY = Math.max(maxY, n.y + 60);
    });

    const w = maxX - minX || 800;
    const h = maxY - minY || 600;
    const pad = 80;

    const zoomX = (this.viewWidth - pad * 2) / w;
    const zoomY = (this.viewHeight - pad * 2) / h;
    this.camera.zoom = Math.max(0.4, Math.min(1.2, Math.min(zoomX, zoomY)));

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    this.camera.x = this.viewWidth / 2 - centerX * this.camera.zoom;
    this.camera.y = this.viewHeight / 2 - centerY * this.camera.zoom;
  }

  screenToWorld(sx, sy) {
    return {
      x: (sx - this.camera.x) / this.camera.zoom,
      y: (sy - this.camera.y) / this.camera.zoom
    };
  }

  worldToScreen(wx, wy) {
    return {
      x: wx * this.camera.zoom + this.camera.x,
      y: wy * this.camera.zoom + this.camera.y
    };
  }

  bindEvents() {
    const c = this.canvas;

    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = c.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
      const newZoom = Math.max(0.2, Math.min(3.5, this.camera.zoom * zoomFactor));

      // Zoom towards mouse pointer
      this.camera.x = mouseX - (mouseX - this.camera.x) * (newZoom / this.camera.zoom);
      this.camera.y = mouseY - (mouseY - this.camera.y) * (newZoom / this.camera.zoom);
      this.camera.zoom = newZoom;
    }, { passive: false });

    c.addEventListener('mousedown', (e) => {
      const rect = c.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const world = this.screenToWorld(sx, sy);

      // Check node hit
      const hitNode = this.getNodeAt(world.x, world.y);
      if (hitNode) {
        this.draggedNode = hitNode;
        this.isDragging = true;
        this.selectedNode = hitNode;
        this.onNodeClick(hitNode);
        return;
      }

      // Check link hit
      const hitLink = this.getLinkAt(world.x, world.y);
      if (hitLink) {
        this.selectedLink = hitLink;
        this.onLinkClick(hitLink);
        return;
      }

      // Deselect and start panning
      this.selectedNode = null;
      this.selectedLink = null;
      this.onNodeClick(null);
      this.isPanning = true;
      this.panStart = { x: sx - this.camera.x, y: sy - this.camera.y };
    });

    window.addEventListener('mousemove', (e) => {
      const rect = c.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;

      if (this.isPanning) {
        this.camera.x = sx - this.panStart.x;
        this.camera.y = sy - this.panStart.y;
        return;
      }

      const world = this.screenToWorld(sx, sy);

      if (this.isDragging && this.draggedNode) {
        this.draggedNode.x = world.x;
        this.draggedNode.y = world.y;
        this.draggedNode.vx = 0;
        this.draggedNode.vy = 0;
        return;
      }

      // Hover check
      const hovered = this.getNodeAt(world.x, world.y);
      if (hovered !== this.hoveredNode) {
        this.hoveredNode = hovered;
        c.style.cursor = hovered ? 'pointer' : 'default';
        this.onNodeHover(hovered);
      }
    });

    window.addEventListener('mouseup', () => {
      this.isPanning = false;
      this.isDragging = false;
      this.draggedNode = null;
    });
  }

  getNodeAt(wx, wy) {
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const n = this.nodes[i];
      const dx = wx - n.x;
      const dy = wy - n.y;
      const hitRadius = n.radius + 16;
      if (dx * dx + dy * dy <= hitRadius * hitRadius) {
        return n;
      }
    }
    return null;
  }

  getLinkAt(wx, wy) {
    for (const link of this.links) {
      const u = this.nodeMap.get(link.from);
      const v = this.nodeMap.get(link.to);
      if (!u || !v) continue;
      const dist = this.distToSegment({ x: wx, y: wy }, u, v);
      if (dist < 10) return link;
    }
    return null;
  }

  distToSegment(p, v, w) {
    const l2 = (v.x - w.x) * (v.x - w.x) + (v.y - w.y) * (v.y - w.y);
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
  }

  // Particle Generation for Network Traffic
  spawnParticles() {
    if (this.links.length === 0) return;
    
    const count = this.simulationMode === 'heavy' ? 4 : this.simulationMode === 'attack' ? 5 : 2;
    for (let i = 0; i < count; i++) {
      if (Math.random() > 0.4) continue;
      const link = this.links[Math.floor(Math.random() * this.links.length)];
      if (link.status === 'down') continue;
      
      const isReverse = Math.random() > 0.5;
      const fromNode = this.nodeMap.get(isReverse ? link.to : link.from);
      const toNode = this.nodeMap.get(isReverse ? link.from : link.to);
      if (!fromNode || !toNode) continue;

      let color = '#38bdf8'; // Blue default
      let size = 3;
      let speed = (0.006 + Math.random() * 0.008) * this.trafficMultiplier;

      if (this.simulationMode === 'attack' && (toNode.id === 'pfsense' || toNode.id === 'vm-docker')) {
        color = '#ef4444'; // Red attack packet
        size = 4;
        speed *= 1.8;
      } else if (link.vlan === 10) {
        color = '#a855f7';
      } else if (link.vlan === 20) {
        color = '#10b981';
      } else if (link.vlan === 40) {
        color = '#f59e0b';
      }

      this.particles.push({
        from: fromNode,
        to: toNode,
        progress: 0,
        speed: speed,
        color: color,
        size: size
      });
    }

    // Limit maximum particles
    if (this.particles.length > 250) {
      this.particles.splice(0, this.particles.length - 250);
    }
  }

  updatePhysics() {
    if (!this.physicsEnabled) return;

    // Node-Node Repulsion
    for (let i = 0; i < this.nodes.length; i++) {
      const a = this.nodes[i];
      for (let j = i + 1; j < this.nodes.length; j++) {
        const b = this.nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distSq = dx * dx + dy * dy || 1;
        const dist = Math.sqrt(distSq);

        if (dist < 400) {
          const force = this.repulsionStrength / distSq;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          if (!a.fixed && a !== this.draggedNode) {
            a.vx -= fx;
            a.vy -= fy;
          }
          if (!b.fixed && b !== this.draggedNode) {
            b.vx += fx;
            b.vy += fy;
          }
        }
      }
    }

    // Link Spring Force
    for (const link of this.links) {
      const u = this.nodeMap.get(link.from);
      const v = this.nodeMap.get(link.to);
      if (!u || !v) continue;

      const dx = v.x - u.x;
      const dy = v.y - u.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const displacement = dist - this.springLength;
      const force = displacement * this.springStrength;

      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      if (!u.fixed && u !== this.draggedNode) {
        u.vx += fx;
        u.vy += fy;
      }
      if (!v.fixed && v !== this.draggedNode) {
        v.vx -= fx;
        v.vy -= fy;
      }
    }

    // Apply Velocity
    for (const n of this.nodes) {
      if (n.fixed || n === this.draggedNode) continue;
      n.x += n.vx;
      n.y += n.vy;
      n.vx *= this.damping;
      n.vy *= this.damping;
    }
  }

  startLoop() {
    const loop = (timestamp) => {
      const dt = (timestamp - this.lastTime) / 1000;
      this.lastTime = timestamp;

      this.updatePhysics();
      this.spawnParticles();
      this.render();

      if (this.isRunning) {
        requestAnimationFrame(loop);
      }
    };
    requestAnimationFrame(loop);
  }

  render() {
    const dpr = window.devicePixelRatio || 1;
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Save for world transformation with DPR
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.translate(this.camera.x, this.camera.y);
    ctx.scale(this.camera.zoom, this.camera.zoom);

    this.drawBackgroundGrid(ctx);
    this.drawLinks(ctx);
    this.drawParticles(ctx);
    this.drawNodes(ctx);

    ctx.restore();
  }

  drawBackgroundGrid(ctx) {
    const step = 60;
    const viewLeft = -this.camera.x / this.camera.zoom;
    const viewTop = -this.camera.y / this.camera.zoom;
    const viewRight = viewLeft + this.viewWidth / this.camera.zoom;
    const viewBottom = viewTop + this.viewHeight / this.camera.zoom;

    const startX = Math.floor(viewLeft / step) * step;
    const startY = Math.floor(viewTop / step) * step;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    for (let x = startX; x < viewRight; x += step) {
      for (let y = startY; y < viewBottom; y += step) {
        ctx.beginPath();
        ctx.arc(x, y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  drawLinks(ctx) {
    for (const link of this.links) {
      const u = this.nodeMap.get(link.from);
      const v = this.nodeMap.get(link.to);
      if (!u || !v) continue;

      const isHovered = this.hoveredLink === link || (this.hoveredNode && (this.hoveredNode.id === u.id || this.hoveredNode.id === v.id));
      const isSelected = this.selectedLink === link;
      const isVlanFiltered = this.activeVlanFilter && link.vlan !== this.activeVlanFilter;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(u.x, u.y);
      ctx.lineTo(v.x, v.y);

      // Line style
      if (link.status === 'down') {
        ctx.strokeStyle = '#ef4444';
        ctx.setLineDash([6, 6]);
        ctx.lineWidth = 2;
      } else if (link.type === 'wifi') {
        ctx.strokeStyle = isHovered ? '#e879f9' : 'rgba(232, 121, 249, 0.4)';
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = isHovered ? 2.5 : 1.5;
      } else if (link.type === 'sfp') {
        // High speed 10G link
        ctx.strokeStyle = isHovered ? '#38bdf8' : 'rgba(56, 189, 248, 0.7)';
        ctx.lineWidth = isHovered ? 4 : 2.8;
      } else {
        ctx.strokeStyle = isHovered ? '#818cf8' : 'rgba(129, 140, 248, 0.35)';
        ctx.lineWidth = isHovered ? 3 : 1.8;
      }

      if (isVlanFiltered) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      }

      if (isSelected) {
        ctx.shadowColor = '#60a5fa';
        ctx.shadowBlur = 12;
      }

      ctx.stroke();
      ctx.restore();

      // Draw Link Label / Speed Badge at midpoint
      if (this.camera.zoom > 0.65 && !isVlanFiltered) {
        const midX = (u.x + v.x) / 2;
        const midY = (u.y + v.y) / 2;

        ctx.save();
        ctx.font = '9px "JetBrains Mono", monospace';
        const text = link.speed || '';
        const tw = ctx.measureText(text).width;

        ctx.fillStyle = 'rgba(11, 15, 26, 0.85)';
        ctx.fillRect(midX - tw / 2 - 4, midY - 7, tw + 8, 14);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.strokeRect(midX - tw / 2 - 4, midY - 7, tw + 8, 14);

        ctx.fillStyle = link.type === 'sfp' ? '#38bdf8' : '#94a3b8';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, midX, midY);
        ctx.restore();
      }
    }
  }

  drawParticles(ctx) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.progress += p.speed;

      if (p.progress >= 1) {
        this.particles.splice(i, 1);
        continue;
      }

      const x = p.from.x + (p.to.x - p.from.x) * p.progress;
      const y = p.from.y + (p.to.y - p.from.y) * p.progress;

      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.restore();
    }
  }

  drawNodes(ctx) {
    for (const node of this.nodes) {
      const isSelected = this.selectedNode === node;
      const isHovered = this.hoveredNode === node;
      const isFiltered = this.activeVlanFilter && node.vlan !== this.activeVlanFilter;

      const r = node.radius;

      ctx.save();
      ctx.translate(node.x, node.y);

      if (isFiltered) {
        ctx.globalAlpha = 0.25;
      }

      // Outer Selection / Hover Glow
      if (isSelected || isHovered) {
        ctx.beginPath();
        ctx.arc(0, 0, r + 8, 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? 'rgba(96, 165, 250, 0.2)' : 'rgba(148, 163, 184, 0.12)';
        ctx.fill();
      }

      // VLAN Ring
      const vlanColor = node.vlan === 10 ? '#a855f7' : node.vlan === 20 ? '#10b981' : node.vlan === 30 ? '#3b82f6' : node.vlan === 40 ? '#f59e0b' : '#38bdf8';
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.lineWidth = isSelected ? 3.5 : 2;
      ctx.strokeStyle = isSelected ? '#60a5fa' : vlanColor;
      ctx.shadowColor = isSelected ? '#60a5fa' : 'transparent';
      ctx.shadowBlur = isSelected ? 16 : 0;
      ctx.stroke();

      // Node Icon
      this.drawNodeIcon(ctx, node.type, r);

      // Status indicator LED (top right)
      const ledX = r * 0.7;
      const ledY = -r * 0.7;
      ctx.beginPath();
      ctx.arc(ledX, ledY, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = node.status === 'online' ? '#22c55e' : node.status === 'warning' ? '#f59e0b' : '#ef4444';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Labels (below node)
      ctx.shadowBlur = 0;
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = isSelected ? '#ffffff' : '#e2e8f0';
      ctx.fillText(node.label, 0, r + 15);

      // IP Badge
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(node.ip, 0, r + 28);

      ctx.restore();
    }
  }

  drawNodeIcon(ctx, type, r) {
    ctx.save();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const s = r * 0.45; // Icon scale

    switch (type) {
      case 'internet': // Globe
        ctx.beginPath();
        ctx.arc(0, 0, s, 0, Math.PI * 2);
        ctx.moveTo(-s, 0); ctx.lineTo(s, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(0, 0, s * 0.5, s, 0, 0, Math.PI * 2);
        ctx.stroke();
        break;

      case 'firewall': // Shield
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.lineTo(s, -s * 0.5);
        ctx.lineTo(s * 0.8, s * 0.6);
        ctx.lineTo(0, s * 1.1);
        ctx.lineTo(-s * 0.8, s * 0.6);
        ctx.lineTo(-s, -s * 0.5);
        ctx.closePath();
        ctx.stroke();
        break;

      case 'switch': // Switch box with dual directional arrows
        ctx.strokeRect(-s * 1.1, -s * 0.6, s * 2.2, s * 1.2);
        ctx.beginPath();
        ctx.moveTo(-s * 0.5, 0); ctx.lineTo(s * 0.5, 0);
        ctx.stroke();
        break;

      case 'proxmox': // Server tower with cluster layers
        ctx.strokeRect(-s * 0.8, -s * 1.1, s * 1.6, s * 2.2);
        ctx.beginPath();
        ctx.moveTo(-s * 0.5, -s * 0.4); ctx.lineTo(s * 0.5, -s * 0.4);
        ctx.moveTo(-s * 0.5, s * 0.3); ctx.lineTo(s * 0.5, s * 0.3);
        ctx.stroke();
        break;

      case 'nas': // Storage drive discs
        ctx.beginPath();
        ctx.ellipse(0, -s * 0.6, s * 0.9, s * 0.4, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(0, 0, s * 0.9, s * 0.4, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(0, s * 0.6, s * 0.9, s * 0.4, 0, 0, Math.PI * 2);
        ctx.stroke();
        break;

      case 'ap': // Wi-Fi waves
        ctx.beginPath();
        ctx.arc(0, s * 0.6, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, s * 0.6, s * 0.6, -Math.PI * 0.8, -Math.PI * 0.2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, s * 0.6, s * 1.1, -Math.PI * 0.8, -Math.PI * 0.2);
        ctx.stroke();
        break;

      case 'workstation': // Monitor / Desktop
        ctx.strokeRect(-s, -s * 0.8, s * 2, s * 1.3);
        ctx.beginPath();
        ctx.moveTo(0, s * 0.5); ctx.lineTo(0, s * 0.9);
        ctx.moveTo(-s * 0.5, s * 0.9); ctx.lineTo(s * 0.5, s * 0.9);
        ctx.stroke();
        break;

      case 'laptop':
        ctx.strokeRect(-s * 0.8, -s * 0.7, s * 1.6, s);
        ctx.beginPath();
        ctx.moveTo(-s * 1.1, s * 0.5); ctx.lineTo(s * 1.1, s * 0.5);
        ctx.stroke();
        break;

      case 'docker': // Container Box
        ctx.strokeRect(-s * 0.9, -s * 0.8, s * 1.8, s * 1.6);
        ctx.strokeRect(-s * 0.5, -s * 0.4, s, s * 0.8);
        break;

      default: // Server / Chip
        ctx.strokeRect(-s * 0.8, -s * 0.8, s * 1.6, s * 1.6);
        ctx.strokeRect(-s * 0.4, -s * 0.4, s * 0.8, s * 0.8);
        break;
    }

    ctx.restore();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TopologyEngine };
}
