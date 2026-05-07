var DashboardModule = {
  name: 'dashboard',
  title: '数据看板',
  icon: '📊',

  init: function () {
    this._checkWeeklyReport();
    var self = this;
    if (typeof DataBridge !== 'undefined') {
      DataBridge.on('progress:updated', function () { self.render(); });
    }
  },

  render: function () {
    var html = '<div class="card p-4" style="max-width:900px;margin:0 auto;">';
    html += '<h3 class="mb-1">📊 学习数据看板</h3>';
    html += '<p class="text-muted mb-4">全面了解你的学习状态和进展</p>';

    html += this._renderHeatmap();
    html += this._renderWeaknessMap();
    html += this._renderProgress();
    html += this._renderRetentionCards();
    html += this._renderRecallAndPronCards();
    html += this._renderPeakTimeCard();
    html += this._renderJourneyMapCard();
    html += this._renderPaceTrendCard();
    html += this._renderPeerRankingCard();
    html += this._renderRecentNotesCard();
    html += this._renderSpiralReviewCard();
    html += this._renderWeeklyQuizCard();
    html += '</div>';

    document.querySelector('.main-content').innerHTML = html;
    var self = this;
    setTimeout(function () {
      self._drawHeatmap();
      self._drawProgressChart();
    }, 300);
  },

  _checkWeeklyReport: function () {
    var today = new Date();
    if (today.getDay() === 0) {
      var lastShown = localStorage.getItem('weekly_report_shown');
      var todayStr = today.toISOString().split('T')[0];
      if (lastShown !== todayStr) {
        localStorage.setItem('weekly_report_shown', todayStr);
        setTimeout(this._showWeeklyReportModal.bind(this), 2000);
      }
    }
  },

  _showWeeklyReportModal: function () {
    var report = {};
    if (typeof StorageEnhanced !== 'undefined' && StorageEnhanced.generateWeeklyReport) {
      report = StorageEnhanced.generateWeeklyReport();
    } else {
      report = { weekStart: '--', weekEnd: '--', wordsLearned: 0, accuracy: 0, suggestion: '继续加油！' };
    }

    var html = '<div id="weeklyReportModal" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;">';
    html += '<div class="card p-5" style="max-width:450px;text-align:center;">';
    html += '<div style="font-size:3rem;">📊</div>';
    html += '<h3 class="mt-2">本周学习报告</h3>';
    html += '<p class="text-muted">' + report.weekStart + ' ~ ' + report.weekEnd + '</p>';
    html += '<div class="grid-3 gap-2 mt-3">';
    html += '<div class="card p-2"><div style="font-size:1.5rem;font-weight:700;color:#6366f1;">' + (report.wordsLearned || 0) + '</div><small>学习单词</small></div>';
    html += '<div class="card p-2"><div style="font-size:1.5rem;font-weight:700;color:#10b981;">' + Math.round((report.accuracy || 0) * 100) + '%</div><small>正确率</small></div>';
    html += '<div class="card p-2"><div style="font-size:1.5rem;font-weight:700;color:#f59e0b;">' + Math.round((report.totalTime || 0) / 60) + '分</div><small>学习时长</small></div>';
    html += '</div>';
    html += '<div class="alert alert-info mt-3">' + (report.suggestion || '坚持就是胜利！') + '</div>';
    html += '<button class="btn btn-primary w-100" onclick="document.getElementById(\'weeklyReportModal\').remove()">知道了</button>';
    html += '</div></div>';
    document.body.insertAdjacentHTML('beforeend', html);
  },

  _renderHeatmap: function () {
    var html = '<div class="card p-3 mb-4">';
    html += '<h4 class="mb-3">📈 学习活动热力图（最近12个月）</h4>';
    html += '<canvas id="heatmapCanvas" width="900" height="180" style="width:100%;max-width:900px;cursor:pointer;"></canvas>';
    html += '<div id="heatmapTooltip" style="display:none;position:absolute;background:#1f2937;color:white;padding:6px 10px;border-radius:6px;font-size:0.75rem;pointer-events:none;z-index:1000;white-space:nowrap;"></div>';
    html += '<div style="display:flex;align-items:center;gap:6px;margin-top:8px;justify-content:flex-end;">';
    html += '<span style="font-size:0.7rem;color:#6b7280;">Less</span>';
    html += '<div style="width:14px;height:14px;border-radius:2px;background:#f0fdf4;border:1px solid #e5e7eb;"></div>';
    html += '<div style="width:14px;height:14px;border-radius:2px;background:#d1fae5;"></div>';
    html += '<div style="width:14px;height:14px;border-radius:2px;background:#6ee7b7;"></div>';
    html += '<div style="width:14px;height:14px;border-radius:2px;background:#16a34a;"></div>';
    html += '<span style="font-size:0.7rem;color:#6b7280;">More</span>';
    html += '</div></div>';
    return html;
  },

  _drawHeatmap: function () {
    var canvas = document.getElementById('heatmapCanvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var dpr = window.devicePixelRatio || 1;
    var displayW = 900, displayH = 180;
    canvas.width = displayW * dpr;
    canvas.height = displayH * dpr;
    canvas.style.width = displayW + 'px';
    canvas.style.height = displayH + 'px';
    ctx.scale(dpr, dpr);

    var days = {};
    if (typeof DailyCalendar !== 'undefined' && DailyCalendar.data && DailyCalendar.data.days) {
      days = DailyCalendar.data.days;
    }

    var today = new Date();
    var cellSize = 13;
    var cellGap = 2;
    var monthLabelH = 14;
    var dayLabelW = 22;

    // Build last ~12 months of weeks (columns)
    var weeks = [];
    var currentStart = new Date(today);
    currentStart.setDate(currentStart.getDate() - currentStart.getDay());
    // Go back to find the start of the first week (52 weeks ago)
    var startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 364);
    // Align to Sunday
    startDate.setDate(startDate.getDate() - startDate.getDay());

    var col = 0;
    var cellPositions = {}; // dateStr -> {x, y, count}
    var weekStart = new Date(startDate);

    while (weekStart <= today) {
      var weekDates = [];
      for (var d = 0; d < 7; d++) {
        var dayDate = new Date(weekStart);
        dayDate.setDate(weekStart.getDate() + d);
        if (dayDate <= today) {
          weekDates.push(dayDate);
        }
      }
      weeks.push(weekDates);
      weekStart.setDate(weekStart.getDate() + 7);
    }

    // Calculate dimensions
    var totalWeeks = weeks.length;
    var neededW = dayLabelW + totalWeeks * (cellSize + cellGap) + 10;
    var neededH = monthLabelH + 7 * (cellSize + cellGap) + 10;

    if (neededW > displayW || neededH > displayH) {
      // Scale down
      var scaleX = displayW / neededW;
      var scaleY = displayH / neededH;
      var scale = Math.min(scaleX, scaleY, 1);
      cellSize = Math.max(4, Math.floor(cellSize * scale));
      cellGap = Math.max(1, Math.floor(cellGap * scale));
      dayLabelW = Math.floor(dayLabelW * scale);
      monthLabelH = Math.floor(monthLabelH * scale);
      totalWeeks = weeks.length;
      neededW = dayLabelW + totalWeeks * (cellSize + cellGap) + 10;
      neededH = monthLabelH + 7 * (cellSize + cellGap) + 10;
    }

    canvas.width = Math.ceil(neededW * dpr);
    canvas.height = Math.ceil(neededH * dpr);
    canvas.style.width = Math.ceil(neededW) + 'px';
    canvas.style.height = Math.ceil(neededH) + 'px';
    ctx.scale(dpr, dpr);

    var monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Draw month labels
    var currentMonth = -1;
    ctx.fillStyle = '#6b7280';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';

    for (var w = 0; w < weeks.length; w++) {
      if (weeks[w].length === 0) continue;
      var firstDayOfWeek = weeks[w][0];
      var m = firstDayOfWeek.getMonth();
      if (m !== currentMonth) {
        currentMonth = m;
        var x = dayLabelW + w * (cellSize + cellGap);
        ctx.fillText(monthNames[m], x, monthLabelH - 2);
      }
    }

    // Draw day labels
    ctx.fillStyle = '#9ca3af';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'right';
    for (var dl = 0; dl < 7; dl++) {
      ctx.fillText(dayLabels[dl], dayLabelW - 3, monthLabelH + dl * (cellSize + cellGap) + cellSize - 2);
    }

    // Color function
    function getColor(count) {
      if (!count || count === 0) return '#f0fdf4';
      if (count <= 5) return '#d1fae5';
      if (count <= 10) return '#6ee7b7';
      return '#16a34a';
    }

    // Draw cells
    for (var w2 = 0; w2 < weeks.length; w2++) {
      for (var d2 = 0; d2 < weeks[w2].length; d2++) {
        var dateObj = weeks[w2][d2];
        var year = dateObj.getFullYear();
        var month = String(dateObj.getMonth() + 1).padStart(2, '0');
        var day = String(dateObj.getDate()).padStart(2, '0');
        var dateStr = year + '-' + month + '-' + day;

        var dayData = days[dateStr];
        var count = dayData ? (dayData.count || 0) : 0;

        var x = dayLabelW + w2 * (cellSize + cellGap);
        var y = monthLabelH + d2 * (cellSize + cellGap);

        ctx.fillStyle = getColor(count);
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 0.5;

        // Rounded rect
        var r = Math.min(2, cellSize / 4);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + cellSize - r, y);
        ctx.arcTo(x + cellSize, y, x + cellSize, y + r, r);
        ctx.lineTo(x + cellSize, y + cellSize - r);
        ctx.arcTo(x + cellSize, y + cellSize, x + cellSize - r, y + cellSize, r);
        ctx.lineTo(x + r, y + cellSize);
        ctx.arcTo(x, y + cellSize, x, y + cellSize - r, r);
        ctx.lineTo(x, y + r);
        ctx.arcTo(x, y, x + r, y, r);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        cellPositions[dateStr] = { x: x, y: y, w: cellSize, h: cellSize, count: count, dateStr: dateStr };
      }
    }

    // Tooltip on hover
    var tooltip = document.getElementById('heatmapTooltip');
    if (!tooltip) return;

    var self = this;
    canvas.onmousemove = function (e) {
      var rect = canvas.getBoundingClientRect();
      var mx = e.clientX - rect.left;
      var my = e.clientY - rect.top;

      var found = null;
      for (var key in cellPositions) {
        var p = cellPositions[key];
        if (mx >= p.x && mx <= p.x + p.w && my >= p.y && my <= p.y + p.h) {
          found = p;
          break;
        }
      }

      if (found) {
        var dayData2 = days[found.dateStr];
        var minutes = dayData2 ? Math.round(dayData2.minutes || 0) : 0;
        var tooltipText = found.dateStr + '  ' + found.count + '次练习' + (minutes > 0 ? ' · ' + minutes + '分钟' : '');
        tooltip.textContent = tooltipText;
        tooltip.style.display = 'block';
        tooltip.style.left = (e.clientX + 12) + 'px';
        tooltip.style.top = (e.clientY - 30) + 'px';
      } else {
        tooltip.style.display = 'none';
      }
    };

    canvas.onmouseleave = function () {
      tooltip.style.display = 'none';
    };
  },

  _renderWeaknessMap: function () {
    var topWeak = [];
    if (typeof AdaptiveEngine !== 'undefined') {
      var rec = AdaptiveEngine.getNextRecommendation();
      if (rec && rec.topWeaknesses) topWeak = rec.topWeaknesses;
    }

    var html = '<div class="card p-3 mb-4"><h4 class="mb-3">⚠️ 薄弱点地图（Top 5）</h4>';
    if (topWeak.length > 0) {
      html += '<div class="list-group">';
      for (var i = 0; i < Math.min(5, topWeak.length); i++) {
        var w = topWeak[i];
        var color = w.probability < 0.3 ? '#ef4444' : w.probability < 0.6 ? '#f59e0b' : '#10b981';
        html += '<div class="list-group-item flex-between">';
        html += '<span>' + w.kgPoint + '</span>';
        html += '<span style="color:' + color + ';font-weight:700;">' + Math.round(w.probability * 100) + '%</span>';
        html += '</div>';
      }
      html += '</div>';
    } else {
      html += '<div class="text-muted">暂无薄弱点数据，完成更多练习后会自动生成</div>';
    }
    html += '</div>';
    return html;
  },

  _renderProgress: function () {
    var html = '<div class="card p-3 mb-4"><h4 class="mb-3">📈 进步曲线（最近30天）</h4>';
    html += '<canvas id="progressChart" width="800" height="300" style="width:100%;max-width:800px;"></canvas>';
    html += '</div>';
    return html;
  },

  _drawProgressChart: function () {
    var canvas = document.getElementById('progressChart');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var w = canvas.width, h = canvas.height;
    var padding = { top: 30, right: 30, bottom: 40, left: 50 };
    var plotW = w - padding.left - padding.right;
    var plotH = h - padding.top - padding.bottom;

    var thetaHistory = [];
    if (typeof AdaptiveEngine !== 'undefined' && AdaptiveEngine.thetaHistory) {
      thetaHistory = AdaptiveEngine.thetaHistory.slice(-30);
    }

    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    for (var i = 0; i <= 4; i++) {
      var y = padding.top + plotH * i / 4;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();

      ctx.fillStyle = '#6b7280';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'right';
      var label = (3 * (1 - i / 2)).toFixed(1);
      ctx.fillText(label, padding.left - 5, y + 4);
    }

    ctx.fillStyle = '#6b7280';
    ctx.textAlign = 'center';
    ctx.fillText('能力值 θ', padding.left - 10, padding.top - 10);
    ctx.fillText('时间', w / 2, h - 5);

    if (thetaHistory.length < 2) {
      ctx.fillStyle = '#9ca3af';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('数据不足，完成更多练习后将显示进步曲线', w / 2, h / 2);
      return;
    }

    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2;
    ctx.beginPath();

    var stepX = plotW / Math.max(1, thetaHistory.length - 1);
    for (var j = 0; j < thetaHistory.length; j++) {
      var t = thetaHistory[j].theta || 0;
      t = Math.max(-3, Math.min(3, t));
      var px = padding.left + j * stepX;
      var py = padding.top + plotH * (1 - (t + 3) / 6);
      if (j === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // 点
    ctx.fillStyle = '#6366f1';
    for (var k = 0; k < thetaHistory.length; k++) {
      var t2 = thetaHistory[k].theta || 0;
      t2 = Math.max(-3, Math.min(3, t2));
      var px2 = padding.left + k * stepX;
      var py2 = padding.top + plotH * (1 - (t2 + 3) / 6);
      ctx.beginPath();
      ctx.arc(px2, py2, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  _renderRetentionCards: function () {
    var shortTerm = null, longTerm = null;
    if (typeof MemoryTracker !== 'undefined') {
      try {
        var data = MemoryTracker.getRetentionData();
        shortTerm = data.shortTerm;
        longTerm = data.longTerm;
      } catch (e) { }
    }

    var html = '<div class="card p-3 mb-4"><h4 class="mb-3">🧠 记忆留存率</h4>';
    html += '<div class="grid-2 gap-3">';

    html += '<div class="card p-3" style="background:linear-gradient(135deg,#dbeafe,#ede9fe);">';
    html += '<div style="font-size:0.85rem;color:#6366f1;font-weight:600;">7天短期留存</div>';
    if (shortTerm !== null) {
      var stPct = Math.round(shortTerm * 100);
      var stColor = stPct >= 70 ? '#10b981' : stPct >= 40 ? '#f59e0b' : '#ef4444';
      html += '<div style="font-size:2rem;font-weight:700;color:' + stColor + ';">' + stPct + '%</div>';
    } else {
      html += '<div style="font-size:1.5rem;font-weight:700;color:#6b7280;">数据不足</div>';
      html += '<div style="font-size:0.75rem;color:#6b7280;">学习7天后开始追踪</div>';
    }
    html += '</div>';

    html += '<div class="card p-3" style="background:linear-gradient(135deg,#d1fae5,#dbeafe);">';
    html += '<div style="font-size:0.85rem;color:#059669;font-weight:600;">30天长期留存</div>';
    if (longTerm !== null) {
      var ltPct = Math.round(longTerm * 100);
      var ltColor = ltPct >= 60 ? '#10b981' : ltPct >= 30 ? '#f59e0b' : '#ef4444';
      html += '<div style="font-size:2rem;font-weight:700;color:' + ltColor + ';">' + ltPct + '%</div>';
    } else {
      html += '<div style="font-size:1.5rem;font-weight:700;color:#6b7280;">数据不足</div>';
      html += '<div style="font-size:0.75rem;color:#6b7280;">学习30天后开始追踪</div>';
    }
    html += '</div>';
    html += '</div></div>';

    return html;
  },

  _renderRecallAndPronCards: function () {
    var recallStats = { totalAttempts: 0, correct: 0, lastMode: '-' };
    if (typeof ActiveRecall !== 'undefined') {
      try { recallStats = ActiveRecall.getStats(); } catch (e) { }
    }
    var recallRate = recallStats.totalAttempts > 0 ? Math.round(recallStats.correct / recallStats.totalAttempts * 100) : '-';

    var pronStats = { totalAttempts: 0, averageStars: 0, lastPractice: null };
    if (typeof PronunciationTrainer !== 'undefined') {
      try { pronStats = PronunciationTrainer.getPronunciationStats(); } catch (e) { }
    }

    var html = '<div class="card p-3 mb-4"><h4 class="mb-3">🎯 专项练习统计</h4>';
    html += '<div class="grid-2 gap-3">';

    html += '<div class="card p-3" style="background:linear-gradient(135deg,#fef3c7,#ede9fe);">';
    html += '<div style="font-size:0.85rem;color:#8b5cf6;font-weight:600;">🧠 主动回忆</div>';
    html += '<div style="font-size:1.5rem;font-weight:700;color:#8b5cf6;">' + recallRate + '%</div>';
    html += '<div style="font-size:0.75rem;color:#6b7280;">总练习: ' + recallStats.totalAttempts + '题</div>';
    html += '</div>';

    html += '<div class="card p-3" style="background:linear-gradient(135deg,#d1fae5,#fef3c7);">';
    html += '<div style="font-size:0.85rem;color:#059669;font-weight:600;">🎤 发音训练</div>';
    html += '<div style="font-size:1.5rem;font-weight:700;color:#059669;">' + (pronStats.averageStars || 0).toFixed(1) + ' ⭐</div>';
    html += '<div style="font-size:0.75rem;color:#6b7280;">总练习: ' + pronStats.totalAttempts + '次</div>';
    html += '</div>';

    html += '</div></div>';
    return html;
  },

  _renderPeakTimeCard: function () {
    var html = '<div class="card p-3 mb-4"><h4 class="mb-3">⏰ 最佳学习时段</h4>';
    if (typeof PeakTimeAnalyzer !== 'undefined') {
      var stats = PeakTimeAnalyzer.getStats();
      var best = PeakTimeAnalyzer.getBestTime();
      var slots = [
        { key: 'morning', label: '🌅 早晨', time: '6-10' },
        { key: 'lateMorning', label: '☀️ 上午', time: '10-12' },
        { key: 'afternoon', label: '🌤️ 下午', time: '12-18' },
        { key: 'evening', label: '🌙 晚上', time: '18-24' }
      ];
      for (var i = 0; i < slots.length; i++) {
        var s = stats[slots[i].key];
        var rate = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
        var isBest = best && best.name === slots[i].key;
        html += '<div style="display:flex;align-items:center;margin-bottom:8px;gap:8px;">';
        html += '<span style="width:90px;font-size:0.85rem;">' + slots[i].label + ' ' + slots[i].time + '</span>';
        html += '<div style="flex:1;background:#f3f4f6;border-radius:6px;height:20px;overflow:hidden;">';
        html += '<div style="height:100%;width:' + rate + '%;background:' + (isBest ? '#10b981' : '#6366f1') + ';border-radius:6px;transition:width 0.5s;"></div>';
        html += '</div>';
        html += '<span style="width:45px;font-size:0.8rem;text-align:right;font-weight:' + (isBest ? '700' : '400') + ';color:' + (isBest ? '#10b981' : '#6b7280') + ';">' + rate + '%' + (isBest ? ' ⭐' : '') + '</span>';
        html += '</div>';
      }
      if (best) {
        html += '<p style="font-size:0.8rem;color:#6b7280;margin-top:4px;">你最适合在 <strong>' + best.label + '</strong> 学习！此时间段正确率达 ' + best.rate + '%</p>';
      }
    } else {
      html += '<p class="text-muted">完成更多答题后会显示时段分析</p>';
    }
    html += '</div>';
    return html;
  },

  _renderJourneyMapCard: function () {
    var html = '<div class="card p-3 mb-4"><h4 class="mb-3">🗺️ 学习旅程</h4>';
    html += '<div id="journeyMapContainer" style="overflow-x:auto;padding:8px 0;"></div>';
    html += '</div>';
    var self = this;
    setTimeout(function () {
      var container = document.getElementById('journeyMapContainer');
      if (container && typeof JourneyMap !== 'undefined') {
        JourneyMap.render(container);
      }
    }, 100);
    return html;
  },

  _renderPaceTrendCard: function () {
    var html = '<div class="card p-3 mb-4"><h4 class="mb-3">📈 学习节奏趋势</h4>';
    if (typeof PaceRegulator !== 'undefined') {
      var pace = PaceRegulator.getCurrentPace();
      var labels = { fast: '🚀 高效模式', normal: '🚶 标准模式', slow: '🐢 精学模式' };
      html += '<p style="font-size:0.9rem;">当前节奏：<strong>' + (labels[pace] || labels.normal) + '</strong></p>';
      html += '<p style="font-size:0.75rem;color:#6b7280;">系统根据你的实时答题表现自动调节</p>';
    } else {
      html += '<p class="text-muted">开始答题后显示节奏分析</p>';
    }
    html += '</div>';
    return html;
  },

  _renderPeerRankingCard: function () {
    var html = '<div class="card p-3 mb-4"><h4 class="mb-3">🏆 学习排名</h4>';
    if (typeof PeerRanking !== 'undefined') {
      var rankings = PeerRanking.getRankings();
      var items = [
        { label: '📚 掌握单词', value: rankings.words.value + '个', pct: rankings.words.percentile },
        { label: '⏱️ 学习时间', value: Math.round(rankings.time.value) + '分钟', pct: rankings.time.percentile },
        { label: '🎯 正确率', value: rankings.accuracy.value + '%', pct: rankings.accuracy.percentile }
      ];
      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        html += '<div style="display:flex;align-items:center;margin-bottom:8px;gap:8px;">';
        html += '<span style="width:100px;font-size:0.85rem;">' + item.label + '</span>';
        html += '<div style="flex:1;background:#f3f4f6;border-radius:6px;height:16px;overflow:hidden;">';
        html += '<div style="height:100%;width:' + item.pct + '%;background:linear-gradient(90deg,#f59e0b,#f97316);border-radius:6px;"></div>';
        html += '</div>';
        html += '<span style="width:80px;font-size:0.8rem;text-align:right;font-weight:600;color:#f59e0b;">超过' + item.pct + '%</span>';
        html += '</div>';
      }
      html += '<p style="font-size:0.75rem;color:#9ca3af;margin-top:4px;">基于同年级学习者数据分布（仅本地计算）</p>';
    }
    html += '</div>';
    return html;
  },

  _renderRecentNotesCard: function () {
    var html = '<div class="card p-3 mb-4"><h4 class="mb-3">📝 最近学习笔记</h4>';
    if (typeof AutoNotes !== 'undefined') {
      var notes = AutoNotes.getRecent(3);
      if (notes && notes.length > 0) {
        for (var i = 0; i < notes.length; i++) {
          var n = notes[i];
          html += '<div style="border-left:3px solid #6366f1;padding:8px 12px;margin-bottom:8px;background:#fafafa;border-radius:0 6px 6px 0;">';
          html += '<div style="font-size:0.8rem;color:#6b7280;">' + new Date(n.timestamp).toLocaleDateString('zh-CN') + '</div>';
          html += '<div style="font-size:0.85rem;">📚 ' + (n.wordsStudied || 0) + '词 · 正确率' + Math.round((n.accuracy || 0) * 100) + '% · ' + Math.round(n.duration || 0) + '分钟</div>';
          if (n.weakWords && n.weakWords.length > 0) {
            html += '<div style="font-size:0.75rem;color:#ef4444;">⚠️ 薄弱: ' + n.weakWords.map(function (w) { return w.word; }).join(', ') + '</div>';
          }
          html += '</div>';
        }
      } else {
        html += '<p class="text-muted">完成学习后会显示笔记</p>';
      }
    }
    html += '</div>';
    return html;
  },

  _renderSpiralReviewCard: function () {
    var html = '<div class="card p-3 mb-4"><h4 class="mb-3">🔄 螺旋复习</h4>';
    if (typeof SpiralReview !== 'undefined') {
      var stats = SpiralReview.getDashboardStats();
      html += '<div style="display:flex;gap:16px;">';
      html += '<div style="text-align:center;flex:1;"><div style="font-size:1.5rem;font-weight:700;color:#6366f1;">' + (stats.totalReviews || 0) + '</div><small>累计螺旋复习</small></div>';
      html += '<div style="text-align:center;flex:1;"><div style="font-size:1.5rem;font-weight:700;color:#10b981;">' + Math.round((stats.completionRate || 0) * 100) + '%</div><small>完成率</small></div>';
      html += '</div>';
    } else {
      html += '<p class="text-muted">学习7天后自动启动</p>';
    }
    html += '</div>';
    return html;
  },

  _renderWeeklyQuizCard: function () {
    var html = '<div class="card p-3 mb-4"><h4 class="mb-3">📋 周度测评</h4>';
    if (typeof WeeklyQuiz !== 'undefined') {
      var results = WeeklyQuiz.getResults ? WeeklyQuiz.getResults() : [];
      if (results.length > 0) {
        var last = results[results.length - 1];
        html += '<div style="text-align:center;">';
        html += '<div style="font-size:2rem;font-weight:700;color:#6366f1;">' + last.score + '/' + last.total + '</div>';
        html += '<div style="font-size:0.85rem;color:#6b7280;">最近一次 · ' + new Date(last.date).toLocaleDateString('zh-CN') + '</div>';
        html += '<div style="font-size:0.85rem;color:#10b981;">正确率 ' + Math.round(last.accuracy * 100) + '%</div>';
        html += '</div>';
        if (results.length > 1) {
          html += '<div style="font-size:0.75rem;color:#9ca3af;text-align:center;margin-top:4px;">共完成 ' + results.length + ' 次测评</div>';
        }
      } else {
        html += '<p class="text-muted">每7天自动生成一次综合测评</p>';
      }
    }
    html += '</div>';
    return html;
  }

};