// Daily Calendar System - 每日打卡日历
// Tracks daily learning streak and renders calendar

var DailyCalendar = {
  STORAGE_KEY: 'daily_calendar_data',
  data: null,

  init: function () {
    this.data = this.loadData();
    this.checkTodayActivity();
  },

  loadData: function () {
    try {
      var stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) { }
    return {
      days: {}, // { '2026-05-01': { count: 5, minutes: 12, words: ['chocolate', ...], hours: [9, 10, 14] } }
      streak: 0,
      longestStreak: 0,
      lastActiveDate: null
    };
  },

  saveData: function () {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) { }
  },

  getTodayKey: function () {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  },

  getYesterdayKey: function () {
    var d = new Date();
    d.setDate(d.getDate() - 1);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  },

  checkTodayActivity: function () {
    var today = this.getTodayKey();
    var yesterday = this.getYesterdayKey();
    var lastActive = this.data.lastActiveDate;

    if (!lastActive) {
      // First time user, streak starts today
      this.data.streak = 1;
      this.data.lastActiveDate = today;
      this.saveData();
      return;
    }

    if (lastActive === today) {
      // Already active today, no change
      return;
    }

    if (lastActive === yesterday) {
      // Active yesterday, streak continues
      this.data.streak++;
      this.data.lastActiveDate = today;
      if (this.data.streak > this.data.longestStreak) {
        this.data.longestStreak = this.data.streak;
      }
      this.saveData();
      return;
    }

    // Gap > 1 day, streak resets
    this.data.streak = 1;
    this.data.lastActiveDate = today;
    this.saveData();
  },

  recordActivity: function (wordId, minutes) {
    var today = this.getTodayKey();
    if (!this.data.days[today]) {
      this.data.days[today] = { count: 0, minutes: 0, words: [], hours: [] };
    }
    this.data.days[today].count++;
    this.data.days[today].minutes += (minutes || 0.5);
    if (wordId && this.data.days[today].words.indexOf(wordId) === -1) {
      this.data.days[today].words.push(wordId);
    }
    var currentHour = new Date().getHours();
    if (this.data.days[today].hours.indexOf(currentHour) === -1) {
      this.data.days[today].hours.push(currentHour);
    }
    this.data.lastActiveDate = today;
    this.checkTodayActivity();
    this.saveData();

    // Emit event
    if (typeof DataBridge !== 'undefined') {
      DataBridge.emit('progress:updated', { type: 'daily_activity', delta: 1 });
    }
  },

  getStreak: function () {
    return this.data.streak;
  },

  getLongestStreak: function () {
    return this.data.longestStreak;
  },

  getTodayData: function () {
    var today = this.getTodayKey();
    return this.data.days[today] || { count: 0, minutes: 0, words: [], hours: [] };
  },

  getMonthData: function (year, month) {
    if (!year) {
      var d = new Date();
      year = d.getFullYear();
      month = d.getMonth() + 1;
    }
    var result = {};
    var prefix = year + '-' + String(month).padStart(2, '0');
    for (var key in this.data.days) {
      if (key.indexOf(prefix) === 0) {
        result[key] = this.data.days[key];
      }
    }
    return result;
  },

  // Render calendar widget for dashboard
  renderCalendar: function (container) {
    var d = new Date();
    var year = d.getFullYear();
    var month = d.getMonth();
    var today = d.getDate();
    var firstDay = new Date(year, month, 1).getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var monthData = this.getMonthData(year, month + 1);

    var monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    var dayNames = ['日', '一', '二', '三', '四', '五', '六'];

    var html = '<div style="background:white;border-radius:12px;padding:1rem;box-shadow:0 2px 8px rgba(0,0,0,0.08);">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;">';
    html += '<span style="font-weight:700;font-size:1rem;">' + year + '年' + monthNames[month] + '</span>';
    html += '<span style="font-size:0.8rem;color:#6b7280;">连续 ' + this.data.streak + ' 天</span>';
    html += '</div>';

    // Day headers
    html += '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-bottom:4px;">';
    for (var i = 0; i < 7; i++) {
      html += '<div style="text-align:center;font-size:0.65rem;color:#9ca3af;font-weight:600;">' + dayNames[i] + '</div>';
    }
    html += '</div>';

    // Calendar grid
    html += '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;">';

    // Empty cells for days before 1st
    for (var e = 0; e < firstDay; e++) {
      html += '<div></div>';
    }

    // Day cells
    for (var day = 1; day <= daysInMonth; day++) {
      var dateKey = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
      var dayData = monthData[dateKey];
      var isToday = day === today;
      var isActive = !!dayData;
      var intensity = 0;
      if (dayData) {
        intensity = dayData.count >= 11 ? 3 : dayData.count >= 6 ? 2 : 1;
      }
      var colors = ['#f0fdf4', '#86efac', '#22c55e', '#16a34a'];
      var bgColor = isActive ? colors[intensity] : (isToday ? '#e0e7ff' : '#f9fafb');
      var textColor = isActive ? 'white' : (isToday ? '#4f46e5' : '#6b7280');

      html += '<div style="text-align:center;width:100%;aspect-ratio:1;display:flex;align-items:center;justify-content:center;' +
        'border-radius:6px;font-size:0.75rem;font-weight:' + (isToday ? '700' : '500') + ';' +
        'background-color:' + bgColor + ';color:' + textColor + ';' +
        (isActive ? 'cursor:pointer;' : '') +
        '" title="' + (dayData ? dayData.count + '题 · ' + Math.round(dayData.minutes) + '分钟' : '') + '">' + day + '</div>';
    }

    html += '</div></div>';
    container.innerHTML = html;
  },

  // Render streak card for smart learning home
  renderStreakCard: function () {
    return '<div style="background:white;border-radius:12px;padding:1rem;box-shadow:0 2px 8px rgba(0,0,0,0.08);text-align:center;">' +
      '<div style="font-size:2.5rem;font-weight:700;background:linear-gradient(135deg,#f59e0b,#ef4444);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">' + this.data.streak + '</div>' +
      '<div style="font-size:0.85rem;color:#6b7280;margin-top:0.25rem;"> 连续天数</div>' +
      '<div style="font-size:0.7rem;color:#9ca3af;margin-top:0.5rem;">历史最长: ' + this.data.longestStreak + ' 天</div>' +
      '</div>';
  },

  // Reset (for settings)
  reset: function () {
    this.data = { days: {}, streak: 0, longestStreak: 0, lastActiveDate: null };
    this.saveData();
  }
};
