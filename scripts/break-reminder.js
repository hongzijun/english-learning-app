// Break Reminder - 智能休息提醒
// Monitors accuracy, consecutive wrongs, and session duration to suggest breaks

var BreakReminder = {
  STORAGE_KEY: 'break_log',
  COOLDOWN_MS: 30 * 60 * 1000,
  SESSION_MAX_MS: 45 * 60 * 1000,

  sessionStartTime: null,
  consecutiveWrong: 0,
  answerHistory: [],
  lastReminderTime: 0,
  onBreak: false,
  breakTimer: null,
  toastEl: null,

  init: function () {
    this.sessionStartTime = Date.now();
    this.consecutiveWrong = 0;
    this.answerHistory = [];
    this.lastReminderTime = 0;
    this.onBreak = false;
  },

  check: function (sessionData) {
    if (this.onBreak) return false;

    var now = Date.now();
    if (now - this.lastReminderTime < this.COOLDOWN_MS) return false;

    if (!sessionData) sessionData = {};

    if (typeof sessionData.correct === 'boolean') {
      if (sessionData.correct) {
        this.consecutiveWrong = 0;
      } else {
        this.consecutiveWrong++;
      }
      this.answerHistory.push(sessionData.correct);
      if (this.answerHistory.length > 20) {
        this.answerHistory = this.answerHistory.slice(-20);
      }
    }

    var triggerReason = '';

    if (this.consecutiveWrong >= 3) {
      triggerReason = 'consecutive';
    }

    if (!triggerReason && this.answerHistory.length >= 10) {
      var recent5 = this.answerHistory.slice(-5);
      var recentCorrect = 0;
      for (var i = 0; i < recent5.length; i++) {
        if (recent5[i]) recentCorrect++;
      }
      var recentAccuracy = recentCorrect / recent5.length;

      if (recentAccuracy < 0.4) {
        var prevStart = Math.max(0, this.answerHistory.length - 15);
        var prev10 = this.answerHistory.slice(prevStart, this.answerHistory.length - 5);
        if (prev10.length >= 5) {
          var prevCorrect = 0;
          for (var j = 0; j < prev10.length; j++) {
            if (prev10[j]) prevCorrect++;
          }
          if (prevCorrect / prev10.length > 0.7) {
            triggerReason = 'accuracy_drop';
          }
        }
      }
    }

    if (!triggerReason) {
      var sessionDuration = now - this.sessionStartTime;
      if (sessionDuration >= this.SESSION_MAX_MS) {
        triggerReason = 'duration';
      }
    }

    if (triggerReason) {
      this.showReminder(triggerReason);
      return true;
    }

    return false;
  },

  showReminder: function (reason) {
    var self = this;
    this.lastReminderTime = Date.now();

    if (this.toastEl) this.toastEl.remove();

    var toast = document.createElement('div');
    toast.id = 'breakReminderToast';
    toast.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#fff;border-radius:14px;padding:1.2rem 1.5rem;z-index:10001;box-shadow:0 8px 30px rgba(0,0,0,0.2);max-width:400px;width:90%;text-align:center;animation:breakSlideIn 0.4s ease;';

    toast.innerHTML = '<div style="font-size:2rem;margin-bottom:0.5rem;">🧠</div>' +
      '<p style="margin:0 0 1rem;font-size:0.95rem;line-height:1.5;color:#374151;">休息一下吧！你已经专注很久了，休息3分钟回来效率更高哦 💪</p>' +
      '<div style="display:flex;gap:0.5rem;justify-content:center;">' +
      '<button id="breakContinueBtn" style="padding:0.5rem 1.2rem;border:1px solid #d1d5db;border-radius:8px;background:#fff;cursor:pointer;font-size:0.9rem;">继续学习</button>' +
      '<button id="breakRestBtn" style="padding:0.5rem 1.2rem;border:none;border-radius:8px;background:#10b981;color:#fff;cursor:pointer;font-size:0.9rem;font-weight:600;">休息3分钟</button>' +
      '</div>' +
      '<div id="breakReviewCards" style="display:none;margin-top:1rem;"></div>';

    document.body.appendChild(toast);
    this.toastEl = toast;

    document.getElementById('breakContinueBtn').addEventListener('click', function () {
      self.dismissReminder();
    });

    document.getElementById('breakRestBtn').addEventListener('click', function () {
      self.startBreak();
    });

    setTimeout(function () {
      if (self.toastEl) self.dismissReminder();
    }, 15000);

    this.logBreak(reason, 'shown');
  },

  startBreak: function () {
    var self = this;
    this.onBreak = true;

    var toast = this.toastEl;
    if (!toast) return;

    toast.querySelector('#breakContinueBtn').style.display = 'none';
    toast.querySelector('#breakRestBtn').style.display = 'none';

    var reviewArea = document.getElementById('breakReviewCards');
    reviewArea.style.display = 'block';
    this.renderMiniCards(reviewArea);

    var countdown = 180;
    var timeDisplay = document.createElement('p');
    timeDisplay.id = 'breakCountdown';
    timeDisplay.style.cssText = 'margin:0.5rem 0;font-size:0.9rem;color:#6b7280;';
    timeDisplay.textContent = '休息中... ' + Math.floor(countdown / 60) + ':' + String(countdown % 60).padStart(2, '0');
    toast.appendChild(timeDisplay);

    this.breakTimer = setInterval(function () {
      countdown--;
      timeDisplay.textContent = '休息中... ' + Math.floor(countdown / 60) + ':' + String(countdown % 60).padStart(2, '0');
      if (countdown <= 0) {
        clearInterval(self.breakTimer);
        self.breakTimer = null;
        self.onBreak = false;
        self.sessionStartTime = Date.now();
        self.consecutiveWrong = 0;
        self.dismissReminder();
        if (typeof Utils !== 'undefined' && Utils.showNotification) {
          Utils.showNotification('休息结束，继续加油！💪', 'success');
        }
      }
    }, 1000);

    this.logBreak('rest', 'started');
  },

  renderMiniCards: function (container) {
    if (!container) return;
    var todayWords = [];

    if (typeof MemoryTracker !== 'undefined' && MemoryTracker._loadData) {
      var data = MemoryTracker._loadData();
      var todayKey = this.getTodayKey();
      var wordIds = Object.keys(data);
      for (var i = 0; i < wordIds.length; i++) {
        var tests = data[wordIds[i]].tests || [];
        for (var j = 0; j < tests.length; j++) {
          var testDate = new Date(tests[j].date);
          var testKey = testDate.getFullYear() + '-' + String(testDate.getMonth() + 1).padStart(2, '0') + '-' + String(testDate.getDate()).padStart(2, '0');
          if (testKey === todayKey) {
            todayWords.push({ id: wordIds[i], correct: tests[j].correct });
          }
        }
      }
    }

    if (todayWords.length === 0) {
      container.innerHTML = '<p style="font-size:0.85rem;color:#9ca3af;">今天还没学习单词呢～</p>';
      return;
    }

    var html = '<p style="font-size:0.85rem;color:#6b7280;margin:0 0 0.5rem;"> 今天学过的单词</p><div style="display:flex;flex-wrap:wrap;gap:0.4rem;justify-content:center;">';
    for (var k = 0; k < Math.min(todayWords.length, 8); k++) {
      var w = todayWords[k];
      var wordText = '';
      if (typeof Grade7Data !== 'undefined' && Grade7Data.getAllWords) {
        var allWords = Grade7Data.getAllWords();
        for (var m = 0; m < allWords.length; m++) {
          if (allWords[m].id === parseInt(w.id)) {
            wordText = allWords[m].w;
            break;
          }
        }
      }
      if (!wordText) wordText = '#' + w.id;
      html += '<span style="padding:0.3rem 0.6rem;background:' + (w.correct ? '#d1fae5' : '#fee2e2') + ';border-radius:6px;font-size:0.8rem;">' + wordText + '</span>';
    }
    html += '</div>';
    container.innerHTML = html;
  },

  dismissReminder: function () {
    if (this.breakTimer) {
      clearInterval(this.breakTimer);
      this.breakTimer = null;
    }
    this.onBreak = false;
    if (this.toastEl) {
      this.toastEl.remove();
      this.toastEl = null;
    }
  },

  logBreak: function (reason, action) {
    try {
      var logs = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
      logs.push({ reason: reason, action: action, timestamp: Date.now() });
      if (logs.length > 50) logs = logs.slice(-50);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(logs));
    } catch (e) { }
  },

  getTodayKey: function () {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  },

  isOnBreak: function () {
    return this.onBreak;
  }
};

(function () {
  var style = document.createElement('style');
  style.textContent = '@keyframes breakSlideIn { from { opacity:0; transform:translateX(-50%) translateY(-20px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }';
  document.head.appendChild(style);
})();

window.BreakReminder = BreakReminder;
