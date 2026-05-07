var PoststudyReflection = {
  STORAGE_KEY: 'reflection_diary',
  YESTERDAY_KEY: 'yesterday_reflection',

  reflect: function (sessionData) {
    var self = this;
    var html = this._buildReflectionHTML(sessionData);
    document.body.insertAdjacentHTML('beforeend', html);

    this._bindReflectionEvents(sessionData);
  },

  _buildReflectionHTML: function (sessionData) {
    var today = new Date().toLocaleDateString('zh-CN', {
      month: 'long', day: 'numeric', weekday: 'short'
    });

    var newWordsHtml = '';
    var words = sessionData.wordsStudiedList || [];
    if (words.length > 0) {
      for (var i = 0; i < words.length; i++) {
        newWordsHtml += '<label style="display:inline-block;margin:4px;cursor:pointer;">' +
          '<input type="checkbox" class="reflectionWordCheck" value="' + words[i] + '" ' +
          'style="margin-right:4px;" checked>' + words[i] + '</label>';
      }
    } else {
      newWordsHtml = '<p style="color:#9ca3af;">今天没有学习新单词</p>';
    }

    var wrongHtml = '';
    var wrongWords = sessionData.wrongWords || [];
    if (wrongWords.length > 0) {
      var top3 = wrongWords.slice().sort(function (a, b) {
        return b.count - a.count;
      }).slice(0, 3);

      wrongHtml = '<div style="margin-top:8px;">';
      for (var j = 0; j < top3.length; j++) {
        wrongHtml += '<span style="display:inline-block;background:#fee2e2;color:#991b1b;' +
          'padding:4px 10px;border-radius:10px;margin:3px;font-size:0.85rem;">' +
          top3[j].word + ' (错' + top3[j].count + '次)</span>';
      }
      wrongHtml += '</div>';
    } else {
      wrongHtml = '<p style="color:#10b981;">全部正确，太棒了！🎉</p>';
    }

    var html = '<div id="reflectionModal" style="position:fixed;top:0;left:0;right:0;bottom:0;' +
      'background:rgba(0,0,0,0.5);z-index:10002;display:flex;align-items:center;justify-content:center;">' +
      '<div style="background:white;border-radius:16px;padding:28px;max-width:420px;width:90%;' +
      'max-height:85vh;overflow-y:auto;box-shadow:0 12px 48px rgba(0,0,0,0.2);">' +
      '<div style="font-size:2rem;text-align:center;margin-bottom:6px;">🧠</div>' +
      '<h3 style="text-align:center;margin-bottom:4px;">学习反思</h3>' +
      '<p style="text-align:center;color:#6b7280;font-size:0.8rem;margin-bottom:16px;">' +
      today + '</p>' +

      '<div style="margin-bottom:16px;">' +
      '<strong>1. 今天学到了什么？</strong>' +
      '<p style="font-size:0.8rem;color:#6b7280;">勾选你印象深刻的单词：</p>' +
      newWordsHtml +
      '</div>' +

      '<div style="margin-bottom:16px;">' +
      '<strong>2. 哪里比较难？</strong>' +
      wrongHtml +
      '</div>' +

      '<div style="margin-bottom:16px;">' +
      '<strong>3. 明天想学什么？</strong>' +
      '<div style="margin-top:6px;">' +
      '<label style="display:block;margin:4px 0;cursor:pointer;">' +
      '<input type="radio" name="tomorrowPlan" value="continue" checked> 继续学新课</label>' +
      '<label style="display:block;margin:4px 0;cursor:pointer;">' +
      '<input type="radio" name="tomorrowPlan" value="review"> 复习旧知识</label>' +
      '<label style="display:block;margin:4px 0;cursor:pointer;">' +
      '<input type="radio" name="tomorrowPlan" value="exercise"> 做练习题</label>' +
      '<label style="display:block;margin:4px 0;cursor:pointer;">' +
      '<input type="radio" name="tomorrowPlan" value="whatever"> 随便看看</label>' +
      '</div></div>' +

      '<div style="display:flex;gap:8px;">' +
      '<button id="reflectionSkipBtn" style="flex:1;padding:10px;border:1px solid #d1d5db;' +
      'border-radius:8px;background:white;cursor:pointer;color:#6b7280;">跳过</button>' +
      '<button id="reflectionSaveBtn" style="flex:2;padding:10px;border:none;border-radius:8px;' +
      'background:#6366f1;color:white;cursor:pointer;font-weight:600;">保存反思</button>' +
      '</div></div></div>';

    return html;
  },

  _bindReflectionEvents: function (sessionData) {
    var self = this;

    document.getElementById('reflectionSkipBtn').addEventListener('click', function () {
      self._closeModal();
    });

    document.getElementById('reflectionSaveBtn').addEventListener('click', function () {
      var result = self._collectData(sessionData);
      self._saveDiary(result);
      self._closeModal();
    });
  },

  _collectData: function (sessionData) {
    var checkedWords = [];
    var checkboxes = document.querySelectorAll('.reflectionWordCheck:checked');
    for (var i = 0; i < checkboxes.length; i++) {
      checkedWords.push(checkboxes[i].value);
    }

    var tomorrowPlan = 'continue';
    var radios = document.getElementsByName('tomorrowPlan');
    for (var j = 0; j < radios.length; j++) {
      if (radios[j].checked) {
        tomorrowPlan = radios[j].value;
        break;
      }
    }

    return {
      date: new Date().toISOString().split('T')[0],
      wordsStudied: checkedWords,
      totalWords: sessionData.wordsStudied || 0,
      wrongWords: (sessionData.wrongWords || []).map(function (w) { return w.word; }),
      tomorrowPlan: tomorrowPlan
    };
  },

  _saveDiary: function (entry) {
    var diary = [];
    try {
      var stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) diary = JSON.parse(stored);
    } catch (e) { }

    var found = false;
    for (var i = 0; i < diary.length; i++) {
      if (diary[i].date === entry.date) {
        diary[i] = entry;
        found = true;
        break;
      }
    }
    if (!found) {
      diary.push(entry);
    }

    if (diary.length > 30) {
      diary = diary.slice(diary.length - 30);
    }

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(diary));

      if (entry.date) {
        localStorage.setItem(this.YESTERDAY_KEY, entry.date);
      }
    } catch (e) { }
  },

  _closeModal: function () {
    var modal = document.getElementById('reflectionModal');
    if (modal && modal.parentNode) {
      modal.parentNode.removeChild(modal);
    }
  },

  showYesterdayReview: function () {
    try {
      var yesterdayKey = localStorage.getItem(this.YESTERDAY_KEY);
      if (!yesterdayKey) return;

      var diary = [];
      var stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) diary = JSON.parse(stored);

      var entry = null;
      for (var i = diary.length - 1; i >= 0; i--) {
        if (diary[i].date === yesterdayKey) {
          entry = diary[i];
          break;
        }
      }

      if (!entry) return;

      var self = this;
      var planLabels = {
        continue: '继续学新课',
        review: '复习旧知识',
        exercise: '做练习题',
        whatever: '随便看看'
      };

      var html = '<div id="yesterdayReviewModal" style="position:fixed;top:12px;right:12px;' +
        'z-index:10001;max-width:320px;background:white;border-radius:12px;' +
        'box-shadow:0 6px 24px rgba(0,0,0,0.15);padding:14px;' +
        'border-left:4px solid #8b5cf6;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;">' +
        '<strong>📋 昨日反思回顾</strong>' +
        '<button id="yesterdayReviewClose" style="background:none;border:none;font-size:1.1rem;' +
        'cursor:pointer;color:#6b7280;padding:0 4px;">✕</button>' +
        '</div>' +
        '<p style="font-size:0.8rem;color:#6b7280;margin-top:4px;">掌握了 <strong>' +
        (entry.wordsStudied || []).length + '/' + (entry.totalWords || 0) +
        '</strong> 个单词</p>';

      if (entry.wrongWords && entry.wrongWords.length > 0) {
        html += '<p style="font-size:0.75rem;color:#ef4444;">薄弱: ' +
          entry.wrongWords.join(', ') + '</p>';
      }

      html += '<p style="font-size:0.8rem;color:#6b7280;">计划: ' +
        (planLabels[entry.tomorrowPlan] || '未知') + '</p>' +
        '</div>';

      document.body.insertAdjacentHTML('beforeend', html);

      document.getElementById('yesterdayReviewClose').addEventListener('click', function () {
        var m = document.getElementById('yesterdayReviewModal');
        if (m && m.parentNode) m.parentNode.removeChild(m);
      });

      setTimeout(function () {
        var m = document.getElementById('yesterdayReviewModal');
        if (m && m.parentNode) m.parentNode.removeChild(m);
      }, 5000);

    } catch (e) { }
  },

  init: function () {
    var enabled = localStorage.getItem('reflection_enabled');
    this.enabled = enabled !== '0';
  }
};

window.PoststudyReflection = PoststudyReflection;
