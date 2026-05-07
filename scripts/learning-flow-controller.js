const MEMORY_LEVELS = [
  { level: 1, label: '完全忘记', color: '#6b7280', bg: '#f3f4f6' },
  { level: 2, label: '有点印象', color: '#7c3aed', bg: '#f5f3ff' },
  { level: 3, label: '模糊记得', color: '#3b82f6', bg: '#eff6ff' },
  { level: 4, label: '基本记得', color: '#10b981', bg: '#f0fdf4' },
  { level: 5, label: '非常熟悉', color: '#f59e0b', bg: '#fffbeb' }
];

const LearningFlowController = {
  _stage: 'idle', _unit: null, _plan: null, _results: null,
  _testResults: [], _stats: null, _container: null,
  _qIdx: 0, _queue: null, _mode: '',
  _learnRound: 0, _memoryLevels: null, _roundCount: 0,
  startFlow: function (unitId) {
    this._unit = Grade7Data.getUnitById(unitId);
    this._container = document.getElementById('moduleContent');
    if (!this._unit || !this._container) return;
    this._stats = { startTime: Date.now() };
    this._testResults = [];
    this._learnRound = 0;
    this._memoryLevels = {};
    this._roundCount = 0;
    this.gotoStage('assessment');
  },
  gotoStage: function (stage, data) {
    this._stage = stage;
    this._lastStageData = data;
    this._autoSave();
    var methodName = {
      assessment: '_doAssessment', plan: '_doPlan',
      memoryLearn: '_startMemoryLearn', finalCheck: '_startFinalCheck', report: '_doReport'
    }[stage];
    if (methodName && this[methodName]) {
      try { this[methodName](data); } catch (e) { console.error('[LearningFlow]', e); }
    }
  },
  _autoSave: function () {
    if (typeof App !== 'undefined' && App._autoSave) App._autoSave();
  },
  _getMemoryLevelCounts: function () {
    var counts = {};
    for (var i = 0; i < MEMORY_LEVELS.length; i++) {
      counts[MEMORY_LEVELS[i].level] = 0;
    }
    var ids = Object.keys(this._memoryLevels);
    for (var j = 0; j < ids.length; j++) {
      var lv = this._memoryLevels[ids[j]];
      counts[lv] = (counts[lv] || 0) + 1;
    }
    return counts;
  },
  _renderMemoryPanel: function () {
    var c = this._getMemoryLevelCounts();
    var show = (this._stage === 'plan' || this._stage === 'memoryLearn' || this._stage === 'finalCheck');
    if (!show || Object.keys(this._memoryLevels).length === 0) return '';
    var parts = [];
    for (var i = 0; i < MEMORY_LEVELS.length; i++) {
      var ml = MEMORY_LEVELS[i];
      var n = c[ml.level] || 0;
      parts.push('<span style="color:' + ml.color + ';font-weight:600;">' + ml.label + '(' + n + ')</span>');
    }
    return '<div style="background:#f8fafc;border-radius:8px;padding:6px 10px;margin-bottom:8px;' +
      'font-size:0.72rem;text-align:center;position:sticky;top:0;z-index:10;">' + parts.join(' | ') + '</div>';
  },
  _pb: function () {
    var names = ['检测', '规划', '词语学习', '最终检验', '报告'];
    var keys = ['assessment', 'plan', 'memoryLearn', 'finalCheck', 'report'];
    var idx = keys.indexOf(this._stage);
    var h = '<div style="display:flex;gap:3px;padding:8px 4px;flex-wrap:wrap;' +
      'justify-content:center;background:#f1f5f9;border-radius:10px;margin-bottom:8px;">';
    for (var i = 0; i < names.length; i++) {
      if (i < idx) h += '<span style="font-size:0.68rem;">🟢' + names[i] + '</span>';
      else if (i === idx) h += '<span style="font-size:0.68rem;animation:pulse 1s infinite;">🔵<b>' + names[i] + '</b></span>';
      else h += '<span style="font-size:0.68rem;opacity:0.3;">⚪' + names[i] + '</span>';
    }
    h += '</div>';
    h += this._renderMemoryPanel();
    h += this._stageInfo();
    return h;
  },
  _stageInfo: function () {
    var s = this._stage;
    if (s === 'assessment') {
      return '<div style="background:#fefce8;border-radius:10px;padding:8px 12px;margin-bottom:8px;' +
        'font-size:0.82rem;color:#a16207;">🧠 回忆你看到每个单词时的第一印象，选择对应的记忆程度</div>';
    } else if (s === 'memoryLearn' && this._queue) {
      var cur = this._qIdx + 1, total = this._queue.length;
      return '<div style="background:#eff6ff;border-radius:10px;padding:8px 12px;margin-bottom:8px;' +
        'font-size:0.8rem;color:#1e40af;">📖 第 ' + cur + ' / ' + total + ' 个（第 ' + (this._learnRound + 1) + ' 轮）</div>';
    } else if (s === 'finalCheck' && this._queue) {
      var c2 = this._qIdx + 1, t2 = this._queue.length;
      var right = 0; for (var ri = 0; ri < this._testResults.length; ri++) { if (this._testResults[ri].correct) right++; }
      return '<div style="background:#fef2f2;border-radius:10px;padding:8px 12px;margin-bottom:8px;' +
        'font-size:0.8rem;color:#dc2626;">🎯 第 ' + c2 + ' / ' + t2 + ' 个（已答对 ' + right + ' / ' + this._testResults.length + '，全部达到"非常熟悉"即可通过）</div>';
    }
    return '';
  },
  _fw: function (wordId) {
    var w = this._unit.words;
    for (var i = 0; i < w.length; i++) { if (w[i].id === wordId) return w[i]; }
    return null;
  },
  _sp: function (text) {
    if (!window.speechSynthesis || !text) return;
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US'; u.rate = 0.75;
    window.speechSynthesis.speak(u);
  },
  _doAssessment: function () {
    var self = this;
    MemorySelfAssessment.startAssessment(this._unit.words, this._container, function (results) {
      self._results = results;
      for (var i = 0; i < results.length; i++) {
        self._memoryLevels[results[i].wordId] = results[i].level;
      }
      self.gotoStage('plan', results);
    });
  },
  _doPlan: function (results) {
    var basePlan = MemorySelfAssessment.planLearningPath(results);
    var ml = this._memoryLevels;
    var priority = [], quickVerify = [];
    var allResults = results;
    for (var i = 0; i < allResults.length; i++) {
      var r = allResults[i];
      var item = { wordId: r.wordId, word: r.word, meaning: r.meaning };
      var level = ml[r.wordId];
      if (level === 4) quickVerify.push(item);
      else if (level === 3 || level === 2 || level === 1) priority.push(item);
    }
    var shuffled = quickVerify.slice();
    for (var j = shuffled.length - 1; j > 0; j--) {
      var k = Math.floor(Math.random() * (j + 1));
      var t = shuffled[j]; shuffled[j] = shuffled[k]; shuffled[k] = t;
    }
    this._plan = {
      priority: priority,
      consolidate: [],
      quickVerify: shuffled,
      stats: basePlan.stats
    };
    var s = MemorySelfAssessment.generateSummary(results, this._plan);
    this._container.innerHTML = this._pb() + s;
  },
  _startMemoryLearn: function () {
    this._learnRound++;
    this._qIdx = 0;
    var q = this._plan.priority.concat(this._plan.consolidate);
    this._queue = q.length ? q : this._plan.quickVerify;
    this._renderMemoryCard();
  },
  _renderMemoryCard: function () {
    var self = this;
    if (this._qIdx >= this._queue.length) {
      this.gotoStage('finalCheck');
      return;
    }
    var item = this._queue[this._qIdx];
    var word = this._fw(item.wordId) || item;
    var escapedW = word.w.replace(/'/g, "\\'");
    var escapedM = word.m.replace(/'/g, "\\'");
    var level = this._memoryLevels[word.id];
    var levelInfo = MEMORY_LEVELS.find(function (ml) { return ml.level === level; });
    var levelHtml = levelInfo ? '<div style="font-size:0.75rem;color:' + levelInfo.color + ';margin-bottom:6px;">' + levelInfo.label + '</div>' : '';
    var c = '<div style="max-width:420px;margin:0 auto;background:white;border-radius:16px;' +
      'padding:24px 20px;box-shadow:0 2px 12px rgba(0,0,0,0.08);text-align:center;">' +
      levelHtml +
      '<div style="font-size:2.2rem;font-weight:700;color:#1f2937;margin-bottom:4px;">' + word.w + '</div>' +
      '<div style="font-size:0.95rem;color:#6b7280;margin-bottom:6px;">' + (word.p || '') + '</div>' +
      '<button onclick="LearningFlowController._sp(\'' + escapedW + '\')" style="background:none;border:none;' +
      'font-size:1.5rem;cursor:pointer;margin-bottom:10px;">🔊</button>' +
      '<div id="meaningToggle" style="margin-top:8px;">' +
      '<button onclick="LearningFlowController._toggleMeaning(this,\'' + escapedM + '\')" ' +
      'style="padding:6px 16px;background:#f0fdf4;color:#10b981;border:1px solid #6ee7b7;border-radius:8px;' +
      'cursor:pointer;font-size:0.85rem;">👁️ 展开释义</button></div>' +
      '<div id="meaningContent" style="display:none;font-size:1.1rem;color:#374151;margin-top:8px;line-height:1.6;">' +
      (word.pos ? word.pos + ' ' : '') + '<b>' + word.m + '</b></div>' +
      (word.ex && word.ex[0] ? '<div style="font-size:0.85rem;color:#9ca3af;margin-top:8px;font-style:italic;">' + word.ex[0] + '</div>' : '') +
      '</div>' +
      '<div style="text-align:center;margin-top:16px;">' +
      '<button onclick="LearningFlowController._memDone(\'' + escapedW + '\',' + word.id + ')" ' +
      'style="padding:14px 48px;background:linear-gradient(135deg,#6366f1,#8b5cf6);' +
      'color:white;border:none;border-radius:14px;cursor:pointer;font-size:1.1rem;' +
      'font-weight:600;box-shadow:0 4px 12px rgba(99,102,241,0.3);transition:all 0.2s;">✅ 记忆完成</button>' +
      '</div>';
    this._container.innerHTML = this._pb() + c;
    this._sp(word.w);
  },
  _toggleMeaning: function (btn, meaning) {
    var content = document.getElementById('meaningContent');
    if (!content) return;
    if (content.style.display === 'none') {
      content.style.display = 'block';
      btn.innerHTML = '🙈 收起释义';
    } else {
      content.style.display = 'none';
      btn.innerHTML = '👁️ 展开释义';
    }
  },
  _memDone: function (wordText, wordId) {
    if (typeof SpacedRepetition !== 'undefined') {
      SpacedRepetition.rateCard(wordId, 4, 'encn');
    }
    this._autoSave();
    this._qIdx++;
    this._renderMemoryCard();
  },
  _startFinalCheck: function () {
    this._qIdx = 0;
    this._testResults = [];
    var allWordIds = Object.keys(this._memoryLevels);
    var notMastered = [];
    for (var i = 0; i < allWordIds.length; i++) {
      var id = allWordIds[i];
      if (this._memoryLevels[id] !== 5) {
        var w = this._fw(parseInt(id));
        if (w) notMastered.push({ wordId: w.id, word: w.w, meaning: w.m });
      }
    }
    this._queue = notMastered;
    if (!this._queue.length) {
      this.gotoStage('report');
      return;
    }
    this._renderCheckCard();
  },
  _renderCheckCard: function () {
    var self = this;
    if (this._qIdx >= this._queue.length) {
      this._evaluateCheck();
      return;
    }
    var word = this._fw(this._queue[this._qIdx].wordId) || this._queue[this._qIdx];
    var c = '<div style="max-width:420px;margin:0 auto;background:white;border-radius:16px;' +
      'padding:24px 20px;box-shadow:0 2px 12px rgba(0,0,0,0.08);text-align:center;">' +
      '<div style="font-size:0.85rem;color:#6b7280;margin-bottom:8px;">这个单词的中文意思是？</div>' +
      '<div style="font-size:2rem;font-weight:700;color:#1f2937;margin-bottom:12px;">' + word.w + '</div>' +
      '<input type="text" id="fcInput" placeholder="请输入中文意思..." ' +
      'style="width:100%;padding:12px;border:2px solid #d1d5db;border-radius:10px;font-size:1rem;text-align:center;" ' +
      'onkeydown="if(event.key===\'Enter\')LearningFlowController._fcSubmit()">' +
      '</div>' +
      '<div style="text-align:center;margin-top:12px;">' +
      '<button onclick="LearningFlowController._fcSubmit()" ' +
      'style="padding:12px 36px;background:#6366f1;color:white;border:none;border-radius:10px;' +
      'cursor:pointer;font-size:1rem;font-weight:600;">确认</button>' +
      '<button onclick="LearningFlowController._fcSkip()" ' +
      'style="padding:12px 24px;background:#f3f4f6;color:#6b7280;border:1px solid #d1d5db;border-radius:10px;' +
      'cursor:pointer;font-size:0.9rem;margin-left:8px;">不知道</button>' +
      '</div><div id="fcFeedback" style="margin-top:10px;"></div>';
    this._container.innerHTML = this._pb() + c;
    this._sp(word.w);
    setTimeout(function () { var el = document.getElementById('fcInput'); if (el) el.focus(); }, 100);
  },
  _checkAnswer: function (input, meaning) {
    if (!input || !meaning) return false;
    var clean = function (s) {
      return s.replace(/[a-zA-Z]+\.\s?/g, '').replace(/[()（）【】\[\]]/g, '')
        .replace(/[;；,，、\/\\·]/g, '|').replace(/\s+/g, '').toLowerCase();
    };
    var cleanInput = input.replace(/\s+/g, '').toLowerCase();
    var cleanMeaning = clean(meaning);
    var parts = cleanMeaning.split('|').filter(function (p) { return p.length > 0; });
    if (!parts.length) return meaning.indexOf(input) >= 0;
    for (var i = 0; i < parts.length; i++) {
      var core = parts[i];
      if (core.length <= 2) {
        if (cleanInput.indexOf(core) >= 0 || core.indexOf(cleanInput) >= 0) return true;
      } else {
        if (cleanInput.indexOf(core) >= 0) return true;
        var matchChars = 0;
        for (var j = 0; j < core.length; j++) {
          if (cleanInput.indexOf(core[j]) >= 0) matchChars++;
        }
        if (matchChars / core.length >= 0.6) return true;
      }
    }
    return false;
  },
  _fcSubmit: function () {
    var self = this;
    var inp = document.getElementById('fcInput');
    var val = inp ? inp.value.trim() : '';
    var word = this._fw(this._queue[this._qIdx].wordId) || this._queue[this._qIdx];
    var isCorrect = this._checkAnswer(val, word.m);
    var curLevel = this._memoryLevels[word.id];
    if (isCorrect) {
      if (curLevel === 4) this._memoryLevels[word.id] = 5;
      else if (curLevel === 3) this._memoryLevels[word.id] = 4;
      else if (curLevel === 2) this._memoryLevels[word.id] = 3;
      else if (curLevel === 1) this._memoryLevels[word.id] = 2;
    } else {
      if (curLevel === 4) this._memoryLevels[word.id] = 3;
      else if (curLevel === 3) this._memoryLevels[word.id] = 2;
      else if (curLevel === 2) this._memoryLevels[word.id] = 1;
    }
    this._testResults.push({ wordId: word.id, correct: isCorrect, input: val });
    var fb = document.getElementById('fcFeedback');
    if (fb) {
      if (isCorrect) {
        fb.innerHTML = '<div style="background:#dcfce7;border-radius:8px;padding:8px;color:#166534;">' +
          '<span style="font-weight:600;">✅ 正确！</span>' +
          '<span style="margin-left:8px;color:#374151;">' + word.m + '</span></div>';
        setTimeout(function () { self._qIdx++; self._renderCheckCard(); }, 2000);
        return;
      } else {
        fb.innerHTML = '<div style="background:#fef2f2;border-radius:8px;padding:8px;color:#dc2626;">' +
          '❌ 正确答案：<b>' + word.m + '</b></div>';
      }
    }
    this._autoSave();
    setTimeout(function () { self._qIdx++; self._renderCheckCard(); }, 1200);
  },
  _fcSkip: function () {
    var self = this;
    var word = this._fw(this._queue[this._qIdx].wordId) || this._queue[this._qIdx];
    this._testResults.push({ wordId: word.id, correct: false, input: '' });
    var fb = document.getElementById('fcFeedback');
    if (fb) {
      fb.innerHTML = '<div style="background:#fef2f2;border-radius:8px;padding:8px;color:#dc2626;">' +
        '💡 答案：<b>' + word.m + '</b></div>';
    }
    this._autoSave();
    setTimeout(function () { self._qIdx++; self._renderCheckCard(); }, 1200);
  },
  _evaluateCheck: function () {
    var allWordIds = Object.keys(this._memoryLevels);
    var allMastered = true;
    for (var i = 0; i < allWordIds.length; i++) {
      if (this._memoryLevels[allWordIds[i]] !== 5) {
        allMastered = false;
        break;
      }
    }
    if (allMastered) {
      this.gotoStage('report');
      return;
    }
    this._roundCount++;
    var notMasteredIds = [];
    for (var j = 0; j < allWordIds.length; j++) {
      var wid = allWordIds[j];
      if (this._memoryLevels[wid] !== 5) {
        var w = this._fw(parseInt(wid));
        if (w) notMasteredIds.push({ wordId: w.id, word: w.w, meaning: w.m });
      }
    }
    this._plan.priority = notMasteredIds;
    this._plan.consolidate = [];
    this._plan.quickVerify = [];
    this._testResults = [];
    var total = allWordIds.length;
    var mastered = total - notMasteredIds.length;
    var c = '<div style="max-width:440px;margin:0 auto;text-align:center;padding:20px;">' +
      '<div style="font-size:3rem;margin-bottom:12px;">🔄</div>' +
      '<h2 style="margin-bottom:8px;">还有单词未达标</h2>' +
      '<p style="color:#6b7280;margin-bottom:16px;">已达"非常熟悉"：' + mastered + '/' + total + '</p>' +
      '<p style="color:#6b7280;margin-bottom:20px;">需要继续学习的词汇：' + notMasteredIds.length + ' 个，返回词语学习...</p>' +
      '</div>';
    this._container.innerHTML = this._pb() + c;
    this._autoSave();
    var self = this;
    setTimeout(function () { self.gotoStage('memoryLearn'); }, 2000);
  },
  _doReport: function () {
    var vr = MemorySelfAssessment.verifyResults(this._results, this._testResults);
    var elapsed = Math.floor((Date.now() - this._stats.startTime) / 1000);
    var elapsedMin = Math.floor(elapsed / 60);
    var elapsedSec = elapsed % 60;
    var learningRounds = this._roundCount + 1;
    var cor = [], wro = [];
    for (var i = 0; i < this._testResults.length; i++) {
      var tr = this._testResults[i], w = this._fw(tr.wordId);
      if (!w) continue;
      if (tr.correct) cor.push(w.w); else wro.push(w.w);
    }
    var total = this._testResults.length;
    var correct = cor.length;
    var accuracy = total ? Math.round((correct / total) * 100) : 0;
    var counts = this._getMemoryLevelCounts();
    var levelDist = [];
    for (var j = 0; j < MEMORY_LEVELS.length; j++) {
      var ml = MEMORY_LEVELS[j];
      levelDist.push('<span style="color:' + ml.color + ';font-weight:600;">' + ml.label + '(' + (counts[ml.level] || 0) + ')</span>');
    }
    var h = '<div style="max-width:440px;margin:0 auto;padding:20px;">' +
      '<h2 style="text-align:center;margin-bottom:12px;">📊 学习报告</h2>' +
      '<div style="text-align:center;font-size:2.5rem;margin-bottom:4px;">🎉</div>' +
      '<div style="text-align:center;font-size:1.2rem;font-weight:700;color:#16a34a;margin-bottom:16px;">' +
      '正确率 ' + accuracy + '%（' + correct + '/' + total + '）</div>' +
      '<div style="background:#fefce8;border-radius:10px;padding:12px;margin-bottom:8px;' +
      'font-size:0.9rem;color:#a16207;">' +
      '<strong>⏱️ 学习时长：</strong>' + elapsedMin + '分' + elapsedSec + '秒</div>' +
      '<div style="background:#f5f3ff;border-radius:10px;padding:12px;margin-bottom:8px;' +
      'font-size:0.9rem;color:#7c3aed;">' +
      '<strong>🔄 学习轮次：</strong>' + learningRounds + ' 轮</div>' +
      '<div style="background:#f0fdf4;border-radius:10px;padding:12px;margin-bottom:8px;">' +
      '<strong>✅ 认识提升：</strong>' + (cor.length ? cor.join('、') : '无') + '</div>' +
      '<div style="background:#fef2f2;border-radius:10px;padding:12px;margin-bottom:8px;">' +
      '<strong>🔄 仍需复习：</strong>' + (wro.length ? wro.join('、') : '无') + '</div>' +
      '<div style="background:#eff6ff;border-radius:10px;padding:12px;margin-bottom:8px;">' +
      '<strong>📈 自评分析：</strong>自评过高 ' + vr.overrated.length + ' 个，惊喜掌握 ' + vr.surprised.length + ' 个</div>' +
      '<div style="background:#fafafa;border-radius:10px;padding:12px;margin-bottom:8px;font-size:0.85rem;">' +
      '<strong>📊 记忆程度分布：</strong><br>' + levelDist.join(' | ') + '</div>' +
      '<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:16px;">' +
      '<button onclick="LearningFlowController._finishAndReturn()" style="padding:12px 24px;background:#6366f1;' +
      'color:white;border:none;border-radius:10px;cursor:pointer;font-weight:600;">完成学习</button>' +
      (wro.length ? '<button onclick="LearningFlowController._retryWords()" style="padding:12px 20px;background:#fef2f2;' +
        'color:#dc2626;border:1px solid #fecaca;border-radius:10px;cursor:pointer;">重新学习错词</button>' : '') +
      '</div></div>';
    this._container.innerHTML = h;
  },
  _finishAndReturn: function () {
    var dm = typeof DragonMode !== 'undefined' ? DragonMode : null;
    if (dm && dm.state) {
      dm.state.currentMicroPhase++;
      dm._saveProgress();
      App.loadModule('dragon');
    } else {
      App.loadModule('smart-words');
    }
  },
  _retryWords: function () {
    var ids = {};
    for (var i = 0; i < this._testResults.length; i++) { if (!this._testResults[i].correct) ids[this._testResults[i].wordId] = true; }
    var retry = [], p = this._plan;
    var allQ = p.priority.concat(p.consolidate);
    for (var j = 0; j < allQ.length; j++) { if (ids[allQ[j].wordId]) retry.push(allQ[j]); }
    if (!retry.length) retry = allQ;
    p.priority = retry; p.consolidate = []; p.quickVerify = []; this._testResults = [];
    this.gotoStage('memoryLearn');
  }
};
window.LearningFlowController = LearningFlowController;
