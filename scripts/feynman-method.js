var FeynmanMethod = {
  currentWord: null,
  recognition: null,
  transcript: '',

  checkBrowserSupport: function () {
    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    return typeof SpeechRecognition !== 'undefined';
  },

  render: function (word) {
    if (!word) return '<p class="text-center text-muted p-4">请选择一个单词</p>';

    this.currentWord = word;
    this.transcript = '';

    var html = '';
    html += '<div id="feynman-container" class="p-3">';
    html += '<h4 class="mb-2">🧠 费曼学习法</h4>';
    html += '<div class="card mb-3">';
    html += '<div class="card-body text-center">';
    html += '<span class="display-4 d-block mb-2">' + (word.w || '') + '</span>';
    html += '<span class="text-muted">' + (word.p || '') + ' ' + (word.pos || '') + '</span>';
    html += '<p class="mt-2">' + (word.m || '') + '</p>';
    html += '</div></div>';

    html += '<div class="alert alert-info">💡 请用自己的话解释这个单词的意思和用法</div>';

    html += '<div class="d-flex justify-content-center mb-3">';
    html += '<button class="btn btn-danger btn-lg" id="feynman-record-btn" onclick="FeynmanMethod.startRecording()">';
    html += '🎤 开始录音解释</button>';
    html += '</div>';

    html += '<div id="feynman-transcript" class="card mb-3" style="display:none;">';
    html += '<div class="card-header">你说的是：</div>';
    html += '<div class="card-body" id="feynman-transcript-text"></div>';
    html += '</div>';

    html += '<div id="feynman-eval" class="d-flex justify-content-center gap-3" style="display:none;">';
    html += '<button class="btn btn-success" onclick="FeynmanMethod.selfEval(\'clear\')">😊 说清楚了</button>';
    html += '<button class="btn btn-warning" onclick="FeynmanMethod.selfEval(\'unclear\')">🤔 还不太清楚</button>';
    html += '</div>';

    html += '</div>';
    return html;
  },

  startRecording: function () {
    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (typeof SpeechRecognition === 'undefined') {
      alert('您的浏览器不支持语音识别，请使用Chrome浏览器');
      return;
    }

    var btn = document.getElementById('feynman-record-btn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = '🎙️ 正在聆听...';
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'zh-CN';
    this.recognition.interimResults = false;
    this.recognition.maxAlternatives = 1;

    var self = this;
    this.recognition.onresult = function (event) {
      var result = event.results[0][0].transcript;
      self.transcript = result;
      var textDiv = document.getElementById('feynman-transcript-text');
      var transcriptCard = document.getElementById('feynman-transcript');
      if (textDiv) textDiv.textContent = result;
      if (transcriptCard) transcriptCard.style.display = '';
    };

    this.recognition.onend = function () {
      var recordBtn = document.getElementById('feynman-record-btn');
      if (recordBtn) {
        recordBtn.disabled = false;
        recordBtn.textContent = '🎤 重新录音';
      }
      var evalDiv = document.getElementById('feynman-eval');
      if (evalDiv) evalDiv.style.display = '';
    };

    this.recognition.onerror = function (event) {
      var recordBtn = document.getElementById('feynman-record-btn');
      if (recordBtn) {
        recordBtn.disabled = false;
        recordBtn.textContent = '🎤 开始录音解释';
      }
      alert('语音识别出错：' + (event.error || '未知错误'));
    };

    this.recognition.start();
  },

  selfEval: function (evalType) {
    if (!this.currentWord) return;

    var logEntry = {
      word: this.currentWord.w || '',
      timestamp: Date.now(),
      transcript: this.transcript,
      selfEval: evalType
    };

    var logs = [];
    try {
      logs = JSON.parse(localStorage.getItem('feynman_log') || '[]');
    } catch (e) { }

    logs.push(logEntry);

    try {
      localStorage.setItem('feynman_log', JSON.stringify(logs));
    } catch (e) { }

    var container = document.getElementById('feynman-container');
    if (container) {
      var msg = evalType === 'clear' ? '✅ 太棒了！你很好地解释了这个单词！' : '📝 记录下来，回头再复习这个单词！';
      container.innerHTML = '<div class="text-center p-4"><h5>' + msg + '</h5></div>';
    }
  },

  getLogs: function () {
    try {
      return JSON.parse(localStorage.getItem('feynman_log') || '[]');
    } catch (e) {
      return [];
    }
  }
};

window.FeynmanMethod = FeynmanMethod;
