var DiagnosticModule = {
  name: 'diagnostic',
  title: '智能诊断',
  icon: '🔬',
  currentTest: null,
  currentQuestion: 0,
  scores: { vocab: 0, grammar: 0, reading: 0, listening: 0 },
  totalQuestions: { vocab: 10, grammar: 8, reading: 5, listening: 10 },

  init: function () {
    var diagDone = localStorage.getItem('diagnostic_completed');
    if (!diagDone) {
      setTimeout(this.showWelcome.bind(this), 1500);
    }
  },

  render: function () {
    var html = '<div class="card p-4" style="max-width:800px;margin:0 auto;">';
    html += '<h3 class="mb-3">🔬 全维度智能诊断</h3>';
    html += '<p class="text-muted">诊断覆盖词汇、语法、阅读、听力四大维度，帮助精准定位知识漏洞</p>';

    var lastDiag = localStorage.getItem('diagnostic_completed');
    if (lastDiag) {
      html += '<div class="alert alert-success mb-3">上次诊断时间：' + lastDiag + '</div>';
    }

    html += '<div class="grid-2 gap-3 mb-4">';
    html += this._buildTestCard('vocab', '📝', '词汇广度', '测试英文→中文的识别能力');
    html += this._buildTestCard('grammar', '📐', '语法理解', '测试核心语法的掌握程度');
    html += this._buildTestCard('reading', '📖', '阅读速度', '限时阅读+理解题');
    html += this._buildTestCard('listening', '🎧', '听力辨音', '听发音→选单词');
    html += '</div>';

    html += '<button class="btn btn-primary btn-lg w-100" id="startFullDiag">🚀 开始全维度诊断（约15分钟）</button>';
    html += '<button class="btn btn-outline btn-sm mt-2 w-100" id="startQuickDiag">⚡ 快速诊断（约5分钟）</button>';
    html += '</div>';

    document.getElementById('main-content').innerHTML = html;
    this.bindEvents();
  },

  _buildTestCard: function (type, icon, title, desc) {
    return '<div class="card p-3 diag-card" data-test="' + type + '" style="cursor:pointer;">' +
      '<div style="font-size:2rem;">' + icon + '</div>' +
      '<div class="fw-bold">' + title + '</div>' +
      '<div class="text-muted small">' + desc + '</div>' +
      '</div>';
  },

  bindEvents: function () {
    var self = this;
    var startFull = document.getElementById('startFullDiag');
    var startQuick = document.getElementById('startQuickDiag');
    if (startFull) startFull.addEventListener('click', function () { self.startDiagnosis(false); });
    if (startQuick) startQuick.addEventListener('click', function () { self.startDiagnosis(true); });

    var cards = document.querySelectorAll('.diag-card');
    cards.forEach(function (card) {
      card.addEventListener('click', function () {
        self.startSingleTest(card.dataset.test);
      });
    });
  },

  showWelcome: function () {
    var html = '<div class="diagnostic-modal" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;">';
    html += '<div class="card p-5" style="max-width:500px;text-align:center;animation:slideUp 0.5s;">';
    html += '<div style="font-size:4rem;">🔬</div>';
    html += '<h3 class="mt-3">欢迎使用智能诊断</h3>';
    html += '<p class="text-muted">首次使用建议先完成全维度诊断，帮助系统精准了解你的学习状态，定制专属提分方案。</p>';
    html += '<button class="btn btn-primary btn-lg mt-3" id="welcomeStartDiag">开始诊断（约15分钟）</button>';
    html += '<button class="btn btn-outline btn-sm mt-2" id="welcomeSkipDiag">跳过，稍后再说</button>';
    html += '</div></div>';
    document.body.insertAdjacentHTML('beforeend', html);

    var self = this;
    setTimeout(function () {
      var startBtn = document.getElementById('welcomeStartDiag');
      var skipBtn = document.getElementById('welcomeSkipDiag');
      if (startBtn) startBtn.addEventListener('click', function () {
        document.querySelector('.diagnostic-modal').remove();
        self.startDiagnosis(false);
      });
      if (skipBtn) skipBtn.addEventListener('click', function () {
        document.querySelector('.diagnostic-modal').remove();
      });
    }, 100);
  },

  startDiagnosis: function (quick) {
    this.scores = { vocab: 0, grammar: 0, reading: 0, listening: 0 };
    this.currentTest = quick ? ['vocab', 'grammar'] : ['vocab', 'grammar', 'reading', 'listening'];
    this.currentTestIndex = 0;
    this.currentQuestion = 0;
    if (quick) {
      this.totalQuestions.vocab = 5;
      this.totalQuestions.grammar = 5;
    } else {
      this.totalQuestions.vocab = 10;
      this.totalQuestions.grammar = 8;
      this.totalQuestions.reading = 5;
      this.totalQuestions.listening = 10;
    }
    this._renderQuestion();
  },

  startSingleTest: function (type) {
    this.scores = { vocab: 0, grammar: 0, reading: 0, listening: 0 };
    this.currentTest = [type];
    this.currentTestIndex = 0;
    this.currentQuestion = 0;
    if (type === 'reading') this.totalQuestions.reading = 3;
    this._renderQuestion();
  },

  _renderQuestion: function () {
    if (this.currentTestIndex >= this.currentTest.length) {
      this._showReport();
      return;
    }

    var testType = this.currentTest[this.currentTestIndex];
    var total = this.totalQuestions[testType];
    var current = this.currentQuestion;

    if (current >= total) {
      this.currentTestIndex++;
      this.currentQuestion = 0;
      this._renderQuestion();
      return;
    }

    var progress = Math.round((current / total) * 100);
    var html = '<div class="card p-4" style="max-width:700px;margin:0 auto;">';
    html += '<div class="flex-between mb-3">';
    html += '<span class="fw-bold">' + this._getTestName(testType) + '</span>';
    html += '<span class="text-muted">' + (current + 1) + '/' + total + '</span>';
    html += '</div>';
    html += '<div class="progress-bar mb-4"><div class="progress-fill" style="width:' + progress + '%"></div></div>';

    switch (testType) {
      case 'vocab': html += this._renderVocabQuestion(); break;
      case 'grammar': html += this._renderGrammarQuestion(); break;
      case 'reading': html += this._renderReadingQuestion(); break;
      case 'listening': html += this._renderListeningQuestion(); break;
    }

    html += '</div>';
    document.getElementById('main-content').innerHTML = html;

    var self = this;
    setTimeout(function () { self._bindQuestionEvents(testType); }, 100);
  },

  _getTestName: function (type) {
    var names = { vocab: '📝 词汇广度测试', grammar: '📐 语法理解测试', reading: '📖 阅读速度测试', listening: '🎧 听力辨音测试' };
    return names[type] || type;
  },

  _renderVocabQuestion: function () {
    var allWords = Grade7Data ? Grade7Data.getAllWords() : [];
    var idx = (this.currentQuestion * 7) % allWords.length;
    var word = allWords[idx];
    var options = this._generateVocabOptions(word, allWords);

    var html = '<div class="mb-4" style="font-size:1.8rem;text-align:center;font-weight:700;color:var(--primary);">' + word.w + '</div>';
    html += '<div class="text-muted text-center mb-3">请选择正确的中文意思</div>';
    for (var i = 0; i < options.length; i++) {
      html += '<button class="diag-option btn btn-outline mb-2 w-100 text-left p-3" data-answer="' + (options[i].id === word.id ? '1' : '0') + '" data-kg="' + (word.kgPoint || 'unknown') + '">' +
        String.fromCharCode(65 + i) + '. ' + options[i].m + '</button>';
    }
    return html;
  },

  _generateVocabOptions: function (word, allWords) {
    var others = [];
    for (var i = 0; i < allWords.length; i++) {
      if (allWords[i].id !== word.id) others.push(allWords[i]);
    }
    var opts = [word];
    for (var j = 0; j < 3 && j < others.length; j++) {
      var ri = Math.floor(Math.random() * others.length);
      if (opts.indexOf(others[ri]) === -1) opts.push(others[ri]);
    }
    for (var k = opts.length - 1; k > 0; k--) {
      var rj = Math.floor(Math.random() * (k + 1));
      var tmp = opts[k]; opts[k] = opts[rj]; opts[rj] = tmp;
    }
    return opts;
  },

  _renderGrammarQuestion: function () {
    var exercises = Grade7Data ? Grade7Data.getAllExercises() : [];
    var idx = this.currentQuestion % exercises.length;
    var ex = exercises[idx];

    var html = '<div class="mb-3 fw-bold">' + ex.q + '</div>';
    if (ex.o) {
      for (var i = 0; i < ex.o.length; i++) {
        html += '<button class="diag-option btn btn-outline mb-2 w-100 text-left p-3" data-answer="' + (i === ex.a ? '1' : '0') + '" data-kg="' + (ex.kp || 'grammar') + '">' +
          String.fromCharCode(65 + i) + '. ' + ex.o[i] + '</button>';
      }
    } else {
      html += '<input type="text" class="form-control mb-3 diag-input" data-correct="' + ex.a + '" data-kg="' + (ex.kp || 'grammar') + '" placeholder="输入答案..." />';
      html += '<button class="btn btn-primary diag-submit-btn">提交</button>';
    }
    return html;
  },

  _renderReadingQuestion: function () {
    if (this.currentQuestion === 0) {
      var passage = 'Traveling is a wonderful way to learn about the world. When you visit a new place, you can see beautiful sights, taste delicious food, and meet friendly people. Some people like to climb mountains, while others prefer to walk along the beach. No matter where you go, traveling helps you understand different cultures and makes your life more colorful. Remember to take photos and keep a diary to record your happy moments.';
      return '<div class="mb-4 p-3" style="background:#f8f9fa;border-radius:8px;line-height:1.8;"><strong>阅读以下短文（限时5分钟）：</strong><br><br>' + passage + '</div>' +
        '<button class="btn btn-primary w-100 diag-reading-next">我已读完，开始答题</button>';
    }

    var questions = [
      { q: 'What is the main idea of the passage?', o: ['Traveling is dangerous', 'Traveling helps learn about the world', 'Traveling is expensive', 'Traveling is boring'], a: 1, kp: 'reading_main' },
      { q: 'What can you do when visiting a new place?', o: ['Sleep all day', 'See sights and taste food', 'Stay in hotel', 'Watch TV'], a: 1, kp: 'reading_detail' },
      { q: 'Why is traveling good for understanding different cultures?', o: ['It is not mentioned', 'Because you meet people and see different things', 'Because you stay home', 'Because you read books'], a: 1, kp: 'reading_inference' },
      { q: 'What does the author suggest you bring?', o: ['Money only', 'Camera and diary', 'Computer', 'Games'], a: 1, kp: 'reading_detail' },
      { q: 'The word "colorful" in the passage means ____.', o: ['dark', 'boring', 'interesting and exciting', 'sad'], a: 2, kp: 'reading_vocab' }
    ];
    var q = questions[Math.min(this.currentQuestion, questions.length - 1)];
    var html = '<div class="mb-3 fw-bold">' + q.q + '</div>';
    for (var i = 0; i < q.o.length; i++) {
      html += '<button class="diag-option btn btn-outline mb-2 w-100 text-left p-3" data-answer="' + (i === q.a ? '1' : '0') + '" data-kg="' + q.kp + '">' +
        String.fromCharCode(65 + i) + '. ' + q.o[i] + '</button>';
    }
    return html;
  },

  _renderListeningQuestion: function () {
    var allWords = Grade7Data ? Grade7Data.getAllWords() : [];
    var idx = (this.currentQuestion * 11 + 3) % allWords.length;
    var word = allWords[idx];
    var options = this._generateVocabOptions(word, allWords);

    var html = '<div class="text-center mb-4">';
    html += '<button class="btn btn-primary btn-lg mb-3 diag-play-audio" data-word="' + word.w + '">🔊 播放发音</button>';
    html += '<div class="text-muted">请听发音，选择对应的中文意思</div>';
    html += '</div>';
    for (var i = 0; i < options.length; i++) {
      html += '<button class="diag-option btn btn-outline mb-2 w-100 text-left p-3" data-answer="' + (options[i].id === word.id ? '1' : '0') + '" data-kg="' + (word.kgPoint || 'listening') + '">' +
        String.fromCharCode(65 + i) + '. ' + options[i].m + '</button>';
    }
    return html;
  },

  _bindQuestionEvents: function (testType) {
    var self = this;

    var playBtn = document.querySelector('.diag-play-audio');
    if (playBtn) {
      playBtn.addEventListener('click', function () {
        var word = this.dataset.word;
        if (word && window.speechSynthesis) {
          var utter = new SpeechSynthesisUtterance(word);
          utter.lang = 'en-US';
          utter.rate = 0.8;
          speechSynthesis.speak(utter);
        }
      });
    }

    var readingNext = document.querySelector('.diag-reading-next');
    if (readingNext) {
      readingNext.addEventListener('click', function () {
        self._renderQuestion();
      });
      return;
    }

    var options = document.querySelectorAll('.diag-option');
    options.forEach(function (opt) {
      opt.addEventListener('click', function () {
        var isCorrect = this.dataset.answer === '1';
        var kg = this.dataset.kg || 'unknown';

        if (isCorrect) {
          this.classList.add('btn-success');
          self.scores[testType]++;
        } else {
          this.classList.add('btn-danger');
          var correctOpt = document.querySelector('.diag-option[data-answer="1"]');
          if (correctOpt) correctOpt.classList.add('btn-success');
        }

        if (typeof AdaptiveEngine !== 'undefined') {
          AdaptiveEngine.recordInteraction(kg, isCorrect, isCorrect ? 4 : 1, 0);
        }

        self._disableOptions();

        setTimeout(function () {
          self.currentQuestion++;
          self._renderQuestion();
        }, 800);
      });
    });

    var submitBtn = document.querySelector('.diag-submit-btn');
    var inputField = document.querySelector('.diag-input');
    if (submitBtn && inputField) {
      submitBtn.addEventListener('click', function () {
        var userAnswer = inputField.value.trim().toLowerCase();
        var correctAnswer = inputField.dataset.correct.toLowerCase();
        var kg = inputField.dataset.kg || 'grammar';
        var isCorrect = userAnswer === correctAnswer;

        if (isCorrect) {
          inputField.style.borderColor = 'green';
          self.scores[testType]++;
        } else {
          inputField.style.borderColor = 'red';
        }

        if (typeof AdaptiveEngine !== 'undefined') {
          AdaptiveEngine.recordInteraction(kg, isCorrect, isCorrect ? 4 : 1, 0);
        }

        setTimeout(function () {
          self.currentQuestion++;
          self._renderQuestion();
        }, 800);
      });
    }
  },

  _disableOptions: function () {
    var opts = document.querySelectorAll('.diag-option');
    opts.forEach(function (o) { o.disabled = true; });
  },

  _showReport: function () {
    var totalVocab = this.totalQuestions.vocab;
    var totalGrammar = this.totalQuestions.grammar;
    var totalReading = this.totalQuestions.reading;
    var totalListening = this.totalQuestions.listening;

    var vocabPct = totalVocab > 0 ? Math.round(this.scores.vocab / totalVocab * 100) : 0;
    var grammarPct = totalGrammar > 0 ? Math.round(this.scores.grammar / totalGrammar * 100) : 0;
    var readingPct = totalReading > 0 ? Math.round(this.scores.reading / totalReading * 100) : 0;
    var listeningPct = totalListening > 0 ? Math.round(this.scores.listening / totalListening * 100) : 0;

    var estimate = { score: 85, range: [75, 95], level: '良好' };
    if (typeof AdaptiveEngine !== 'undefined') {
      estimate = AdaptiveEngine.estimateScore();
    }

    var now = new Date().toISOString().split('T')[0];
    localStorage.setItem('diagnostic_completed', now);

    if (typeof StorageEnhanced !== 'undefined') {
      StorageEnhanced.addDiagnosticRecord({
        date: now,
        scores: { vocab: vocabPct, grammar: grammarPct, reading: readingPct, listening: listeningPct },
        theta: typeof AdaptiveEngine !== 'undefined' ? AdaptiveEngine.theta : 0,
        totalScore: estimate.score
      });
    }

    var allMastery = [];
    if (typeof AdaptiveEngine !== 'undefined') {
      allMastery = AdaptiveEngine.getAllMasteryLevels();
    }
    var weakList = allMastery.filter(function (m) { return m.probability < 0.6; }).slice(0, 5);

    var html = '<div class="card p-4" style="max-width:800px;margin:0 auto;">';
    html += '<h3 class="mb-1">📊 诊断报告</h3>';
    html += '<p class="text-muted mb-4">诊断时间：' + now + '</p>';

    html += '<div class="grid-4 gap-3 mb-4 text-center">';
    html += this._scoreBox('词汇', vocabPct, this.scores.vocab + '/' + totalVocab);
    html += this._scoreBox('语法', grammarPct, this.scores.grammar + '/' + totalGrammar);
    html += this._scoreBox('阅读', readingPct, this.scores.reading + '/' + totalReading);
    html += this._scoreBox('听力', listeningPct, this.scores.listening + '/' + totalListening);
    html += '</div>';

    html += '<canvas id="diagRadar" width="400" height="400" style="display:block;margin:0 auto 1rem;"></canvas>';

    html += '<div class="alert alert-info mb-3">';
    html += '<strong>预估期末分数：</strong>' + estimate.score + '/120（' + estimate.level + '）';
    html += '<br>分数区间：' + estimate.range[0] + ' - ' + estimate.range[1];
    html += '</div>';

    if (weakList.length > 0) {
      html += '<div class="mb-3"><strong>⚠️ 薄弱考点（需优先攻克）：</strong></div>';
      html += '<div class="list-group mb-4">';
      for (var i = 0; i < weakList.length; i++) {
        var w = weakList[i];
        html += '<div class="list-group-item flex-between"><span>' + w.kgPoint + '</span><span class="badge bg-red">' + Math.round(w.probability * 100) + '%</span></div>';
      }
      html += '</div>';
    }

    html += '<button class="btn btn-primary w-100" onclick="App.navigate(\'smart-words\')">🎯 开始针对性学习</button>';
    html += '<button class="btn btn-outline btn-sm mt-2 w-100" id="rediagBtn">🔄 重新诊断</button>';
    html += '</div>';

    document.getElementById('main-content').innerHTML = html;

    var self = this;
    setTimeout(function () {
      self._drawRadar(vocabPct, grammarPct, readingPct, listeningPct);
      var rBtn = document.getElementById('rediagBtn');
      if (rBtn) rBtn.addEventListener('click', function () { self.startDiagnosis(false); });
    }, 200);
  },

  _scoreBox: function (label, pct, score) {
    var color = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444';
    return '<div class="card p-3">' +
      '<div class="text-muted small">' + label + '</div>' +
      '<div style="font-size:2rem;font-weight:700;color:' + color + ';">' + pct + '%</div>' +
      '<div class="text-muted small">' + score + '</div>' +
      '</div>';
  },

  _drawRadar: function (vocab, grammar, reading, listening) {
    var canvas = document.getElementById('diagRadar');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var w = canvas.width, h = canvas.height;
    var cx = w / 2, cy = h / 2;
    var r = 140;

    ctx.clearRect(0, 0, w, h);

    var values = [vocab / 100, grammar / 100, reading / 100, listening / 100];
    var labels = ['词汇', '语法', '阅读', '听力'];
    var angleStep = (Math.PI * 2) / 4;

    // 网格
    for (var level = 1; level <= 4; level++) {
      ctx.beginPath();
      for (var i = 0; i < 4; i++) {
        var lr = r * level / 4;
        var x = cx + lr * Math.cos(angleStep * i - Math.PI / 2);
        var y = cy + lr * Math.sin(angleStep * i - Math.PI / 2);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = '#e5e7eb';
      ctx.stroke();
    }

    // 轴线
    for (i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + r * Math.cos(angleStep * i - Math.PI / 2), cy + r * Math.sin(angleStep * i - Math.PI / 2));
      ctx.strokeStyle = '#e5e7eb';
      ctx.stroke();
    }

    // 数据区域
    ctx.beginPath();
    for (i = 0; i < 4; i++) {
      var dr = r * values[i];
      var dx = cx + dr * Math.cos(angleStep * i - Math.PI / 2);
      var dy = cy + dr * Math.sin(angleStep * i - Math.PI / 2);
      if (i === 0) ctx.moveTo(dx, dy);
      else ctx.lineTo(dx, dy);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(99, 102, 241, 0.2)';
    ctx.fill();
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 标签
    ctx.fillStyle = '#374151';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    for (i = 0; i < 4; i++) {
      var lx = cx + (r + 30) * Math.cos(angleStep * i - Math.PI / 2);
      var ly = cy + (r + 30) * Math.sin(angleStep * i - Math.PI / 2);
      ctx.fillText(labels[i] + ' ' + Math.round(values[i] * 100) + '%', lx, ly);
    }
  }
};