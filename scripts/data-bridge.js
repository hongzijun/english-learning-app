/**
 * @file Data Bridge - 统一数据访问层
 * @description 提供5层架构：查询层/状态层/事件层/统计层/注册层
 * @version 1.0.0
 * @date 2026-05-03
 *
 * 依赖: Grade7Data (data/grade7-data.js), Storage (scripts/storage-enhanced.js)
 * 使用: DataBridge.query('words', { unitId: 1 })
 */

var DataBridge = {

    // ===================================================================
    // LAYER 1: QUERY LAYER - 数据查询层
    // 统一从 Grade7Data 获取原始数据，支持过滤
    // ===================================================================

    query: function(type, filters) {
        filters = filters || {};

        // 查询单词列表，可按 unitId 过滤
        if (type === 'words') {
            var allWords = Grade7Data.getAllWords();
            if (filters.unitId) {
                var filtered = [];
                for (var i = 0; i < allWords.length; i++) {
                    if (allWords[i].unitId === filters.unitId) {
                        filtered.push(allWords[i]);
                    }
                }
                return filtered;
            }
            return allWords;
        }

        // 查询单个单词，按 id 获取
        if (type === 'word') {
            var allWords2 = Grade7Data.getAllWords();
            for (var i = 0; i < allWords2.length; i++) {
                if (allWords2[i].id === filters.id) {
                    return allWords2[i];
                }
            }
            return null;
        }

        // 查询语法点列表，可按 unitId 过滤
        if (type === 'grammar') {
            var allGrammar = Grade7Data.getAllGrammar();
            if (filters.unitId) {
                var filteredGrammar = [];
                for (var i = 0; i < allGrammar.length; i++) {
                    if (allGrammar[i].unitId === filters.unitId) {
                        filteredGrammar.push(allGrammar[i]);
                    }
                }
                return filteredGrammar;
            }
            return allGrammar;
        }

        // 查询练习题列表，可按 unitId 和 type 过滤
        if (type === 'exercises') {
            var allExercises = Grade7Data.getAllExercises();
            var filteredExercises = allExercises;

            if (filters.unitId) {
                var filtered = [];
                for (var i = 0; i < allExercises.length; i++) {
                    if (allExercises[i].unitId === filters.unitId) {
                        filtered.push(allExercises[i]);
                    }
                }
                filteredExercises = filtered;
            }

            if (filters.type) {
                var filteredByType = [];
                for (var i = 0; i < filteredExercises.length; i++) {
                    if (filteredExercises[i].type === filters.type) {
                        filteredByType.push(filteredExercises[i]);
                    }
                }
                return filteredByType;
            }

            return filteredExercises;
        }

        // 查询单个单元信息
        if (type === 'unit') {
            return Grade7Data.getUnitById(filters.id);
        }

        // 查询所有单元列表
        if (type === 'allUnits') {
            return Grade7Data.units;
        }

        // 未知类型返回空数组
        return [];
    },


    // ===================================================================
    // LAYER 2: STATE LAYER - 状态管理层
    // 读写学习状态，与 Storage 交互，触发事件通知
    // ===================================================================

    state: {

        // 获取单词学习状态
        getWordStatus: function(wordId) {
            var wordStatus = Storage.get(Storage.keys.WORD_STATUS);
            if (wordId) {
                return wordStatus[wordId] || {
                    status: 'not_started',
                    mastery: 0,
                    reviewCount: 0,
                    lastReview: null
                };
            }
            return wordStatus;
        },

        // 设置单词学习状态，触发状态变更事件
        setWordStatus: function(wordId, statusObj) {
            var currentStatus = Storage.get(Storage.keys.WORD_STATUS);
            currentStatus[wordId] = statusObj;
            Storage.set(Storage.keys.WORD_STATUS, currentStatus);

            // 触发通用状态变更事件
            DataBridge.emit('word:status-changed', { wordId: wordId, status: statusObj });

            // 如果单词已掌握，触发掌握事件
            if (statusObj.status === 'mastered') {
                DataBridge.emit('word:mastered', { wordId: wordId });
            }
        },

        // 获取错题列表
        getMistakes: function() {
            return Storage.get(Storage.keys.MISTAKES);
        },

        // 添加错题记录，触发新增事件
        addMistake: function(mistakeObj) {
            mistakeObj.timestamp = mistakeObj.timestamp || new Date().toISOString();
            var currentMistakes = Storage.get(Storage.keys.MISTAKES);
            currentMistakes.push(mistakeObj);
            Storage.set(Storage.keys.MISTAKES, currentMistakes);
            DataBridge.emit('mistake:added', mistakeObj);
        },

        // 获取全局学习进度（从单词状态计算）
        getLearningProgress: function() {
            var wordStatus = Storage.get(Storage.keys.WORD_STATUS);
            var allWords = Grade7Data.getAllWords();
            var total = allWords.length;
            var mastered = 0;
            var learning = 0;
            var notStarted = 0;

            for (var i = 0; i < allWords.length; i++) {
                var wid = allWords[i].id;
                var status = wordStatus[wid];
                if (status && status.status === 'mastered') {
                    mastered++;
                } else if (status && status.status === 'learning') {
                    learning++;
                } else {
                    notStarted++;
                }
            }

            return {
                total: total,
                mastered: mastered,
                learning: learning,
                notStarted: notStarted,
                percent: total > 0 ? Math.round((mastered / total) * 100) : 0
            };
        },

        // 获取复习计划
        getReviewSchedule: function() {
            return Storage.get(Storage.keys.REVIEW_SCHEDULE);
        },

        // 设置复习计划
        setReviewSchedule: function(items) {
            Storage.set(Storage.keys.REVIEW_SCHEDULE, items);
        },

        // 获取成就列表
        getAchievements: function() {
            return Storage.get(Storage.keys.ACHIEVEMENTS);
        },

        // 解锁成就，触发成就事件
        unlockAchievement: function(achId) {
            var achievements = Storage.get(Storage.keys.ACHIEVEMENTS);
            if (!achievements[achId]) {
                achievements[achId] = {
                    unlocked: true,
                    date: new Date().toISOString()
                };
                Storage.set(Storage.keys.ACHIEVEMENTS, achievements);
                DataBridge.emit('achievement:unlocked', { achId: achId });
                return true;
            }
            return false;
        }
    },


    // ===================================================================
    // LAYER 3: EVENT LAYER - 事件系统层
    // 发布-订阅模式，模块间解耦通信
    // ===================================================================

    // 事件监听器存储对象
    _listeners: {},

    // 预定义事件清单:
    // word:status-changed - 单词状态变更
    // word:mastered - 单词掌握
    // mistake:added - 新增错题
    // mistake:resolved - 错题已解决
    // achievement:unlocked - 成就解锁
    // unit:completed - 单元完成
    // review:due - 复习到期
    // progress:updated - 进度更新

    // 注册事件监听器
    on: function(event, callback) {
        if (!this._listeners[event]) {
            this._listeners[event] = [];
        }
        this._listeners[event].push(callback);
    },

    // 移除事件监听器
    off: function(event, callback) {
        if (!this._listeners[event]) return;
        var newListeners = [];
        for (var i = 0; i < this._listeners[event].length; i++) {
            if (this._listeners[event][i] !== callback) {
                newListeners.push(this._listeners[event][i]);
            }
        }
        this._listeners[event] = newListeners;
    },

    // 触发事件，通知所有监听器
    emit: function(event, data) {
        if (!this._listeners[event]) return;
        for (var i = 0; i < this._listeners[event].length; i++) {
            this._listeners[event][i](data);
        }

        // 特殊事件联动: 状态变更时自动触发进度更新
        if (event === 'word:status-changed' || event === 'mistake:added' || event === 'mistake:resolved') {
            this._emitProgressUpdate();
        }
    },

    // 内部方法: 触发进度更新事件
    _emitProgressUpdate: function() {
        if (this._listeners['progress:updated']) {
            var progress = this.state.getLearningProgress();
            for (var i = 0; i < this._listeners['progress:updated'].length; i++) {
                this._listeners['progress:updated'][i](progress);
            }
        }
    },


    // ===================================================================
    // LAYER 4: STATS LAYER - 统计分析层
    // 基于状态数据计算学习统计、弱项分析、预测评分
    // ===================================================================

    stats: {

        // 获取单元学习进度
        getUnitProgress: function(unitId) {
            var unit = Grade7Data.getUnitById(unitId);
            if (!unit || !unit.words) {
                return { mastered: 0, total: 0, percent: 0 };
            }

            var wordStatus = Storage.get(Storage.keys.WORD_STATUS);
            var total = unit.words.length;
            var mastered = 0;

            for (var i = 0; i < unit.words.length; i++) {
                var wid = unit.words[i].id;
                var status = wordStatus[wid];
                if (status && status.status === 'mastered') {
                    mastered++;
                }
            }

            return {
                mastered: mastered,
                total: total,
                percent: total > 0 ? Math.round((mastered / total) * 100) : 0
            };
        },

        // 获取全局学习进度统计
        getGlobalProgress: function() {
            var wordStatus = Storage.get(Storage.keys.WORD_STATUS);
            var allWords = Grade7Data.getAllWords();
            var allGrammar = Grade7Data.getAllGrammar();
            var wordsMastered = 0;
            var grammarMastered = 0;
            var exercisesCorrect = 0;
            var exercisesTotal = 0;

            // 统计单词掌握数
            for (var i = 0; i < allWords.length; i++) {
                var wid = allWords[i].id;
                var status = wordStatus[wid];
                if (status && status.status === 'mastered') {
                    wordsMastered++;
                }
            }

            // 统计语法掌握数
            var grammarStatus = Storage.get(Storage.keys.GRAMMAR_STATUS);
            for (var i = 0; i < allGrammar.length; i++) {
                var gid = allGrammar[i].id;
                if (grammarStatus[gid] && grammarStatus[gid].status === 'mastered') {
                    grammarMastered++;
                }
            }

            // 统计练习正确率
            var exerciseHistory = Storage.get(Storage.keys.EXERCISE_HISTORY);
            for (var i = 0; i < exerciseHistory.length; i++) {
                var record = exerciseHistory[i];
                exercisesTotal++;
                if (record.correct) {
                    exercisesCorrect++;
                }
            }

            return {
                wordsMastered: wordsMastered,
                grammarMastered: grammarMastered,
                exercisesCorrect: exercisesCorrect,
                exercisesTotal: exercisesTotal,
                accuracy: exercisesTotal > 0 ? Math.round((exercisesCorrect / exercisesTotal) * 100) : 0
            };
        },

        // 获取学习连续天数
        getStreak: function() {
            return Storage.get(Storage.keys.STREAK_COUNT);
        },

        // 获取指定日期的学习活动记录
        getDailyActivity: function(date) {
            date = date || new Date().toISOString().split('T')[0];
            var learningProgress = Storage.get(Storage.keys.LEARNING_PROGRESS);
            var dailyRecords = learningProgress.dailyRecords || [];

            for (var i = 0; i < dailyRecords.length; i++) {
                if (dailyRecords[i].date === date) {
                    return dailyRecords[i];
                }
            }

            // 没有找到记录，返回空结构
            return { date: date, modules: {} };
        },

        // 分析知识弱项，按错误率排序返回前N个
        getWeakPoints: function(topN) {
            topN = topN || 5;
            var mistakes = Storage.get(Storage.keys.MISTAKES);
            var errorCounts = {};
            var totalAttempts = {};

            // 统计每个知识点的错误次数
            for (var i = 0; i < mistakes.length; i++) {
                var kgPoint = mistakes[i].kgPoint || mistakes[i].knowledgePoint || 'unknown';
                if (!errorCounts[kgPoint]) {
                    errorCounts[kgPoint] = 0;
                }
                errorCounts[kgPoint]++;
            }

            // 从练习历史统计总尝试次数
            var exerciseHistory = Storage.get(Storage.keys.EXERCISE_HISTORY);
            for (var i = 0; i < exerciseHistory.length; i++) {
                var kp = exerciseHistory[i].kgPoint || exerciseHistory[i].knowledgePoint || 'unknown';
                if (!totalAttempts[kp]) {
                    totalAttempts[kp] = 0;
                }
                totalAttempts[kp]++;
            }

            // 计算错误率并排序
            var weakPoints = [];
            var kgKeys = Object.keys(errorCounts);
            for (var i = 0; i < kgKeys.length; i++) {
                var kp = kgKeys[i];
                var attempts = totalAttempts[kp] || errorCounts[kp];
                var errorRate = Math.round((errorCounts[kp] / attempts) * 100);
                weakPoints.push({
                    kgPoint: kp,
                    errorCount: errorCounts[kp],
                    totalCount: attempts,
                    errorRate: errorRate
                });
            }

            // 按错误率降序排序
            weakPoints.sort(function(a, b) {
                return b.errorRate - a.errorRate;
            });

            return weakPoints.slice(0, topN);
        },

        // 获取预估分数（基于掌握度和正确率计算）
        getEstimatedScore: function() {
            // 尝试从自适应引擎获取
            if (typeof AdaptiveEngine !== 'undefined' && AdaptiveEngine.getEstimatedScore) {
                return AdaptiveEngine.getEstimatedScore();
            }

            // 备用: 基于全局进度计算预估分数
            var progress = DataBridge.stats.getGlobalProgress();
            var masteryScore = progress.wordsMastered * 2;
            var accuracyBonus = progress.accuracy * 0.5;
            var grammarBonus = progress.grammarMastered * 3;

            return Math.round(masteryScore + accuracyBonus + grammarBonus);
        }
    },


    // ===================================================================
    // LAYER 5: REGISTRY LAYER - 模块注册层
    // 模块能力注册和依赖管理，支持运行时模块发现
    // ===================================================================

    registry: {

        // 已注册模块存储
        _modules: {},

        // 注册模块信息
        register: function(moduleName, info) {
            this._modules[moduleName] = {
                name: moduleName,
                version: info.version || '1.0.0',
                capabilities: info.capabilities || [],
                dependencies: info.dependencies || [],
                status: info.status || 'active',
                registeredAt: new Date().toISOString()
            };
        },

        // 获取已注册模块列表
        list: function() {
            var result = [];
            var keys = Object.keys(this._modules);
            for (var i = 0; i < keys.length; i++) {
                result.push(this._modules[keys[i]]);
            }
            return result;
        },

        // 检查模块是否具有指定能力
        hasCapability: function(moduleName, capability) {
            var module = this._modules[moduleName];
            if (!module) return false;
            var caps = module.capabilities;
            for (var i = 0; i < caps.length; i++) {
                if (caps[i] === capability) {
                    return true;
                }
            }
            return false;
        },

        // 获取模块信息
        getModule: function(moduleName) {
            return this._modules[moduleName] || null;
        },

        // 卸载模块
        unregister: function(moduleName) {
            delete this._modules[moduleName];
        },

        // 获取具有指定能力的所有模块
        findByCapability: function(capability) {
            var result = [];
            var keys = Object.keys(this._modules);
            for (var i = 0; i < keys.length; i++) {
                var mod = this._modules[keys[i]];
                if (this.hasCapability(mod.name, capability)) {
                    result.push(mod);
                }
            }
            return result;
        }
    }
};
