const EnhancedWordsModule = {
    currentUnit: null,
    currentSort: 'alphabetical',
    currentFilter: 'all',
    selectedWord: null,
    learningMode: 'browse',
    currentLearningPlan: null,
    todayWords: [],

    init: function () {
        this.render();
        this.bindEvents();
    },

    render: function () {
        const moduleContent = document.getElementById('moduleContent');
        moduleContent.innerHTML = `
            <div class="enhanced-words-module">
                <div class="page-header mb-4">
                    <h2>📖 单词学习（增强版）</h2>
                    <p class="text-muted">基于科学记忆法的系统化单词学习方案</p>
                </div>
                
                <div class="learning-plan-section mb-4">
                    <div class="learning-plan-header">
                        <h3 class="learning-plan-title">
                            📚 今日学习计划
                        </h3>
                        <div class="learning-plan-stats">
                            <div class="learning-stat-item">
                                <div class="learning-stat-value">${this.getTodayWordCount()}</div>
                                <div class="learning-stat-label">今日单词</div>
                            </div>
                            <div class="learning-stat-item">
                                <div class="learning-stat-value">${this.getReviewedCount()}</div>
                                <div class="learning-stat-label">已复习</div>
                            </div>
                            <div class="learning-stat-item">
                                <div class="learning-stat-value">${Math.round(this.getMasteryRate() * 100)}%</div>
                                <div class="learning-stat-label">掌握率</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="ebbinghaus-curve">
                        <h4 class="ebbinghaus-title">🧠 艾宾浩斯遗忘曲线复习计划</h4>
                        <div class="ebbinghaus-timeline">
                            <div class="ebbinghaus-node ${this.isReviewDue(1) ? 'completed' : 'pending'}">
                                <div class="ebbinghaus-dot">1</div>
                                <div class="ebbinghaus-label">1天后</div>
                            </div>
                            <div class="ebbinghaus-node ${this.isReviewDue(3) ? 'completed' : 'pending'}">
                                <div class="ebbinghaus-dot">2</div>
                                <div class="ebbinghaus-label">3天后</div>
                            </div>
                            <div class="ebbinghaus-node ${this.isReviewDue(7) ? 'completed' : 'pending'}">
                                <div class="ebbinghaus-dot">3</div>
                                <div class="ebbinghaus-label">7天后</div>
                            </div>
                            <div class="ebbinghaus-node ${this.isReviewDue(14) ? 'completed' : 'pending'}">
                                <div class="ebbinghaus-dot">4</div>
                                <div class="ebbinghaus-label">14天后</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="daily-schedule">
                        ${this.renderDailySchedule()}
                    </div>
                </div>
                
                <div class="filter-bar flex flex-col gap-2 mb-4" style="gap: 1rem;">
                    <div class="flex gap-2 flex-wrap">
                        <div class="select-wrapper" style="flex: 1; min-width: 200px;">
                            <select id="unitSelectEnhanced" class="form-control">
                                <option value="">全部单元</option>
                                ${Grade7Data.units.map(unit =>
            `<option value="${unit.id}">${unit.name}</option>`
        ).join('')}
                            </select>
                        </div>
                        <div class="select-wrapper" style="width: 150px;">
                            <select id="sortSelectEnhanced" class="form-control">
                                <option value="alphabetical">字母顺序</option>
                                <option value="frequency">使用频率</option>
                                <option value="mastery">掌握程度</option>
                                <option value="review_priority">复习优先</option>
                            </select>
                        </div>
                        <div class="select-wrapper" style="width: 150px;">
                            <select id="filterSelectEnhanced" class="form-control">
                                <option value="all">全部</option>
                                <option value="new">新单词</option>
                                <option value="review">需复习</option>
                                <option value="mastered">已掌握</option>
                            </select>
                        </div>
                        <button class="btn btn-primary" id="startLearningBtn">
                            🚀 开始学习
                        </button>
                    </div>
                </div>
                
                <div class="words-container grid grid-2 gap-3" id="wordsListEnhanced">
                    ${this.renderEnhancedWordsList()}
                </div>
                
                <div class="enhanced-word-detail-modal" id="enhancedWordDetailModal" style="display: none;">
                    <div class="enhanced-modal-content">
                        <div class="enhanced-modal-header">
                            <h3 class="enhanced-modal-title" id="enhancedModalWordTitle">单词详情</h3>
                            <button class="enhanced-modal-close" id="closeEnhancedModal">&times;</button>
                        </div>
                        <div class="enhanced-modal-body" id="enhancedModalBody">
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    renderEnhancedWordsList: function () {
        let words = Grade7Data.getAllWords();

        if (this.currentUnit) {
            words = words.filter(w => w.unitId === parseInt(this.currentUnit));
        }

        if (this.currentFilter !== 'all') {
            words = words.filter(w => {
                const status = Storage.getWordStatus(w.id);
                if (this.currentFilter === 'new') return status.status === 'not_started';
                if (this.currentFilter === 'review') return this.isWordDueForReview(w.id);
                if (this.currentFilter === 'mastered') return status.status === 'mastered';
                return true;
            });
        }

        words = this.sortWordsEnhanced(words);

        if (words.length === 0) {
            return '<div class="text-center text-muted col-span-2">没有找到符合条件的单词</div>';
        }

        return words.map(word => {
            const status = Storage.getWordStatus(word.id);
            const isDue = this.isWordDueForReview(word.id);

            return `
                <div class="word-card-enhanced" data-word-id="${word.id}">
                    <div class="word-card-header">
                        <span class="word-status-badge status-${status.status}">
                            ${status.status === 'not_started' ? '未学习' : status.status === 'learning' ? '学习中' : '已掌握'}
                        </span>
                        <span class="word-unit-tag">${(word.unitName || '').split(' ')[0]}</span>
                    </div>
                    <div class="word-card-body">
                        ${word.image ? `
                        <div class="word-image-section">
                            <img src="${word.image}" alt="${word.word}" class="word-image-enhanced" onerror="this.style.display='none'">
                        </div>
                        ` : ''}
                        <div class="word-text-section">
                            <h3 class="word-main">${word.word}</h3>
                            <p class="word-phonetic">${word.phonetic}</p>
                            <div class="word-pos-meaning">
                                <span class="word-pos">${word.partOfSpeech}</span>
                                <span class="word-meaning">${word.meaning}</span>
                            </div>
                            ${word.examples && word.examples.length > 0 ? `
                            <div class="word-examples-preview">
                                <p class="word-example-sentence">${word.examples[0]}</p>
                            </div>
                            ` : ''}
                        </div>
                        <div class="word-actions-enhanced">
                            <button class="word-action-btn btn-play-enhanced" data-action="play">
                                🔊 发音
                            </button>
                            <button class="word-action-btn btn-detail-enhanced" data-action="detail">
                                📝 详情
                            </button>
                            <button class="word-action-btn btn-master-enhanced ${status.status === 'mastered' ? 'mastered' : ''}" data-action="toggle-master">
                                ${status.status === 'mastered' ? '📚 重新学习' : '✅ 已掌握'}
                            </button>
                        </div>
                        ${isDue ? `
                        <div class="review-reminder" style="background: #fef3c7; color: #92400e; padding: 0.5rem; border-radius: 4px; text-align: center; font-size: 0.8125rem; margin-top: 0.5rem;">
                            ⏰ 需复习
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    },

    sortWordsEnhanced: function (words) {
        return [...words].sort((a, b) => {
            switch (this.currentSort) {
                case 'alphabetical':
                    return (a.word || '').localeCompare(b.word || '');
                case 'frequency':
                    return b.frequency - a.frequency;
                case 'mastery':
                    const statusA = Storage.getWordStatus(a.id);
                    const statusB = Storage.getWordStatus(b.id);
                    const order = { mastered: 0, learning: 1, not_started: 2 };
                    return order[statusA.status] - order[statusB.status];
                case 'review_priority':
                    const dueA = this.isWordDueForReview(a.id) ? 0 : 1;
                    const dueB = this.isWordDueForReview(b.id) ? 0 : 1;
                    if (dueA !== dueB) return dueA - dueB;
                    return a.word.localeCompare(b.word);
                default:
                    return 0;
            }
        });
    },

    getTodayWordCount: function () {
        const allWords = Grade7Data.getAllWords();
        const today = new Date().toDateString();
        let count = 0;

        allWords.forEach(word => {
            const status = Storage.getWordStatus(word.id);
            if (status.lastLearned && new Date(status.lastLearned).toDateString() === today) {
                count++;
            }
        });

        return count;
    },

    getReviewedCount: function () {
        const allWords = Grade7Data.getAllWords();
        const today = new Date().toDateString();
        let count = 0;

        allWords.forEach(word => {
            const status = Storage.getWordStatus(word.id);
            if (status.lastReviewed && new Date(status.lastReviewed).toDateString() === today) {
                count++;
            }
        });

        return count;
    },

    getMasteryRate: function () {
        const allWords = Grade7Data.getAllWords();
        const masteredCount = allWords.filter(word => {
            const status = Storage.getWordStatus(word.id);
            return status.status === 'mastered';
        }).length;

        return allWords.length > 0 ? masteredCount / allWords.length : 0;
    },

    isReviewDue: function (days) {
        return Math.random() > 0.5;
    },

    isWordDueForReview: function (wordId) {
        const status = Storage.getWordStatus(wordId);
        if (!status.lastLearned) return false;

        const daysSince = (Date.now() - new Date(status.lastLearned).getTime()) / (1000 * 60 * 60 * 24);

        const reviewDays = [1, 3, 7, 14];
        return reviewDays.some(day => Math.abs(daysSince - day) < 1);
    },

    renderDailySchedule: function () {
        const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
        const today = new Date().getDay();
        const adjustedToday = today === 0 ? 6 : today - 1;

        return days.map((day, index) => {
            const isToday = index === adjustedToday;
            const isLearningDay = index >= 4;

            return `
                <div class="day-card ${isToday ? 'active' : ''} ${isLearningDay ? 'learning-day' : ''}">
                    <div class="day-name">${day}</div>
                    <div class="day-status">
                        ${isToday ? '📅' : isLearningDay ? '📚' : '💤'}
                    </div>
                    <div class="day-tasks">
                        ${isLearningDay ? '10-15词' : '休息'}
                    </div>
                </div>
            `;
        }).join('');
    },

    showEnhancedWordDetail: function (word) {
        const status = Storage.getWordStatus(word.id);
        const modal = document.getElementById('enhancedWordDetailModal');
        const modalTitle = document.getElementById('enhancedModalWordTitle');
        const modalBody = document.getElementById('enhancedModalBody');

        modalTitle.innerHTML = `
            <span style="margin-right: 0.5rem;">📘</span>
            ${word.word}
            <span class="word-phonetic" style="font-size: 1rem; margin-left: 0.5rem;">${word.phonetic}</span>
        `;

        modalBody.innerHTML = `
            <div class="enhanced-word-detail-content">
                ${word.image ? `
                <div class="detail-section-enhanced text-center">
                    <img src="${word.image}" alt="${word.word}" class="detail-word-image">
                </div>
                ` : ''}
                
                <div class="detail-section-enhanced">
                    <h4 class="detail-section-title">📋 基本信息</h4>
                    <div class="detail-info-grid">
                        <div class="detail-info-item">
                            <div class="detail-info-label">词性</div>
                            <div class="detail-info-value">${word.partOfSpeech}</div>
                        </div>
                        <div class="detail-info-item">
                            <div class="detail-info-label">释义</div>
                            <div class="detail-info-value">${word.meaning}</div>
                        </div>
                        <div class="detail-info-item">
                            <div class="detail-info-label">使用频率</div>
                            <div class="detail-info-value">${'⭐'.repeat(word.frequency)}</div>
                        </div>
                        <div class="detail-info-item">
                            <div class="detail-info-label">学习状态</div>
                            <div class="detail-info-value">
                                ${status.status === 'not_started' ? '未学习' : status.status === 'learning' ? '学习中' : '已掌握'}
                            </div>
                        </div>
                    </div>
                </div>
                
                ${word.synonyms && word.synonyms.length > 0 ? `
                <div class="detail-section-enhanced">
                    <h4 class="detail-section-title">🔗 同义词</h4>
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        ${word.synonyms.map(syn => `<span style="background: #dbeafe; color: #1e40af; padding: 0.375rem 0.75rem; border-radius: 20px; font-size: 0.875rem;">${syn}</span>`).join('')}
                    </div>
                </div>
                ` : ''}
                
                ${word.antonyms && word.antonyms.length > 0 ? `
                <div class="detail-section-enhanced">
                    <h4 class="detail-section-title">⚖️ 反义词</h4>
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        ${word.antonyms.map(ant => `<span style="background: #fef3c7; color: #92400e; padding: 0.375rem 0.75rem; border-radius: 20px; font-size: 0.875rem;">${ant}</span>`).join('')}
                    </div>
                </div>
                ` : ''}
                
                ${word.examples && word.examples.length > 0 ? `
                <div class="detail-section-enhanced">
                    <h4 class="detail-section-title">📖 例句</h4>
                    <ul class="detail-examples-list">
                        ${word.examples.map(ex => `
                            <li class="detail-example-item">
                                <p class="detail-example-text">${ex}</p>
                            </li>
                        `).join('')}
                    </ul>
                </div>
                ` : ''}
                
                <div class="detail-section-enhanced">
                    <h4 class="detail-section-title">📊 学习状态</h4>
                    <div class="detail-status-buttons">
                        <button class="detail-status-btn ${status.status === 'not_started' ? 'active' : ''}" data-status="not_started">
                            未学习
                        </button>
                        <button class="detail-status-btn ${status.status === 'learning' ? 'active' : ''}" data-status="learning">
                            学习中
                        </button>
                        <button class="detail-status-btn ${status.status === 'mastered' ? 'active' : ''}" data-status="mastered">
                            已掌握
                        </button>
                    </div>
                </div>
                
                <div class="detail-section-enhanced">
                    <h4 class="detail-section-title">🔊 快速操作</h4>
                    <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
                        <button class="btn btn-primary" id="playEnhancedAudio">
                            🔊 播放发音
                        </button>
                        <button class="btn btn-secondary" id="addToFlashcards">
                            🃏 添加到闪卡
                        </button>
                        <button class="btn btn-success" id="markAsLearned">
                            ✅ 标记已学习
                        </button>
                    </div>
                </div>
            </div>
        `;

        modalBody.querySelectorAll('[data-status]').forEach(btn => {
            btn.addEventListener('click', () => {
                Storage.setWordStatus(word.id, { status: btn.dataset.status });
                this.refresh();
                this.showEnhancedWordDetail(word);
                Utils.showNotification('状态已更新！', 'success');
            });
        });

        const playBtn = modalBody.querySelector('#playEnhancedAudio');
        if (playBtn) {
            playBtn.addEventListener('click', () => this.playAudio(word.word));
        }

        const flashcardBtn = modalBody.querySelector('#addToFlashcards');
        if (flashcardBtn) {
            flashcardBtn.addEventListener('click', () => {
                Utils.showNotification('已添加到闪卡！', 'success');
            });
        }

        const learnedBtn = modalBody.querySelector('#markAsLearned');
        if (learnedBtn) {
            learnedBtn.addEventListener('click', () => {
                Storage.setWordStatus(word.id, {
                    status: 'learning',
                    lastLearned: new Date().toISOString()
                });
                this.refresh();
                this.showEnhancedWordDetail(word);
                Utils.showNotification('已标记为已学习！', 'success');
            });
        }

        modal.style.display = 'flex';
    },

    playAudio: function (word) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(word);
            utterance.lang = 'en-US';
            utterance.rate = 0.8;
            speechSynthesis.speak(utterance);
        } else {
            Utils.showNotification('您的浏览器不支持语音功能', 'warning');
        }
    },

    refresh: function () {
        document.getElementById('wordsListEnhanced').innerHTML = this.renderEnhancedWordsList();
    },

    bindEvents: function () {
        document.getElementById('moduleContent').addEventListener('change', (e) => {
            if (e.target.id === 'unitSelectEnhanced') {
                this.currentUnit = e.target.value;
                this.refresh();
            } else if (e.target.id === 'sortSelectEnhanced') {
                this.currentSort = e.target.value;
                this.refresh();
            } else if (e.target.id === 'filterSelectEnhanced') {
                this.currentFilter = e.target.value;
                this.refresh();
            }
        });

        document.getElementById('moduleContent').addEventListener('click', (e) => {
            const wordCard = e.target.closest('.word-card-enhanced');
            if (!wordCard) return;

            const wordId = parseInt(wordCard.dataset.wordId);
            const word = Grade7Data.getAllWords().find(w => w.id === wordId);

            if (e.target.dataset.action === 'play') {
                this.playAudio(word.word);
            } else if (e.target.dataset.action === 'detail') {
                this.showEnhancedWordDetail(word);
            } else if (e.target.dataset.action === 'toggle-master') {
                const currentStatus = Storage.getWordStatus(word.id);
                const newStatus = currentStatus.status === 'mastered' ? 'learning' : 'mastered';
                Storage.setWordStatus(word.id, {
                    status: newStatus,
                    lastLearned: newStatus === 'mastered' ? new Date().toISOString() : currentStatus.lastLearned
                });
                this.refresh();
                Utils.showNotification(newStatus === 'mastered' ? '太棒了！已标记为掌握！' : '继续学习！', 'success');
            }
        });

        document.getElementById('moduleContent').addEventListener('click', (e) => {
            if (e.target.id === 'closeEnhancedModal' || e.target.id === 'enhancedWordDetailModal') {
                document.getElementById('enhancedWordDetailModal').style.display = 'none';
            }
        });

        document.getElementById('moduleContent').addEventListener('click', (e) => {
            if (e.target.id === 'startLearningBtn') {
                this.startLearningMode();
            }
        });
    },

    startLearningMode: function () {
        Utils.showNotification('🚀 学习模式即将启动！', 'info');
    }
};
