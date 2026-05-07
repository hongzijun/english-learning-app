var ContrastDrill = {
  STORAGE_KEY: 'contrast_log',
  MASTER_THRESHOLD: 3,

  pairs: [
    ['beside', 'besides'],
    ['accept', 'except'],
    ['affect', 'effect'],
    ['advice', 'advise'],
    ['breath', 'breathe'],
    ['cloth', 'clothes'],
    ['confident', 'confidence'],
    ['cross', 'across'],
    ['die', 'dead', 'death'],
    ['exciting', 'excited'],
    ['few', 'little'],
    ['hear', 'listen'],
    ['its', 'it\'s'],
    ['lose', 'loose'],
    ['quite', 'quiet']
  ],

  pairInfo: {
    'beside_besides': {
      words: [{ w: 'beside', m: '在……旁边（介词）', ex: 'Sit beside me.' },
      { w: 'besides', m: '除此之外，而且（副/介词）', ex: 'Besides, I like it.' }],
      diff: 'beside仅表方位；besides表"除了……还"',
      drills: [
        { q: 'She sat _____ me in class.', a: 'beside' },
        { q: '_____ English, I also learn French.', a: 'Besides' },
        { q: 'There is a park _____ the river.', a: 'beside' }
      ]
    },
    'accept_except': {
      words: [{ w: 'accept', m: '接受（动词）', ex: 'I accept your gift.' },
      { w: 'except', m: '除了（介词）', ex: 'All except Tom.' }],
      diff: 'accept=接受；except=除了',
      drills: [
        { q: 'Please _____ my apology.', a: 'accept' },
        { q: 'Everyone came _____ John.', a: 'except' },
        { q: 'I cannot _____ this offer.', a: 'accept' }
      ]
    },
    'affect_effect': {
      words: [{ w: 'affect', m: '影响（动词）', ex: 'This affects me.' },
      { w: 'effect', m: '效果，影响（名词）', ex: 'The effect is great.' }],
      diff: 'affect是动词；effect是名词',
      drills: [
        { q: 'The weather can _____ your mood.', a: 'affect' },
        { q: 'The medicine has a good _____.', a: 'effect' },
        { q: 'Pollution _____ our health.', a: 'affects' }
      ]
    },
    'advice_advise': {
      words: [{ w: 'advice', m: '建议（名词）', ex: 'Good advice.' },
      { w: 'advise', m: '建议（动词）', ex: 'I advise you.' }],
      diff: 'advice是名词(不可数)；advise是动词',
      drills: [
        { q: 'Can you give me some _____?', a: 'advice' },
        { q: 'I would _____ you to wait.', a: 'advise' },
        { q: 'Thanks for your _____.', a: 'advice' }
      ]
    },
    'breath_breathe': {
      words: [{ w: 'breath', m: '呼吸（名词）', ex: 'Take a deep breath.' },
      { w: 'breathe', m: '呼吸（动词）', ex: 'Breathe deeply.' }],
      diff: 'breath名词；breathe动词（多一个e）',
      drills: [
        { q: 'Take a deep _____.', a: 'breath' },
        { q: 'I can\'t _____ here.', a: 'breathe' },
        { q: 'Hold your _____!', a: 'breath' }
      ]
    },
    'cloth_clothes': {
      words: [{ w: 'cloth', m: '布，布料（名词）', ex: 'A piece of cloth.' },
      { w: 'clothes', m: '衣服（名词复数）', ex: 'Wash your clothes.' }],
      diff: 'cloth=布料；clothes=衣服（总是复数）',
      drills: [
        { q: 'This table _____ is dirty.', a: 'cloth' },
        { q: 'I need to buy new _____.', a: 'clothes' },
        { q: 'She wears beautiful _____.', a: 'clothes' }
      ]
    },
    'confident_confidence': {
      words: [{ w: 'confident', m: '自信的（形容词）', ex: 'I am confident.' },
      { w: 'confidence', m: '自信（名词）', ex: 'Have confidence.' }],
      diff: 'confident形容词；confidence名词',
      drills: [
        { q: 'She is very _____ about the exam.', a: 'confident' },
        { q: 'You need more _____ in yourself.', a: 'confidence' },
        { q: 'I feel _____ today.', a: 'confident' }
      ]
    },
    'cross_across': {
      words: [{ w: 'cross', m: '穿过（动词）', ex: 'Cross the street.' },
      { w: 'across', m: '穿过，横过（介词）', ex: 'Walk across the street.' }],
      diff: 'cross动词可直接用；across介词需搭配动词',
      drills: [
        { q: '_____ the road carefully.', a: 'Cross' },
        { q: 'The bridge goes _____ the river.', a: 'across' },
        { q: 'Let\'s _____ the bridge.', a: 'cross' }
      ]
    },
    'die_dead_death': {
      words: [{ w: 'die', m: '死（动词）', ex: 'He died yesterday.' },
      { w: 'dead', m: '死的（形容词）', ex: 'He is dead.' },
      { w: 'death', m: '死亡（名词）', ex: 'His death was sad.' }],
      diff: 'die动词；dead形容词；death名词',
      drills: [
        { q: 'The plant will _____ without water.', a: 'die' },
        { q: 'My grandfather is _____.', a: 'dead' },
        { q: 'We were shocked by his _____.', a: 'death' }
      ]
    },
    'exciting_excited': {
      words: [{ w: 'exciting', m: '令人兴奋的', ex: 'An exciting match.' },
      { w: 'excited', m: '感到兴奋的', ex: 'I am excited.' }],
      diff: '-ing修饰物；-ed修饰人',
      drills: [
        { q: 'The movie was very _____.', a: 'exciting' },
        { q: 'I am _____ about the trip.', a: 'excited' },
        { q: 'What an _____ game!', a: 'exciting' }
      ]
    },
    'few_little': {
      words: [{ w: 'few', m: '很少的（修饰可数名词）', ex: 'A few books.' },
      { w: 'little', m: '很少的（修饰不可数名词）', ex: 'A little water.' }],
      diff: 'few+可数名词；little+不可数名词',
      drills: [
        { q: 'There are _____ students today.', a: 'few' },
        { q: 'I have _____ money left.', a: 'little' },
        { q: 'Only a _____ people came.', a: 'few' }
      ]
    },
    'hear_listen': {
      words: [{ w: 'hear', m: '听见（结果）', ex: 'I hear a sound.' },
      { w: 'listen', m: '听（动作过程）+to', ex: 'Listen to me.' }],
      diff: 'hear听到(结果)；listen to听(过程)',
      drills: [
        { q: 'Can you _____ the music?', a: 'hear' },
        { q: 'Please _____ to the teacher.', a: 'listen' },
        { q: 'I _____ someone knocking.', a: 'hear' }
      ]
    },
    'its_its': {
      words: [{ w: 'its', m: '它的（物主代词）', ex: 'The cat licks its paw.' },
      { w: 'it\'s', m: '它是/它已经（缩写）', ex: 'It\'s raining.' }],
      diff: 'its=它的；it\'s=it is',
      drills: [
        { q: 'The dog wagged _____ tail.', a: 'its' },
        { q: '_____ a beautiful day!', a: 'It\'s' },
        { q: 'The school is famous for _____ programs.', a: 'its' }
      ]
    },
    'lose_loose': {
      words: [{ w: 'lose', m: '丢失，失败（动词）', ex: 'Don\'t lose hope.' },
      { w: 'loose', m: '松的（形容词）', ex: 'The shirt is loose.' }],
      diff: 'lose动词；loose形容词（多个o）',
      drills: [
        { q: 'Don\'t _____ your keys.', a: 'lose' },
        { q: 'This jacket is too _____.', a: 'loose' },
        { q: 'We might _____ the game.', a: 'lose' }
      ]
    },
    'quite_quiet': {
      words: [{ w: 'quite', m: '相当，完全（副词）', ex: 'Quite good.' },
      { w: 'quiet', m: '安静的（形容词）', ex: 'Be quiet!' }],
      diff: 'quite=相当(副词)；quiet=安静(形容词)',
      drills: [
        { q: 'The room is very _____.', a: 'quiet' },
        { q: 'She is _____ smart.', a: 'quite' },
        { q: 'Please keep _____.', a: 'quiet' }
      ]
    }
  },

  _loadLog: function () {
    try {
      var raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  },

  _saveLog: function (log) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(log));
    } catch (e) { }
  },

  getPairKey: function (pair) {
    if (!pair || pair.length < 2) return '';
    return pair.slice(0, 2).sort().join('_').replace(/'/g, '');
  },

  renderContrast: function (pair) {
    var key = this.getPairKey(pair);
    var info = this.pairInfo[key];
    if (!info) return '<p style="color:#94a3b8;">未找到对比信息</p>';

    var html = '';
    html += '<div class="contrast-panel" style="background:#fff;border-radius:14px;border:1px solid #e2e8f0;overflow:hidden;">';
    html += '<div style="display:flex;gap:0;">';

    for (var i = 0; i < info.words.length; i++) {
      var w = info.words[i];
      html += '<div style="flex:1;padding:16px;' + (i === 0 ? 'background:#fef2f2;' : 'background:#f0fdf4;') + '">';
      html += '<div style="font-weight:700;font-size:1.1rem;color:#1e293b;">' + w.w + '</div>';
      html += '<div style="font-size:0.75rem;color:#64748b;margin:2px 0;">' + w.m + '</div>';
      html += '<div style="font-size:0.8rem;color:#475569;font-style:italic;margin-top:4px;">' + w.ex + '</div>';
      html += '</div>';
    }

    html += '</div>';
    html += '<div style="padding:12px 16px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:0.85rem;color:#475569;">';
    html += '<strong>关键区别：</strong>' + info.diff;
    html += '</div>';
    html += '</div>';

    return html;
  },

  renderDrill: function (pair) {
    var key = this.getPairKey(pair);
    var info = this.pairInfo[key];
    if (!info || !info.drills) return '<p>暂无练习题</p>';

    var progress = this._getProgress(key);
    var html = '';
    html += '<div class="contrast-drill" style="background:#fff;border-radius:14px;padding:16px;border:1px solid #e2e8f0;">';
    html += '<div style="font-size:0.9rem;font-weight:600;color:#1e293b;margin-bottom:4px;">✏️ 选词填空练习</div>';
    html += '<div style="font-size:0.75rem;color:#64748b;margin-bottom:12px;">连对 ' + this.MASTER_THRESHOLD + ' 题过关 | 当前进度：' + progress.consecutive + '/' + this.MASTER_THRESHOLD + '</div>';

    var dIdx = progress.currentDrill % info.drills.length;
    var drill = info.drills[dIdx];
    var optionsHtml = pair.slice(0, 2).map(function (w) {
      return '<button class="contrast-drill-opt" data-answer="' + w + '" style="padding:6px 16px;border:2px solid #e2e8f0;border-radius:8px;background:#f8fafc;cursor:pointer;font-size:0.85rem;margin:4px;">' + w + '</button>';
    }).join(' ');

    html += '<div style="font-size:1.05rem;color:#1e293b;margin:12px 0;line-height:1.6;">';
    html += drill.q.replace('_____', '<span class="drill-blank" style="display:inline-block;min-width:80px;border-bottom:3px solid #6366f1;text-align:center;color:#6366f1;font-weight:600;">_____</span>');
    html += '</div>';

    html += '<div class="contrast-drill-opts" data-pair-key="' + key + '" data-correct="' + drill.a + '">';
    html += optionsHtml;
    html += '</div>';

    html += '<div class="contrast-drill-feedback" style="margin-top:10px;min-height:24px;font-size:0.85rem;"></div>';
    html += '</div>';

    return html;
  },

  bindDrillEvents: function (containerEl) {
    if (!containerEl) return;
    var self = this;
    var opts = containerEl.querySelectorAll('.contrast-drill-opt');
    for (var i = 0; i < opts.length; i++) {
      (function (opt) {
        opt.addEventListener('click', function () {
          self._handleDrillClick(opt, containerEl);
        });
      })(opts[i]);
    }
  },

  _handleDrillClick: function (opt, containerEl) {
    if (opt.disabled) return;
    var optsWrapper = containerEl.querySelector('.contrast-drill-opts');
    if (!optsWrapper) return;
    var pairKey = optsWrapper.getAttribute('data-pair-key');
    var correctAnswer = optsWrapper.getAttribute('data-correct');
    var userAnswer = opt.getAttribute('data-answer');
    var isCorrect = userAnswer.toLowerCase() === correctAnswer.toLowerCase();

    var allOpts = containerEl.querySelectorAll('.contrast-drill-opt');
    for (var i = 0; i < allOpts.length; i++) {
      allOpts[i].disabled = true;
      if (allOpts[i].getAttribute('data-answer').toLowerCase() === correctAnswer.toLowerCase()) {
        allOpts[i].style.borderColor = '#10b981';
        allOpts[i].style.background = '#d1fae5';
      } else if (allOpts[i] === opt && !isCorrect) {
        allOpts[i].style.borderColor = '#ef4444';
        allOpts[i].style.background = '#fee2e2';
      }
    }

    var feedback = containerEl.querySelector('.contrast-drill-feedback');
    if (feedback) {
      feedback.innerHTML = isCorrect ?
        '<span style="color:#10b981;">✅ 正确！</span>' :
        '<span style="color:#ef4444;">❌ 正确答案是：<strong>' + correctAnswer + '</strong></span>';
    }

    var blank = containerEl.querySelector('.drill-blank');
    if (blank) {
      blank.textContent = correctAnswer;
      blank.style.color = '#10b981';
    }

    this._updateProgress(pairKey, isCorrect);

    if (isCorrect) {
      var progress = this._getProgress(pairKey);
      if (progress.consecutive >= this.MASTER_THRESHOLD) {
        setTimeout(function () {
          if (feedback) {
            feedback.innerHTML = '<span style="color:#6366f1;">🎉 恭喜！已掌握 ' + pairKey.replace(/_/g, ' vs ') + '</span>';
          }
        }, 600);
      }
    }

    var self = this;
    setTimeout(function () {
      self.renderNextDrill(containerEl, pairKey);
    }, 1500);
  },

  renderNextDrill: function (containerEl, pairKey) {
    var pairs = this.pairs;
    var foundPair = null;
    for (var i = 0; i < pairs.length; i++) {
      if (this.getPairKey(pairs[i]) === pairKey) {
        foundPair = pairs[i];
        break;
      }
    }
    if (!foundPair) return;
    var newHtml = this.renderDrill(foundPair);
    containerEl.innerHTML = newHtml;
    this.bindDrillEvents(containerEl);
  },

  _getProgress: function (pairKey) {
    var log = this._loadLog();
    return log[pairKey] || { consecutive: 0, total: 0, correct: 0, currentDrill: 0 };
  },

  _updateProgress: function (pairKey, correct) {
    var log = this._loadLog();
    if (!log[pairKey]) {
      log[pairKey] = { consecutive: 0, total: 0, correct: 0, currentDrill: 0 };
    }
    log[pairKey].total++;
    log[pairKey].currentDrill++;
    if (correct) {
      log[pairKey].consecutive++;
      log[pairKey].correct++;
    } else {
      log[pairKey].consecutive = 0;
    }
    this._saveLog(log);
  },

  checkConfusion: function (wordIds) {
    wordIds = wordIds || [];
    if (wordIds.length < 2) return [];

    var confused = [];
    var self = this;
    for (var i = 0; i < this.pairs.length; i++) {
      var pair = this.pairs[i];
      var matchCount = 0;
      for (var j = 0; j < wordIds.length; j++) {
        for (var k = 0; k < pair.length; k++) {
          if (wordIds[j] === pair[k]) {
            matchCount++;
          }
        }
      }
      if (matchCount >= 2) {
        confused.push(pair);
      }
    }
    return confused;
  },

  getMasteredPairs: function () {
    var log = this._loadLog();
    var mastered = [];
    var keys = Object.keys(log);
    for (var i = 0; i < keys.length; i++) {
      if (log[keys[i]].consecutive >= this.MASTER_THRESHOLD) {
        mastered.push(keys[i]);
      }
    }
    return mastered;
  },

  getAllPairs: function () {
    return this.pairs;
  }
};

window.ContrastDrill = ContrastDrill;
