var GrammarSystemModule = {
  name: 'grammar-system',
  title: '语法闭环',
  icon: '📐',
  grammarNodes: [],
  weaknesses: {},

  init: function () {
    this._buildGraphData();
    if (typeof AdaptiveEngine !== 'undefined') {
      var map = AdaptiveEngine.getAllMasteryLevels ? AdaptiveEngine.getAllMasteryLevels() : [];
      for (var i = 0; i < map.length; i++) {
        if (map[i].probability < 0.4) {
          this.weaknesses[map[i].kgPoint] = (this.weaknesses[map[i].kgPoint] || 0) + 1;
        }
      }
    }
  },

  _buildGraphData: function () {
    var grammar = Grade7Data ? Grade7Data.getAllGrammar() : [];
    var dependencies = {
      1: [4, 5], 2: [5, 6], 6: [8, 9, 10], 7: [8, 9, 10],
      8: [9, 10], 11: [14], 13: [14],
      16: [17, 18], 17: [18, 19], 18: [19, 20],
      21: [22, 23, 24, 25], 22: [23, 24, 25],
      23: [24, 25], 26: [27, 28, 29, 30], 27: [28, 29, 30], 28: [29, 30]
    };

    this.grammarNodes = grammar.map(function (g) {
      return {
        id: g.id,
        title: g.title,
        concept: g.concept,
        examples: g.examples,
        tips: g.tips,
        structure: g.structure,
        dependencies: dependencies[g.id] || [],
        probability: typeof AdaptiveEngine !== 'undefined'
          ? AdaptiveEngine.getMasteryProbability(g.tips || 'grammar_' + g.id)
          : 0.5
      };
    });
  },

  render: function () {
    this._buildGraphData();
    var html = '<div class="card p-4" style="max-width:900px;margin:0 auto;">';
    html += '<h3 class="mb-1">📐 语法知识点图谱</h3>';
    html += '<p class="text-muted mb-3">颜色表示掌握程度：🟢 已掌握 | 🟡 学习中 | 🔴 薄弱</p>';

    html += '<div class="mb-4" style="min-height:500px;border:1px solid #e5e7eb;border-radius:8px;padding:1rem;overflow-x:auto;">';
    html += this._renderGraph();
    html += '</div>';

    html += '<div class="mb-4"><strong>⚠️ 薄弱语法点</strong></div>';
    var weakNodes = this.grammarNodes.filter(function (n) { return n.probability < 0.4; });
    if (weakNodes.length > 0) {
      html += '<div class="list-group mb-3">';
      for (var i = 0; i < Math.min(5, weakNodes.length); i++) {
        var wn = weakNodes[i];
        html += '<div class="list-group-item flex-between grammar-weak-item" data-id="' + wn.id + '" style="cursor:pointer;">';
        html += '<span>' + wn.title + '</span>';
        html += '<span class="badge bg-red">' + Math.round(wn.probability * 100) + '%</span>';
        html += '</div>';
      }
      html += '</div>';
    } else {
      html += '<div class="alert alert-success">👍 所有语法点掌握良好！</div>';
    }

    html += '<div id="grammarDetail" class="mt-4"></div>';
    html += '</div>';

    document.getElementById('main-content').innerHTML = html;
    this._bindGraphEvents();
  },

  _renderGraph: function () {
    var html = '';
    var nodes = this.grammarNodes;
    var columnSize = 6;
    var rows = Math.ceil(nodes.length / columnSize);

    for (var row = 0; row < rows; row++) {
      html += '<div class="grammar-row flex gap-2 mb-3 flex-wrap">';
      for (var col = 0; col < columnSize; col++) {
        var idx = row * columnSize + col;
        if (idx >= nodes.length) break;
        var node = nodes[idx];
        var color = node.probability >= 0.7 ? '#10b981' : node.probability >= 0.4 ? '#f59e0b' : '#ef4444';
        var status = node.probability >= 0.7 ? 'mastered' : node.probability >= 0.4 ? 'learning' : 'weak';

        html += '<div class="grammar-node card p-2 ' + status + '" data-id="' + node.id + '" style="flex:0 0 calc(16.66% - 0.5rem);min-width:120px;text-align:center;cursor:pointer;border:2px solid ' + color + ';border-radius:8px;">';
        html += '<div style="font-size:0.8rem;font-weight:600;">' + node.title + '</div>';
        html += '<div style="font-size:0.75rem;color:' + color + ';">' + Math.round(node.probability * 100) + '%</div>';
        html += '</div>';
      }
      html += '</div>';
    }

    return html;
  },

  _bindGraphEvents: function () {
    var self = this;
    var nodes = document.querySelectorAll('.grammar-node');
    nodes.forEach(function (n) {
      n.addEventListener('click', function () {
        var id = parseInt(this.dataset.id);
        self._showGrammarDetail(id);
      });
    });

    var weakItems = document.querySelectorAll('.grammar-weak-item');
    weakItems.forEach(function (item) {
      item.addEventListener('click', function () {
        var id = parseInt(this.dataset.id);
        self._showGrammarDetail(id);
      });
    });
  },

  _showGrammarDetail: function (id) {
    var node = this.grammarNodes.find(function (n) { return n.id === id; });
    if (!node) return;

    var color = node.probability >= 0.7 ? '#10b981' : node.probability >= 0.4 ? '#f59e0b' : '#ef4444';

    var html = '<div class="card p-4 mt-3" style="border-left:4px solid ' + color + ';">';
    html += '<h4>' + node.title + '</h4>';
    html += '<p class="text-muted">' + (node.concept || '') + '</p>';

    if (node.structure && node.structure.length > 0) {
      html += '<div class="mb-2"><strong>句型结构：</strong></div><ul>';
      for (var i = 0; i < node.structure.length; i++) {
        html += '<li>' + node.structure[i] + '</li>';
      }
      html += '</ul>';
    }

    if (node.examples && node.examples.length > 0) {
      html += '<div class="mb-2"><strong>例句：</strong></div><ul>';
      for (var j = 0; j < node.examples.length; j++) {
        html += '<li class="text-primary">' + node.examples[j] + '</li>';
      }
      html += '</ul>';
    }

    if (node.tips) {
      html += '<div class="alert alert-info">💡 ' + node.tips + '</div>';
    }

    var exercises = Grade7Data ? Grade7Data.getAllExercises() : [];
    var relatedEx = exercises.filter(function (e) {
      return e.d === (Math.ceil(id / 5)) || (e.kp && e.kp.indexOf(String(id)) !== -1);
    });

    if (relatedEx.length > 0 || !node.probability || node.probability < 0.6) {
      var targetEx = relatedEx.length >= 3 ? relatedEx.slice(0, 3) : exercises.slice(0, 3);
      html += '<div class="mt-3"><strong>🎯 靶向练习：</strong></div>';
      html += '<div class="list-group">';
      for (var k = 0; k < Math.min(3, targetEx.length); k++) {
        var ex = targetEx[k];
        html += '<div class="list-group-item">';
        html += '<small class="text-muted">题' + ex.id + '：</small> ' + ex.q;
        html += '<button class="btn btn-sm btn-outline mt-1 grammar-try-btn" data-id="' + ex.id + '">试一试</button>';
        html += '<div class="grammar-answer mt-1" style="display:none;">答案：' + (ex.o ? ex.o[ex.a] : ex.a) + (ex.exp ? ' | ' + ex.exp : '') + '</div>';
        html += '</div>';
      }
      html += '</div>';
    }

    html += '</div>';

    document.getElementById('grammarDetail').innerHTML = html;

    var self = this;
    setTimeout(function () {
      var tryBtns = document.querySelectorAll('.grammar-try-btn');
      tryBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
          var ansDiv = this.nextElementSibling;
          ansDiv.style.display = ansDiv.style.display === 'none' ? 'block' : 'none';
        });
      });
    }, 100);
  }
};