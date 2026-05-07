// Encouragement System - 随机鼓励提示
// Displays motivational tips during learning sessions

var EncouragementSystem = {
  STORAGE_KEY: 'encouragement_prefs',
  COOLDOWN_MS: 5 * 60 * 1000, // 5 minutes
  enabled: true,

  tips: {
    streak: [
      '太棒了！连对 {n} 题！',
      '火力全开！连续答对 {n} 题！',
      '你太强了！{n} 连击！',
      ' unstoppable！连击 {n}！'
    ],
    progress: [
      '已经一半了，继续加油！',
      '完成过半，坚持就是胜利！',
      '你已经完成了 {pct}%，离目标不远了！'
    ],
    time: [
      '专注力满分！休息一下吧 ☕',
      '学习 {min} 分钟了，站起来活动一下 ',
      '注意护眼哦，看看远处吧 👀'
    ],
    unit: [
      '新的挑战开始了！',
      '新的单元，新的进步！',
      'Unit {n} 加油！'
    ],
    general: [
      '每天进步一点点，就是最大的成功 💪',
      '坚持就是胜利！',
      '你是最棒的！',
      '学习改变命运！',
      '今天的努力就是明天的成功 🌟',
      '加油，学霸就是你！',
      '每一次练习都在积累实力 📈',
      '不积跬步无以至千里 ',
      '你的努力不会白费 💎',
      '坚持住，胜利就在前方！',
      '学习是一辈子的事情 📚',
      '今天比昨天更好！'
    ]
  },

  lastShown: {},
  sessionStart: Date.now(),

  init: function () {
    this.loadPreferences();
    this.sessionStart = Date.now();
  },

  loadPreferences: function () {
    try {
      var prefs = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
      this.enabled = prefs.enabled !== false;
    } catch (e) {}
  },

  savePreferences: function () {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify({ enabled: this.enabled }));
    } catch (e) {}
  },

  // Show a tip based on context
  show: function (type, extra) {
    if (!this.enabled) return;
    if (!this.canShow(type)) return;

    var tip = this.getTip(type, extra);
    if (!tip) return;

    this.renderTip(tip);
    this.lastShown[type] = Date.now();
  },

  canShow: function (type) {
    var now = Date.now();
    var last = this.lastShown[type] || 0;
    return (now - last) > this.COOLDOWN_MS;
  },

  getTip: function (type, extra) {
    var pool = this.tips[type];
    if (!pool || pool.length === 0) {
      pool = this.tips.general;
    }
    var tip = pool[Math.floor(Math.random() * pool.length)];

    // Replace placeholders
    if (extra) {
      for (var key in extra) {
        tip = tip.replace(new RegExp('\\{' + key + '\\}', 'g'), extra[key]);
      }
    }
    return tip;
  },

  renderTip: function (text) {
    // Remove existing tip
    var existing = document.getElementById('encouragementTip');
    if (existing) existing.remove();

    var tip = document.createElement('div');
    tip.id = 'encouragementTip';
    tip.textContent = text;
    tip.style.cssText =
      'position:fixed;bottom:80px;right:20px;background:linear-gradient(135deg,#667eea,#764ba2);' +
      'color:white;padding:0.75rem 1.25rem;border-radius:12px;font-size:0.9rem;font-weight:500;' +
      'z-index:10000;box-shadow:0 4px 15px rgba(102,126,234,0.4);max-width:280px;' +
      'animation:tipSlideIn 0.3s ease, tipFadeOut 0.5s ease 2s forwards;';
    document.body.appendChild(tip);

    setTimeout(function () {
      if (tip.parentNode) tip.remove();
    }, 2500);
  },

  // Context-aware triggers
  onCorrectAnswer: function (streak) {
    if (streak === 3) this.show('streak', { n: streak });
    else if (streak === 5) this.show('streak', { n: streak });
    else if (streak === 10) this.show('streak', { n: streak });
  },

  onUnitStart: function (unitNum) {
    this.show('unit', { n: unitNum });
  },

  onSessionTime: function () {
    var elapsed = Math.floor((Date.now() - this.sessionStart) / 60000);
    if (elapsed === 15) this.show('time', { min: 15 });
    else if (elapsed === 30) this.show('time', { min: 30 });
    else if (elapsed === 60) this.show('time', { min: 60 });
  },

  setEnabled: function (enabled) {
    this.enabled = enabled;
    this.savePreferences();
  }
};

// Add tip animations
(function () {
  var style = document.createElement('style');
  style.textContent =
    '@keyframes tipSlideIn { from{opacity:0;transform:translateY(20px);} to{opacity:1;transform:translateY(0);} }' +
    '@keyframes tipFadeOut { from{opacity:1;} to{opacity:0;transform:translateY(-10px);} }';
  document.head.appendChild(style);
})();
