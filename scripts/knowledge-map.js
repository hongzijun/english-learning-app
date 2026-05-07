// Knowledge Map - 交互式知识图谱 (Canvas)
// Draws visual knowledge graph with zoom/pan, click to navigate

var KnowledgeMap = {
  canvas: null,
  ctx: null,
  container: null,
  nodes: [],
  edges: [],
  offsetX: 0,
  offsetY: 0,
  scale: 1,
  isDragging: false,
  dragStartX: 0,
  dragStartY: 0,
  currentUnitId: null,
  hoveredNode: null,

  COLORS: {
    notLearned: '#ef4444',
    learning: '#f59e0b',
    mastered: '#10b981',
    edge: '#d1d5db',
    centerFill: '#3b82f6',
    centerText: '#fff'
  },

  render: function (container, unitId) {
    var self = this;
    this.container = container;
    if (!container) return;

    var existing = container.querySelector('canvas');
    if (existing) {
      container.removeChild(existing);
    }

    var canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 400;
    canvas.style.cssText = 'width:100%;height:auto;max-width:600px;cursor:grab;border-radius:12px;background:#f9fafb;';
    container.appendChild(canvas);

    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.currentUnitId = unitId;
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;

    this.buildGraph(unitId);
    this.bindCanvasEvents();
    this.draw();
  },

  buildGraph: function (unitId) {
    this.nodes = [];
    this.edges = [];

    var allWords = typeof Grade7Data !== 'undefined' ? Grade7Data.getAllWords() : [];
    var unit = typeof Grade7Data !== 'undefined' ? Grade7Data.getUnitById(unitId) : null;

    var cx = 300;
    var cy = 200;
    var centerNode = { id: 'unit-' + unitId, label: unit ? unit.name : ('Unit ' + unitId), x: cx, y: cy, radius: 32, type: 'center' };
    this.nodes.push(centerNode);

    if (!unit || allWords.length === 0) return;

    var unitWords = [];
    for (var i = 0; i < allWords.length; i++) {
      if (allWords[i].unitId === unitId) unitWords.push(allWords[i]);
    }

    var groups = this.groupByTheme(unitWords);
    var groupKeys = Object.keys(groups);

    if (groupKeys.length === 0) groupKeys = ['all'];
    if (groupKeys.length === 1 && groupKeys[0] === 'all') {
      for (var k = 0; k < Math.min(unitWords.length, 5); k++) {
        groups['all'].push(unitWords[k].w);
      }
    }

    var totalGroups = groupKeys.length;
    var grammarPoints = unit.grammar || [];
    var totalItems = totalGroups + (grammarPoints.length > 0 ? 1 : 0);

    var radius = 140;
    var angleStep = (Math.PI * 2) / Math.max(totalItems, 1);
    var startAngle = -Math.PI / 2;
    var nodeIndex = 0;

    for (var g = 0; g < totalGroups; g++) {
      var angle = startAngle + nodeIndex * angleStep;
      var nx = cx + Math.cos(angle) * radius;
      var ny = cy + Math.sin(angle) * radius;
      var key = groupKeys[g];
      var wordList = groups[key];

      var wordLabel = wordList.length > 3 ? wordList.slice(0, 3).join('/') + '...' : wordList.join('/');
      var groupNode = { id: 'group-' + key, label: key + ': ' + wordLabel, x: nx, y: ny, radius: 28, type: 'group', words: wordList, unitId: unitId };
      this.nodes.push(groupNode);
      this.edges.push({ from: centerNode.id, to: groupNode.id });
      nodeIndex++;
    }

    if (grammarPoints.length > 0) {
      var ga = startAngle + nodeIndex * angleStep;
      var gx = cx + Math.cos(ga) * radius;
      var gy = cy + Math.sin(ga) * radius;
      var grammarNames = [];
      for (var gp = 0; gp < Math.min(grammarPoints.length, 3); gp++) {
        grammarNames.push(grammarPoints[gp].title);
      }
      var grammarNode = { id: 'grammar-' + unitId, label: '语法: ' + grammarNames.join('/'), x: gx, y: gy, radius: 28, type: 'grammar', unitId: unitId };
      this.nodes.push(grammarNode);
      this.edges.push({ from: centerNode.id, to: grammarNode.id });
    }

    for (var e = 0; e < this.nodes.length; e++) {
      this.nodes[e].color = this.getNodeColor(this.nodes[e]);
    }
  },

  groupByTheme: function (words) {
    var groups = {};
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      var prefix = 'all';
      if (w.kgPoint) {
        var parts = w.kgPoint.split('_');
        prefix = parts.length > 1 ? parts.slice(1).join('_') : w.kgPoint;
      }
      if (w.pos) prefix = w.pos;
      if (!groups[prefix]) groups[prefix] = [];
      groups[prefix].push(w.w);
    }
    return groups;
  },

  getNodeColor: function (node) {
    if (node.type === 'center') return this.COLORS.centerFill;
    if (node.type === 'grammar') return this.getGrammarMastery(node.unitId);

    var masteredCount = 0;
    var total = (node.words || []).length;
    if (total === 0) return this.COLORS.notLearned;

    if (typeof Storage !== 'undefined' && Storage.get) {
      var status = Storage.get('word_status') || {};
      for (var i = 0; i < (node.words || []).length; i++) {
        var allWords = typeof Grade7Data !== 'undefined' ? Grade7Data.getAllWords() : [];
        for (var j = 0; j < allWords.length; j++) {
          if (allWords[j].w === node.words[i]) {
            if (status[allWords[j].id] && status[allWords[j].id].status === 'mastered') {
              masteredCount++;
            }
            break;
          }
        }
      }
    }

    var ratio = masteredCount / total;
    if (ratio >= 0.7) return this.COLORS.mastered;
    if (ratio > 0) return this.COLORS.learning;
    return this.COLORS.notLearned;
  },

  getGrammarMastery: function (unitId) {
    if (typeof Storage !== 'undefined' && Storage.get) {
      var gs = Storage.get('grammar_status') || {};
      var unit = typeof Grade7Data !== 'undefined' ? Grade7Data.getUnitById(unitId) : null;
      if (!unit || !unit.grammar) return this.COLORS.notLearned;
      var mastered = 0;
      for (var i = 0; i < unit.grammar.length; i++) {
        if (gs[unit.grammar[i].id] && gs[unit.grammar[i].id].status === 'mastered') mastered++;
      }
      var ratio = mastered / unit.grammar.length;
      if (ratio >= 0.7) return this.COLORS.mastered;
      if (ratio > 0) return this.COLORS.learning;
    }
    return this.COLORS.notLearned;
  },

  draw: function () {
    var ctx = this.ctx;
    var w = this.canvas.width;
    var h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);

    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);

    for (var i = 0; i < this.edges.length; i++) {
      var fromNode = this.findNode(this.edges[i].from);
      var toNode = this.findNode(this.edges[i].to);
      if (fromNode && toNode) {
        ctx.beginPath();
        ctx.moveTo(fromNode.x, fromNode.y);
        ctx.lineTo(toNode.x, toNode.y);
        ctx.strokeStyle = this.COLORS.edge;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    for (var j = 0; j < this.nodes.length; j++) {
      var n = this.nodes[j];
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
      ctx.fillStyle = n.color || this.COLORS.notLearned;
      ctx.fill();
      if (this.hoveredNode && this.hoveredNode.id === n.id) {
        ctx.strokeStyle = '#1d4ed8';
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      ctx.fillStyle = n.type === 'center' ? this.COLORS.centerText : '#fff';
      ctx.font = n.type === 'center' ? 'bold 12px sans-serif' : '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      var label = n.label;
      if (n.type !== 'center' && label.length > 15) label = label.substring(0, 13) + '..';
      ctx.fillText(label, n.x, n.y);
    }

    ctx.restore();
  },

  findNode: function (id) {
    for (var i = 0; i < this.nodes.length; i++) {
      if (this.nodes[i].id === id) return this.nodes[i];
    }
    return null;
  },

  getNodeAt: function (mx, my) {
    var cx = (mx - this.offsetX) / this.scale;
    var cy = (my - this.offsetY) / this.scale;
    for (var i = 0; i < this.nodes.length; i++) {
      var n = this.nodes[i];
      var dx = cx - n.x;
      var dy = cy - n.y;
      if (dx * dx + dy * dy <= n.radius * n.radius) {
        return n;
      }
    }
    return null;
  },

  bindCanvasEvents: function () {
    var self = this;
    this.canvas.addEventListener('mousedown', function (e) {
      self.isDragging = true;
      self.dragStartX = e.clientX - self.offsetX;
      self.dragStartY = e.clientY - self.offsetY;
      self.canvas.style.cursor = 'grabbing';
    });

    this.canvas.addEventListener('mousemove', function (e) {
      if (self.isDragging) {
        self.offsetX = e.clientX - self.dragStartX;
        self.offsetY = e.clientY - self.dragStartY;
        self.draw();
        return;
      }
      var rect = self.canvas.getBoundingClientRect();
      var scaleX = self.canvas.width / rect.width;
      var scaleY = self.canvas.height / rect.height;
      var mx = (e.clientX - rect.left) * scaleX;
      var my = (e.clientY - rect.top) * scaleY;
      var node = self.getNodeAt(mx, my);
      if (node !== self.hoveredNode) {
        self.hoveredNode = node;
        self.canvas.style.cursor = node ? 'pointer' : 'grab';
        self.draw();
      }
    });

    this.canvas.addEventListener('mouseup', function () {
      self.isDragging = false;
      self.canvas.style.cursor = self.hoveredNode ? 'pointer' : 'grab';
    });

    this.canvas.addEventListener('mouseleave', function () {
      self.isDragging = false;
      self.hoveredNode = null;
      self.canvas.style.cursor = 'grab';
      self.draw();
    });

    this.canvas.addEventListener('click', function (e) {
      if (self.isDragging) return;
      var rect = self.canvas.getBoundingClientRect();
      var scaleX = self.canvas.width / rect.width;
      var scaleY = self.canvas.height / rect.height;
      var mx = (e.clientX - rect.left) * scaleX;
      var my = (e.clientY - rect.top) * scaleY;
      var node = self.getNodeAt(mx, my);
      if (node && node.type === 'group') {
        if (typeof Utils !== 'undefined' && Utils.showNotification) {
          Utils.showNotification('点击了词组: ' + node.label, 'info');
        }
      }
      if (node && node.type === 'grammar') {
        if (typeof Utils !== 'undefined' && Utils.showNotification) {
          Utils.showNotification('点击了语法: ' + node.label, 'info');
        }
      }
    });

    this.canvas.addEventListener('wheel', function (e) {
      e.preventDefault();
      var delta = e.deltaY > 0 ? -0.1 : 0.1;
      var newScale = Math.max(0.3, Math.min(3, self.scale + delta));
      var rect = self.canvas.getBoundingClientRect();
      var scaleX = self.canvas.width / rect.width;
      var scaleY = self.canvas.height / rect.height;
      var mx = (e.clientX - rect.left) * scaleX;
      var my = (e.clientY - rect.top) * scaleY;
      self.offsetX = mx - (mx - self.offsetX) * (newScale / self.scale);
      self.offsetY = my - (my - self.offsetY) * (newScale / self.scale);
      self.scale = newScale;
      self.draw();
    });
  },

  updateColors: function () {
    for (var i = 0; i < this.nodes.length; i++) {
      this.nodes[i].color = this.getNodeColor(this.nodes[i]);
    }
    this.draw();
  }
};

window.KnowledgeMap = KnowledgeMap;
