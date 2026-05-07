const Storage = {
    PREFIX: 'english_learning_',

    keys: {
        WORD_STATUS: 'word_status',
        WORD_PROGRESS: 'word_progress',
        WORD_FAVORITES: 'word_favorites',
        MISTAKES: 'mistakes',
        REVIEW_SCHEDULE: 'review_schedule',
        REVIEW_HISTORY: 'review_history',
        LEARNING_PROGRESS: 'learning_progress',
        SETTINGS: 'settings',
        EXERCISE_HISTORY: 'exercise_history',
        GRAMMAR_STATUS: 'grammar_status',
        ACHIEVEMENTS: 'achievements',
        DAILY_CHALLENGES: 'daily_challenges',
        TOTAL_SCORE: 'total_score',
        STREAK_COUNT: 'streak_count',
        LAST_STUDY_DATE: 'last_study_date',
        FLASHCARD_SESSIONS: 'flashcard_sessions',
        CORRECT_STREAK: 'correct_streak'
    },

    init: function () {
        Object.keys(this.keys).forEach(key => {
            const storageKey = this.PREFIX + this.keys[key];
            if (!localStorage.getItem(storageKey)) {
                const initialValue = this.getInitialValue(key);
                localStorage.setItem(storageKey, JSON.stringify(initialValue));
            }
        });
    },

    getInitialValue: function (key) {
        switch (key) {
            case 'WORD_STATUS':
                return {};
            case 'WORD_PROGRESS':
                return { total: 0, mastered: 0, learning: 0, notStarted: 0 };
            case 'WORD_FAVORITES':
                return [];
            case 'MISTAKES':
                return [];
            case 'REVIEW_SCHEDULE':
                return [];
            case 'REVIEW_HISTORY':
                return [];
            case 'LEARNING_PROGRESS':
                return {
                    totalTime: 0,
                    dailyRecords: [],
                    weeklyReports: [],
                    monthlyReports: [],
                    goals: {}
                };
            case 'SETTINGS':
                return {
                    theme: 'light',
                    notifications: true,
                    autoSave: true,
                    reviewReminder: true,
                    soundEnabled: true,
                    backgroundMusicEnabled: true,
                    backgroundMusicVolume: 0.3
                };
            case 'EXERCISE_HISTORY':
                return [];
            case 'GRAMMAR_STATUS':
                return {};
            case 'ACHIEVEMENTS':
                return {};
            case 'DAILY_CHALLENGES':
                return { date: null, completed: [], progress: {} };
            case 'TOTAL_SCORE':
                return 0;
            case 'STREAK_COUNT':
                return 0;
            case 'LAST_STUDY_DATE':
                return null;
            case 'FLASHCARD_SESSIONS':
                return [];
            case 'CORRECT_STREAK':
                return 0;
            default:
                return null;
        }
    },

    get: function (key) {
        const storageKey = this.PREFIX + key;
        const data = localStorage.getItem(storageKey);
        return data ? JSON.parse(data) : this.getInitialValue(key);
    },

    set: function (key, value) {
        const storageKey = this.PREFIX + key;
        localStorage.setItem(storageKey, JSON.stringify(value));
    },

    update: function (key, updater) {
        const currentValue = this.get(key);
        const newValue = updater(currentValue);
        this.set(key, newValue);
        return newValue;
    },

    clear: function (key) {
        const storageKey = this.PREFIX + key;
        localStorage.removeItem(storageKey);
    },

    clearAll: function () {
        Object.keys(this.keys).forEach(key => {
            this.clear(key);
        });
        this.init();
    },

    backup: function () {
        const backup = {};
        Object.keys(this.keys).forEach(key => {
            backup[key] = this.get(key);
        });
        backup.timestamp = new Date().toISOString();
        return backup;
    },

    restore: function (backupData) {
        Object.keys(this.keys).forEach(key => {
            if (backupData[key] !== undefined) {
                this.set(key, backupData[key]);
            }
        });
        Utils.showNotification('数据恢复成功！', 'success');
    },

    getWordStatus: function (wordId) {
        const wordStatus = this.get(this.keys.WORD_STATUS);
        return wordStatus[wordId] || { status: 'not_started', mastery: 0, reviewCount: 0, lastReview: null };
    },

    setWordStatus: function (wordId, status) {
        this.update(this.keys.WORD_STATUS, (current) => ({
            ...current,
            [wordId]: {
                ...current[wordId],
                ...status,
                lastReview: new Date().toISOString()
            }
        }));
    },

    addMistake: function (exercise) {
        this.update(this.keys.MISTAKES, (current) => {
            const existing = current.find(m => m.id === exercise.id);
            if (existing) {
                existing.errorCount++;
                existing.lastError = new Date().toISOString();
                return current;
            } else {
                return [...current, {
                    ...exercise,
                    errorCount: 1,
                    firstError: new Date().toISOString(),
                    lastError: new Date().toISOString()
                }];
            }
        });
    },

    removeMistake: function (exerciseId) {
        this.update(this.keys.MISTAKES, (current) =>
            current.filter(m => m.id !== exerciseId)
        );
    },

    addReviewSchedule: function (item) {
        this.update(this.keys.REVIEW_SCHEDULE, (current) => {
            const existingIndex = current.findIndex(r => r.id === item.id && r.type === item.type);
            if (existingIndex >= 0) {
                current[existingIndex] = { ...current[existingIndex], ...item };
                return current;
            } else {
                return [...current, item];
            }
        });
    },

    addLearningRecord: function (module, timeSpent, correct = 0, total = 0) {
        const today = Utils.getTodayDate();
        this.update(this.keys.LEARNING_PROGRESS, (current) => {
            let dailyRecord = current.dailyRecords.find(r => r.date === today);
            if (!dailyRecord) {
                dailyRecord = { date: today, modules: {} };
                current.dailyRecords.push(dailyRecord);
            }
            if (!dailyRecord.modules[module]) {
                dailyRecord.modules[module] = { time: 0, correct: 0, total: 0 };
            }
            dailyRecord.modules[module].time += timeSpent;
            dailyRecord.modules[module].correct += correct;
            dailyRecord.modules[module].total += total;
            current.totalTime += timeSpent;
            return current;
        });
        this.updateStreak();
    },

    addScore: function (amount) {
        this.update(this.keys.TOTAL_SCORE, current => current + amount);
    },

    updateStreak: function () {
        const today = Utils.getTodayDate();
        const lastDate = this.get(this.keys.LAST_STUDY_DATE);

        if (lastDate) {
            const daysDiff = Utils.getDaysBetween(lastDate, today);
            if (daysDiff === 0) {
            } else if (daysDiff === 1) {
                this.update(this.keys.STREAK_COUNT, current => current + 1);
            } else {
                this.set(this.keys.STREAK_COUNT, 1);
            }
        } else {
            this.set(this.keys.STREAK_COUNT, 1);
        }
        this.set(this.keys.LAST_STUDY_DATE, today);
    },

    getStreak: function () {
        return this.get(this.keys.STREAK_COUNT);
    },

    getScore: function () {
        return this.get(this.keys.TOTAL_SCORE);
    },

    unlockAchievement: function (achievementId) {
        const achievements = this.get(this.keys.ACHIEVEMENTS);
        if (!achievements[achievementId]) {
            achievements[achievementId] = { unlocked: true, date: new Date().toISOString() };
            this.set(this.keys.ACHIEVEMENTS, achievements);
            return true;
        }
        return false;
    },

    isAchievementUnlocked: function (achievementId) {
        const achievements = this.get(this.keys.ACHIEVEMENTS);
        return achievements[achievementId]?.unlocked || false;
    },

    getDailyChallenges: function () {
        const today = Utils.getTodayDate();
        let challenges = this.get(this.keys.DAILY_CHALLENGES);

        if (challenges.date !== today) {
            challenges = { date: today, completed: [], progress: {} };
            this.set(this.keys.DAILY_CHALLENGES, challenges);
        }
        return challenges;
    },

    updateDailyChallengeProgress: function (challengeId, progress) {
        this.update(this.keys.DAILY_CHALLENGES, current => {
            if (!current.progress) current.progress = {};
            current.progress[challengeId] = (current.progress[challengeId] || 0) + progress;
            return current;
        });
    },

    completeDailyChallenge: function (challengeId) {
        this.update(this.keys.DAILY_CHALLENGES, current => {
            if (!current.completed.includes(challengeId)) {
                current.completed.push(challengeId);
            }
            return current;
        });
    },

    setCorrectStreak: function (count) {
        this.set(this.keys.CORRECT_STREAK, count);
    },

    getCorrectStreak: function () {
        return this.get(this.keys.CORRECT_STREAK);
    },

    addFlashcardSession: function (session) {
        this.update(this.keys.FLASHCARD_SESSIONS, current => [...current, session]);
    },

    checkAchievements: function () {
        const achievements = [];
        const wordStatus = this.get(this.keys.WORD_STATUS);
        const masteredCount = Object.values(wordStatus).filter(s => s.status === 'mastered').length;
        const totalExercises = this.get(this.keys.EXERCISE_HISTORY).length;
        const streak = this.getStreak();
        const reviewCount = this.get(this.keys.REVIEW_HISTORY).length;

        if (masteredCount >= 1 && !this.isAchievementUnlocked('first_word')) {
            if (this.unlockAchievement('first_word')) achievements.push('first_word');
        }
        if (masteredCount >= 10 && !this.isAchievementUnlocked('words_10')) {
            if (this.unlockAchievement('words_10')) achievements.push('words_10');
        }
        if (masteredCount >= 30 && !this.isAchievementUnlocked('words_30')) {
            if (this.unlockAchievement('words_30')) achievements.push('words_30');
        }
        if (masteredCount >= 50 && !this.isAchievementUnlocked('words_50')) {
            if (this.unlockAchievement('words_50')) achievements.push('words_50');
        }
        if (totalExercises >= 1 && !this.isAchievementUnlocked('first_exercise')) {
            if (this.unlockAchievement('first_exercise')) achievements.push('first_exercise');
        }
        if (totalExercises >= 10 && !this.isAchievementUnlocked('exercises_10')) {
            if (this.unlockAchievement('exercises_10')) achievements.push('exercises_10');
        }
        if (streak >= 3 && !this.isAchievementUnlocked('streak_3')) {
            if (this.unlockAchievement('streak_3')) achievements.push('streak_3');
        }
        if (streak >= 7 && !this.isAchievementUnlocked('streak_7')) {
            if (this.unlockAchievement('streak_7')) achievements.push('streak_7');
        }
        if (reviewCount >= 20 && !this.isAchievementUnlocked('review_master')) {
            if (this.unlockAchievement('review_master')) achievements.push('review_master');
        }

        return achievements;
    }
};
