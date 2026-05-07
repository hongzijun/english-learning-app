var ExamStrategyModule = {
  name: 'exam-strategy',
  title: '应试提分',
  icon: '📝',
  currentType: 'choice',
  currentQuestion: 0,
  score: 0,
  clozeData: [
    {
      text: 'Tom is a ___1___ boy. He likes ___2___ basketball after school. Yesterday, he ___3___ to the park with his friends. They played ___4___ two hours. Tom said, "I ___5___ play basketball every day because it makes me happy."',
      blanks: [
        { pos: 1, correct: 'smart', options: ['smart', 'tall', 'short', 'old'], kg: 'adj_vocab' },
        { pos: 2, correct: 'playing', options: ['play', 'plays', 'playing', 'played'], kg: 'gerund' },
        { pos: 3, correct: 'went', options: ['go', 'goes', 'went', 'going'], kg: 'past_tense' },
        { pos: 4, correct: 'for', options: ['in', 'for', 'at', 'on'], kg: 'preposition' },
        { pos: 5, correct: 'will', options: ['will', 'am', 'do', 'was'], kg: 'future_will' }
      ]
    }
  ],
  readingData: [
    {
      passage: 'My hero is my mother. She is a doctor and works very hard every day. During the COVID-19 pandemic, she spent long hours at the hospital helping sick people. Sometimes she came home very late, but she never complained. She always says, "Helping others is the most important thing in life." I am very proud of her and want to be a doctor like her one day.',
      questions: [
        { q: 'What does the writer\'s mother do?', o: ['Teacher', 'Doctor', 'Nurse', 'Driver'], a: 1, kp: 'reading_detail', type: 'detail' },
        { q: 'When did she work long hours?', o: ['Every day', 'On weekends', 'During COVID-19', 'Last year'], a: 2, kp: 'reading_detail', type: 'detail' },
        { q: 'What can we infer about the mother?', o: ['She is lazy', 'She cares about others', 'She dislikes her job', 'She wants to quit'], a: 1, kp: 'reading_inference', type: 'inference' },
        { q: 'The main idea is about ____.', o: ['Hospitals', 'A hero mother', 'COVID-19', 'Working hard'], a: 1, kp: 'reading_main', type: 'main_idea' },
        { q: '"Complained" means ____.', o: ['表达不满', '努力工作', '帮助别人', '回家很晚'], a: 0, kp: 'reading_vocab', type: 'vocabulary_guess' }
      ]
    }
  ],

  init: function () {
    this.currentType = 'choice';
    this.currentQuestion = 0;
    this.score = 0;
  },

  render: function () {
    var html = '<div class="card p-4" style="max-width:800px;margin:0 auto;">';
    html += '<h3 class="mb-1">📝 全题型应试提分</h3>';
    html += '<p class="text-muted mb-3">掌握每类题型的解题策略，精准提分</p>';

    html += '<div class="flex gap-2 mb-4 flex-wrap">';
    html += '<button class="btn ' + (this.currentType === 'choice' ? 'btn-primary' : 'btn-outline') + ' type-tab" data-type="choice">单选题</button>';
    html += '<button class="btn ' + (this.currentType === 'cloze' ? 'btn-primary' : 'btn-outline') + ' type-tab" data-type="cloze">完形填空</button>';
    html += '<button class="btn ' + (this.currentType === 'reading' ? 'btn-primary' : 'btn-outline') + ' type-tab" data-type="reading">阅读理解</button>';
    html += '</div>';

    html += this._getStrategyPanel();
    html += '<div id="examQuestionArea" class="mt-3"></div>';
    html += '</div>';

    document.getElementById('main-content').innerHTML = html;

    var self = this;
    setTimeout(function () {
      var tabs = document.querySelectorAll('.type-tab');
      tabs.forEach(function (t) {
        t.addEventListener('click', function () {
          self.currentType = this.dataset.type;
          self.currentQuestion = 0;
          self.score = 0;
          self.render();
        });
      });
      self._renderCurrentQuestion();
    }, 50);
  },

  _getStrategyPanel: function () {
    var strategies = {
      choice: { title: '🎯 单选策略', tip: '排除法：先排除明显错误选项，对比剩余选项，关注语法时态和固定搭配' },
      cloze: { title: '📋 完形策略', tip: '上下文线索法：先通读全文，注意词性搭配、固定短语和逻辑关系' },
      reading: { title: '📖 阅读策略', tip: '三步法：1.先读题目→2.定位段落→3.关键词匹配→排除干扰项' }
    };
    var s = strategies[this.currentType] || strategies.choice;
    return '<div class="alert alert-info"><strong>' + s.title + '：</strong>' + s.tip + '</div>';
  },

  _renderCurrentQuestion: function () {
    var area = document.getElementById('examQuestionArea');
    if (!area) return;

    switch (this.currentType) {
      case 'choice': this._renderChoiceQuestion(area); break;
      case 'cloze': this._renderClozeQuestion(area); break;
      case 'reading': this._renderReadingQuestion(area); break;
    }
  },

  _renderChoiceQuestion: function (area) {
    var exercises = Grade7Data ? Grade7Data.getAllExercises() : [];
    var choiceEx = exercises.filter(function (e) { return e.type === 'choice'; });
    if (choiceEx.length === 0) choiceEx = exercises;

    if (this.currentQuestion >= choiceEx.length) {
      area.innerHTML = this._getResultHTML(choiceEx.length);
      return;
    }

    var ex = choiceEx[this.currentQuestion];
    var html = '<div class="card p-4">';
    html += '<div class="flex-between mb-3"><span class="text-muted">' + (this.currentQuestion + 1) + '/' + choiceEx.length + '</span><span class="badge">' + (ex.kp || '考点') + '</span></div>';
    html += '<div class="mb-3 fw-bold">' + ex.q + '</div>';

    for (var i = 0; i < ex.o.length; i++) {
      html += '<button class="exam-option btn btn-outline mb-2 w-100 text-left p-3" data-correct="' + (i === ex.a ? '1' : '0') + '" data-kg="' + (ex.kp || 'choice') + '" data-id="' + ex.id + '">' +
        String.fromCharCode(65 + i) + '. ' + ex.o[i] + '</button>';
    }
    html += '<div class="exam-feedback mt-3" style="display:none;"></div>';
    html += '</div>';

    area.innerHTML = html;
    this._bindOptionEvents(area);
  },

  _renderClozeQuestion: function (area) {
    if (this.currentQuestion >= this.clozeData[0].blanks.length) {
      area.innerHTML = this._getResultHTML(this.clozeData[0].blanks.length);
      return;
    }

    var cloze = this.clozeData[0];
    var blank = cloze.blanks[this.currentQuestion];

    var displayText = cloze.text;
    for (var i = 0; i < cloze.blanks.length; i++) {
      var b = cloze.blanks[i];
      var marker = i === this.currentQuestion
        ? '<span style="background:#fef3c7;padding:0 4px;border-bottom:2px solid #f59e0b;font-weight:700;">___' + (i + 1) + '___</span>'
        : '___' + (i + 1) + '___';
      displayText = displayText.replace('___' + (i + 1) + '___', marker);
    }

    var html = '<div class="card p-4">';
    html += '<div class="flex-between mb-3"><span class="text-muted">' + (this.currentQuestion + 1) + '/' + cloze.blanks.length + '</span><span class="badge">' + blank.kg + '</span></div>';
    html += '<div class="mb-4 p-3" style="background:#f8f9fa;border-radius:8px;line-height:2;">' + displayText + '</div>';

    for (var j = 0; j < blank.options.length; j++) {
      html += '<button class="exam-option btn btn-outline mb-2 w-100 text-left p-3" data-correct="' + (blank.options[j] === blank.correct ? '1' : '0') + '" data-kg="' + blank.kg + '">' +
        String.fromCharCode(65 + j) + '. ' + blank.options[j] + '</button>';
    }
    html += '<div class="exam-feedback mt-3" style="display:none;"></div>';
    html += '</div>';

    area.innerHTML = html;
    this._bindOptionEvents(area);
  },

  _renderReadingQuestion: function (area) {
    var rd = this.readingData[0];
    var total = rd.questions.length;

    if (this.currentQuestion >= total) {
      area.innerHTML = this._getResultHTML(total);
      return;
    }

    if (this.currentQuestion === 0) {
      area.innerHTML = '<div class="card p-4"><div class="mb-4 p-3" style="background:#f8f9fa;border-radius:8px;line-height:1.8;"><strong>阅读以下短文：</strong><br><br>' + rd.passage + '</div>' +
        '<button class="btn btn-primary w-100 exam-start-reading">我已读完，开始答题</button></div>';
      var self = this;
      setTimeout(function () {
        var btn = document.querySelector('.exam-start-reading');
        if (btn) btn.addEventListener('click', function () { self._renderCurrentQuestion(); });
      }, 50);
      return;
    }

    var q = rd.questions[this.currentQuestion];
    var html = '<div class="card p-4">';
    html += '<div class="flex-between mb-3"><span class="text-muted">' + (this.currentQuestion + 1) + '/' + total + '</span><span class="badge bg-blue">' + q.type + '</span></div>';
    html += '<div class="mb-3 fw-bold">' + q.q + '</div>';

    for (var i = 0; i < q.o.length; i++) {
      html += '<button class="exam-option btn btn-outline mb-2 w-100 text-left p-3" data-correct="' + (i === q.a ? '1' : '0') + '" data-kg="' + q.kp + '">' +
        String.fromCharCode(65 + i) + '. ' + q.o[i] + '</button>';
    }
    html += '<div class="exam-feedback mt-3" style="display:none;"></div>';
    html += '</div>';

    area.innerHTML = html;
    this._bindOptionEvents(area);
  },

  _bindOptionEvents: function (area) {
    var self = this;
    var options = area.querySelectorAll('.exam-option');
    options.forEach(function (opt) {
      opt.addEventListener('click', function () {
        var isCorrect = this.dataset.correct === '1';
        var kg = this.dataset.kg || 'unknown';

        if (this.classList.contains('answered')) return;
        this.classList.add('answered');

        if (isCorrect) {
          this.classList.add('btn-success');
          self.score++;
        } else {
          this.classList.add('btn-danger');
          var correctOpt = area.querySelector('.exam-option[data-correct="1"]');
          if (correctOpt) correctOpt.classList.add('btn-success');
        }

        if (typeof AdaptiveEngine !== 'undefined') {
          var errType = isCorrect ? null : AdaptiveEngine.classifyError(kg, true, 3000, isCorrect ? 4 : 1);
          AdaptiveEngine.recordInteraction(kg, isCorrect, isCorrect ? 4 : 1, 3000);
        }

        var feedback = area.querySelector('.exam-feedback');
        if (feedback && !isCorrect) {
          feedback.style.display = 'block';
          feedback.innerHTML = '<div class="alert alert-warning">❌ 回答错误！已记录到错题本，系统将根据错误类型推送针对性练习。</div>';
        }

        setTimeout(function () {
          self.currentQuestion++;
          self._renderCurrentQuestion();
        }, 1000);
      });
    });
  },

  _getResultHTML: function (total) {
    var pct = total > 0 ? Math.round(this.score / total * 100) : 0;
    var color = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444';
    return '<div class="card p-4 text-center">' +
      '<div style="font-size:3rem;">' + (pct >= 80 ? '🎉' : pct >= 60 ? '📚' : '💪') + '</div>' +
      '<div style="font-size:2.5rem;font-weight:700;color:' + color + ';">' + pct + '%</div>' +
      '<div class="text-muted">正确 ' + this.score + '/' + total + ' 题</div>' +
      '<button class="btn btn-primary mt-3 exam-retry-btn">🔄 重新练习</button>' +
      '<button class="btn btn-outline mt-2 exam-all-btn">📋 查看全部题型</button>' +
      '</div>';
  }
};