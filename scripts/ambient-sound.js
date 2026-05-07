var AmbientSound = {
  audioCtx: null,
  sourceNode: null,
  gainNode: null,
  currentType: null,
  volume: 30,

  init: function () {
    try {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn('[AmbientSound] Web Audio API not supported');
      return;
    }
    this.loadPrefs();
  },

  loadPrefs: function () {
    try {
      var prefs = JSON.parse(localStorage.getItem('ambient_prefs') || '{}');
      if (typeof prefs.volume === 'number') this.volume = prefs.volume;
      if (prefs.lastType) this.currentType = prefs.lastType;
    } catch (e) { }
  },

  savePrefs: function () {
    try {
      localStorage.setItem('ambient_prefs', JSON.stringify({
        volume: this.volume,
        lastType: this.currentType
      }));
    } catch (e) { }
  },

  play: function (type) {
    if (!this.audioCtx) this.init();
    if (!this.audioCtx) return;

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    this.stop(true);

    var bufferSize = 2 * this.audioCtx.sampleRate;
    var buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    var data = buffer.getChannelData(0);

    this._fillBuffer(data, type);

    this.sourceNode = this.audioCtx.createBufferSource();
    this.sourceNode.buffer = buffer;
    this.sourceNode.loop = true;

    this.gainNode = this.audioCtx.createGain();
    this.gainNode.gain.value = this.volume / 100;

    this.sourceNode.connect(this.gainNode);
    this.gainNode.connect(this.audioCtx.destination);
    this.sourceNode.start(0);

    this.currentType = type;
    this.savePrefs();
  },

  _fillBuffer: function (data, type) {
    var sampleRate = this.audioCtx.sampleRate;
    for (var i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    if (type === 'rain') {
      var rainFilter = this._createSimpleFilter(data, sampleRate, 2000, 8000);
      for (var r = 0; r < data.length; r++) {
        data[r] = rainFilter[r] * 0.3 + (Math.random() - 0.5) * 0.1;
      }
    } else if (type === 'forest') {
      for (var f = 0; f < data.length; f++) {
        data[f] = data[f] * 0.08 + Math.sin(2 * Math.PI * (300 + (f % 500) * 0.2) * f / sampleRate) * 0.02;
        if (f % 8000 < 4000) data[f] *= 0.5;
      }
    } else if (type === 'cafe') {
      for (var c = 0; c < data.length; c++) {
        data[c] = data[c] * 0.12;
        if (c % 3000 < 1500) {
          data[c] += (Math.random() - 0.5) * 0.06;
        }
      }
    } else if (type === 'whitenoise') {
      for (var w = 0; w < data.length; w++) {
        data[w] = data[w] * 0.25;
      }
    }

    var smoothFactor = 0.5;
    for (var s = 1; s < data.length; s++) {
      data[s] = data[s - 1] * smoothFactor + data[s] * (1 - smoothFactor);
    }
  },

  _createSimpleFilter: function (data, sr, lowFreq, highFreq) {
    var out = new Float32Array(data.length);
    var lowCut = lowFreq / sr;
    var highCut = highFreq / sr;
    for (var i = 1; i < data.length; i++) {
      out[i] = out[i - 1] * 0.997 + data[i] * 0.1;
      var t = i / sr;
      var mod = Math.sin(2 * Math.PI * lowCut * i) * 0.5 + 0.5;
      out[i] *= mod;
    }
    return out;
  },

  stop: function (silent) {
    if (this.sourceNode) {
      try { this.sourceNode.stop(); } catch (e) { }
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (!silent) {
      this.currentType = null;
      this.savePrefs();
    }
  },

  setVolume: function (v) {
    this.volume = Math.max(0, Math.min(100, v));
    if (this.gainNode) {
      this.gainNode.gain.value = this.volume / 100;
    }
    this.savePrefs();
  },

  isPlaying: function () {
    return this.sourceNode !== null;
  }
};

window.AmbientSound = AmbientSound;
