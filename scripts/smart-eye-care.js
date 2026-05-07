var SmartEyeCare = {
  enabled: true,
  currentMode: 'normal',
  checkInterval: null,

  init: function () {
    this.loadState();
    if (this.enabled) this.apply();
    this.startAutoCheck();
  },

  loadState: function () {
    try {
      var stored = localStorage.getItem('eye_care_enabled');
      if (stored !== null) this.enabled = stored === 'true';
    } catch (e) { }
  },

  saveState: function () {
    try {
      localStorage.setItem('eye_care_enabled', String(this.enabled));
    } catch (e) { }
  },

  apply: function () {
    var hour = new Date().getHours();
    var filter = '';
    var mode = 'normal';

    if (hour >= 6 && hour < 18) {
      filter = 'none';
      mode = 'normal';
    } else if (hour >= 18 && hour < 21) {
      filter = 'sepia(30%)';
      mode = 'sepia-light';
    } else {
      filter = 'sepia(70%)';
      mode = 'sepia-deep';
    }

    document.body.style.transition = 'filter 2s ease';
    document.body.style.filter = filter;
    this.currentMode = mode;
  },

  update: function () {
    if (!this.enabled) return;
    this.apply();
  },

  disable: function () {
    document.body.style.transition = 'filter 2s ease';
    document.body.style.filter = 'none';
    this.enabled = false;
    this.currentMode = 'normal';
    this.saveState();
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  },

  enable: function () {
    this.enabled = true;
    this.saveState();
    this.apply();
    this.startAutoCheck();
  },

  toggle: function () {
    if (this.enabled) {
      this.disable();
    } else {
      this.enable();
    }
  },

  startAutoCheck: function () {
    var self = this;
    if (this.checkInterval) clearInterval(this.checkInterval);
    this.checkInterval = setInterval(function () {
      self.update();
    }, 60000);
  },

  getStatus: function () {
    return {
      enabled: this.enabled,
      mode: this.currentMode
    };
  }
};

window.SmartEyeCare = SmartEyeCare;
