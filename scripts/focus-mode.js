var FocusMode = {
  sessionStart: null,
  timerEl: null,
  timerInterval: null,
  isActive: false,
  originalLayout: {},

  enter: function () {
    if (this.isActive) return;
    this.isActive = true;
    this.sessionStart = Date.now();

    var sidebar = document.querySelector('.sidebar');
    var mainContent = document.querySelector('.main-content');
    var moduleNav = document.querySelector('.module-nav');
    var menuToggle = document.getElementById('menuToggle');

    if (sidebar) {
      this.originalLayout.sidebarWidth = sidebar.style.width;
      this.originalLayout.sidebarDisplay = sidebar.style.display;
      sidebar.style.transition = 'width 0.4s ease, opacity 0.4s ease';
      sidebar.style.overflow = 'hidden';
      sidebar.style.width = '0px';
      sidebar.style.opacity = '0';
      sidebar.style.padding = '0';
      sidebar.style.margin = '0';
      sidebar.style.pointerEvents = 'none';
      sidebar.style.visibility = 'hidden';
    }

    if (menuToggle) {
      menuToggle.style.pointerEvents = 'none';
      menuToggle.style.opacity = '0';
    }

    if (mainContent) {
      this.originalLayout.mainMargin = mainContent.style.marginLeft;
      mainContent.style.transition = 'margin-left 0.4s ease';
      mainContent.style.marginLeft = '0';
      mainContent.style.maxWidth = '100%';
    }

    if (moduleNav) {
      this.originalLayout.navPointer = moduleNav.style.pointerEvents;
      moduleNav.style.pointerEvents = 'none';
      moduleNav.style.opacity = '0.5';
    }

    this.renderTimer();
    this.startTimerUpdate();

    var self = this;
    document.addEventListener('keydown', self._escHandler);
  },

  exit: function () {
    if (!this.isActive) return;
    this._restore();
  },

  _restore: function () {
    var sidebar = document.querySelector('.sidebar');
    var mainContent = document.querySelector('.main-content');
    var moduleNav = document.querySelector('.module-nav');
    var menuToggle = document.getElementById('menuToggle');

    if (sidebar) {
      sidebar.style.width = this.originalLayout.sidebarWidth || '260px';
      sidebar.style.opacity = '1';
      sidebar.style.visibility = '';
      sidebar.style.pointerEvents = '';
      sidebar.style.padding = '';
      sidebar.style.margin = '';
      sidebar.style.overflow = '';
    }

    if (menuToggle) {
      menuToggle.style.pointerEvents = '';
      menuToggle.style.opacity = '';
    }

    if (mainContent) {
      mainContent.style.marginLeft = this.originalLayout.mainMargin || '';
      mainContent.style.maxWidth = '';
    }

    if (moduleNav) {
      moduleNav.style.pointerEvents = this.originalLayout.navPointer || '';
      moduleNav.style.opacity = '';
    }

    this._recordSession();
    this._removeTimer();
    this.isActive = false;
    this.sessionStart = null;

    var self = this;
    document.removeEventListener('keydown', self._escHandler);
  },

  _escHandler: function (e) {
    if (e.key === 'Escape') {
      FocusMode.exit();
    }
  },

  renderTimer: function () {
    var existing = document.getElementById('focus-timer');
    if (existing) existing.remove();
    var existingExit = document.getElementById('focus-exit');
    if (existingExit) existingExit.remove();

    this.timerEl = document.createElement('div');
    this.timerEl.id = 'focus-timer';
    this.timerEl.style.cssText = 'position:fixed;top:12px;right:16px;z-index:9999;'
      + 'background:rgba(30,30,30,0.85);color:#fff;padding:8px 16px;border-radius:8px 0 0 8px;'
      + 'font-size:14px;font-family:monospace;pointer-events:none;';
    this.timerEl.textContent = '⏱ 00:00';
    document.body.appendChild(this.timerEl);

    var exitBtn = document.createElement('button');
    exitBtn.id = 'focus-exit';
    exitBtn.textContent = '✕ 退出';
    exitBtn.style.cssText = 'position:fixed;top:12px;right:0;z-index:9999;'
      + 'background:rgba(220,38,38,0.85);color:#fff;padding:8px 12px;border-radius:0 8px 8px 0;'
      + 'font-size:13px;font-family:inherit;cursor:pointer;border:none;transition:background 0.2s;'
      + 'pointer-events:auto;';
    exitBtn.onmouseenter = function () { exitBtn.style.background = 'rgba(185,28,28,0.95)'; };
    exitBtn.onmouseleave = function () { exitBtn.style.background = 'rgba(220,38,38,0.85)'; };
    var self = this;
    exitBtn.onclick = function () { self.exit(); };
    document.body.appendChild(exitBtn);
  },

  startTimerUpdate: function () {
    var self = this;
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(function () {
      if (!self.sessionStart || !self.timerEl) return;
      var elapsed = Math.floor((Date.now() - self.sessionStart) / 1000);
      var min = Math.floor(elapsed / 60);
      var sec = elapsed % 60;
      self.timerEl.textContent = '⏱ ' + String(min).padStart(2, '0') + ':'
        + String(sec).padStart(2, '0');
    }, 1000);
  },

  _removeTimer: function () {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.timerEl) {
      this.timerEl.remove();
      this.timerEl = null;
    }
  },

  _recordSession: function () {
    var endTime = Date.now();
    var duration = Math.floor((endTime - this.sessionStart) / 1000);
    if (duration < 5) return;

    var sessions = [];
    try {
      sessions = JSON.parse(localStorage.getItem('focus_sessions') || '[]');
    } catch (e) { }

    sessions.push({
      startTime: this.sessionStart,
      endTime: endTime,
      duration: duration
    });

    try {
      localStorage.setItem('focus_sessions', JSON.stringify(sessions));
    } catch (e) { }
  },

  getTotalFocusTime: function () {
    var sessions = [];
    try {
      sessions = JSON.parse(localStorage.getItem('focus_sessions') || '[]');
    } catch (e) { }
    var total = 0;
    for (var i = 0; i < sessions.length; i++) {
      total += sessions[i].duration || 0;
    }
    return total;
  }
};

window.FocusMode = FocusMode;
