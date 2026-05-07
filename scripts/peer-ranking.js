var PeerRanking = {
  TIERS: {
    words: [30, 50, 80, 120, 160, 200, 260],
    time: [60, 120, 200, 350, 500, 700, 1000],
    accuracy: [50, 60, 70, 78, 85, 90, 95]
  },

  TIER_LABELS: [
    '入门阶段', '初级积累', '稳步前进', '渐入佳境',
    '中坚力量', '名列前茅', '出类拔萃'
  ],

  _userWords: 0,
  _userTime: 0,
  _userAccuracy: 0,

  init: function () {
    this._loadUserData();
  },

  _loadUserData: function () {
    try {
      if (typeof Storage !== 'undefined') {
        var wpKey = Storage.PREFIX + Storage.keys.WORD_PROGRESS;
        var wpStored = localStorage.getItem(wpKey);
        if (wpStored) {
          var wp = JSON.parse(wpStored);
          this._userWords = wp.mastered || 0;
        }
      }

      if (typeof XPSystem !== 'undefined' && XPSystem.data) {
        this._userWords = Math.max(this._userWords, XPSystem.data.masteredWords || 0);
      }

      if (typeof Storage !== 'undefined') {
        var lpKey = Storage.PREFIX + Storage.keys.LEARNING_PROGRESS;
        var lpStored = localStorage.getItem(lpKey);
        if (lpStored) {
          var lp = JSON.parse(lpStored);
          this._userTime = lp.totalTime || 0;
        }
      }

      if (typeof Storage !== 'undefined') {
        var ehKey = Storage.PREFIX + Storage.keys.EXERCISE_HISTORY;
        var ehStored = localStorage.getItem(ehKey);
        if (ehStored) {
          var eh = JSON.parse(ehStored);
          if (Array.isArray(eh) && eh.length > 0) {
            var correct = 0;
            for (var i = 0; i < eh.length; i++) {
              if (eh[i].correct || eh[i].isCorrect === true) correct++;
            }
            this._userAccuracy = Math.round((correct / eh.length) * 100);
          }
        }
      }
    } catch (e) { }

    this._userTime = Math.round(this._userTime);
  },

  _calcPercentile: function (value, tiers) {
    if (value <= 0) return 5;

    var rank = 0;
    var totalTiers = tiers.length;

    for (var i = 0; i < tiers.length; i++) {
      if (value >= tiers[i]) {
        rank = i + 1;
      } else {
        break;
      }
    }

    if (rank === 0) return 5;

    var percentile = Math.round((rank / totalTiers) * 100);

    percentile = Math.max(10, Math.min(95, percentile));

    return percentile;
  },

  _getTierLabel: function (rank) {
    if (rank <= 0) return this.TIER_LABELS[0];
    var idx = Math.min(rank - 1, this.TIER_LABELS.length - 1);
    return this.TIER_LABELS[idx];
  },

  getRankings: function () {
    this._loadUserData();

    var wordsPct = this._calcPercentile(this._userWords, this.TIERS.words);
    var timePct = this._calcPercentile(this._userTime, this.TIERS.time);
    var accuracyPct = this._calcPercentile(this._userAccuracy, this.TIERS.accuracy);

    var wordsRank = Math.floor(wordsPct / 14) + 1;
    wordsRank = Math.max(1, Math.min(7, wordsRank));
    var timeRank = Math.floor(timePct / 14) + 1;
    timeRank = Math.max(1, Math.min(7, timeRank));
    var accuracyRank = Math.floor(accuracyPct / 14) + 1;
    accuracyRank = Math.max(1, Math.min(7, accuracyRank));

    return {
      words: {
        value: this._userWords,
        percentile: wordsPct,
        tier: this._getTierLabel(wordsRank),
        tierNum: wordsRank
      },
      time: {
        value: this._userTime,
        percentile: timePct,
        tier: this._getTierLabel(timeRank),
        tierNum: timeRank
      },
      accuracy: {
        value: this._userAccuracy,
        percentile: accuracyPct,
        tier: this._getTierLabel(accuracyRank),
        tierNum: accuracyRank
      }
    };
  },

  getEncouragementMessage: function (rankings) {
    var data = rankings || this.getRankings();
    var messages = [];

    if (data.words.percentile >= 70) {
      messages.push('📊 你的掌握单词数超过了 <strong>' + data.words.percentile +
        '%</strong> 的同年级学习者！');
    } else if (data.words.percentile >= 40) {
      messages.push('📊 词汇积累稳步增长中，已超过 <strong>' + data.words.percentile +
        '%</strong> 的学习者');
    } else {
      messages.push('🌱 词汇积累刚刚开始，持续学习就能快速提升！');
    }

    if (data.accuracy.percentile >= 80) {
      messages.push('🎯 正确率表现优异，超过 <strong>' + data.accuracy.percentile +
        '%</strong> 的同级学习者');
    }

    if (data.time.value > 60) {
      messages.push('⏰ 累计学习' + Math.round(data.time.value) + '分钟，坚持就是胜利！');
    }

    return messages;
  },

  renderDashboardCard: function () {
    var rankings = this.getRankings();

    var html = '<div class="card p-3 mb-3">';
    html += '<h4 class="mb-3">📊 同伴排名</h4>';
    html += '<p style="font-size:0.75rem;color:#9ca3af;margin-bottom:10px;">' +
      '基于外研社七年级标准数据分布</p>';

    var dims = [
      { key: 'words', label: '掌握单词', unit: '个' },
      { key: 'time', label: '学习时长', unit: '分钟' },
      { key: 'accuracy', label: '正确率', unit: '%' }
    ];

    for (var i = 0; i < dims.length; i++) {
      var dim = dims[i];
      var data = rankings[dim.key];
      var barColor = '#6366f1';
      if (data.percentile >= 70) barColor = '#10b981';
      else if (data.percentile >= 40) barColor = '#f59e0b';

      html += '<div style="margin-bottom:10px;">';
      html += '<div style="display:flex;justify-content:space-between;font-size:0.8rem;margin-bottom:2px;">' +
        '<span>' + dim.label + ': <strong>' + data.value + dim.unit + '</strong></span>' +
        '<span style="color:' + barColor + ';">超过 ' + data.percentile + '% 学习者</span></div>';

      html += '<div style="background:#e5e7eb;border-radius:6px;height:8px;overflow:hidden;">' +
        '<div style="background:' + barColor + ';height:100%;width:' + data.percentile +
        '%;border-radius:6px;transition:width 0.6s ease;"></div></div>';

      html += '<div style="font-size:0.7rem;color:#6b7280;text-align:right;">' +
        data.tier + '</div>';
      html += '</div>';
    }

    var messages = this.getEncouragementMessage(rankings);
    for (var j = 0; j < messages.length; j++) {
      html += '<p style="font-size:0.8rem;margin-top:6px;color:#4b5563;">' +
        messages[j] + '</p>';
    }

    html += '</div>';
    return html;
  }
};

window.PeerRanking = PeerRanking;
