var PomodoroTimer = {
  WORK_MINUTES: 25,
  BREAK_MINUTES: 5,
  AUTO_EXTEND_MINUTES: 2,
  STORAGE_KEY: 'pomodoro_data',
  RING_RADIUS: 54,
  RING_STROKE: 6,

  state: 'idle',
  isWork: true,
  remainingSeconds: 25 * 60,
  totalSeconds: 25 * 60,
  timerId: null,
  containerEl: null,

  start: function (containerEl) {
    if (this.state === 'running') return;
    if (this.state === 'paused') {
      this._resumeTimer();
      return;
    }
    this.containerEl = containerEl || document.body;
    this.state = 'running';
    this.isWork = true;
    this.totalSeconds = this.WORK_MINUTES * 60;
    this.remainingSeconds = this.totalSeconds;
    this._render();
    this._startTimer();
  },

  pause: function () {
    if (this.state !== 'running') return;
    this.state = 'paused';
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this._render();
  },

  reset: function () {
    this.state = 'idle';
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.isWork = true;
    this.totalSeconds = this.WORK_MINUTES * 60;
    this.remainingSeconds = this.totalSeconds;
    this._render();
  },

  _resumeTimer: function () {
    this.state = 'running';
    this._render();
    this._startTimer();
  },

  _startTimer: function () {
    var self = this;
    this.timerId = setInterval(function () {
      self._tick();
    }, 1000);
  },

  _tick: function () {
    if (this.remainingSeconds > 0) {
      this.remainingSeconds--;
      this._render();
      return;
    }
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this._onTimerEnd();
  },

  _onTimerEnd: function () {
    this._playAlert();
    if (this.isWork) {
      this.isWork = false;
      this.totalSeconds = this.BREAK_MINUTES * 60;
      this.remainingSeconds = this.totalSeconds;
      this._incrementPomodoro();
      this._showBreakNotification();
    } else {
      this.isWork = true;
      this.totalSeconds = this.WORK_MINUTES * 60;
      this.remainingSeconds = this.totalSeconds;
      this._hideBreakNotification();
    }
    this._render();
    this._startTimer();
  },

  _autoExtend: function () {
    try {
      if (typeof window.App !== 'undefined' && typeof window.App.isMidQuestion === 'function') {
        if (window.App.isMidQuestion()) {
          this.remainingSeconds += this.AUTO_EXTEND_MINUTES * 60;
          this.totalSeconds += this.AUTO_EXTEND_MINUTES * 60;
          return true;
        }
      }
    } catch (e) { }
    return false;
  },

  _playAlert: function () {
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      var frequencies = [523.25, 659.25, 783.99];
      for (var i = 0; i < frequencies.length; i++) {
        (function (freq, delay) {
          setTimeout(function () {
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.5);
          }, delay);
        })(frequencies[i], i * 200);
      }
    } catch (e) { }
  },

  _incrementPomodoro: function () {
    try {
      var data = this._loadData();
      var today = new Date().toISOString().split('T')[0];
      if (data.date !== today) {
        data.date = today;
        data.dailyCount = 0;
      }
      data.dailyCount++;
      data.totalCount++;
      this._saveData(data);
    } catch (e) { }
  },

  _loadData: function () {
    try {
      var raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? JSON.parse(raw) : { date: '', dailyCount: 0, totalCount: 0 };
    } catch (e) {
      return { date: '', dailyCount: 0, totalCount: 0 };
    }
  },

  _saveData: function (data) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (e) { }
  },

  _showBreakNotification: function () {
    var existing = document.getElementById('pomodoroBreak');
    if (existing) existing.remove();
    var note = document.createElement('div');
    note.id = 'pomodoroBreak';
    note.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#10b981,#059669);color:#fff;padding:12px 24px;border-radius:12px;z-index:10002;font-weight:600;font-size:0.95rem;box-shadow:0 4px 20px rgba(16,185,129,0.4);animation:pomodoroSlideIn 0.3s ease;';
    note.textContent = '☕ 休息时间到了！看看今天学过的单词吧';
    document.body.appendChild(note);
    this._renderBreakCards();
    setTimeout(function () {
      if (note.parentNode) note.remove();
    }, 5000);
  },

  _hideBreakNotification: function () {
    var note = document.getElementById('pomodoroBreak');
    if (note) note.remove();
    var cards = document.getElementById('pomodoroBreakCards');
    if (cards) cards.remove();
  },

  _renderBreakCards: function () {
    var existing = document.getElementById('pomodoroBreakCards');
    if (existing) existing.remove();
    var cards = document.createElement('div');
    cards.id = 'pomodoroBreakCards';
    cards.style.cssText = 'position:fixed;bottom:100px;right:20px;z-index:10002;max-width:260px;';
    var wordItems = this._getTodayWords();
    if (wordItems.length === 0) {
      cards.innerHTML = '<div style="background:#fff;border-radius:12px;padding:12px;box-shadow:0 4px 12px rgba(0,0,0,0.1);font-size:0.8rem;color:#64748b;">今天还没有学习单词</div>';
    } else {
      var html = '<div style="background:#fff;border-radius:12px;padding:12px;box-shadow:0 4px 12px rgba(0,0,0,0.1);">';
      html += '<div style="font-size:0.85rem;font-weight:600;color:#1e293b;margin-bottom:8px;">📚 今日已学</div>';
      for (var i = 0; i < wordItems.length && i < 5; i++) {
        html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid #f1f5f9;font-size:0.8rem;">';
        html += '<span style="color:#1e293b;font-weight:500;">' + wordItems[i].w + '</span>';
        html += '<span style="color:#64748b;">' + wordItems[i].m + '</span>';
        html += '</div>';
      }
      html += '</div>';
      cards.innerHTML = html;
    }
    document.body.appendChild(cards);
  },

  _getTodayWords: function () {
    var today = new Date().toISOString().split('T')[0];
    var words = [];
    try {
      if (typeof SpacedRepetition !== 'undefined' && typeof SpacedRepetition.getDailyStats === 'function') {
        var stats = SpacedRepetition.getDailyStats(new Date());
        if (stats && stats.reviews > 0) {
          return this._findReviewedWords(today);
        }
      }
    } catch (e) { }
    return words;
  },

  _findReviewedWords: function (today) {
    var words = [];
    try {
      if (typeof Grade7Data !== 'undefined' && Grade7Data.units) {
        var allWords = [];
        for (var i = 0; i < Grade7Data.units.length; i++) {
          var unit = Grade7Data.units[i];
          if (unit.words) {
            for (var j = 0; j < unit.words.length; j++) {
              allWords.push(unit.words[j]);
            }
          }
        }
        try {
          if (typeof SpacedRepetition !== 'undefined') {
            for (var k = 0; k < allWords.length && words.length < 5; k++) {
              var card = SpacedRepetition.getCard(allWords[k].id);
              if (card && card.lastReview) {
                var reviewDate = new Date(card.lastReview).toISOString().split('T')[0];
                if (reviewDate === today) {
                  words.push({ w: allWords[k].w, m: allWords[k].m });
                }
              }
            }
          }
        } catch (e) { }
      }
    } catch (e) { }
    return words;
  },

  _render: function () {
    if (!this.containerEl) return;
    var minutes = Math.floor(this.remainingSeconds / 60);
    var seconds = this.remainingSeconds % 60;
    var timeStr = (minutes < 10 ? '0' : '') + minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
    var progress = this.totalSeconds > 0 ? (this.totalSeconds - this.remainingSeconds) / this.totalSeconds : 0;
    var circumference = 2 * Math.PI * this.RING_RADIUS;
    var offset = circumference * (1 - progress);

    var color = this.isWork ? '#6366f1' : '#10b981';
    var label = this.isWork ? '专注' : '休息';
    var stateLabel = this.state === 'running' ? (this.isWork ? '学习中...' : '休息中...') :
      (this.state === 'paused' ? '已暂停' : '准备开始');

    var size = (this.RING_RADIUS + this.RING_STROKE) * 2 + 20;
    var center = size / 2;

    var html = '';
    html += '<div class="pomodoro-container" style="text-align:center;padding:12px;">';
    html += '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">';
    html += '<circle cx="' + center + '" cy="' + center + '" r="' + this.RING_RADIUS + '" fill="none" stroke="#e2e8f0" stroke-width="' + this.RING_STROKE + '"/>';
    html += '<circle cx="' + center + '" cy="' + center + '" r="' + this.RING_RADIUS + '" fill="none" stroke="' + color + '" stroke-width="' + this.RING_STROKE + '" stroke-linecap="round" stroke-dasharray="' + circumference + '" stroke-dashoffset="' + offset + '" transform="rotate(-90 ' + center + ' ' + center + ')" style="transition:stroke-dashoffset 0.3s;"/>';
    html += '<text x="' + center + '" y="' + (center - 8) + '" text-anchor="middle" fill="#1e293b" font-size="18" font-weight="700" font-family="monospace">' + timeStr + '</text>';
    html += '<text x="' + center + '" y="' + (center + 14) + '" text-anchor="middle" fill="#64748b" font-size="11" font-weight="500">' + stateLabel + '</text>';
    html += '</svg>';

    html += '<div style="margin-top:8px;">';
    if (this.state === 'running') {
      html += '<button onclick="PomodoroTimer.pause()" class="btn btn-sm" style="margin:2px 4px;padding:6px 14px;border:1px solid #e2e8f0;border-radius:8px;background:#fff;cursor:pointer;font-size:0.8rem;">⏸ 暂停</button>';
    } else {
      html += '<button onclick="PomodoroTimer.start()" class="btn btn-sm" style="margin:2px 4px;padding:6px 14px;border:1px solid #e2e8f0;border-radius:8px;background:#fff;cursor:pointer;font-size:0.8rem;">▶ 开始</button>';
    }
    html += '<button onclick="PomodoroTimer.reset()" class="btn btn-sm" style="margin:2px 4px;padding:6px 14px;border:1px solid #e2e8f0;border-radius:8px;background:#fff;cursor:pointer;font-size:0.8rem;">↺ 重置</button>';
    html += '</div>';

    var data = this._loadData();
    html += '<div style="font-size:0.7rem;color:#94a3b8;margin-top:6px;">今日: ' + data.dailyCount + ' 🍅 | 总计: ' + data.totalCount + ' 🍅</div>';
    html += '</div>';

    this.containerEl.innerHTML = html;
  },

  getStats: function () {
    return this._loadData();
  },

  init: function () {
    try {
      var enabled = localStorage.getItem('pomodoro_enabled');
      this.enabled = enabled !== '0';
    } catch (e) {
      this.enabled = true;
    }
  }
};

(function () {
  var style = document.createElement('style');
  style.textContent = '@keyframes pomodoroSlideIn { from{opacity:0;transform:translate(-50%,-20px);} to{opacity:1;transform:translate(-50%,0);} }';
  document.head.appendChild(style);
})();

window.PomodoroTimer = PomodoroTimer;
