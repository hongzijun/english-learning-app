// Daily Planner - 每日学习规划器
// Shows daily plan modal on first load, tracks progress, triggers celebration

var DailyPlanner = {
  STORAGE_KEY: 'daily_plan',
  plan: null,
  modalEl: null,

  init: function () {
    this.plan = this.loadPlan();
  },

  loadPlan: function () {
    try {
      var stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) { }
    return null;
  },

  savePlan: function () {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.plan));
    } catch (e) { }
  },

  getTodayKey: function () {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  },

  show: function () {
    var today = this.getTodayKey();
    var plan = this.plan;

    if (plan && plan.date === today && plan.achieved) {
      return;
    }

    if (plan && plan.date === today && !plan.achieved) {
      this.showProgressBar();
      return;
    }

    this.renderModal();
  },

  showProgressBar: function () {
    if (this.plan && !this.plan.achieved) {
      this.renderMiniBar();
    }
  },

  renderModal: function () {
    var self = this;
    var existing = document.getElementById('dailyPlannerModal');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.id = 'dailyPlannerModal';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;';

    var box = document.createElement('div');
    box.style.cssText = 'background:#fff;border-radius:16px;padding:2rem;max-width:420px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3);text-align:center;';

    box.innerHTML = '<h2 style="margin:0 0 0.5rem;font-size:1.4rem;"> 今天想学什么？</h2>' +
      '<p style="color:#6b7280;margin:0 0 1.2rem;font-size:0.9rem;">选择今天的学习目标，我会帮你规划进度 ✨</p>' +
      '<div id="planOptions" style="display:flex;flex-direction:column;gap:0.6rem;margin-bottom:1rem;"></div>' +
      '<div id="planConfig" style="display:none;margin-bottom:1rem;"></div>' +
      '<button id="planDismissBtn" style="background:none;border:none;color:#9ca3af;cursor:pointer;font-size:0.85rem;margin-top:0.5rem;"> 稍后再说</button>';

    overlay.appendChild(box);
    document.body.appendChild(overlay);
    this.modalEl = overlay;

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) self.closeModal();
    });

    document.getElementById('planDismissBtn').addEventListener('click', function () {
      self.closeModal();
    });

    this.renderOptions();
  },

  renderOptions: function () {
    var self = this;
    var types = [
      { id: 'new-words', icon: '📝', label: '学新单词' },
      { id: 'review', icon: '🔄', label: '复习旧词' },
      { id: 'grammar', icon: '📖', label: '语法练习' },
      { id: 'challenge', icon: '⚡', label: '速答挑战' },
      { id: 'custom', icon: '🎯', label: '自定义' }
    ];

    var container = document.getElementById('planOptions');
    if (!container) return;
    container.innerHTML = '';

    for (var i = 0; i < types.length; i++) {
      (function (t) {
        var btn = document.createElement('button');
        btn.textContent = t.icon + ' ' + t.label;
        btn.style.cssText = 'padding:0.75rem 1rem;border:2px solid #e5e7eb;border-radius:10px;background:#fff;cursor:pointer;font-size:1rem;transition:all 0.2s;';
        btn.addEventListener('mouseenter', function () { this.style.borderColor = '#3b82f6'; this.style.background = '#eff6ff'; });
        btn.addEventListener('mouseleave', function () { this.style.borderColor = '#e5e7eb'; this.style.background = '#fff'; });
        btn.addEventListener('click', function () { self.showConfig(t); });
        container.appendChild(btn);
      })(types[i]);
    }
  },

  showConfig: function (type) {
    var self = this;
    var container = document.getElementById('planConfig');
    var optionsContainer = document.getElementById('planOptions');
    if (!container) return;

    optionsContainer.style.display = 'none';
    container.style.display = 'block';

    var durations = [
      { label: '15 分钟', value: 15 },
      { label: '30 分钟', value: 30 },
      { label: '45 分钟', value: 45 },
      { label: '自定义', value: 0 }
    ];

    var html = '<p style="margin:0 0 0.8rem;font-weight:600;">' + type.icon + ' ' + type.label + '</p>' +
      '<div style="margin-bottom:0.8rem;"><label style="font-size:0.85rem;color:#6b7280;">目标数量</label>' +
      '<input id="planTarget" type="number" min="1" max="100" value="10" style="width:100%;padding:0.5rem;border:1px solid #d1d5db;border-radius:8px;margin-top:0.25rem;box-sizing:border-box;"></div>' +
      '<div style="margin-bottom:1rem;"><label style="font-size:0.85rem;color:#6b7280;">预计时长</label><div style="display:flex;gap:0.4rem;margin-top:0.25rem;flex-wrap:wrap;">';

    for (var i = 0; i < durations.length; i++) {
      html += '<button class="planDurBtn" data-val="' + durations[i].value + '" style="flex:1;min-width:60px;padding:0.5rem;border:1px solid #d1d5db;border-radius:8px;background:#fff;cursor:pointer;font-size:0.85rem;">' + durations[i].label + '</button>';
    }

    html += '</div><input id="planCustomDur" type="number" min="1" max="120" placeholder="自定义分钟" style="display:none;width:100%;padding:0.5rem;border:1px solid #d1d5db;border-radius:8px;margin-top:0.25rem;box-sizing:border-box;"></div>' +
      '<div style="display:flex;gap:0.5rem;">' +
      '<button id="planBackBtn" style="flex:1;padding:0.6rem;border:1px solid #d1d5db;border-radius:8px;background:#fff;cursor:pointer;"> 返回</button>' +
      '<button id="planStartBtn" style="flex:1;padding:0.6rem;border:none;border-radius:8px;background:#3b82f6;color:#fff;cursor:pointer;font-weight:600;"> 开始学习！</button>' +
      '</div>';

    container.innerHTML = html;

    var selectedDuration = 30;

    var durBtns = container.querySelectorAll('.planDurBtn');
    for (var j = 0; j < durBtns.length; j++) {
      durBtns[j].addEventListener('click', function () {
        selectedDuration = parseInt(this.getAttribute('data-val'));
        var customInput = document.getElementById('planCustomDur');
        if (selectedDuration === 0) {
          customInput.style.display = 'block';
          customInput.focus();
        } else {
          customInput.style.display = 'none';
        }
        for (var k = 0; k < durBtns.length; k++) {
          durBtns[k].style.background = '#fff';
          durBtns[k].style.borderColor = '#d1d5db';
        }
        this.style.background = '#eff6ff';
        this.style.borderColor = '#3b82f6';
      });
    }

    document.getElementById('planCustomDur').addEventListener('input', function () {
      selectedDuration = parseInt(this.value) || 0;
    });

    document.getElementById('planBackBtn').addEventListener('click', function () {
      container.style.display = 'none';
      optionsContainer.style.display = 'flex';
    });

    document.getElementById('planStartBtn').addEventListener('click', function () {
      var target = parseInt(document.getElementById('planTarget').value) || 10;
      if (selectedDuration === 0) {
        selectedDuration = parseInt(document.getElementById('planCustomDur').value) || 30;
      }
      self.startPlan(type.id, target, selectedDuration);
    });

    durBtns[1].click();
  },

  startPlan: function (type, target, duration) {
    this.plan = {
      date: this.getTodayKey(),
      type: type,
      target: target,
      duration: duration,
      completed: 0,
      achieved: false
    };
    this.savePlan();
    this.closeModal();
    this.renderMiniBar();

    if (typeof Utils !== 'undefined' && Utils.showNotification) {
      Utils.showNotification('学习计划已设定！目标：' + target + '个，预计' + duration + '分钟', 'success');
    }
  },

  closeModal: function () {
    if (this.modalEl) {
      this.modalEl.remove();
      this.modalEl = null;
    }
  },

  renderMiniBar: function () {
    var existing = document.getElementById('dailyMiniBar');
    if (existing) existing.remove();
    if (!this.plan || this.plan.achieved) return;

    var bar = document.createElement('div');
    bar.id = 'dailyMiniBar';
    var pct = Math.min(100, Math.round((this.plan.completed / this.plan.target) * 100));
    bar.style.cssText = 'position:fixed;bottom:0;left:0;width:100%;background:#fff;border-top:2px solid #3b82f6;padding:0.5rem 1rem;z-index:9998;display:flex;align-items:center;gap:0.75rem;box-shadow:0 -2px 10px rgba(0,0,0,0.1);';

    var iconMap = { 'new-words': '📝', 'review': '🔄', 'grammar': '📖', 'challenge': '⚡', 'custom': '🎯' };
    bar.innerHTML = '<span>' + (iconMap[this.plan.type] || '📚') + '</span>' +
      '<div style="flex:1;height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden;">' +
      '<div style="height:100%;width:' + pct + '%;background:#3b82f6;border-radius:4px;transition:width 0.3s;"></div></div>' +
      '<span style="font-size:0.8rem;color:#6b7280;white-space:nowrap;">' + this.plan.completed + '/' + this.plan.target + '</span>';

    document.body.appendChild(bar);
  },

  trackProgress: function (count) {
    if (!count) count = 1;
    if (!this.plan || this.plan.achieved) return;
    if (this.plan.date !== this.getTodayKey()) return;

    this.plan.completed = Math.min(this.plan.target, this.plan.completed + count);
    this.savePlan();
    this.renderMiniBar();

    if (this.plan.completed >= this.plan.target) {
      this.plan.achieved = true;
      this.savePlan();
      this.removeMiniBar();
      if (typeof Celebration !== 'undefined' && Celebration.celebrateAchievement) {
        Celebration.celebrateAchievement('目标达成');
      }
      if (typeof Celebration !== 'undefined' && Celebration.triggerConfetti) {
        Celebration.triggerConfetti();
      }
    }
  },

  getProgress: function () {
    if (!this.plan || this.plan.date !== this.getTodayKey()) return 0;
    return Math.min(100, Math.round((this.plan.completed / this.plan.target) * 100));
  },

  removeMiniBar: function () {
    var existing = document.getElementById('dailyMiniBar');
    if (existing) existing.remove();
  },

  isPlanActive: function () {
    return this.plan && this.plan.date === this.getTodayKey() && !this.plan.achieved;
  }
};

window.DailyPlanner = DailyPlanner;
