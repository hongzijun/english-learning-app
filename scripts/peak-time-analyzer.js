var PeakTimeAnalyzer = {
  STORAGE_KEY: 'peak_time_stats',

  slots: [
    { id: 'morning', label: '早晨 6:00-10:00', icon: '🌅', range: [6, 10] },
    { id: 'lateMorning', label: '上午 10:00-12:00', icon: '☀️', range: [10, 12] },
    { id: 'afternoon', label: '下午 12:00-18:00', icon: '🌤', range: [12, 18] },
    { id: 'evening', label: '晚上 18:00-24:00', icon: '🌙', range: [18, 24] }
  ],

  _loadStats: function () {
    try {
      var raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? JSON.parse(raw) : this._createEmpty();
    } catch (e) {
      return this._createEmpty();
    }
  },

  _saveStats: function (stats) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stats));
    } catch (e) { }
  },

  _createEmpty: function () {
    var empty = {};
    for (var i = 0; i < this.slots.length; i++) {
      empty[this.slots[i].id] = { correct: 0, total: 0 };
    }
    return empty;
  },

  recordAnswer: function (correct) {
    var hour = new Date().getHours();
    var slotId = this._getSlot(hour);
    if (!slotId) return;

    var stats = this._loadStats();
    if (!stats[slotId]) {
      stats[slotId] = { correct: 0, total: 0 };
    }
    stats[slotId].total++;
    if (correct) {
      stats[slotId].correct++;
    }
    this._saveStats(stats);
  },

  _getSlot: function (hour) {
    for (var i = 0; i < this.slots.length; i++) {
      var range = this.slots[i].range;
      if (hour >= range[0] && hour < range[1]) {
        return this.slots[i].id;
      }
    }
    return null;
  },

  getStats: function () {
    var stats = this._loadStats();
    var result = {};
    for (var i = 0; i < this.slots.length; i++) {
      var slot = this.slots[i];
      var data = stats[slot.id] || { correct: 0, total: 0 };
      result[slot.id] = {
        label: slot.label,
        icon: slot.icon,
        correct: data.correct,
        total: data.total,
        rate: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0
      };
    }
    return result;
  },

  getBestTime: function () {
    var stats = this.getStats();
    var bestSlot = null;
    var bestRate = -1;

    var slotIds = Object.keys(stats);
    for (var i = 0; i < slotIds.length; i++) {
      var slot = stats[slotIds[i]];
      if (slot.total >= 3 && slot.rate > bestRate) {
        bestRate = slot.rate;
        bestSlot = slotIds[i];
      }
    }

    if (!bestSlot) return { name: '', label: '数据不足', icon: '📊', rate: 0 };

    return {
      name: bestSlot,
      label: stats[bestSlot].label,
      icon: stats[bestSlot].icon,
      rate: stats[bestSlot].rate
    };
  },

  renderPanel: function () {
    var best = this.getBestTime();
    var stats = this.getStats();
    var slotIds = Object.keys(stats);

    var html = '';
    html += '<div class="peak-time-panel" style="background:#fff;border-radius:14px;padding:16px;border:1px solid #e2e8f0;">';
    html += '<div style="font-size:0.95rem;font-weight:600;color:#1e293b;margin-bottom:12px;">⏰ 最佳学习时段分析</div>';

    if (best.name) {
      html += '<div style="background:linear-gradient(135deg,#eef2ff,#e0e7ff);border-radius:10px;padding:10px 14px;margin-bottom:12px;">';
      html += '<span style="font-size:0.85rem;color:#6366f1;font-weight:600;">' + best.icon + ' 最佳时段：' + best.label + '</span>';
      html += '<span style="float:right;font-size:0.85rem;color:#6366f1;font-weight:700;">正确率 ' + best.rate + '%</span>';
      html += '</div>';
    }

    html += '<div style="display:flex;flex-direction:column;gap:6px;">';
    for (var i = 0; i < slotIds.length; i++) {
      var slot = stats[slotIds[i]];
      var barColor = slot.rate >= 70 ? '#10b981' : (slot.rate >= 50 ? '#f59e0b' : '#e2e8f0');
      var barTextColor = slot.rate >= 70 ? '#fff' : '#475569';
      var isBest = best.name && slotIds[i] === best.name;

      html += '<div style="font-size:0.8rem;">';
      html += '<div style="display:flex;justify-content:space-between;margin-bottom:2px;">';
      html += '<span style="color:#1e293b;">' + slot.icon + ' ' + slot.label + (isBest ? ' ⭐' : '') + '</span>';
      html += '<span style="color:#64748b;">' + slot.rate + '% (' + slot.correct + '/' + slot.total + ')</span>';
      html += '</div>';
      html += '<div style="height:6px;background:#f1f5f9;border-radius:3px;overflow:hidden;">';
      html += '<div style="height:100%;width:' + slot.rate + '%;background:' + barColor + ';border-radius:3px;transition:width 0.3s;"></div>';
      html += '</div>';
      html += '</div>';
    }
    html += '</div>';

    var totalAnswers = 0;
    var totalCorrect = 0;
    for (var j = 0; j < slotIds.length; j++) {
      totalAnswers += stats[slotIds[j]].total;
      totalCorrect += stats[slotIds[j]].correct;
    }
    if (totalAnswers > 0) {
      var totalRate = Math.round((totalCorrect / totalAnswers) * 100);
      html += '<div style="text-align:center;font-size:0.75rem;color:#94a3b8;margin-top:10px;">总计 ' + totalAnswers + ' 题 | 总体正确率 ' + totalRate + '%</div>';
    }

    html += '</div>';
    return html;
  },

  getCurrentSlot: function () {
    var hour = new Date().getHours();
    var slotId = this._getSlot(hour);
    if (!slotId) return null;

    for (var i = 0; i < this.slots.length; i++) {
      if (this.slots[i].id === slotId) {
        return this.slots[i];
      }
    }
    return null;
  },

  resetStats: function () {
    this._saveStats(this._createEmpty());
  }
};

window.PeakTimeAnalyzer = PeakTimeAnalyzer;
