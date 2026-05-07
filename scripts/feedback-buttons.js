// 三按钮操作反馈系统
// 为学习检测环节提供"不知道"、"不确定"、"确定"三个操作按钮

const FeedbackButtons = {
  PRIORITY_QUEUE_KEY: 'fb_priority_queue',

  // 渲染三个按钮到指定容器
  render: function (container, wordObj, callbacks) {
    if (!container || !wordObj) return null;

    const html = `
      <div class="feedback-buttons-container">
        <button class="feedback-btn dont-know-btn" data-action="dontKnow">
          <span class="btn-emoji">😕</span>
          <span class="btn-text">不知道</span>
        </button>
        <button class="feedback-btn unsure-btn" data-action="unsure">
          <span class="btn-emoji">🤔</span>
          <span class="btn-text">不确定</span>
        </button>
        <button class="feedback-btn sure-btn" data-action="sure">
          <span class="btn-emoji">✅</span>
          <span class="btn-text">确定</span>
        </button>
      </div>
    `;

    container.innerHTML = html;

    const buttons = container.querySelectorAll('.feedback-btn');

    // 绑定按钮点击事件
    buttons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const action = btn.getAttribute('data-action');
        this._handleButtonClick(action, wordObj, container, buttons, callbacks);
      });
    });

    return buttons;
  },

  // 处理"不知道"按钮点击
  handleDontKnow: function (wordObj, container) {
    if (!wordObj || !container) return null;

    // 显示完整答案卡片
    const answerHtml = `
      <div class="feedback-answer-card">
        <div class="answer-header">
          <h3>${wordObj.w}</h3>
          ${wordObj.p ? `<span class="phonetic">${wordObj.p}</span>` : ''}
        </div>
        <div class="answer-meaning">${wordObj.m}</div>
        ${wordObj.ex && wordObj.ex.length ? `<div class="answer-example">例句: ${wordObj.ex[0]}</div>` : ''}
        <div class="answer-tag">⭐ 已标记为重点学习项</div>
      </div>
    `;

    container.innerHTML = answerHtml;

    // 自动发音
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(wordObj.w);
      utterance.lang = 'en-US';
      speechSynthesis.speak(utterance);
    }

    // 标记到优先级队列
    this._addToPriorityQueue(wordObj.id, 'high');

    return {
      marked: true,
      priority: 'high',
      action: 'dontKnow',
      timestamp: Date.now()
    };
  },

  // 处理"不确定"按钮点击
  handleUnsure: function (wordObj, container) {
    if (!wordObj || !container) return null;

    // 获取渐进式提示
    const hint = ProgressiveHints.getHint(wordObj, 1);

    const html = `
      <div class="feedback-unsure-container">
        <div class="hint-section">
          <div class="hint-label">提示</div>
          <div class="hint-text">${hint.hintText}</div>
        </div>
        <div class="input-section">
          <input type="text" class="answer-input" placeholder="请输入答案..." autofocus>
          <button class="submit-answer-btn">提交</button>
        </div>
        <div class="result-section" style="display: none;"></div>
      </div>
    `;

    container.innerHTML = html;

    const input = container.querySelector('.answer-input');
    const submitBtn = container.querySelector('.submit-answer-btn');
    const resultSection = container.querySelector('.result-section');

    const handleSubmit = () => {
      const userInput = input.value.trim();
      if (!userInput) return;

      const isCorrect = userInput.toLowerCase() === wordObj.w.toLowerCase();

      let resultHtml = '';
      if (isCorrect) {
        resultHtml = `
          <div class="result-correct">
            <span class="result-icon">👏</span>
            <span class="result-text">虽然不确定，但你答对了！</span>
          </div>
        `;
      } else {
        resultHtml = `
          <div class="result-incorrect">
            <span class="result-icon">💡</span>
            <span class="result-text">没关系，现在你知道了~</span>
            <div class="correct-answer">正确答案: ${wordObj.w}</div>
          </div>
        `;
      }

      resultSection.innerHTML = resultHtml;
      resultSection.style.display = 'block';

      // 标记到优先级队列
      this._addToPriorityQueue(wordObj.id, 'medium');

      return {
        marked: true,
        priority: 'medium',
        userInput: userInput,
        correct: isCorrect,
        timestamp: Date.now()
      };
    };

    submitBtn.addEventListener('click', handleSubmit);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleSubmit();
    });

    return null;
  },

  // 处理"确定"按钮点击
  handleSure: function (wordObj, userInput, container) {
    if (!wordObj || !container) return null;

    const isCorrect = userInput.toLowerCase() === wordObj.w.toLowerCase();

    if (isCorrect) {
      // 正确答案处理
      container.innerHTML = `
        <div class="feedback-correct-animation">
          <div class="correct-icon">✅</div>
          <div class="correct-text">正确！</div>
        </div>
      `;

      // 绿色确认动画
      const animation = container.querySelector('.feedback-correct-animation');
      animation.style.animation = 'correctPulse 0.5s ease-in-out';

      // 更新 SM-2 记忆卡
      if (typeof SpacedRepetition !== 'undefined') {
        SpacedRepetition.rateCard(wordObj.id, 5, 'encn');
      }

      // 延迟进入下一项
      setTimeout(() => {
        if (typeof DataBridge !== 'undefined') {
          DataBridge.emit('feedback:next');
        }
      }, 600);

      return {
        correct: true,
        timestamp: Date.now()
      };
    } else {
      // 错误答案处理
      const diffHtml = this._highlightDifferences(userInput, wordObj.w);

      container.innerHTML = `
        <div class="feedback-incorrect-container">
          <div class="incorrect-header">
            <span class="incorrect-icon">❌</span>
            <span class="incorrect-text">答案不正确</span>
          </div>
          <div class="comparison-section">
            <div class="user-answer">你的输入: ${diffHtml.user}</div>
            <div class="correct-answer">正确答案: ${diffHtml.correct}</div>
          </div>
          <div class="full-answer">
            <div class="answer-word">${wordObj.w}</div>
            ${wordObj.p ? `<div class="answer-phonetic">${wordObj.p}</div>` : ''}
            <div class="answer-meaning">${wordObj.m}</div>
            ${wordObj.ex && wordObj.ex.length ? `<div class="answer-example">例句: ${wordObj.ex[0]}</div>` : ''}
          </div>
        </div>
      `;

      // 更新 SM-2 为 0 分
      if (typeof SpacedRepetition !== 'undefined') {
        SpacedRepetition.rateCard(wordObj.id, 0, 'encn');
      }

      // 记录到错题本
      if (typeof DictationMistakeSync !== 'undefined') {
        DictationMistakeSync.syncMistake(wordObj, userInput, false);
      }

      // 放入重新检测队列
      this._addToPriorityQueue(wordObj.id, 'high');

      return {
        correct: false,
        userInput: userInput,
        correctAnswer: wordObj.w,
        timestamp: Date.now()
      };
    }
  },

  // 获取优先级队列
  getPriorityQueue: function () {
    try {
      const stored = localStorage.getItem(this.PRIORITY_QUEUE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Failed to get priority queue:', e);
      return [];
    }
  },

  // 清除优先级队列
  clearPriorityQueue: function () {
    localStorage.removeItem(this.PRIORITY_QUEUE_KEY);
  },

  // 私有方法：处理按钮点击
  _handleButtonClick: function (action, wordObj, container, buttons, callbacks) {
    // 禁用所有按钮
    buttons.forEach(btn => {
      btn.disabled = true;
      btn.classList.add('disabled');
    });

    let result = null;

    switch (action) {
      case 'dontKnow':
        result = this.handleDontKnow(wordObj, container);
        if (callbacks && callbacks.onDontKnow) {
          callbacks.onDontKnow(result);
        }
        break;

      case 'unsure':
        result = this.handleUnsure(wordObj, container);
        if (callbacks && callbacks.onUnsure) {
          callbacks.onUnsure(result);
        }
        break;

      case 'sure':
        if (callbacks && callbacks.onSure) {
          const userInput = callbacks.getUserInput ? callbacks.getUserInput() : '';
          result = this.handleSure(wordObj, userInput, container);
          callbacks.onSure(result);
        }
        break;
    }

    return result;
  },

  // 私有方法：添加到优先级队列
  _addToPriorityQueue: function (wordId, priority) {
    const queue = this.getPriorityQueue();

    // 检查是否已存在
    const existingIndex = queue.findIndex(item => item.wordId === wordId);

    if (existingIndex >= 0) {
      // 更新优先级（取最高优先级）
      const existing = queue[existingIndex];
      if (priority === 'high' || (priority === 'medium' && existing.priority === 'low')) {
        existing.priority = priority;
        existing.timestamp = Date.now();
      }
    } else {
      // 添加新项
      queue.push({
        wordId: wordId,
        priority: priority,
        timestamp: Date.now(),
        reviewCount: 0
      });
    }

    // 按优先级和时间排序
    queue.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return a.timestamp - b.timestamp;
    });

    // 保存队列
    try {
      localStorage.setItem(this.PRIORITY_QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {
      console.error('Failed to save priority queue:', e);
    }
  },

  // 私有方法：高亮差异
  _highlightDifferences: function (userInput, correctAnswer) {
    const user = userInput.toLowerCase();
    const correct = correctAnswer.toLowerCase();
    let userHtml = '';
    let correctHtml = '';

    const maxLength = Math.max(user.length, correct.length);

    for (let i = 0; i < maxLength; i++) {
      const userChar = i < user.length ? user[i] : '';
      const correctChar = i < correct.length ? correct[i] : '';

      if (userChar === correctChar) {
        userHtml += userChar;
        correctHtml += correctChar;
      } else {
        userHtml += `<span class="diff-incorrect">${userChar || ' '}</span>`;
        correctHtml += `<span class="diff-correct">${correctChar || ' '}</span>`;
      }
    }

    return {
      user: userHtml,
      correct: correctHtml
    };
  }
};

