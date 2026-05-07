/**
 * @file 数据存储模块 - 增强版
 * @description 本地存储管理，支持类型检查、默认值、数据版本管理
 * @version 3.0.0
 * @date 2026-05-03
 */

/**
 * 数据版本管理
 * 每次数据结构变更时递增版本号，用于数据迁移
 */
const DATA_VERSION = '4.0.0';

const Storage = {
    PREFIX: 'english_learning_',
    VERSION_KEY: 'app_data_version',

    /**
     * 类型定义 - 用于数据验证
     */
    typeValidators: {
        'object': function (v) { return typeof v === 'object' && v !== null && !Array.isArray(v); },
        'array': function (v) { return Array.isArray(v); },
        'number': function (v) { return typeof v === 'number'; },
        'string': function (v) { return typeof v === 'string'; },
        'boolean': function (v) { return typeof v === 'boolean'; },
        'null': function (v) { return v === null; }
    },

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
        CORRECT_STREAK: 'correct_streak',
        KNOWLEDGE_STATE: 'knowledge_state',
        DIAGNOSTIC_HISTORY: 'diagnostic_history',
        EXAM_RECORDS: 'exam_records',
        WEAKNESS_MAP: 'weakness_map'
    },

    /**
     * 类型定义 - 用于数据验证
     */
    typeSchema: {
        WORD_STATUS: { type: 'object', default: {} },
        WORD_PROGRESS: { type: 'object', default: { total: 0, mastered: 0, learning: 0, notStarted: 0 } },
        WORD_FAVORITES: { type: 'array', default: [] },
        MISTAKES: { type: 'array', default: [] },
        REVIEW_SCHEDULE: { type: 'array', default: [] },
        REVIEW_HISTORY: { type: 'array', default: [] },
        LEARNING_PROGRESS: {
            type: 'object',
            default: {
                totalTime: 0,
                dailyRecords: [],
                weeklyReports: [],
                monthlyReports: [],
                goals: {}
            }
        },
        SETTINGS: {
            type: 'object',
            default: {
                theme: 'light',
                notifications: true,
                autoSave: true,
                reviewReminder: true,
                soundEnabled: true,
                backgroundMusicEnabled: true,
                backgroundMusicVolume: 0.3
            }
        },
        EXERCISE_HISTORY: { type: 'array', default: [] },
        GRAMMAR_STATUS: { type: 'object', default: {} },
        ACHIEVEMENTS: { type: 'object', default: {} },
        DAILY_CHALLENGES: { type: 'object', default: { date: null, completed: [], progress: {} } },
        TOTAL_SCORE: { type: 'number', default: 0 },
        STREAK_COUNT: { type: 'number', default: 0 },
        LAST_STUDY_DATE: { type: 'null', default: null },
        FLASHCARD_SESSIONS: { type: 'array', default: [] },
        CORRECT_STREAK: { type: 'number', default: 0 },
        KNOWLEDGE_STATE: { type: 'object', default: {} },
        DIAGNOSTIC_HISTORY: { type: 'array', default: [] },
        EXAM_RECORDS: { type: 'array', default: [] },
        WEAKNESS_MAP: { type: 'object', default: {} }
    },

    init: function () {
        // 检查数据版本，执行迁移
        this.checkVersionMigration();

        // 初始化所有存储键
        Object.keys(this.keys).forEach(key => {
            const storageKey = this.PREFIX + this.keys[key];
            if (!localStorage.getItem(storageKey)) {
                const initialValue = this.getInitialValue(key);
                localStorage.setItem(storageKey, JSON.stringify(initialValue));
            } else {
                // 验证并修复数据类型
                this.validateAndFix(key);
            }
        });
    },

    /**
     * 数据版本检查和迁移
     */
    checkVersionMigration: function () {
        const currentVersion = localStorage.getItem(this.PREFIX + this.VERSION_KEY);
        if (!currentVersion) {
            // 首次使用，记录当前版本
            localStorage.setItem(this.PREFIX + this.VERSION_KEY, DATA_VERSION);
        } else if (currentVersion !== DATA_VERSION) {
            console.log('[Storage] 数据版本升级:', currentVersion, '→', DATA_VERSION);
            this.migrateData(currentVersion, DATA_VERSION);
            localStorage.setItem(this.PREFIX + this.VERSION_KEY, DATA_VERSION);
        }
    },

    /**
     * 数据迁移
     * @param {string} fromVersion - 源版本
     * @param {string} toVersion - 目标版本
     */
    migrateData: function (fromVersion, toVersion) {
        if (fromVersion === '1.1.0' && toVersion === '2.1.0') {
            if (!this.get(this.keys.KNOWLEDGE_STATE) || Object.keys(this.get(this.keys.KNOWLEDGE_STATE)).length === 0) {
                this.set(this.keys.KNOWLEDGE_STATE, {});
            }
            if (!this.get(this.keys.DIAGNOSTIC_HISTORY)) {
                this.set(this.keys.DIAGNOSTIC_HISTORY, []);
            }
            if (!this.get(this.keys.EXAM_RECORDS)) {
                this.set(this.keys.EXAM_RECORDS, []);
            }
            if (!this.get(this.keys.WEAKNESS_MAP)) {
                this.set(this.keys.WEAKNESS_MAP, {});
            }
        }
        console.log('[Storage] 数据迁移完成:', fromVersion, '→', toVersion);
    },

    /**
     * 验证并修复数据类型
     * @param {string} key - 存储键名
     */
    validateAndFix: function (key) {
        try {
            const schema = this.typeSchema[key];
            if (!schema) return;

            const data = this.get(key);
            const validator = this.typeValidators[schema.type];

            if (validator && !validator(data)) {
                console.warn('[Storage] 数据类型不匹配:', key, '期望:', schema.type, '实际:', typeof data);
                this.set(key, schema.default);
            }
        } catch (e) {
            console.warn('[Storage] 数据验证失败:', key, e);
            this.set(key, this.typeSchema[key].default);
        }
    },

    getInitialValue: function (key) {
        const schema = this.typeSchema[key];
        return schema ? schema.default : null;
    },

    get: function (key) {
        const storageKey = this.PREFIX + key;
        try {
            const data = localStorage.getItem(storageKey);
            return data ? JSON.parse(data) : this.getInitialValue(key);
        } catch (e) {
            console.warn('[Storage] 读取失败:', key, e);
            return this.getInitialValue(key);
        }
    },

    set: function (key, value) {
        const storageKey = this.PREFIX + key;
        try {
            localStorage.setItem(storageKey, JSON.stringify(value));
        } catch (e) {
            console.warn('[Storage] 写入失败:', key, e);
            if (Utils && typeof Utils.showNotification === 'function') {
                Utils.showNotification('存储空间不足，请清理数据', 'error');
            }
        }
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

    /**
     * 备份所有数据
     * @returns {Object} 备份数据
     */
    backup: function () {
        const backup = {};
        Object.keys(this.keys).forEach(key => {
            backup[key] = this.get(key);
        });
        backup.timestamp = new Date().toISOString();
        backup.version = DATA_VERSION;
        return backup;
    },

    /**
     * 恢复数据
     * @param {Object} backupData - 备份数据
     */
    restore: function (backupData) {
        // 检查备份版本
        if (backupData.version && backupData.version !== DATA_VERSION) {
            console.warn('[Storage] 备份版本不匹配:', backupData.version, '→', DATA_VERSION);
            // 尝试迁移
            this.migrateData(backupData.version, DATA_VERSION);
        }

        Object.keys(this.keys).forEach(key => {
            if (backupData[key] !== undefined) {
                this.set(key, backupData[key]);
            }
        });
        if (Utils && typeof Utils.showNotification === 'function') {
            Utils.showNotification('数据恢复成功！', 'success');
        }
    },

    /**
     * 导出数据为 JSON 文件
     * @param {string} [filename] - 文件名（默认自动生成）
     */
    exportData: function (filename) {
        const backup = this.backup();
        const jsonString = JSON.stringify(backup, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const defaultName = filename || 'english-learning-backup-' + Utils.getTodayDate() + '.json';
        a.href = url;
        a.download = defaultName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        if (Utils && typeof Utils.showNotification === 'function') {
            Utils.showNotification('数据导出成功！', 'success');
        }
    },

    /**
     * 从 JSON 文件导入数据
     * @param {File} file - 上传的文件
     * @returns {Promise}
     */
    importData: function (file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (!data.timestamp) {
                        reject(new Error('无效的备份文件格式'));
                        return;
                    }
                    this.restore(data);
                    resolve(data);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    },

    /**
     * 获取单词状态
     * @param {number|string} wordId - 单词ID
     * @returns {Object} 单词状态
     */
    getWordStatus: function (wordId) {
        const wordStatus = this.get(this.keys.WORD_STATUS);
        return wordStatus[wordId] || { status: 'not_started', mastery: 0, reviewCount: 0, lastReview: null };
    },

    /**
     * 设置单词状态
     * @param {number|string} wordId - 单词ID
     * @param {Object} status - 状态对象
     */
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

    /**
     * 添加错题
     * @param {Object} exercise - 错题信息
     */
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

    /**
     * 移除错题
     * @param {number|string} exerciseId - 题目ID
     */
    removeMistake: function (exerciseId) {
        this.update(this.keys.MISTAKES, (current) =>
            current.filter(m => m.id !== exerciseId)
        );
    },

    /**
     * 添加复习计划
     * @param {Object} item - 复习项
     */
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

    /**
     * 添加学习记录
     * @param {string} module - 模块名称
     * @param {number} timeSpent - 学习时间（秒）
     * @param {number} correct - 正确数
     * @param {number} total - 总数
     */
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

    /**
     * 增加积分
     * @param {number} amount - 积分数量
     */
    addScore: function (amount) {
        this.update(this.keys.TOTAL_SCORE, current => current + amount);
    },

    updateStreak: function () {
        const today = Utils.getTodayDate();
        const lastDate = this.get(this.keys.LAST_STUDY_DATE);

        if (lastDate) {
            const daysDiff = Utils.getDaysBetween(lastDate, today);
            if (daysDiff === 0) {
                // 今天已记录
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

    /**
     * 解锁成就
     * @param {string} achievementId - 成就ID
     * @returns {boolean} 是否新解锁
     */
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

    /**
     * 检查成就解锁条件
     * @returns {Array} 新解锁的成就ID列表
     */
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
    },

    /**
     * 获取考点标签的掌握概率
     * @param {string} key - 考点标签（如 "n_food"）
     * @returns {number} 掌握概率（0-1）
     */
    getKnowledgeState: function (key) {
        const state = this.get(this.keys.KNOWLEDGE_STATE);
        return state[key] !== undefined ? state[key] : 0.5;
    },

    /**
     * 设置/更新考点标签的掌握概率
     * @param {string} key - 考点标签
     * @param {number} probability - 掌握概率（0-1）
     */
    setKnowledgeState: function (key, probability) {
        this.update(this.keys.KNOWLEDGE_STATE, function (current) {
            return { ...current, [key]: Math.max(0, Math.min(1, probability)) };
        });
    },

    /**
     * 获取完整知识状态对象
     * @returns {Object} 所有考点标签的掌握概率映射
     */
    getAllKnowledgeStates: function () {
        return this.get(this.keys.KNOWLEDGE_STATE);
    },

    /**
     * 重置所有知识状态
     */
    resetKnowledgeState: function () {
        this.set(this.keys.KNOWLEDGE_STATE, {});
    },

    /**
     * 添加诊断记录
     * @param {Object} record - {date, scores: {vocab, grammar, reading, listening}, theta, totalScore}
     */
    addDiagnosticRecord: function (record) {
        this.update(this.keys.DIAGNOSTIC_HISTORY, function (current) {
            return [...current, { ...record, date: record.date || new Date().toISOString() }];
        });
    },

    /**
     * 获取诊断历史数组
     * @returns {Array} 诊断记录数组
     */
    getDiagnosticHistory: function () {
        return this.get(this.keys.DIAGNOSTIC_HISTORY);
    },

    /**
     * 获取最近一次诊断记录
     * @returns {Object|null} 最近诊断记录
     */
    getLatestDiagnostic: function () {
        const history = this.get(this.keys.DIAGNOSTIC_HISTORY);
        return history.length > 0 ? history[history.length - 1] : null;
    },

    /**
     * 添加模考记录
     * @param {Object} record - {date, score, totalQuestions, correctCount, abilityRange, weaknessModules}
     */
    addExamRecord: function (record) {
        this.update(this.keys.EXAM_RECORDS, function (current) {
            return [...current, { ...record, date: record.date || new Date().toISOString() }];
        });
    },

    /**
     * 获取模考记录数组
     * @returns {Array} 模考记录数组
     */
    getExamRecords: function () {
        return this.get(this.keys.EXAM_RECORDS);
    },

    /**
     * 获取薄弱点映射
     * @returns {Object} {kgPoint: failCount}
     */
    getWeaknessMap: function () {
        return this.get(this.keys.WEAKNESS_MAP);
    },

    /**
     * 增加某考点的薄弱计数
     * @param {string} kgPoint - 考点标签
     */
    addWeaknessPoint: function (kgPoint) {
        this.update(this.keys.WEAKNESS_MAP, function (current) {
            return { ...current, [kgPoint]: (current[kgPoint] || 0) + 1 };
        });
    },

    /**
     * 移除已攻克的薄弱点
     * @param {string} kgPoint - 考点标签
     */
    removeWeaknessPoint: function (kgPoint) {
        this.update(this.keys.WEAKNESS_MAP, function (current) {
            var updated = {};
            Object.keys(current).forEach(function (k) {
                if (k !== kgPoint) {
                    updated[k] = current[k];
                }
            });
            return updated;
        });
    },

    /**
     * 获取前N个最薄弱考点
     * @param {number} limit - 返回数量
     * @returns {Array} [{kgPoint, failCount}] 按failCount降序排列
     */
    getTopWeaknesses: function (limit) {
        var map = this.get(this.keys.WEAKNESS_MAP);
        var entries = Object.keys(map).map(function (k) {
            return { kgPoint: k, failCount: map[k] };
        });
        entries.sort(function (a, b) { return b.failCount - a.failCount; });
        return entries.slice(0, limit || 5);
    },

    /**
     * 生成本周学习报告
     * @returns {Object} 周报对象
     */
    generateWeeklyReport: function () {
        var now = new Date();
        var dayOfWeek = now.getDay();
        var mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        var monday = new Date(now);
        monday.setDate(now.getDate() + mondayOffset);
        monday.setHours(0, 0, 0, 0);
        var sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);

        var weekStart = monday.toISOString().split('T')[0];
        var weekEnd = sunday.toISOString().split('T')[0];

        var progress = this.get(this.keys.LEARNING_PROGRESS);
        var dailyRecords = progress.dailyRecords || [];

        var weekRecords = dailyRecords.filter(function (r) {
            return r.date >= weekStart && r.date <= weekEnd;
        });

        var wordsLearned = 0;
        var totalCorrect = 0;
        var totalAttempts = 0;
        var totalTime = 0;

        weekRecords.forEach(function (r) {
            Object.keys(r.modules || {}).forEach(function (mod) {
                var m = r.modules[mod];
                totalTime += m.time || 0;
                totalCorrect += m.correct || 0;
                totalAttempts += m.total || 0;
            });
        });

        var wordStatus = this.get(this.keys.WORD_STATUS);
        Object.keys(wordStatus).forEach(function (id) {
            var s = wordStatus[id];
            if (s.lastReview && s.lastReview >= monday.toISOString() && s.lastReview <= sunday.toISOString()) {
                wordsLearned++;
            }
        });

        var accuracy = totalAttempts > 0 ? totalCorrect / totalAttempts : 0;

        var weaknessMap = this.get(this.keys.WEAKNESS_MAP);
        var weaknessKeys = Object.keys(weaknessMap);
        var weaknessChanges = {
            new: [],
            removed: []
        };

        weaknessKeys.forEach(function (k) {
            if (weaknessMap[k] >= 3) {
                weaknessChanges.new.push(k);
            }
        });

        var suggestion = '';
        if (accuracy < 0.6) {
            suggestion = '本周正确率偏低，建议多复习错题本中的内容';
        } else if (accuracy >= 0.6 && accuracy < 0.8) {
            suggestion = '正确率良好，可以适当增加词汇学习量';
        } else if (accuracy >= 0.8 && wordsLearned > 0) {
            suggestion = '表现优秀！建议挑战模考来巩固所学知识';
        } else if (wordsLearned === 0) {
            suggestion = '本周尚未开始学习，快来开始新一周的学习吧！';
        } else {
            suggestion = '保持当前学习节奏，继续加油！';
        }

        if (weaknessKeys.length > 0) {
            suggestion += '薄弱考点：' + weaknessKeys.slice(0, 3).join('、') + '，建议针对性练习。';
        }

        return {
            weekStart: weekStart,
            weekEnd: weekEnd,
            wordsLearned: wordsLearned,
            accuracy: Math.round(accuracy * 100) / 100,
            totalTime: totalTime,
            weaknessChanges: weaknessChanges,
            suggestion: suggestion,
            generatedAt: now.toISOString()
        };
    }
};
