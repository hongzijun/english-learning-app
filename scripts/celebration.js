// Celebration System - 学习完成庆祝动画
// Canvas-based particle effects for word mastery, unit completion, and streaks

var Celebration = {
  canvas: null,
  ctx: null,
  particles: [],
  animating: false,
  animId: null,

  init: function () {
    this.createCanvas();
    this.bindEvents();
  },

  createCanvas: function () {
    var canvas = document.createElement('canvas');
    canvas.id = 'celebrationCanvas';
    canvas.style.cssText =
      'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;display:none;';
    document.body.appendChild(canvas);
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', function () { Celebration.resize(); });
  },

  resize: function () {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  },

  bindEvents: function () {
    // Close celebration on click
    var self = this;
    this.canvas.addEventListener('click', function () { self.stop(); });
  },

  stop: function () {
    this.animating = false;
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    this.particles = [];
    this.canvas.style.display = 'none';
  },

  start: function () {
    this.canvas.style.display = 'block';
    this.animating = true;
    this.resize();
    this.animate();
  },

  animate: function () {
    if (!this.animating || this.particles.length === 0) {
      this.stop();
      return;
    }
    var ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    var remaining = [];
    for (var i = 0; i < this.particles.length; i++) {
      var p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity || 0.05;
      p.life -= p.decay || 0.01;
      if (p.life > 0) {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        if (p.shape === 'rect') {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation || 0);
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
          ctx.restore();
        } else {
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        remaining.push(p);
      }
    }
    this.particles = remaining;
    ctx.globalAlpha = 1;
    this.animId = requestAnimationFrame(function () { Celebration.animate(); });
  },

  // ====== Fireworks (Word Mastery) ======
  triggerFireworks: function (x, y) {
    if (!x) x = this.canvas.width / 2;
    if (!y) y = this.canvas.height / 2;
    var colors = ['#fbbf24', '#f59e0b', '#fcd34d', '#fde68a', '#fff'];
    var particles = [];
    for (var i = 0; i < 40; i++) {
      var angle = Math.random() * Math.PI * 2;
      var speed = 1 + Math.random() * 3;
      particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        size: 2 + Math.random() * 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1,
        decay: 0.015 + Math.random() * 0.01,
        gravity: 0.02
      });
    }
    this.particles = this.particles.concat(particles);
    this.start();
  },

  // ====== Confetti (Unit Completion) ======
  triggerConfetti: function () {
    var colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#fbbf24'];
    var particles = [];
    var w = this.canvas.width;
    var h = this.canvas.height;
    for (var i = 0; i < 120; i++) {
      particles.push({
        x: Math.random() * w,
        y: -20 - Math.random() * 200,
        vx: (Math.random() - 0.5) * 2,
        vy: 1 + Math.random() * 3,
        size: 4 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1,
        decay: 0.004 + Math.random() * 0.003,
        gravity: 0.03,
        shape: 'rect',
        rotation: Math.random() * Math.PI * 2
      });
    }
    this.particles = this.particles.concat(particles);
    this.start();
  },

  // ====== Streak Celebration ======
  triggerStreak: function (count) {
    var colors = count >= 5 ? ['#f59e0b', '#ef4444', '#fbbf24'] : ['#10b981', '#3b82f6'];
    var particles = [];
    var cx = this.canvas.width / 2;
    var cy = this.canvas.height / 3;
    for (var i = 0; i < 20 + count * 5; i++) {
      var angle = Math.random() * Math.PI * 2;
      var speed = 2 + Math.random() * 4;
      particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1,
        decay: 0.012 + Math.random() * 0.008,
        gravity: 0.04
      });
    }
    this.particles = this.particles.concat(particles);
    this.start();
  },

  // ====== Floating Text ======
  showFloatingText: function (text, color, duration) {
    if (!color) color = '#10b981';
    if (!duration) duration = 1500;

    var el = document.createElement('div');
    el.textContent = text;
    el.style.cssText =
      'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);font-size:2rem;font-weight:700;' +
      'color:' + color + ';z-index:10000;pointer-events:none;text-shadow:0 2px 10px rgba(0,0,0,0.3);' +
      'animation:floatUpFade ' + (duration / 1000) + 's ease forwards;';
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, duration);
  },

  // ====== Quick helpers ======
  celebrateWordMastered: function () {
    this.triggerFireworks();
    this.showFloatingText('✅ 已掌握！');
  },

  celebrateUnitComplete: function (stats) {
    this.triggerConfetti();
    var text = '🎉 单元完成！';
    if (stats) {
      text += ' 掌握 ' + stats.mastered + '/' + stats.total + ' 词';
    }
    this.showFloatingText(text, '#f59e0b', 2000);
  },

  celebrateStreak: function (count) {
    this.triggerStreak(count);
    this.showFloatingText('🔥 连击 x' + count + '！', '#f59e0b', 1500);
  },

  celebrateLevelUp: function (level, title) {
    this.triggerConfetti();
    this.showFloatingText('🎉 Lv.' + level + ' ' + title + '！', '#fbbf24', 2500);
  },

  celebrateAchievement: function (name) {
    this.triggerFireworks(window.innerWidth / 2, window.innerHeight / 2);
    this.showFloatingText('🏆 ' + name + '！', '#fbbf24', 2000);
  },

  // Preferences (can be toggled in settings)
  isEnabled: function () {
    try {
      var prefs = JSON.parse(localStorage.getItem('celebration_prefs') || '{}');
      return prefs.enabled !== false;
    } catch (e) {
      return true;
    }
  },

  setEnabled: function (enabled) {
    try {
      var prefs = JSON.parse(localStorage.getItem('celebration_prefs') || '{}');
      prefs.enabled = enabled;
      localStorage.setItem('celebration_prefs', JSON.stringify(prefs));
    } catch (e) { }
  }
};

// Add floating text animation
(function () {
  var style = document.createElement('style');
  style.textContent =
    '@keyframes floatUpFade { 0%{opacity:1;transform:translate(-50%,-50%) scale(1);} 70%{opacity:1;transform:translate(-50%,-120%) scale(1.1);} 100%{opacity:0;transform:translate(-50%,-180%) scale(0.8);} }';
  document.head.appendChild(style);
})();
