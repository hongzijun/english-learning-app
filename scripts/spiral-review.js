// Spiral Review - 螺旋上升复习系统
// Finds words due for spiral review, upgrades difficulty dimension, injects into queue

var SpiralReview = {
  STORAGE_KEY: 'spiral_review_data',
  DIMENSIONS: ['identify', 'spell', 'context', 'produce'],
  MIN_AGE_DAYS: 7,
  MIN_PROB: 0.4,
  MAX_PROB: 0.8,
  INJECT_COUNT: 10,

  init: function () {
    this.loadData();
  },

  loadData: function () {
    try {
      var stored = localStorage.getItem(this.STORAGE_KEY);
      this.data = stored ? JSON.parse(stored) : { records: [] };
    } catch (e) {
      this.data = { records: [] };
    }
  },

  saveData: function () {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) { }
  },

  getMasteryProbability: function (wordId) {
    if (typeof AdaptiveEngine !== 'undefined' && AdaptiveEngine.getMasteryProbability) {
      var allWords = typeof Grade7Data !== 'undefined' ? Grade7Data.getAllWords() : [];
      for (var i = 0; i < allWords.length; i++) {
        if (allWords[i].id === wordId) {
          return AdaptiveEngine.getMasteryProbability(allWords[i].kgPoint);
        }
      }
    }
    if (typeof Storage !== 'undefined' && Storage.get) {
      var status = Storage.get('word_status') || {};
      if (status[wordId] && status[wordId].status === 'mastered') return 0.9;
    }
    return 0.3;
  },

  getFirstLearnedDate: function (wordId) {
    if (typeof MemoryTracker !== 'undefined' && MemoryTracker._loadData) {
      var data = MemoryTracker._loadData();
      if (data[wordId] && data[wordId].firstLearned) {
        return new Date(data[wordId].firstLearned);
      }
    }
    if (typeof Storage !== 'undefined' && Storage.get) {
      var reviews = Storage.get('review_history') || [];
      for (var i = 0; i < reviews.length; i++) {
        if (reviews[i].wordId === wordId) {
          return new Date(reviews[i].timestamp);
        }
      }
    }
    return null;
  },

  getCurrentDimension: function (wordId) {
    for (var i = 0; i < this.data.records.length; i++) {
      if (this.data.records[i].wordId === wordId) {
        return this.data.records[i].upgradeDim || this.data.records[i].originalDim;
      }
    }
    for (var j = 0; j < this.data.records.length; j++) {
      if (this.data.records[j].wordId === wordId) {
        return this.data.records[j].originalDim;
      }
    }
    return 'identify';
  },

  getReviewCandidates: function () {
    var self = this;
    var candidates = [];
    var now = Date.now();
    var cutoff = now - self.MIN_AGE_DAYS * 24 * 60 * 60 * 1000;

    var allWords = typeof Grade7Data !== 'undefined' ? Grade7Data.getAllWords() : [];
    if (allWords.length === 0) return candidates;

    for (var i = 0; i < allWords.length; i++) {
      var w = allWords[i];
      var firstLearned = self.getFirstLearnedDate(w.id);
      if (!firstLearned || firstLearned.getTime() > cutoff) continue;

      var prob = self.getMasteryProbability(w.id);
      if (prob < self.MIN_PROB || prob > self.MAX_PROB) continue;

      var currentDim = self.getCurrentDimension(w.id);
      var upgraded = self.upgradeDimension(currentDim);
      if (upgraded === currentDim) continue;

      candidates.push({
        wordId: w.id,
        word: w.w,
        meaning: w.m,
        unitId: w.unitId,
        originalDim: currentDim,
        upgradeDim: upgraded,
        masteryProb: prob
      });
    }

    candidates.sort(function (a, b) {
      return a.masteryProb - b.masteryProb;
    });

    return candidates;
  },

  upgradeDimension: function (prevDim) {
    var idx = -1;
    for (var i = 0; i < this.DIMENSIONS.length; i++) {
      if (this.DIMENSIONS[i] === prevDim) {
        idx = i;
        break;
      }
    }
    if (idx === -1) return 'identify';
    if (idx >= this.DIMENSIONS.length - 1) return prevDim;
    return this.DIMENSIONS[idx + 1];
  },

  injectIntoQueue: function (unitId) {
    var candidates = this.getReviewCandidates();
    if (candidates.length === 0) return [];

    if (unitId) {
      var filtered = [];
      for (var i = 0; i < candidates.length; i++) {
        if (candidates[i].unitId === unitId) {
          filtered.push(candidates[i]);
        }
      }
      if (filtered.length > 0) candidates = filtered;
    }

    var injected = candidates.slice(0, this.INJECT_COUNT);

    for (var j = 0; j < injected.length; j++) {
      this.data.records.push({
        wordId: injected[j].wordId,
        originalDim: injected[j].originalDim,
        upgradeDim: injected[j].upgradeDim,
        correct: null,
        timestamp: Date.now()
      });
    }
    this.saveData();

    return injected;
  },

  recordResult: function (wordId, dim, correct) {
    for (var i = this.data.records.length - 1; i >= 0; i--) {
      if (this.data.records[i].wordId === wordId && this.data.records[i].upgradeDim === dim) {
        this.data.records[i].correct = !!correct;
        this.data.records[i].timestamp = Date.now();
        this.saveData();
        return;
      }
    }

    this.data.records.push({
      wordId: wordId,
      originalDim: dim,
      upgradeDim: dim,
      correct: !!correct,
      timestamp: Date.now()
    });
    this.saveData();
  },

  getCompletionRate: function () {
    var total = 0;
    var completed = 0;
    for (var i = 0; i < this.data.records.length; i++) {
      if (this.data.records[i].correct !== null) {
        total++;
        if (this.data.records[i].correct) completed++;
      }
    }
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  },

  getDashboardStats: function () {
    return {
      totalRecords: this.data.records.length,
      attempted: this.data.records.filter(function (r) { return r.correct !== null; }).length,
      correct: this.data.records.filter(function (r) { return r.correct === true; }).length,
      completionRate: this.getCompletionRate()
    };
  },

  resetForDay: function () {
    this.data.records = this.data.records.filter(function (r) {
      return r.correct !== null;
    });
    this.saveData();
  }
};

window.SpiralReview = SpiralReview;
