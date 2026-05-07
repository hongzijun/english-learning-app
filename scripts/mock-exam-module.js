var MockExamModule = {
  name: 'mock-exam',
  title: '期末模考',
  icon: '📋',
  timeLeft: 2700,
  totalTime: 2700,
  currentQuestion: 0,
  answers: {},
  marked: {},
  timerInterval: null,
  difficulty: 0,
  totalQuestions: 25,
  inProgress: false,

  init: function () {
    this.timeLeft = this.totalTime;
    this.currentQuestion = 0;
    this.answers = {};
    this.marked = {};
    this.difficulty = typeof AdaptiveEngine !== 'undefined' ? AdaptiveEngine.theta : 0;
    this.inProgress = false;
  },

  render: function () {
    if (!this.inProgress) {
      this._renderStart();
    } else {
      this._renderExam();
    }
  },

  _renderStart: function () {
    var estimate = { score: 85, level: '良好', range: [75, 95] };
    if (typeof AdaptiveEngine !== 'undefined') {
      estimate = AdaptiveEngine.estimateScore();
    }

    var sprint = null;
    if (typeof AdaptiveEngine !== 'undefined') {
      sprint = AdaptiveEngine.getSprintAdvice();
    }

    var lastExam = localStorage.getItem('ae_last_exam_score');
    var html = '<div class="card p-4" style="max-width:700px;margin:0 auto;">';
    html += '<h3 class="mb-1">📋 期末冲刺模考</h3>';
    html += '<p class="text-muted mb-4">全真模拟考试环境，自适应难度调整</p>';

    html += '<div class="grid-3 gap-3 mb-4 text-center">';
    html += '<div class="card p-3"><div class="text-muted small">预估分数</div><div style="font-size:2rem;font-weight:700;color:#6366f1;">' + estimate.score + '</div><div class="small">/120</div></div>';
    html += '<div class="card p-3"><div class="text-muted small">当前水平</div><div style="font-size:2rem;font-weight:700;color:#10b981;">' + estimate.level + '</div><div class="small">' + estimate.range[0] + '-' + estimate.range[1] + '</div></div>';
    html += '<div class="card p-3"><div class="text-muted small">上次模考</div><div style="font-size:2rem;font-weight:700;color:#f59e0b;">' + (lastExam || '--') + '</div><div class="small">/120</div></div>';
    html += '</div>';

    if (sprint) {
      html += '<div class="alert alert-warning mb-3"><strong>🎯 考前冲刺建议：</strong><br>' + sprint.advices.join('<br>') + '</div>';
    }

    html += '<div class="mb-4 p-3" style="background:#f8f9fa;border-radius:8px;">';
    html += '<strong>📋 模考说明：</strong>';
    html += '<ul class="mb-0 mt-2">';
    html += '<li>共25题：单选15题 + 完形填空1篇(5题) + 阅读理解1篇(5题)</li>';
    html += '<li>总时长45分钟，系统会自动计时</li>';
    html += '<li>难度根据你的水平动态调整</li>';
    html += '<li>交卷后生成详细分析报告</li>';
    html += '</ul></div>';

    html += '<button class="btn btn-primary btn-lg w-100" id="startMockExam">🚀 开始模考（45分钟）</button>';

    // 历史记录
    html += '<div class="mt-4"><strong>📜 模考历史</strong></div>';
    var records = typeof StorageEnhanced !== 'undefined' ? StorageEnhanced.getExamRecords() : [];
    if (records.length > 0) {
      html += '<div class="list-group mt-2">';
      for (var i = Math.max(0, records.length - 5); i < records.length; i++) {
        var r = records[i];
        html += '<div class="list-group-item flex-between"><span>' + (r.date || '') + '</span><span class="fw-bold">' + (r.score || '--') + '分</span></div>';
      }
      html += '</div>';
    } else {
      html += '<div class="text-muted small mt-2">暂无模考记录</div>';
    }

    html += '</div>';

    document.getElementById('main-content').innerHTML = html;

    var self = this;
    setTimeout(function () {
      var btn = document.getElementById('startMockExam');
      if (btn) btn.addEventListener('click', function () { self.startExam(); });
    }, 50);
  },

  startExam: function () {
    this.inProgress = true;
    this.timeLeft = this.totalTime;
    this.currentQuestion = 0;
    this.answers = {};
    this.marked = {};
    this._renderExam();
    this._startTimer();
  },

  _renderExam: function () {
    var html = '<div style="display:flex;gap:1rem;min-height:70vh;">';

    // 左侧题目区
    html += '<div style="flex:1;">';
    html += '<div class="card p-3 mb-3">';
    html += '<div class="flex-between">';
    html += '<span class="fw-bold">第 ' + (this.currentQuestion + 1) + '/' + this.totalQuestions + ' 题</span>';
    html += '<span style="color:' + (this.timeLeft < 300 ? '#ef4444' : '#374151') + ';font-weight:700;" id="examTimer">' + this._formatTime() + '</span>';
    html += '</div>';
    html += '<div class="progress-bar mt-2"><div class="progress-fill" style="width:' + ((this.currentQuestion / this.totalQuestions) * 100) + '%"></div></div>';
    html += '</div>';

    html += '<div class="card p-4" id="examQuestionContent">';
    html += this._renderQuestionContent();
    html += '</div>';

    html += '<div class="flex-between mt-3">';
    html += '<button class="btn btn-outline" id="examPrev" ' + (this.currentQuestion === 0 ? 'disabled' : '') + '>上一题</button>';
    html += '<button class="btn btn-outline btn-sm" id="examMark">🏷️ ' + (this.marked[this.currentQuestion] ? '取消标记' : '标记') + '</button>';
    html += this.currentQuestion < this.totalQuestions - 1
      ? '<button class="btn btn-primary" id="examNext">下一题</button>'
      : '<button class="btn btn-success" id="examSubmit">📩 交卷</button>';
    html += '</div>';
    html += '</div>';

    // 右侧答题卡
    html += '<div style="width:200px;">';
    html += '<div class="card p-3" style="position:sticky;top:1rem;">';
    html += '<div class="fw-bold mb-2">答题卡</div>';
    html += '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:4px;">';
    for (var i = 0; i < this.totalQuestions; i++) {
      var isAnswered = this.answers[i] !== undefined;
      var isMarked = this.marked[i];
      var isCurrent = i === this.currentQuestion;
      var bg = isCurrent ? '#6366f1' : isAnswered ? '#10b981' : '#e5e7eb';
      var textColor = (isCurrent || isAnswered) ? '#fff' : '#374151';
      html += '<div class="exam-card-num" data-idx="' + i + '" style="background:' + bg + ';color:' + textColor + ';text-align:center;padding:6px 0;border-radius:4px;cursor:pointer;font-size:0.8rem;' + (isMarked ? 'border:2px solid #f59e0b;' : '') + '">' + (i + 1) + '</div>';
    }
    html += '</div>';
    html += '<div class="mt-3 text-muted small">🟢 已答 | ⬜ 未答 | 🟡 已标记</div>';
    html += '</div></div>';

    html += '</div>';

    document.getElementById('main-content').innerHTML = html;
    this._bindExamEvents();
  },

  _renderQuestionContent: function () {
    var qIdx = this.currentQuestion;

    if (qIdx < 15) {
      return this._renderMockChoiceQuestion(qIdx);
    } else if (qIdx < 20) {
      return this._renderMockClozeQuestion(qIdx - 15);
    } else {
      return this._renderMockReadingQuestion(qIdx - 20);
    }
  },

  _renderMockChoiceQuestion: function (idx) {
    var exercises = Grade7Data ? Grade7Data.getAllExercises() : [];
    var choiceEx = exercises.filter(function (e) { return e.type === 'choice'; });
    if (choiceEx.length === 0) choiceEx = exercises.slice(0, 15);
    var ex = choiceEx[idx % choiceEx.length];

    var html = '<div class="mb-3 fw-bold">' + ex.q + '</div>';
    var selected = this.answers[idx];

    for (var i = 0; i < ex.o.length; i++) {
      var selClass = selected === i ? 'btn-info' : 'btn-outline';
      html += '<button class="exam-answer-btn btn ' + selClass + ' mb-2 w-100 text-left p-3" data-idx="' + idx + '" data-ans="' + i + '" data-kg="' + (ex.kp || 'choice') + '" data-correct="' + ex.a + '">' +
        String.fromCharCode(65 + i) + '. ' + ex.o[i] + '</button>';
    }
    return html;
  },

  _renderMockClozeQuestion: function (idx) {
    var clozeData = [
      { correct: 'smart', options: ['smart', 'tall', 'short', 'old'], kg: 'adj_vocab' },
      { correct: 'playing', options: ['play', 'plays', 'playing', 'played'], kg: 'gerund' },
      { correct: 'went', options: ['go', 'goes', 'went', 'going'], kg: 'past_tense' },
      { correct: 'for', options: ['in', 'for', 'at', 'on'], kg: 'preposition' },
      { correct: 'will', options: ['will', 'am', 'do', 'was'], kg: 'future_will' }
    ];
    var blank = clozeData[idx % clozeData.length];
    var qIdx = idx + 15;
    var selected = this.answers[qIdx];

    var html = '<div class="mb-2 text-muted">完形填空 - 第 ' + (idx + 1) + ' 空</div>';
    for (var i = 0; i < blank.options.length; i++) {
      var selClass = selected === i ? 'btn-info' : 'btn-outline';
      html += '<button class="exam-answer-btn btn ' + selClass + ' mb-2 w-100 text-left p-3" data-idx="' + qIdx + '" data-ans="' + i + '" data-kg="' + blank.kg + '" data-correct="' + blank.options.indexOf(blank.correct) + '">' +
        String.fromCharCode(65 + i) + '. ' + blank.options[i] + '</button>';
    }
    return html;
  },

  _renderMockReadingQuestion: function (idx) {
    var rd = [
      { q: 'What does the writer\'s mother do?', o: ['Teacher', 'Doctor', 'Nurse', 'Driver'], a: 1, kp: 'reading_detail' },
      { q: 'When did she work long hours?', o: ['Every day', 'On weekends', 'During COVID-19', 'Last year'], a: 2, kp: 'reading_detail' },
      { q: 'What can we infer about the mother?', o: ['She is lazy', 'She cares about others', 'She dislikes her job', 'She wants to quit'], a: 1, kp: 'reading_inference' },
      { q: 'The main idea is about ____.', o: ['Hospitals', 'A hero mother', 'COVID-19', 'Working hard'], a: 1, kp: 'reading_main' },
      { q: '"Complained" means ____.', o: ['表达不满', '努力工作', '帮助别人', '回家很晚'], a: 0, kp: 'reading_vocab' }
    ];
    var q = rd[idx % rd.length];
    var qIdx = idx + 20;
    var selected = this.answers[qIdx];

    var html = '<div class="mb-2 text-muted">阅读理解 - 第 ' + (idx + 1) + ' 题</div>';
    html += '<div class="mb-3 fw-bold">' + q.q + '</div>';
    for (var i = 0; i < q.o.length; i++) {
      var selClass = selected === i ? 'btn-info' : 'btn-outline';
      html += '<button class="exam-answer-btn btn ' + selClass + ' mb-2 w-100 text-left p-3" data-idx="' + qIdx + '" data-ans="' + i + '" data-kg="' + q.kp + '" data-correct="' + q.a + '">' +
        String.fromCharCode(65 + i) + '. ' + q.o[i] + '</button>';
    }
    return html;
  },

  _bindExamEvents: function () {
    var self = this;

    var prevBtn = document.getElementById('examPrev');
    var nextBtn = document.getElementById('examNext');
    var markBtn = document.getElementById('examMark');
    var submitBtn = document.getElementById('examSubmit');

    if (prevBtn) prevBtn.addEventListener('click', function () {
      self.currentQuestion = Math.max(0, self.currentQuestion - 1);
      self._renderExam();
    });
    if (nextBtn) nextBtn.addEventListener('click', function () {
      self.currentQuestion = Math.min(self.totalQuestions - 1, self.currentQuestion + 1);
      self._renderExam();
    });
    if (markBtn) markBtn.addEventListener('click', function () {
      self.marked[self.currentQuestion] = !self.marked[self.currentQuestion];
      self._renderExam();
    });
    if (submitBtn) submitBtn.addEventListener('click', function () {
      if (confirm('确定交卷吗？未答题目将记为0分。')) {
        self._submitExam();
      }
    });

    var cardNums = document.querySelectorAll('.exam-card-num');
    cardNums.forEach(function (c) {
      c.addEventListener('click', function () {
        self.currentQuestion = parseInt(this.dataset.idx);
        self._renderExam();
      });
    });

    var answerBtns = document.querySelectorAll('.exam-answer-btn');
    answerBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(this.dataset.idx);
        var ans = parseInt(this.dataset.ans);
        var isCorrect = ans === parseInt(this.dataset.correct);
        var kg = this.dataset.kg || 'unknown';

        self.answers[idx] = ans;

        if (typeof AdaptiveEngine !== 'undefined') {
          AdaptiveEngine.recordInteraction(kg, isCorrect, isCorrect ? 4 : 1, 0);
        }

        if (idx < self.totalQuestions - 1) {
          self.currentQuestion = idx + 1;
        }

        self.difficulty += isCorrect ? 0.2 : -0.2;
        self.difficulty = Math.max(-3, Math.min(3, self.difficulty));

        self._renderExam();
      });
    });
  },

  _formatTime: function () {
    var m = Math.floor(this.timeLeft / 60);
    var s = this.timeLeft % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  },

  _startTimer: function () {
    var self = this;
    clearInterval(this.timerInterval);
    this.timerInterval = setInterval(function () {
      self.timeLeft--;
      var timerEl = document.getElementById('examTimer');
      if (timerEl) {
        timerEl.textContent = self._formatTime();
        if (self.timeLeft < 300) timerEl.style.color = '#ef4444';
      }
      if (self.timeLeft <= 0) {
        self._submitExam();
      }
    }, 1000);
  },

  _submitExam: function () {
    clearInterval(this.timerInterval);
    this.inProgress = false;

    // 计算分数
    var correctCount = 0;
    var allExercises = Grade7Data ? Grade7Data.getAllExercises() : [];
    var choiceEx = allExercises.filter(function (e) { return e.type === 'choice'; });

    var clozeAnswers = [0, 2, 2, 1, 0];
    var readingAnswers = [1, 2, 1, 1, 0];

    for (var i = 0; i < 15; i++) {
      if (this.answers[i] !== undefined) {
        var ex = choiceEx[i % choiceEx.length];
        if (this.answers[i] === ex.a) correctCount++;
      }
    }
    for (i = 15; i < 20; i++) {
      if (this.answers[i] === clozeAnswers[i - 15]) correctCount++;
    }
    for (i = 20; i < 25; i++) {
      if (this.answers[i] === readingAnswers[i - 20]) correctCount++;
    }

    var score = Math.round(correctCount / 25 * 120);
    localStorage.setItem('ae_last_exam_score', score.toString());

    if (typeof AdaptiveEngine !== 'undefined') {
      AdaptiveEngine.estimateScore();
    }

    if (typeof StorageEnhanced !== 'undefined') {
      StorageEnhanced.addExamRecord({
        date: new Date().toISOString().split('T')[0],
        score: score,
        totalQuestions: 25,
        correctCount: correctCount,
        abilityRange: [Math.max(20, score - 10), Math.min(120, score + 10)],
        weaknessModules: typeof AdaptiveEngine !== 'undefined'
          ? (AdaptiveEngine.getNextRecommendation().topWeaknesses || []).slice(0, 3)
          : []
      });
    }

    this._showReport(score, correctCount);
  },

  _showReport: function (score, correctCount) {
    var estimate = { score: score, level: score >= 105 ? '优秀' : score >= 85 ? '良好' : score >= 60 ? '中等' : '待提升', range: [Math.max(20, score - 10), Math.min(120, score + 10)] };
    if (typeof AdaptiveEngine !== 'undefined') estimate = AdaptiveEngine.estimateScore();

    var sprint = null;
    if (typeof AdaptiveEngine !== 'undefined') sprint = AdaptiveEngine.getSprintAdvice();

    var pct = Math.round(correctCount / 25 * 100);
    var color = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444';

    var html = '<div class="card p-4" style="max-width:700px;margin:0 auto;">';
    html += '<h3 class="mb-1">📊 模考报告</h3>';
    html += '<p class="text-muted mb-4">交卷时间：' + new Date().toISOString().split('T')[0] + '</p>';

    html += '<div class="text-center mb-4">';
    html += '<div style="font-size:4rem;font-weight:700;color:' + color + ';">' + score + '</div>';
    html += '<div class="text-muted">/120（正确' + correctCount + '/25题）</div>';
    html += '</div>';

    html += '<div class="grid-3 gap-3 mb-4 text-center">';
    html += '<div class="card p-3"><div class="text-muted small">正确率</div><div style="font-size:1.5rem;font-weight:700;color:' + color + ';">' + pct + '%</div></div>';
    html += '<div class="card p-3"><div class="text-muted small">能力区间</div><div style="font-size:1.5rem;font-weight:700;">' + estimate.range[0] + '-' + estimate.range[1] + '</div></div>';
    html += '<div class="card p-3"><div class="text-muted small">水平等级</div><div style="font-size:1.5rem;font-weight:700;color:#6366f1;">' + estimate.level + '</div></div>';
    html += '</div>';

    if (sprint) {
      html += '<div class="alert alert-warning mb-4">';
      html += '<strong>🎯 冲刺建议（目标108+）：</strong><br>';
      html += sprint.advices.join('<br>');
      html += '</div>';
    }

    html += '<button class="btn btn-primary w-100 mb-2" id="retakeExam">🔄 重新模考</button>';
    html += '<button class="btn btn-outline w-100" id="backToModules">📚 返回学习</button>';
    html += '</div>';

    document.getElementById('main-content').innerHTML = html;

    var self = this;
    setTimeout(function () {
      var retake = document.getElementById('retakeExam');
      var back = document.getElementById('backToModules');
      if (retake) retake.addEventListener('click', function () { self.startExam(); });
      if (back) back.addEventListener('click', function () {
        if (typeof App !== 'undefined') App.navigate('smart-words');
      });
    }, 50);
  }
};