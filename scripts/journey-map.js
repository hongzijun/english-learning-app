var JourneyMap = {
  STORAGE_KEY: 'journey_map_data',

  _nodes: [
    { id: 'unit1', name: 'Unit 1 Feelings', type: 'unit' },
    { id: 'unit2', name: 'Unit 2 Go For It', type: 'unit' },
    { id: 'unit3', name: 'Unit 3 Food Matters', type: 'unit' },
    { id: 'midterm', name: '期中测评', type: 'checkpoint' },
    { id: 'unit4', name: 'Unit 4 Future Life', type: 'unit' },
    { id: 'unit5', name: 'Unit 5 Heroes', type: 'unit' },
    { id: 'unit6', name: 'Unit 6 Travel Town', type: 'unit' },
    { id: 'final', name: '期末冲刺', type: 'checkpoint' }
  ],

  render: function (container) {
    var el = typeof container === 'string'
      ? document.getElementById(container)
      : container;

    if (!el) return;

    var html = this._buildHTML();
    el.innerHTML = html;

    var self = this;
    setTimeout(function () { self._drawRings(); }, 100);
  },

  _buildHTML: function () {
    var html = '<div class="card p-4" style="max-width:900px;margin:0 auto;">';
    html += '<h3 class="mb-3">🗺️ 学期学习路线图</h3>';
    html += '<div id="journeyMapContainer" style="display:flex;align-items:center;' +
      'overflow-x:auto;padding:16px 0;gap:0;min-height:140px;">';

    var totalDays = this._getTotalStudyDays();
    var completedUnits = 0;

    for (var i = 0; i < this._nodes.length; i++) {
      var node = this._nodes[i];
      var progress = this.getUnitProgress(node.id);
      if (progress >= 100) completedUnits++;

      var status = 'locked';
      if (progress >= 100) {
        status = 'completed';
      } else if (progress > 0 || i === 0) {
        status = 'current';
      }

      html += this._renderNode(node, progress, status);

      if (i < this._nodes.length - 1) {
        var lineColor = '#e5e7eb';
        if (progress >= 100) lineColor = '#10b981';
        if (status === 'current') lineColor = '#f59e0b';
        html += '<div style="min-width:30px;height:3px;background:' + lineColor +
          ';border-radius:2px;flex-shrink:0;margin:0 -4px;position:relative;z-index:0;"></div>';
      }
    }

    html += '</div>';

    html += '<div style="text-align:center;margin-top:12px;color:#6b7280;font-size:0.9rem;">';
    html += '📅 已坚持 <strong style="color:#6366f1;">' + totalDays + '</strong> 天，';
    html += '完成 <strong style="color:#10b981;">' + completedUnits + '</strong>/6 单元，';
    html += '继续加油！💪';
    html += '</div>';

    var paceMsg = this._estimatePace(totalDays, completedUnits);
    if (paceMsg) {
      html += '<div style="text-align:center;margin-top:4px;color:#8b5cf6;font-size:0.8rem;">' +
        paceMsg + '</div>';
    }

    html += '</div>';
    return html;
  },

  _renderNode: function (node, progress, status) {
    var canvasId = 'journeyRing_' + node.id;
    var sizeClass = node.type === 'checkpoint' ? 'checkpoint' : 'unit';

    var icon = '';
    var bgColor = '';
    var borderColor = '';

    if (status === 'completed') {
      icon = '✅';
      bgColor = '#d1fae5';
      borderColor = '#10b981';
    } else if (status === 'current') {
      icon = '⏳';
      bgColor = '#fef3c7';
      borderColor = '#f59e0b';
    } else {
      icon = '🔒';
      bgColor = '#f3f4f6';
      borderColor = '#d1d5db';
    }

    var nodeWidth = sizeClass === 'checkpoint' ? '90px' : '100px';

    var html = '<div style="flex-shrink:0;text-align:center;position:relative;z-index:1;' +
      'min-width:' + nodeWidth + ';">';

    html += '<div style="position:relative;display:inline-block;">';
    html += '<canvas id="' + canvasId + '" width="56" height="56" ' +
      'style="display:block;margin:0 auto;"></canvas>';
    html += '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);' +
      'font-size:1.3rem;">' + icon + '</div>';
    html += '</div>';

    html += '<div style="font-size:0.75rem;margin-top:4px;font-weight:600;color:' +
      (status === 'locked' ? '#9ca3af' : '#374151') + ';line-height:1.3;">' +
      node.name + '</div>';

    if (status === 'completed') {
      var dateStr = this._getCompletionDate(node.id);
      if (dateStr) {
        html += '<div style="font-size:0.65rem;color:#10b981;">' + dateStr + '</div>';
      }
    } else if (status === 'current' && progress > 0) {
      html += '<div style="font-size:0.7rem;color:#f59e0b;">' + progress + '%</div>';
    }

    html += '</div>';
    return html;
  },

  _drawRings: function () {
    for (var i = 0; i < this._nodes.length; i++) {
      var node = this._nodes[i];
      var progress = this.getUnitProgress(node.id);
      var canvas = document.getElementById('journeyRing_' + node.id);
      if (!canvas) continue;

      var ctx = canvas.getContext('2d');
      var cx = 28;
      var cy = 28;
      var radius = 22;
      var lineWidth = 4;

      ctx.clearRect(0, 0, 56, 56);

      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = lineWidth;
      ctx.stroke();

      if (progress > 0 && progress < 100) {
        var angle = (progress / 100) * 2 * Math.PI - Math.PI / 2;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, -Math.PI / 2, angle);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.stroke();
      } else if (progress >= 100) {
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      }

      if (progress > 0) {
        ctx.fillStyle = '#1f2937';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(progress + '%', cx, cy);
      }
    }
  },

  getUnitProgress: function (unitId) {
    if (unitId === 'midterm') {
      return this._calcMidtermProgress();
    }
    if (unitId === 'final') {
      return this._calcFinalProgress();
    }

    return this._calcUnitProgress(unitId);
  },

  _calcUnitProgress: function (unitId) {
    var total = 0;
    var mastered = 0;

    try {
      var wordStatus = {};
      var stored = localStorage.getItem(typeof Storage !== 'undefined'
        ? Storage.PREFIX + Storage.keys.WORD_STATUS
        : 'english_learning_word_status');
      if (stored) wordStatus = JSON.parse(stored);

      var unitNum = parseInt(unitId.replace('unit', ''), 10);

      for (var key in wordStatus) {
        if (wordStatus.hasOwnProperty(key)) {
          var data = wordStatus[key];
          if (data && data.unit === unitNum) {
            total++;
            if (data.mastered || data.correctCount >= 3) {
              mastered++;
            }
          }
        }
      }
    } catch (e) { }

    if (total === 0) {
      try {
        if (typeof Grade7Data !== 'undefined' && Grade7Data.learningPath) {
          var path = Grade7Data.learningPath;
          for (var i = 0; i < path.length; i++) {
            if (path[i].id === unitId) {
              total = 10;
              break;
            }
          }
        }
      } catch (e) { }
    }

    if (total === 0 && typeof Grade7Data !== 'undefined' && Grade7Data.units) {
      var units = Grade7Data.units;
      var num = parseInt(unitId.replace('unit', ''), 10);
      for (var j = 0; j < units.length; j++) {
        if (units[j].id === num) {
          total = (units[j].words || []).length;
          break;
        }
      }
    }

    if (total === 0) return 0;
    return Math.round((mastered / total) * 100);
  },

  _calcMidtermProgress: function () {
    var progress1 = this._calcUnitProgress('unit1');
    var progress2 = this._calcUnitProgress('unit2');
    var progress3 = this._calcUnitProgress('unit3');
    var avg = (progress1 + progress2 + progress3) / 3;
    return Math.round(avg);
  },

  _calcFinalProgress: function () {
    var total = 0;
    var ids = ['unit1', 'unit2', 'unit3', 'unit4', 'unit5', 'unit6'];
    for (var i = 0; i < ids.length; i++) {
      total += this._calcUnitProgress(ids[i]);
    }
    return Math.round(total / ids.length);
  },

  _getTotalStudyDays: function () {
    try {
      if (typeof DailyCalendar !== 'undefined' && DailyCalendar.data) {
        var days = DailyCalendar.data.days || {};
        return Object.keys(days).length || 1;
      }
    } catch (e) { }

    try {
      var progress = localStorage.getItem(
        typeof Storage !== 'undefined'
          ? Storage.PREFIX + Storage.keys.LEARNING_PROGRESS
          : 'english_learning_learning_progress'
      );
      if (progress) {
        var data = JSON.parse(progress);
        return (data.dailyRecords || []).length || 1;
      }
    } catch (e) { }

    return 1;
  },

  _getCompletionDate: function (unitId) {
    try {
      var stored = localStorage.getItem('journey_map_data');
      if (stored) {
        var data = JSON.parse(stored);
        if (data.completions && data.completions[unitId]) {
          return data.completions[unitId];
        }
      }
    } catch (e) { }
    return '';
  },

  _estimatePace: function (totalDays, completedUnits) {
    if (totalDays === 0 || completedUnits >= 6) return '';
    var daysPerUnit = totalDays / Math.max(completedUnits, 1);
    var remaining = 6 - completedUnits;
    var estimatedDays = Math.round(daysPerUnit * remaining);

    var now = new Date();
    now.setDate(now.getDate() + estimatedDays);
    var estDate = now.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });

    return '⏱ 按当前进度，预计' + estDate + '完成全部6个单元';
  },

  saveCompletion: function (unitId) {
    try {
      var stored = localStorage.getItem(this.STORAGE_KEY);
      var data = stored ? JSON.parse(stored) : { completions: {} };
      if (!data.completions) data.completions = {};

      var now = new Date();
      data.completions[unitId] = now.toLocaleDateString('zh-CN', {
        month: 'short', day: 'numeric'
      });

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (e) { }
  }
};

window.JourneyMap = JourneyMap;
