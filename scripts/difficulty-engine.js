const DifficultyEngine = {
  STORAGE_KEY: 'diff_engine_state',

  levels: {
    1: { name: '入门', blanks: 1, showFirstLetter: true, showPos: true, maxBlanksLength: 3 },
    2: { name: '基础', blanks: 1, showFirstLetter: false, showPos: true, maxBlanksLength: 6 },
    3: { name: '中等', blanks: 2, showFirstLetter: false, showPos: true, totalChars: { min: 10, max: 14 } },
    4: { name: '进阶', blanks: 2, showFirstLetter: false, showPos: false, totalChars: { min: 12, max: 20 } },
    5: { name: '挑战', blanks: 3, showFirstLetter: false, showPos: false, totalChars: { min: 15, max: 30 } }
  },

  init: function () {
    this.loadState();
  },

  loadState: function () {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      this.state = saved ? JSON.parse(saved) : { counters: {}, levelAdjustments: {} };
    } catch (e) {
      this.state = { counters: {}, levelAdjustments: {} };
    }
  },

  saveState: function () {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.error('Failed to save difficulty engine state:', e);
    }
  },

  getCurrentLevel: function (wordId) {
    if (typeof SpacedRepetition === 'undefined') {
      return 1;
    }

    const card = SpacedRepetition.getCard(wordId);
    if (!card) {
      return 1;
    }

    const easiness = card.easiness || 2.5;
    const repetitions = card.repetitions || 0;

    if (easiness >= 2.8 && repetitions >= 5) {
      return 5;
    }
    if (easiness >= 2.5 && repetitions >= 3) {
      return 4;
    }
    if (easiness >= 2.2 && repetitions >= 2) {
      return 3;
    }
    if (easiness >= 1.8) {
      return 2;
    }

    return 1;
  },

  adjustLevel: function (wordId, performance) {
    if (!this.state.counters[wordId]) {
      this.state.counters[wordId] = { correct: 0, wrong: 0 };
    }

    const counter = this.state.counters[wordId];

    if (performance === 'up') {
      counter.correct++;
      counter.wrong = 0;

      if (counter.correct >= 3) {
        this.increaseLevel(wordId);
        counter.correct = 0;
      }
    } else if (performance === 'down') {
      counter.wrong++;
      counter.correct = 0;

      if (counter.wrong >= 3) {
        this.decreaseLevel(wordId);
        counter.wrong = 0;
      }
    }

    this.saveState();
  },

  increaseLevel: function (wordId) {
    if (!this.state.levelAdjustments[wordId]) {
      this.state.levelAdjustments[wordId] = 0;
    }

    if (this.state.levelAdjustments[wordId] < 4) {
      this.state.levelAdjustments[wordId]++;
    }
  },

  decreaseLevel: function (wordId) {
    if (!this.state.levelAdjustments[wordId]) {
      this.state.levelAdjustments[wordId] = 0;
    }

    if (this.state.levelAdjustments[wordId] > -4) {
      this.state.levelAdjustments[wordId]--;
    }
  },

  getAdjustedLevel: function (wordId) {
    const baseLevel = this.getCurrentLevel(wordId);
    const adjustment = this.state.levelAdjustments[wordId] || 0;

    return Math.max(1, Math.min(5, baseLevel + adjustment));
  },

  generateFillQuestion: function (wordObj, level) {
    const word = wordObj.w || '';
    const pos = wordObj.pos || 'n.';
    const levelConfig = this.levels[level];

    if (!word || !levelConfig) {
      return { displayText: '', blanks: [], pos: '', totalChars: 0 };
    }

    const wordLength = word.length;
    let blanks = [];
    let displayText = '';

    if (level === 1) {
      const blankLength = Math.min(3, Math.max(1, Math.floor(wordLength * 0.3)));
      const startPos = wordLength - blankLength;

      displayText = word.substring(0, startPos) + '_'.repeat(blankLength);
      blanks.push({
        answer: word.substring(startPos),
        position: startPos,
        length: blankLength
      });
    } else if (level === 2) {
      const blankLength = Math.min(6, Math.max(2, Math.floor(wordLength * 0.4)));
      const startPos = Math.floor((wordLength - blankLength) / 2);

      displayText = word.substring(0, startPos) +
        '_'.repeat(blankLength) +
        word.substring(startPos + blankLength);
      blanks.push({
        answer: word.substring(startPos, startPos + blankLength),
        position: startPos,
        length: blankLength
      });
    } else if (level === 3) {
      const totalBlankLength = Math.min(14, Math.max(10, Math.floor(wordLength * 0.4)));
      const blank1Length = Math.floor(totalBlankLength / 2);
      const blank2Length = totalBlankLength - blank1Length;

      const startPos1 = Math.floor(wordLength * 0.2);
      const startPos2 = Math.floor(wordLength * 0.6);

      displayText = word.substring(0, startPos1) +
        '_'.repeat(blank1Length) +
        word.substring(startPos1 + blank1Length, startPos2) +
        '_'.repeat(blank2Length) +
        word.substring(startPos2 + blank2Length);

      blanks.push({
        answer: word.substring(startPos1, startPos1 + blank1Length),
        position: startPos1,
        length: blank1Length
      });
      blanks.push({
        answer: word.substring(startPos2, startPos2 + blank2Length),
        position: startPos2,
        length: blank2Length
      });
    } else if (level === 4) {
      const totalBlankLength = Math.min(20, Math.max(12, Math.floor(wordLength * 0.5)));
      const blank1Length = Math.floor(totalBlankLength / 2);
      const blank2Length = totalBlankLength - blank1Length;

      const startPos1 = Math.floor(wordLength * 0.25);
      const startPos2 = Math.floor(wordLength * 0.65);

      displayText = word.substring(0, startPos1) +
        '_'.repeat(blank1Length) +
        word.substring(startPos1 + blank1Length, startPos2) +
        '_'.repeat(blank2Length) +
        word.substring(startPos2 + blank2Length);

      blanks.push({
        answer: word.substring(startPos1, startPos1 + blank1Length),
        position: startPos1,
        length: blank1Length
      });
      blanks.push({
        answer: word.substring(startPos2, startPos2 + blank2Length),
        position: startPos2,
        length: blank2Length
      });
    } else if (level === 5) {
      const blankCount = Math.min(5, Math.max(3, Math.floor(wordLength / 3)));
      const blankLengths = [];
      const positions = [];

      for (let i = 0; i < blankCount; i++) {
        const length = Math.floor(wordLength / (blankCount * 2));
        blankLengths.push(Math.max(1, length));
      }

      let currentPos = 0;
      for (let i = 0; i < blankCount; i++) {
        const gap = Math.floor((wordLength - currentPos) / (blankCount - i));
        positions.push(currentPos + Math.floor(gap / 2));
        currentPos = positions[i] + blankLengths[i];
      }

      let result = '';
      let lastPos = 0;

      for (let i = 0; i < blankCount; i++) {
        result += word.substring(lastPos, positions[i]);
        result += '_'.repeat(blankLengths[i]);
        lastPos = positions[i] + blankLengths[i];

        blanks.push({
          answer: word.substring(positions[i], positions[i] + blankLengths[i]),
          position: positions[i],
          length: blankLengths[i]
        });
      }
      result += word.substring(lastPos);
      displayText = result;
    }

    return {
      displayText: displayText,
      blanks: blanks,
      pos: levelConfig.showPos ? pos : '',
      totalChars: wordLength
    };
  },

  getFillHints: function (wordObj, level) {
    const word = wordObj.w || '';
    const pos = wordObj.pos || 'n.';
    const levelConfig = this.levels[level];

    if (!word || !levelConfig) {
      return '';
    }

    switch (level) {
      case 1:
        return word.charAt(0) + '... (' + word.length + '字母)';
      case 2:
        return word.charAt(0) + '... (' + word.length + '字母)';
      case 3:
        return '(' + word.length + '字母)';
      case 4:
        return pos;
      case 5:
        return '';
      default:
        return '';
    }
  },

  resetWord: function (wordId) {
    if (this.state.counters[wordId]) {
      delete this.state.counters[wordId];
    }
    if (this.state.levelAdjustments[wordId]) {
      delete this.state.levelAdjustments[wordId];
    }
    this.saveState();
  },

  clearAll: function () {
    this.state = { counters: {}, levelAdjustments: {} };
    this.saveState();
  }
};

DifficultyEngine.init();