var PaceRegulator = {
  STORAGE_KEY: 'pace_data',
  WINDOW_SIZE: 10,

  _sessionId: null,
  _history: [],
  _currentPace: 'normal',
  _paceChanges: [],

  init: function () {
    this._sessionId = 'session_' + Date.now();
    this._loadSession();
  },

  monitor: function (last10Results) {
    var results = last10Results || this._history;
    if (results.length < 3) return this._currentPace;

    var recent = results.slice(-this.WINDOW_SIZE);
    var correct = 0;
    for (var i = 0; i < recent.length; i++) {
      if (recent[i]) correct++;
    }
    var accuracy = correct / recent.length;

    var newPace = 'normal';
    if (accuracy >= 0.8) {
      newPace = 'fast';
    } else if (accuracy < 0.5) {
      newPace = 'slow';
    }

    if (newPace !== this._currentPace) {
      this._currentPace = newPace;

      this._paceChanges.push({
        timestamp: Date.now(),
        pace: newPace,
        accuracy: Math.round(accuracy * 100)
      });

      this._saveSession();
      this._applyPace(newPace);
    }

    return this._currentPace;
  },

  recordResult: function (isCorrect) {
    this._history.push(isCorrect);
    if (this._history.length > 50) {
      this._history = this._history.slice(-50);
    }
    return this.monitor(this._history);
  },

  _applyPace: function (pace) {
    var animations = document.querySelectorAll('.transition-animation, .feedback-animation');
    for (var i = 0; i < animations.length; i++) {
      if (pace === 'fast') {
        animations[i].style.transitionDuration = '0.15s';
      } else if (pace === 'slow') {
        animations[i].style.transitionDuration = '0.5s';
      } else {
        animations[i].style.transitionDuration = '0.3s';
      }
    }
  },

  getCurrentPace: function () {
    return this._currentPace;
  },

  getNewQuestionRatio: function () {
    switch (this._currentPace) {
      case 'fast':
        return 0.55;
      case 'slow':
        return 0.30;
      default:
        return 0.45;
    }
  },

  shouldShowExplanation: function () {
    return this._currentPace === 'slow';
  },

  _loadSession: function () {
    try {
      var stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        var data = JSON.parse(stored);
        this._currentPace = data.currentPace || 'normal';
        this._paceChanges = data.paceChanges || [];
        this._sessionId = data.sessionId || this._sessionId;
        this._history = data.history || [];
      }
    } catch (e) { }
  },

  _saveSession: function () {
    try {
      var data = {
        sessionId: this._sessionId,
        currentPace: this._currentPace,
        paceChanges: this._paceChanges,
        history: this._history
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (e) { }
  },

  reset: function () {
    this._sessionId = 'session_' + Date.now();
    this._history = [];
    this._currentPace = 'normal';
    this._paceChanges = [];
    localStorage.removeItem(this.STORAGE_KEY);
  }
};

window.PaceRegulator = PaceRegulator;