// 添加相关CSS样式
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    .feedback-buttons-container {
      display: flex;
      gap: 12px;
      justify-content: center;
      margin: 20px 0;
      flex-wrap: wrap;
    }

    .feedback-btn {
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 120px;
      justify-content: center;
    }

    .feedback-btn:hover:not(.disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .feedback-btn.disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none !important;
      box-shadow: none !important;
    }

    .dont-know-btn {
      background: #f1f1f1;
      color: #666;
    }

    .unsure-btn {
      background: #fff3cd;
      color: #856404;
    }

    .sure-btn {
      background: #d4edda;
      color: #155724;
    }

    .feedback-answer-card {
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 12px;
      padding: 20px;
      margin: 20px 0;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .answer-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }

    .answer-header h3 {
      margin: 0;
      font-size: 24px;
      color: #333;
    }

    .phonetic {
      color: #666;
      font-style: italic;
    }

    .answer-meaning {
      font-size: 18px;
      color: #444;
      margin-bottom: 12px;
    }

    .answer-example {
      color: #666;
      font-style: italic;
      margin-bottom: 12px;
    }

    .answer-tag {
      background: #fff3cd;
      color: #856404;
      padding: 8px 12px;
      border-radius: 6px;
      display: inline-block;
      font-weight: 600;
    }

    .feedback-unsure-container {
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 12px;
      padding: 20px;
      margin: 20px 0;
    }

    .hint-section {
      margin-bottom: 16px;
    }

    .hint-label {
      font-weight: 600;
      color: #666;
      margin-bottom: 8px;
    }

    .hint-text {
      color: #333;
      font-size: 16px;
    }

    .input-section {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
    }

    .answer-input {
      flex: 1;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 16px;
    }

    .submit-answer-btn {
      padding: 12px 24px;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
    }

    .result-section {
      padding: 16px;
      border-radius: 6px;
      margin-top: 16px;
    }

    .result-correct {
      background: #d4edda;
      color: #155724;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .result-incorrect {
      background: #d1ecf1;
      color: #0c5460;
    }

    .correct-answer {
      margin-top: 8px;
      font-weight: 600;
    }

    .feedback-correct-animation {
      text-align: center;
      padding: 40px;
      animation: correctPulse 0.5s ease-in-out;
    }

    .correct-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }

    .correct-text {
      font-size: 24px;
      font-weight: 600;
      color: #28a745;
    }

    @keyframes correctPulse {
      0% { transform: scale(0.8); opacity: 0; }
      50% { transform: scale(1.1); }
      100% { transform: scale(1); opacity: 1; }
    }

    .feedback-incorrect-container {
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 12px;
      padding: 20px;
      margin: 20px 0;
    }

    .incorrect-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
      color: #dc3545;
    }

    .comparison-section {
      margin-bottom: 20px;
    }

    .user-answer, .correct-answer {
      margin-bottom: 8px;
      font-size: 16px;
    }

    .diff-incorrect {
      background: #f8d7da;
      color: #721c24;
      padding: 0 2px;
      border-radius: 2px;
    }

    .diff-correct {
      background: #d4edda;
      color: #155724;
      padding: 0 2px;
      border-radius: 2px;
    }

    .full-answer {
      background: #f8f9fa;
      padding: 16px;
      border-radius: 6px;
    }

    .answer-word {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .answer-phonetic {
      color: #666;
      font-style: italic;
      margin-bottom: 8px;
    }

    .answer-meaning {
      color: #333;
      margin-bottom: 8px;
    }

    @media (max-width: 768px) {
      .feedback-buttons-container {
        flex-direction: column;
        align-items: center;
      }

      .feedback-btn {
        width: 100%;
        max-width: 280px;
      }

      .input-section {
        flex-direction: column;
      }
    }
  `;
  document.head.appendChild(style);
}