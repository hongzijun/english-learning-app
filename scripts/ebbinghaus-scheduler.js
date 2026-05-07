var EbbinghausScheduler = {
  version: '1.0.0',

  EBBINGHAUS_WINDOWS: [
    20 * 60 * 1000,
    1 * 60 * 60 * 1000,
    9 * 60 * 60 * 1000,
    1 * 24 * 60 * 60 * 1000,
    2 * 24 * 60 * 60 * 1000,
    4 * 24 * 60 * 60 * 1000,
    7 * 24 * 60 * 60 * 1000,
    15 * 24 * 60 * 60 * 1000,
    30 * 24 * 60 * 60 * 1000
  ],

  getNextReviewTime: function (repCount, sm2IntervalMs) {
    if (repCount >= this.EBBINGHAUS_WINDOWS.length) {
      return sm2IntervalMs;
    }
    var ebWindow = this.EBBINGHAUS_WINDOWS[repCount];
    if (!sm2IntervalMs || sm2IntervalMs <= 0) {
      return ebWindow;
    }
    return ebWindow < sm2IntervalMs ? ebWindow : sm2IntervalMs;
  },

  isDue: function (wordId, repCount, lastReviewed) {
    var state = this.getState();
    var wordState = state[wordId] || {};
    var sm2Interval = wordState.sm2Interval || 0;
    var interval = this.getNextReviewTime(repCount, sm2Interval);
    return Date.now() >= (lastReviewed + interval);
  },

  getDueWords: function () {
    var state = this.getState();
    var dueWords = [];
    var now = Date.now();
    for (var wordId in state) {
      if (state.hasOwnProperty(wordId)) {
        var entry = state[wordId];
        var repCount = entry.repCount || 0;
        var lastReviewed = entry.lastReviewed || 0;
        var sm2Interval = entry.sm2Interval || 0;
        var interval = this.getNextReviewTime(repCount, sm2Interval);
        if (now >= (lastReviewed + interval)) {
          dueWords.push(wordId);
        }
      }
    }
    return dueWords;
  },

  recordReview: function (wordId, repCount) {
    var state = this.getState();
    var existing = state[wordId] || {};
    state[wordId] = {
      repCount: repCount,
      lastReviewed: Date.now(),
      sm2Interval: existing.sm2Interval || 0
    };
    this.saveState(state);
  },

  getState: function () {
    try {
      var raw = localStorage.getItem('ebbinghaus_state');
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  },

  saveState: function (state) {
    try {
      localStorage.setItem('ebbinghaus_state', JSON.stringify(state));
    } catch (e) { }
  }
};
