// Audio System - 音效系统集成
// Web Audio API based sound effects for learning interactions

var AudioSystem = {
  audioCtx: null,
  enabled: {
    correct: true,
    wrong: true,
    streak: true,
    mastered: true,
    unitComplete: true,
    achievement: true,
    levelUp: true,
    click: false,
    transition: false
  },
  masterVolume: 0.5,

  init: function () {
    this.loadPreferences();
    this.createContext();
    this._bindAutoCreate();
  },

  _bindAutoCreate: function () {
    var self = this;
    function autoCreate() {
      self.createContext();
      document.removeEventListener('click', autoCreate);
      document.removeEventListener('touchstart', autoCreate);
    }
    document.addEventListener('click', autoCreate);
    document.addEventListener('touchstart', autoCreate);
  },

  createContext: function () {
    if (!this.audioCtx) {
      try {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        console.warn('[AudioSystem] Web Audio API not supported');
      }
    }
  },

  resume: function () {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  },

  loadPreferences: function () {
    try {
      var prefs = JSON.parse(localStorage.getItem('audio_preferences') || '{}');
      for (var key in prefs) {
        if (this.enabled.hasOwnProperty(key)) {
          this.enabled[key] = prefs[key];
        }
      }
      if (prefs.masterVolume !== undefined) {
        this.masterVolume = prefs.masterVolume;
      }
    } catch (e) { }
  },

  savePreferences: function () {
    try {
      localStorage.setItem('audio_preferences', JSON.stringify({
        correct: this.enabled.correct,
        wrong: this.enabled.wrong,
        streak: this.enabled.streak,
        mastered: this.enabled.mastered,
        unitComplete: this.enabled.unitComplete,
        achievement: this.enabled.achievement,
        levelUp: this.enabled.levelUp,
        click: this.enabled.click,
        transition: this.enabled.transition,
        masterVolume: this.masterVolume
      }));
    } catch (e) { }
  },

  // Create a simple oscillator sound
  playTone: function (freq, duration, type, volume) {
    if (!this.audioCtx) return;
    if (!type) type = 'sine';
    if (!volume) volume = this.masterVolume;

    var osc = this.audioCtx.createOscillator();
    var gain = this.audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
    gain.gain.setValueAtTime(volume * 0.3, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start();
    osc.stop(this.audioCtx.currentTime + duration);
  },

  // Correct answer: bright chime
  playCorrect: function () {
    if (!this.enabled.correct) return;
    this.resume();
    this.playTone(523, 0.12, 'sine'); // C5
    setTimeout(function () { AudioSystem.playTone(659, 0.12, 'sine'); }, 80); // E5
  },

  // Wrong answer: dull thud
  playWrong: function () {
    if (!this.enabled.wrong) return;
    this.resume();
    this.playTone(200, 0.2, 'triangle');
  },

  // Streak: ascending scale
  playStreak: function (count) {
    if (!this.enabled.streak) return;
    this.resume();
    var baseFreq = count >= 5 ? 523 : 440; // C5 or A4
    var notes = [1, 1.25, 1.5]; // Major chord intervals
    var self = this;
    for (var i = 0; i < notes.length && i < count; i++) {
      (function (idx) {
        setTimeout(function () {
          self.playTone(baseFreq * notes[idx], 0.1, 'sine');
        }, idx * 80);
      })(i);
    }
  },

  // Word mastered: celebration jingle
  playMastered: function () {
    if (!this.enabled.mastered) return;
    this.resume();
    var notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    var self = this;
    for (var i = 0; i < notes.length; i++) {
      (function (idx) {
        setTimeout(function () {
          self.playTone(notes[idx], 0.15, 'sine');
        }, idx * 100);
      })(i);
    }
  },

  // Unit complete: victory fanfare
  playUnitComplete: function () {
    if (!this.enabled.unitComplete) return;
    this.resume();
    var notes = [523, 659, 784, 1047, 784, 1047];
    var durations = [0.15, 0.15, 0.15, 0.3, 0.15, 0.4];
    var self = this;
    var delay = 0;
    for (var i = 0; i < notes.length; i++) {
      (function (idx) {
        setTimeout(function () {
          self.playTone(notes[idx], durations[idx], 'sine');
        }, delay);
      })(i);
      delay += durations[i] * 1000 + 50;
    }
  },

  // Achievement unlock
  playAchievement: function () {
    if (!this.enabled.achievement) return;
    this.resume();
    var notes = [659, 784, 1047, 1319];
    var self = this;
    for (var i = 0; i < notes.length; i++) {
      (function (idx) {
        setTimeout(function () {
          self.playTone(notes[idx], 0.2, 'triangle');
        }, idx * 120);
      })(i);
    }
  },

  // Level up: ascending horn
  playLevelUp: function () {
    if (!this.enabled.levelUp) return;
    this.resume();
    var notes = [392, 523, 659, 784, 1047]; // G4, C5, E5, G5, C6
    var self = this;
    for (var i = 0; i < notes.length; i++) {
      (function (idx) {
        setTimeout(function () {
          self.playTone(notes[idx], 0.2, 'triangle');
        }, idx * 100);
      })(i);
    }
  },

  // Click feedback
  playClick: function () {
    if (!this.enabled.click) return;
    this.resume();
    this.playTone(800, 0.05, 'sine', this.masterVolume * 0.3);
  },

  // Transition
  playTransition: function () {
    if (!this.enabled.transition) return;
    this.resume();
    this.playTone(440, 0.15, 'sine', this.masterVolume * 0.5);
  },

  // Speak word using TTS
  speakWord: function (word, rate) {
    if (!word) return;
    if (!rate) rate = 0.8;
    try {
      var utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      utterance.rate = rate;
      speechSynthesis.cancel();
      speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('[AudioSystem] TTS not supported');
    }
  },

  // Set individual sound preference
  setSoundEnabled: function (type, enabled) {
    if (this.enabled.hasOwnProperty(type)) {
      this.enabled[type] = enabled;
      this.savePreferences();
    }
  },

  setMasterVolume: function (vol) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    this.savePreferences();
  },

  // Get all preferences for settings UI
  getPreferences: function () {
    return {
      enabled: JSON.parse(JSON.stringify(this.enabled)),
      masterVolume: this.masterVolume
    };
  }
};
