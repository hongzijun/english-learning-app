var InterleavedPractice = {
  state: null,

  _shuffle: function (arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  },

  _mockReadingPassages: [
    {
      id: 1, title: 'A Day at the Park',
      passage: 'Last Sunday, Tom and his family went to the park. The weather was sunny and warm. '
        + 'They played football and had a picnic under a big tree. Tom felt very happy.',
      questions: [
        { q: 'Where did Tom go last Sunday?', o: ['School', 'Park', 'Library', 'Museum'], a: 1 },
        { q: 'How was the weather?', o: ['Rainy', 'Cloudy', 'Sunny and warm', 'Cold'], a: 2 }
      ]
    },
    {
      id: 2, title: 'My Best Friend',
      passage: 'Lucy is my best friend. She is tall and has long black hair. '
        + 'She is good at English and often helps me with my homework. We play together every day.',
      questions: [
        { q: 'What does Lucy look like?', o: ['Short with short hair', 'Tall with long black hair', 'Short with long hair', 'Tall with short hair'], a: 1 },
        { q: 'What subject is Lucy good at?', o: ['Math', 'Science', 'English', 'History'], a: 2 }
      ]
    },
    {
      id: 3, title: 'The School Trip',
      passage: 'Class 7 went on a school trip to the science museum. They saw many interesting things. '
        + 'The guide showed them robots and space models. Everyone learned a lot.',
      questions: [
        { q: 'Where did Class 7 go?', o: ['Zoo', 'Science museum', 'Art gallery', 'Park'], a: 1 },
        { q: 'What did they see?', o: ['Animals', 'Paintings', 'Robots and space models', 'Plants'], a: 2 }
      ]
    },
    {
      id: 4, title: 'Healthy Eating',
      passage: 'Eating healthy food is very important. You should eat more vegetables and fruits. '
        + 'Try to drink water instead of cola. A balanced diet makes you strong and healthy.',
      questions: [
        { q: 'What should you eat more?', o: ['Candy', 'Vegetables and fruits', 'Chips', 'Ice cream'], a: 1 },
        { q: 'What should you drink instead of cola?', o: ['Juice', 'Milk', 'Water', 'Coffee'], a: 2 }
      ]
    }
  ],

  generateSession: function (unitId, total) {
    var words = [];
    var grammar = [];
    if (typeof Grade7Data !== 'undefined') {
      if (unitId) {
        var unit = Grade7Data.getUnitById(unitId);
        if (unit) {
          words = unit.words || [];
          grammar = unit.grammar || [];
        }
      } else {
        words = Grade7Data.getAllWords();
        grammar = Grade7Data.getAllGrammar();
      }
    }

    var vocabCount = Math.ceil(total / 3);
    var grammarCount = Math.ceil(total / 3);
    var readingCount = total - vocabCount - grammarCount;

    var vocabQuestions = this._buildVocabQuestions(words, vocabCount);
    var grammarQuestions = this._buildGrammarQuestions(grammar, grammarCount);
    var readingQuestions = this._buildReadingQuestions(readingCount);

    var allQuestions = vocabQuestions.concat(grammarQuestions, readingQuestions);
    allQuestions = this._shuffle(allQuestions);

    this.state = {
      questions: allQuestions,
      currentIndex: 0,
      score: { vocab: { correct: 0, total: 0 }, grammar: { correct: 0, total: 0 }, reading: { correct: 0, total: 0 } },
      answered: false,
      total: allQuestions.length
    };

    return this.state;
  },

  _buildVocabQuestions: function (words, count) {
    if (words.length === 0) return [];
    var shuffled = this._shuffle(words);
    var result = [];
    for (var i = 0; i < Math.min(count, shuffled.length); i++) {
      var w = shuffled[i];
      result.push({
        type: 'vocab',
        category: 'vocab',
        id: w.id,
        word: w.w,
        q: w.m + ' 的英文是？',
        answer: w.w,
        options: this._generateVocabOptions(w, shuffled),
        data: w
      });
    }
    return result;
  },

  _generateVocabOptions: function (correct, allWords) {
    var pool = allWords.filter(function (w) { return w.id !== correct.id; });
    var distractors = [];
    for (var i = 0; i < Math.min(3, pool.length); i++) {
      distractors.push(pool[i].w);
    }
    distractors.push(correct.w);
    return this._shuffle(distractors);
  },

  _buildGrammarQuestions: function (grammar, count) {
    if (grammar.length === 0) return [];
    var shuffled = this._shuffle(grammar);
    var result = [];
    for (var i = 0; i < Math.min(count, shuffled.length); i++) {
      var g = shuffled[i];
      result.push({
        type: 'grammar',
        category: 'grammar',
        id: g.id,
        word: g.title,
        q: g.title + ' - 选出正确的描述：',
        answer: g.concept,
        options: this._generateGrammarOptions(g.concept, shuffled, i),
        data: g
      });
    }
    return result;
  },

  _generateGrammarOptions: function (correct, allGrammar, currentIdx) {
    var pool = [];
    for (var i = 0; i < allGrammar.length; i++) {
      if (i !== currentIdx) pool.push(allGrammar[i].concept);
    }
    var distractors = pool.slice(0, 3);
    distractors.push(correct);
    return this._shuffle(distractors);
  },

  _buildReadingQuestions: function (count) {
    var result = [];
    var usedReadings = this._shuffle(this._mockReadingPassages);
    for (var i = 0; i < Math.min(count, usedReadings.length * 2); i++) {
      var passageIdx = Math.floor(i / 2) % usedReadings.length;
      var qIdx = i % 2;
      var reading = usedReadings[passageIdx];
      if (qIdx < reading.questions.length) {
        var rq = reading.questions[qIdx];
        result.push({
          type: 'reading',
          category: 'reading',
          id: 'r' + reading.id + '_' + qIdx,
          word: reading.title,
          q: rq.q,
          answer: rq.o[rq.a],
          options: rq.o,
          data: reading
        });
      }
    }
    return result;
  },

  renderQuestion: function () {
    if (!this.state || this.state.currentIndex >= this.state.total) {
      return this.renderSummary();
    }

    var q = this.state.questions[this.state.currentIndex];
    var html = '';

    html += '<div class="interleaved-practice-container">';
    html += '<div class="d-flex justify-content-between mb-3">';
    html += '<span class="badge" style="background:' + this._getTypeColor(q.type) + ';color:#fff;">'
      + this._getTypeLabel(q.type) + '</span>';
    html += '<span class="text-muted">' + (this.state.currentIndex + 1) + '/' + this.state.total + '</span>';
    html += '</div>';

    if (q.type === 'reading') {
      html += '<div class="card mb-3"><div class="card-header">📖 ' + q.data.title + '</div>';
      html += '<div class="card-body"><p>' + q.data.passage + '</p></div></div>';
    }

    html += '<h5 class="mb-3">' + q.q + '</h5>';
    html += '<div class="d-grid gap-2">';
    for (var i = 0; i < q.options.length; i++) {
      html += '<button class="btn btn-outline-primary text-start interleaved-option" ';
      html += 'onclick="InterleavedPractice.handleAnswer(' + i + ', this)" ';
      html += 'data-idx="' + i + '">' + q.options[i] + '</button>';
    }
    html += '</div>';

    html += '<div id="interleaved-feedback" class="mt-3"></div>';
    html += '</div>';

    return html;
  },

  handleAnswer: function (selectedIdx, btnEl) {
    if (!this.state || this.state.answered) return;
    this.state.answered = true;

    var q = this.state.questions[this.state.currentIndex];
    var correctAnswer = q.answer;
    var userAnswer = q.options[selectedIdx];
    var isCorrect = userAnswer === correctAnswer;

    this.state.score[q.category].total += 1;
    if (isCorrect) {
      this.state.score[q.category].correct += 1;
    }

    var buttons = document.querySelectorAll('.interleaved-option');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].disabled = true;
      buttons[i].classList.remove('btn-outline-primary');
      if (q.options[i] === correctAnswer) {
        buttons[i].classList.add('btn-success');
      } else if (i === selectedIdx && !isCorrect) {
        buttons[i].classList.add('btn-danger');
      }
    }

    var feedback = document.getElementById('interleaved-feedback');
    if (feedback) {
      feedback.innerHTML = isCorrect
        ? '<div class="alert alert-success">✅ 正确！</div>'
        : '<div class="alert alert-danger">❌ 正确答案是：<strong>' + correctAnswer + '</strong></div>';
    }

    var self = this;
    setTimeout(function () {
      self.state.currentIndex += 1;
      self.state.answered = false;
      var container = document.querySelector('.interleaved-practice-container');
      if (container && container.parentElement) {
        container.parentElement.innerHTML = self.renderQuestion();
      }
    }, 1500);
  },

  renderSummary: function () {
    var s = this.state;
    var vocabAcc = s.score.vocab.total > 0
      ? Math.round(s.score.vocab.correct / s.score.vocab.total * 100) : 0;
    var grammarAcc = s.score.grammar.total > 0
      ? Math.round(s.score.grammar.correct / s.score.grammar.total * 100) : 0;
    var readingAcc = s.score.reading.total > 0
      ? Math.round(s.score.reading.correct / s.score.reading.total * 100) : 0;
    var totalCorrect = s.score.vocab.correct + s.score.grammar.correct + s.score.reading.correct;
    var totalAll = s.total;
    var overallAcc = totalAll > 0 ? Math.round(totalCorrect / totalAll * 100) : 0;

    var html = '';
    html += '<div class="text-center p-4">';
    html += '<h4>📊 交错练习完成！</h4>';
    html += '<p class="mb-4">总分：' + totalCorrect + '/' + totalAll + ' (' + overallAcc + '%)</p>';

    html += '<div class="card mb-3"><div class="card-body">';
    html += '<h5>📝 单词：' + s.score.vocab.correct + '/' + s.score.vocab.total + ' (' + vocabAcc + '%)</h5>';
    html += '<h5>📚 语法：' + s.score.grammar.correct + '/' + s.score.grammar.total + ' (' + grammarAcc + '%)</h5>';
    html += '<h5>📖 阅读：' + s.score.reading.correct + '/' + s.score.reading.total + ' (' + readingAcc + '%)</h5>';
    html += '</div></div>';

    html += '<button class="btn btn-primary" onclick="InterleavedPractice.generateSession(null,' + s.total + ');'
      + 'document.getElementById(\'interleaved-practice-area\').innerHTML=InterleavedPractice.renderQuestion();">🔄 重新练习</button>';
    html += '</div>';

    return html;
  },

  _getTypeColor: function (type) {
    if (type === 'vocab') return '#3b82f6';
    if (type === 'grammar') return '#f59e0b';
    if (type === 'reading') return '#10b981';
    return '#6b7280';
  },

  _getTypeLabel: function (type) {
    if (type === 'vocab') return '单词';
    if (type === 'grammar') return '语法';
    if (type === 'reading') return '阅读';
    return '未知';
  }
};

window.InterleavedPractice = InterleavedPractice;
