const PreviewEngine = {
  _timer: null, _currentIndex: 0, _unitWords: [], _container: null,
  _onComplete: null, _speed: 4000, _state: 'idle', _touchStartX: 0, _touchStartY: 0,

  startPreview: function (unitWords, container, onComplete) {
    this._unitWords = unitWords || [];
    this._container = container;
    this._onComplete = onComplete;
    this._currentIndex = 0;
    this._speed = 4000;
    this._state = 'playing';
    this._createUI();
    this._showCard(0);
    this._startAutoAdvance();
    return this._getController();
  },
  _createUI: function () {
    var self = this;
    var h = '<div id="peOverlay" style="position:fixed;top:0;left:0;right:0;bottom:0;' +
      'background:rgba(0,0,0,0.55);z-index:10010;display:flex;flex-direction:column;' +
      'align-items:center;justify-content:center;font-family:sans-serif;">' +
      '<div id="peCard" style="background:white;border-radius:20px;padding:28px 20px;' +
      'max-width:400px;width:90%;text-align:center;box-shadow:0 14px 56px rgba(0,0,0,0.25);' +
      'min-height:280px;display:flex;flex-direction:column;align-items:center;' +
      'justify-content:center;transition:opacity 0.25s;"></div>' +
      '<div id="peProgress" style="color:rgba(255,255,255,0.85);margin-top:12px;' +
      'font-size:0.92rem;font-weight:500;"></div>' +
      '<div style="margin-top:6px;display:flex;align-items:center;gap:8px;' +
      'color:rgba(255,255,255,0.7);font-size:0.78rem;">' +
      '<span>⚡</span><input type="range" id="peSpeedSlider" min="2" max="6" value="4"' +
      'step="1" style="width:100px;accent-color:#6366f1;"><span>🐢</span></div>' +
      '<div style="display:flex;gap:10px;margin-top:12px;">' +
      '<button id="pePause" style="padding:9px 16px;border:none;border-radius:12px;' +
      'background:#6366f1;color:white;cursor:pointer;font-size:0.92rem;">⏸ 暂停</button>' +
      '<button id="pePrev" style="padding:9px 12px;border:2px solid rgba(255,255,255,0.3);' +
      'border-radius:12px;background:transparent;color:white;cursor:pointer;">◀</button>' +
      '<button id="peNext" style="padding:9px 12px;border:2px solid rgba(255,255,255,0.3);' +
      'border-radius:12px;background:transparent;color:white;cursor:pointer;">▶</button>' +
      '<button id="peSkip" style="padding:9px 14px;border:2px solid rgba(255,255,255,0.3);' +
      'border-radius:12px;background:transparent;color:white;cursor:pointer;">⏭ 跳过</button>' +
      '</div></div>';
    this._container.innerHTML = h;
    document.getElementById('pePause').addEventListener('click', function () { self.pause(); });
    document.getElementById('pePrev').addEventListener('click', function () { self._prevCard(); });
    document.getElementById('peNext').addEventListener('click', function () { self._nextCard(); });
    document.getElementById('peSkip').addEventListener('click', function () { self.skip(); });
    document.getElementById('peSpeedSlider').addEventListener('input', function () {
      self._speed = parseInt(this.value) * 1000;
      if (self._state === 'playing') { self._stopAutoAdvance(); self._startAutoAdvance(); }
    });
    this._setupTouchEvents();
  },
  _showCard: function (index) {
    var cardEl = document.getElementById('peCard');
    if (!cardEl) return;
    var word = this._unitWords[index];
    if (!word) return;
    cardEl.style.opacity = '0';
    var self = this;
    setTimeout(function () {
      var imgHtml = word.img ? '<img src="data/images/grade7/' + word.img +
        '" style="width:56px;height:56px;border-radius:10px;object-fit:cover;margin-bottom:8px;" alt="">' : '';
      cardEl.innerHTML = imgHtml +
        '<div style="font-size:2.1rem;font-weight:700;color:#1f2937;margin-bottom:6px;">' + word.w + '</div>' +
        '<div style="font-size:0.95rem;color:#6b7280;margin-bottom:4px;">' + (word.p || '') + '</div>' +
        '<div style="font-size:1rem;color:#374151;">' + (word.pos ? word.pos + ' ' : '') + word.m + '</div>';
      cardEl.style.opacity = '1';
      var prog = document.getElementById('peProgress');
      if (prog) prog.textContent = '第 ' + (index + 1) + '/' + self._unitWords.length + ' 个';
      self._speakWord(word);
    }, 200);
  },
  _speakWord: function (word) {
    if (!window.speechSynthesis || !word.w) return;
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(word.w);
    u.rate = 0.6; u.lang = 'en-US';
    window.speechSynthesis.speak(u);
  },
  _startAutoAdvance: function () {
    var self = this;
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
    this._timer = setTimeout(function () { self._nextCard(); }, this._speed);
  },
  _stopAutoAdvance: function () {
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
  },
  _nextCard: function () {
    if (this._state === 'idle') return;
    this._currentIndex++;
    if (this._currentIndex >= this._unitWords.length) { this._finish(); return; }
    this._showCard(this._currentIndex);
    if (this._state === 'playing') this._startAutoAdvance();
  },
  _prevCard: function () {
    if (this._state === 'idle' || this._currentIndex <= 0) return;
    this._stopAutoAdvance();
    this._currentIndex--;
    this._showCard(this._currentIndex);
    if (this._state === 'playing') this._startAutoAdvance();
  },
  _finish: function () {
    this._stopAutoAdvance();
    this._state = 'idle';
    if (this._container) this._container.innerHTML = '';
    if (typeof this._onComplete === 'function') this._onComplete();
  },
  pause: function () {
    if (this._state !== 'playing') return;
    this._state = 'paused';
    this._stopAutoAdvance();
    var btn = document.getElementById('pePause');
    if (btn) btn.textContent = '▶ 继续';
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  },
  resume: function () {
    if (this._state !== 'paused') return;
    this._state = 'playing';
    this._startAutoAdvance();
    var btn = document.getElementById('pePause');
    if (btn) btn.textContent = '⏸ 暂停';
    this._speakWord(this._unitWords[this._currentIndex]);
  },
  skip: function () {
    this._stopAutoAdvance();
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    this._finish();
  },
  _getController: function () {
    var s = this;
    return { pause: function () { s.pause(); }, resume: function () { s.resume(); }, skip: function () { s.skip(); } };
  },
  _setupTouchEvents: function () {
    var self = this;
    var overlay = document.getElementById('peOverlay');
    if (!overlay) return;
    overlay.addEventListener('touchstart', function (e) {
      self._touchStartX = e.touches[0].clientX;
      self._touchStartY = e.touches[0].clientY;
    }, { passive: true });
    overlay.addEventListener('touchend', function (e) {
      var dx = e.changedTouches[0].clientX - self._touchStartX;
      var dy = e.changedTouches[0].clientY - self._touchStartY;
      if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return;
      if (dx > 0) self._prevCard(); else self._nextCard();
    });
  },
  quickExposure: function (unitWords, container, onComplete) {
    var words = unitWords || [];
    if (words.length === 0) { if (typeof onComplete === 'function') onComplete(); return; }
    container.innerHTML =
      '<div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);' +
      'z-index:10010;display:flex;flex-direction:column;align-items:center;' +
      'justify-content:center;font-family:sans-serif;">' +
      '<div style="color:rgba(255,255,255,0.8);font-size:0.88rem;margin-bottom:22px;' +
      'text-align:center;padding:0 20px;">快速浏览以下单词，试着在脑海中回忆它们的意思</div>' +
      '<div id="qeWord" style="font-size:2.5rem;font-weight:700;color:white;min-height:80px;' +
      'display:flex;align-items:center;justify-content:center;transition:opacity 0.2s;"></div></div>';
    this._runExposure(words, 0, container, onComplete);
  },
  _runExposure: function (words, index, container, onComplete) {
    var self = this;
    var wordEl = document.getElementById('qeWord');
    if (!wordEl || index >= words.length) {
      container.innerHTML = '';
      if (typeof onComplete === 'function') onComplete();
      return;
    }
    wordEl.style.opacity = '0';
    setTimeout(function () {
      wordEl.textContent = words[index].w;
      wordEl.style.opacity = '1';
    }, 150);
    setTimeout(function () {
      self._runExposure(words, index + 1, container, onComplete);
    }, 1500);
  },
  showUnitOverview: function (unitWords) {
    var words = unitWords || [];
    var total = words.length;
    var experienced = 0;
    var hasSM2 = typeof SpacedRepetition !== 'undefined' && typeof SpacedRepetition.getCard === 'function';
    for (var i = 0; i < words.length; i++) {
      if (hasSM2 && SpacedRepetition.getCard(words[i].id)) experienced++;
    }
    var n = total - experienced;
    var card = 'border-radius:14px;padding:15px 18px;text-align:center;min-width:110px;flex:1;';
    var num = 'font-size:1.7rem;font-weight:700;';
    var lab = 'font-size:0.78rem;opacity:0.85;';
    return '<div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;padding:10px 0;">' +
      '<div style="background:linear-gradient(135deg,#667eea,#764ba2);color:white;' + card + '">' +
      '<div style="' + num + '">' + total + '</div><div style="' + lab + '">📚 本单元单词</div></div>' +
      '<div style="background:linear-gradient(135deg,#11998e,#38ef7d);color:white;' + card + '">' +
      '<div style="' + num + '">' + experienced + '</div><div style="' + lab + '">✅ 有经验的</div></div>' +
      '<div style="background:linear-gradient(135deg,#f093fb,#f5576c);color:white;' + card + '">' +
      '<div style="' + num + '">' + n + '</div><div style="' + lab + '">🆕 全新的</div></div></div>';
  }
};
window.PreviewEngine = PreviewEngine;
