var AssociationBuilder = {
  MAX_ASSOCIATIONS: 3,
  EDIT_DISTANCE_THRESHOLD: 2,

  _levenshtein: function (a, b) {
    a = a.toLowerCase();
    b = b.toLowerCase();
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    var matrix = [];
    for (var i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (var j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    for (var i = 1; i <= b.length; i++) {
      for (var j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[b.length][a.length];
  },

  _commonSuffix: function (a, b) {
    a = a.toLowerCase();
    b = b.toLowerCase();
    var commonEndings = ['ing', 'ed', 'ly', 'tion', 'sion', 'ment', 'ness', 'ful', 'less', 'ous', 'ive', 'able', 'ible', 'er', 'est', 'al', 'ary', 'ence', 'ance', 'ure', 'ate', 'ent'];
    var self = this;
    for (var i = 0; i < commonEndings.length; i++) {
      if (a !== b && self._endsWith(a, commonEndings[i]) && self._endsWith(b, commonEndings[i])) {
        return true;
      }
    }
    var minLen = Math.min(a.length, b.length);
    if (minLen >= 3 && a.slice(-3) === b.slice(-3)) return true;
    return false;
  },

  _endsWith: function (str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
  },

  _commonPrefix: function (a, b) {
    a = a.toLowerCase();
    b = b.toLowerCase();
    var commonPrefixes = ['un', 're', 'dis', 'mis', 'pre', 'over', 'under', 'im', 'in', 'ir', 'non', 'anti', 'inter'];
    for (var i = 0; i < commonPrefixes.length; i++) {
      var prefix = commonPrefixes[i];
      if (a.length > prefix.length && b.length > prefix.length &&
        a.indexOf(prefix) === 0 && b.indexOf(prefix) === 0) {
        return true;
      }
    }
    var minLen = Math.min(a.length, b.length);
    if (minLen >= 3 && a.slice(0, 3) === b.slice(0, 3)) return true;
    return false;
  },

  findAssociations: function (word, knownWords) {
    knownWords = knownWords || [];
    if (!word || !word.w) return [];
    var results = [];
    var seen = {};
    var self = this;

    for (var i = 0; i < knownWords.length; i++) {
      var kw = knownWords[i];
      if (!kw || !kw.w || kw.id === word.id) continue;
      if (seen[kw.id]) continue;

      var dist = self._levenshtein(word.w, kw.w);
      if (dist <= self.EDIT_DISTANCE_THRESHOLD && dist > 0) {
        results.push({ word: kw, reason: 'similar-spelling', label: '拼写相似' });
        seen[kw.id] = true;
        continue;
      }

      if (word.unitTheme && kw.unitTheme && word.unitTheme === kw.unitTheme) {
        results.push({ word: kw, reason: 'same-unit', label: '同单元词' });
        seen[kw.id] = true;
        continue;
      }

      if (self._commonSuffix(word.w, kw.w)) {
        results.push({ word: kw, reason: 'similar-suffix', label: '后缀相同' });
        seen[kw.id] = true;
        continue;
      }

      if (self._commonPrefix(word.w, kw.w)) {
        results.push({ word: kw, reason: 'similar-prefix', label: '前缀相同' });
        seen[kw.id] = true;
        continue;
      }
    }

    return results.slice(0, this.MAX_ASSOCIATIONS);
  },

  renderCard: function (word, associations) {
    associations = associations || [];
    var html = '';
    html += '<div class="association-card" style="background:linear-gradient(135deg,#f0f9ff,#e0f2fe);border-radius:14px;padding:16px;margin:8px 0;">';
    html += '<div style="font-size:0.95rem;font-weight:600;color:#0369a1;margin-bottom:10px;">💡 联想一下 "' + (word.w || '') + '"</div>';

    if (associations.length === 0) {
      html += '<div style="font-size:0.8rem;color:#64748b;">暂无关联词汇</div>';
    } else {
      html += '<div style="display:flex;flex-wrap:wrap;gap:8px;">';
      for (var i = 0; i < associations.length; i++) {
        var assoc = associations[i];
        var badgeColor = assoc.reason === 'similar-spelling' ? '#f59e0b' :
          (assoc.reason === 'same-unit' ? '#10b981' :
            (assoc.reason === 'similar-suffix' ? '#8b5cf6' : '#ef4444'));
        html += '<button class="assoc-word-btn" data-word-id="' + (assoc.word.id || '') + '" data-word-w="' + (assoc.word.w || '') + '" style="padding:8px 14px;border:none;border-radius:10px;cursor:pointer;font-size:0.85rem;font-weight:500;transition:transform 0.15s;">';
        html += '<span style="display:block;color:#1e293b;">' + (assoc.word.w || '') + '</span>';
        html += '<span style="display:block;font-size:0.7rem;color:' + badgeColor + ';margin-top:2px;">' + (assoc.label || '') + '</span>';
        html += '</button>';
      }
      html += '</div>';
    }

    html += '</div>';
    return html;
  },

  bindCardEvents: function (containerEl) {
    if (!containerEl) return;
    var self = this;
    var btns = containerEl.querySelectorAll('.assoc-word-btn');
    for (var i = 0; i < btns.length; i++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          self._onAssocClick(btn);
        });
        btn.addEventListener('mouseenter', function () {
          btn.style.transform = 'scale(1.05)';
        });
        btn.addEventListener('mouseleave', function () {
          btn.style.transform = 'scale(1)';
        });
      })(btns[i]);
    }
  },

  _onAssocClick: function (btn) {
    var wordId = parseInt(btn.getAttribute('data-word-id') || '0');
    var wordW = btn.getAttribute('data-word-w') || '';
    if (!wordId && !wordW) return;

    try {
      if (typeof window.App !== 'undefined' && typeof window.App.startReview === 'function') {
        window.App.startReview(wordId);
      }
    } catch (e) { }

    try {
      if (typeof window.DragonMode !== 'undefined' && typeof window.DragonMode.startWordReview === 'function') {
        window.DragonMode.startWordReview(wordId);
      }
    } catch (e) { }
  },

  buildContext: function (currentWord, allWords) {
    allWords = allWords || [];
    if (!currentWord || !currentWord.w) return { associations: [], html: '' };

    var allKnown = this._getAllKnownWords(allWords);
    var associations = this.findAssociations(currentWord, allKnown);
    var html = this.renderCard(currentWord, associations);

    return {
      associations: associations,
      html: html
    };
  },

  _getAllKnownWords: function (allWords) {
    allWords = allWords || [];
    var known = [];
    try {
      if (typeof SelfExplanation !== 'undefined' && typeof SelfExplanation.findKnownWords === 'function') {
        known = SelfExplanation.findKnownWords(allWords);
        return known.length > 0 ? known : allWords;
      }
    } catch (e) { }
    return allWords;
  }
};

window.AssociationBuilder = AssociationBuilder;
