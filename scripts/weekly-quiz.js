// Weekly Quiz - 每周测验系统
// Auto-generated weekly quiz with progress tracking and reports

var WeeklyQuiz = {
  STORAGE_KEY: 'weekly_quiz_results',
  MIN_INTERVAL_DAYS: 7,
  QUESTION_COUNT: 15,
  questions: [],
  state: null,
  container: null,
  results: null,

  init: function () {
    this.results = this.loadResults();
  },

  loadResults: function () {
    try {
      var stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  },

  saveResults: function () {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.results));
    } catch (e) { }
  },

  checkAndPrompt: function () {
    if (this.results.length === 0) {
      this.showPrompt();
      return true;
    }

    var last = this.results[this.results.length - 1];
    var daysSince = (Date.now() - last.date) / (1000 * 60 * 60 * 24);
    if (daysSince >= this.MIN_INTERVAL_DAYS) {
      this.showPrompt();
      return true;
    }

    return false;
  },

  showPrompt: function () {
    var self = this;
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;';

    var box = document.createElement('div');
    box.style.cssText = 'background:#fff;border-radius:16px;padding:2rem;max-width:400px;width:90%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.3);';

    box.innerHTML = '<div style="font-size:3rem;margin-bottom:0.5rem;">📋</div>' +
      '<h2 style="margin:0 0 0.5rem;">本周测验准备好了！</h2>' +
      '<p style="color:#6b7280;margin:0 0 1.2rem;font-size:0.9rem;">测测本周的学习成果，' + this.QUESTION_COUNT + '道题帮你查漏补缺 🎯</p>' +
      '<div style="display:flex;gap:0.5rem;justify-content:center;">' +
      '<button id="wqLaterBtn" style="padding:0.6rem 1.2rem;border:1px solid #d1d5db;border-radius:8px;background:#fff;cursor:pointer;">稍后再说</button>' +
      '<button id="wqStartBtn" style="padding:0.6rem 1.2rem;border:none;border-radius:8px;background:#3b82f6;color:#fff;cursor:pointer;font-weight:600;">开始测验！</button>' +
      '</div>';

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) overlay.remove();
    });

    document.getElementById('wqLaterBtn').addEventListener('click', function () { overlay.remove(); });
    document.getElementById('wqStartBtn').addEventListener('click', function () {
      overlay.remove();
      var container = document.getElementById('moduleContent') || document.body;
      self.start(container);
    });
  },

  generate: function () {
    var self = this;
    this.questions = [];

    var allWords = typeof Grade7Data !== 'undefined' ? Grade7Data.getAllWords() : [];
    var allExercises = typeof Grade7Data !== 'undefined' ? Grade7Data.getAllExercises() : [];

    if (allWords.length === 0 && allExercises.length === 0) return;

    var weekWords = [];
    var weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    if (typeof MemoryTracker !== 'undefined' && MemoryTracker._loadData) {
      var memData = MemoryTracker._loadData();
      var wordIds = Object.keys(memData);
      for (var i = 0; i < wordIds.length; i++) {
        var tests = memData[wordIds[i]].tests || [];
        for (var j = tests.length - 1; j >= 0; j--) {
          if (tests[j].date >= weekAgo) {
            var wid = parseInt(wordIds[i]);
            for (var k = 0; k < allWords.length; k++) {
              if (allWords[k].id === wid) {
                weekWords.push(allWords[k]);
                break;
              }
            }
            break;
          }
        }
      }
    }

    var mistakeWords = [];
    if (typeof Storage !== 'undefined' && Storage.get) {
      var mistakes = Storage.get('mistakes') || [];
      for (var m = 0; m < mistakes.length; m++) {
        var mWord = mistakes[m].word;
        if (mWord) mistakeWords.push(mWord);
      }
    }

    var weekCount = Math.round(this.QUESTION_COUNT * 0.4);
    var mistakeCount = Math.round(this.QUESTION_COUNT * 0.3);
    var randomCount = this.QUESTION_COUNT - weekCount - mistakeCount;

    var addedIds = {};

    for (var w = 0; w < Math.min(weekCount, weekWords.length); w++) {
      var q = self.makeWordQuestion(weekWords[w]);
      if (q) { self.questions.push(q); addedIds[weekWords[w].id] = true; }
    }

    var mistakePool = [];
    for (var mm = 0; mm < allWords.length; mm++) {
      for (var n = 0; n < mistakeWords.length; n++) {
        if (allWords[mm].w === mistakeWords[n] && !addedIds[allWords[mm].id]) {
          mistakePool.push(allWords[mm]);
          break;
        }
      }
    }
    if (mistakePool.length > 0) {
      self.shuffle(mistakePool);
      for (var mp = 0; mp < Math.min(mistakeCount, mistakePool.length); mp++) {
        var q2 = self.makeWordQuestion(mistakePool[mp]);
        if (q2) { self.questions.push(q2); addedIds[mistakePool[mp].id] = true; }
      }
    }

    var remaining = [];
    for (var r = 0; r < allWords.length; r++) {
      if (!addedIds[allWords[r].id]) remaining.push(allWords[r]);
    }
    self.shuffle(remaining);
    for (var rr = 0; rr < Math.min(randomCount, remaining.length); rr++) {
      var q3 = self.makeWordQuestion(remaining[rr]);
      if (q3) self.questions.push(q3);
    }

    if (this.questions.length < this.QUESTION_COUNT && allExercises.length > 0) {
      self.shuffle(allExercises);
      for (var e = 0; e < Math.min(this.QUESTION_COUNT - this.questions.length, allExercises.length); e++) {
        self.questions.push(self.makeExerciseQuestion(allExercises[e]));
      }
    }
  },

  shuffle: function (arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = arr[i];
      arr[i] = arr[j];
      arr[j] = temp;
    }
  },

  makeWordQuestion: function (word) {
    if (!word || !word.w || !word.m) return null;
    var vocab = word.w;
    var meaning = word.m;
    return { wordId: word.id, question: '"' + vocab + '" 的中文意思是？', answer: meaning, type: 'word', kgPoint: word.kgPoint || '' };
  },

  makeExerciseQuestion: function (ex) {
    return {
      exerciseId: ex.id,
      question: ex.q || '',
      options: ex.o || null,
      answer: ex.type === 'choice' && ex.o ? ex.o[ex.a] : (ex.a || ''),
      type: ex.type || 'choice',
      kgPoint: ex.kp || ''
    };
  },

  start: function (container) {
    var self = this;
    this.container = container;
    if (!container) return;

    this.generate();

    if (this.questions.length === 0) {
      container.innerHTML = '<p style="text-align:center;color:#ef4444;padding:2rem;">暂无足够的题目来生成测验，请先学习一些单词！</p>';
      return;
    }

    var count = Math.min(this.QUESTION_COUNT, this.questions.length);
    this.state = {
      currentIndex: 0,
      correct: 0,
      answers: [],
      total: count,
      startTime: Date.now()
    };

    this.renderQuestion();
  },

  renderQuestion: function () {
    var self = this;
    var container = this.container;
    if (!container) return;
    var s = this.state;
    var q = this.questions[s.currentIndex];

    var html = '<div style="max-width:600px;margin:0 auto;padding:1.5rem;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">' +
      '<span style="font-weight:600;"> 第 ' + (s.currentIndex + 1) + '/' + s.total + ' 题</span>' +
      '<span style="color:#6b7280;font-size:0.85rem;">✅ ' + s.correct + ' / ❌ ' + (s.currentIndex - s.correct) + '</span></div>' +
      '<div style="background:#f9fafb;border-radius:12px;padding:1.5rem;margin-bottom:1rem;">' +
      '<p style="font-size:1.1rem;margin:0 0 1rem;">' + q.question + '</p>';

    if (q.type === 'word') {
      html += '<input type="text" id="wqAnswer" placeholder="输入中文意思..." style="width:100%;padding:0.7rem;border:1px solid #d1d5db;border-radius:8px;font-size:1rem;box-sizing:border-box;">';
    } else if (q.options && q.options.length > 0) {
      html += '<div style="display:flex;flex-direction:column;gap:0.5rem;">';
      for (var i = 0; i < q.options.length; i++) {
        html += '<button class="wqOptionBtn" data-idx="' + i + '" style="text-align:left;padding:0.7rem 1rem;border:1px solid #d1d5db;border-radius:8px;background:#fff;cursor:pointer;font-size:0.95rem;transition:all 0.2s;">' + String.fromCharCode(65 + i) + '. ' + q.options[i] + '</button>';
      }
      html += '</div>';
    } else {
      html += '<input type="text" id="wqAnswer" placeholder="输入答案..." style="width:100%;padding:0.7rem;border:1px solid #d1d5db;border-radius:8px;font-size:1rem;box-sizing:border-box;">';
    }

    html += '</div><button id="wqSubmitBtn" style="width:100%;padding:0.75rem;border:none;border-radius:10px;background:#3b82f6;color:#fff;cursor:pointer;font-size:1rem;font-weight:600;">提交答案</button>' +
      '<div id="wqFeedback" style="margin-top:1rem;text-align:center;"></div></div>';

    container.innerHTML = html;

    var submitBtn = document.getElementById('wqSubmitBtn');
    submitBtn.addEventListener('click', function () { self.handleAnswer(); });

    var optionBtns = container.querySelectorAll('.wqOptionBtn');
    for (var j = 0; j < optionBtns.length; j++) {
      optionBtns[j].addEventListener('click', function () {
        var prev = container.querySelector('.wqOptionBtn.selected');
        if (prev) { prev.style.background = '#fff'; prev.style.borderColor = '#d1d5db'; prev.classList.remove('selected'); }
        this.style.background = '#eff6ff';
        this.style.borderColor = '#3b82f6';
        this.classList.add('selected');
      });
    }

    var answerInput = document.getElementById('wqAnswer');
    if (answerInput) {
      answerInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') self.handleAnswer();
      });
    }
  },

  handleAnswer: function () {
    var s = this.state;
    var q = this.questions[s.currentIndex];

    var userAnswer = '';
    if (q.options && q.options.length > 0) {
      var selected = this.container.querySelector('.wqOptionBtn.selected');
      if (selected) userAnswer = q.options[parseInt(selected.getAttribute('data-idx'))];
    } else {
      var input = document.getElementById('wqAnswer');
      if (input) userAnswer = input.value;
    }

    var isCorrect = false;
    if (q.type === 'word') {
      isCorrect = userAnswer && q.answer && (userAnswer.trim() === q.answer.trim() || q.answer.includes(userAnswer.trim()));
    } else {
      isCorrect = userAnswer && q.answer && userAnswer.trim().toLowerCase() === q.answer.trim().toLowerCase();
    }

    if (isCorrect) s.correct++;
    s.answers.push({ questionIndex: s.currentIndex, userAnswer: userAnswer, correct: isCorrect });
    s.currentIndex++;

    var feedback = document.getElementById('wqFeedback');
    if (feedback) {
      feedback.innerHTML = isCorrect
        ? '<p style="color:#10b981;font-weight:600;">✅ 正确！</p>'
        : '<p style="color:#ef4444;">❌ 正确答案：<strong>' + q.answer + '</strong></p>';
    }

    if (s.currentIndex >= s.total) {
      var score = s.correct;
      var total = s.total;
      var accuracy = Math.round((score / total) * 100);
      var weekNum = this.results.length + 1;

      var weaknesses = [];
      for (var i = 0; i < s.answers.length; i++) {
        if (!s.answers[i].correct && this.questions[s.answers[i].questionIndex]) {
          weaknesses.push(this.questions[s.answers[i].questionIndex].kgPoint || 'unknown');
        }
      }

      this.results.push({
        date: Date.now(),
        score: score,
        total: total,
        accuracy: accuracy,
        weaknesses: weaknesses,
        weekNumber: weekNum
      });
      this.saveResults();

      setTimeout(function () {
        self.renderReport();
      }, 800);
    } else {
      setTimeout(function () {
        self.renderQuestion();
      }, 800);
    }
  },

  renderReport: function () {
    var container = this.container;
    if (!container) return;
    var last = this.results[this.results.length - 1];
    if (!last) return;

    var trendHtml = '';
    var recent = this.results.slice(-4);
    for (var i = 0; i < recent.length; i++) {
      trendHtml += '<span style="padding:0.3rem 0.6rem;background:#eff6ff;border-radius:6px;font-size:0.85rem;">W' + recent[i].weekNumber + ': ' + recent[i].accuracy + '%</span>';
    }

    var weaknessHtml = '';
    var uniqueWeak = {};
    for (var j = 0; j < (last.weaknesses || []).length; j++) {
      uniqueWeak[last.weaknesses[j]] = (uniqueWeak[last.weaknesses[j]] || 0) + 1;
    }
    var weakKeys = Object.keys(uniqueWeak);
    for (var k = 0; k < Math.min(weakKeys.length, 5); k++) {
      weaknessHtml += '<span style="display:inline-block;padding:0.3rem 0.6rem;background:#fee2e2;border-radius:6px;font-size:0.85rem;margin:0.15rem;">' + weakKeys[k] + ' (' + uniqueWeak[weakKeys[k]] + 'x)</span>';
    }
    if (!weaknessHtml) weaknessHtml = '<span style="color:#9ca3af;">暂无薄弱点</span>';

    var suggestion = '';
    if (last.accuracy >= 90) {
      suggestion = ' 表现优异！建议挑战更高难度的内容，保持学习节奏。';
    } else if (last.accuracy >= 70) {
      suggestion = ' 表现不错！重点复习薄弱知识点，争取下周更好。';
    } else {
      suggestion = ' 需要加油！建议每天多花10分钟复习错题，稳步提升。';
    }

    container.innerHTML = '<div style="max-width:600px;margin:0 auto;padding:1.5rem;text-align:center;">' +
      '<div style="font-size:3rem;margin-bottom:0.5rem;">📊</div>' +
      '<h2 style="margin:0 0 0.5rem;">第 ' + last.weekNumber + ' 周测验报告</h2>' +
      '<div style="font-size:2.5rem;font-weight:700;color:' + (last.accuracy >= 70 ? '#10b981' : '#f59e0b') + ';margin:0.5rem 0;">' + last.score + '/' + last.total + '</div>' +
      '<p style="color:#6b7280;margin:0 0 1rem;">正确率：' + last.accuracy + '%</p>' +
      '<div style="margin-bottom:1rem;"><strong>趋势</strong><div style="display:flex;gap:0.4rem;justify-content:center;margin-top:0.5rem;flex-wrap:wrap;">' + trendHtml + '</div></div>' +
      '<div style="margin-bottom:1rem;"><strong>薄弱知识点</strong><div style="margin-top:0.5rem;">' + weaknessHtml + '</div></div>' +
      '<div style="background:#f0fdf4;border-radius:10px;padding:1rem;margin-bottom:1rem;text-align:left;">' +
      '<strong> 下周建议</strong><p style="margin:0.5rem 0 0;font-size:0.9rem;color:#374151;">' + suggestion + '</p></div>' +
      '<button id="wqCloseBtn" style="padding:0.6rem 1.5rem;border:none;border-radius:8px;background:#3b82f6;color:#fff;cursor:pointer;font-weight:600;">完成</button></div>';

    document.getElementById('wqCloseBtn').addEventListener('click', function () {
      container.innerHTML = '<p style="text-align:center;color:#6b7280;padding:2rem;">测验完成！继续加油学习吧 💪</p>';
    });
  }
};

window.WeeklyQuiz = WeeklyQuiz;
