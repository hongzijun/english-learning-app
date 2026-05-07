// XP System - 经验值与等级系统
// Provides XP tracking, level progression, and level-up celebrations

var XPSystem = {
  // Constants
  LEVELS: [
    { level: 1, xp: 0, title: '初学者', icon: '🌱' },
    { level: 2, xp: 100, title: '入门者', icon: '📗' },
    { level: 3, xp: 300, title: '小能手', icon: '📘' },
    { level: 4, xp: 600, title: '学习者', icon: '📙' },
    { level: 5, xp: 1000, title: '进步者', icon: '📕' },
    { level: 6, xp: 1500, title: '小达人', icon: '⭐' },
    { level: 7, xp: 2100, title: '词汇家', icon: '📖' },
    { level: 8, xp: 2800, title: '语法通', icon: '🏅' },
    { level: 9, xp: 3600, title: '英语星', icon: '🌟' },
    { level: 10, xp: 4500, title: '学霸', icon: '🎓' }
  ],

  XP_REWARDS: {
    vocabCorrect: 5,
    grammarCorrect: 8,
    exerciseCorrect: 10,
    wordMastered: 20,
    unitComplete: 100,
    streakBonus: 15,
    dailyGoalComplete: 50
  },

  STORAGE_KEY: 'xp_system_data',

  // State
  data: null,

  init: function () {
    this.data = this.loadData();
    this.renderSidebarXP();
  },

  loadData: function () {
    try {
      var stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return {
      totalXP: 0,
      level: 1,
      history: [] // { action, xp, timestamp }
    };
  },

  saveData: function () {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {}
  },

  addXP: function (action, amount) {
    var oldLevel = this.data.level;
    this.data.totalXP += amount;
    this.data.level = this.getLevel(this.data.totalXP);
    this.data.history.push({
      action: action,
      xp: amount,
      timestamp: Date.now()
    });
    this.saveData();
    this.renderSidebarXP();

    // Show floating XP
    this.showFloatingXP(amount);

    // Check level up
    if (this.data.level > oldLevel) {
      this.triggerLevelUp(this.data.level, this.getLevelInfo(this.data.level));
    }

    return { xp: amount, level: this.data.level, leveledUp: this.data.level > oldLevel };
  },

  getLevel: function (xp) {
    for (var i = this.LEVELS.length - 1; i >= 0; i--) {
      if (xp >= this.LEVELS[i].xp) return this.LEVELS[i].level;
    }
    return 1;
  },

  getLevelInfo: function (level) {
    for (var i = 0; i < this.LEVELS.length; i++) {
      if (this.LEVELS[i].level === level) return this.LEVELS[i];
    }
    return this.LEVELS[0];
  },

  getNextLevelInfo: function () {
    if (this.data.level >= this.LEVELS.length) return null;
    return this.LEVELS[this.data.level]; // Next level (0-indexed array)
  },

  getXPProgress: function () {
    var currentInfo = this.getLevelInfo(this.data.level);
    var nextInfo = this.getNextLevelInfo();
    if (!nextInfo) return { current: 0, needed: 0, percent: 100 };
    var progress = this.data.totalXP - currentInfo.xp;
    var needed = nextInfo.xp - currentInfo.xp;
    return {
      current: progress,
      needed: needed,
      percent: Math.round((progress / needed) * 100)
    };
  },

  // UI Rendering
  renderSidebarXP: function () {
    var sidebarHeader = document.querySelector('.sidebar-header');
    if (!sidebarHeader) return;

    // Remove existing XP bar if present
    var existing = document.getElementById('sidebarXPBar');
    if (existing) existing.remove();

    var info = this.getLevelInfo(this.data.level);
    var progress = this.getXPProgress();
    var nextInfo = this.getNextLevelInfo();

    var bar = document.createElement('div');
    bar.id = 'sidebarXPBar';
    bar.innerHTML =
      '<div style="display:flex;align-items:center;gap:6px;margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.15);">' +
      '<span style="font-size:1.2rem;">' + info.icon + '</span>' +
      '<div style="flex:1;min-width:0;">' +
      '<div style="display:flex;justify-content:space-between;align-items:baseline;">' +
      '<span style="font-size:0.75rem;font-weight:600;">Lv.' + this.data.level + ' ' + info.title + '</span>' +
      (nextInfo ? '<span style="font-size:0.6rem;opacity:0.6;">' + this.data.totalXP + '/' + nextInfo.xp + ' XP</span>' : '<span style="font-size:0.6rem;opacity:0.6;">满级</span>') +
      '</div>' +
      '<div style="width:100%;height:4px;background:rgba(255,255,255,0.15);border-radius:2px;margin-top:3px;">' +
      '<div style="width:' + progress.percent + '%;height:100%;background:linear-gradient(90deg,#f59e0b,#ef4444);border-radius:2px;transition:width 0.5s ease;"></div>' +
      '</div>' +
      '</div>' +
      '</div>';

    sidebarHeader.appendChild(bar);
  },

  showFloatingXP: function (amount) {
    var mainContent = document.querySelector('.main-content');
    if (!mainContent) return;

    var el = document.createElement('div');
    el.style.cssText =
      'position:fixed;top:50%;right:50%;transform:translate(50%,-50%);font-size:1.5rem;font-weight:700;color:#10b981;z-index:10000;pointer-events:none;' +
      'animation:xpFloatUp 1s ease forwards;';
    el.textContent = '+' + amount + ' XP';
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 1000);
  },

  triggerLevelUp: function (level, info) {
    var overlay = document.createElement('div');
    overlay.style.cssText =
      'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:10001;display:flex;align-items:center;justify-content:center;' +
      'animation:fadeIn 0.3s ease;';

    var card = document.createElement('div');
    card.style.cssText =
      'background:linear-gradient(135deg,#667eea,#764ba2);color:white;border-radius:16px;padding:2rem 3rem;text-align:center;' +
      'box-shadow:0 20px 60px rgba(0,0,0,0.3);animation:scaleIn 0.4s cubic-bezier(0.175,0.885,0.32,1.275);';
    card.innerHTML =
      '<div style="font-size:3rem;margin-bottom:0.5rem;">' + info.icon + '</div>' +
      '<div style="font-size:1.5rem;font-weight:700;margin-bottom:0.5rem;">🎉 恭喜升级！</div>' +
      '<div style="font-size:1.2rem;font-weight:600;margin-bottom:0.25rem;">Level ' + level + ' - ' + info.title + '</div>' +
      '<div style="font-size:0.85rem;opacity:0.8;margin-bottom:1rem;">继续加油，你是最棒的！</div>' +
      '<button id="levelUpClose" style="padding:0.5rem 2rem;border:2px solid white;background:rgba(255,255,255,0.2);color:white;border-radius:8px;cursor:pointer;font-size:0.9rem;font-weight:600;">太棒了！</button>';

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    // Play level up sound
    if (typeof AudioSystem !== 'undefined' && AudioSystem.playLevelUp) {
      AudioSystem.playLevelUp();
    }

    // Trigger celebration if available
    if (typeof Celebration !== 'undefined') {
      Celebration.triggerConfetti();
    }

    var close = function () {
      overlay.style.animation = 'fadeOut 0.3s ease forwards';
      setTimeout(function () { overlay.remove(); }, 300);
    };

    // Event delegation on overlay for close button and overlay click
    overlay.addEventListener('click', function (e) {
      if (e.target.id === 'levelUpClose' || e.target === overlay) {
        close();
      }
    });
  },

  // Action wrappers
  rewardVocabCorrect: function () { this.addXP('vocabCorrect', this.XP_REWARDS.vocabCorrect); },
  rewardGrammarCorrect: function () { this.addXP('grammarCorrect', this.XP_REWARDS.grammarCorrect); },
  rewardExerciseCorrect: function () { this.addXP('exerciseCorrect', this.XP_REWARDS.exerciseCorrect); },
  rewardWordMastered: function () { this.addXP('wordMastered', this.XP_REWARDS.wordMastered); },
  rewardUnitComplete: function () { this.addXP('unitComplete', this.XP_REWARDS.unitComplete); },
  rewardStreakBonus: function () { this.addXP('streakBonus', this.XP_REWARDS.streakBonus); },
  rewardDailyGoal: function () { this.addXP('dailyGoalComplete', this.XP_REWARDS.dailyGoalComplete); },

  // Get stats for dashboard
  getStats: function () {
    return {
      totalXP: this.data.totalXP,
      level: this.data.level,
      title: this.getLevelInfo(this.data.level).title,
      icon: this.getLevelInfo(this.data.level).icon,
      progress: this.getXPProgress(),
      todayXP: this.getTodayXP()
    };
  },

  getTodayXP: function () {
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var todayStart = today.getTime();
    var total = 0;
    for (var i = 0; i < this.data.history.length; i++) {
      if (this.data.history[i].timestamp >= todayStart) {
        total += this.data.history[i].xp;
      }
    }
    return total;
  },

  // Reset (for settings)
  reset: function () {
    this.data = { totalXP: 0, level: 1, history: [] };
    this.saveData();
    this.renderSidebarXP();
  }
};

// Add CSS animations
(function () {
  var style = document.createElement('style');
  style.textContent =
    '@keyframes xpFloatUp { 0%{opacity:1;transform:translate(50%,-50%) scale(1);} 100%{opacity:0;transform:translate(50%,-150%) scale(1.5);} }' +
    '@keyframes fadeIn { from{opacity:0;} to{opacity:1;} }' +
    '@keyframes scaleIn { from{opacity:0;transform:scale(0.5);} to{opacity:1;transform:scale(1);} }';
  document.head.appendChild(style);
})();
