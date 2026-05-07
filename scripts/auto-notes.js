var AutoNotes = {
  STORAGE_KEY: 'auto_notes',

  generate: function (sessionData) {
    var accuracy = sessionData.totalCount > 0
      ? Math.round((sessionData.correctCount / sessionData.totalCount) * 100)
      : 0;
    var minutes = Math.round((sessionData.duration || 0) / 60000);

    var weakWords = (sessionData.wrongWords || [])
      .slice()
      .sort(function (a, b) { return b.count - a.count; })
      .slice(0, 5);

    var suggestion = this._buildSuggestion(accuracy, weakWords);

    var note = {
      timestamp: Date.now(),
      wordsStudied: sessionData.wordsStudied || 0,
      accuracy: accuracy,
      duration: minutes,
      weakWords: weakWords.map(function (w) { return w.word; }),
      suggestion: suggestion
    };

    this._saveNote(note);
    this._showModal(note);
  },

  _buildSuggestion: function (accuracy, weakWords) {
    if (accuracy >= 90) return '表现优秀！明天可以挑战更难的内容 🚀';
    if (accuracy >= 70) return '表现不错！建议明天复习一下薄弱单词后继续前进 📖';
    if (accuracy >= 50) return '需要加油！建议明天重点复习薄弱单词再学新课 📝';
    return '需要巩固基础！建议明天专注复习，不学新课 🔄';
  },

  _saveNote: function (note) {
    var notes = [];
    try {
      var stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        notes = JSON.parse(stored);
      }
    } catch (e) {
      notes = [];
    }

    notes.push(note);

    if (notes.length > 7) {
      notes = notes.slice(notes.length - 7);
    }

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(notes));
    } catch (e) { }
  },

  _showModal: function (note) {
    var weakHtml = '';
    if (note.weakWords.length > 0) {
      weakHtml = '<div style="margin-top:10px;">' +
        '<strong>⚠️ 薄弱单词：</strong>' +
        note.weakWords.map(function (w) {
          return '<span style="display:inline-block;background:#fee2e2;color:#991b1b;' +
            'padding:2px 8px;border-radius:10px;margin:2px;font-size:0.85rem;">' + w + '</span>';
        }).join(' ') +
        '</div>';
    } else {
      weakHtml = '<div style="margin-top:10px;color:#10b981;">✅ 没有薄弱单词，全部掌握！</div>';
    }

    var html = '<div id="autoNotesModal" style="position:fixed;top:15px;right:15px;' +
      'z-index:10001;max-width:360px;transition:all 0.3s ease;">' +
      '<div style="background:white;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.15);' +
      'padding:16px;border-left:4px solid #6366f1;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">' +
      '<strong style="font-size:1rem;">📝 本次学习小结</strong>' +
      '<button id="autoNotesExpand" style="background:none;border:none;font-size:1.2rem;' +
      'cursor:pointer;padding:0 4px;color:#6b7280;">⋮</button>' +
      '</div>' +
      '<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:8px;">' +
      '<span>📊 学习<strong>' + note.wordsStudied + '</strong>个单词</span>' +
      '<span>正确率 <strong style="color:' + (note.accuracy >= 80 ? '#10b981' : note.accuracy >= 60 ? '#f59e0b' : '#ef4444') + '">' + note.accuracy + '%</strong></span>' +
      '<span>⏱ 用时<strong>' + note.duration + '</strong>分钟</span>' +
      '</div>' +
      '<div id="autoNotesDetail" style="display:none;">' +
      weakHtml +
      '<div style="margin-top:10px;color:#6b7280;font-size:0.85rem;">💡 ' + note.suggestion + '</div>' +
      '</div>' +
      '</div></div>';

    document.body.insertAdjacentHTML('beforeend', html);

    var self = this;
    var expandBtn = document.getElementById('autoNotesExpand');
    var detailEl = document.getElementById('autoNotesDetail');

    expandBtn.addEventListener('click', function () {
      var isVisible = detailEl.style.display !== 'none';
      detailEl.style.display = isVisible ? 'none' : 'block';
      expandBtn.textContent = isVisible ? '⋮' : '✕';
    });

    setTimeout(function () {
      var modal = document.getElementById('autoNotesModal');
      if (modal) {
        modal.style.opacity = '0';
        modal.style.transform = 'translateX(20px)';
        setTimeout(function () {
          if (modal && modal.parentNode) {
            modal.parentNode.removeChild(modal);
          }
        }, 300);
      }
    }, 3000);
  },

  getRecent: function (count) {
    var notes = [];
    try {
      var stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        notes = JSON.parse(stored);
      }
    } catch (e) {
      return [];
    }

    count = count || 3;
    return notes.slice(-count);
  },

  renderDashboardCard: function () {
    var notes = this.getRecent(1);
    if (notes.length === 0) return '';

    var last = notes[0];
    var dateStr = new Date(last.timestamp).toLocaleDateString('zh-CN');

    var html = '<div class="card p-3 mb-3">';
    html += '<h4 class="mb-2">📝 最近学习笔记</h4>';
    html += '<p style="font-size:0.85rem;color:#6b7280;">' + dateStr + '</p>';
    html += '<div style="display:flex;gap:12px;flex-wrap:wrap;">';
    html += '<span>📊 学习 <strong>' + last.wordsStudied + '</strong> 个单词</span>';
    html += '<span>正确率 <strong>' + last.accuracy + '%</strong></span>';
    html += '<span>⏱ ' + last.duration + ' 分钟</span>';
    html += '</div>';

    if (last.weakWords && last.weakWords.length > 0) {
      html += '<div style="margin-top:6px;font-size:0.8rem;color:#ef4444;">' +
        '⚠️ 薄弱: ' + last.weakWords.join(', ') + '</div>';
    }

    html += '</div>';
    return html;
  }
};

window.AutoNotes = AutoNotes;
