var MemorySelfAssessment = {
  _results: [],
  _currentIndex: 0,
  _words: [],
  _onComplete: null,
  _container: null,

  LEVELS: [
    { l: 1, e: '😶', t: '完全忘记', bg: '#f3f4f6', c: '#6b7280', bd: '#d1d5db' },
    { l: 2, e: '🤔', t: '有点印象', bg: '#f5f3ff', c: '#7c3aed', bd: '#c4b5fd' },
    { l: 3, e: '💡', t: '模糊记得', bg: '#eff6ff', c: '#3b82f6', bd: '#93c5fd' },
    { l: 4, e: '👍', t: '基本记得', bg: '#f0fdf4', c: '#10b981', bd: '#6ee7b7' },
    { l: 5, e: '🌟', t: '非常熟悉', bg: '#fffbeb', c: '#f59e0b', bd: '#fcd34d' }
  ],

  _speakWord: function (word) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(word);
    u.lang = 'en-US';
    u.rate = 0.85;
    window.speechSynthesis.speak(u);
  },

  _buildBtns: function () {
    var h = '<div style="display:flex;flex-wrap:nowrap;gap:6px;justify-content:center;align-items:stretch;width:100%;max-width:95vw;">';
    for (var i = 0; i < this.LEVELS.length; i++) {
      var lv = this.LEVELS[i];
      h += '<button class="msaBtn" data-lv="' + lv.l + '" style="background:' + lv.bg +
        ';color:' + lv.c + ';border:2px solid ' + lv.bd + ';padding:6px 8px;' +
        'border-radius:10px;font-size:0.82rem;cursor:pointer;transition:all 0.2s;' +
        'flex:1 1 0;min-width:0;max-width:200px;text-align:center;line-height:1.2;" ' +
        'onmouseenter="this.style.transform=\'scale(1.06)\';this.style.boxShadow=\'0 3px 10px rgba(0,0,0,0.12)\'" ' +
        'onmouseleave="this.style.transform=\'scale(1)\';this.style.boxShadow=\'none\'">' +
        '<span style="font-size:1.2rem;">' + lv.e + '</span><br>' +
        '<span style="font-weight:600;font-size:0.78rem;">' + lv.t + '</span></button>';
    }
    return h + '</div>';
  },

  _renderCard: function () {
    var self = this;
    var w = this._words[this._currentIndex];
    this._container.style.opacity = '0';
    setTimeout(function () {
      self._container.innerHTML =
        '<div style="display:flex;flex-direction:column;align-items:center;' +
        'justify-content:center;min-height:60vh;padding:1rem;gap:1.5rem;">' +
        '<div style="font-size:0.95rem;color:#6b7280;font-weight:500;">' +
        '第 ' + (self._currentIndex + 1) + ' / ' + self._words.length + ' 个</div>' +
        '<div onclick="MemorySelfAssessment._speakWord(\'' + w.w + '\')" ' +
        'style="font-size:2.5rem;font-weight:700;color:#1f2937;cursor:pointer;' +
        'user-select:none;text-align:center;line-height:1.3;">' + w.w + '</div>' +
        '<button onclick="MemorySelfAssessment._speakWord(\'' + w.w + '\')" ' +
        'style="background:none;border:2px solid #e5e7eb;border-radius:50%;width:48px;' +
        'height:48px;font-size:1.3rem;cursor:pointer;transition:all 0.2s;" ' +
        'onmouseenter="this.style.borderColor=\'#6366f1\';this.style.background=\'#eef2ff\'" ' +
        'onmouseleave="this.style.borderColor=\'#e5e7eb\';this.style.background=\'white\'">🔊</button>' +
        '<div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;' +
        'max-width:380px;">' + self._buildBtns() + '</div></div>';
      self._container.style.transition = 'opacity 0.3s ease';
      self._container.style.opacity = '1';
      self._bindClicks();
      setTimeout(function () { self._speakWord(w.w); }, 400);
    }, 300);
  },

  _bindClicks: function () {
    var self = this;
    var btns = document.querySelectorAll('.msaBtn');
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener('click', function () {
        self._recordNext(parseInt(this.getAttribute('data-lv')));
      });
    }
  },

  _recordNext: function (level) {
    var w = this._words[this._currentIndex];
    if (!w) return;
    this._results.push({ wordId: w.id, word: w.w, level: level, meaning: w.m });
    this._currentIndex++;
    if (this._currentIndex >= this._words.length) {
      var self = this;
      this._container.style.opacity = '0';
      setTimeout(function () {
        self._container.innerHTML = '';
        self._container.style.opacity = '1';
        if (self._onComplete) self._onComplete(self._results);
      }, 300);
      return;
    }
    this._renderCard();
  },

  startAssessment: function (unitWords, container, onComplete) {
    this._words = unitWords || [];
    this._results = [];
    this._currentIndex = 0;
    this._container = container;
    this._onComplete = onComplete;
    if (!this._words.length) {
      if (onComplete) onComplete([]);
      return { getResults: function () { return []; }, skip: function () { } };
    }
    this._renderCard();
    var self = this;
    return {
      getResults: function () { return self._results; },
      skip: function () {
        self._currentIndex = self._words.length;
        self._container.innerHTML = '';
        if (self._onComplete) self._onComplete(self._results);
      }
    };
  },

  planLearningPath: function (results) {
    var priority = [], consolidate = [], allQuick = [];
    for (var i = 0; i < results.length; i++) {
      var r = results[i];
      var item = { wordId: r.wordId, word: r.word, meaning: r.meaning };
      if (r.level <= 2) priority.push(Object.assign({ originalLevel: r.level }, item));
      else if (r.level === 3) consolidate.push(item);
      else allQuick.push(item);
    }
    priority.sort(function (a, b) { return a.originalLevel - b.originalLevel; });
    var sampleCount = Math.ceil(allQuick.length * 0.3);
    var shuffled = allQuick.slice();
    for (var j = shuffled.length - 1; j > 0; j--) {
      var k = Math.floor(Math.random() * (j + 1));
      var t = shuffled[j]; shuffled[j] = shuffled[k]; shuffled[k] = t;
    }
    return {
      priority: priority, consolidate: consolidate,
      quickVerify: shuffled.slice(0, sampleCount),
      stats: {
        total: results.length, priorityCount: priority.length,
        consolidateCount: consolidate.length, quickVerifyCount: allQuick.length,
        sampleCount: sampleCount
      }
    };
  },

  generateSummary: function (results, plan) {
    var p = plan || this.planLearningPath(results);
    var s = p.stats;
    var preview = '';
    if (s.priorityCount > 0) {
      var names = p.priority.slice(0, 5).map(function (w) { return w.word; }).join('、');
      if (s.priorityCount > 5) names += ' 等' + s.priorityCount + '个';
      preview = '<p style="font-size:0.8rem;color:#991b1b;margin:4px 0 0;">' + names + '</p>';
    }
    var btnAction = 'LearningFlowController.gotoStage(\'memoryLearn\');return;';
    return '<div style="padding:1.5rem;max-width:420px;">' +
      '<h3 style="text-align:center;margin-bottom:0.5rem;">📊 你的记忆检测结果</h3>' +
      '<div style="background:#fef2f2;border-radius:10px;padding:12px;margin-bottom:10px;">' +
      '<strong>🔴 重点学习：' + s.priorityCount + ' 个词</strong>' + preview + '</div>' +
      '<div style="background:#eff6ff;border-radius:10px;padding:12px;margin-bottom:10px;">' +
      '<strong>🔵 巩固学习：' + s.consolidateCount + ' 个词</strong></div>' +
      '<div style="background:#f0fdf4;border-radius:10px;padding:12px;margin-bottom:10px;">' +
      '<strong>🟢 快速验证：' + s.quickVerifyCount + ' 个词（抽检' + s.sampleCount + '个）</strong></div>' +
      '<p style="text-align:center;color:#6b7280;font-size:0.9rem;margin:12px 0;">' +
      '⏱ 预计学习时间：约 ' + Math.max(1, Math.round(s.total * 0.5)) + ' 分钟</p>' +
      '<button onclick="' + btnAction + '" style="width:100%;padding:14px;' +
      'background:#6366f1;color:white;border:none;border-radius:12px;font-size:1.1rem;' +
      'font-weight:600;cursor:pointer;transition:all 0.2s;" ' +
      'onmouseenter="this.style.background=\'#4f46e5\'" ' +
      'onmouseleave="this.style.background=\'#6366f1\'">🚀 开始学习</button></div>';
  },

  verifyResults: function (selfAssessments, testResults) {
    var over = [], surprise = [], consistent = 0;
    var total = Math.min(selfAssessments.length, testResults.length);
    var tm = {};
    for (var i = 0; i < testResults.length; i++) tm[testResults[i].wordId] = testResults[i];
    for (var j = 0; j < selfAssessments.length; j++) {
      var sa = selfAssessments[j], tr = tm[sa.wordId];
      if (!tr) continue;
      if (sa.level >= 4 && !tr.correct) over.push({ wordId: sa.wordId, selfLevel: sa.level });
      else if (sa.level <= 2 && tr.correct) surprise.push({ wordId: sa.wordId, selfLevel: sa.level });
      else consistent++;
    }
    return {
      overrated: over, surprised: surprise, consistent: consistent,
      total: total, consistencyRate: total > 0 ? Math.round(consistent / total * 100) : 0
    };
  }
};

window.MemorySelfAssessment = MemorySelfAssessment;
