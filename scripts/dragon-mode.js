var DragonMode = {
  name: 'dragon',
  title: '一条龙',
  icon: '🐉',

  state: null,
  vocabState: null,
  _waitReviewQueue: [],

  MICRO_PHASES: [
    { id: 'preview', label: '学习预热', icon: '📖' },
    { id: 'new-lesson', label: '新课学习', icon: '📝' },
    { id: 'active-recall', label: '主动回忆', icon: '🧠' },
    { id: 'practice', label: '即时练习', icon: '✏️' },
    { id: 'pronunciation', label: '发音训练', icon: '🎤' },
    { id: 'mistake-fix', label: '错题订正', icon: '🔧' },
    { id: 'unit-diagnostic', label: '单元诊断', icon: '📊' },
    { id: 'gap-fill', label: '查漏补缺', icon: '🔍' }
  ],

  SEMESTER_PHASES: [
    { id: 'global-diagnostic', label: '综合诊断', icon: '🏥', desc: '4维度全学期诊断' },
    { id: 'mock-exam', label: '全真模考', icon: '📋', desc: '25题45分钟限时' },
    { id: 'final-report', label: '综合复盘', icon: '📊', desc: '数据分析与冲刺建议' }
  ],

  // Optimized: 4 effective dimensions with auto-credit
  VOCAB_DIMS: [
    { id: 'identify', label: '辨义合一', icon: '👁', tip: '听发音 + 看英文，选中文意思' },
    { id: 'spell', label: '拼写合一', icon: '✍', tip: '听发音，拼写英文单词' },
    { id: 'context', label: '语境填空', icon: '📝', tip: '句中挖空，填入正确形式' },
    { id: 'produce', label: '主动造句', icon: '💬', tip: '看中文，写出英文句子' }
  ],

  PATH_CONFIG: {
    fast: { minBkt: 0.75, dims: ['context', 'produce'], label: '🟢快速', desc: '已基本掌握' },
    standard: { minBkt: 0.4, dims: ['spell', 'context', 'produce'], label: '🟡标准', desc: '需巩固拼写' },
    deep: { maxBkt: 0.4, dims: ['identify', 'spell', 'context', 'produce'], label: '🔴深度', desc: '需全面学习' }
  },

  // ===== Task 1: 状态存储 =====
  _saveProgress: function () {
    if (!this.state) return;
    localStorage.setItem('dragon_progress', JSON.stringify(this.state));
    if (typeof App !== 'undefined' && App._autoSave) App._autoSave();

    var phasesDone = this.state.unitPhasesDone[this.state.currentUnit] || [];
    if (phasesDone.length >= this.MICRO_PHASES.length) {
      if (typeof AdaptiveEngine !== 'undefined' && AdaptiveEngine.calibrateParams) {
        try { AdaptiveEngine.calibrateParams(); } catch (e) { }
      }
    }
  },

  _loadProgress: function () {
    var raw = localStorage.getItem('dragon_progress');
    if (raw) {
      try { this.state = JSON.parse(raw); } catch (e) { this.state = null; }
    }
    if (!this.state) {
      this.state = {
        mode: 'unit',           // 'unit' | 'semester'
        currentUnit: 1,
        currentMicroPhase: 0,   // index into MICRO_PHASES
        completedUnits: {},     // { '1': 'passed' | 'gap-filled' | null }
        unitPhasesDone: {},     // { '1': [phaseId, ...] }
        learnedWords: {},       // { 'wordId': { dimsDone: [0,1,2,...], mastered: bool } }
        masteredWordIds: [],
        unitScores: {},         // { '1': { 'new-lesson': 85, 'practice': 70, ... } }
        errorCounts: {},        // { 'kgPoint': count }
        sessionStart: Date.now(),
        gapFillRounds: {},      // { '1': 0 }
        gapFillWords: {},       // { '1': [wordId, ...] }
        gapFillGrammars: {},    // { '1': [gramId, ...] }
        diagnosticResults: {},  // { '1': { vocab:80, grammar:60, reading:70, listening:75 } }
        semesterDiagnosticDone: false,
        mockExamDone: false,
        mockExamScore: null,
        totalTimeSpent: {}      // { '1': ms }
      };
      this._saveProgress();
    }
    if (!this.state.errorCounts) this.state.errorCounts = {};
    if (!this.state.gapFillRounds) this.state.gapFillRounds = {};
    if (!this.state.gapFillWords) this.state.gapFillWords = {};
    if (!this.state.gapFillGrammars) this.state.gapFillGrammars = {};
    if (!this.state.diagnosticResults) this.state.diagnosticResults = {};
    if (!this.state.totalTimeSpent) this.state.totalTimeSpent = {};
  },

  _getDragonState: function () {
    var totalWords = typeof Grade7Data !== 'undefined' ? Grade7Data.getAllWords().length : 291;
    var masteredCount = this.state ? (this.state.masteredWordIds || []).length : 0;
    var weakTop3 = [];
    if (typeof AdaptiveEngine !== 'undefined') {
      var rec = AdaptiveEngine.getNextRecommendation();
      if (rec && rec.topWeaknesses) {
        weakTop3 = rec.topWeaknesses.slice(0, 3).map(function (w) {
          return { kgPoint: w.kgPoint, prob: Math.round(w.probability * 100) };
        });
      }
    }
    var estimate = { score: 85, range: [75, 95] };
    if (typeof AdaptiveEngine !== 'undefined') {
      try { estimate = AdaptiveEngine.estimateScore(); } catch (e) { }
    }
    return {
      totalWords: totalWords,
      masteredWords: masteredCount,
      masteredPct: totalWords > 0 ? Math.round(masteredCount / totalWords * 100) : 0,
      weakKgTop3: weakTop3,
      estimatedScore: estimate.score,
      scoreRange: estimate.range,
      currentUnit: this.state ? this.state.currentUnit : 1,
      currentMicroPhase: this.state ? this.state.currentMicroPhase : 0,
      mode: this.state ? this.state.mode : 'unit',
      completedUnits: this.state ? this.state.completedUnits : {},
      sessionStart: this.state ? this.state.sessionStart : Date.now()
    };
  },

  _resetProgress: function () {
    this.state = null;
    localStorage.removeItem('dragon_progress');
    this.vocabState = null;
    this._loadProgress();
  },

  // ===== Task 2: 单元内容访问 =====
  _getUnitWords: function (unitId) {
    if (typeof DataBridge !== 'undefined') return DataBridge.query('words', { unitId: unitId });
    if (typeof Grade7Data === 'undefined') return [];
    var allWords = Grade7Data.getAllWords();
    return allWords.filter(function (w) { return w.unitId === unitId || w.unit === unitId; });
  },

  _getUnitGrammar: function (unitId) {
    if (typeof DataBridge !== 'undefined') return DataBridge.query('grammar', { unitId: unitId });
    if (typeof Grade7Data === 'undefined') return [];
    var allGrammar = Grade7Data.getAllGrammar();
    return allGrammar.filter(function (g) { return g.unit === unitId || g.unitId === unitId; });
  },

  _getUnitExercises: function (unitId) {
    if (typeof DataBridge !== 'undefined') return DataBridge.query('exercises', { unitId: unitId });
    if (typeof Grade7Data === 'undefined') return [];
    var allEx = Grade7Data.getAllExercises();
    return allEx.filter(function (e) { return e.unit === unitId || e.unitId === unitId || (e.kp && e.kp.indexOf('unit' + unitId) >= 0); });
  },

  // ===== Entry points =====
  init: function () {
    this._loadProgress();
    if (this.state && this.state.currentMicroPhase >= this.MICRO_PHASES.length) {
      this.state.currentMicroPhase = 0;
    }
    this.render();
    var self = this;
    if (typeof DataBridge !== 'undefined') {
      DataBridge.on('mistake:added', function (mistake) { self._addToRepracticeQueue(mistake); });
    }
  },

  start: function () {
    this._resetProgress();
    this.render();
  },

  render: function () {
    this._ensureStyles();
    var target = document.getElementById('moduleContent') || document.getElementById('main-content') || document.body;
    if (!target) return;

    var ds = this._getDragonState();
    var html = '';

    html += '<div class="dragon-container" id="dragonContainer">';

    html += this._renderStageBadge(ds);

    // Task 3.1: 动态进度面板 (always visible)
    html += this._renderProgressPanel(ds);

    // Task 3.2: 已学单元概览行
    html += this._renderUnitCardsRow(ds);

    // Task 3.3: 当前单元微阶段导航条
    html += this._renderMicroPhaseNav(ds);

    // 模式切换选项
    html += '<div class="dragon-mode-switch" id="dragonModeSwitch">';
    html += '<button class="dragon-mode-btn' + (ds.mode === 'unit' ? ' active' : '') + '" data-mode="unit">📚 单元学习</button>';
    html += '<button class="dragon-mode-btn' + (ds.mode === 'semester' ? ' active' : '') + '" data-mode="semester">🏆 全学期冲刺</button>';
    html += '</div>';

    // Task 3.4: 内容渲染区
    html += '<div class="dragon-content-area" id="dragonContent">';
    html += this._renderPhaseContent();
    html += '</div>';

    // Task 3.5: 全局操作按钮
    html += this._renderGlobalActions(ds);

    html += '</div>';

    target.innerHTML = html;
    this._bindAllEvents();
    this._animateIn();
  },

  // ===== Task 3.1: 进度面板 =====
  _renderProgressPanel: function (ds) {
    var weakHtml = '';
    if (ds.weakKgTop3.length > 0) {
      weakHtml = ds.weakKgTop3.map(function (w) {
        var color = w.prob < 30 ? '#ef4444' : w.prob < 60 ? '#f59e0b' : '#6366f1';
        return '<span class="dragon-weak-tag" style="background:' + color + '15;color:' + color + ';border:1px solid ' + color + '40;">' + w.kgPoint + ' ' + w.prob + '%</span>';
      }).join('');
    }

    var scoreColor = ds.estimatedScore >= 105 ? '#10b981' : ds.estimatedScore >= 85 ? '#f59e0b' : '#ef4444';

    return '<div class="dragon-progress-panel" id="dragonProgressPanel">' +
      '<div class="dragon-prog-item"><span class="dragon-prog-label">📊 已学 / 总词汇</span><span class="dragon-prog-value">' + ds.masteredWords + ' / ' + ds.totalWords + '</span></div>' +
      '<div class="dragon-prog-item"><span class="dragon-prog-label">🎯 掌握率</span><span class="dragon-prog-value">' + ds.masteredPct + '%</span></div>' +
      '<div class="dragon-prog-item"><span class="dragon-prog-label">⚠ 薄弱考点 TOP3</span><span class="dragon-prog-value dragon-weak-list">' + (weakHtml || '暂无数据') + '</span></div>' +
      '<div class="dragon-prog-item"><span class="dragon-prog-label">🏅 预估分数</span><span class="dragon-prog-value" style="color:' + scoreColor + ';">' + ds.estimatedScore + ' / 120 (' + ds.scoreRange[0] + '-' + ds.scoreRange[1] + ')</span></div>' +
      '</div>';
  },

  _renderStageBadge: function (ds) {
    var mp = ds.currentMicroPhase;
    var phaseLabel = '';
    var phaseIcon = '';
    if (mp < this.MICRO_PHASES.length) {
      phaseLabel = this.MICRO_PHASES[mp].label;
      phaseIcon = this.MICRO_PHASES[mp].icon;
    }
    var totalPhases = this.MICRO_PHASES.length;
    var scoreColor = ds.estimatedScore >= 105 ? '#10b981' : ds.estimatedScore >= 85 ? '#f59e0b' : '#ef4444';
    var infoLines = [];
    switch (this.MICRO_PHASES[mp] ? this.MICRO_PHASES[mp].id : '') {
      case 'preview':
        infoLines.push('阶段: ' + (mp + 1) + ' / ' + totalPhases);
        infoLines.push('单元: ' + ds.currentUnit);
        infoLines.push('已学: ' + ds.masteredWords + ' / ' + ds.totalWords);
        infoLines.push('掌握率: ' + ds.masteredPct + '%');
        break;
      case 'new-lesson':
        infoLines.push('阶段: ' + (mp + 1) + ' / ' + totalPhases);
        infoLines.push('单元: ' + ds.currentUnit);
        infoLines.push('已学: ' + ds.masteredWords + ' / ' + ds.totalWords);
        infoLines.push('掌握率: ' + ds.masteredPct + '%');
        break;
      case 'active-recall':
        infoLines.push('阶段: ' + (mp + 1) + ' / ' + totalPhases);
        infoLines.push('单元: ' + ds.currentUnit);
        infoLines.push('已学: ' + ds.masteredWords + ' / ' + ds.totalWords);
        infoLines.push('掌握率: ' + ds.masteredPct + '%');
        break;
      case 'practice':
        infoLines.push('阶段: ' + (mp + 1) + ' / ' + totalPhases);
        infoLines.push('单元: ' + ds.currentUnit);
        infoLines.push('已学: ' + ds.masteredWords + ' / ' + ds.totalWords);
        infoLines.push('掌握率: ' + ds.masteredPct + '%');
        break;
      case 'pronunciation':
        infoLines.push('阶段: ' + (mp + 1) + ' / ' + totalPhases);
        infoLines.push('单元: ' + ds.currentUnit);
        infoLines.push('已学: ' + ds.masteredWords + ' / ' + ds.totalWords);
        infoLines.push('掌握率: ' + ds.masteredPct + '%');
        break;
      case 'mistake-fix':
        infoLines.push('阶段: ' + (mp + 1) + ' / ' + totalPhases);
        infoLines.push('单元: ' + ds.currentUnit);
        infoLines.push('已学: ' + ds.masteredWords + ' / ' + ds.totalWords);
        infoLines.push('掌握率: ' + ds.masteredPct + '%');
        break;
      case 'unit-diagnostic':
        infoLines.push('阶段: ' + (mp + 1) + ' / ' + totalPhases);
        infoLines.push('单元: ' + ds.currentUnit);
        infoLines.push('已学: ' + ds.masteredWords + ' / ' + ds.totalWords);
        infoLines.push('掌握率: ' + ds.masteredPct + '%');
        break;
      case 'gap-fill':
        infoLines.push('阶段: ' + (mp + 1) + ' / ' + totalPhases);
        infoLines.push('单元: ' + ds.currentUnit);
        infoLines.push('已学: ' + ds.masteredWords + ' / ' + ds.totalWords);
        infoLines.push('掌握率: ' + ds.masteredPct + '%');
        break;
      default:
        infoLines.push('阶段: ' + (mp + 1) + ' / ' + totalPhases);
        infoLines.push('单元: ' + ds.currentUnit);
        infoLines.push('已学: ' + ds.masteredWords + ' / ' + ds.totalWords);
        infoLines.push('掌握率: ' + ds.masteredPct + '%');
        break;
    }
    var badgeHtml = '<div class="dragon-stage-badge" id="dragonStageBadge" style="position:fixed;top:12px;right:12px;z-index:9999;' +
      'background:rgba(15,23,42,0.92);backdrop-filter:blur(8px);border-radius:12px;padding:10px 14px;' +
      'color:#e2e8f0;font-size:0.75rem;line-height:1.6;max-width:180px;box-shadow:0 4px 16px rgba(0,0,0,0.3);' +
      'border:1px solid rgba(100,116,139,0.3);pointer-events:none;">' +
      '<div style="font-size:1rem;font-weight:700;margin-bottom:2px;color:#f8fafc;">' + phaseIcon + ' ' + phaseLabel + '</div>';
    for (var j = 0; j < infoLines.length; j++) {
      badgeHtml += '<div style="opacity:0.7;">' + infoLines[j] + '</div>';
    }
    badgeHtml += '<div style="font-weight:600;color:' + scoreColor + ';margin-top:2px;">🏅 预估: ' + ds.estimatedScore + '/120</div>' +
      '</div>';
    return badgeHtml;
  },

  // ===== Task 3.2: 单元卡片行 =====
  _renderUnitCardsRow: function (ds) {
    var html = '<div class="dragon-unit-row" id="dragonUnitRow">';
    for (var u = 1; u <= 6; u++) {
      var status = '未开始';
      var statusClass = 'dragon-unit-new';
      var unitWords = this._getUnitWords(u);
      var learnedInUnit = unitWords.filter(function (w) {
        return ds.masteredWords >= 0 && (ds.masteredWordIds || []).indexOf(w.id) >= 0;
      }).length;
      var pct = unitWords.length > 0 ? Math.round(learnedInUnit / unitWords.length * 100) : 0;

      if (u < ds.currentUnit) {
        status = '✅ 已完成'; statusClass = 'dragon-unit-done';
      } else if (u === ds.currentUnit && ds.mode === 'unit') {
        status = '🔄 进行中'; statusClass = 'dragon-unit-active';
      } else if (u === ds.currentUnit + 1 && ds.mode === 'unit') {
        status = '🔓 可进入'; statusClass = 'dragon-unit-ready';
      } else {
        status = '🔒'; statusClass = 'dragon-unit-locked';
      }

      html += '<div class="dragon-unit-card ' + statusClass + '" data-unit="' + u + '">';
      html += '<div class="dragon-unit-num">Unit ' + u + '</div>';
      html += '<div class="dragon-unit-status">' + status + '</div>';
      html += '<div class="dragon-unit-bar"><div class="dragon-unit-bar-fill" style="width:' + pct + '%"></div></div>';
      html += '<div class="dragon-unit-pct">' + pct + '%</div>';
      html += '</div>';
    }
    html += '</div>';
    return html;
  },

  // ===== Task 3.3: 微阶段导航 =====
  _renderMicroPhaseNav: function (ds) {
    if (ds.mode !== 'unit') return '';

    var html = '<div class="dragon-micro-nav" id="dragonMicroNav">';
    for (var i = 0; i < this.MICRO_PHASES.length; i++) {
      var mp = this.MICRO_PHASES[i];
      var cls = 'dragon-micro-step';
      if (i < ds.currentMicroPhase) cls += ' done';
      else if (i === ds.currentMicroPhase) cls += ' active';
      else cls += ' pending';

      html += '<div class="' + cls + '" data-step="' + i + '">';
      html += '<span class="dragon-micro-icon">' + (i < ds.currentMicroPhase ? '✅' : mp.icon) + '</span>';
      html += '<span class="dragon-micro-label">' + mp.label + '</span>';
      html += '</div>';
    }
    html += '</div>';
    return html;
  },

  // ===== Task 3.5: 全局操作 =====
  _renderGlobalActions: function (ds) {
    var html = '<div class="dragon-global-actions">';
    if (ds.mode === 'unit') {
      html += '<button class="btn btn-outline dragon-btn-skip" id="dragonSkipPhase">⏭ 跳过当前阶段</button>';
      html += '<button class="btn btn-outline dragon-btn-retry" id="dragonRetryPhase">🔄 重学当前阶段</button>';
    }
    html += '<button class="btn btn-outline dragon-btn-reset" id="dragonResetAll" style="color:var(--danger,#ef4444)">🗑 重置全部进度</button>';
    html += '</div>';
    return html;
  },

  // ===== Phase content router =====
  _renderPhaseContent: function () {
    if (!this.state) this._loadProgress();

    if (this.state.mode === 'semester') {
      return this._renderSemesterContent();
    }
    return this._renderUnitPhaseContent();
  },

  _renderUnitPhaseContent: function () {
    var mp = this.MICRO_PHASES[this.state.currentMicroPhase];
    var html = '';
    switch (mp.id) {
      case 'preview': html = this._renderPreviewPhase(); break;
      case 'new-lesson': html = this._renderNewLessonPhase(); break;
      case 'active-recall': html = this._renderActiveRecallPhase(); break;
      case 'practice': html = this._renderPracticePhase(); break;
      case 'pronunciation': html = this._renderPronunciationPhase(); break;
      case 'mistake-fix': html = this._renderMistakeFixPhase(); break;
      case 'unit-diagnostic': html = this._renderUnitDiagnosticPhase(); break;
      case 'gap-fill': html = this._renderGapFillPhase(); break;
      default: html = '<div class="text-center p-4">未知阶段</div>'; break;
    }
    html += this._renderModuleFooter(mp.id);
    return html;
  },

  _renderSemesterContent: function () {
    return '<div class="dragon-semester-start text-center p-4">' +
      '<h3>🏆 全学期冲刺模式</h3>' +
      '<p class="text-muted mb-3">适合考前综合训练：综合诊断 → 全真模考 → 复盘报告</p>' +
      '<div class="dragon-semester-cards flex gap-3 justify-center flex-wrap">' +
      this.SEMESTER_PHASES.map(function (sp, idx) {
        return '<div class="dragon-semester-card" data-sp-idx="' + idx + '">' +
          '<div style="font-size:2.5rem;">' + sp.icon + '</div>' +
          '<div style="font-weight:700;">' + sp.label + '</div>' +
          '<div style="font-size:0.8rem;color:#6b7280;">' + sp.desc + '</div>' +
          '<button class="btn btn-primary btn-sm mt-2 dragon-start-sp" data-sp-idx="' + idx + '">开始</button>' +
          '</div>';
      }).join('') +
      '</div></div>';
  },

  // ===== Task 4: 新课学习（优化版：3级路由 + 维度合并 + 互证豁免 + 双击退出）=====
  _getWordBktProb: function (word) {
    var prob = 0.5;
    if (typeof AdaptiveEngine !== 'undefined' && typeof AdaptiveEngine.getMasteryProbability === 'function') {
      try { prob = AdaptiveEngine.getMasteryProbability(word.kgPoint || 'vocab'); } catch (e) { prob = 0.5; }
    }
    if (typeof prob !== 'number' || isNaN(prob)) prob = 0.5;
    return prob;
  },

  _precheckWord: function (word) {
    var opts = this._generateOptions(word, 4);
    var correctIdx = -1;
    for (var i = 0; i < opts.length; i++) { if (opts[i].id === word.id) { correctIdx = i; break; } }
    return { word: word, opts: opts, correctIdx: correctIdx, kg: word.kgPoint || 'vocab' };
  },

  _classifyWord: function (word, precheckResult) {
    var bktProb = this._getWordBktProb(word);
    var precheckCorrect = precheckResult && precheckResult.correct;
    var fastThreshold = this.vocabState._dynamicFastThreshold || 0.75;

    if (bktProb >= fastThreshold && precheckCorrect) return 'fast';
    if (bktProb >= fastThreshold && !precheckCorrect) { this.vocabState._downgradedByPrecheck++; return 'standard'; }
    if (bktProb >= 0.4 && precheckCorrect) return 'standard';
    if (bktProb >= 0.4 && !precheckCorrect) { this.vocabState._downgradedByPrecheck++; return 'deep'; }
    return 'deep';
  },

  _getWordDims: function (pathType) {
    var config = this.PATH_CONFIG[pathType];
    return (config && config.dims) ? config.dims.slice() : [];
  },

  _renderNewLessonPhase: function () {
    var unitWords = this._getUnitWords(this.state.currentUnit);
    var allWordData = unitWords.map(function (w) { return w; });

    this.vocabState = {
      unit: this.state.currentUnit,
      allWords: allWordData,
      fastQueue: [],
      standardQueue: [],
      deepQueue: [],
      queuesBuilt: false,
      precheckQueue: this._shuffle(allWordData.slice()),
      precheckIdx: 0,
      precheckResults: {},
      currentPath: null,
      currentQueueIdx: 0,
      currentDimIdx: 0,
      wordDimDone: {},
      wordFailCounts: {},
      _sessionFailLog: {},
      correctCount: 0,
      totalAttempts: 0,
      masteredInSession: [],
      skippedForReview: [],
      startTime: Date.now(),
      stage: 'precheck',
      _downgradedByPrecheck: 0,
      _downgradedByQualityGate: 0,
      _dynamicFastThreshold: 0.75,
      wordPath: {},
      waitReviewQueue: []
    };

    return '<div id="dragonVocabContainer" class="dragon-vocab-container">' +
      this._renderVocabQuestion() + '</div>';
  },

  _buildQueues: function () {
    var vs = this.vocabState;
    if (vs.queuesBuilt) return;
    var self = this;

    this._calcPrecheckErrorRate();

    vs.allWords.forEach(function (w) {
      var pr = vs.precheckResults[w.id];
      var path = self._classifyWord(w, pr);
      vs.wordPath[w.id] = path;
      if (path === 'fast') vs.fastQueue.push(w);
      else if (path === 'standard') vs.standardQueue.push(w);
      else vs.deepQueue.push(w);
    });
    vs.queuesBuilt = true;
  },

  _renderVocabQuestion: function () {
    var vs = this.vocabState;
    if (!vs) return '<p>加载中...</p>';

    // Precheck stage: quick 1-question per word
    if (vs.stage === 'precheck') {
      if (vs.precheckIdx >= vs.precheckQueue.length) {
        this._buildQueues();
        vs.stage = 'learning';
        vs.currentPath = 'deep';
        vs.currentQueueIdx = 0;
        vs.currentDimIdx = 0;
        return this._renderVocabQuestion();
      }
      return this._renderPrecheckQ(vs.precheckQueue[vs.precheckIdx]);
    }

    // Learning stage
    if (vs.stage === 'learning') {
      var allDone = this._allPathsDone();
      if (allDone) return this._renderVocabSummary();
      return this._renderLearningQ();
    }

    return this._renderVocabSummary();
  },

  _renderPrecheckQ: function (word) {
    var vs = this.vocabState;
    var pc = this._precheckWord(word);
    var html = '<div class="dragon-vocab-card">';
    html += '<div class="dragon-vocab-header">';
    html += '<span class="dragon-vocab-progress">📋 快速预检 ' + (vs.precheckIdx + 1) + '/' + vs.precheckQueue.length + '</span>';
    html += '<span style="color:#6366f1;font-weight:600;">⏱ 快速通道</span>';
    html += '</div>';
    html += '<div class="progress-bar mb-3"><div class="progress-fill" style="width:' + Math.round(vs.precheckIdx / vs.precheckQueue.length * 100) + '%"></div></div>';
    html += '<div class="dragon-dim-tip">听发音 + 看英文，选中文意思（每题仅1次机会）</div>';
    html += '<button class="btn btn-primary btn-sm mb-2 w-100 dragon-play-audio" data-word="' + word.w + '">🔊 ' + word.w + '</button>';
    html += '<div class="dragon-word-phonetic text-muted text-center">' + (word.p || '') + '</div>';
    html += '<div class="dragon-options-grid mt-2">';
    for (var i = 0; i < pc.opts.length; i++) {
      html += '<button class="dragon-vocab-opt dragon-precheck-opt" data-correct="' + (i === pc.correctIdx ? '1' : '0') + '" data-kg="' + pc.kg + '">' + pc.opts[i].m + '</button>';
    }
    html += '</div>';
    html += '<div id="dragonVocabFeedback" class="dragon-vocab-feedback"></div>';
    html += '</div>';
    return html;
  },

  _pathQueue: function () {
    var vs = this.vocabState;
    if (!vs.currentPath) return [];
    if (vs.currentPath === 'fast') return vs.fastQueue;
    if (vs.currentPath === 'standard') return vs.standardQueue;
    return vs.deepQueue;
  },

  _pathDims: function () {
    return this._getWordDims(this.vocabState.currentPath);
  },

  _allPathsDone: function () {
    var vs = this.vocabState;
    var self = this;
    var checkPath = function (queue, pathType) {
      if (queue.length === 0) return true;
      var dims = self._getWordDims(pathType);
      return queue.every(function (w) {
        var done = vs.wordDimDone[w.id] || [];
        return dims.every(function (d) { return done.indexOf(d) >= 0; });
      });
    };
    return checkPath(vs.fastQueue, 'fast') && checkPath(vs.standardQueue, 'standard') && checkPath(vs.deepQueue, 'deep');
  },

  _renderLearningQ: function () {
    var vs = this.vocabState;
    var queue = this._pathQueue();
    var dims = this._pathDims();

    // Advance path if current path queue is all done
    if (this._pathQueueDone(vs.currentPath)) {
      if (vs.currentPath === 'deep' && vs.standardQueue.length > 0) vs.currentPath = 'standard';
      else if ((vs.currentPath === 'deep' || vs.currentPath === 'standard') && vs.fastQueue.length > 0) vs.currentPath = 'fast';
      else return this._renderVocabSummary();
      vs.currentQueueIdx = 0;
      vs.currentDimIdx = 0;
      queue = this._pathQueue();
      dims = this._pathDims();
      if (queue.length === 0) return this._renderVocabSummary();
    }

    // Advance dim if all words in path completed current dim
    var currentDim = (dims && vs.currentDimIdx < dims.length) ? dims[vs.currentDimIdx] : null;
    if (!currentDim || this._allWordsCompletedDim(vs.currentPath, currentDim)) {
      vs.currentDimIdx++;
      if (vs.currentDimIdx >= dims.length) return this._renderVocabSummary();
      currentDim = dims[vs.currentDimIdx];
      vs.currentQueueIdx = 0;
    }

    // Find next word needing this dim
    var word = this._findNextWordForDim(vs.currentPath, currentDim);
    if (!word) {
      vs.currentDimIdx++;
      if (vs.currentDimIdx >= dims.length) return this._renderVocabSummary();
      vs.currentQueueIdx = 0;
      return this._renderVocabQuestion();
    }

    // Determine dim index for display
    var dimId = currentDim;
    var dimInfo = this._findDimById(dimId);
    var dimNum = dimInfo ? dimInfo.idx : (vs.currentDimIdx + 1);

    var html = '<div class="dragon-vocab-card">';
    var pathLabel = this.PATH_CONFIG[vs.currentPath].label;

    // Header
    var allWordCount = vs.allWords.length;
    var totalDone = Object.keys(vs.wordDimDone).filter(function (id) {
      var d = vs.wordDimDone[id] || [];
      return d.indexOf('produce') >= 0 || d.indexOf('context') >= 0;
    }).length;
    html += '<div class="dragon-vocab-header">';
    html += '<span class="dragon-vocab-progress">' + pathLabel + ' · ' + dimInfo.label + '</span>';
    html += '<span class="dragon-vocab-phase">📖 ' + word.w + '</span>';
    html += '<span class="dragon-vocab-mastered">已掌握 ' + totalDone + '/' + allWordCount + ' 词</span>';
    html += '</div>';

    // Path distribution
    html += '<div class="dragon-path-dist text-center mb-2" style="font-size:0.75rem;">';
    html += '<span style="color:#10b981;">🟢' + vs.fastQueue.length + '</span> ';
    html += '<span style="color:#f59e0b;">🟡' + vs.standardQueue.length + '</span> ';
    html += '<span style="color:#ef4444;">🔴' + vs.deepQueue.length + '</span>';
    html += ' · 预估剩余 ~' + this._estimateRemainingTime() + '分</div>';

    html += '<div class="progress-bar mb-2"><div class="progress-fill" style="width:' + Math.round(totalDone / allWordCount * 100) + '%"></div></div>';

    // Tip
    html += '<div class="dragon-dim-tip">' + dimInfo.tip + '</div>';

    // Render dimension
    switch (dimId) {
      case 'identify': html += this._renderDimIdentify(word); break;
      case 'spell': html += this._renderDimSpell(word); break;
      case 'context': html += this._renderDimContext(word); break;
      case 'produce': html += this._renderDimProduce(word); break;
    }

    html += '</div>';
    return html;
  },

  _findDimById: function (dimId) {
    for (var i = 0; i < this.VOCAB_DIMS.length; i++) {
      if (this.VOCAB_DIMS[i].id === dimId) {
        return { label: this.VOCAB_DIMS[i].label, tip: this.VOCAB_DIMS[i].tip, icon: this.VOCAB_DIMS[i].icon, idx: i };
      }
    }
    return { label: dimId, tip: '', icon: '📖', idx: 0 };
  },

  _pathQueueDone: function (pathType) {
    var queue = this._pathQueue();
    var dims = this._pathDims();
    if (queue.length === 0) return true;
    var vs = this.vocabState;
    return queue.every(function (w) {
      var done = vs.wordDimDone[w.id] || [];
      return dims.every(function (d) { return done.indexOf(d) >= 0; });
    });
  },

  _allWordsCompletedDim: function (pathType, dimId) {
    var queue = this._pathQueue();
    if (queue.length === 0) return true;
    var vs = this.vocabState;
    return queue.every(function (w) {
      var done = vs.wordDimDone[w.id] || [];
      return done.indexOf(dimId) >= 0;
    });
  },

  _findNextWordForDim: function (pathType, dimId) {
    var queue = this._pathQueue();
    var vs = this.vocabState;
    for (var i = 0; i < queue.length; i++) {
      var w = queue[i];
      var done = vs.wordDimDone[w.id] || [];
      var failKey = w.id + '_' + dimId;
      if (done.indexOf(dimId) < 0 && (vs.wordFailCounts[failKey] || 0) < 2) return w;
    }
    return null;
  },

  // 辨义合一 (heard + seen combined)
  _renderDimIdentify: function (word) {
    var opts = this._generateOptions(word, 4);
    var html = '<button class="btn btn-primary btn-sm mb-2 w-100 dragon-play-audio" data-word="' + word.w + '">🔊 ' + word.w + '</button>';
    html += '<div class="dragon-word-display">' + word.w + '</div>';
    html += '<div class="dragon-word-phonetic text-muted">' + (word.p || '') + '</div>';
    html += '<div class="dragon-options-grid mt-3">';
    for (var i = 0; i < opts.length; i++) {
      html += '<button class="dragon-vocab-opt" data-correct="' + (opts[i].id === word.id ? '1' : '0') + '" data-kg="' + (word.kgPoint || 'vocab') + '" data-dim="identify">' + String.fromCharCode(65 + i) + '. ' + opts[i].m + '</button>';
    }
    html += '</div>';
    return html;
  },

  // 拼写合一 (spelled + dictation combined)
  _renderDimSpell: function (word) {
    var html = '<button class="btn btn-primary btn-sm mb-3 w-100 dragon-play-audio" data-word="' + word.w + '">🔊 点击播放发音（可重复）</button>';
    html += '<div class="text-muted text-center mb-2" style="font-size:0.85rem;">词义: ' + (word.m || '') + '</div>';
    html += '<div class="dragon-input-row">';
    html += '<input type="text" class="dragon-vocab-input" id="dragonVocabInput" placeholder="请拼写英文单词..." autocomplete="off" autofocus>';
    html += '<button class="btn btn-primary dragon-vocab-submit" data-word="' + word.w + '" data-kg="' + (word.kgPoint || 'vocab') + '" data-dim="spell">✓ 确认</button>';
    html += '</div>';
    html += '<div id="dragonVocabFeedback" class="dragon-vocab-feedback"></div>';
    return html;
  },

  // 语境填空 (kept, minor tweaks)
  _renderDimContext: function (word) {
    var sentence = (word.ex && word.ex[0]) ? word.ex[0].replace(new RegExp(word.w, 'gi'), '______') : 'Please use ______ in a sentence.';
    var html = '<div class="dragon-context-sentence">' + sentence + '</div>';
    if (word.ex && word.ex[1]) {
      html += '<div class="text-muted mb-2" style="font-size:0.85rem;">提示语境：' + word.ex[1] + '</div>';
    }
    html += '<div class="dragon-input-row">';
    html += '<input type="text" class="dragon-vocab-input" id="dragonVocabInput" placeholder="填入正确的单词形式..." autocomplete="off" autofocus>';
    html += '<button class="btn btn-primary dragon-vocab-submit" data-word="' + word.w + '" data-kg="' + (word.kgPoint || 'vocab') + '" data-dim="context">✓ 确认</button>';
    html += '</div>';
    html += '<div id="dragonVocabFeedback" class="dragon-vocab-feedback"></div>';
    return html;
  },

  // 主动造句 (kept, minor tweaks)
  _renderDimProduce: function (word) {
    var html = '<div class="dragon-word-display">请用 <strong>' + word.w + '</strong> 写出一个英文句子</div>';
    html += '<div class="text-muted mb-2">词义：' + (word.m || '') + ' (' + (word.pos || '') + ')</div>';
    html += '<div class="dragon-input-row">';
    html += '<input type="text" class="dragon-vocab-input dragon-vocab-sentence" id="dragonVocabInput" placeholder="用 ' + word.w + ' 造句..." autocomplete="off" autofocus>';
    html += '<button class="btn btn-primary dragon-vocab-submit" data-word="' + word.w + '" data-kg="' + (word.kgPoint || 'vocab') + '" data-dim="produce">✓ 提交</button>';
    html += '</div>';
    html += '<div id="dragonVocabFeedback" class="dragon-vocab-feedback"></div>';
    return html;
  },

  _generateOptions: function (word, count) {
    var allWords = typeof Grade7Data !== 'undefined' ? Grade7Data.getAllWords() : [];
    var opts = [word];
    var used = {}; used[word.id] = true;
    var tries = 0;
    while (opts.length < count && tries < 200) {
      var ri = Math.floor(Math.random() * allWords.length);
      if (!used[allWords[ri].id]) { opts.push(allWords[ri]); used[allWords[ri].id] = true; }
      tries++;
    }
    return this._shuffle(opts);
  },

  _handleVocabAnswer: function (isCorrect, kgPoint, dimId, wordWord) {
    var vs = this.vocabState;
    vs.totalAttempts++;

    // Precheck stage
    if (vs.stage === 'precheck') {
      var pw = vs.precheckQueue[vs.precheckIdx];
      vs.precheckResults[pw.id] = { correct: isCorrect, kg: kgPoint };
      if (!isCorrect && typeof AdaptiveEngine !== 'undefined') {
        try { AdaptiveEngine.recordInteraction(kgPoint, false, 1, 0); } catch (e) { }
      }
      vs.precheckIdx++;
      if (typeof AdaptiveEngine !== 'undefined' && isCorrect) {
        try { AdaptiveEngine.recordInteraction(kgPoint, true, 4, 0); } catch (e) { }
      }
      this._saveProgress();
      return;
    }

    // Learning stage
    var word = this._getCurrentLearningWord();
    if (!word) return;

    if (isCorrect) {
      vs.correctCount++;
      this._markDimDone(word.id, dimId);
      this._autoCreditDims(word.id, dimId);

      // If all path dims done, mark as mastered
      var pdims = this._pathDims();
      var allDimsDone = pdims.every(function (d) { return (vs.wordDimDone[word.id] || []).indexOf(d) >= 0; });
      if (allDimsDone) {
        vs.masteredInSession.push(word);
        if (this.state.masteredWordIds.indexOf(word.id) < 0) {
          this.state.masteredWordIds.push(word.id);
        }
      }

      if (typeof AdaptiveEngine !== 'undefined') {
        try { AdaptiveEngine.recordInteraction(kgPoint, true, 4, 0); } catch (e) { }
      }

      // Clear fail count on correct
      var failKey = word.id + '_' + dimId;
      vs.wordFailCounts[failKey] = 0;

    } else {
      // Double-tap exit
      var failKey = word.id + '_' + dimId;
      vs._sessionFailLog[failKey] = true;
      if (!vs.wordFailCounts[failKey]) vs.wordFailCounts[failKey] = 0;
      vs.wordFailCounts[failKey]++;

      if (vs.wordFailCounts[failKey] >= 2) {
        vs.skippedForReview.push({ word: word, dim: dimId });
        this._markDimDone(word.id, dimId); // Skip this dim

        if (typeof AdaptiveEngine !== 'undefined') {
          try { AdaptiveEngine.recordInteraction(kgPoint, false, 1, 0); } catch (e) { }
        }
        if (typeof SpacedRepetition !== 'undefined') {
          try { SpacedRepetition.addItem ? SpacedRepetition.addItem(word.id) : null; } catch (e) { }
        }
        if (typeof MistakesModule !== 'undefined') {
          try {
            MistakesModule.addMistake({
              kg: kgPoint,
              q: '拼写: ' + wordWord,
              yourAnswer: '(连续错误)',
              correctAnswer: wordWord,
              date: new Date().toISOString(),
              errorType: '知识型'
            });
          } catch (e) { }
        }
      } else {
        if (typeof AdaptiveEngine !== 'undefined') {
          try { AdaptiveEngine.recordInteraction(kgPoint, false, 2, 0); } catch (e) { }
        }
      }
    }

    if (typeof MemoryTracker !== 'undefined') {
      try { MemoryTracker.recordTest(word.id, isCorrect); } catch (e) { }
    }

    this._saveProgress();
  },

  _markDimDone: function (wordId, dimId) {
    var vs = this.vocabState;
    if (!vs.wordDimDone[wordId]) vs.wordDimDone[wordId] = [];
    if (vs.wordDimDone[wordId].indexOf(dimId) < 0) vs.wordDimDone[wordId].push(dimId);
  },

  _autoCreditDims: function (wordId, fromDim) {
    var vs = this.vocabState;
    if (fromDim === 'spell' && !vs._sessionFailLog[wordId + '_identify']) this._markDimDone(wordId, 'identify');
    if (fromDim === 'produce' && !vs._sessionFailLog[wordId + '_context']) this._markDimDone(wordId, 'context');
  },

  // ===== Task 11: 动态阈值 =====
  _calcPrecheckErrorRate: function () {
    var vs = this.vocabState;
    var total = 0, errors = 0;
    var keys = Object.keys(vs.precheckResults);
    for (var i = 0; i < keys.length; i++) {
      total++;
      if (!vs.precheckResults[keys[i]].correct) errors++;
    }
    var errorRate = total > 0 ? errors / total : 0;
    if (errorRate > 0.4) {
      vs._dynamicFastThreshold = 0.85;
    }
    return errorRate;
  },

  // ===== Task 10: 快速路径质量门 =====
  _downgradeFastWords: function () {
    var vs = this.vocabState;
    vs._downgradedByQualityGate = vs.fastQueue.length;
    for (var i = 0; i < vs.fastQueue.length; i++) {
      vs.waitReviewQueue.push(vs.fastQueue[i]);
      vs.wordPath[vs.fastQueue[i].id] = 'downgraded';
      this.state.masteredWordIds = this.state.masteredWordIds.filter(function (id) { return id !== vs.fastQueue[i].id; });
    }
    vs.fastQueue = [];
  },

  _renderQualityGate: function () {
    var vs = this.vocabState;
    var pool = vs.fastQueue.slice();
    this._shuffle(pool);
    var sampleCount = Math.max(1, Math.ceil(pool.length * 0.2));
    var sampled = pool.slice(0, sampleCount);

    vs._qualityGateWords = sampled;
    vs._qualityGateIdx = 0;
    vs._qualityGateCorrect = 0;
    vs.stage = 'qualityGate';

    return this._renderQualityGateQ();
  },

  _renderQualityGateQ: function () {
    var vs = this.vocabState;
    if (vs._qualityGateIdx >= vs._qualityGateWords.length) {
      return this._finishQualityGate();
    }
    var word = vs._qualityGateWords[vs._qualityGateIdx];
    var opts = this._generateOptions(word, 4);
    var html = '<div class="dragon-vocab-card">';
    html += '<div class="dragon-vocab-header">';
    html += '<span>🔍 快速路径质量验证 ' + (vs._qualityGateIdx + 1) + '/' + vs._qualityGateWords.length + '</span>';
    html += '<span style="color:#f59e0b;">⚠ 抽查快速路径词是否真掌握</span>';
    html += '</div>';
    html += '<div class="dragon-dim-tip">听发音 + 看英文，选中文意思</div>';
    html += '<button class="btn btn-primary btn-sm mb-2 w-100 dragon-play-audio" data-word="' + word.w + '">🔊 ' + word.w + '</button>';
    html += '<div class="dragon-word-display">' + word.w + '</div>';
    html += '<div class="dragon-word-phonetic text-muted">' + (word.p || '') + '</div>';
    html += '<div class="dragon-options-grid mt-3">';
    for (var i = 0; i < opts.length; i++) {
      html += '<button class="dragon-vocab-opt dragon-quality-gate-opt" data-correct="' + (opts[i].id === word.id ? '1' : '0') + '">' + String.fromCharCode(65 + i) + '. ' + opts[i].m + '</button>';
    }
    html += '</div>';
    html += '</div>';
    return html;
  },

  _handleQualityGateAnswer: function (isCorrect) {
    var vs = this.vocabState;
    if (isCorrect) vs._qualityGateCorrect++;
    vs._qualityGateIdx++;
  },

  _finishQualityGate: function () {
    var vs = this.vocabState;
    if (vs._qualityGateCorrect === vs._qualityGateWords.length) {
      vs.stage = 'done';
      return this._renderVocabSummary();
    } else {
      this._downgradeFastWords();
      vs.stage = 'done';
      return this._renderVocabSummary();
    }
  },

  _getCurrentLearningWord: function () {
    var vs = this.vocabState;
    var dims = this._pathDims();
    if (vs.currentDimIdx >= dims.length) return null;
    var dimId = dims[vs.currentDimIdx];
    return this._findNextWordForDim(vs.currentPath, dimId);
  },

  _estimateRemainingTime: function () {
    var vs = this.vocabState;
    if (vs.totalAttempts === 0) return 45;
    var elapsedSec = (Date.now() - vs.startTime) / 1000;
    var secPerQ = vs.totalAttempts > 0 ? elapsedSec / vs.totalAttempts : 8;
    var pending = 0;
    ['fast', 'standard', 'deep'].forEach(function (p) {
      var queue = (p === 'deep' ? vs.deepQueue : p === 'standard' ? vs.standardQueue : vs.fastQueue);
      var dims = DragonMode._getWordDims(p);
      queue.forEach(function (w) {
        var done = (vs.wordDimDone[w.id] || []);
        pending += dims.filter(function (d) { return done.indexOf(d) < 0; }).length;
      });
    }.bind(this));
    return Math.ceil(pending * secPerQ / 60);
  },

  _advanceVocab: function () {
    var container = document.getElementById('dragonVocabContainer');
    if (!container) return;
    var html = this._renderVocabQuestion();
    container.innerHTML = html;

    if (this._allPathsDone && this._allPathsDone()) {
      this._finishVocabPhase();
      return;
    }
    this._bindVocabAll();
  },

  _allPathsDone: function () {
    var vs = this.vocabState;
    if (!vs || vs.stage !== 'learning') return false;
    var self = this;
    var check = function (q, p) {
      if (q.length === 0) return true;
      var dims = self._getWordDims(p);
      return q.every(function (w) { return dims.every(function (d) { return (vs.wordDimDone[w.id] || []).indexOf(d) >= 0; }); });
    };
    return check(vs.fastQueue, 'fast') && check(vs.standardQueue, 'standard') && check(vs.deepQueue, 'deep');
  },

  _renderVocabSummary: function () {
    var vs = this.vocabState;
    var elapsed = Math.round((Date.now() - vs.startTime) / 60000);
    if (!this.state.totalTimeSpent[this.state.currentUnit]) this.state.totalTimeSpent[this.state.currentUnit] = 0;
    this.state.totalTimeSpent[this.state.currentUnit] += (Date.now() - vs.startTime);

    if (!this.state.unitPhasesDone[this.state.currentUnit]) this.state.unitPhasesDone[this.state.currentUnit] = [];
    if (this.state.unitPhasesDone[this.state.currentUnit].indexOf('new-lesson') < 0) {
      this.state.unitPhasesDone[this.state.currentUnit].push('new-lesson');
    }
    if (!this.state.unitScores[this.state.currentUnit]) this.state.unitScores[this.state.currentUnit] = {};
    this.state.unitScores[this.state.currentUnit]['new-lesson'] = vs.allWords.length > 0 ? Math.round(vs.masteredInSession.length / vs.allWords.length * 100) : 0;
    this._saveProgress();

    var downgradeMsgs = [];
    if (vs._downgradedByPrecheck > 0) downgradeMsgs.push('预检降级 ' + vs._downgradedByPrecheck + '词（BKT预测与实际不符）');
    if (vs._downgradedByQualityGate > 0) downgradeMsgs.push('质量门降级 ' + vs._downgradedByQualityGate + '词（抽查未通过，已回炉）');
    if (vs.waitReviewQueue.length > 0) downgradeMsgs.push('待回炉 ' + vs.waitReviewQueue.length + '词（后续微阶段重新检测）');

    return '<div class="dragon-phase-complete">' +
      '<div class="dragon-complete-icon">🎉</div>' +
      '<h4>新课学习完成！</h4>' +
      '<div class="dragon-path-dist mb-3" style="font-size:0.85rem;">' +
      '<span style="color:#10b981;">🟢快速 ' + vs.fastQueue.length + '词</span> · ' +
      '<span style="color:#f59e0b;">🟡标准 ' + vs.standardQueue.length + '词</span> · ' +
      '<span style="color:#ef4444;">🔴深度 ' + vs.deepQueue.length + '词</span>' +
      (vs._downgradedByPrecheck > 0 ? ' · <span style="color:#f97316;">⬇预检降级' + vs._downgradedByPrecheck + '</span>' : '') +
      '</div>' +
      '<div class="dragon-complete-stats">' +
      '<div class="dragon-stat"><span class="dragon-stat-val">' + vs.masteredInSession.length + '/' + vs.allWords.length + '</span><span class="dragon-stat-lbl">词汇掌握</span></div>' +
      '<div class="dragon-stat"><span class="dragon-stat-val">' + vs.totalAttempts + '</span><span class="dragon-stat-lbl">总答题</span></div>' +
      '<div class="dragon-stat"><span class="dragon-stat-val">' + elapsed + 'min</span><span class="dragon-stat-lbl">耗时</span></div>' +
      '</div>' +
      (downgradeMsgs.length > 0 ? '<div class="mt-2" style="font-size:0.8rem;">' + downgradeMsgs.map(function (m) { return '<p class="text-info mb-0">📊 ' + m + '</p>'; }).join('') + '</div>' : '') +
      '<p class="text-muted mt-2" style="font-size:0.8rem;">💡 智能路由 + 条件豁免 + 质量门：效率与质量兼得</p>' +
      (vs.skippedForReview.length > 0 ? '<p class="text-warning mt-1" style="font-size:0.8rem;">⚠ ' + vs.skippedForReview.length + '个词进入待复习队列</p>' : '') +
      '<button class="btn btn-primary btn-lg mt-3" id="dragonVocabNext">继续下一阶段 ➡</button>' +
      '</div>';
  },

  _finishVocabPhase: function () {
    var vs = this.vocabState;
    var container = document.getElementById('dragonVocabContainer');
    if (!container) return;
    if (vs.fastQueue.length > 0 && vs.stage !== 'qualityGate' && !vs._downgradedByQualityGate) {
      container.innerHTML = this._renderQualityGate();
      this._bindQualityGateAll();
      return;
    }
    container.innerHTML = this._renderVocabSummary();
    this._bindVocabSummary();
  },

  // ===== Task 5: 即时练习 =====
  _renderPracticePhase: function () {
    var unitId = this.state.currentUnit;
    var exercises = this._getUnitExercises(unitId);
    if (exercises.length === 0) exercises = (typeof Grade7Data !== 'undefined' ? Grade7Data.getAllExercises().slice(0, 10) : []);

    this._practiceState = { exercises: exercises.slice(0, 10), current: 0, correct: 0, answered: {} };
    return this._renderPracticeQuestion();
  },

  _renderPracticeQuestion: function () {
    var ps = this._practiceState;
    if (!ps || ps.current >= ps.exercises.length) return this._renderPracticeSummary();

    var ex = ps.exercises[ps.current];
    var html = '<div class="dragon-practice-card">';
    html += '<div class="flex-between mb-2"><small class="text-muted">✏️ 练习</small><small>' + (ps.current + 1) + '/' + ps.exercises.length + '</small></div>';
    html += '<div class="progress-bar mb-3"><div class="progress-fill" style="width:' + Math.round(ps.current / ps.exercises.length * 100) + '%"></div></div>';
    html += '<div class="mb-3"><strong>' + ex.q + '</strong></div>';

    if (ex.o) {
      for (var i = 0; i < ex.o.length; i++) {
        html += '<button class="dragon-practice-opt" data-correct="' + (i === ex.a ? '1' : '0') + '" data-kg="' + (ex.kp || 'practice') + '">' + String.fromCharCode(65 + i) + '. ' + ex.o[i] + '</button>';
      }
    }

    html += '<div id="dragonPracticeFeedback" class="dragon-vocab-feedback mt-3"></div>';
    html += '</div>';
    return html;
  },

  _renderPracticeSummary: function () {
    var ps = this._practiceState;
    var pct = ps.exercises.length > 0 ? Math.round(ps.correct / ps.exercises.length * 100) : 0;

    if (!this.state.unitPhasesDone[this.state.currentUnit]) this.state.unitPhasesDone[this.state.currentUnit] = [];
    if (this.state.unitPhasesDone[this.state.currentUnit].indexOf('practice') < 0) {
      this.state.unitPhasesDone[this.state.currentUnit].push('practice');
    }
    if (!this.state.unitScores[this.state.currentUnit]) this.state.unitScores[this.state.currentUnit] = {};
    this.state.unitScores[this.state.currentUnit].practice = pct;
    this._saveProgress();

    var weakHtml = '';
    if (typeof AdaptiveEngine !== 'undefined') {
      var rec = AdaptiveEngine.getNextRecommendation();
      if (rec && rec.topWeaknesses) {
        weakHtml = '<p class="mt-2"><strong>⚠ 需注意：</strong>' + rec.topWeaknesses.slice(0, 2).map(function (w) { return w.kgPoint; }).join(', ') + '</p>';
      }
    }

    return '<div class="dragon-phase-complete"><div class="dragon-complete-icon">✅</div><h4>即时练习完成</h4>' +
      '<p>' + ps.correct + '/' + ps.exercises.length + ' · ' + pct + '%</p>' + weakHtml +
      '<button class="btn btn-primary btn-lg mt-3" id="dragonPracticeNext">继续下一阶段 ➡</button></div>';
  },

  _handlePracticeAnswer: function (isCorrect, kgPoint, opt, container) {
    var ps = this._practiceState;
    if (isCorrect) ps.correct++;
    var fb = document.getElementById('dragonPracticeFeedback');

    if (isCorrect) {
      if (fb) fb.innerHTML = '<span style="color:#10b981;">✅ 正确！</span>';
    } else {
      var correctOpt = container.querySelector('.dragon-practice-opt[data-correct="1"]');
      if (correctOpt) correctOpt.classList.add('dragon-opt-correct');
      if (fb) fb.innerHTML = '<span style="color:#ef4444;">❌ 错误</span>';
    }

    if (typeof AdaptiveEngine !== 'undefined') {
      try { AdaptiveEngine.recordInteraction(kgPoint, isCorrect, isCorrect ? 4 : 1, 0); } catch (e) { }
    }
    if (typeof MistakesModule !== 'undefined' && !isCorrect) {
      try { MistakesModule.addMistake({ kg: kgPoint, q: ps.exercises[ps.current].q, yourAnswer: opt.textContent, correctAnswer: container.querySelector('.dragon-practice-opt[data-correct="1"]').textContent, date: new Date().toISOString() }); } catch (e) { }
    }
    if (!isCorrect && typeof DictationMistakeSync !== 'undefined') {
      try { DictationMistakeSync.syncMistake({ kgPoint: kgPoint, correct: false }); } catch (e) { }
    }
    if (!isCorrect && typeof MistakeAnalysisSystem !== 'undefined') {
      try { MistakeAnalysisSystem.analyzeMistake ? MistakeAnalysisSystem.analyzeMistake({ kgPoint: kgPoint, q: ps.exercises[ps.current].q }) : null; } catch (e) { }
    }

    this._saveProgress();
  },

  // ===== Task 6: 间隔复习（优化版：SM-2 + EbbinghausScheduler + SpiralReview + MemoryTracker）=====
  _renderReviewPhase: function () {
    var allLearned = this.state.masteredWordIds || [];
    var dueWords = [];
    var allWords = typeof Grade7Data !== 'undefined' ? Grade7Data.getAllWords() : [];
    var wordMap = {}; allWords.forEach(function (w) { wordMap[w.id] = w; });

    if (typeof SpacedRepetition !== 'undefined' && allLearned.length > 0) {
      try {
        dueWords = SpacedRepetition.getDueReviewItems ? SpacedRepetition.getDueReviewItems(allLearned) : [];
        dueWords = dueWords.map(function (id) { return wordMap[id]; }).filter(Boolean);
      } catch (e) { dueWords = []; }
    }

    if (typeof EbbinghausScheduler !== 'undefined' && allLearned.length > 0) {
      try {
        var ebDue = EbbinghausScheduler.getAllDueItems ? EbbinghausScheduler.getAllDueItems() : [];
        var ebWords = ebDue.map(function (item) { return wordMap[item.wordId]; }).filter(Boolean);
        var existIds = {}; dueWords.forEach(function (w) { existIds[w.id] = true; });
        ebWords.forEach(function (w) { if (!existIds[w.id]) { dueWords.push(w); existIds[w.id] = true; } });
      } catch (e) { }
    }

    if (typeof SpiralReview !== 'undefined' && dueWords.length > 0) {
      try {
        var spiralWords = SpiralReview.reorderForSpiral ? SpiralReview.reorderForSpiral(dueWords) : dueWords;
        dueWords = spiralWords;
      } catch (e) { }
    }

    if (dueWords.length === 0) {
      if (!this.state.unitPhasesDone[this.state.currentUnit]) this.state.unitPhasesDone[this.state.currentUnit] = [];
      if (this.state.unitPhasesDone[this.state.currentUnit].indexOf('review') < 0) {
        this.state.unitPhasesDone[this.state.currentUnit].push('review');
      }
      this._saveProgress();
      return '<div class="dragon-phase-complete"><div class="dragon-complete-icon">📭</div><h4>暂无需复习的词</h4>' +
        '<p class="text-muted">当前没有到期的复习内容，干得漂亮！</p>' +
        '<button class="btn btn-primary btn-lg mt-3" id="dragonReviewNext">继续下一阶段 ➡</button></div>';
    }

    this._reviewState = { words: dueWords.slice(0, 20), current: 0, correct: 0 };
    return this._renderReviewQuestion();
  },

  _renderReviewQuestion: function () {
    var rs = this._reviewState;
    if (!rs || rs.current >= rs.words.length) return this._renderReviewSummary();

    var word = rs.words[rs.current];
    var distractorWords = (typeof Grade7Data !== 'undefined' ? Grade7Data.getAllWords() : []).filter(function (w) { return w.id !== word.id; });
    var opts = [word];
    var used = {}; used[word.id] = true;
    while (opts.length < 4) {
      var ri = Math.floor(Math.random() * distractorWords.length);
      if (!used[distractorWords[ri].id]) { opts.push(distractorWords[ri]); used[distractorWords[ri].id] = true; }
    }
    opts = this._shuffle(opts);

    var html = '<div class="dragon-practice-card">';
    html += '<div class="flex-between mb-2"><small class="text-muted">🔄 快速复习</small><small>' + (rs.current + 1) + '/' + rs.words.length + '</small></div>';
    html += '<div class="dragon-word-display-small">' + word.w + '</div>';
    html += '<div class="text-muted mb-2">' + (word.p || '') + '</div>';

    for (var i = 0; i < opts.length; i++) {
      html += '<button class="dragon-practice-opt" data-correct="' + (opts[i].id === word.id ? '1' : '0') + '" data-kg="' + (word.kgPoint || 'review') + '">' + String.fromCharCode(65 + i) + '. ' + opts[i].m + '</button>';
    }
    html += '<div id="dragonReviewFeedback" class="dragon-vocab-feedback mt-3"></div>';
    html += '</div>';
    return html;
  },

  _renderReviewSummary: function () {
    var rs = this._reviewState;
    if (!this.state.unitPhasesDone[this.state.currentUnit]) this.state.unitPhasesDone[this.state.currentUnit] = [];
    if (this.state.unitPhasesDone[this.state.currentUnit].indexOf('review') < 0) {
      this.state.unitPhasesDone[this.state.currentUnit].push('review');
    }
    this._saveProgress();
    return '<div class="dragon-phase-complete"><div class="dragon-complete-icon">✅</div><h4>间隔复习完成</h4>' +
      '<p>' + rs.correct + '/' + rs.words.length + ' 正确</p>' +
      '<button class="btn btn-primary btn-lg mt-3" id="dragonReviewNext">继续下一阶段 ➡</button></div>';
  },

  // ===== Task 7: 错题重练 =====
  _renderMistakeFixPhase: function () {
    var mistakes = [];
    if (typeof Storage !== 'undefined') {
      try { mistakes = JSON.parse(Storage.get(Storage.keys.MISTAKES || 'mistakes') || '[]'); } catch (e) { }
    }
    if (mistakes.length === 0) {
      if (!this.state.unitPhasesDone[this.state.currentUnit]) this.state.unitPhasesDone[this.state.currentUnit] = [];
      if (this.state.unitPhasesDone[this.state.currentUnit].indexOf('mistake-fix') < 0) {
        this.state.unitPhasesDone[this.state.currentUnit].push('mistake-fix');
      }
      this._saveProgress();
      return '<div class="dragon-phase-complete"><div class="dragon-complete-icon">🎉</div><h4>暂无疑难错题</h4>' +
        '<p class="text-muted">继续保持，错题本很干净！</p>' +
        '<button class="btn btn-primary btn-lg mt-3" id="dragonMistakeNext">继续下一阶段 ➡</button></div>';
    }

    // Sort by error type priority: knowledge > method > habit
    mistakes.sort(function (a, b) {
      var types = { '知识型': 0, '方法型': 1, '习惯型': 2 };
      return (types[a.errorType] || 2) - (types[b.errorType] || 2);
    });

    this._mistakeState = { mistakes: mistakes.slice(0, 10), current: 0, fixedCount: 0 };
    return this._renderMistakeQuestion();
  },

  _renderMistakeQuestion: function () {
    var ms = this._mistakeState;
    if (!ms || ms.current >= ms.mistakes.length) return this._renderMistakeSummary();

    var m = ms.mistakes[ms.current];
    var et = m.errorType || '未知';
    var etColor = et === '知识型' ? '#ef4444' : et === '方法型' ? '#f59e0b' : '#6366f1';

    var html = '<div class="dragon-practice-card">';
    html += '<div class="flex-between mb-2"><small class="text-muted">🔧 错题重练</small><small>' + (ms.current + 1) + '/' + ms.mistakes.length + '</small></div>';
    html += '<span class="dragon-error-tag" style="background:' + etColor + '20;color:' + etColor + ';border:1px solid ' + etColor + '40;">' + et + '</span>';
    html += '<div class="mb-3 mt-2"><strong>' + (m.q || m.question || '复习以下题目') + '</strong></div>';
    html += '<div class="alert alert-warning mb-3">上次错误答案：' + (m.yourAnswer || m.wrongAns || '--') + '</div>';

    // Options or input
    if (m.o) {
      for (var i = 0; i < m.o.length; i++) {
        html += '<button class="dragon-practice-opt" data-correct="' + (i === m.a ? '1' : '0') + '" data-kg="' + (m.kg || m.kp || 'mistake') + '">' + String.fromCharCode(65 + i) + '. ' + m.o[i] + '</button>';
      }
    } else {
      html += '<div class="dragon-input-row">';
      html += '<input type="text" class="dragon-vocab-input" id="dragonMistakeInput" placeholder="请输入答案..." autocomplete="off" autofocus>';
      html += '<button class="btn btn-primary dragon-mistake-submit" data-answer="' + (m.correctAnswer || m.correctAns || '') + '" data-kg="' + (m.kg || m.kp || 'mistake') + '">✓ 确认</button>';
      html += '</div>';
    }
    html += '<div id="dragonMistakeFeedback" class="dragon-vocab-feedback mt-3"></div>';
    html += '</div>';
    return html;
  },

  _renderMistakeSummary: function () {
    var ms = this._mistakeState;
    if (!this.state.unitPhasesDone[this.state.currentUnit]) this.state.unitPhasesDone[this.state.currentUnit] = [];
    if (this.state.unitPhasesDone[this.state.currentUnit].indexOf('mistake-fix') < 0) {
      this.state.unitPhasesDone[this.state.currentUnit].push('mistake-fix');
    }
    this._saveProgress();
    return '<div class="dragon-phase-complete"><div class="dragon-complete-icon">✅</div><h4>错题重练完成</h4>' +
      '<p>已纠正 ' + ms.fixedCount + '/' + ms.mistakes.length + ' 题</p>' +
      '<button class="btn btn-primary btn-lg mt-3" id="dragonMistakeNext">继续下一阶段 ➡</button></div>';
  },

  // ===== Task 10: 阅读理解 =====
  _renderReadingPhase: function () {
    var unitWords = this._getUnitWords(this.state.currentUnit);
    var passage = this._generateReadingPassage(unitWords.slice(0, 8));
    var questions = this._generateReadingQuestions(passage, unitWords);

    this._readingState = { passage: passage, questions: questions, current: 0, correct: 0 };
    return this._renderReadingPassage();
  },

  _generateReadingPassage: function (words) {
    if (words.length === 0) return 'There is a school near my home. I go there every day.';

    var themes = ['daily life', 'learning experience', 'interesting story'];
    var theme = themes[Math.floor(Math.random() * themes.length)];

    var wordList = words.slice(0, 6).map(function (w) { return w.w; });
    var uniqueWords = []; wordList.forEach(function (w) { if (uniqueWords.indexOf(w) < 0) uniqueWords.push(w); });

    var templates = [
      'Last week, I had a wonderful ' + (uniqueWords[0] || 'experience') + '. My friend and I went to a ' + (uniqueWords[1] || 'place') + ' near our school. It was very ' + (uniqueWords[2] || 'exciting') + '. We learned about ' + (uniqueWords[3] || 'happiness') + ' and why it is important in our ' + (uniqueWords[4] || 'life') + '. Everyone felt so happy. We decided to share our ' + (uniqueWords[5] || 'feelings') + ' with others.',
      'Do you know the secret of ' + (uniqueWords[0] || 'happiness') + '? Many people ' + (uniqueWords[1] || 'believe') + ' that having good friends and family makes us happy. I had a great ' + (uniqueWords[2] || 'experience') + ' at school today. Our class talked about what makes us feel ' + (uniqueWords[3] || 'good') + '. The teacher asked us to write about our ' + (uniqueWords[4] || 'feelings') + '. It was a very ' + (uniqueWords[5] || 'interesting') + ' day!'
    ];

    var passage = templates[Math.floor(Math.random() * templates.length)];
    return passage.replace(/\bundefined\b/g, 'interesting');
  },

  _generateReadingQuestions: function (passage, words) {
    var sentences = passage.split('. ').filter(function (s) { return s.length > 10; });
    return [
      { type: '主旨题', q: 'What is the main idea of the passage?', o: ['The importance of feelings and experiences', 'How to find food', 'Why to sleep early', 'How to play games'], a: 0, kg: 'reading_main' },
      { type: '细节题', q: 'What did the writer talk about at school?', o: ['Math problems', 'What makes us happy', 'Sports games', 'Food recipes'], a: 1, kg: 'reading_detail' },
      { type: '推断题', q: 'What can we infer from the passage?', o: ['Sharing feelings is important', 'The writer hates school', 'Everyone is sad', 'No one has friends'], a: 0, kg: 'reading_inference' }
    ];
  },

  _renderReadingPassage: function () {
    var rs = this._readingState;
    var html = '<div class="dragon-reading-card">';
    html += '<h4 class="dragon-reading-title">📚 阅读理解</h4>';
    html += '<div class="dragon-reading-passage">' + rs.passage + '</div>';
    html += '<hr>';

    var q = rs.questions[rs.current];
    html += '<div class="flex-between mb-2"><small class="text-muted">📖 问题</small><small>' + (rs.current + 1) + '/' + rs.questions.length + '</small></div>';
    html += '<div class="mb-3"><strong>' + rs.current + 1 + '. ' + q.q + '</strong></div>';

    for (var i = 0; i < q.o.length; i++) {
      html += '<button class="dragon-practice-opt" data-correct="' + (i === q.a ? '1' : '0') + '" data-kg="' + q.kg + '">' + String.fromCharCode(65 + i) + '. ' + q.o[i] + '</button>';
    }

    html += '<div id="dragonReadingFeedback" class="dragon-vocab-feedback mt-3"></div>';
    html += '</div>';
    return html;
  },

  // ===== Task 8: 单元诊断 =====
  _renderUnitDiagnosticPhase: function () {
    var unitId = this.state.currentUnit;
    var unitWords = this._getUnitWords(unitId);
    var unitGrammar = this._getUnitGrammar(unitId);
    var allEx = typeof Grade7Data !== 'undefined' ? Grade7Data.getAllExercises() : [];

    // Build diagnostic: 5 vocab + 3 grammar + 2 comprehension
    var diagQuestions = [];

    // 5 vocab questions
    var vocabPool = unitWords.slice();
    for (var v = 0; v < 5 && vocabPool.length > 0; v++) {
      var idx = v % vocabPool.length;
      var w = vocabPool[idx];
      var opts = this._generateOptions(w, 4);
      diagQuestions.push({ type: 'vocab', q: w.w + ' (' + (w.p || '') + ')', o: opts.map(function (o) { return o.m; }), a: opts.findIndex(function (o) { return o.id === w.id; }), kg: w.kgPoint || 'vocab' });
    }

    // 3 grammar
    for (var g = 0; g < 3 && g < allEx.length; g++) {
      var ex = allEx[(g * 3) % allEx.length];
      diagQuestions.push({ type: 'grammar', q: ex.q, o: ex.o || [], a: ex.a, kg: ex.kp || 'grammar' });
    }

    // 2 reading comprehension
    var readQs = this._generateReadingQuestions('Learning is fun.', unitWords);
    for (var r = 0; r < 2 && r < readQs.length; r++) {
      diagQuestions.push({ type: 'reading', q: readQs[r].q, o: readQs[r].o, a: readQs[r].a, kg: readQs[r].kg });
    }

    this._diagState = { questions: diagQuestions, current: 0, correct: 0, results: { vocab: { c: 0, t: 0 }, grammar: { c: 0, t: 0 }, reading: { c: 0, t: 0 } } };
    return this._renderUnitDiagnosticQuestion();
  },

  _renderUnitDiagnosticQuestion: function () {
    var ds = this._diagState;
    if (!ds || ds.current >= ds.questions.length) return this._renderUnitDiagnosticResult();

    var dq = ds.questions[ds.current];
    var html = '<div class="dragon-practice-card">';
    html += '<div class="flex-between mb-2"><small class="text-muted">🔬 单元诊断 Unit ' + this.state.currentUnit + '</small><small>' + (ds.current + 1) + '/' + ds.questions.length + '</small></div>';
    html += '<div class="progress-bar mb-3"><div class="progress-fill" style="width:' + Math.round(ds.current / ds.questions.length * 100) + '%"></div></div>';
    html += '<div class="mb-1"><small class="badge">' + dq.type + '</small></div>';
    html += '<div class="mb-3"><strong>' + dq.q + '</strong></div>';

    for (var i = 0; i < (dq.o || []).length; i++) {
      html += '<button class="dragon-practice-opt dragon-diag-opt" data-correct="' + (i === dq.a ? '1' : '0') + '" data-kg="' + dq.kg + '" data-type="' + dq.type + '">' + String.fromCharCode(65 + i) + '. ' + dq.o[i] + '</button>';
    }
    html += '<div id="dragonDiagFeedback" class="dragon-vocab-feedback mt-3"></div>';
    html += '</div>';
    return html;
  },

  _renderUnitDiagnosticResult: function () {
    var ds = this._diagState;
    var totalQ = ds.questions.length;
    var pct = totalQ > 0 ? Math.round(ds.correct / totalQ * 100) : 0;
    var passed = pct >= 70;

    if (!this.state.unitPhasesDone[this.state.currentUnit]) this.state.unitPhasesDone[this.state.currentUnit] = [];
    if (this.state.unitPhasesDone[this.state.currentUnit].indexOf('unit-diagnostic') < 0) {
      this.state.unitPhasesDone[this.state.currentUnit].push('unit-diagnostic');
    }
    this.state.unitScores[this.state.currentUnit].diagnostic = pct;
    this.state.diagnosticResults[this.state.currentUnit] = {
      vocab: Math.round(ds.results.vocab.t > 0 ? ds.results.vocab.c / ds.results.vocab.t * 100 : 0),
      grammar: Math.round(ds.results.grammar.t > 0 ? ds.results.grammar.c / ds.results.grammar.t * 100 : 0),
      reading: Math.round(ds.results.reading.t > 0 ? ds.results.reading.c / ds.results.reading.t * 100 : 0)
    };
    this._saveProgress();

    var weakKgs = [];
    if (typeof AdaptiveEngine !== 'undefined') {
      try {
        var rec = AdaptiveEngine.getNextRecommendation();
        if (rec && rec.topWeaknesses) {
          weakKgs = rec.topWeaknesses.filter(function (w) { return w.probability < 0.5; }).map(function (w) { return w.kgPoint; });
        }
      } catch (e) { }
    }

    var icon = passed ? '🎉' : '⚠️';
    var title = passed ? '诊断通过！' : '诊断未达标';
    var desc = passed ? '恭喜！Unit ' + this.state.currentUnit + ' 诊断通过（' + pct + '%），可以进入下一单元。' : '正确率 ' + pct + '% < 70%，需要补漏冲刺。薄弱考点：' + (weakKgs.length > 0 ? weakKgs.slice(0, 3).join(', ') : '暂无');

    var btnLabel = passed ? '进入下一单元 ➡' : '🔧 开始补漏冲刺';
    var btnId = passed ? 'dragonDiagPassNext' : 'dragonDiagFailFix';

    return '<div class="dragon-phase-complete"><div class="dragon-complete-icon">' + icon + '</div><h4>' + title + '</h4>' +
      '<p>' + ds.correct + '/' + totalQ + ' · ' + pct + '%</p><p class="text-muted">' + desc + '</p>' +
      '<button class="btn btn-primary btn-lg mt-3" id="' + btnId + '">' + btnLabel + '</button>' +
      (!passed ? '<button class="btn btn-outline mt-2" id="dragonDiagSkip">⏭ 跳过，直接进入下一单元</button>' : '') +
      '</div>';
  },

  // ===== Task 9: 补漏冲刺 =====
  _renderGapFillPhase: function () {
    var unitId = this.state.currentUnit;
    var rounds = this.state.gapFillRounds[unitId] || 0;
    if (rounds >= 2) {
      return '<div class="dragon-phase-complete"><div class="dragon-complete-icon">⏰</div><h4>已补漏2轮</h4>' +
        '<p class="text-muted">已达到补漏上限，建议进入下一单元继续学习。</p>' +
        '<button class="btn btn-primary btn-lg mt-3" id="dragonGapSkip">进入下一单元 ➡</button></div>';
    }

    // Extract weak words
    var unitWords = this._getUnitWords(unitId);
    var weakWords = [];
    if (typeof AdaptiveEngine !== 'undefined') {
      weakWords = unitWords.filter(function (w) {
        var prob = typeof AdaptiveEngine.getMasteryProbability === 'function' ? AdaptiveEngine.getMasteryProbability(w.kgPoint || 'vocab') : 0.5;
        return prob < 0.6;
      });
    }
    if (weakWords.length === 0) weakWords = unitWords.filter(function (w) { return (this.state.masteredWordIds || []).indexOf(w.id) < 0; }.bind(this)).slice(0, 10);
    if (weakWords.length === 0) weakWords = unitWords.slice(0, 10);

    if (typeof InterleavedPractice !== 'undefined') {
      try { weakWords = InterleavedPractice.interleave ? InterleavedPractice.interleave(weakWords) : weakWords; } catch (e) { }
    }

    // Weak grammar
    var unitGrammar = this._getUnitGrammar(unitId);
    var weakGrammar = unitGrammar.slice(0, 3);
    var allEx = typeof Grade7Data !== 'undefined' ? Grade7Data.getAllExercises() : [];

    this._gapState = {
      weakWords: weakWords.slice(0, 10),
      weakGrammar: weakGrammar,
      allExercises: allEx,
      currentWord: 0,
      currentGrammar: 0,
      wordCorrect: 0,
      grammarCorrect: 0,
      stage: 'words',
      unitId: unitId,
      wordDim: 0  // 0: dictation, 1: context
    };

    this.state.gapFillRounds[unitId] = rounds + 1;
    this._saveProgress();
    return this._renderGapFillQuestion();
  },

  _renderGapFillQuestion: function () {
    var gs = this._gapState;
    if (!gs) return '<p>无补漏数据</p>';

    if (gs.stage === 'words' && gs.currentWord >= gs.weakWords.length) {
      gs.stage = 'grammar'; gs.currentGrammar = 0;
    }
    if (gs.stage === 'grammar' && gs.currentGrammar >= gs.weakGrammar.length) {
      // Gap fill complete → re-diagnose
      return this._renderGapFillComplete();
    }

    if (gs.stage === 'words') {
      var word = gs.weakWords[gs.currentWord];
      var dimLabel = gs.wordDim === 0 ? '听音默写' : '语境填空';

      var html = '<div class="dragon-practice-card">';
      html += '<div class="flex-between mb-2"><small class="text-muted">🎯 补漏冲刺</small><small>' + dimLabel + ' ' + (gs.currentWord + 1) + '/' + gs.weakWords.length + '</small></div>';

      if (gs.wordDim === 0) {
        html += '<button class="btn btn-primary btn-lg mb-3 w-100 dragon-play-audio" data-word="' + word.w + '">🔊 点击播放</button>';
        html += '<div class="dragon-input-row">';
        html += '<input type="text" class="dragon-vocab-input" id="dragonGapInput" placeholder="听到的单词是..." autocomplete="off" autofocus>';
        html += '<button class="btn btn-primary dragon-gap-submit" data-word="' + word.w + '" data-kg="' + (word.kgPoint || 'gap') + '">✓ 确认</button>';
        html += '</div>';
      } else {
        var sent = (word.ex && word.ex[0]) ? word.ex[0].replace(new RegExp(word.w, 'gi'), '______') : 'Please use ______ in a sentence.';
        html += '<div class="dragon-context-sentence">' + sent + '</div>';
        html += '<div class="dragon-input-row">';
        html += '<input type="text" class="dragon-vocab-input" id="dragonGapInput" placeholder="填入正确的单词..." autocomplete="off" autofocus>';
        html += '<button class="btn btn-primary dragon-gap-submit" data-word="' + word.w + '" data-kg="' + (word.kgPoint || 'gap') + '">✓ 确认</button>';
        html += '</div>';
      }
      html += '<div id="dragonGapFeedback" class="dragon-vocab-feedback mt-3"></div>';
      if (typeof AssociationBuilder !== 'undefined' && typeof Enrichment !== 'undefined') {
        try {
          var assocs = AssociationBuilder.getAssociations ? AssociationBuilder.getAssociations(word.w) : [];
          var enrich = Enrichment.getEnrichment ? Enrichment.getEnrichment(word.w) : null;
          if (assocs.length > 0 || enrich) {
            html += '<div style="margin-top:12px;padding:8px 12px;background:#f5f3ff;border-radius:8px;font-size:0.78rem;">';
            html += '<span style="font-weight:600;color:#7c3aed;">🔗 相关词汇：</span>';
            html += assocs.length > 0 ? assocs.join(' · ') : '无直接关联';
            if (enrich) html += '<br><span style="font-weight:600;color:#7c3aed;">📖 拓展：</span>' + enrich;
            html += '</div>';
          }
        } catch (e) { }
      }
      html += '</div>';
      return html;
    } else {
      // Grammar gap fill
      var gm = gs.weakGrammar[gs.currentGrammar];
      var exIdx = gs.currentGrammar % gs.allExercises.length;
      var ex = gs.allExercises[exIdx > 0 ? exIdx : 0];
      if (!ex.q) ex = gs.allExercises[0];

      var html = '<div class="dragon-practice-card">';
      html += '<div class="flex-between mb-2"><small class="text-muted">🎯 语法补漏</small><small>' + (gs.currentGrammar + 1) + '/' + gs.weakGrammar.length + '</small></div>';
      html += '<div class="alert alert-info mb-3"><strong>' + (gm.title || '语法点') + '：</strong>' + (gm.tips || gm.rule || '请复习此语法点') + '</div>';
      html += '<div class="mb-3"><strong>' + ex.q + '</strong></div>';

      for (var i = 0; i < (ex.o || []).length; i++) {
        html += '<button class="dragon-practice-opt dragon-gap-gram-opt" data-correct="' + (i === ex.a ? '1' : '0') + '" data-kg="' + (ex.kp || 'gap_grammar') + '">' + String.fromCharCode(65 + i) + '. ' + ex.o[i] + '</button>';
      }
      html += '<div id="dragonGapFeedback" class="dragon-vocab-feedback mt-3"></div>';
      html += '</div>';
      return html;
    }
  },

  _renderGapFillComplete: function () {
    return '<div class="dragon-phase-complete"><div class="dragon-complete-icon">✅</div><h4>补漏完成</h4>' +
      '<p class="text-muted">建议重新诊断确认掌握情况</p>' +
      '<button class="btn btn-primary btn-lg mt-3" id="dragonGapRediag">🔬 重新诊断</button>' +
      '<button class="btn btn-outline mt-2" id="dragonGapSkipDiag">⏭ 跳过，进入下一单元</button></div>';
  },

  // ===== Task 11: 全学期综合诊断 =====
  _renderGlobalDiagnostic: function () {
    var allWords = typeof Grade7Data !== 'undefined' ? Grade7Data.getAllWords() : [];
    if (allWords.length === 0) return '<p class="p-4">数据加载失败</p>';

    var diagWords = []; var used = {};
    for (var d = 0; d < 20 && d < allWords.length; d++) {
      var ri = Math.floor(Math.random() * allWords.length);
      if (!used[ri]) { diagWords.push({ word: allWords[ri], stage: 'vocab', correct: 0, total: 0 }); used[ri] = true; }
    }

    this._globalDiagState = {
      stage: 'vocab', words: diagWords, current: 0, correctVocab: 0, correctGram: 0,
      correctRead: 0, correctListen: 0, totalGram: 0, totalRead: 0, totalListen: 0,
      vocabTotal: diagWords.length, gramTotal: 10, readTotal: 5, listenTotal: 10
    };
    return this._renderGlobalDiagQuestion();
  },

  _renderGlobalDiagQuestion: function () {
    var gds = this._globalDiagState;
    if (gds.stage === 'vocab' && gds.current >= gds.words.length) { gds.stage = 'grammar'; gds.current = 0; }
    if (gds.stage === 'grammar' && gds.current >= 10) { gds.stage = 'reading'; gds.current = 0; }
    if (gds.stage === 'reading' && gds.current >= 5) { gds.stage = 'report'; return this._renderGlobalDiagReport(); }

    var html = '<div class="dragon-practice-card"><h4>🏥 全学期综合诊断</h4>';
    html += '<div class="mb-2"><span class="badge">' + ({ vocab: '词汇', grammar: '语法', reading: '阅读', listening: '听力' }[gds.stage] || gds.stage) + '</span></div>';

    if (gds.stage === 'vocab') {
      var w = gds.words[gds.current].word;
      var opts = this._generateOptions(w, 4);
      html += '<p>选中文：<strong>' + w.w + '</strong></p>';
      for (var vi = 0; vi < opts.length; vi++) {
        html += '<button class="dragon-practice-opt dragon-gdiag-opt" data-correct="' + (opts[vi].id === w.id ? '1' : '0') + '" data-kg="' + (w.kgPoint || 'vocab') + '" data-stage="vocab">' + String.fromCharCode(65 + vi) + '. ' + opts[vi].m + '</button>';
      }
    } else if (gds.stage === 'grammar') {
      var allEx = typeof Grade7Data !== 'undefined' ? Grade7Data.getAllExercises() : [];
      var ex = allEx[gds.current % allEx.length];
      html += '<p>语法题 ' + (gds.current + 1) + '/10</p>';
      if (ex.q) html += '<p><strong>' + ex.q + '</strong></p>';
      for (var gi = 0; gi < (ex.o || []).length; gi++) {
        html += '<button class="dragon-practice-opt dragon-gdiag-opt" data-correct="' + (gi === ex.a ? '1' : '0') + '" data-kg="' + (ex.kp || 'grammar') + '" data-stage="grammar">' + String.fromCharCode(65 + gi) + '. ' + ex.o[gi] + '</button>';
      }
    } else if (gds.stage === 'reading') {
      var rs = this._readingState || { questions: this._generateReadingQuestions('Learning English is important for middle school students.', []) };
      var rq = rs.questions[gds.current % rs.questions.length];
      html += '<p>阅读理解 ' + (gds.current + 1) + '/5</p><p><strong>' + rq.q + '</strong></p>';
      for (var ri = 0; ri < (rq.o || []).length; ri++) {
        html += '<button class="dragon-practice-opt dragon-gdiag-opt" data-correct="' + (ri === rq.a ? '1' : '0') + '" data-kg="' + rq.kg + '" data-stage="reading">' + String.fromCharCode(65 + ri) + '. ' + rq.o[ri] + '</button>';
      }
    }

    html += '<div id="dragonGlobalDiagFb" class="dragon-vocab-feedback mt-3"></div></div>';
    return html;
  },

  _renderGlobalDiagReport: function () {
    var gds = this._globalDiagState;
    var vocabPct = gds.words.length > 0 ? Math.round(gds.correctVocab / gds.words.length * 100) : 0;
    var gramPct = gds.totalGram > 0 ? Math.round(gds.correctGram / gds.totalGram * 100) : 0;
    var readPct = gds.totalRead > 0 ? Math.round(gds.correctRead / gds.totalRead * 100) : 0;
    var avgPct = Math.round((vocabPct + gramPct + readPct) / 3);

    var estimate = typeof AdaptiveEngine !== 'undefined' ? AdaptiveEngine.estimateScore() : { score: 75, range: [65, 90] };

    this.state.semesterDiagnosticDone = true;
    this._saveProgress();

    return '<div class="dragon-phase-complete"><div class="dragon-complete-icon">📊</div><h4>综合诊断报告</h4>' +
      '<div class="dragon-diag-grid">' +
      '<div class="dragon-diag-item"><span>词汇</span><b style="color:' + (vocabPct >= 70 ? '#10b981' : '#f59e0b') + ';">' + vocabPct + '%</b></div>' +
      '<div class="dragon-diag-item"><span>语法</span><b style="color:' + (gramPct >= 70 ? '#10b981' : '#f59e0b') + ';">' + gramPct + '%</b></div>' +
      '<div class="dragon-diag-item"><span>阅读</span><b style="color:' + (readPct >= 70 ? '#10b981' : '#f59e0b') + ';">' + readPct + '%</b></div>' +
      '</div>' +
      '<p class="mt-3">预估分数：<strong>' + estimate.score + '/120 (' + estimate.range[0] + '-' + estimate.range[1] + ')</strong></p>' +
      '<h5 class="mt-4">Canvas 综合雷达图</h5>' +
      '<div id="dragonRadarCanvas"><canvas id="dragonRadar" width="280" height="280"></canvas></div>' +
      '<p class="text-muted mt-3">4维度分析：词汇(' + vocabPct + '%) · 语法(' + gramPct + '%) · 阅读(' + readPct + '%) · 听力(' + Math.round(gds.correctListen / Math.max(gds.totalListen, 1) * 100) + '%)</p>' +
      '<button class="btn btn-primary btn-lg mt-3" id="dragonGlobalDiagOk">✅ 返回</button></div>';
  },

  _drawRadarChart: function () {
    var canvas = document.getElementById('dragonRadar');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var gds = this._globalDiagState;
    var vocabPct = Math.round(gds.correctVocab / Math.max(gds.words.length, 1) * 100);
    var gramPct = gds.totalGram > 0 ? Math.round(gds.correctGram / gds.totalGram * 100) : 0;
    var readPct = gds.totalRead > 0 ? Math.round(gds.correctRead / gds.totalRead * 100) : 0;
    var listenPct = gds.totalListen > 0 ? Math.round(gds.correctListen / gds.totalListen * 100) : 0;

    var values = [vocabPct, gramPct, readPct, listenPct];
    var labels = ['词汇', '语法', '阅读', '听力'];
    var count = 4;
    var cx = 140; var cy = 140; var r = 110;

    ctx.clearRect(0, 0, 280, 280);

    // Grid
    for (var g = 1; g <= 5; g++) {
      ctx.beginPath();
      for (var i = 0; i < count; i++) {
        var angle = (Math.PI * 2 / count) * i - Math.PI / 2;
        var x = cx + r * (g / 5) * Math.cos(angle);
        var y = cy + r * (g / 5) * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath(); ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 1; ctx.stroke();
    }

    // Axes
    for (var a = 0; a < count; a++) {
      var angle = (Math.PI * 2 / count) * a - Math.PI / 2;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
      ctx.strokeStyle = '#d1d5db'; ctx.stroke();

      ctx.fillStyle = '#374151'; ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(labels[a] + '(' + values[a] + '%)', cx + (r + 18) * Math.cos(angle), cy + (r + 18) * Math.sin(angle) + 4);
    }

    // Data polygon
    ctx.beginPath();
    for (var d = 0; d < count; d++) {
      var angle = (Math.PI * 2 / count) * d - Math.PI / 2;
      var val = values[d] / 100;
      var x = cx + r * val * Math.cos(angle);
      var y = cy + r * val * Math.sin(angle);
      if (d === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.fillStyle = 'rgba(99,102,241,0.2)'; ctx.fill();
    ctx.strokeStyle = '#6366f1'; ctx.lineWidth = 2; ctx.stroke();

    // Dots
    for (var p = 0; p < count; p++) {
      var angle = (Math.PI * 2 / count) * p - Math.PI / 2;
      var val = values[p] / 100;
      ctx.beginPath();
      ctx.arc(cx + r * val * Math.cos(angle), cy + r * val * Math.sin(angle), 4, 0, Math.PI * 2);
      ctx.fillStyle = '#6366f1'; ctx.fill();
    }
  },

  // ===== Task 12: 全真模考 =====
  _renderMockExam: function () {
    var allEx = typeof Grade7Data !== 'undefined' ? Grade7Data.getAllExercises() : [];
    if (allEx.length === 0) return '<p class="p-4">题库数据加载失败</p>';

    var mockQuestions = [];
    for (var m = 0; m < 25 && m < allEx.length; m++) {
      mockQuestions.push({ q: allEx[m % allEx.length].q, o: allEx[m % allEx.length].o || [], a: allEx[m % allEx.length].a, kg: allEx[m % allEx.length].kp || 'mock' });
    }

    this._mockState = {
      questions: mockQuestions, current: 0, answers: {},
      correct: 0, startTime: Date.now(), totalTime: 45 * 60, submitted: false
    };

    return '<div class="dragon-mock-container" id="dragonMockContainer">' +
      '<div class="dragon-mock-header"><h4>📋 全真模考</h4>' +
      '<div class="dragon-mock-timer" id="dragonMockTimer">⏱ 45:00</div></div>' +
      '<div class="dragon-mock-answer-card" id="dragonAnswerCard">' +
      mockQuestions.map(function (q, idx) { return '<span class="dragon-card-num" data-idx="' + idx + '" id="cardNum' + idx + '">' + (idx + 1) + '</span>'; }).join('') +
      '</div>' +
      '<div id="dragonMockQuestion"></div>' +
      '<div class="dragon-mock-footer"><button class="btn btn-primary btn-lg" id="dragonMockSubmit">📤 交卷</button></div></div>';
  },

  _renderMockQuestion: function () {
    var ms = this._mockState;
    if (ms.current >= ms.questions.length) return this._renderMockReport();

    var mq = ms.questions[ms.current];
    var qNum = ms.current + 1;

    var html = '<div class="dragon-mock-q-card">';
    html += '<div class="flex-between mb-2"><span class="text-muted">第' + qNum + '/25题</span><span class="badge badge-purple">' + (ms.current < 15 ? '单选' : ms.current < 20 ? '完形' : '阅读') + '</span></div>';
    html += '<div class="progress-bar mb-3"><div class="progress-fill" style="width:' + Math.round(ms.current / 25 * 100) + '%"></div></div>';
    html += '<div class="mb-3 fw-bold">' + mq.q + '</div>';

    for (var i = 0; i < (mq.o || []).length; i++) {
      html += '<button class="dragon-practice-opt dragon-mock-opt" data-idx="' + (ms.current) + '" data-correct="' + (i === mq.a ? '1' : '0') + '" data-kg="' + mq.kg + '">' + String.fromCharCode(65 + i) + '. ' + mq.o[i] + '</button>';
    }

    html += '</div>';
    return html;
  },

  _renderMockReport: function () {
    var ms = this._mockState;
    var pct = ms.questions.length > 0 ? Math.round(ms.correct / ms.questions.length * 100) : 0;
    var score = Math.round(pct / 100 * 120);
    var elapsed = Math.round((Date.now() - ms.startTime) / 1000);
    var elapsedMin = Math.floor(elapsed / 60);
    var elapsedSec = elapsed % 60;

    this.state.mockExamDone = true;
    this.state.mockExamScore = score;
    this._saveProgress();

    var color = score >= 105 ? '#10b981' : score >= 85 ? '#f59e0b' : '#ef4444';
    var level = score >= 108 ? '优秀 (A+)' : score >= 96 ? '良好 (A)' : score >= 84 ? '中等 (B)' : score >= 72 ? '及格 (C)' : '不及格 (D)';

    var sprintAdvice = '';
    if (typeof AdaptiveEngine !== 'undefined') {
      try {
        var sprint = AdaptiveEngine.getSprintAdvice();
        if (sprint && sprint.advices) {
          sprintAdvice = '<div class="alert alert-warning mt-3"><strong>🎯 考前72小时冲刺建议：</strong><br>' + sprint.advices.join('<br>') + '</div>';
        }
      } catch (e) { }
    }

    return '<div class="dragon-phase-complete">' +
      '<h3>📊 模考成绩报告</h3>' +
      '<div class="big-score" style="color:' + color + ';font-size:4rem;font-weight:800;">' + score + '</div>' +
      '<p>/120 · ' + level + '</p>' +
      '<div class="dragon-complete-stats mt-3">' +
      '<div class="dragon-stat"><span class="dragon-stat-val">' + ms.correct + '/25</span><span class="dragon-stat-lbl">正确</span></div>' +
      '<div class="dragon-stat"><span class="dragon-stat-val">' + pct + '%</span><span class="dragon-stat-lbl">正确率</span></div>' +
      '<div class="dragon-stat"><span class="dragon-stat-val">' + elapsedMin + ':' + (elapsedSec < 10 ? '0' : '') + elapsedSec + '</span><span class="dragon-stat-lbl">用时</span></div>' +
      '</div>' +
      sprintAdvice +
      '<button class="btn btn-primary btn-lg mt-3" id="dragonMockDone">✅ 返回</button>' +
      '</div>';
  },

  // ===== Event binding =====
  _bindAllEvents: function () {
    var self = this;

    // Unit card click
    document.querySelectorAll('.dragon-unit-card').forEach(function (card) {
      card.addEventListener('click', function () {
        var unit = parseInt(this.dataset.unit);
        if (this.classList.contains('dragon-unit-locked')) return;
        self.state.currentUnit = unit;
        self.state.currentMicroPhase = 0;
        self.state.mode = 'unit';
        self._saveProgress(); self.render();
      });
    });

    // Micro phase nav click
    document.querySelectorAll('.dragon-micro-step').forEach(function (step) {
      step.addEventListener('click', function () {
        var s = parseInt(this.dataset.step);
        if (s <= self.state.currentMicroPhase || s === self.state.currentMicroPhase) {
          self.state.currentMicroPhase = s; self._saveProgress(); self.render();
        }
      });
    });

    // Mode switch
    document.querySelectorAll('.dragon-mode-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        self.state.mode = this.dataset.mode;
        self._saveProgress(); self.render();
      });
    });

    // Global actions
    var skipBtn = document.getElementById('dragonSkipPhase');
    var retryBtn = document.getElementById('dragonRetryPhase');
    var resetBtn = document.getElementById('dragonResetAll');

    if (skipBtn) skipBtn.addEventListener('click', function () {
      self.state.currentMicroPhase = Math.min(self.MICRO_PHASES.length - 1, self.state.currentMicroPhase + 1);
      self._saveProgress(); self.render();
    });
    if (retryBtn) retryBtn.addEventListener('click', function () {
      self._saveProgress(); self.render();
    });
    if (resetBtn) resetBtn.addEventListener('click', function () {
      if (confirm('确定要重置全部进度吗？此操作不可撤销！')) { self._resetProgress(); self.render(); }
    });

    // Preview phase bindings
    this._bindPreviewAll();

    // Vocab phase bindings
    this._bindVocabAll();

    // Active recall bindings
    this._bindActiveRecallAll();

    // Practice phase bindings
    this._bindPracticeAll();

    // Pronunciation bindings
    this._bindPronunciationAll();

    // Mistake fix bindings
    this._bindMistakeAll();

    // Unit diagnostic bindings
    this._bindDiagAll();

    // Gap fill bindings
    this._bindGapAll();

    // Semester cards
    document.querySelectorAll('.dragon-start-sp').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(this.dataset.spIdx);
        if (idx === 0) self._startGlobalDiagnostic();
        else if (idx === 1) self._startMockExam();
        else self.render();
      });
    });

    // Semester phase results
    var gdiagOk = document.getElementById('dragonGlobalDiagOk');
    if (gdiagOk) gdiagOk.addEventListener('click', function () { self.render(); });
    var mockDone = document.getElementById('dragonMockDone');
    if (mockDone) mockDone.addEventListener('click', function () { self.render(); });
  },

  _bindVocabAll: function () {
    var self = this;
    var container = document.getElementById('dragonVocabContainer');
    if (!container || !self.vocabState) return;

    container.querySelectorAll('.dragon-play-audio').forEach(function (btn) {
      btn.addEventListener('click', function () { self._speak(this.dataset.word); });
    });

    container.querySelectorAll('.dragon-vocab-opt').forEach(function (opt) {
      opt.addEventListener('click', function () {
        if (this.classList.contains('answered')) return;
        this.classList.add('answered');
        var correct = this.dataset.correct === '1';
        if (correct) { this.classList.add('dragon-opt-correct'); }
        else {
          this.classList.add('dragon-opt-wrong');
          var c = container.querySelector('.dragon-vocab-opt[data-correct="1"]');
          if (c) c.classList.add('dragon-opt-correct');
        }
        var dimId = this.dataset.dim || 'identify';
        var fb = document.getElementById('dragonVocabFeedback');
        if (!correct && fb) {
          var correctOpt = container.querySelector('.dragon-vocab-opt[data-correct="1"]');
          var correctText = correctOpt ? correctOpt.textContent.trim() : '';
          fb.innerHTML = '<span style="color:#ef4444;">❌ 正确答案：<strong>' + correctText + '</strong></span>';
        }
        self._handleVocabAnswer(correct, this.dataset.kg, dimId, '');
        setTimeout(function () { self._advanceVocab(); }, correct ? 400 : 900);
      });
    });

    container.querySelectorAll('.dragon-vocab-submit').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (this.disabled) return;
        var correctWord = this.dataset.word.toLowerCase();
        var userWord = (document.getElementById('dragonVocabInput') || {}).value || '';
        userWord = userWord.trim().toLowerCase();
        var dimId = this.dataset.dim || 'spell';

        var correct;
        if (dimId === 'produce') {
          correct = userWord.length > 2 && userWord.toLowerCase().indexOf(this.dataset.word.toLowerCase()) >= 0;
        } else {
          correct = userWord === correctWord || (userWord.length >= 3 && correctWord.indexOf(userWord) === 0);
        }

        var fb = document.getElementById('dragonVocabFeedback');
        if (correct) {
          if (fb) fb.innerHTML = '<span style="color:#10b981;">✅ 正确！' + correctWord + '</span>';
          this.disabled = true;
          var input = document.getElementById('dragonVocabInput');
          if (input) input.disabled = true;
        } else {
          if (fb) fb.innerHTML = '<span style="color:#ef4444;">❌ 正确答案：<strong>' + correctWord + '</strong></span>';
          this.disabled = true;
          var input = document.getElementById('dragonVocabInput');
          if (input) input.disabled = true;
        }
        self._handleVocabAnswer(correct, this.dataset.kg, dimId, correctWord);
        setTimeout(function () { self._advanceVocab(); }, correct ? 500 : 1000);
      });
    });

    var input = document.getElementById('dragonVocabInput');
    if (input) {
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          var submit = container.querySelector('.dragon-vocab-submit');
          if (submit && !submit.disabled) submit.click();
        }
      });
    }
  },

  _bindQualityGateAll: function () {
    var self = this;
    var container = document.getElementById('dragonVocabContainer');
    if (!container) return;

    container.querySelectorAll('.dragon-play-audio').forEach(function (btn) {
      btn.addEventListener('click', function () { self._speak(this.dataset.word); });
    });

    container.querySelectorAll('.dragon-quality-gate-opt').forEach(function (opt) {
      opt.addEventListener('click', function () {
        if (this.classList.contains('answered')) return;
        this.classList.add('answered');
        var correct = this.dataset.correct === '1';
        if (correct) { this.classList.add('dragon-opt-correct'); }
        else {
          this.classList.add('dragon-opt-wrong');
          var c = container.querySelector('.dragon-quality-gate-opt[data-correct="1"]');
          if (c) c.classList.add('dragon-opt-correct');
        }
        self._handleQualityGateAnswer(correct);
        setTimeout(function () {
          container.innerHTML = self._renderQualityGateQ();
          self._bindQualityGateAll();
        }, correct ? 400 : 1200);
      });
    });
  },

  _bindVocabSummary: function () {
    var self = this;
    var nextBtn = document.getElementById('dragonVocabNext');
    if (nextBtn) nextBtn.addEventListener('click', function () {
      self.state.currentMicroPhase++; self._saveProgress(); self.render();
    });
  },

  _bindPracticeAll: function () {
    var self = this;
    var container = document.getElementById('dragonContent');
    if (!container || !self._practiceState) return;

    container.querySelectorAll('.dragon-practice-opt').forEach(function (opt) {
      opt.addEventListener('click', function () {
        if (this.classList.contains('answered')) return;
        this.classList.add('answered');
        var correct = this.dataset.correct === '1';
        if (correct) { this.classList.add('dragon-opt-correct'); }
        else {
          this.classList.add('dragon-opt-wrong');
          var c = container.querySelector('.dragon-practice-opt[data-correct="1"]');
          if (c) c.classList.add('dragon-opt-correct');
        }
        self._handlePracticeAnswer(correct, this.dataset.kg, this, container);
        setTimeout(function () {
          self._practiceState.current++;
          var ca = document.getElementById('dragonContent');
          if (ca) {
            if (self._practiceState.current >= self._practiceState.exercises.length) {
              ca.innerHTML = self._renderPracticeSummary();
              self._bindPracticeSummary();
            } else { ca.innerHTML = self._renderPracticeQuestion(); self._bindPracticeAll(); }
          }
        }, 700);
      });
    });

    var nextBtn = document.getElementById('dragonPracticeNext');
    if (nextBtn) nextBtn.addEventListener('click', function () { self.state.currentMicroPhase++; self._saveProgress(); self.render(); });
  },

  _bindPracticeSummary: function () {
    var self = this;
    var nextBtn = document.getElementById('dragonPracticeNext');
    if (nextBtn) nextBtn.addEventListener('click', function () { self.state.currentMicroPhase++; self._saveProgress(); self.render(); });
  },

  _bindReviewAll: function () {
    var self = this;
    var container = document.getElementById('dragonContent');
    if (!container || !self._reviewState) return;

    container.querySelectorAll('.dragon-practice-opt').forEach(function (opt) {
      opt.addEventListener('click', function () {
        if (this.classList.contains('answered')) return;
        this.classList.add('answered');
        var correct = this.dataset.correct === '1';
        if (correct) { this.classList.add('dragon-opt-correct'); self._reviewState.correct++; }
        else {
          this.classList.add('dragon-opt-wrong');
          var c = container.querySelector('.dragon-practice-opt[data-correct="1"]');
          if (c) c.classList.add('dragon-opt-correct');
        }
        if (typeof AdaptiveEngine !== 'undefined') {
          try { AdaptiveEngine.recordInteraction(this.dataset.kg, correct, correct ? 3 : 1, 0); } catch (e) { }
        }
        if (!correct && typeof SelfExplanation !== 'undefined') {
          try {
            var selfExp = SelfExplanation.generatePrompt ? SelfExplanation.generatePrompt(correctWord, userWord) : null;
            if (selfExp && fb) { fb.innerHTML = fb.innerHTML + '<div style="margin-top:8px;padding:8px;background:#f0f9ff;border-radius:6px;font-size:0.78rem;color:#0369a1;">💭 ' + selfExp + '</div>'; }
          } catch (e) { }
        }
        if (!correct && typeof FeynmanMethod !== 'undefined') {
          try {
            var feynExp = FeynmanMethod.explain ? FeynmanMethod.explain(this.dataset.kg) : null;
            if (feynExp) {
              var ff = document.getElementById('dragonMistakeFeedback');
              if (ff) ff.innerHTML = ff.innerHTML + '<div style="margin-top:8px;padding:8px;background:#fff7ed;border-radius:6px;font-size:0.8rem;color:#9a3412;">📝 费曼解释：' + feynExp + '</div>';
            }
          } catch (e) { }
        }
        if (!correct && typeof DictationMistakeSync !== 'undefined') {
          try { DictationMistakeSync.syncMistake ? DictationMistakeSync.syncMistake({ kgPoint: this.dataset.kg, correct: false }) : null; } catch (e) { }
        }
        if (typeof SpacedRepetition !== 'undefined') {
          try { SpacedRepetition.update ? SpacedRepetition.update(self._reviewState.words[self._reviewState.current].id, correct ? 4 : 1) : null; } catch (e) { }
        }
        if (typeof MemoryTracker !== 'undefined') {
          try { MemoryTracker.recordTest ? MemoryTracker.recordTest(self._reviewState.words[self._reviewState.current].id, correct) : null; } catch (e) { }
        }
        if (typeof EbbinghausScheduler !== 'undefined') {
          try { EbbinghausScheduler.updateAfterReview ? EbbinghausScheduler.updateAfterReview(self._reviewState.words[self._reviewState.current].id, correct) : null; } catch (e) { }
        }
        if (typeof SpiralReview !== 'undefined') {
          try { SpiralReview.recordResult ? SpiralReview.recordResult(self._reviewState.words[self._reviewState.current].id, correct) : null; } catch (e) { }
        }
        setTimeout(function () {
          self._reviewState.current++;
          var ca = document.getElementById('dragonContent');
          if (ca) {
            if (self._reviewState.current >= self._reviewState.words.length) {
              ca.innerHTML = self._renderReviewSummary();
              self._bindReviewSummary();
            } else { ca.innerHTML = self._renderReviewQuestion(); self._bindReviewAll(); }
          }
        }, 500);
      });
    });

    var nextBtn = document.getElementById('dragonReviewNext');
    if (nextBtn) nextBtn.addEventListener('click', function () { self.state.currentMicroPhase++; self._saveProgress(); self.render(); });
  },

  _bindReviewSummary: function () {
    var self = this;
    var nextBtn = document.getElementById('dragonReviewNext');
    if (nextBtn) nextBtn.addEventListener('click', function () { self.state.currentMicroPhase++; self._saveProgress(); self.render(); });
  },

  _bindMistakeAll: function () {
    var self = this;
    var container = document.getElementById('dragonContent');
    if (!container || !self._mistakeState) return;

    container.querySelectorAll('.dragon-practice-opt').forEach(function (opt) {
      opt.addEventListener('click', function () {
        if (this.classList.contains('answered')) return;
        this.classList.add('answered');
        var correct = this.dataset.correct === '1';
        if (correct) { this.classList.add('dragon-opt-correct'); self._mistakeState.fixedCount++; }
        else {
          this.classList.add('dragon-opt-wrong');
          var c = container.querySelector('.dragon-practice-opt[data-correct="1"]');
          if (c) c.classList.add('dragon-opt-correct');
        }
        if (typeof AdaptiveEngine !== 'undefined') {
          try { AdaptiveEngine.recordInteraction(this.dataset.kg, correct, correct ? 3 : 1, 0); } catch (e) { }
        }
        setTimeout(function () {
          self._mistakeState.current++;
          var ca = document.getElementById('dragonContent');
          if (ca) {
            if (self._mistakeState.current >= self._mistakeState.mistakes.length) {
              ca.innerHTML = self._renderMistakeSummary();
              self._bindMistakeSummary();
            } else { ca.innerHTML = self._renderMistakeQuestion(); self._bindMistakeAll(); }
          }
        }, 700);
      });
    });

    container.querySelectorAll('.dragon-mistake-submit').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var userAnswer = (document.getElementById('dragonMistakeInput') || {}).value || '';
        var correctAns = this.dataset.answer;
        var correct = userAnswer.trim().toLowerCase() === correctAns.trim().toLowerCase();
        var fb = document.getElementById('dragonMistakeFeedback');
        if (correct) { if (fb) fb.innerHTML = '<span style="color:#10b981;">✅ 正确！</span>'; self._mistakeState.fixedCount++; }
        else { if (fb) fb.innerHTML = '<span style="color:#ef4444;">❌ 正确答案：<strong>' + correctAns + '</strong></span>'; }
        this.disabled = true;
        if (typeof AdaptiveEngine !== 'undefined') {
          try { AdaptiveEngine.recordInteraction(this.dataset.kg, correct, correct ? 3 : 1, 0); } catch (e) { }
        }
        setTimeout(function () {
          self._mistakeState.current++;
          var ca = document.getElementById('dragonContent');
          if (ca) {
            if (self._mistakeState.current >= self._mistakeState.mistakes.length) {
              ca.innerHTML = self._renderMistakeSummary();
              self._bindMistakeSummary();
            } else { ca.innerHTML = self._renderMistakeQuestion(); self._bindMistakeAll(); }
          }
        }, 700);
      });
    });

    var nextBtn = document.getElementById('dragonMistakeNext');
    if (nextBtn) nextBtn.addEventListener('click', function () { self.state.currentMicroPhase++; self._saveProgress(); self.render(); });
  },

  _bindMistakeSummary: function () {
    var self = this;
    var nextBtn = document.getElementById('dragonMistakeNext');
    if (nextBtn) nextBtn.addEventListener('click', function () { self.state.currentMicroPhase++; self._saveProgress(); self.render(); });
  },

  _bindReadingAll: function () {
    var self = this;
    var container = document.getElementById('dragonContent');
    if (!container || !self._readingState) return;

    container.querySelectorAll('.dragon-practice-opt').forEach(function (opt) {
      opt.addEventListener('click', function () {
        if (this.classList.contains('answered')) return;
        this.classList.add('answered');
        var correct = this.dataset.correct === '1';
        if (correct) { this.classList.add('dragon-opt-correct'); self._readingState.correct++; }
        else {
          this.classList.add('dragon-opt-wrong');
          var c = container.querySelector('.dragon-practice-opt[data-correct="1"]');
          if (c) c.classList.add('dragon-opt-correct');
        }
        if (typeof AdaptiveEngine !== 'undefined') {
          try { AdaptiveEngine.recordInteraction(this.dataset.kg, correct, correct ? 3 : 1, 0); } catch (e) { }
        }
        self._saveProgress();
        setTimeout(function () {
          self._readingState.current++;
          var ca = document.getElementById('dragonContent');
          if (ca) {
            if (self._readingState.current >= self._readingState.questions.length) {
              if (!self.state.unitPhasesDone[self.state.currentUnit]) self.state.unitPhasesDone[self.state.currentUnit] = [];
              if (self.state.unitPhasesDone[self.state.currentUnit].indexOf('reading') < 0) {
                self.state.unitPhasesDone[self.state.currentUnit].push('reading');
              }
              self._saveProgress();
              ca.innerHTML = '<div class="dragon-phase-complete"><div class="dragon-complete-icon">✅</div><h4>阅读理解完成</h4><p>' + self._readingState.correct + '/' + self._readingState.questions.length + ' 正确</p><button class="btn btn-primary btn-lg mt-3" id="dragonReadingNext">继续下一阶段 ➡</button></div>';
              setTimeout(function () {
                var rn = document.getElementById('dragonReadingNext');
                if (rn) rn.addEventListener('click', function () { self.state.currentMicroPhase++; self._saveProgress(); self.render(); });
              }, 50);
            } else { ca.innerHTML = self._renderReadingPassage(); self._bindReadingAll(); }
          }
        }, 500);
      });
    });
  },

  _bindDiagAll: function () {
    var self = this;
    var container = document.getElementById('dragonContent');
    if (!container || !self._diagState) return;

    container.querySelectorAll('.dragon-diag-opt').forEach(function (opt) {
      opt.addEventListener('click', function () {
        if (this.classList.contains('answered')) return;
        this.classList.add('answered');
        var correct = this.dataset.correct === '1';
        var dtype = this.dataset.type || 'vocab';
        if (correct) { this.classList.add('dragon-opt-correct'); self._diagState.correct++; }
        else {
          this.classList.add('dragon-opt-wrong');
          var c = container.querySelector('.dragon-diag-opt[data-correct="1"]');
          if (c) c.classList.add('dragon-opt-correct');
        }
        if (self._diagState.results[dtype]) {
          self._diagState.results[dtype].c += correct ? 1 : 0;
          self._diagState.results[dtype].t += 1;
        }
        if (typeof AdaptiveEngine !== 'undefined') {
          try { AdaptiveEngine.recordInteraction(this.dataset.kg, correct, correct ? 3 : 1, 0); } catch (e) { }
        }
        if (typeof QualityMonitor !== 'undefined') {
          try { QualityMonitor.recordAnswer ? QualityMonitor.recordAnswer({ kgPoint: this.dataset.kg, correct: correct, type: dtype }) : null; } catch (e) { }
        }
        if (typeof EncouragementSystem !== 'undefined') {
          try {
            var enc = EncouragementSystem.getEncouragement ? EncouragementSystem.getEncouragement(correct) : null;
            if (enc) { var fbEl = document.getElementById('dragonDiagFeedback'); if (fbEl) fbEl.innerHTML = '<div style="color:' + (correct ? '#10b981' : '#f59e0b') + ';font-size:0.85rem;margin-top:4px;">' + enc + '</div>'; }
          } catch (e) { }
        }
        setTimeout(function () {
          self._diagState.current++;
          var ca = document.getElementById('dragonContent');
          if (ca) {
            if (self._diagState.current >= self._diagState.questions.length) {
              ca.innerHTML = self._renderUnitDiagnosticResult();
              self._bindDiagResult();
            } else { ca.innerHTML = self._renderUnitDiagnosticQuestion(); self._bindDiagAll(); }
          }
        }, 600);
      });
    });
  },

  _bindDiagResult: function () {
    var self = this;
    var passNext = document.getElementById('dragonDiagPassNext');
    var failFix = document.getElementById('dragonDiagFailFix');
    var skip = document.getElementById('dragonDiagSkip');

    if (passNext) passNext.addEventListener('click', function () {
      self.state.currentUnit = Math.min(6, self.state.currentUnit + 1);
      self.state.currentMicroPhase = 0;
      self._saveProgress(); self.render();
    });
    if (failFix) failFix.addEventListener('click', function () {
      self.state.currentMicroPhase = self.MICRO_PHASES.findIndex(function (mp) { return mp.id === 'gap-fill'; });
      self._saveProgress(); self.render();
    });
    if (skip) skip.addEventListener('click', function () {
      self.state.currentUnit = Math.min(6, self.state.currentUnit + 1);
      self.state.currentMicroPhase = 0;
      self._saveProgress(); self.render();
    });
  },

  _bindGapAll: function () {
    var self = this;
    var container = document.getElementById('dragonContent');
    if (!container || !self._gapState) return;

    // Word gap fill
    container.querySelectorAll('.dragon-gap-submit').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var correctWord = this.dataset.word.toLowerCase();
        var userWord = (document.getElementById('dragonGapInput') || {}).value || '';
        userWord = userWord.trim().toLowerCase();
        var correct = userWord === correctWord || (userWord.length >= 3 && correctWord.indexOf(userWord) === 0);
        var fb = document.getElementById('dragonGapFeedback');
        if (correct) { if (fb) fb.innerHTML = '<span style="color:#10b981;">✅ 正确！</span>'; self._gapState.wordCorrect++; }
        else { if (fb) fb.innerHTML = '<span style="color:#ef4444;">❌ 正确答案：<strong>' + correctWord + '</strong></span>'; }
        this.disabled = true;
        if (document.getElementById('dragonGapInput')) document.getElementById('dragonGapInput').disabled = true;
        if (typeof AdaptiveEngine !== 'undefined') {
          try { AdaptiveEngine.recordInteraction(this.dataset.kg, correct, correct ? 3 : 1, 0); } catch (e) { }
        }
        setTimeout(function () {
          self._gapState.currentWord++;
          self._gapState.wordDim = self._gapState.wordDim === 0 ? 1 : 0;
          var ca = document.getElementById('dragonContent');
          if (ca) { ca.innerHTML = self._renderGapFillQuestion(); self._bindGapAll(); }
        }, 800);
      });
    });

    // Grammar gap fill
    container.querySelectorAll('.dragon-gap-gram-opt').forEach(function (opt) {
      opt.addEventListener('click', function () {
        if (this.classList.contains('answered')) return;
        this.classList.add('answered');
        var correct = this.dataset.correct === '1';
        if (correct) { this.classList.add('dragon-opt-correct'); self._gapState.grammarCorrect++; }
        else {
          this.classList.add('dragon-opt-wrong');
          var c = container.querySelector('.dragon-gap-gram-opt[data-correct="1"]');
          if (c) c.classList.add('dragon-opt-correct');
        }
        if (typeof AdaptiveEngine !== 'undefined') {
          try { AdaptiveEngine.recordInteraction(this.dataset.kg, correct, correct ? 3 : 1, 0); } catch (e) { }
        }
        setTimeout(function () {
          self._gapState.currentGrammar++;
          var ca = document.getElementById('dragonContent');
          if (ca) { ca.innerHTML = self._renderGapFillQuestion(); self._bindGapAll(); }
        }, 600);
      });
    });

    var skipGap = document.getElementById('dragonGapSkip');
    if (skipGap) skipGap.addEventListener('click', function () {
      self.state.currentUnit = Math.min(6, self.state.currentUnit + 1);
      self.state.currentMicroPhase = 0;
      self._saveProgress(); self.render();
    });
    var gapRediag = document.getElementById('dragonGapRediag');
    if (gapRediag) gapRediag.addEventListener('click', function () {
      var diagIdx = self.MICRO_PHASES.findIndex(function (mp) { return mp.id === 'unit-diagnostic'; });
      if (diagIdx >= 0) self.state.currentMicroPhase = diagIdx;
      self._saveProgress(); self.render();
    });
    var gapSkipDiag = document.getElementById('dragonGapSkipDiag');
    if (gapSkipDiag) gapSkipDiag.addEventListener('click', function () {
      self.state.currentUnit = Math.min(6, self.state.currentUnit + 1);
      self.state.currentMicroPhase = 0;
      self._saveProgress(); self.render();
    });

    // Input enter
    var gapInput = document.getElementById('dragonGapInput');
    if (gapInput) {
      gapInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          var submit = container.querySelector('.dragon-gap-submit');
          if (submit && !submit.disabled) submit.click();
        }
      });
    }
  },

  _bindMockAll: function () {
    var self = this;
    var container = document.getElementById('dragonMockContainer');
    if (!container || !self._mockState) return;

    self._mockTimer = setInterval(function () {
      if (!self._mockState || self._mockState.submitted) { clearInterval(self._mockTimer); return; }
      var elapsed = Math.floor((Date.now() - self._mockState.startTime) / 1000);
      var remain = Math.max(0, self._mockState.totalTime - elapsed);
      var min = Math.floor(remain / 60);
      var sec = remain % 60;
      var timer = document.getElementById('dragonMockTimer');
      if (timer) {
        timer.textContent = '⏱ ' + min + ':' + (sec < 10 ? '0' : '') + sec;
        if (remain < 300) timer.style.color = '#ef4444';
      }
      if (remain <= 0 && !self._mockState.submitted) self._submitMock();
    }, 1000);
  },

  _submitMock: function () {
    var self = this;
    var ms = self._mockState;
    ms.submitted = true;
    if (self._mockTimer) clearInterval(self._mockTimer);

    var container = document.getElementById('dragonMockContainer');
    if (container) { container.innerHTML = self._renderMockReport(); self._bindMockReport(); }
  },

  _bindMockReport: function () {
    var self = this;
    var doneBtn = document.getElementById('dragonMockDone');
    if (doneBtn) doneBtn.addEventListener('click', function () { self.render(); });
  },

  _startGlobalDiagnostic: function () {
    var container = document.getElementById('dragonContent');
    if (!container) return;
    container.innerHTML = this._renderGlobalDiagnostic() || '';
    var self = this;
    setTimeout(function () {
      self._bindGlobalDiagAll();
      if (self._globalDiagState) {
        var qDiv = container.querySelector('.dragon-practice-card');
        if (qDiv) { /* already rendered */ }
      }
    }, 100);
  },

  _bindGlobalDiagAll: function () {
    var self = this;
    var container = document.getElementById('dragonContent');
    if (!container) return;

    container.querySelectorAll('.dragon-gdiag-opt').forEach(function (opt) {
      opt.addEventListener('click', function () {
        if (this.classList.contains('answered')) return;
        this.classList.add('answered');
        var correct = this.dataset.correct === '1';
        if (correct) { this.classList.add('dragon-opt-correct'); }
        else {
          this.classList.add('dragon-opt-wrong');
          var c = container.querySelector('.dragon-gdiag-opt[data-correct="1"]');
          if (c) c.classList.add('dragon-opt-correct');
        }
        if (typeof AdaptiveEngine !== 'undefined') {
          try { AdaptiveEngine.recordInteraction(this.dataset.kg, correct, correct ? 3 : 1, 0); } catch (e) { }
        }
        var stage = this.dataset.stage || 'vocab';
        if (stage === 'vocab') self._globalDiagState.correctVocab += correct ? 1 : 0;
        else if (stage === 'grammar') { self._globalDiagState.correctGram += correct ? 1 : 0; self._globalDiagState.totalGram++; }
        else if (stage === 'reading') { self._globalDiagState.correctRead += correct ? 1 : 0; self._globalDiagState.totalRead++; }

        setTimeout(function () {
          self._globalDiagState.current++;
          var ca = document.getElementById('dragonContent');
          if (ca) {
            ca.innerHTML = self._renderGlobalDiagQuestion();
            self._bindGlobalDiagAll();
            setTimeout(function () {
              if (self._globalDiagState && self._globalDiagState.stage === 'report') {
                setTimeout(function () { self._drawRadarChart(); }, 200);
              }
            }, 100);
          }
        }, 600);
      });
    });

    var gdiagOk = document.getElementById('dragonGlobalDiagOk');
    if (gdiagOk) gdiagOk.addEventListener('click', function () { self.render(); });
  },

  _startMockExam: function () {
    var container = document.getElementById('dragonContent');
    if (!container) return;
    container.innerHTML = this._renderMockExam() || '';
    var self = this;
    setTimeout(function () {
      self._renderMockQuestionInner();
      self._bindMockQAll();
      self._bindMockAll();
    }, 100);
  },

  _renderMockQuestionInner: function () {
    var qDiv = document.getElementById('dragonMockQuestion');
    if (qDiv && this._mockState) { qDiv.innerHTML = this._renderMockQuestion(); }
  },

  _bindMockQAll: function () {
    var self = this;
    var container = document.getElementById('dragonMockContainer');
    if (!container || !self._mockState) return;

    container.querySelectorAll('.dragon-mock-opt').forEach(function (opt) {
      opt.addEventListener('click', function () {
        if (this.classList.contains('answered')) return;
        this.classList.add('answered');
        var idx = parseInt(this.dataset.idx);
        var correct = this.dataset.correct === '1';
        if (correct) { this.classList.add('dragon-opt-correct'); self._mockState.correct++; }
        else { this.classList.add('dragon-opt-wrong'); var c = container.querySelectorAll('.dragon-mock-opt[data-correct="1"]'); c.forEach(function (el) { el.classList.add('dragon-opt-correct'); }); }

        var cardNum = document.getElementById('cardNum' + idx);
        if (cardNum) { cardNum.style.background = correct ? '#d1fae5' : '#fee2e2'; cardNum.style.color = correct ? '#065f46' : '#991b1b'; }

        if (typeof AdaptiveEngine !== 'undefined') {
          try { AdaptiveEngine.recordInteraction(this.dataset.kg, correct, correct ? 3 : 1, 0); } catch (e) { }
        }

        setTimeout(function () {
          self._mockState.current++;
          if (self._mockState.current >= self._mockState.questions.length) {
            self._submitMock();
          } else {
            self._renderMockQuestionInner();
            self._bindMockQAll();
          }
        }, 500);
      });
    });

    var submitBtn = document.getElementById('dragonMockSubmit');
    if (submitBtn) submitBtn.addEventListener('click', function () { if (confirm('确定要交卷吗？')) self._submitMock(); });
  },

  // ===== Animation =====
  _animateIn: function () {
    var container = document.getElementById('dragonContainer');
    if (container) { container.style.opacity = '0'; container.style.transition = 'opacity 0.3s'; setTimeout(function () { container.style.opacity = '1'; }, 50); }
  },

  // ===== Audio =====
  _speak: function (text) {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US'; u.rate = 0.8; u.pitch = 1;
      speechSynthesis.speak(u);
    }
  },

  _shuffle: function (arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  },

  // ===== Task 4: 主动回忆 =====
  _renderActiveRecallPhase: function () {
    var unitWords = this._getUnitWords(this.state.currentUnit);
    var learnedIds = this.state.masteredWordIds || [];
    var words = unitWords.filter(function (w) { return learnedIds.indexOf(w.id) >= 0; });
    if (words.length === 0) words = unitWords.slice(0, 10);

    this._recallState = {
      unit: this.state.currentUnit,
      words: this._shuffle(words.slice(0, 15)),
      currentIdx: 0,
      correct: 0,
      total: 0,
      wrongWords: [],
      startTime: Date.now(),
      currentMode: 'mc'
    };

    return '<div id="dragonRecallContainer" class="dragon-vocab-container">' +
      this._renderActiveRecallQuestion() + '</div>';
  },

  _renderActiveRecallQuestion: function () {
    var rs = this._recallState;
    if (!rs || rs.currentIdx >= rs.words.length) return this._renderActiveRecallSummary();

    var word = rs.words[rs.currentIdx];
    var bktProb = this._getWordBktProb(word);

    if (bktProb < 0.4) rs.currentMode = 'mc';
    else if (bktProb < 0.75) rs.currentMode = 'text';
    else rs.currentMode = 'dictation';

    var allWords = typeof Grade7Data !== 'undefined' ? Grade7Data.getAllWords() : [word];
    var html = '<div class="dragon-vocab-card">';
    html += '<div class="dragon-vocab-header">';
    html += '<span class="dragon-vocab-progress">🧠 主动回忆 ' + (rs.currentIdx + 1) + '/' + rs.words.length + '</span>';
    html += '<span style="color:#8b5cf6;">模式: ' + (rs.currentMode === 'mc' ? '选择' : rs.currentMode === 'text' ? '拼写' : '听写') + '</span>';
    html += '</div>';
    html += '<div class="progress-bar mb-3"><div class="progress-fill" style="width:' + Math.round(rs.currentIdx / rs.words.length * 100) + '%"></div></div>';

    if (typeof ActiveRecall !== 'undefined') {
      html += ActiveRecall.renderRecallUI(rs.currentMode, word, allWords);
    } else {
      html += '<p>主动回忆模块未加载</p>';
    }
    html += '</div>';
    return html;
  },

  _bindActiveRecallAll: function () {
    var self = this;
    var container = document.getElementById('dragonRecallContainer');
    if (!container || !self._recallState) return;

    container.querySelectorAll('.dragon-vocab-opt').forEach(function (opt) {
      opt.addEventListener('click', function () {
        if (this.classList.contains('answered')) return;
        this.classList.add('answered');
        var correct = this.dataset.correct === '1';
        if (correct) this.classList.add('dragon-opt-correct');
        else {
          this.classList.add('dragon-opt-wrong');
          var c = container.querySelector('.dragon-vocab-opt[data-correct="1"]');
          if (c) c.classList.add('dragon-opt-correct');
        }
        self._handleRecallResult(correct);
        setTimeout(function () { self._advanceRecall(); }, correct ? 400 : 1000);
      });
    });

    container.querySelectorAll('.dragon-vocab-submit').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (this.disabled) return;
        this.disabled = true;
        var correctWord = this.dataset.word ? this.dataset.word.toLowerCase() : '';
        var userInput = (document.getElementById('dragonVocabInput') || {}).value || '';
        userInput = userInput.trim().toLowerCase();
        var correct = (userInput === correctWord);
        var fb = document.getElementById('dragonVocabFeedback');
        if (correct) { if (fb) fb.innerHTML = '<span style="color:#10b981;">✅ 正确！</span>'; }
        else { if (fb) fb.innerHTML = '<span style="color:#ef4444;">❌ 正确答案：<strong>' + correctWord + '</strong></span>'; }
        self._handleRecallResult(correct);
        setTimeout(function () { self._advanceRecall(); }, correct ? 500 : 1000);
      });
    });

    var input = document.getElementById('dragonVocabInput');
    if (input) {
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          var submit = container.querySelector('.dragon-vocab-submit');
          if (submit && !submit.disabled) submit.click();
        }
      });
    }
  },

  _handleRecallResult: function (isCorrect) {
    var rs = this._recallState;
    rs.total++;
    var word = rs.words[rs.currentIdx];
    if (isCorrect) rs.correct++;
    else rs.wrongWords.push(word);

    if (typeof ActiveRecall !== 'undefined') {
      try { ActiveRecall.handleRecallResult(isCorrect, word, rs.currentMode); } catch (e) { }
    }
    if (typeof AudioSystem !== 'undefined') {
      try {
        if (isCorrect) { AudioSystem.playCorrect ? AudioSystem.playCorrect() : null; }
        else { AudioSystem.playIncorrect ? AudioSystem.playIncorrect() : null; }
      } catch (e) { }
    }
  },

  _advanceRecall: function () {
    var rs = this._recallState;
    rs.currentIdx++;
    var container = document.getElementById('dragonRecallContainer');
    if (!container) return;

    if (rs.currentIdx >= rs.words.length) {
      container.innerHTML = this._renderActiveRecallSummary();
      this._bindRecallSummary();
      return;
    }
    container.innerHTML = this._renderActiveRecallQuestion();
    this._bindActiveRecallAll();
  },

  _renderActiveRecallSummary: function () {
    var rs = this._recallState;
    var elapsed = Math.round((Date.now() - rs.startTime) / 1000);
    var pct = rs.total > 0 ? Math.round(rs.correct / rs.total * 100) : 0;

    if (!this.state.unitPhasesDone[this.state.currentUnit]) this.state.unitPhasesDone[this.state.currentUnit] = [];
    if (this.state.unitPhasesDone[this.state.currentUnit].indexOf('active-recall') < 0) {
      this.state.unitPhasesDone[this.state.currentUnit].push('active-recall');
    }
    if (!this.state.unitScores[this.state.currentUnit]) this.state.unitScores[this.state.currentUnit] = {};
    this.state.unitScores[this.state.currentUnit]['active-recall'] = pct;
    this._saveProgress();

    return '<div class="dragon-phase-complete">' +
      '<div class="dragon-complete-icon">🧠</div>' +
      '<h4>主动回忆完成！</h4>' +
      '<div class="dragon-complete-stats">' +
      '<div class="dragon-stat"><span class="dragon-stat-val">' + pct + '%</span><span class="dragon-stat-lbl">正确率</span></div>' +
      '<div class="dragon-stat"><span class="dragon-stat-val">' + rs.correct + '/' + rs.total + '</span><span class="dragon-stat-lbl">答对/总题</span></div>' +
      '<div class="dragon-stat"><span class="dragon-stat-val">' + elapsed + 's</span><span class="dragon-stat-lbl">耗时</span></div>' +
      '</div>' +
      (rs.wrongWords.length > 0 ? '<p class="text-warning mt-2">⚠ ' + rs.wrongWords.length + '词需要加强复习</p>' : '') +
      '<button class="btn btn-primary btn-lg mt-3 dragon-recall-next">继续下一阶段 ➡</button>' +
      '</div>';
  },

  _bindRecallSummary: function () {
    var self = this;
    var btn = document.querySelector('.dragon-recall-next');
    if (btn) btn.addEventListener('click', function () {
      self.state.currentMicroPhase++;
      self._saveProgress();
      self.render();
    });
  },

  // ===== Task 6: 发音训练 =====
  _renderPronunciationPhase: function () {
    var unitWords = this._getUnitWords(this.state.currentUnit);
    var learnedIds = this.state.masteredWordIds || [];
    var words = unitWords.filter(function (w) { return learnedIds.indexOf(w.id) >= 0; });
    if (words.length === 0) words = unitWords.slice(0, 5);

    this._pronState = {
      unit: this.state.currentUnit,
      words: this._shuffle(words).slice(0, 8),
      currentIdx: 0,
      scores: [],
      startTime: Date.now()
    };

    return '<div id="dragonPronContainer" class="dragon-vocab-container">' +
      this._renderPronunciationQuestion() + '</div>';
  },

  _renderPronunciationQuestion: function () {
    var ps = this._pronState;
    if (!ps || ps.currentIdx >= ps.words.length) return this._renderPronunciationSummary();

    var word = ps.words[ps.currentIdx];
    var html = '<div class="dragon-vocab-card">';
    html += '<div class="dragon-vocab-header">';
    html += '<span class="dragon-vocab-progress">🎤 发音训练 ' + (ps.currentIdx + 1) + '/' + ps.words.length + '</span>';
    html += '</div>';
    html += '<div class="progress-bar mb-3"><div class="progress-fill" style="width:' + Math.round(ps.currentIdx / ps.words.length * 100) + '%"></div></div>';

    if (typeof PronunciationTrainer !== 'undefined') {
      html += PronunciationTrainer.renderPronunciationUI(word);
    } else {
      html += '<p>发音训练模块未加载</p>';
    }
    html += '<button class="btn btn-primary btn-lg w-100 mt-3 dragon-pron-next">下一个 ➡</button>';
    html += '</div>';
    return html;
  },

  _bindPronunciationAll: function () {
    var self = this;
    var container = document.getElementById('dragonPronContainer');
    if (!container) return;

    container.querySelectorAll('.dragon-pron-play').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var word = self._pronState.words[self._pronState.currentIdx];
        if (typeof PronunciationTrainer !== 'undefined') PronunciationTrainer.speakWord(word);
      });
    });

    container.querySelectorAll('.dragon-pron-record').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var word = self._pronState.words[self._pronState.currentIdx];
        if (typeof PronunciationTrainer !== 'undefined') {
          if (btn.textContent.indexOf('停止') >= 0) {
            var result = PronunciationTrainer.stopRecordingAndCheck(word.w);
            self._pronState.scores.push(result.stars);
            btn.textContent = '🎤 跟读';
            var scoreEl = document.getElementById('dragonPronScore');
            if (scoreEl) scoreEl.innerHTML = '评分：' + '⭐'.repeat(result.stars);
          } else {
            var ok = PronunciationTrainer.startRecording();
            if (ok) btn.textContent = '⏹ 停止';
          }
        }
      });
    });

    container.querySelectorAll('.dragon-pron-next').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var word = self._pronState.words[self._pronState.currentIdx];
        var scoreEl = document.getElementById('dragonPronScore');
        var currentScore = self._pronState.scores[self._pronState.currentIdx];
        if (currentScore === undefined && scoreEl && scoreEl.textContent.indexOf('评分') >= 0) {
          currentScore = 1;
          self._pronState.scores.push(currentScore);
        }
        self._pronState.currentIdx++;
        container.innerHTML = self._renderPronunciationQuestion();
        self._bindPronunciationAll();
      });
    });
  },

  _renderPronunciationSummary: function () {
    var ps = this._pronState;
    var elapsed = Math.round((Date.now() - ps.startTime) / 1000);
    var total = ps.scores.length;
    var sum = 0;
    for (var i = 0; i < ps.scores.length; i++) sum += ps.scores[i];
    var avg = total > 0 ? (sum / total).toFixed(1) : '0';

    if (!this.state.unitPhasesDone[this.state.currentUnit]) this.state.unitPhasesDone[this.state.currentUnit] = [];
    if (this.state.unitPhasesDone[this.state.currentUnit].indexOf('pronunciation') < 0) {
      this.state.unitPhasesDone[this.state.currentUnit].push('pronunciation');
    }
    this._saveProgress();

    return '<div class="dragon-phase-complete">' +
      '<div class="dragon-complete-icon">🎤</div>' +
      '<h4>发音训练完成！</h4>' +
      '<div class="dragon-complete-stats">' +
      '<div class="dragon-stat"><span class="dragon-stat-val">' + avg + ' ⭐</span><span class="dragon-stat-lbl">平均评分</span></div>' +
      '<div class="dragon-stat"><span class="dragon-stat-val">' + total + '</span><span class="dragon-stat-lbl">练习词数</span></div>' +
      '<div class="dragon-stat"><span class="dragon-stat-val">' + elapsed + 's</span><span class="dragon-stat-lbl">耗时</span></div>' +
      '</div>' +
      '<button class="btn btn-primary btn-lg mt-3 dragon-pron-finish">继续下一阶段 ➡</button>' +
      '</div>';
  },

  _bindPronunciationSummary: function () {
    var self = this;
    var btn = document.querySelector('.dragon-pron-finish');
    if (btn) btn.addEventListener('click', function () {
      self.state.currentMicroPhase++;
      self._saveProgress();
      self.render();
    });
  },

  // ===== Task 7: 词汇预习 =====
  _renderPreviewPhase: function () {
    var unitWords = this._getUnitWords(this.state.currentUnit);
    this._previewState = {
      unit: this.state.currentUnit,
      words: unitWords,
      mode: 'browse',
      currentIdx: 0,
      startTime: Date.now()
    };
    return this._renderPreviewPage();
  },

  _renderModuleFooter: function (phaseId) {
    var f = '<div style="margin-top:16px;border-top:2px dashed #e5e7eb;padding-top:12px;">' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;font-size:0.75rem;">';
    var tags = [];
    if (phaseId === 'preview') {
      if (typeof PreviewEngine !== 'undefined') { tags.push('🟢 PreviewEngine'); this._ensureModule('PreviewEngine'); }
      if (typeof MemorySelfAssessment !== 'undefined') { tags.push('🟢 MemorySelfAssessment'); this._ensureModule('MemorySelfAssessment'); }
      if (typeof DifficultyEngine !== 'undefined') { tags.push('🟢 DifficultyEngine'); this._ensureModule('DifficultyEngine'); }
    } else if (phaseId === 'new-lesson') {
      if (typeof LearningFlowController !== 'undefined') { tags.push('🟢 LearningFlowController'); this._ensureModule('LearningFlowController'); }
      if (typeof ProgressiveHints !== 'undefined') { tags.push('🟢 ProgressiveHints'); this._ensureModule('ProgressiveHints'); }
      if (typeof AudioSystem !== 'undefined') { tags.push('🟢 AudioSystem'); this._ensureModule('AudioSystem'); }
      if (typeof FeedbackButtons !== 'undefined') { tags.push('🟢 FeedbackButtons'); this._ensureModule('FeedbackButtons'); }
      if (typeof DifficultyEngine !== 'undefined') { tags.push('🟢 DifficultyEngine'); this._ensureModule('DifficultyEngine'); }
    } else if (phaseId === 'active-recall') {
      if (typeof ActiveRecall !== 'undefined') { tags.push('🟢 ActiveRecall'); this._ensureModule('ActiveRecall'); }
      if (typeof DifficultyEngine !== 'undefined') { tags.push('🟢 DifficultyEngine'); this._ensureModule('DifficultyEngine'); }
      if (typeof ProgressiveHints !== 'undefined') { tags.push('🟢 ProgressiveHints'); this._ensureModule('ProgressiveHints'); }
    } else if (phaseId === 'practice') {
      if (typeof DifficultyEngine !== 'undefined') { tags.push('🟢 DifficultyEngine'); this._ensureModule('DifficultyEngine'); }
      if (typeof FeedbackButtons !== 'undefined') { tags.push('🟢 FeedbackButtons'); this._ensureModule('FeedbackButtons'); }
      if (typeof SpacedRepetition !== 'undefined') { tags.push('🟢 SpacedRepetition'); this._ensureModule('SpacedRepetition'); }
    } else if (phaseId === 'pronunciation') {
      if (typeof PronunciationTrainer !== 'undefined') { tags.push('🟢 PronunciationTrainer'); this._ensureModule('PronunciationTrainer'); }
      if (typeof AudioSystem !== 'undefined') { tags.push('🟢 AudioSystem'); this._ensureModule('AudioSystem'); }
    } else if (phaseId === 'mistake-fix') {
      if (typeof MistakeAnalysisSystem !== 'undefined') { tags.push('🟢 MistakeAnalysisSystem'); this._ensureModule('MistakeAnalysisSystem'); }
      if (typeof DictationMistakeSync !== 'undefined') { tags.push('🟢 DictationMistakeSync'); this._ensureModule('DictationMistakeSync'); }
      if (typeof FeynmanMethod !== 'undefined') { tags.push('🟢 FeynmanMethod'); this._ensureModule('FeynmanMethod'); }
    } else if (phaseId === 'unit-diagnostic') {
      if (typeof QualityMonitor !== 'undefined') { tags.push('🟢 QualityMonitor'); this._ensureModule('QualityMonitor'); }
      if (typeof EncouragementSystem !== 'undefined') { tags.push('🟢 EncouragementSystem'); this._ensureModule('EncouragementSystem'); }
      if (typeof MemoryTracker !== 'undefined') { tags.push('🟢 MemoryTracker'); this._ensureModule('MemoryTracker'); }
    } else if (phaseId === 'gap-fill') {
      if (typeof EbbinghausScheduler !== 'undefined') { tags.push('🟢 EbbinghausScheduler'); this._ensureModule('EbbinghausScheduler'); }
      if (typeof SpiralReview !== 'undefined') { tags.push('🟢 SpiralReview'); this._ensureModule('SpiralReview'); }
      if (typeof InterleavedPractice !== 'undefined') { tags.push('🟢 InterleavedPractice'); this._ensureModule('InterleavedPractice'); }
      if (typeof AssociationBuilder !== 'undefined') { tags.push('🟢 AssociationBuilder'); this._ensureModule('AssociationBuilder'); }
      if (typeof Enrichment !== 'undefined') { tags.push('🟢 Enrichment'); this._ensureModule('Enrichment'); }
      if (typeof SelfExplanation !== 'undefined') { tags.push('🟢 SelfExplanation'); this._ensureModule('SelfExplanation'); }
      if (typeof SpacedRepetition !== 'undefined') { tags.push('🟢 SpacedRepetition'); this._ensureModule('SpacedRepetition'); }
    }
    var active = 0, total = tags.length;
    for (var i = 0; i < tags.length; i++) { if (tags[i].indexOf('🟢') >= 0) active++; }
    if (tags.length === 0) tags.push('⚪ 无专用模块');
    f += '<span style="color:#6b7280;">🧩 ' + active + '/' + total + ' 模块就绪：</span>';
    f += tags.map(function (t) {
      return '<span style="background:' + (t.indexOf('🟢') >= 0 ? '#dcfce7' : '#fef2f2') +
        ';padding:2px 8px;border-radius:20px;color:' + (t.indexOf('🟢') >= 0 ? '#166534' : '#dc2626') + ';">' + t + '</span>';
    }).join('');
    f += '</div></div>';
    return f;
  },

  _ensureModule: function (name) {
    var fnMap = {
      PreviewEngine: function () { if (typeof PreviewEngine.ensureIndex === 'function') PreviewEngine.ensureIndex(); },
      MemorySelfAssessment: function () { return; },
      DifficultyEngine: function () { return; },
      ProgressiveHints: function () { return; },
      FeedbackButtons: function () { if (typeof FeedbackButtons.init === 'function') FeedbackButtons.init(); },
      AudioSystem: function () { if (typeof AudioSystem.ensure === 'function') AudioSystem.ensure(); },
      MistakeAnalysisSystem: function () { return; },
      DictationMistakeSync: function () { if (typeof DictationMistakeSync.init === 'function') DictationMistakeSync.init(); },
      FeynmanMethod: function () { return; },
      QualityMonitor: function () { return; },
      EncouragementSystem: function () { return; },
      MemoryTracker: function () { return; },
      EbbinghausScheduler: function () { return; },
      SpiralReview: function () { return; },
      InterleavedPractice: function () { return; },
      AssociationBuilder: function () { return; },
      Enrichment: function () { return; },
      SelfExplanation: function () { return; },
      PronunciationTrainer: function () { return; },
      ActiveRecall: function () { return; },
      LearningFlowController: function () { return; },
      SpacedRepetition: function () { return; }
    };
    if (fnMap[name]) { try { fnMap[name](); } catch (e) { } }
  },

  _renderPreviewPage: function () {
    var ps = this._previewState;
    var html = '';

    html += '<div class="dragon-vocab-card">';
    html += '<div class="dragon-vocab-header">';
    html += '<span class="dragon-vocab-phase">📖 Unit ' + ps.unit + ' 词汇预习</span>';
    html += '<div>';
    html += '<button class="btn btn-sm ' + (ps.mode === 'browse' ? 'btn-primary' : 'btn-outline') + ' dragon-preview-mode-btn" data-mode="browse">快速浏览</button> ';
    html += '<button class="btn btn-sm ' + (ps.mode === 'detail' ? 'btn-primary' : 'btn-outline') + ' dragon-preview-mode-btn" data-mode="detail">详细预习</button>';
    html += '</div>';
    html += '</div>';

    var total = ps.words.length;
    var current = ps.mode === 'browse' ? total : ps.currentIdx + 1;
    html += '<div class="progress-bar mb-3"><div class="progress-fill" style="width:' + (total > 0 ? Math.round(current / total * 100) : 0) + '%"></div></div>';

    if (ps.words.length === 0) {
      html += '<div class="text-center p-4">';
      html += '<p class="text-muted">本单元无词汇数据</p>';
      html += '</div>';
      html += '<div class="text-center mt-3">';
      html += '<button class="btn btn-primary btn-lg dragon-preview-start" id="dragonPreviewStart">开始学习</button>';
      html += '</div>';
      html += '</div>';
    } else if (ps.mode === 'browse') {
      html += '<div class="dragon-preview-grid">';
      var self = this;
      for (var i = 0; i < ps.words.length; i++) {
        html += self._renderPreviewWordCard(ps.words[i]);
      }
      html += '</div>';
      html += '<div class="text-center mt-3">';
      html += '<p class="text-muted" style="margin:0.5rem 0;font-size:0.9rem;">切换到"详细预习"模式后开始学习</p>';
      html += '</div>';
      html += '</div>';
    } else {
      var word = ps.words[ps.currentIdx];
      html += '<div class="dragon-preview-detail">';
      html += '<div class="dragon-preview-word-large">' + (word.w || '') + '</div>';
      html += '<div class="dragon-preview-phonetic-large">' + (word.p || '') + '</div>';
      html += '<div class="dragon-preview-meaning-large">' + (word.m || '') + '</div>';
      html += '<div class="dragon-preview-pos-large">' + (word.pos || '') + '</div>';
      if (word.ex && word.ex[0]) {
        html += '<div class="dragon-preview-example-large">"' + word.ex[0] + '"</div>';
      }
      html += '<div class="dragon-preview-nav-row mt-3">';
      html += '<button class="btn btn-outline btn-sm dragon-preview-nav" data-dir="prev"' + (ps.currentIdx === 0 ? ' disabled' : '') + '>◀ 上一个</button>';
      html += '<span class="text-muted" style="line-height:2;">' + (ps.currentIdx + 1) + ' / ' + ps.words.length + '</span>';
      html += '<button class="btn btn-outline btn-sm dragon-preview-nav" data-dir="next"' + (ps.currentIdx >= ps.words.length - 1 ? ' disabled' : '') + '>下一个 ▶</button>';
      html += '</div>';
      html += '</div>';
      html += '<div class="text-center mt-3">';
      html += '<button class="btn btn-primary btn-lg dragon-preview-start" id="dragonPreviewStart">开始学习</button>';
      html += '</div>';
      html += '</div>';
    }

    var history = {};
    try {
      history = JSON.parse(localStorage.getItem('preview_history') || '{}');
    } catch (e) { history = {}; }
    history[ps.unit] = new Date().toISOString();
    localStorage.setItem('preview_history', JSON.stringify(history));

    return html;
  },

  _bindPreviewAll: function () {
    var self = this;

    var modeBtns = document.querySelectorAll('.dragon-preview-mode-btn');
    for (var m = 0; m < modeBtns.length; m++) {
      modeBtns[m].addEventListener('click', function () {
        self._previewState.mode = this.dataset.mode;
        var content = document.getElementById('dragonContent');
        if (content) {
          content.innerHTML = self._renderPreviewPage();
          self._bindPreviewAll();
        }
      });
    }

    var startBtn = document.getElementById('dragonPreviewStart');
    if (startBtn) {
      startBtn.addEventListener('click', function () {
        var unitId = self.state.currentUnit;
        if (typeof LearningFlowController !== 'undefined' && unitId) {
          LearningFlowController.startFlow(unitId);
          return;
        }
        self.state.currentMicroPhase++;
        self._saveProgress();
        self.render();
      });
    }

    var navBtns = document.querySelectorAll('.dragon-preview-nav');
    for (var n = 0; n < navBtns.length; n++) {
      navBtns[n].addEventListener('click', function () {
        var dir = this.dataset.dir;
        if (dir === 'prev' && self._previewState.currentIdx > 0) {
          self._previewState.currentIdx--;
        } else if (dir === 'next' && self._previewState.currentIdx < self._previewState.words.length - 1) {
          self._previewState.currentIdx++;
        }
        var content = document.getElementById('dragonContent');
        if (content) {
          content.innerHTML = self._renderPreviewPage();
          self._bindPreviewAll();
        }
      });
    }
  },

  _renderPreviewWordCard: function (word) {
    var exampleSentence = (word.ex && word.ex[0]) ? word.ex[0] : '';
    return '<div class="dragon-preview-card">' +
      '<div class="dragon-preview-word">' + (word.w || '') + '</div>' +
      '<div class="dragon-preview-phonetic">' + (word.p || '') + '</div>' +
      '<div class="dragon-preview-meaning">' + (word.m || '') + '</div>' +
      '<div class="dragon-preview-pos">' + (word.pos || '') + '</div>' +
      '<div class="dragon-preview-example">' + (exampleSentence ? '"' + exampleSentence + '"' : '') + '</div>' +
      '</div>';
  },

  // ===== Task 13: Styles =====
  _ensureStyles: function () {
    if (document.getElementById('dragon-v2-styles')) return;
    var style = document.createElement('style');
    style.id = 'dragon-v2-styles';
    style.textContent =
      '.dragon-container{max-width:960px;margin:0 auto;}' +
      '.dragon-progress-panel{display:flex;gap:1rem;padding:0.8rem 1rem;background:linear-gradient(135deg,#1e1b4b,#312e81);border-radius:12px;margin-bottom:1rem;flex-wrap:wrap;color:#e0e7ff;}' +
      '.dragon-prog-item{flex:1;min-width:120px;text-align:center;}' +
      '.dragon-prog-label{display:block;font-size:0.75rem;color:#a5b4fc;}' +
      '.dragon-prog-value{display:block;font-size:1.1rem;font-weight:700;margin-top:2px;}' +
      '.dragon-weak-list{display:flex;gap:4px;flex-wrap:wrap;justify-content:center;}' +
      '.dragon-weak-tag{padding:1px 8px;border-radius:10px;font-size:0.7rem;font-weight:600;white-space:nowrap;}' +
      '.dragon-unit-row{display:flex;gap:0.5rem;margin-bottom:1rem;flex-wrap:wrap;}' +
      '.dragon-unit-card{flex:1;min-width:140px;padding:0.7rem;border-radius:10px;text-align:center;cursor:pointer;transition:all 0.2s;border:2px solid transparent;}' +
      '.dragon-unit-card:hover{transform:translateY(-2px);}' +
      '.dragon-unit-new{background:#f3f4f6;color:#6b7280;}' +
      '.dragon-unit-active{background:#eef2ff;border-color:#6366f1;color:#3730a3;}' +
      '.dragon-unit-ready{background:#ecfdf5;border-color:#10b981;color:#065f46;}' +
      '.dragon-unit-done{background:#f0fdf4;color:#166534;}' +
      '.dragon-unit-locked{background:#f9fafb;color:#d1d5db;cursor:not-allowed;opacity:0.5;}' +
      '.dragon-unit-num{font-weight:700;font-size:1rem;}' +
      '.dragon-unit-status{font-size:0.75rem;margin:2px 0;}' +
      '.dragon-unit-bar{height:4px;background:#e5e7eb;border-radius:2px;margin:4px 0;overflow:hidden;}' +
      '.dragon-unit-bar-fill{height:100%;background:#6366f1;border-radius:2px;transition:width 0.3s;}' +
      '.dragon-unit-pct{font-size:0.7rem;color:#6b7280;}' +
      '.dragon-micro-nav{display:flex;overflow-x:auto;gap:0.3rem;padding:0.5rem 0;margin-bottom:1rem;border-bottom:1px solid #e5e7eb;}' +
      '.dragon-micro-step{display:flex;align-items:center;gap:0.3rem;padding:0.4rem 0.7rem;border-radius:8px;white-space:nowrap;font-size:0.82rem;cursor:pointer;flex-shrink:0;transition:all 0.2s;border:1px solid transparent;}' +
      '.dragon-micro-step.active{background:#eef2ff;border-color:#6366f1;color:#3730a3;font-weight:600;}' +
      '.dragon-micro-step.done{background:#ecfdf5;border-color:#10b981;color:#065f46;}' +
      '.dragon-micro-step.pending{background:#f3f4f6;color:#9ca3af;}' +
      '.dragon-micro-icon{font-size:0.9rem;}' +
      '.dragon-micro-label{font-size:0.78rem;}' +
      '.dragon-mode-switch{display:flex;gap:0.5rem;margin-bottom:1rem;}' +
      '.dragon-mode-btn{padding:0.5rem 1.2rem;border-radius:8px;border:1px solid #d1d5db;background:#fff;cursor:pointer;transition:all 0.2s;font-weight:600;}' +
      '.dragon-mode-btn.active{background:#eef2ff;border-color:#6366f1;color:#3730a3;}' +
      '.dragon-mode-btn:hover{background:#f3f4f6;}' +
      '.dragon-content-area{min-height:300px;}' +
      '.dragon-global-actions{display:flex;gap:0.5rem;margin-top:1.5rem;justify-content:center;flex-wrap:wrap;}' +
      '.dragon-vocab-card{background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.06);padding:1.5rem;}' +
      '.dragon-vocab-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;font-size:0.85rem;}' +
      '.dragon-vocab-progress{color:#6b7280;}' +
      '.dragon-vocab-phase{font-weight:600;color:#6366f1;}' +
      '.dragon-vocab-mastered{color:#10b981;font-size:0.8rem;}' +
      '.dragon-dim-tip{text-align:center;color:#6b7280;font-size:0.85rem;margin-bottom:1rem;padding:0.5rem;background:#f9fafb;border-radius:8px;}' +
      '.dragon-word-display{font-size:2rem;font-weight:700;text-align:center;margin-bottom:0.5rem;color:#111827;}' +
      '.dragon-word-display-small{font-size:1.5rem;font-weight:700;text-align:center;margin-bottom:0.3rem;color:#111827;}' +
      '.dragon-word-phonetic{text-align:center;margin-bottom:1rem;font-size:0.85rem;}' +
      '.dragon-options-grid{display:grid;gap:0.5rem;}' +
      '.dragon-vocab-opt{padding:0.8rem;border-radius:8px;border:1px solid #d1d5db;background:#fff;cursor:pointer;text-align:left;transition:all 0.15s;font-size:0.95rem;width:100%;}' +
      '.dragon-vocab-opt:hover{border-color:#6366f1;transform:translateX(3px);}' +
      '.dragon-opt-correct{background:#d1fae5!important;border-color:#10b981!important;color:#065f46!important;}' +
      '.dragon-opt-wrong{background:#fee2e2!important;border-color:#ef4444!important;color:#991b1b!important;}' +
      '.dragon-input-row{display:flex;gap:0.5rem;align-items:center;}' +
      '.dragon-vocab-input{flex:1;padding:0.7rem 1rem;border:2px solid #d1d5db;border-radius:8px;font-size:1.1rem;outline:none;transition:border-color 0.2s;}' +
      '.dragon-vocab-input:focus{border-color:#6366f1;}' +
      '.dragon-vocab-feedback{margin-top:0.5rem;font-weight:600;text-align:center;}' +
      '.dragon-context-sentence{font-size:1.1rem;font-weight:600;text-align:center;margin-bottom:1rem;padding:1rem;background:#fef3c7;border-radius:8px;color:#92400e;}' +
      '.dragon-phase-complete{text-align:center;padding:2rem;}' +
      '.dragon-complete-icon{font-size:3rem;margin-bottom:0.5rem;}' +
      '.dragon-complete-stats{display:flex;gap:1.5rem;justify-content:center;margin:1.5rem 0;}' +
      '.dragon-stat{text-align:center;}' +
      '.dragon-stat-val{display:block;font-size:1.8rem;font-weight:700;color:#6366f1;}' +
      '.dragon-stat-lbl{display:block;font-size:0.8rem;color:#6b7280;}' +
      '.dragon-practice-card{background:#fff;border-radius:12px;padding:1.5rem;}' +
      '.dragon-practice-opt{display:block;width:100%;padding:0.7rem 1rem;margin-bottom:0.4rem;border:1px solid #d1d5db;border-radius:8px;background:#fff;cursor:pointer;text-align:left;transition:all 0.15s;font-size:0.9rem;}' +
      '.dragon-practice-opt:hover{border-color:#6366f1;transform:translateX(2px);}' +
      '.dragon-error-tag{display:inline-block;padding:2px 10px;border-radius:10px;font-size:0.75rem;font-weight:600;}' +
      '.dragon-reading-card{background:#fff;border-radius:12px;padding:1.5rem;}' +
      '.dragon-reading-title{margin-bottom:1rem;}' +
      '.dragon-reading-passage{line-height:1.8;font-size:0.95rem;margin-bottom:1rem;}' +
      '.dragon-semester-card{background:#fff;border-radius:12px;padding:1.5rem;text-align:center;min-width:180px;box-shadow:0 2px 8px rgba(0,0,0,0.06);}' +
      '.dragon-mock-container{background:#fff;border-radius:12px;padding:1.5rem;}' +
      '.dragon-mock-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;}' +
      '.dragon-mock-timer{font-weight:700;font-size:1.1rem;}' +
      '.dragon-mock-answer-card{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:1rem;}' +
      '.dragon-card-num{width:26px;height:26px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:#f3f4f6;font-size:0.7rem;font-weight:600;cursor:pointer;}' +
      '.dragon-diag-grid{display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;margin:1rem 0;}' +
      '.dragon-diag-item{text-align:center;padding:1rem;border-radius:8px;background:#f9fafb;min-width:80px;}' +
      '.dragon-diag-item span{display:block;font-size:0.8rem;color:#6b7280;}' +
      '.dragon-diag-item b{display:block;font-size:1.5rem;margin-top:4px;}' +
      '.big-score{font-size:5rem;font-weight:800;}' +
      '.dragon-preview-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:0.8rem;margin-bottom:1rem;}' +
      '.dragon-preview-card{background:#f9fafb;border-radius:10px;padding:1rem;border:1px solid #e5e7eb;transition:all 0.2s;}' +
      '.dragon-preview-card:hover{transform:translateY(-2px);box-shadow:0 4px 12px rgba(0,0,0,0.08);border-color:#6366f1;}' +
      '.dragon-preview-word{font-size:1.1rem;font-weight:700;color:#111827;}' +
      '.dragon-preview-phonetic{font-size:0.8rem;color:#6b7280;margin-bottom:2px;}' +
      '.dragon-preview-meaning{font-size:0.9rem;color:#374151;margin-bottom:2px;}' +
      '.dragon-preview-pos{font-size:0.75rem;color:#9ca3af;display:inline-block;padding:1px 6px;background:#e5e7eb;border-radius:4px;margin-bottom:4px;}' +
      '.dragon-preview-example{font-size:0.8rem;color:#6366f1;font-style:italic;margin-top:4px;}' +
      '.dragon-preview-detail{text-align:center;padding:1.5rem;background:#f9fafb;border-radius:12px;border:1px solid #e5e7eb;}' +
      '.dragon-preview-word-large{font-size:2.5rem;font-weight:700;color:#111827;margin-bottom:0.5rem;}' +
      '.dragon-preview-phonetic-large{font-size:1rem;color:#6b7280;margin-bottom:0.5rem;}' +
      '.dragon-preview-meaning-large{font-size:1.3rem;color:#374151;margin-bottom:0.3rem;font-weight:600;}' +
      '.dragon-preview-pos-large{font-size:0.85rem;color:#9ca3af;display:inline-block;padding:2px 10px;background:#e5e7eb;border-radius:6px;margin-bottom:0.8rem;}' +
      '.dragon-preview-example-large{font-size:1rem;color:#6366f1;font-style:italic;margin-top:0.5rem;padding:0.5rem;background:#eef2ff;border-radius:8px;}' +
      '.dragon-preview-nav-row{display:flex;justify-content:space-between;align-items:center;gap:0.5rem;}' +
      '@media(max-width:640px){' +
      '.dragon-progress-panel{flex-direction:column;gap:0.5rem;}' +
      '.dragon-unit-card{min-width:100px;}' +
      '.dragon-micro-nav{overflow-x:auto;}' +
      '.dragon-vocab-header{flex-wrap:wrap;}' +
      '.dragon-word-display{font-size:1.5rem;}' +
      '.big-score{font-size:3rem;}' +
      '.dragon-complete-stats{flex-wrap:wrap;}' +
      '}';
    document.head.appendChild(style);
  },

  _addToRepracticeQueue: function (mistake) {
    this._waitReviewQueue.push({
      wordId: mistake.wordId,
      type: 'mistake',
      addedAt: Date.now(),
      errorCount: mistake.errorCount || 1
    });
  }
};
