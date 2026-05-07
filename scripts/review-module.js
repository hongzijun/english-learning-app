const ReviewModule = {
    todayReviews: [],
    reviewHistory: [],

    init: function () {
        this.generateReviewSchedule();
        this.render();
        this.bindEvents();
    },

    generateReviewSchedule: function () {
        const allWords = Grade7Data.getAllWords();
        const today = new Date();
        this.todayReviews = [];

        allWords.forEach(word => {
            const status = Storage.getWordStatus(word.id);
            if (status.status === 'learning' || status.status === 'mastered') {
                const lastReview = status.lastReview ? new Date(status.lastReview) : null;
                const reviewInterval = this.getReviewInterval(status.reviewCount || 0);

                if (!lastReview || Utils.getDaysBetween(lastReview, today) >= reviewInterval) {
                    this.todayReviews.push({
                        ...word,
                        type: 'word',
                        dueDate: Utils.addDays(lastReview || today, reviewInterval)
                    });
                }
            }
        });
    },

    getReviewInterval: function (reviewCount) {
        const intervals = [1, 2, 4, 7, 14, 30, 60];
        return intervals[Math.min(reviewCount, intervals.length - 1)];
    },

    render: function () {
        const moduleContent = document.getElementById('moduleContent');
        moduleContent.innerHTML = `
            <div class="review-module">
                <div class="page-header mb-4">
                    <h2>🔄 复习计划</h2>
                    <p class="text-muted">基于艾宾浩斯记忆曲线，科学复习</p>
                </div>
                
                <div class="stats-cards grid grid-3 gap-3 mb-4">
                    <div class="card text-center">
                        <div class="stat-number text-primary">${this.todayReviews.length}</div>
                        <div class="stat-label text-muted">今日待复习</div>
                    </div>
                    <div class="card text-center">
                        <div class="stat-number text-success">${this.getReviewedToday()}</div>
                        <div class="stat-label text-muted">今日已复习</div>
                    </div>
                    <div class="card text-center">
                        <div class="stat-number text-warning">${this.getStreakDays()}</div>
                        <div class="stat-label text-muted">连续打卡天数</div>
                    </div>
                </div>
                
                <div class="flex gap-2 mb-4 flex-wrap">
                    <button class="btn btn-primary" id="startReviewBtn">
                        🚀 开始今日复习
                    </button>
                    <button class="btn btn-secondary" id="viewCalendarBtn">
                        📅 复习日历
                    </button>
                </div>
                
                <div class="today-reviews card mb-4">
                    <h3 class="card-title">📋 今日复习任务</h3>
                    ${this.renderTodayReviews()}
                </div>
                
                <div class="review-calendar" id="reviewCalendar" style="display: none;">
                    <div class="card">
                        <h3 class="card-title">📅 复习日历</h3>
                        ${this.renderCalendar()}
                    </div>
                </div>
                
                <div class="review-modal" id="reviewModal" style="display: none;">
                    <div class="review-content">
                        <div class="review-header flex-between">
                            <span class="badge badge-primary" id="reviewProgress">1 / 10</span>
                            <button class="btn-close" id="closeReview">&times;</button>
                        </div>
                        <div class="review-body text-center" id="reviewBody">
                        </div>
                        <div class="review-footer flex gap-2 justify-center flex-wrap">
                            <button class="btn btn-warning" id="reviewAgain">🔄 稍后再看</button>
                            <button class="btn btn-success" id="reviewKnow">✅ 记得</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        this.addReviewStyles();
    },

    getReviewedToday: function () {
        const history = Storage.get(Storage.keys.REVIEW_HISTORY);
        const today = Utils.getTodayDate();
        return history.filter(h => Utils.formatDate(h.date) === today).length;
    },

    getStreakDays: function () {
        const history = Storage.get(Storage.keys.REVIEW_HISTORY);
        if (history.length === 0) return 0;

        const sortedDates = [...new Set(history.map(h => Utils.formatDate(h.date)))].sort().reverse();
        let streak = 0;
        let checkDate = new Date();

        for (let i = 0; i < sortedDates.length; i++) {
            if (sortedDates[i] === Utils.formatDate(checkDate)) {
                streak++;
                checkDate = Utils.addDays(checkDate, -1);
            } else {
                break;
            }
        }

        return streak;
    },

    renderTodayReviews: function () {
        if (this.todayReviews.length === 0) {
            return '<p class="text-muted text-center">太棒了！今天没有需要复习的内容 🎉</p>';
        }

        return `
            <div class="grid grid-3 gap-2">
                ${this.todayReviews.map((item, index) => `
                    <div class="review-item card" data-index="${index}">
                        <div class="flex-between mb-1">
                            <span class="badge badge-primary">单词</span>
                        </div>
                        <h4 class="mb-1">${item.word}</h4>
                        <p class="text-muted text-sm">${item.meaning}</p>
                    </div>
                `).join('')}
            </div>
        `;
    },

    renderCalendar: function () {
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDay = firstDay.getDay();
        const daysInMonth = lastDay.getDate();

        const history = Storage.get(Storage.keys.REVIEW_HISTORY);
        const reviewDates = new Set(history.map(h => Utils.formatDate(h.date)));

        let calendarHtml = `
            <div class="calendar-header flex-between mb-3">
                <h4>${year}年${month + 1}月</h4>
            </div>
            <div class="calendar-week grid grid-7 text-center mb-2">
                <div class="text-muted">日</div>
                <div class="text-muted">一</div>
                <div class="text-muted">二</div>
                <div class="text-muted">三</div>
                <div class="text-muted">四</div>
                <div class="text-muted">五</div>
                <div class="text-muted">六</div>
            </div>
            <div class="calendar-days grid grid-7 gap-2">
        `;

        for (let i = 0; i < startDay; i++) {
            calendarHtml += '<div></div>';
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = Utils.formatDate(new Date(year, month, day));
            const isToday = dateStr === Utils.getTodayDate();
            const hasReview = reviewDates.has(dateStr);

            calendarHtml += `
                <div class="calendar-day ${isToday ? 'today' : ''} ${hasReview ? 'has-review' : ''}" style="padding: 0.5rem; text-align: center; border-radius: 4px; ${isToday ? 'background: var(--primary-color); color: white;' : hasReview ? 'background: rgba(126, 211, 33, 0.2);' : ''}">
                    ${day}
                </div>
            `;
        }

        calendarHtml += '</div>';
        return calendarHtml;
    },

    startReview: function () {
        if (this.todayReviews.length === 0) {
            Utils.showNotification('今天没有需要复习的内容！', 'success');
            return;
        }

        this.currentReviewIndex = 0;
        this.reviewItems = [...this.todayReviews];
        document.getElementById('reviewModal').style.display = 'flex';
        this.renderCurrentReview();
    },

    renderCurrentReview: function () {
        const item = this.reviewItems[this.currentReviewIndex];
        const total = this.reviewItems.length;

        document.getElementById('reviewProgress').textContent = `${this.currentReviewIndex + 1} / ${total}`;

        document.getElementById('reviewBody').innerHTML = `
            <div class="review-word">
                <h2 class="mb-2">${item.word}</h2>
                <p class="phonetic text-muted mb-4">${item.phonetic}</p>
                <button class="btn btn-secondary mb-4" id="showMeaningBtn">
                    👁️ 查看释义
                </button>
                <div id="meaningContainer" style="display: none;">
                    <p class="text-primary mb-2"><strong>${item.partOfSpeech} ${item.meaning}</strong></p>
                    <div class="examples mt-3">
                        ${item.examples.map(ex => `<p class="text-muted" style="padding: 0.5rem; background: #f8f9fa; border-radius: 4px;">${ex}</p>`).join('')}
                    </div>
                </div>
            </div>
        `;

        document.getElementById('showMeaningBtn').addEventListener('click', () => {
            document.getElementById('meaningContainer').style.display = 'block';
            document.getElementById('showMeaningBtn').style.display = 'none';
        });
    },

    markReviewComplete: function (remembered) {
        const item = this.reviewItems[this.currentReviewIndex];
        const status = Storage.getWordStatus(item.id);

        if (remembered) {
            Storage.setWordStatus(item.id, {
                status: 'mastered',
                reviewCount: (status.reviewCount || 0) + 1
            });
        } else {
            Storage.setWordStatus(item.id, {
                status: 'learning',
                reviewCount: Math.max(0, (status.reviewCount || 0) - 1)
            });
        }

        const history = Storage.get(Storage.keys.REVIEW_HISTORY);
        history.push({
            id: item.id,
            type: 'word',
            date: new Date().toISOString(),
            remembered: remembered
        });
        Storage.set(Storage.keys.REVIEW_HISTORY, history);

        this.currentReviewIndex++;
        if (this.currentReviewIndex < this.reviewItems.length) {
            this.renderCurrentReview();
        } else {
            document.getElementById('reviewModal').style.display = 'none';
            Utils.showNotification('恭喜完成今日复习！🎉', 'success');
            this.render();
        }
    },

    bindEvents: function () {
        document.getElementById('moduleContent').addEventListener('click', (e) => {
            if (e.target.id === 'startReviewBtn') {
                this.startReview();
            } else if (e.target.id === 'viewCalendarBtn') {
                const calendar = document.getElementById('reviewCalendar');
                calendar.style.display = calendar.style.display === 'none' ? 'block' : 'none';
            } else if (e.target.id === 'closeReview') {
                document.getElementById('reviewModal').style.display = 'none';
            } else if (e.target.id === 'reviewAgain') {
                this.markReviewComplete(false);
            } else if (e.target.id === 'reviewKnow') {
                this.markReviewComplete(true);
            }
        });
    },

    addReviewStyles: function () {
        const style = document.createElement('style');
        style.textContent = `
            .review-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                animation: fadeIn 0.3s ease;
            }
            
            .review-content {
                background: white;
                border-radius: 12px;
                max-width: 500px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
                animation: slideUp 0.3s ease;
            }
            
            .review-header {
                padding: 1.5rem;
                border-bottom: 1px solid #e0e0e0;
            }
            
            .review-body {
                padding: 2rem 1.5rem;
            }
            
            .review-footer {
                padding: 1.5rem;
                border-top: 1px solid #e0e0e0;
            }
            
            .review-word h2 {
                font-size: 3rem;
                color: var(--primary-color);
            }
            
            .calendar-day {
                min-height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .calendar-day.today {
                font-weight: bold;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes slideUp {
                from { transform: translateY(20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            
            @media (max-width: 767px) {
                .review-content {
                    width: 95%;
                }
            }
        `;
        document.head.appendChild(style);
    }
};
