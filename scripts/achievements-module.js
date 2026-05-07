const AchievementsModule = {
    init: function () {
        this.render();
        this.bindEvents();
        this.checkAllAchievements();
    },

    checkAllAchievements: function () {
        const newUnlocked = [];
        const calendarData = DailyCalendar && DailyCalendar.data ? DailyCalendar.data : null;

        // Continuous login achievements (7/30/100 days)
        if (calendarData) {
            const streak = calendarData.longestStreak || 0;
            const loginAchievements = [
                { id: 'login_7', req: 7 },
                { id: 'login_30', req: 30 },
                { id: 'login_100', req: 100 }
            ];
            loginAchievements.forEach(function (ach) {
                if (!Storage.isAchievementUnlocked(ach.id) && streak >= ach.req) {
                    Storage.unlockAchievement(ach.id);
                    newUnlocked.push(ach.id);
                }
            });

            // Study time achievements (10/50/100 hours)
            var totalMinutes = 0;
            var days = calendarData.days || {};
            for (var dateKey in days) {
                if (days[dateKey] && days[dateKey].minutes) {
                    totalMinutes += days[dateKey].minutes;
                }
            }
            var totalHours = Math.floor(totalMinutes / 60);
            var timeAchievements = [
                { id: 'time_10', req: 10 },
                { id: 'time_50', req: 50 },
                { id: 'time_100', req: 100 }
            ];
            timeAchievements.forEach(function (ach) {
                if (!Storage.isAchievementUnlocked(ach.id) && totalHours >= ach.req) {
                    Storage.unlockAchievement(ach.id);
                    newUnlocked.push(ach.id);
                }
            });

            // Early bird (studied before 7am)
            if (!Storage.isAchievementUnlocked('early_bird')) {
                var hasEarly = false;
                for (var dk in days) {
                    if (days[dk] && days[dk].hours) {
                        for (var h = 0; h < days[dk].hours.length; h++) {
                            if (days[dk].hours[h] < 7) {
                                hasEarly = true;
                                break;
                            }
                        }
                    }
                    if (hasEarly) break;
                }
                if (hasEarly) {
                    Storage.unlockAchievement('early_bird');
                    newUnlocked.push('early_bird');
                }
            }

            // Night owl (studied after 10pm)
            if (!Storage.isAchievementUnlocked('night_owl')) {
                var hasLate = false;
                for (var dk2 in days) {
                    if (days[dk2] && days[dk2].hours) {
                        for (var h2 = 0; h2 < days[dk2].hours.length; h2++) {
                            if (days[dk2].hours[h2] >= 22) {
                                hasLate = true;
                                break;
                            }
                        }
                    }
                    if (hasLate) break;
                }
                if (hasLate) {
                    Storage.unlockAchievement('night_owl');
                    newUnlocked.push('night_owl');
                }
            }
        }

        // Quick challenge master (bestCorrect >= 15)
        if (typeof QuickChallenge !== 'undefined' && QuickChallenge.data) {
            if (!Storage.isAchievementUnlocked('challenge_master') && QuickChallenge.data.bestCorrect >= 15) {
                Storage.unlockAchievement('challenge_master');
                newUnlocked.push('challenge_master');
            }
        }

        // All units mastered (6 units complete with >= 70% mastery)
        if (typeof SmartWordsModule !== 'undefined') {
            if (!Storage.isAchievementUnlocked('all_units_mastered')) {
                var masteredUnits = 0;
                for (var u = 1; u <= 6; u++) {
                    var mastery = SmartWordsModule.getUnitMastery(u);
                    if (mastery.percent >= 70) masteredUnits++;
                }
                if (masteredUnits >= 6) {
                    Storage.unlockAchievement('all_units_mastered');
                    newUnlocked.push('all_units_mastered');
                }
            }
        }

        // Notify and re-render for new unlocks
        if (newUnlocked.length > 0) {
            var self = this;
            newUnlocked.forEach(function (achId) {
                var achievement = Grade7Data.achievements.find(function (a) { return a.id === achId; });
                if (achievement) {
                    setTimeout(function () {
                        Utils.showNotification('🏆 解锁成就: ' + achievement.icon + ' ' + achievement.name, 'success');
                    }, 500);
                }
            });
            // Re-render to show updated status
            setTimeout(function () { self.render(); }, 300);
        }
    },

    render: function () {
        const moduleContent = document.getElementById('moduleContent');
        const unlockedCount = this.getUnlockedCount();
        const totalCount = Grade7Data.achievements.length;
        const score = Storage.getScore();
        const streak = Storage.getStreak();
        const dailyChallenges = Storage.getDailyChallenges();

        moduleContent.innerHTML = `
            <div class="achievements-module">
                <div class="page-header mb-4">
                    <h2>🏆 成就系统</h2>
                    <p class="text-muted">完成挑战，解锁成就，见证成长</p>
                </div>
                
                <div class="stats-summary grid grid-4 gap-3 mb-4">
                    <div class="card text-center">
                        <div class="stat-number text-primary">${score}</div>
                        <div class="stat-label text-muted">总积分</div>
                    </div>
                    <div class="card text-center">
                        <div class="stat-number text-success">${unlockedCount} / ${totalCount}</div>
                        <div class="stat-label text-muted">已解锁成就</div>
                    </div>
                    <div class="card text-center">
                        <div class="stat-number text-warning">${streak}</div>
                        <div class="stat-label text-muted">连续学习天数</div>
                    </div>
                    <div class="card text-center">
                        <div class="stat-number text-danger">${dailyChallenges.completed.length}</div>
                        <div class="stat-label text-muted">今日完成任务</div>
                    </div>
                </div>
                
                <div class="daily-challenges-section card mb-4">
                    <h3 class="card-title mb-3">📋 每日挑战</h3>
                    <div class="challenges-grid grid grid-2 gap-3">
                        ${this.renderDailyChallenges(dailyChallenges)}
                    </div>
                </div>
                
                <div class="achievements-section card">
                    <h3 class="card-title mb-3">🏅 成就徽章</h3>
                    <div class="achievements-grid grid grid-3 gap-3">
                        ${this.renderAchievements()}
                    </div>
                </div>
            </div>
        `;
        this.addAchievementsStyles();
    },

    getUnlockedCount: function () {
        return Grade7Data.achievements.filter(a => Storage.isAchievementUnlocked(a.id)).length;
    },

    renderDailyChallenges: function (dailyChallenges) {
        return Grade7Data.dailyChallenges.map(challenge => {
            const isCompleted = dailyChallenges.completed.includes(challenge.id);
            const progress = dailyChallenges.progress[challenge.id] || 0;
            const progressPercent = Math.min(100, (progress / challenge.target) * 100);

            return `
                <div class="challenge-card ${isCompleted ? 'completed' : ''}" data-challenge-id="${challenge.id}">
                    <div class="flex-between mb-2">
                        <h4 class="mb-0">${challenge.name}</h4>
                        <span class="badge ${isCompleted ? 'badge-success' : 'badge-warning'}">
                            ${isCompleted ? '✅ 已完成' : `⭐ +${challenge.reward}`}
                        </span>
                    </div>
                    <p class="text-muted mb-2">${challenge.description}</p>
                    <div class="challenge-progress">
                        <div class="flex-between mb-1">
                            <span class="text-sm">进度</span>
                            <span class="text-sm">${Math.min(progress, challenge.target)} / ${challenge.target}</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progressPercent}%;"></div>
                        </div>
                    </div>
                    ${!isCompleted && progress >= challenge.target ? `
                        <button class="btn btn-success btn-sm mt-2 w-100" data-action="claim-reward">
                            🎁 领取奖励
                        </button>
                    ` : ''}
                </div>
            `;
        }).join('');
    },

    renderAchievements: function () {
        return Grade7Data.achievements.map(achievement => {
            const isUnlocked = Storage.isAchievementUnlocked(achievement.id);
            const achievementData = isUnlocked ? Storage.get(Storage.keys.ACHIEVEMENTS)[achievement.id] : null;

            return `
                <div class="achievement-card ${isUnlocked ? 'unlocked' : 'locked'}" data-achievement-id="${achievement.id}">
                    <div class="achievement-icon text-center mb-2">
                        <span style="font-size: 3rem; opacity: ${isUnlocked ? 1 : 0.3};">${achievement.icon}</span>
                    </div>
                    <h4 class="text-center mb-1">${achievement.name}</h4>
                    <p class="text-muted text-center text-sm mb-2">${achievement.description}</p>
                    ${isUnlocked && achievementData ? `
                        <p class="text-success text-center text-sm">
                            🎉 解锁于 ${Utils.formatDate(achievementData.date)}
                        </p>
                    ` : `
                        <p class="text-warning text-center text-sm">
                            🔒 继续努力解锁
                        </p>
                    `}
                </div>
            `;
        }).join('');
    },

    claimReward: function (challengeId) {
        const challenge = Grade7Data.dailyChallenges.find(c => c.id === challengeId);
        if (!challenge) return;

        Storage.completeDailyChallenge(challengeId);
        Storage.addScore(challenge.reward);
        Utils.showNotification(`🎉 获得 ${challenge.reward} 积分！`, 'success');

        const newAchievements = Storage.checkAchievements();
        if (newAchievements.length > 0) {
            newAchievements.forEach(achId => {
                const achievement = Grade7Data.achievements.find(a => a.id === achId);
                if (achievement) {
                    setTimeout(() => {
                        Utils.showNotification(`🏆 解锁成就: ${achievement.icon} ${achievement.name}`, 'success');
                    }, 500);
                }
            });
        }

        this.render();
    },

    bindEvents: function () {
        document.getElementById('moduleContent').addEventListener('click', (e) => {
            if (e.target.dataset.action === 'claim-reward') {
                const card = e.target.closest('.challenge-card');
                const challengeId = card.dataset.challengeId;
                this.claimReward(challengeId);
            }
        });
    },

    addAchievementsStyles: function () {
        const style = document.createElement('style');
        style.textContent = `
            .achievement-card,
            .challenge-card {
                background: white;
                border-radius: 12px;
                padding: 1.5rem;
                border: 2px solid transparent;
                transition: all 0.3s ease;
            }
            
            .achievement-card:hover,
            .challenge-card:hover {
                transform: translateY(-4px);
                box-shadow: 0 8px 24px rgba(0,0,0,0.15);
            }
            
            .achievement-card.unlocked {
                border-color: var(--secondary-color);
                background: linear-gradient(135deg, rgba(126, 211, 33, 0.1), white);
            }
            
            .achievement-card.locked {
                opacity: 0.7;
                filter: grayscale(0.3);
            }
            
            .challenge-card.completed {
                border-color: var(--secondary-color);
                background: linear-gradient(135deg, rgba(126, 211, 33, 0.05), white);
            }
            
            .challenge-progress {
                margin-top: 1rem;
            }
            
            @keyframes unlockAnimation {
                0% { transform: scale(1); }
                50% { transform: scale(1.2); }
                100% { transform: scale(1); }
            }
            
            .achievement-card.unlocked .achievement-icon {
                animation: unlockAnimation 0.5s ease;
            }
            
            @media (max-width: 767px) {
                .achievements-grid,
                .challenges-grid {
                    grid-template-columns: 1fr;
                }
            }
        `;
        document.head.appendChild(style);
    }
};
