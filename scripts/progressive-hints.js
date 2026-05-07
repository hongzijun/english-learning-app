const ProgressiveHints = {
  STORAGE_PREFIX: 'ph_state_',

  _getStateKey: function (wordObj) {
    return this.STORAGE_PREFIX + wordObj.id;
  },

  _getExampleWithBlanks: function (wordObj) {
    if (!wordObj.ex || !wordObj.ex.length) return null;
    var example = wordObj.ex[0];
    var word = wordObj.w;
    var regex = new RegExp('\\b' + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
    var result = example.replace(regex, '___');
    if (result === example) {
      regex = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      result = example.replace(regex, '___');
    }
    return result;
  },

  _buildLevel1Hint: function (wordObj) {
    var example = this._getExampleWithBlanks(wordObj);
    if (example) return '语境线索：' + example;
    return '语境线索：暂无例句';
  },

  _buildLevel2Hint: function (wordObj) {
    var word = wordObj.w;
    var first = word[0].toLowerCase();
    var blanks = ('_ ').repeat(word.length - 1).trim();
    var pos = wordObj.pos || '';
    return '首字母提示：' + first + ' ' + blanks + '（' + word.length + '个字母）[' + pos + ']';
  },

  _buildLevel3Hint: function (wordObj) {
    var word = wordObj.w;
    var first = word[0].toLowerCase();
    var last = word[word.length - 1].toLowerCase();
    if (word.length === 1) {
      return '首尾字母：' + first + '（' + word.length + '个字母）';
    }
    if (word.length === 2) {
      return '首尾字母：' + first + ' ' + last + '（' + word.length + '个字母）';
    }
    var middleBlanks = ('_ ').repeat(word.length - 2).trim();
    return '首尾字母：' + first + ' ' + middleBlanks + ' ' + last + '（' + word.length + '个字母）';
  },

  _buildLevel4Hint: function (wordObj) {
    var word = wordObj.w;
    var showCount = Math.ceil(word.length / 2);
    var shown = word.substring(0, showCount).toLowerCase();
    var hiddenCount = word.length - showCount;
    var hidden = hiddenCount > 0 ? ('_ ').repeat(hiddenCount).trim() : '';
    if (hidden) return '部分字母：' + shown + ' ' + hidden;
    return '部分字母：' + shown;
  },

  _buildLevel5Hint: function (wordObj) {
    if (wordObj.p) return '音标提示：' + wordObj.p;
    return '音标提示：暂无音标';
  },

  getHint: function (wordObj, currentLevel) {
    var level = Math.min(Math.max(currentLevel, 1), 5);
    var hintText = '';
    switch (level) {
      case 1: hintText = this._buildLevel1Hint(wordObj); break;
      case 2: hintText = this._buildLevel2Hint(wordObj); break;
      case 3: hintText = this._buildLevel3Hint(wordObj); break;
      case 4: hintText = this._buildLevel4Hint(wordObj); break;
      case 5: hintText = this._buildLevel5Hint(wordObj); break;
    }
    this._saveState(wordObj, level);
    return {
      level: level,
      hintText: hintText,
      isAnswer: false,
      remainingHints: 5 - level
    };
  },

  getAnswer: function (wordObj) {
    return {
      word: wordObj.w,
      meaning: wordObj.m,
      phonetic: wordObj.p || '',
      pos: wordObj.pos || ''
    };
  },

  canAdvance: function (wordObj, currentLevel) {
    return currentLevel < 5;
  },

  reset: function (wordId) {
    var key = this.STORAGE_PREFIX + wordId;
    localStorage.removeItem(key);
  },

  _saveState: function (wordObj, level) {
    var key = this._getStateKey(wordObj);
    localStorage.setItem(key, JSON.stringify({ level: level, timestamp: Date.now() }));
  },

  getStoredLevel: function (wordId) {
    var key = this.STORAGE_PREFIX + wordId;
    var data = localStorage.getItem(key);
    if (data) {
      try {
        var parsed = JSON.parse(data);
        return parsed.level || 1;
      } catch (e) {
        return 1;
      }
    }
    return 0;
  }
};
