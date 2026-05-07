var PrestudyCheck = {
  STORAGE_KEY: 'prestudy_log',
  DAILY_KEY: 'prestudy_today',

  _strategies: {
    happy: {
      reviewRatio: 0.4,
      newRatio: 0.6,
      difficulty: 1.1,
      encouragementMultiplier: 1.0,
      label: '挑战模式'
    },
    normal: {
      reviewRatio: 0.5,
      newRatio: 0.5,
      difficulty: 1.0,
      encouragementMultiplier: 1.0,
      label: '标准模式'
    },
    tired: {
      reviewRatio: 0.7,
      newRatio: 0.3,
      difficulty: 0.8,
      encouragementMultiplier: 1.5,
      label: '轻松模式'
    }
  },

  _currentStrategy: null,

  check: function () {
    if (this._alreadyCheckedToday()) return;

    this._showMoodModal();
  },

  _alreadyCheckedToday: function () {
    try {
      var today = new Date().toISOString().split('T')[0];
      var stored = localStorage.getItem(this.DAILY_KEY);
      if (stored && stored === today) return true;
    } catch (e) { }
    return false;
  },

  _showMoodModal: function () {
    var self = this;

    var html = '<div id="prestudyModal" style="position:fixed;top:0;left:0;right:0;bottom:0;' +
      'background:rgba(0,0,0,0.5);z-index:10002;display:flex;align-items:center;justify-content:center;">' +
      '<div style="background:white;border-radius:16px;padding:28px 24px;max-width:380px;' +
      'text-align:center;box-shadow:0 12px 48px rgba(0,0,0,0.2);">' +
      '<div style="font-size:2.5rem;margin-bottom:8px;">🌅</div>' +
      '<h3 style="margin-bottom:6px;">今天感觉怎么样？</h3>' +
      '<p style="color:#6b7280;font-size:0.85rem;margin-bottom:20px;">' +
      '选择你的状态，我会调整今天的学习计划 ~</p>' +
      '<div style="display:flex;gap:12px;justify-content:center;">' +
      '<button class="prestudyMoodBtn" data-mood="happy" ' +
      'style="padding:14px 18px;border:2px solid #e5e7eb;border-radius:12px;' +
      'background:white;cursor:pointer;transition:all 0.2s;font-size:1rem;">' +
      '😊<br><span style="font-size:0.75rem;">精神好</span></button>' +
      '<button class="prestudyMoodBtn" data-mood="normal" ' +
      'style="padding:14px 18px;border:2px solid #e5e7eb;border-radius:12px;' +
      'background:white;cursor:pointer;transition:all 0.2s;font-size:1rem;">' +
      '😐<br><span style="font-size:0.75rem;">还行</span></button>' +
      '<button class="prestudyMoodBtn" data-mood="tired" ' +
      'style="padding:14px 18px;border:2px solid #e5e7eb;border-radius:12px;' +
      'background:white;cursor:pointer;transition:all 0.2s;font-size:1rem;">' +
      '😴<br><span style="font-size:0.75rem;">有点累</span></button>' +
      '</div></div></div>';

    document.body.insertAdjacentHTML('beforeend', html);

    var buttons = document.querySelectorAll('.prestudyMoodBtn');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('mouseenter', function () {
        this.style.borderColor = '#6366f1';
        this.style.background = '#eef2ff';
      });
      buttons[i].addEventListener('mouseleave', function () {
        this.style.borderColor = '#e5e7eb';
        this.style.background = 'white';
      });
      buttons[i].addEventListener('click', function () {
        var mood = this.getAttribute('data-mood');
        self._selectMood(mood);
      });
    }

    setTimeout(function () {
      var modal = document.getElementById('prestudyModal');
      if (modal) {
        self._selectMood('normal');
      }
    }, 3000);
  },

  _selectMood: function (mood) {
    var modal = document.getElementById('prestudyModal');
    if (modal && modal.parentNode) {
      modal.parentNode.removeChild(modal);
    }

    var strategy = this._strategies[mood] || this._strategies.normal;
    this._currentStrategy = strategy;

    var today = new Date().toISOString().split('T')[0];

    try {
      localStorage.setItem(this.DAILY_KEY, today);

      var log = this._getLog();
      log.push({
        date: today,
        status: mood,
        strategy: strategy.label
      });
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(log));
    } catch (e) { }

    var messages = {
      happy: '今天状态不错！让我们来点挑战吧 🚀',
      normal: '稳扎稳打，一步一个脚印 👣',
      tired: '没关系，今天我们轻松学习，重在坚持 💪'
    };

    this._showToast(messages[mood] || messages.normal);

    var self = this;
    setTimeout(function () {
      self._showPreview();
    }, 2800);
  },

  _showPreview: function () {
    if (typeof PreviewEngine === 'undefined') return;

    var unitId = 1;
    try {
      if (typeof SmartWordsModule !== 'undefined' && SmartWordsModule.activeUnitId) {
        unitId = SmartWordsModule.activeUnitId;
      }
    } catch (e) { }

    var unit = Grade7Data.getUnitById(unitId);
    if (!unit || !unit.words || unit.words.length === 0) return;

    var overlay = document.createElement('div');
    overlay.id = 'previewOverlayContainer';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:10010;';
    document.body.appendChild(overlay);

    var self = this;
    PreviewEngine.startPreview(unit.words, overlay, function () {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      self._showToast('✅ 预习完成，准备开始学习吧！');
    });
  },

  _getLog: function () {
    try {
      var stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) { }
    return [];
  },

  _showToast: function (msg) {
    var toast = document.createElement('div');
    toast.style.cssText =
      'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);' +
      'background:#1f2937;color:white;padding:12px 24px;border-radius:20px;' +
      'font-size:0.9rem;z-index:10003;transition:opacity 0.3s;opacity:1;';
    toast.textContent = msg;
    document.body.appendChild(toast);

    setTimeout(function () {
      toast.style.opacity = '0';
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 2500);
  },

  getStrategy: function () {
    if (this._currentStrategy) {
      return this._currentStrategy;
    }

    var today = new Date().toISOString().split('T')[0];
    try {
      var stored = localStorage.getItem(this.DAILY_KEY);
      if (stored === today) {
        var log = this._getLog();
        for (var i = log.length - 1; i >= 0; i--) {
          if (log[i].date === today && log[i].status) {
            this._currentStrategy = this._strategies[log[i].status] || this._strategies.normal;
            return this._currentStrategy;
          }
        }
      }
    } catch (e) { }

    this._currentStrategy = this._strategies.normal;
    return this._currentStrategy;
  },

  init: function () {
    var enabled = localStorage.getItem('prestudy_enabled');
    this.enabled = enabled !== '0';
  }
};

window.PrestudyCheck = PrestudyCheck;
