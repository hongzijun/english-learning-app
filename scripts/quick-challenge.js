// Quick Challenge - 60秒速答小游戏
// Timed word quiz challenge with scoring and streak tracking

var QuickChallenge = {
  STORAGE_KEY: 'quick_challenge_data',
  data: null,
  state: null,
  timerInterval: null,
  endTime: null,

  init: function () {
    this.data = this.loadData();
  },

  loadData: function () {
    try {
      var stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) { }
    return { bestScore: 0, bestCorrect: 0, bestStreak: 0, totalPlayed: 0 };
  },

  saveData: function () {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) { }
  },

  start: function (container) {
    if (!container) return;
    var allWords = typeof Grade7Data !== 'undefined' ? Grade7Data.getAllWords() : [];
    if (allWords.length < 4) {
      container.innerHTML = '<p style="text-align:center;color:#ef4444;padding:2rem;">单词数据不足，需要至少4个单词</p>';
      return;
    }

    // Clear any existing timer
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    this.state = {
      words: this.shuffleArray(allWords),
      currentIndex: 0,
      correct: 0,
      wrong: 0,
      streak: 0,
      bestStreak: 0,
      duration: 60,
      answered: 0,
      startTime: Date.now()
    };

    // Calculate end time using Date.now() for accurate countdown
    this.endTime = Date.now() + this.state.duration * 1000;

    this.render(container);
    this.startTimer(container);
  },

  shuffleArray: function (arr) {
    var shuffled = arr.slice();
    for (var i = shuffled.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = shuffled[i];
      shuffled[i] = shuffled[j];
      shuffled[j] = temp;
    }
    return shuffled;
  },

  // Use Date.now() difference for accurate countdown
  startTimer: function (container) {
    var self = this;
    this.timerInterval = setInterval(function () {
      var now = Date.now();
      var elapsed = Math.floor((now - self.state.startTime) / 1000);
      var remaining = self.state.duration - elapsed;

      if (remaining <= 0) {
        remaining = 0;
        self.end(container);
        return;
      }

      self.state.timeLeft = remaining;
      self.updateTimer(container);
    }, 250); // Check every 250ms for responsive display
  },

  updateTimer: function (container) {
    var timerEl = container.querySelector('#challengeTimer');
    var streakEl = container.querySelector('#challengeStreak');
    if (timerEl) {
      var t = this.state.timeLeft !== undefined ? this.state.timeLeft : this.state.duration;
      timerEl.textContent = t + 's';
      if (t <= 10) {
        timerEl.style.color = '#ef4444';
      } else if (t <= 20) {
        timerEl.style.color = '#f59e0b';
      } else {
        timerEl.style.color = '#10b981';
      }
    }
    if (streakEl) {
      streakEl.textContent = this.state.streak > 0 ? ' 连击 ' + this.state.streak : '';
    }
  },

  render: function (container) {
    if (!container) return;
    var word = this.state.words[this.state.currentIndex % this.state.words.length];
    var allWords = typeof Grade7Data !== 'undefined' ? Grade7Data.getAllWords() : [];

    var options = [word.m];
    var wrongWords = allWords.filter(function (w) { return w.id !== word.id; });
    wrongWords = this.shuffleArray(wrongWords);
    for (var i = 0; i < 3 && i < wrongWords.length; i++) {
      options.push(wrongWords[i].m);
    }
    options = this.shuffleArray(options);

    var tl = this.state.timeLeft !== undefined ? this.state.timeLeft : this.state.duration;
    var timerColor = tl <= 10 ? '#ef4444' : tl <= 20 ? '#f59e0b' : '#10b981';

    var html =
      '<div style="max-width:600px;margin:0 auto;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;">' +
      '<span id="challengeTimer" style="font-size:1.5rem;font-weight:700;color:' + timerColor + ';">' + tl + 's</span>' +
      '<span id="challengeStreak" style="font-size:0.9rem;color:#f59e0b;">' + (this.state.streak > 0 ? ' 连击 ' + this.state.streak : '') + '</span>' +
      '<span style="font-size:0.9rem;color:#6b7280;">答对: <span id="challengeCorrect">' + this.state.correct + '</span></span>' +
      '</div>' +
      '<div style="text-align:center;margin-bottom:2rem;">' +
      '<div style="font-size:2rem;font-weight:700;color:#1f2937;margin-bottom:0.5rem;">' + this.escapeHtml(word.w) + '</div>' +
      '<div style="font-size:0.9rem;color:#6b7280;">' + this.escapeHtml(word.p || '') + '</div>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;" id="challengeOptions">';

    for (var j = 0; j < options.length; j++) {
      html += '<button class="challenge-option-btn" data-answer="' + this.escapeHtml(options[j]) + '" ' +
        'style="padding:1rem;border:2px solid #e5e7eb;border-radius:10px;background:white;cursor:pointer;' +
        'font-size:1rem;transition:all 0.2s ease;text-align:center;">' + this.escapeHtml(options[j]) + '</button>';
    }

    html += '</div></div>';
    container.innerHTML = html;

    var self = this;
    var btns = container.querySelectorAll('.challenge-option-btn');
    for (var k = 0; k < btns.length; k++) {
      btns[k].addEventListener('click', function () {
        if (this.disabled) return;
        self.answer(this.getAttribute('data-answer'), word.m, container);
      });
    }
  },

  escapeHtml: function (str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  },

  answer: function (selected, correct, container) {
    if (!container) return;
    var btns = container.querySelectorAll('.challenge-option-btn');
    for (var i = 0; i < btns.length; i++) {
      btns[i].disabled = true;
      if (btns[i].getAttribute('data-answer') === correct) {
        btns[i].style.background = '#dcfce7';
        btns[i].style.borderColor = '#22c55e';
      } else if (btns[i].getAttribute('data-answer') === selected && selected !== correct) {
        btns[i].style.background = '#fee2e2';
        btns[i].style.borderColor = '#ef4444';
      }
    }

    if (selected === correct) {
      this.state.correct++;
      this.state.streak++;
      if (this.state.streak > this.state.bestStreak) this.state.bestStreak = this.state.streak;
      if (typeof AudioSystem !== 'undefined') AudioSystem.playCorrect();
      if (typeof XPSystem !== 'undefined') XPSystem.rewardVocabCorrect();
      if (typeof DailyCalendar !== 'undefined') DailyCalendar.recordActivity(null, 0.1);
      if (typeof EncouragementSystem !== 'undefined') EncouragementSystem.onCorrectAnswer(this.state.streak);
    } else {
      this.state.wrong++;
      this.state.streak = 0;
      if (typeof AudioSystem !== 'undefined') AudioSystem.playWrong();
    }
    this.state.answered++;

    var scoreEl = container.querySelector('#challengeCorrect');
    if (scoreEl) scoreEl.textContent = this.state.correct;
    var streakEl = container.querySelector('#challengeStreak');
    if (streakEl) streakEl.textContent = this.state.streak > 0 ? ' 连击 ' + this.state.streak : '';

    var self = this;
    setTimeout(function () {
      self.state.currentIndex++;
      self.render(container);
    }, 500);
  },

  end: function (container) {
    if (!container) return;

    // Clear timer
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    var accuracy = this.state.answered > 0 ? Math.round((this.state.correct / this.state.answered) * 100) : 0;
    var isNewRecord = this.state.correct > this.data.bestCorrect;

    if (isNewRecord) {
      this.data.bestCorrect = this.state.correct;
      this.data.bestScore = this.state.correct * 10;
      this.data.bestStreak = Math.max(this.data.bestStreak, this.state.bestStreak);
    }
    this.data.totalPlayed++;
    this.saveData();

    if (typeof XPSystem !== 'undefined') {
      XPSystem.addXP('quickChallenge', this.state.correct * 10);
    }

    var html =
      '<div style="max-width:500px;margin:0 auto;text-align:center;">' +
      '<div style="font-size:3rem;margin-bottom:1rem;">' + (isNewRecord ? '' : '') + '</div>' +
      '<div style="font-size:1.5rem;font-weight:700;color:#1f2937;margin-bottom:1rem;"> 挑战结束！</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;margin-bottom:1.5rem;">' +
      '<div style="background:#f0fdf4;border-radius:10px;padding:1rem;">' +
      '<div style="font-size:2rem;font-weight:700;color:#16a34a;">' + this.state.correct + '</div>' +
      '<div style="font-size:0.8rem;color:#6b7280;">答对</div>' +
      '</div>' +
      '<div style="background:#eff6ff;border-radius:10px;padding:1rem;">' +
      '<div style="font-size:2rem;font-weight:700;color:#2563eb;">' + accuracy + '%</div>' +
      '<div style="font-size:0.8rem;color:#6b7280;">正确率</div>' +
      '</div>' +
      '<div style="background:#fef3c7;border-radius:10px;padding:1rem;">' +
      '<div style="font-size:2rem;font-weight:700;color:#d97706;">' + this.state.bestStreak + '</div>' +
      '<div style="font-size:0.8rem;color:#6b7280;">最高连击</div>' +
      '</div>' +
      '</div>';

    if (isNewRecord) {
      html += '<div style="background:linear-gradient(135deg,#f59e0b,#ef4444);color:white;border-radius:10px;padding:0.75rem;margin-bottom:1rem;font-weight:600;"> 新纪录！</div>';
    } else {
      html += '<div style="font-size:0.85rem;color:#6b7280;margin-bottom:1rem;">历史最佳: 答对 ' + this.data.bestCorrect + ' 题</div>';
    }

    html += '<button id="retryChallenge" style="padding:0.75rem 2rem;background:linear-gradient(135deg,#667eea,#764ba2);color:white;' +
      'border:none;border-radius:8px;cursor:pointer;font-size:1rem;font-weight:600;margin-right:0.5rem;">再来一次</button>' +
      '<button id="backChallenge" style="padding:0.75rem 2rem;background:#e5e7eb;color:#374151;' +
      'border:none;border-radius:8px;cursor:pointer;font-size:1rem;">返回</button>';

    html += '</div>';
    container.innerHTML = html;

    if (isNewRecord && typeof Celebration !== 'undefined') {
      Celebration.celebrateWordMastered();
    }

    var self = this;
    var retryBtn = document.getElementById('retryChallenge');
    if (retryBtn) retryBtn.addEventListener('click', function () { self.start(container); });
    var backBtn = document.getElementById('backChallenge');
    if (backBtn) backBtn.addEventListener('click', function () {
      if (typeof App !== 'undefined') App.loadModule('smart-words');
    });
  },

  renderEntry: function (container) {
    if (!container) return;
    var html =
      '<div style="background:linear-gradient(135deg,#667eea,#764ba2);color:white;border-radius:12px;padding:1.5rem;cursor:pointer;' +
      'transition:transform 0.2s,box-shadow 0.2s;box-shadow:0 4px 15px rgba(102,126,234,0.3);" ' +
      'id="quickChallengeEntry">' +
      '<div style="display:flex;align-items:center;gap:1rem;">' +
      '<span style="font-size:2.5rem;"> </span>' +
      '<div>' +
      '<div style="font-size:1.1rem;font-weight:700;margin-bottom:0.25rem;">60秒速答挑战</div>' +
      '<div style="font-size:0.8rem;opacity:0.8;">限时单词速答 · 看英文选中文</div>' +
      (this.data.bestCorrect > 0 ? '<div style="font-size:0.75rem;opacity:0.7;margin-top:0.25rem;">历史最佳: 答对 ' + this.data.bestCorrect + ' 题</div>' : '') +
      '</div>' +
      '</div>' +
      '</div>';
    container.innerHTML = html;

    var self = this;
    var entryEl = document.getElementById('quickChallengeEntry');
    if (entryEl) {
      entryEl.addEventListener('click', function () {
        var mainContent = document.getElementById('moduleContent') || document.getElementById('mainContent');
        self.start(mainContent);
      });
    }
  },

  reset: function () {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.data = { bestScore: 0, bestCorrect: 0, bestStreak: 0, totalPlayed: 0 };
    this.saveData();
  }
};
