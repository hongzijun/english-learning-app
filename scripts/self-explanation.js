var SelfExplanation = {
  STORAGE_KEY: 'self_explanation_log',
  TRIGGER_CHANCE: 0.3,
  BKT_THRESHOLD: 0.6,

  trigger: function (word) {
    if (!word || !word.id) return false;
    var bkt = this._getBkt(word.id);
    if (bkt >= this.BKT_THRESHOLD && bkt > 0) return false;
    if (Math.random() > this.TRIGGER_CHANCE) return false;
    this._showModal(word);
    return true;
  },

  _getBkt: function (wordId) {
    try {
      if (typeof SpacedRepetition !== 'undefined' && typeof SpacedRepetition.getCard === 'function') {
        var card = SpacedRepetition.getCard(wordId);
        if (card) {
          var er = card.encnTrack ? card.encnTrack.repetitions : 0;
          var cr = card.cnenTrack ? card.cnenTrack.repetitions : 0;
          var total = er + cr;
          return total > 0 ? Math.min(total / 6, 1.0) : 0;
        }
      }
    } catch (e) { }
    return 0;
  },

  _showModal: function (word) {
    var overlay = document.createElement('div');
    overlay.className = 'self-explanation-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:10001;display:flex;align-items:center;justify-content:center;';

    var modal = document.createElement('div');
    modal.className = 'self-explanation-modal';
    modal.style.cssText = 'background:#fff;border-radius:16px;padding:24px;max-width:420px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,0.2);';

    var self = this;
    modal.innerHTML = '<h3 style="margin:0 0 4px;font-size:1.1rem;color:#1e293b;">你是如何判断这个答案的？</h3>' +
      '<p style="margin:0 0 16px;font-size:0.85rem;color:#64748b;">"' + (word.w || '') + '" — ' + (word.m || '') + '</p>' +
      '<div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">' +
      '<button class="se-opt" data-choice="grammar" style="flex:1;min-width:90px;padding:10px 8px;border:2px solid #e2e8f0;border-radius:10px;background:#f8fafc;cursor:pointer;font-size:0.85rem;">📖 语法规则</button>' +
      '<button class="se-opt" data-choice="memory" style="flex:1;min-width:90px;padding:10px 8px;border:2px solid #e2e8f0;border-radius:10px;background:#f8fafc;cursor:pointer;font-size:0.85rem;">🔤 词义记忆</button>' +
      '<button class="se-opt" data-choice="context" style="flex:1;min-width:90px;padding:10px 8px;border:2px solid #e2e8f0;border-radius:10px;background:#f8fafc;cursor:pointer;font-size:0.85rem;">📝 上下文推断</button>' +
      '</div>' +
      '<textarea class="se-detail" placeholder="补充说明（可选）..." style="width:100%;height:60px;border:2px solid #e2e8f0;border-radius:10px;padding:8px 12px;font-size:0.85rem;resize:none;box-sizing:border-box;font-family:inherit;"></textarea>' +
      '<div style="display:flex;gap:8px;margin-top:12px;">' +
      '<button class="se-skip" style="flex:1;padding:8px;border:1px solid #e2e8f0;border-radius:8px;background:#fff;cursor:pointer;font-size:0.85rem;color:#94a3b8;">跳过</button>' +
      '<button class="se-submit" style="flex:1;padding:8px;border:none;border-radius:8px;background:#6366f1;color:#fff;cursor:pointer;font-size:0.85rem;font-weight:600;">提交</button>' +
      '</div>';

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    var selectedChoice = '';

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) {
        overlay.remove();
      }
    });

    var opts = modal.querySelectorAll('.se-opt');
    for (var i = 0; i < opts.length; i++) {
      (function (opt) {
        opt.addEventListener('click', function () {
          var all = modal.querySelectorAll('.se-opt');
          for (var j = 0; j < all.length; j++) {
            all[j].style.borderColor = '#e2e8f0';
            all[j].style.background = '#f8fafc';
          }
          opt.style.borderColor = '#6366f1';
          opt.style.background = '#eef2ff';
          selectedChoice = opt.getAttribute('data-choice');
        });
      })(opts[i]);
    }

    modal.querySelector('.se-submit').addEventListener('click', function () {
      var detail = modal.querySelector('.se-detail').value.trim();
      self._saveLog(word, selectedChoice, detail);
      overlay.remove();
    });

    modal.querySelector('.se-skip').addEventListener('click', function () {
      var detail = modal.querySelector('.se-detail').value.trim();
      if (detail) {
        self._saveLog(word, 'none', detail);
      }
      overlay.remove();
    });
  },

  _saveLog: function (word, choice, detail) {
    try {
      var log = this._loadLog();
      log.push({
        wordId: word.id,
        word: word.w || '',
        timestamp: Date.now(),
        choice: choice || 'none',
        detail: detail || ''
      });
      if (log.length > 200) {
        log = log.slice(-200);
      }
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(log));
    } catch (e) { }
  },

  _loadLog: function () {
    try {
      var raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  },

  getLog: function () {
    return this._loadLog();
  },

  findKnownWords: function (words) {
    words = words || [];
    var known = [];
    var self = this;
    for (var i = 0; i < words.length; i++) {
      var bkt = self._getBkt(words[i].id);
      if (bkt > 0) {
        known.push({ id: words[i].id, w: words[i].w, m: words[i].m, bkt: bkt });
      }
    }
    return known;
  },

  getRecentLogs: function (limit) {
    limit = limit || 10;
    var log = this._loadLog();
    return log.slice(-limit).reverse();
  }
};

window.SelfExplanation = SelfExplanation;
