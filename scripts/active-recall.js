var ActiveRecall = {
  version: '1.0.0',

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

  _getDistractors: function (word, allWords, count) {
    var pool = allWords.filter(function (w) { return w.id !== word.id; });
    var used = {};
    var result = [];
    var tries = 0;
    while (result.length < count && tries < 200 && pool.length > 0) {
      var ri = Math.floor(Math.random() * pool.length);
      if (!used[pool[ri].id]) {
        result.push(pool[ri]);
        used[pool[ri].id] = true;
      }
      tries++;
    }
    return result;
  },

  renderChineseToEnglish: function (word) {
    var html = '';
    html += '<div class="dragon-vocab-card" id="active-recall-text-card">';
    html += '<div class="dragon-vocab-header">';
    html += '<span class="dragon-vocab-progress">中译英 · 文本输入</span>';
    html += '<span class="dragon-vocab-phase">' + (word.w || '') + '</span>';
    html += '</div>';
    html += '<div class="dragon-word-display">' + (word.m || '') + '</div>';
    html += '<div class="text-muted text-center mb-2" style="font-size:0.85rem;">请写出对应的英文单词</div>';
    html += '<div class="dragon-input-row">';
    html += '<input type="text" class="dragon-vocab-input" id="activeRecallInput" placeholder="输入英文单词... Enter提交" autocomplete="off" autofocus>';
    html += '<button class="btn btn-primary dragon-vocab-submit" onclick="ActiveRecall._handleTextSubmit()">确认</button>';
    html += '</div>';
    html += '<div id="activeRecallFeedback" class="dragon-vocab-feedback"></div>';
    html += '<div class="text-muted text-center mt-2" style="font-size:0.75rem;">提示：Enter提交 · 前缀匹配（输入3个字母以上可模糊判定）</div>';
    html += '</div>';
    return html;
  },

  _handleTextSubmit: function () {
    var input = document.getElementById('activeRecallInput');
    var btn = document.querySelector('#active-recall-text-card .dragon-vocab-submit');
    if (!input || !btn) return;
    if (btn.disabled) return;
    var userInput = input.value.trim();
    if (!userInput) return;

    var wordWord = btn.getAttribute('data-word') || input.getAttribute('data-word') || '';
    var kgPoint = btn.getAttribute('data-kg') || 'vocab';
    var word = { w: wordWord, m: input.getAttribute('data-m') || '', kgPoint: kgPoint, id: parseInt(input.getAttribute('data-id') || '0') };

    var result = ActiveRecall.checkAnswer(word, userInput, 'text');
    var fb = document.getElementById('activeRecallFeedback');

    if (result.correct) {
      if (fb) fb.innerHTML = '<span style="color:#10b981;font-weight:600;"> 正确！' + result.answer + '</span>';
      btn.disabled = true;
      input.disabled = true;
    } else {
      if (fb) fb.innerHTML = '<span style="color:#ef4444;font-weight:600;"> 正确答案：<strong>' + result.answer + '</strong></span>';
      btn.disabled = true;
      input.disabled = true;
    }

    ActiveRecall.handleRecallResult(result.correct, word, 'text');
  },

  renderChineseToEnglishMC: function (word, allWords) {
    allWords = allWords || [];
    var distractors = this._getDistractors(word, allWords, 3);
    var options = [word].concat(distractors);
    options = this._shuffle(options);

    var correctIdx = -1;
    for (var i = 0; i < options.length; i++) {
      if (options[i].id === word.id) { correctIdx = i; break; }
    }

    var html = '';
    html += '<div class="dragon-vocab-card" id="active-recall-mc-card">';
    html += '<div class="dragon-vocab-header">';
    html += '<span class="dragon-vocab-progress">中译英 · 多项选择</span>';
    html += '<span class="dragon-vocab-phase">' + (word.w || '') + '</span>';
    html += '</div>';
    html += '<div class="dragon-word-display">' + (word.m || '') + '</div>';
    html += '<div class="text-muted text-center mb-2" style="font-size:0.85rem;">请选择对应的英文单词</div>';
    html += '<div class="dragon-options-grid">';

    var labels = ['A', 'B', 'C', 'D'];
    for (var j = 0; j < options.length; j++) {
      html += '<button class="dragon-vocab-opt active-recall-mc-opt" data-correct="' + (j === correctIdx ? '1' : '0') + '" data-word="' + options[j].w + '" data-kg="' + (word.kgPoint || 'vocab') + '">' + labels[j] + '. ' + options[j].w + '</button>';
    }

    html += '</div>';
    html += '<div id="activeRecallFeedback" class="dragon-vocab-feedback"></div>';
    html += '</div>';
    return html;
  },

  _handleMCClick: function (opt) {
    if (opt.classList.contains('answered')) return;
    opt.classList.add('answered');

    var isCorrect = opt.getAttribute('data-correct') === '1';
    var wordW = opt.getAttribute('data-word') || '';
    var kgPoint = opt.getAttribute('data-kg') || 'vocab';

    if (isCorrect) {
      opt.classList.add('dragon-opt-correct');
    } else {
      opt.classList.add('dragon-opt-wrong');
      var card = document.getElementById('active-recall-mc-card');
      if (card) {
        var correctOpt = card.querySelector('.active-recall-mc-opt[data-correct="1"]');
        if (correctOpt) correctOpt.classList.add('dragon-opt-correct');
      }
    }

    var fb = document.getElementById('activeRecallFeedback');
    if (!isCorrect && fb) {
      var correctOptEl = document.querySelector('#active-recall-mc-card .active-recall-mc-opt[data-correct="1"]');
      var correctText = correctOptEl ? correctOptEl.textContent.trim() : wordW;
      fb.innerHTML = '<span style="color:#ef4444;font-weight:600;"> 正确答案：<strong>' + correctText + '</strong></span>';
    }

    var word = { w: wordW, m: '', kgPoint: kgPoint, id: 0 };
    ActiveRecall.handleRecallResult(isCorrect, word, 'mc');
  },

  renderDictation: function (word) {
    var html = '';
    html += '<div class="dragon-vocab-card" id="active-recall-dictation-card">';
    html += '<div class="dragon-vocab-header">';
    html += '<span class="dragon-vocab-progress">拼写听写 · 默写模式</span>';
    html += '<span class="dragon-vocab-phase">' + (word.w || '') + '</span>';
    html += '</div>';
    html += '<div class="dragon-word-display">' + (word.m || '') + '</div>';
    html += '<div class="text-muted text-center mb-2" style="font-size:0.85rem;">根据中文意思，拼写出英文单词（无音频提示）</div>';
    html += '<div class="dragon-input-row">';
    html += '<input type="text" class="dragon-vocab-input" id="activeRecallInput" placeholder="默写英文单词..." autocomplete="off" autofocus>';
    html += '<button class="btn btn-primary dragon-vocab-submit" onclick="ActiveRecall._handleDictationSubmit()">提交</button>';
    html += '</div>';
    html += '<div id="activeRecallFeedback" class="dragon-vocab-feedback"></div>';
    html += '</div>';
    return html;
  },

  _handleDictationSubmit: function () {
    var input = document.getElementById('activeRecallInput');
    var btn = document.querySelector('#active-recall-dictation-card .dragon-vocab-submit');
    if (!input || !btn) return;
    if (btn.disabled) return;
    var userInput = input.value.trim();
    if (!userInput) return;

    var wordWord = btn.getAttribute('data-word') || input.getAttribute('data-word') || '';
    var kgPoint = btn.getAttribute('data-kg') || 'vocab';
    var wordId = parseInt(input.getAttribute('data-id') || '0');
    var word = { w: wordWord, m: '', kgPoint: kgPoint, id: wordId };

    var result = ActiveRecall.checkAnswer(word, userInput, 'dictation');
    var fb = document.getElementById('activeRecallFeedback');

    if (result.correct) {
      if (fb) fb.innerHTML = '<span style="color:#10b981;font-weight:600;"> 正确！' + result.answer + '</span>';
      btn.disabled = true;
      input.disabled = true;
    } else {
      if (fb) fb.innerHTML = '<span style="color:#ef4444;font-weight:600;"> 正确答案：<strong>' + result.answer + '</strong></span>';
      btn.disabled = true;
      input.disabled = true;
    }

    ActiveRecall.handleRecallResult(result.correct, word, 'dictation');
  },

  checkAnswer: function (word, userInput, mode) {
    var answer = word.w || '';
    var input = (userInput || '').trim();

    if (mode === 'text') {
      var exactMatch = input.toLowerCase() === answer.toLowerCase();
      var prefixMatch = input.length >= 3 && answer.toLowerCase().indexOf(input.toLowerCase()) === 0;
      return { correct: exactMatch || prefixMatch, answer: answer };
    }

    if (mode === 'mc') {
      return { correct: input.toLowerCase() === answer.toLowerCase(), answer: answer };
    }

    if (mode === 'dictation') {
      return { correct: input.toLowerCase() === answer.toLowerCase(), answer: answer };
    }

    return { correct: false, answer: answer };
  },

  renderRecallUI: function (mode, word, allWords) {
    if (mode === 'text') {
      return this.renderChineseToEnglish(word);
    }
    if (mode === 'mc') {
      return this.renderChineseToEnglishMC(word, allWords);
    }
    if (mode === 'dictation') {
      return this.renderDictation(word);
    }
    return '<p>未知模式: ' + mode + '</p>';
  },

  bindRecallUI: function (mode) {
    var self = this;

    if (mode === 'text') {
      var card = document.getElementById('active-recall-text-card');
      if (!card) return;
      var input = document.getElementById('activeRecallInput');
      var btn = card.querySelector('.dragon-vocab-submit');
      if (input && btn) {
        var wordW = btn.getAttribute('data-word') || '';
        var kgP = btn.getAttribute('data-kg') || 'vocab';
        var wordId = btn.getAttribute('data-id') || '';
        input.setAttribute('data-word', wordW);
        input.setAttribute('data-kg', kgP);
        input.setAttribute('data-id', wordId);
      }
      if (input) {
        input.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            self._handleTextSubmit();
          }
        });
      }
    }

    if (mode === 'mc') {
      var mcCard = document.getElementById('active-recall-mc-card');
      if (!mcCard) return;
      var opts = mcCard.querySelectorAll('.active-recall-mc-opt');
      for (var i = 0; i < opts.length; i++) {
        (function (opt) {
          opt.addEventListener('click', function () {
            self._handleMCClick(opt);
          });
        })(opts[i]);
      }
    }

    if (mode === 'dictation') {
      var dCard = document.getElementById('active-recall-dictation-card');
      if (!dCard) return;
      var dInput = document.getElementById('activeRecallInput');
      var dBtn = dCard.querySelector('.dragon-vocab-submit');
      if (dInput && dBtn) {
        var dWordW = dBtn.getAttribute('data-word') || '';
        var dKgP = dBtn.getAttribute('data-kg') || 'vocab';
        var dWordId = dBtn.getAttribute('data-id') || '';
        dInput.setAttribute('data-word', dWordW);
        dInput.setAttribute('data-kg', dKgP);
        dInput.setAttribute('data-id', dWordId);
      }
      if (dInput) {
        dInput.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            self._handleDictationSubmit();
          }
        });
      }
    }
  },

  handleRecallResult: function (isCorrect, word, mode) {
    var kgPoint = word.kgPoint || 'vocab';
    var wordId = word.id || 0;
    var wordW = word.w || '';

    try {
      if (typeof SpacedRepetition !== 'undefined') {
        if (typeof SpacedRepetition.createCard === 'function') {
          SpacedRepetition.createCard(wordId);
        }
        if (typeof SpacedRepetition.rateCard === 'function') {
          var quality = isCorrect ? 4 : 1;
          SpacedRepetition.rateCard(wordId, quality, 'cnen');
        }
      }
    } catch (e) { }

    try {
      if (!isCorrect && typeof MistakesModule !== 'undefined' && typeof MistakesModule.addMistake === 'function') {
        MistakesModule.addMistake({
          kg: kgPoint,
          q: '中译英: ' + (word.m || wordW),
          yourAnswer: '(错误)',
          correctAnswer: wordW,
          errorType: '知识型',
          id: 'recall_' + wordId + '_' + Date.now()
        });
      }
    } catch (e) { }

    try {
      if (!isCorrect && typeof Storage !== 'undefined' && typeof Storage.addMistake === 'function') {
        Storage.addMistake({
          kg: kgPoint,
          q: '主动回忆: ' + (word.m || wordW),
          yourAnswer: '(错误)',
          correctAnswer: wordW,
          errorType: '知识型',
          id: 'activer_' + wordId + '_' + Date.now()
        });
      }
    } catch (e) { }

    try {
      if (typeof AdaptiveEngine !== 'undefined' && typeof AdaptiveEngine.recordInteraction === 'function') {
        var quality = isCorrect ? 4 : 1;
        AdaptiveEngine.recordInteraction(kgPoint, isCorrect, quality, 0);
      }
    } catch (e) { }

    try {
      if (typeof window.MemoryTracker !== 'undefined' && typeof window.MemoryTracker.recordTest === 'function') {
        window.MemoryTracker.recordTest(wordId, isCorrect);
      }
    } catch (e) { }

    try {
      if (typeof window.EbbinghausScheduler !== 'undefined' && typeof window.EbbinghausScheduler.recordReview === 'function') {
        window.EbbinghausScheduler.recordReview(wordId, isCorrect, Date.now());
      }
    } catch (e) { }

    try {
      var stats = ActiveRecall._loadStats();
      stats.totalAttempts++;
      if (isCorrect) stats.correct++;
      stats.lastMode = mode;
      ActiveRecall._saveStats(stats);
    } catch (e) { }
  },

  _loadStats: function () {
    try {
      var raw = localStorage.getItem('active_recall_stats');
      if (raw) return JSON.parse(raw);
    } catch (e) { }
    return { totalAttempts: 0, correct: 0, lastMode: '' };
  },

  _saveStats: function (stats) {
    try {
      localStorage.setItem('active_recall_stats', JSON.stringify(stats));
    } catch (e) { }
  },

  getStats: function () {
    return this._loadStats();
  }
};
