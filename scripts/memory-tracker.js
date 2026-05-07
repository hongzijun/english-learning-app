var MemoryTracker = {
  STORAGE_KEY: 'memory_tracker_data',
  SHORT_TERM_DAYS: 7,
  LONG_TERM_DAYS: 30,
  MIN_WORDS: 3,

  _loadData: function () {
    try {
      var raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  },

  _saveData: function (data) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (e) { }
  },

  recordTest: function (wordId, correct) {
    try {
      var data = this._loadData();
      if (!data[wordId]) {
        data[wordId] = {
          firstLearned: Date.now(),
          tests: []
        };
      }
      data[wordId].tests.push({
        date: Date.now(),
        correct: !!correct
      });
      this._saveData(data);
    } catch (e) { }
  },

  getShortTermRetention: function () {
    return this._calcRetention(this.SHORT_TERM_DAYS);
  },

  getLongTermRetention: function () {
    return this._calcRetention(this.LONG_TERM_DAYS);
  },

  _calcRetention: function (daysThreshold) {
    try {
      var data = this._loadData();
      var now = Date.now();
      var thresholdMs = daysThreshold * 24 * 60 * 60 * 1000;
      var total = 0;
      var correct = 0;

      var keys = Object.keys(data);
      for (var i = 0; i < keys.length; i++) {
        var entry = data[keys[i]];
        if (now - entry.firstLearned < thresholdMs) continue;
        if (!entry.tests || entry.tests.length === 0) continue;

        var lastTest = entry.tests[entry.tests.length - 1];
        total++;
        if (lastTest.correct) correct++;
      }

      if (total < this.MIN_WORDS) return null;
      return correct / total;
    } catch (e) {
      return null;
    }
  },

  getRetentionData: function () {
    try {
      var data = this._loadData();
      var totalTrackedWords = Object.keys(data).length;
      return {
        shortTerm: this.getShortTermRetention(),
        longTerm: this.getLongTermRetention(),
        totalTrackedWords: totalTrackedWords
      };
    } catch (e) {
      return { shortTerm: null, longTerm: null, totalTrackedWords: 0 };
    }
  },

  getTrend: function (days) {
    try {
      var data = this._loadData();
      var now = Date.now();
      var dayMs = 24 * 60 * 60 * 1000;
      var periodMs = days * dayMs;

      var calcPeriod = function (data, startMs, endMs) {
        var total = 0;
        var correct = 0;
        var keys = Object.keys(data);
        for (var i = 0; i < keys.length; i++) {
          var entry = data[keys[i]];
          if (!entry.tests || entry.tests.length === 0) continue;

          var bestTest = null;
          for (var j = 0; j < entry.tests.length; j++) {
            var t = entry.tests[j];
            if (t.date >= startMs && t.date <= endMs) {
              if (!bestTest || t.date > bestTest.date) {
                bestTest = t;
              }
            }
          }

          if (bestTest) {
            total++;
            if (bestTest.correct) correct++;
          }
        }

        if (total < 3) return 0;
        return correct / total;
      };

      var currentStart = now - periodMs;
      var currentEnd = now;
      var previousStart = currentStart - periodMs;
      var previousEnd = currentStart;

      var current = calcPeriod(data, currentStart, currentEnd);
      var previous = calcPeriod(data, previousStart, previousEnd);

      var change = current - previous;
      var direction = 'flat';
      if (change > 0.01) direction = 'up';
      else if (change < -0.01) direction = 'down';

      return {
        current: current,
        previous: previous,
        change: change,
        direction: direction
      };
    } catch (e) {
      return { current: 0, previous: 0, change: 0, direction: 'flat' };
    }
  },

  clearData: function () {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (e) { }
  }
};
