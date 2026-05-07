var MilestoneReview = {
  SCENES: ['unit-complete', 'level-up', 'streak-30', 'accuracy-90'],

  _hasTriggered: {},

  trigger: function (scene, data) {
    if (this._hasTriggered[scene]) return;
    this._hasTriggered[scene] = true;

    var comparison = this._buildComparison(scene, data);
    this._showReviewModal(comparison);
  },

  _buildComparison: function (scene, data) {
    var result = {
      scene: scene,
      title: this._getSceneTitle(scene),
      totalDays: 1,
      totalQuestions: 0,
      accuracyHistory: [],
      achievements: [],
      knowledgeMap: []
    };

    result.totalDays = this._getTotalStudyDays();
    result.totalQuestions = this._getTotalQuestions();
    result.accuracyHistory = this._getAccuracyHistory();
    result.achievements = this._getUnlockedAchievements();
    result.knowledgeMap = this._getKnowledgeMap();

    if (data) {
      result.customData = data;
    }

    return result;
  },

  _getSceneTitle: function (scene) {
    var titles = {
      'unit-complete': '单元通关！',
      'level-up': '等级提升！',
      'streak-30': '坚持30天！',
      'accuracy-90': '准确率突破90%！'
    };
    return titles[scene] || '里程碑达成！';
  },

  _getTotalStudyDays: function () {
    try {
      if (typeof DailyCalendar !== 'undefined' && DailyCalendar.data) {
        var days = DailyCalendar.data.days || {};
        return Object.keys(days).length || 1;
      }
    } catch (e) { }

    var total = 1;
    try {
      if (typeof Storage !== 'undefined') {
        var key = Storage.PREFIX + Storage.keys.LEARNING_PROGRESS;
        var stored = localStorage.getItem(key);
        if (stored) {
          var data = JSON.parse(stored);
          total = (data.dailyRecords || []).length || 1;
        }
      }
    } catch (e) { }

    return total;
  },

  _getTotalQuestions: function () {
    var total = 0;
    try {
      if (typeof Storage !== 'undefined') {
        var key = Storage.PREFIX + Storage.keys.EXERCISE_HISTORY;
        var stored = localStorage.getItem(key);
        if (stored) {
          var history = JSON.parse(stored);
          total = Array.isArray(history) ? history.length : 0;
        }
      }
    } catch (e) { }
    return total;
  },

  _getAccuracyHistory: function () {
    var history = [];
    try {
      if (typeof Storage !== 'undefined') {
        var key = Storage.PREFIX + Storage.keys.LEARNING_PROGRESS;
        var stored = localStorage.getItem(key);
        if (stored) {
          var data = JSON.parse(stored);
          var records = data.dailyRecords || [];
          for (var i = 0; i < records.length && i < 30; i++) {
            if (records[i].accuracy !== undefined) {
              history.push(records[i].accuracy);
            }
          }
        }
      }
    } catch (e) { }
    return history;
  },

  _getUnlockedAchievements: function () {
    var achievements = [];
    try {
      if (typeof AchievementsModule !== 'undefined' && typeof AchievementsModule.getUnlocked === 'function') {
        var unlocked = AchievementsModule.getUnlocked();
        if (unlocked) achievements = unlocked;
      }
    } catch (e) { }

    if (achievements.length === 0 && typeof Storage !== 'undefined') {
      try {
        var key = Storage.PREFIX + (Storage.keys.ACHIEVEMENTS || 'achievements');
        var stored = localStorage.getItem(key);
        if (stored) {
          var data = JSON.parse(stored);
          if (Array.isArray(data)) achievements = data;
        }
      } catch (e2) { }
    }

    return achievements;
  },

  _getKnowledgeMap: function () {
    var map = [];
    try {
      if (typeof Grade7Data !== 'undefined' && Grade7Data.learningPath) {
        var path = Grade7Data.learningPath;
        for (var i = 0; i < path.length; i++) {
          map.push({
            id: path[i].id,
            name: path[i].name,
            progress: typeof JourneyMap !== 'undefined'
              ? JourneyMap.getUnitProgress(path[i].id)
              : 0
          });
        }
      }
    } catch (e) { }
    return map;
  },

  _showReviewModal: function (comparison) {
    var self = this;
    var recentAvg = 0;
    var history = comparison.accuracyHistory;
    if (history.length > 0) {
      var sum = 0;
      var start = Math.max(0, history.length - 10);
      var cnt = 0;
      for (var i = start; i < history.length; i++) {
        sum += history[i];
        cnt++;
      }
      recentAvg = cnt > 0 ? Math.round(sum / cnt) : 0;
    }

    var achievementCount = Array.isArray(comparison.achievements)
      ? comparison.achievements.length
      : 0;

    var knowledgeLit = 0;
    var knowledgeTotal = 0;
    if (comparison.knowledgeMap) {
      for (var j = 0; j < comparison.knowledgeMap.length; j++) {
        if (comparison.knowledgeMap[j].progress >= 100) knowledgeLit++;
        knowledgeTotal++;
      }
    }

    var html = '<div id="milestoneReviewModal" style="position:fixed;top:0;left:0;right:0;bottom:0;' +
      'background:linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%);' +
      'z-index:10010;display:flex;align-items:center;justify-content:center;' +
      'animation:milestoneFadeIn 0.6s ease;">' +
      '<div style="text-align:center;color:white;max-width:500px;width:90%;padding:30px;">' +
      '<div style="font-size:4rem;animation:milestoneBounce 0.8s ease;">🎉</div>' +
      '<h1 style="font-size:2rem;margin:12px 0;text-shadow:0 2px 8px rgba(0,0,0,0.3);">' +
      comparison.title + '</h1>' +

      '<div style="display:flex;gap:16px;justify-content:center;margin:20px 0;flex-wrap:wrap;">' +
      '<div style="background:rgba(255,255,255,0.1);border-radius:12px;padding:16px;min-width:90px;">' +
      '<div style="font-size:1.8rem;font-weight:700;">' + comparison.totalDays + '</div>' +
      '<div style="font-size:0.75rem;opacity:0.7;">累计学习天数</div></div>' +

      '<div style="background:rgba(255,255,255,0.1);border-radius:12px;padding:16px;min-width:90px;">' +
      '<div style="font-size:1.8rem;font-weight:700;">' + comparison.totalQuestions + '</div>' +
      '<div style="font-size:0.75rem;opacity:0.7;">完成题目</div></div>' +

      '<div style="background:rgba(255,255,255,0.1);border-radius:12px;padding:16px;min-width:90px;">' +
      '<div style="font-size:1.8rem;font-weight:700;">' + recentAvg + '%</div>' +
      '<div style="font-size:0.75rem;opacity:0.7;">近期正确率</div></div>' +
      '</div>' +

      '<div style="background:rgba(255,255,255,0.08);border-radius:12px;padding:16px;margin:12px 0;">' +
      '<div style="font-size:0.9rem;">🏅 已解锁 <strong>' + achievementCount + '</strong> 项成就</div>';

    if (knowledgeTotal > 0) {
      html += '<div style="font-size:0.9rem;margin-top:6px;">🗺️ 知识地图点亮 <strong>' +
        knowledgeLit + '/' + knowledgeTotal + '</strong> 个区域</div>';
    }

    html += '</div>';

    html += '<canvas id="milestoneAccCanvas" width="400" height="120" ' +
      'style="width:100%;max-width:400px;margin-top:8px;"></canvas>';

    html += '<button id="milestoneSkipBtn" style="margin-top:20px;padding:12px 32px;' +
      'background:rgba(255,255,255,0.2);color:white;border:1px solid rgba(255,255,255,0.3);' +
      'border-radius:20px;font-size:0.95rem;cursor:pointer;transition:all 0.2s;">' +
      '好的，继续学习 →</button>' +

      '<p id="milestoneAutoClose" style="margin-top:10px;font-size:0.7rem;opacity:0.5;">' +
      '5秒后自动关闭</p>' +
      '</div></div>';

    var style = document.createElement('style');
    style.textContent = '@keyframes milestoneFadeIn{from{opacity:0}to{opacity:1}}' +
      '@keyframes milestoneBounce{0%,100%{transform:scale(1)}50%{transform:scale(1.2)}}';
    document.head.appendChild(style);

    document.body.insertAdjacentHTML('beforeend', html);

    document.getElementById('milestoneSkipBtn').addEventListener('click', function () {
      self._closeMilestone();
    });

    this._drawAccuracyChart(comparison.accuracyHistory);

    setTimeout(function () {
      self._closeMilestone();
    }, 5000);
  },

  _drawAccuracyChart: function (history) {
    var canvas = document.getElementById('milestoneAccCanvas');
    if (!canvas || history.length < 2) return;

    var ctx = canvas.getContext('2d');
    var w = canvas.width;
    var h = canvas.height;
    var pad = 30;

    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    for (var i = 0; i <= 4; i++) {
      var y = pad + (h - pad * 2) * (i / 4);
      ctx.beginPath();
      ctx.moveTo(pad, y);
      ctx.lineTo(w - pad, y);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'right';
    for (var j = 0; j <= 4; j++) {
      ctx.fillText((100 - j * 25) + '%', pad - 6, pad + (h - pad * 2) * (j / 4) + 3);
    }

    if (history.length < 2) return;

    ctx.beginPath();
    ctx.strokeStyle = '#a78bfa';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';

    var stepX = (w - pad * 2) / (history.length - 1);
    for (var k = 0; k < history.length; k++) {
      var x = pad + stepX * k;
      var val = history[k] / 100;
      var yPos = pad + (h - pad * 2) * (1 - val);
      if (k === 0) {
        ctx.moveTo(x, yPos);
      } else {
        ctx.lineTo(x, yPos);
      }
    }
    ctx.stroke();

    ctx.fillStyle = '#a78bfa';
    for (var m = 0; m < history.length; m++) {
      var cx = pad + stepX * m;
      var cy = pad + (h - pad * 2) * (1 - history[m] / 100);
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, 2 * Math.PI);
      ctx.fill();
    }
  },

  _closeMilestone: function () {
    var modal = document.getElementById('milestoneReviewModal');
    if (modal && modal.parentNode) {
      modal.style.opacity = '0';
      modal.style.transition = 'opacity 0.3s';
      setTimeout(function () {
        if (modal.parentNode) modal.parentNode.removeChild(modal);
      }, 300);
    }
  },

  reset: function () {
    this._hasTriggered = {};
  }
};

window.MilestoneReview = MilestoneReview;
