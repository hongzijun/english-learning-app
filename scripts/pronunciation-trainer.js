var PronunciationTrainer = {
  _recognition: null,
  _lastResult: null,
  _recordingActive: false,

  speakWord: function (word) {
    try {
      if (!window.speechSynthesis) {
        console.warn('⚠ 浏览器不支持SpeechSynthesis API，无法朗读单词');
        return;
      }
      window.speechSynthesis.cancel();
      var utterance = new SpeechSynthesisUtterance(word.w);
      utterance.lang = 'en-US';
      utterance.rate = 0.8;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('朗读单词时出错: ' + e.message);
    }
  },

  startRecording: function () {
    try {
      var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        console.warn('⚠ 发音识别依赖浏览器SpeechRecognition API（Chrome支持最佳）');
        return false;
      }
      if (this._recognition) {
        try { this._recognition.abort(); } catch (e) { }
      }
      this._recognition = new SpeechRecognition();
      this._recognition.lang = 'en-US';
      this._recognition.interimResults = false;
      this._recognition.maxAlternatives = 3;
      this._recordingActive = true;
      this._lastResult = null;

      var self = this;
      this._recognition.onerror = function (event) {
        console.warn('语音识别错误: ' + event.error);
        self._recordingActive = false;
      };

      this._recognition.onend = function () {
        self._recordingActive = false;
        self._recognition = null;
      };

      this._recognition.start();
      return true;
    } catch (e) {
      console.warn('启动录音时出错: ' + e.message);
      return false;
    }
  },

  stopRecordingAndCheck: function (targetWord) {
    var result = { stars: 1, match: 'none', spoken: '' };
    try {
      if (!this._recognition) {
        return result;
      }

      var self = this;

      this._recognition.onresult = function (event) {
        try {
          var spoken = '';
          if (event.results && event.results.length > 0 && event.results[0].length > 0) {
            spoken = event.results[0][0].transcript.trim();
          }
          result.spoken = spoken;
          self._lastResult = result;

          if (!spoken) {
            result.stars = 1;
            result.match = 'none';
            return;
          }

          var spokenLower = spoken.toLowerCase();
          var targetLower = (targetWord || '').toLowerCase();

          if (spokenLower === targetLower) {
            result.stars = 3;
            result.match = 'full';
          } else if (spokenLower.indexOf(targetLower) === 0 || spokenLower.indexOf(targetLower) > 0) {
            result.stars = 2;
            result.match = 'partial';
          } else {
            result.stars = 1;
            result.match = 'none';
          }
        } catch (e) {
          console.warn('处理识别结果时出错: ' + e.message);
        }
      };

      this._recognition.onerror = function (event) {
        console.warn('语音识别错误: ' + event.error);
        result.match = 'none';
        result.stars = 1;
        self._lastResult = result;
        self._recordingActive = false;
      };

      this._recognition.onend = function () {
        self._recordingActive = false;
        self._recognition = null;
      };

      this._recognition.stop();
      this._recordingActive = false;

      return result;
    } catch (e) {
      console.warn('停止录音时出错: ' + e.message);
      return result;
    }
  },

  renderPronunciationUI: function (word) {
    var isRecording = this._recordingActive;
    var lastResult = this._lastResult;

    var html = '<div class="dragon-vocab-card pronunciation-trainer-card">';
    html += '<div class="dragon-vocab-header">';
    html += '<span class="pronunciation-word-title">🔤 ' + word.w + '</span>';
    html += '<span style="color:#6366f1;font-weight:600;">🎙 发音练习</span>';
    html += '</div>';

    html += '<div style="font-size:0.9rem;color:#666;margin-bottom:0.8rem;">' + (word.p || '') + ' · ' + (word.m || '') + '</div>';

    html += '<div class="pronunciation-actions" style="display:flex;gap:0.5rem;margin-bottom:1rem;flex-wrap:wrap;">';
    html += '<button class="btn btn-primary btn-sm pronunciation-play-btn" onclick="PronunciationTrainer.speakWord(' + JSON.stringify(word) + ')">🔊 播放</button>';

    if (isRecording) {
      html += '<button class="btn btn-sm pronunciation-stop-btn" style="background:#e74c3c;color:#fff;" onclick="PronunciationTrainer.stopRecordingAndCheck(\'' + (word.w || '').replace(/'/g, "\\'") + '\');PronunciationTrainer._refreshUI(\'' + (word.w || '').replace(/'/g, "\\'") + '\');">⏹ 停止</button>';
    } else {
      html += '<button class="btn btn-primary btn-sm pronunciation-record-btn" onclick="PronunciationTrainer.startRecording();PronunciationTrainer._refreshUI(\'' + (word.w || '').replace(/'/g, "\\'") + '\');">🎤 录音</button>';
    }
    html += '</div>';

    html += '<div class="pronunciation-score-area" id="pronunciationScore-' + (word.id || '0') + '">';
    if (lastResult && lastResult.spoken) {
      html += '<div class="pronunciation-result">';
      html += '<div class="pronunciation-stars">';
      for (var i = 0; i < 3; i++) {
        html += '<span class="pronunciation-star' + (i < lastResult.stars ? ' active' : '') + '">⭐</span>';
      }
      html += '</div>';
      html += '<div style="font-size:0.85rem;color:#666;">识别结果: <strong>' + lastResult.spoken + '</strong></div>';
      if (lastResult.match === 'full') {
        html += '<div style="color:#27ae60;font-weight:600;">✅ 完全匹配！发音很好！</div>';
      } else if (lastResult.match === 'partial') {
        html += '<div style="color:#f39c12;font-weight:600;">🔶 部分匹配，再试试看</div>';
      } else {
        html += '<div style="color:#e74c3c;font-weight:600;">❌ 未匹配，请再读一遍</div>';
      }
      html += '</div>';
    }
    html += '</div>';

    html += '<div style="font-size:0.75rem;color:#999;margin-top:0.5rem;">⚠ 发音识别依赖浏览器SpeechRecognition API（Chrome支持最佳）</div>';

    html += '</div>';
    return html;
  },

  _refreshUI: function (wordW) {
    setTimeout(function () {
      var scoreArea = document.getElementById('pronunciationScore-' + (wordW || '0'));
      if (!scoreArea) return;
      var lastResult = PronunciationTrainer._lastResult;
      if (!lastResult || !lastResult.spoken) return;
      var html = '<div class="pronunciation-result">';
      html += '<div class="pronunciation-stars">';
      for (var i = 0; i < 3; i++) {
        html += '<span class="pronunciation-star' + (i < lastResult.stars ? ' active' : '') + '">⭐</span>';
      }
      html += '</div>';
      html += '<div style="font-size:0.85rem;color:#666;">识别结果: <strong>' + lastResult.spoken + '</strong></div>';
      if (lastResult.match === 'full') {
        html += '<div style="color:#27ae60;font-weight:600;">✅ 完全匹配！发音很好！</div>';
      } else if (lastResult.match === 'partial') {
        html += '<div style="color:#f39c12;font-weight:600;">🔶 部分匹配，再试试看</div>';
      } else {
        html += '<div style="color:#e74c3c;font-weight:600;">❌ 未匹配，请再读一遍</div>';
      }
      html += '</div>';
      scoreArea.innerHTML = html;
    }, 800);
  },

  getPronunciationStats: function () {
    try {
      var raw = localStorage.getItem('pronunciation_history');
      if (!raw) {
        return { totalAttempts: 0, averageStars: 0, lastPractice: null };
      }
      var history = JSON.parse(raw);
      if (!history || history.length === 0) {
        return { totalAttempts: 0, averageStars: 0, lastPractice: null };
      }
      var totalStars = 0;
      for (var i = 0; i < history.length; i++) {
        totalStars += history[i].stars || 0;
      }
      var lastEntry = history[history.length - 1];
      return {
        totalAttempts: history.length,
        averageStars: Math.round((totalStars / history.length) * 10) / 10,
        lastPractice: lastEntry ? lastEntry.time : null
      };
    } catch (e) {
      console.warn('获取发音统计时出错: ' + e.message);
      return { totalAttempts: 0, averageStars: 0, lastPractice: null };
    }
  },

  savePronunciationResult: function (wordId, stars) {
    try {
      var raw = localStorage.getItem('pronunciation_history');
      var history = [];
      if (raw) {
        try { history = JSON.parse(raw); } catch (e) { history = []; }
      }
      if (!Array.isArray(history)) {
        history = [];
      }
      history.push({
        wordId: wordId,
        stars: stars,
        time: new Date().toISOString()
      });
      localStorage.setItem('pronunciation_history', JSON.stringify(history));
    } catch (e) {
      console.warn('保存发音结果时出错: ' + e.message);
    }
  }
};
