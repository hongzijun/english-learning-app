// TTS朗读函数
function ttsSpeak(word, speed) {
    if (!window.speechSynthesis) return false;
    window.speechSynthesis.cancel();
    var utt = new SpeechSynthesisUtterance(word);
    utt.lang = 'en-US';
    utt.rate = speed || 1;
    utt.pitch = 1;
    window.speechSynthesis.speak(utt);
    return true;
}

// 检测TTS是否可用
function isTTSAvailable() {
    return !!(window.speechSynthesis);
}

const SmartWordsModule = {
    currentWords: [],
    currentIndex: 0,
    learningMode: 'smart',
    studyMode: 'visual',
    activeUnitId: 1,
    unlockedUnits: [1],
    wordMode: 'encn',
    speechSpeed: 0.8,
    modesUsed: { visual: false, dictation: false, spelling: false, speaking: false, sentence: false },
    sessionSeenWords: {},
    recentAnswers: [],
    consecutiveErrors: { encn: 0, cnen: 0 },
    anchoredNext: false,
    lastDirection: 'encn',
    dynamicConfig: {
        maxNew: 10,
        maxMaintenance: 3,
        baseCnenRatio: 0.15
    },
    sessionStats: {
        newLearned: 0,
        reviewed: 0,
        repeated: 0,
        totalAnswered: 0,
        correctCount: 0,
        encnAnswers: 0,
        cnenAnswers: 0,
        encnCorrect: 0,
        cnenCorrect: 0,
        startTime: null
    },

    init: function () {
        SpacedRepetition.init();
        const saved = localStorage.getItem('swm_state');
        if (saved) {
            try {
                const state = JSON.parse(saved);
                this.unlockedUnits = state.unlockedUnits || [1];
                this.activeUnitId = state.activeUnitId || 1;
                this.studyMode = state.studyMode || 'visual';
                this.speechSpeed = state.speechSpeed || 1;
            } catch (e) { }
        }
        this.currentWords = (typeof DataBridge !== 'undefined') ? DataBridge.query('words') : Grade7Data.getAllWords();
        this.checkAutoUnlock();
        this.render();
        this.bindEvents();
        if (window.__dragonModeRequested) {
            window.__dragonModeRequested = false;
            console.log('[SmartWords] 检测到dragonFlag，启动DragonMode');
            var self = this;
            setTimeout(function () {
                if (typeof DragonMode !== 'undefined') {
                    console.log('[SmartWords] DragonMode存在，调用start');
                    DragonMode.start();
                } else {
                    console.error('[SmartWords] DragonMode未定义!');
                    self.startLearning('smart');
                }
            }, 50);
        }
    },

    saveState: function () {
        localStorage.setItem('swm_state', JSON.stringify({
            unlockedUnits: this.unlockedUnits,
            activeUnitId: this.activeUnitId,
            studyMode: this.studyMode,
            speechSpeed: this.speechSpeed
        }));
    },

    decideDirection: function (wordId) {
        if (this.anchoredNext) {
            this.anchoredNext = false;
            return this.lastDirection === 'encn' ? 'cnen' : 'encn';
        }

        if (typeof SpacedRepetition === 'undefined' || typeof SpacedRepetition.getWordStage !== 'function') {
            return Math.random() > 0.5 ? 'encn' : 'cnen';
        }

        var stage = SpacedRepetition.getWordStage(wordId);
        var weakness = SpacedRepetition.getDirectionWeakness(wordId);

        var baseEncnProb;
        switch (stage) {
            case 'new': baseEncnProb = 0.85; break;
            case 'learning': baseEncnProb = 0.50; break;
            case 'mastering': baseEncnProb = 0.30; break;
            case 'fluent': baseEncnProb = 0.20; break;
            default: baseEncnProb = 0.50;
        }

        var weaknessBonus = 0;
        if (weakness && weakness.weakerDir === 'cnen') {
            weaknessBonus = Math.min(0.30, (weakness.cnenErrorRate - weakness.encnErrorRate) * 0.8);
        } else if (weakness && weakness.weakerDir === 'encn') {
            weaknessBonus = Math.max(-0.30, (weakness.encnErrorRate - weakness.cnenErrorRate) * 0.8);
        }

        var dynamicAdjust = (this.dynamicConfig.baseCnenRatio || 0.15) - 0.15;

        var finalEncnProb = baseEncnProb - weaknessBonus - dynamicAdjust;
        finalEncnProb = Math.max(0.15, Math.min(0.85, finalEncnProb));

        return Math.random() < finalEncnProb ? 'encn' : 'cnen';
    },

    buildSmartQueue: function (unitId) {
        var unit = Grade7Data.getUnitById(unitId);
        if (!unit) return [];

        var unitWordIds = unit.words.map(function (w) { return w.id; });
        var config = this.dynamicConfig;
        var maxNew = config.maxNew || 10;
        var maxMaint = config.maxMaintenance || 3;
        var now = Date.now();

        var newIds = unitWordIds.filter(function (id) { return !SpacedRepetition.getCard(id); });
        newIds.sort(function () { return Math.random() - 0.5; });
        var newQueue = newIds.slice(0, maxNew);

        var reviewCandidates = unitWordIds.filter(function (id) {
            var card = SpacedRepetition.getCard(id);
            if (!card) return false;
            return (card.encnTrack && card.encnTrack.nextReview <= now) ||
                (card.cnenTrack && card.cnenTrack.nextReview <= now);
        });

        reviewCandidates.sort(function (a, b) {
            var cardA = SpacedRepetition.getCard(a);
            var cardB = SpacedRepetition.getCard(b);
            var overdueA = 0, overdueB = 0;
            if (cardA && cardA.encnTrack) overdueA = Math.max(overdueA, now - cardA.encnTrack.nextReview);
            if (cardA && cardA.cnenTrack) overdueA = Math.max(overdueA, now - cardA.cnenTrack.nextReview);
            if (cardB && cardB.encnTrack) overdueB = Math.max(overdueB, now - cardB.encnTrack.nextReview);
            if (cardB && cardB.cnenTrack) overdueB = Math.max(overdueB, now - cardB.cnenTrack.nextReview);
            return overdueB - overdueA;
        });
        var reviewQueue = reviewCandidates;

        var maintenanceCandidates = unitWordIds.filter(function (id) {
            var card = SpacedRepetition.getCard(id);
            if (!card) return false;
            if (typeof SpacedRepetition.isWordMastered === 'function' && !SpacedRepetition.isWordMastered(id)) return false;
            var eT = card.encnTrack, cT = card.cnenTrack;
            if (!eT || !cT) return false;
            var daysSinceLast = now - (card.lastReview || now);
            return daysSinceLast > 7 * 24 * 60 * 60 * 1000;
        });
        maintenanceCandidates.sort(function () { return Math.random() - 0.5; });
        var maintenanceQueue = maintenanceCandidates.slice(0, maxMaint);

        var seen = {};
        var finalQueue = [];

        reviewQueue.forEach(function (id) {
            if (!seen[id]) { seen[id] = true; finalQueue.push(id); }
        });
        newQueue.forEach(function (id) {
            if (!seen[id]) { seen[id] = true; finalQueue.push(id); }
        });
        maintenanceQueue.forEach(function (id) {
            if (!seen[id]) { seen[id] = true; finalQueue.push(id); }
        });

        return finalQueue;
    },

    getUnitMastery: function (unitId) {
        const unit = Grade7Data.getUnitById(unitId);
        if (!unit || !unit.words) return { mastered: 0, total: 0, percent: 0 };
        const wordIds = unit.words.map(w => w.id);
        let mastered = 0;
        let total = wordIds.length;
        wordIds.forEach(id => {
            const card = SpacedRepetition.getCard(id);
            if (!card) return;
            const repEN = card.encnTrack ? card.encnTrack.repetitions : (card.repetitions || 0);
            const easeEN = card.encnTrack ? card.encnTrack.easiness : (card.easiness || 2.5);
            const repCN = card.cnenTrack ? card.cnenTrack.repetitions : 0;
            const easeCN = card.cnenTrack ? card.cnenTrack.easiness : 2.5;
            if ((repEN + repCN) >= 2 && (easeEN + easeCN) / 2 >= 2.3) mastered++;
        });
        return { mastered, total, percent: total > 0 ? Math.round(mastered / total * 100) : 0 };
    },

    checkAutoUnlock: function () {
        const config = Grade7Data.unlockConfig || { masterThreshold: 0.7, autoUnlockNext: true };
        if (!config.autoUnlockNext) return;

        for (let i = 1; i <= 6; i++) {
            if (!this.unlockedUnits.includes(i)) continue;
            if (i < 6 && !this.unlockedUnits.includes(i + 1)) {
                const mastery = this.getUnitMastery(i);
                if (mastery.percent >= config.masterThreshold * 100) {
                    this.unlockedUnits.push(i + 1);
                    this.showUnlockAnimation(i + 1);
                    this.checkAchievement('unit' + i + '_complete');
                }
            }
        }
        this.saveState();
    },

    showUnlockAnimation: function (unitId) {
        const unit = Grade7Data.getUnitById(unitId);
        if (!unit) return;
        setTimeout(() => {
            if (typeof Utils !== 'undefined' && Utils.showNotification) {
                Utils.showNotification('🏅 恭喜解锁 ' + unit.name + '！继续加油！', 'success', 5000);
            }
        }, 500);
    },

    getAchievements: function () {
        const saved = JSON.parse(localStorage.getItem('achievements') || '{}');
        return saved.unlocked || [];
    },

    checkAchievement: function (achId) {
        const achievements = Grade7Data.achievements || [];
        const ach = achievements.find(a => a.id === achId);
        if (!ach) return;

        const unlocked = this.getAchievements();
        if (unlocked.includes(achId)) return;

        let shouldUnlock = false;
        const allWordIds = this.currentWords.map(w => w.id);
        const progress = SpacedRepetition.getLearningProgress(allWordIds);
        const dailyStats = SpacedRepetition.getDailyStats();
        const streak = SpacedRepetition.getStreak();

        switch (ach.type) {
            case 'words':
                shouldUnlock = progress.mastered + progress.learning >= ach.req;
                break;
            case 'exercises':
                shouldUnlock = (dailyStats.total || 0) >= ach.req;
                break;
            case 'streak':
                shouldUnlock = streak >= ach.req;
                break;
            case 'accuracy':
                shouldUnlock = dailyStats.total > 10 && Math.round(dailyStats.correct / dailyStats.total * 100) >= ach.req;
                break;
            case 'unit':
                const uMastery = this.getUnitMastery(ach.unitId);
                shouldUnlock = uMastery.percent >= 70;
                break;
            case 'special':
                if (achId === 'all_units') {
                    shouldUnlock = this.unlockedUnits.length >= 6;
                } else if (achId === 'perfect_day') {
                    shouldUnlock = dailyStats.newWords >= 50 && dailyStats.total > 10 &&
                        Math.round(dailyStats.correct / dailyStats.total * 100) > 90;
                }
                break;
            case 'spelling':
                var wordId1 = this.currentQueue[this.currentIndex];
                var card1 = SpacedRepetition.getCard(wordId1);
                shouldUnlock = card1 && card1.spellingStreak >= ach.req;
                break;
            case 'listening':
                var wordId2 = this.currentQueue[this.currentIndex];
                var card2 = SpacedRepetition.getCard(wordId2);
                shouldUnlock = card2 && card2.listeningStreak >= ach.req;
                break;
            case 'allround':
                var allModesUsed = this.modesUsed && this.modesUsed.visual && this.modesUsed.dictation && this.modesUsed.spelling;
                shouldUnlock = allModesUsed === true;
                break;
        }

        if (shouldUnlock) {
            unlocked.push(achId);
            localStorage.setItem('achievements', JSON.stringify({ unlocked }));
            if (typeof Utils !== 'undefined' && Utils.showNotification) {
                Utils.showNotification(ach.icon + ' 成就解锁：' + ach.name + '！+' + ach.reward + '积分', 'success', 4000);
            }
        }
    },

    render: function () {
        const moduleContent = document.getElementById('moduleContent');
        const allWordIds = this.currentWords.map(w => w.id);
        const progress = SpacedRepetition.getLearningProgress(allWordIds);
        const dailyStats = SpacedRepetition.getDailyStats();
        const streak = SpacedRepetition.getStreak();
        const weeklyStats = SpacedRepetition.getWeeklyStats();
        const unlockedAchievements = this.getAchievements();

        const unitCards = Grade7Data.learningPath.map(unit => {
            const m = this.getUnitMastery(unit.unitId);
            const isUnlocked = this.unlockedUnits.includes(unit.unitId);
            const isActive = this.activeUnitId === unit.unitId;
            const lockStatus = isUnlocked ? '' : 'locked';
            const activeClass = isActive ? 'active' : '';

            return `
            <div class="unit-card card ${lockStatus} ${activeClass} p-3" data-unit="${unit.unitId}" style="cursor:${isUnlocked ? 'pointer' : 'not-allowed'};">
                <div class="flex justify-between align-items-center mb-2">
                    <strong>${unit.name}</strong>
                    ${!isUnlocked ? '<span class="badge bg-secondary">🔒 锁定</span>' :
                    m.percent >= 70 ? '<span class="badge bg-success">✅ 已通关</span>' :
                        '<span class="badge bg-primary">学习中</span>'}
                </div>
                <div class="progress-bar-container" style="height:8px;border-radius:4px;background:#e5e7eb;">
                    <div class="progress-bar" style="width:${m.percent}%;height:100%;border-radius:4px;background:linear-gradient(90deg,#3b82f6,#10b981);transition:width 0.3s;"></div>
                </div>
                <div class="text-muted mt-1" style="font-size:0.75rem;">掌握 ${m.mastered}/${m.total} (${m.percent}%)</div>
            </div>`;
        }).join('');

        moduleContent.innerHTML = `
            <div class="smart-words-module">
                <div class="page-header mb-4">
                    <h2>🧠 智能单词学习</h2>
                    <p class="text-muted">基于SM-2间隔重复 · 无限量学习 · 单元解锁制</p>
                </div>
                
                <div class="stats-grid grid grid-4 gap-3 mb-4">
                    <div class="stat-card card text-center p-3">
                        <div class="stat-value" style="font-size:2rem;font-weight:700;color:#3b82f6;">${streak}</div>
                        <div class="stat-label text-muted">🔥 连续天数</div>
                    </div>
                    <div class="stat-card card text-center p-3">
                        <div class="stat-value" style="font-size:2rem;font-weight:700;color:#10b981;">${dailyStats.reviews}</div>
                        <div class="stat-label text-muted">📊 今日复习</div>
                    </div>
                    <div class="stat-card card text-center p-3">
                        <div class="stat-value" style="font-size:2rem;font-weight:700;color:#f59e0b;">${dailyStats.newWords}</div>
                        <div class="stat-label text-muted">🆕 今日新学</div>
                    </div>
                    <div class="stat-card card text-center p-3">
                        <div class="stat-value" style="font-size:2rem;font-weight:700;color:#8b5cf6;">${unlockedAchievements.length}</div>
                        <div class="stat-label text-muted">🏅 成就数</div>
                    </div>
                </div>
                
                <div class="units-section card mb-4 p-4">
                    <h4 class="mb-3">📚 学习单元（掌握70%解锁下一单元）</h4>
                    <div class="units-grid grid grid-3 gap-3">${unitCards}</div>
                </div>
                
                <div class="overall-progress card mb-4 p-4">
                    <h4 class="mb-3">📈 总体学习进度</h4>
                    <div class="progress-bar-container mb-3" style="background:#e5e7eb;height:24px;border-radius:12px;overflow:hidden;">
                        <div class="progress-bar" style="width:${progress.progressPercent}%;height:100%;border-radius:12px;background:linear-gradient(90deg,#3b82f6,#10b981);transition:width 0.5s;"></div>
                    </div>
                    <div class="grid grid-3 gap-2 text-center">
                        <div class="p-2" style="background:#fef3c7;border-radius:8px;">
                            <strong style="color:#92400e;font-size:1.5rem;">${progress.new}</strong><br><span style="font-size:0.75rem;color:#666;">新单词</span>
                        </div>
                        <div class="p-2" style="background:#dbeafe;border-radius:8px;">
                            <strong style="color:#1e40af;font-size:1.5rem;">${progress.learning}</strong><br><span style="font-size:0.75rem;color:#666;">学习中</span>
                        </div>
                        <div class="p-2" style="background:#d1fae5;border-radius:8px;">
                            <strong style="color:#065f46;font-size:1.5rem;">${progress.mastered}</strong><br><span style="font-size:0.75rem;color:#666;">已掌握</span>
                        </div>
                    </div>
                    <p class="text-center mt-2 text-muted">总单词数：${progress.total} | 正确率：${dailyStats.total > 0 ? Math.round(dailyStats.correct / dailyStats.total * 100) : 0}%</p>
                </div>
                
                <div class="learning-modes card mb-4 p-4">
                    <h4 class="mb-3">🎯 选择学习模式（当前：${this.getModeName(this.learningMode)}）</h4>
                    <div class="mode-buttons flex gap-3 flex-wrap">
                        <button class="btn btn-primary mode-btn ${this.learningMode === 'smart' ? 'active' : ''}" data-mode="smart">
                            🧠 智能混合（推荐）
                            <small class="d-block text-light opacity-75">学+复习科学搭配</small>
                        </button>
                        <button class="btn btn-success mode-btn ${this.learningMode === 'new' ? 'active' : ''}" data-mode="new">
                            🆕 学习新词
                            <small class="d-block text-light opacity-75">只学当前单元新词</small>
                        </button>
                        <button class="btn btn-warning mode-btn ${this.learningMode === 'review' ? 'active' : ''}" data-mode="review">
                            🔄 智能复习
                            <small class="d-block text-light opacity-75">复习到期单词</small>
                        </button>
                        <button class="btn btn-info mode-btn ${this.learningMode === 'all' ? 'active' : ''}" data-mode="all">
                            📚 全面复习
                            <small class="d-block text-light opacity-75">所有已学单词</small>
                        </button>
                    </div>
                    <hr style="margin:1.5rem 0;">
                    <h5 class="mb-3">📝 专项训练</h5>
                    <div class="mode-buttons flex gap-3 flex-wrap">
                        <button class="btn btn-secondary mode-btn ${this.learningMode === 'spelling' ? 'active' : ''}" data-mode="spelling">
                            ✍️ 默写模式
                            <small class="d-block text-light opacity-75">看中文写英文</small>
                        </button>
                        <button class="btn btn-secondary mode-btn ${this.learningMode === 'dictation' ? 'active' : ''}" data-mode="dictation">
                            🔊 听写模式
                            <small class="d-block text-light opacity-75">听音默写英文</small>
                        </button>
                        <button class="btn btn-secondary mode-btn ${this.learningMode === 'listening' ? 'active' : ''}" data-mode="listening">
                            🎧 听力测试
                            <small class="d-block text-light opacity-75">听音选义</small>
                        </button>
                        <button class="btn btn-secondary mode-btn ${this.learningMode === 'mixed' ? 'active' : ''}" data-mode="mixed">
                            🎲 混合模式
                            <small class="d-block text-light opacity-75">随机切换题型</small>
                        </button>
                    </div>
                </div>
                
                <div class="study-modes card mb-4 p-4">
                    <h4 class="mb-3">🎧 学习方式（当前：${this.getModeName(this.studyMode)}）</h4>
                    <div class="study-mode-buttons flex gap-3 flex-wrap">
                        <button class="btn ${this.studyMode === 'visual' ? 'btn-primary' : 'btn-outline-primary'} study-mode-btn ${this.studyMode === 'visual' ? 'active' : ''}" data-study="visual" ${!isTTSAvailable() ? 'disabled title="浏览器不支持语音"' : ''}>
                            👁️ 视觉记忆
                            <small class="d-block">看词选义</small>
                        </button>
                        <button class="btn ${this.studyMode === 'dictation' ? 'btn-primary' : 'btn-outline-primary'} study-mode-btn ${this.studyMode === 'dictation' ? 'active' : ''}" data-study="dictation" ${!isTTSAvailable() ? 'disabled title="浏览器不支持语音"' : ''}>
                            🔊 听写训练
                            <small class="d-block">听词默写</small>
                        </button>
                        <button class="btn ${this.studyMode === 'spelling' ? 'btn-primary' : 'btn-outline-primary'} study-mode-btn ${this.studyMode === 'spelling' ? 'active' : ''}" data-study="spelling">
                            ✍️ 默写测试
                            <small class="d-block">看义拼写</small>
                        </button>
                        <button class="btn ${this.studyMode === 'five-dim' ? 'btn-primary' : 'btn-outline-primary'} study-mode-btn ${this.studyMode === 'five-dim' ? 'active' : ''}" data-study="five-dim">
                            🎯 五维掌握
                            <small class="d-block">听说读写用</small>
                        </button>
                        <button class="btn ${this.studyMode === 'mixed' ? 'btn-primary' : 'btn-outline-primary'} study-mode-btn ${this.studyMode === 'mixed' ? 'active' : ''}" data-study="mixed" ${!isTTSAvailable() ? 'disabled title="浏览器不支持语音"' : ''}>
                            🎲 综合练习
                            <small class="d-block">随机混合</small>
                        </button>
                        <button class="btn ${this.studyMode === 'speaking' ? 'btn-primary' : 'btn-outline-primary'} study-mode-btn ${this.studyMode === 'speaking' ? 'active' : ''}" data-study="speaking" ${!isTTSAvailable() ? 'disabled title="浏览器不支持语音"' : ''}>
                            🎤 口语练习
                            <small class="d-block">跟读+自评</small>
                        </button>
                        <button class="btn ${this.studyMode === 'sentence' ? 'btn-primary' : 'btn-outline-primary'} study-mode-btn ${this.studyMode === 'sentence' ? 'active' : ''}" data-study="sentence">
                            ✏️ 造句练习
                            <small class="d-block">用词造句</small>
                        </button>
                        <button class="btn ${this.studyMode === 'translate' ? 'btn-primary' : 'btn-outline-primary'} study-mode-btn ${this.studyMode === 'translate' ? 'active' : ''}" data-study="translate">
                            🌐 翻译挑战
                            <small class="d-block">中译英</small>
                        </button>
                    </div>
                    ${isTTSAvailable() ? `
                    <div class="speed-control mt-3">
                        <label class="form-label d-block">🔈 语速：<span id="speedLabel">${this.speechSpeed === 0.7 ? '慢' : this.speechSpeed === 1.3 ? '快' : '正常'}</span></label>
                        <input type="range" id="speedSlider" min="0.7" max="1.3" step="0.3" value="${this.speechSpeed}" class="form-range" style="width:200px;">
                    </div>
                    ` : '<div class="text-muted mt-2">⚠️ 您的浏览器不支持语音功能，听写/听力/混合模式不可用</div>'}
                </div>

                <div class="card mb-4 p-4 dragon-entry" style="background:linear-gradient(135deg,#7c3aed,#a855f7);color:white;cursor:pointer;" id="dragonEntry">
                    <div style="display:flex;align-items:center;gap:1rem;">
                        <span style="font-size:2.5rem;">🐉</span>
                        <div>
                            <h3 style="margin:0;font-size:1.2rem;font-weight:700;">一条龙 · 全智能学习</h3>
                            <p style="margin:0.3rem 0 0;font-size:0.82rem;opacity:0.88;line-height:1.4;">
                                AI自动规划路径 · 7种模式无缝切换<br>
                                实时难度适配 · 薄弱点智能巩固
                            </p>
                        </div>
                        <button class="btn" id="startDragonBtn" style="background:rgba(255,255,255,0.2);color:white;border:1px solid rgba(255,255,255,0.4);padding:0.6rem 1.5rem;font-weight:600;font-size:0.95rem;margin-left:auto;border-radius:50px;transition:all 0.2s;">
                            开始学习 →
                        </button>
                    </div>
                </div>

                <div class="card mb-4 p-3" id="advancedOptions">
                    <div style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;" onclick="var body=this.nextElementSibling;body.style.display=body.style.display===\'none\'?\'block\':\'none\';this.querySelector(\'.arrow\').textContent=body.style.display===\'none\'?\'▶\':\'▼\';">
                        <strong style="font-size:0.9rem;">⚙️ 高级学习选项</strong>
                        <span class="arrow" style="font-size:0.75rem;color:#888;">▶</span>
                    </div>
                    <div style="display:none;margin-top:0.75rem;">
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                            <div>
                                <label style="font-size:0.82rem;color:#666;display:block;margin-bottom:0.3rem;">每轮新词上限：<strong id="maxNewLabel">${this.dynamicConfig.maxNew || 10}</strong></label>
                                <input type="range" id="maxNewSlider" min="3" max="25" value="${this.dynamicConfig.maxNew || 10}" style="width:100%;">
                            </div>
                            <div>
                                <label style="font-size:0.82rem;color:#666;display:block;margin-bottom:0.3rem;">回忆难度偏好：</label>
                                <div style="display:flex;gap:0.4rem;">
                                    <button class="btn btn-sm ${(this.dynamicConfig.baseCnenRatio || 0) <= 0.1 ? 'btn-primary' : 'btn-outline-secondary'}" data-cnen="0.05" onclick="SmartWordsModule.setCnenPref(0.05,this)">偏识别</button>
                                    <button class="btn btn-sm ${((this.dynamicConfig.baseCnenRatio || 0) > 0.1 && (this.dynamicConfig.baseCnenRatio || 0) <= 0.4) ? 'btn-primary' : 'btn-outline-secondary'}" data-cnen="0.25" onclick="SmartWordsModule.setCnenPref(0.25,this)">均衡</button>
                                    <button class="btn btn-sm ${(this.dynamicConfig.baseCnenRatio || 0) > 0.4 ? 'btn-primary' : 'btn-outline-secondary'}" data-cnen="0.60" onclick="SmartWordsModule.setCnenPref(0.60,this)">偏回忆</button>
                                </div>
                            </div>
                        </div>
                        <div style="margin-top:0.75rem;padding:0.6rem;background:#f8fafc;border-radius:6px;font-size:0.78rem;color:#666;line-height:1.5;">
                            💡 <strong>算法说明：</strong>系统使用双轨SM-2间隔重复算法。新词以EN→CN（识别）为主建立初步记忆，随着掌握程度提升逐渐增加CN→EN（回忆）比例以强化主动输出能力。
                        </div>
                    </div>
                </div>

                <div id="learningArea" class="mb-4"></div>
                
                <div class="achievements-section card mb-4 p-4">
                    <h4 class="mb-3">🏅 成就系统 (<span id="achCount">${unlockedAchievements.length}</span>/${(Grade7Data.achievements || []).length})</h4>
                    <div class="achievements-grid grid grid-4 gap-2" id="achievementsGrid">
                        ${this.renderAchievements(unlockedAchievements)}
                    </div>
                </div>
                
                <div class="weekly-stats card p-4">
                    <h4 class="mb-3">📊 本周统计</h4>
                    <div class="grid grid-2 gap-3">
                        <div class="p-3" style="background:#f8fafc;border-radius:8px;"><strong style="font-size:1.25rem;">${weeklyStats.totalReviews}</strong><br><span class="text-muted">总复习次数</span></div>
                        <div class="p-3" style="background:#f8fafc;border-radius:8px;"><strong style="font-size:1.25rem;">${weeklyStats.totalNewWords}</strong><br><span class="text-muted">新学单词</span></div>
                        <div class="p-3" style="background:#f8fafc;border-radius:8px;"><strong style="font-size:1.25rem;">${weeklyStats.averageAccuracy}%</strong><br><span class="text-muted">平均正确率</span></div>
                        <div class="p-3" style="background:#f8fafc;border-radius:8px;"><strong style="font-size:1.25rem;">${streak}天</strong><br><span class="text-muted">连续学习</span></div>
                    </div>
                </div>
            </div>
        `;

        this.addStyles();
    },

    getModeName: function (mode) {
        var names = {
            smart: '智能混合',
            new: '学习新词',
            review: '智能复习',
            all: '全面复习',
            visual: '视觉记忆',
            dictation: '听写训练',
            spelling: '默写测试',
            mixed: '综合练习',
            listening: '听力测试',
            speaking: '口语练习',
            sentence: '造句练习',
            translate: '翻译挑战'
        };
        return names[mode] || mode;
    },

    setCnenPref: function (val, btn) {
        this.dynamicConfig.baseCnenRatio = val;
        document.querySelectorAll('[data-cnen]').forEach(function (b) {
            b.classList.remove('btn-primary');
            b.classList.add('btn-outline-secondary');
        });
        if (btn) {
            btn.classList.remove('btn-outline-secondary');
            btn.classList.add('btn-primary');
        }
    },

    renderAchievements: function (unlocked) {
        const all = Grade7Data.achievements || [];
        return all.map(ach => {
            const isUnlocked = unlocked.includes(ach.id);
            return `
            <div class="achievement-item p-2 text-center" style="background:${isUnlocked ? '#d1fae5' : '#f3f4f6'};border-radius:8px;opacity:${isUnlocked ? 1 : 0.5};">
                <div style="font-size:1.5rem;">${isUnlocked ? ach.icon : '🔒'}</div>
                <div style="font-size:0.7rem;font-weight:600;margin-top:0.25rem;">${ach.name}</div>
                <div style="font-size:0.6rem;color:#666;">+${ach.reward}分</div>
            </div>`;
        }).join('');
    },

    addStyles: function () {
        if (document.getElementById('swm-styles')) return;
        const style = document.createElement('style');
        style.id = 'swm-styles';
        style.textContent = `
            .smart-words-module{font-family:'Microsoft YaHei',sans-serif;}
            .unit-card{transition:all 0.3s;border:2px solid transparent;}
            .unit-card:hover:not(.locked){transform:translateY(-2px);box-shadow:0 4px 12px rgba(0,0,0,0.1);}
            .unit-card.active{border-color:#3b82f6;background:#eff6ff;}
            .unit-card.locked{opacity:0.6;filter:grayscale(50%);}
            .mode-btn{min-width:140px;padding:0.75rem 1rem;text-align:left;transition:all 0.2s;}
            .mode-btn.active{transform:scale(1.05);box-shadow:0 4px 12px rgba(59,130,246,0.4);}
            .word-card{perspective:1000px;min-height:320px;}
            .word-card-inner{position:relative;width:100%;min-height:320px;transition:transform 0.6s;transform-style:preserve-3d;}
            .word-card.flipped .word-card-inner{transform:rotateY(180deg);}
            .word-card-front,.word-card-back{position:absolute;width:100%;min-height:320px;backface-visibility:hidden;border-radius:16px;padding:2rem;box-sizing:border-box;}
            .word-card-front{background:linear-gradient(135deg,#3b82f6 0%,#1d4ed8 100%);color:white;}
            .word-card-back{background:linear-gradient(135deg,#10b981 0%,#059669 100%);color:white;transform:rotateY(180deg);}
            .quality-buttons{display:grid;grid-template-columns:repeat(6,1fr);gap:0.5rem;}
            .quality-btn{padding:1rem 0.25rem;border:none;border-radius:8px;cursor:pointer;font-weight:600;transition:all 0.2s;color:white;font-size:0.85rem;}
            .quality-btn:hover{transform:translateY(-2px);box-shadow:0 4px 8px rgba(0,0,0,0.2);}
            .quality-btn[data-quality="0"]{background:#ef4444;}.quality-btn[data-quality="1"]{background:#f97316;}
            .quality-btn[data-quality="2"]{background:#f59e0b;}.quality-btn[data-quality="3"]{background:#84cc16;}
            .quality-btn[data-quality="4"]{background:#22c55e;}.quality-btn[data-quality="5"]{background:#10b981;}
            @keyframes unlockPulse{0%{transform:scale(1);}50%{transform:scale(1.1);box-shadow:0 0 30px rgba(16,185,129,0.6);}100%{transform:scale(1);}}
            .unit-unlocked{animation:unlockPulse 0.6s ease;}
            .achievement-item{transition:all 0.3s;}
            .achievement-item:hover{transform:scale(1.05);}
            .listening-option:hover:not(:disabled){transform:scale(1.05);border-color:#3b82f6;}
            .listening-option:disabled{cursor:default;}
        `;
        document.head.appendChild(style);
    },

    startLearning: function (mode) {
        this.learningMode = mode;
        if (mode === 'smart' && typeof LearningFlowController !== 'undefined') {
            LearningFlowController.startFlow(this.activeUnitId);
            return;
        }
        this.modesUsed = { visual: false, dictation: false, spelling: false, speaking: false, sentence: false };
        if (mode === 'spelling') { this.studyMode = 'spelling'; mode = 'all'; }
        else if (mode === 'dictation') { this.studyMode = 'dictation'; mode = 'all'; }
        else if (mode === 'listening') { this.studyMode = 'listening'; mode = 'all'; }
        else if (mode === 'mixed') { this.studyMode = 'mixed'; mode = 'smart'; }
        else { this.studyMode = 'visual'; }

        this.sessionSeenWords = {};
        this.recentAnswers = [];
        this.consecutiveErrors = { encn: 0, cnen: 0 };
        this.anchoredNext = false;
        this.sessionStats = {
            newLearned: 0, reviewed: 0, repeated: 0,
            totalAnswered: 0, correctCount: 0,
            encnAnswers: 0, cnenAnswers: 0, encnCorrect: 0, cnenCorrect: 0,
            startTime: Date.now()
        };

        const unit = Grade7Data.getUnitById(this.activeUnitId);
        if (!unit) return;

        const unitWordIds = unit.words.map(w => w.id);
        let queue = [];

        switch (mode) {
            case 'smart': {
                queue = this.buildSmartQueue(this.activeUnitId);
                break;
            }
            case 'new':
                queue = unitWordIds.filter(id => !SpacedRepetition.getCard(id));
                break;
            case 'review': {
                var allLearned = unitWordIds.filter(function (id) { return SpacedRepetition.getCard(id); });
                var rConfig = this.dynamicConfig;
                var dueInReview = allLearned.filter(function (id) {
                    var card = SpacedRepetition.getCard(id);
                    if (!card) return false;
                    var now = Date.now();
                    return (card.encnTrack && card.encnTrack.nextReview <= now) ||
                        (card.cnenTrack && card.cnenTrack.nextReview <= now);
                });
                dueInReview.sort(function (a, b) {
                    var cardA = SpacedRepetition.getCard(a), cardB = SpacedRepetition.getCard(b);
                    var overA = 0, overB = 0, now = Date.now();
                    if (cardA && cardA.encnTrack) overA = Math.max(overA, now - cardA.encnTrack.nextReview);
                    if (cardA && cardA.cnenTrack) overA = Math.max(overA, now - cardA.cnenTrack.nextReview);
                    if (cardB && cardB.encnTrack) overB = Math.max(overB, now - cardB.encnTrack.nextReview);
                    if (cardB && cardB.cnenTrack) overB = Math.max(overB, now - cardB.cnenTrack.nextReview);
                    return overB - overA;
                });
                var maint = allLearned.filter(function (id) {
                    return typeof SpacedRepetition.isWordMastered === 'function' && SpacedRepetition.isWordMastered(id);
                }).slice(0, rConfig.maxMaintenance || 3);
                queue = dueInReview.concat(maint);
                break;
            }
            case 'all': {
                const learned = unitWordIds.filter(id => SpacedRepetition.getCard(id));
                queue = [...SpacedRepetition.getReviewQueue(learned, Infinity), ...learned.filter((v, i, a) => a.indexOf(v) === i)];
                break;
            }
        }

        if (queue.length === 0) {
            Utils.showNotification('🎉 太棒了！当前单元没有需要学习的单词了！', 'success');
            return;
        }

        this.currentQueue = queue;
        this.currentIndex = 0;
        this.showCurrentWord();
    },

    showCurrentWord: function () {
        var wordId = this.currentQueue[this.currentIndex];
        var word = this.currentWords.find(function (w) { return w.id === wordId; });
        if (!word) return;
        var card = SpacedRepetition.getCard(wordId);
        var isNew = !card;
        var imgUrl = Grade7Data.getImageUrl ? Grade7Data.getImageUrl(word) : null;

        var effectiveWordMode;
        if (this.studyMode === 'mixed' || this.studyMode === 'visual') {
            effectiveWordMode = this.decideDirection(wordId);
        } else {
            effectiveWordMode = this.wordMode;
        }
        this.lastDirection = effectiveWordMode;

        if (this.learningMode !== 'all') {
            this.sessionSeenWords[wordId] = (this.sessionSeenWords[wordId] || 0) + 1;
            if (this.sessionSeenWords[wordId] > 2) {
                this.sessionStats.repeated++;
            }
        }

        var learningArea = document.getElementById('learningArea');

        if (this.studyMode === 'spelling') {
            learningArea.innerHTML = this.renderSpellingMode(word, isNew, imgUrl);
        } else if (this.studyMode === 'dictation') {
            learningArea.innerHTML = this.renderDictationMode(word, isNew);
        } else if (this.studyMode === 'listening') {
            learningArea.innerHTML = this.renderListeningMode(word, isNew);
        } else if (this.studyMode === 'speaking') {
            learningArea.innerHTML = this.renderSpeakingMode(word, isNew, imgUrl);
        } else if (this.studyMode === 'sentence') {
            learningArea.innerHTML = this.renderSentenceMode(word, isNew);
        } else if (this.studyMode === 'translate') {
            learningArea.innerHTML = this.renderTranslateMode(word, isNew);
        } else if (this.studyMode === 'five-dim') {
            learningArea.innerHTML = this.renderFiveDimMode(word, isNew);
        } else {
            learningArea.innerHTML = this.renderVisualMode(word, isNew, imgUrl, effectiveWordMode);
        }

        this.bindLearningEvents();
    },

    renderVisualMode: function (word, isNew, imgUrl, effectiveWordMode) {
        var isEncn = effectiveWordMode === 'encn';
        var card = SpacedRepetition.getCard(word.id);
        var wordId = word.id;
        var encnPercent = 0, cnenPercent = 0, stageLabel = '🆕 新词';
        if (card && card.encnTrack) {
            encnPercent = Math.min(100, (card.encnTrack.repetitions || 0) * 20);
            cnenPercent = Math.min(100, (card.cnenTrack ? card.cnenTrack.repetitions : 0) * 20);
            var stages = { new: '🆕 新词', learning: '📖 学习中', mastering: '⭐ 巩固中', fluent: '🏆 已精通' };
            var wordStage = typeof SpacedRepetition !== 'undefined' ? SpacedRepetition.getWordStage(wordId) : 'new';
            stageLabel = stages[wordStage] || '🆕 新词';
        }
        return '<div class="learning-session card p-4">' +
            '<div class="session-info flex-between mb-3">' +
            '<span class="text-muted">进度：' + (this.currentIndex + 1) + ' / ' + this.currentQueue.length + '</span>' +
            '<div class="word-mode-toggle" style="display:flex;gap:4px;align-items:center;">' +
            '<button class="btn ' + (isEncn ? 'btn-primary' : 'btn-outline-primary btn-sm') + '" id="modeEncn" style="font-size:0.8rem;padding:0.25rem 0.75rem;' + (!isEncn ? 'opacity:0.7;' : '') + '">📘 EN→中' + (isEncn ? ' <small style="font-size:0.65rem;opacity:0.7;">识别</small>' : '') + '</button>' +
            '<button class="btn ' + (!isEncn ? 'btn-success' : 'btn-outline-success btn-sm') + '" id="modeCnen" style="font-size:0.8rem;padding:0.25rem 0.75rem;' + (isEncn ? 'opacity:0.7;' : '') + '">📗 中→EN' + (!isEncn ? ' <small style="font-size:0.65rem;opacity:0.7;">回忆</small>' : '') + '</button>' +
            '</div>' +
            '<span class="badge ' + (isNew ? 'bg-success' : 'bg-info') + '">' + (isNew ? '新学' : '复习') + '</span>' +
            '</div>' +
            '<div class="dual-track-progress" id="dualTrackProgress" style="margin-top:0.35rem;display:flex;align-items:center;gap:0.5rem;font-size:0.72rem;padding:0 0.5rem;">' +
            '<span style="color:#93c5fd;">■</span>' +
            '<div style="flex:1;height:4px;background:#e5e7eb;border-radius:2px;overflow:hidden;display:flex;">' +
            '<div style="width:' + encnPercent + '%;height:100%;background:linear-gradient(90deg,#3b82f6,#60a5fa);border-radius:2px;transition:width 0.3s;"></div>' +
            '</div>' +
            '<span style="color:#86efac;">■</span>' +
            '<div style="flex:1;height:4px;background:#e5e7eb;border-radius:2px;overflow:hidden;display:flex;">' +
            '<div style="width:' + cnenPercent + '%;height:100%;background:linear-gradient(90deg,#22c55e,#4ade80);border-radius:2px;transition:width 0.3s;"></div>' +
            '</div>' +
            '<span style="color:#888;font-size:0.68rem;" id="stageLabel">' + stageLabel + '</span>' +
            '</div>' +
            '<div class="word-card mb-4" id="wordCard">' +
            '<div class="word-card-inner">' +
            '<div class="word-card-front flex flex-column justify-center align-items-center text-center">' +
            (imgUrl ? '<img src="' + imgUrl + '" alt="" style="width:120px;height:120px;border-radius:12px;margin-bottom:1rem;object-fit:cover;" onerror="this.style.display=\'none\';">' : '') +
            (isEncn ?
                '<div style="font-size:3rem;font-weight:700;margin-bottom:0.5rem;">' + word.w + '</div>' +
                '<div style="font-size:1.25rem;opacity:0.9;margin-bottom:1rem;">' + word.p + '</div>' +
                '<div style="font-size:1rem;opacity:0.7;margin-bottom:1rem;">' + word.pos + '</div>' +
                '<button class="btn btn-light" id="flipBtn" style="padding:0.75rem 2rem;border-radius:50px;font-weight:600;">翻转查看中文释义</button>' :
                '<div style="font-size:2.5rem;font-weight:700;margin-bottom:1rem;color:#fef3c7;text-shadow:0 2px 4px rgba(0,0,0,0.3);">' + word.m + '</div>' +
                '<div style="font-size:1rem;opacity:0.7;margin-bottom:1rem;">' + word.pos + '</div>' +
                '<button class="btn btn-light" id="flipBtn" style="padding:0.75rem 2rem;border-radius:50px;font-weight:600;">翻转查看英文单词</button>'
            ) +
            '</div>' +
            '<div class="word-card-back flex flex-column justify-center">' +
            (isEncn ?
                '<div style="font-size:2rem;font-weight:700;margin-bottom:0.5rem;">' + word.w + '</div>' +
                '<div style="font-size:1.25rem;margin-bottom:0.5rem;">' + word.pos + ' | ' + word.m + '</div>' :
                '<div style="font-size:3rem;font-weight:700;margin-bottom:0.5rem;">' + word.w + '</div>' +
                '<div style="font-size:1.5rem;margin-bottom:0.5rem;opacity:0.9;">' + word.p + '</div>' +
                '<div style="font-size:1.15rem;margin-bottom:0.5rem;opacity:0.8;">' + word.pos + ' | ' + word.m + '</div>'
            ) +
            '<div style="margin-top:1rem;"><div style="font-weight:600;margin-bottom:0.5rem;">例句：</div><ul style="margin:0;padding-left:1.25rem;">' +
            (word.ex || []).map(function (ex) { return '<li style="margin-bottom:0.25rem;">' + ex + '</li>'; }).join('') +
            '</ul></div>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '<div class="quality-section">' +
            '<div style="text-align:center;margin-bottom:1rem;"><strong>你对这个单词的记忆程度？</strong></div>' +
            '<div class="quality-buttons">' +
            '<button class="quality-btn" data-quality="0" title="完全不认识">0<br><small>陌生</small></button>' +
            '<button class="quality-btn" data-quality="1" title="有点印象">1<br><small>模糊</small></button>' +
            '<button class="quality-btn" data-quality="2" title="有些困难">2<br><small>困难</small></button>' +
            '<button class="quality-btn" data-quality="3" title="差不多记住了">3<br><small>一般</small></button>' +
            '<button class="quality-btn" data-quality="4" title="记得很清楚">4<br><small>良好</small></button>' +
            '<button class="quality-btn" data-quality="5" title="完全掌握">5<br><small>完美</small></button>' +
            '</div>' +
            '</div>' +
            '</div>';
    },

    renderSpellingMode: function (word, isNew, imgUrl) {
        var card = SpacedRepetition.getCard(word.id);
        return '<div class="learning-session card p-4">' +
            '<div class="session-info flex-between mb-3">' +
            '<span class="text-muted">✍️ 默写模式 | 进度：' + (this.currentIndex + 1) + ' / ' + this.currentQueue.length + '</span>' +
            '<span class="badge ' + (isNew ? 'bg-success' : 'bg-info') + '">' + (isNew ? '新学' : '复习') + '</span>' +
            '</div>' +
            '<div class="text-center p-4">' +
            (imgUrl ? '<img src="' + imgUrl + '" alt="" style="width:120px;height:120px;border-radius:12px;margin-bottom:1.5rem;object-fit:cover;" onerror="this.style.display=\'none\';">' : '') +
            '<div style="font-size:2.5rem;font-weight:700;color:#3b82f6;margin-bottom:0.5rem;">' + word.m + '</div>' +
            '<div class="text-muted mb-4">请在下方输入英文单词</div>' +
            '<input type="text" id="spellingInput" class="form-control text-center" style="font-size:1.5rem;max-width:300px;margin:0 auto 1rem;" placeholder="输入英文..." autocomplete="off" spellcheck="false">' +
            '<div id="spellingFeedback" class="mb-3"></div>' +
            '<button class="btn btn-primary btn-lg" id="spellingSubmit">提交答案</button>' +
            '<div id="spellingAnswer" class="mt-3" style="display:none;">' +
            '<div style="font-size:1.5rem;font-weight:700;color:#10b981;margin-bottom:0.5rem;">正确答案：' + word.w + '</div>' +
            '<div class="text-muted">' + word.p + ' | ' + word.pos + '</div>' +
            '<ul class="mt-2" style="text-align:left;max-width:400px;margin:0.5rem auto;">' +
            (word.ex || []).map(function (ex) { return '<li>' + ex + '</li>'; }).join('') +
            '</ul>' +
            '</div>' +
            '</div>' +
            '</div>';
    },

    renderDictationMode: function (word, isNew) {
        var self = this;
        setTimeout(function () {
            ttsSpeak(word.w, self.speechSpeed);
        }, 300);

        return '<div class="learning-session card p-4">' +
            '<div class="session-info flex-between mb-3">' +
            '<span class="text-muted">🔊 听写模式 | 进度：' + (this.currentIndex + 1) + ' / ' + this.currentQueue.length + '</span>' +
            '<span class="badge ' + (isNew ? 'bg-success' : 'bg-info') + '">' + (isNew ? '新学' : '复习') + '</span>' +
            '</div>' +
            '<div class="text-center p-4">' +
            '<div style="font-size:4rem;margin-bottom:1rem;">🔊</div>' +
            '<div class="text-muted mb-3">请仔细听并默写单词</div>' +
            '<button class="btn btn-outline-primary btn-lg mb-4" id="replayBtn" style="padding:0.75rem 2rem;">🔄 重播一次</button>' +
            '<input type="text" id="dictationInput" class="form-control text-center" style="font-size:1.5rem;max-width:300px;margin:0 auto 1rem;" placeholder="输入英文..." autocomplete="off" spellcheck="false">' +
            '<div id="dictationFeedback" class="mb-3"></div>' +
            '<button class="btn btn-primary btn-lg" id="dictationSubmit">提交答案</button>' +
            '<div id="dictationAnswer" class="mt-3" style="display:none;">' +
            '<div style="font-size:1.5rem;font-weight:700;color:#10b981;margin-bottom:0.5rem;">正确答案：' + word.w + '</div>' +
            '<div class="text-muted">' + word.p + ' | ' + word.pos + ' | ' + word.m + '</div>' +
            '<ul class="mt-2" style="text-align:left;max-width:400px;margin:0.5rem auto;">' +
            (word.ex || []).map(function (ex) { return '<li>' + ex + '</li>'; }).join('') +
            '</ul>' +
            '</div>' +
            '</div>' +
            '</div>';
    },

    renderListeningMode: function (word, isNew) {
        var self = this;
        var allWords = this.currentWords;
        var otherWords = allWords.filter(function (w) { return w.id !== word.id; });
        var shuffled = otherWords.sort(function () { return Math.random() - 0.5; });
        var options = [word].concat(shuffled.slice(0, 3)).sort(function () { return Math.random() - 0.5; });
        var optionImgs = options.map(function (w) {
            return Grade7Data.getImageUrl ? Grade7Data.getImageUrl(w) : null;
        });

        setTimeout(function () {
            ttsSpeak(word.w, self.speechSpeed);
        }, 300);

        var optionsHtml = options.map(function (opt, idx) {
            var imgTag = optionImgs[idx] ? '<img src="' + optionImgs[idx] + '" alt="" style="width:60px;height:60px;border-radius:8px;object-fit:cover;margin-bottom:0.25rem;" onerror="this.style.display=\'none\';">' : '<div style="width:60px;height:60px;background:#e5e7eb;border-radius:8px;margin-bottom:0.25rem;display:flex;align-items:center;justify-content:center;font-size:2rem;">?</div>';
            return '<button class="listening-option p-3" data-answer="' + opt.id + '" style="background:#f8fafc;border:2px solid #e5e7eb;border-radius:12px;cursor:pointer;transition:all 0.2s;min-width:140px;">' +
                imgTag +
                '<div style="font-size:0.85rem;font-weight:600;">' + opt.m + '</div>' +
                '</button>';
        }).join('');

        return '<div class="learning-session card p-4">' +
            '<div class="session-info flex-between mb-3">' +
            '<span class="text-muted">🎧 听力测试 | 进度：' + (this.currentIndex + 1) + ' / ' + this.currentQueue.length + '</span>' +
            '<span class="badge ' + (isNew ? 'bg-success' : 'bg-info') + '">' + (isNew ? '新学' : '复习') + '</span>' +
            '</div>' +
            '<div class="text-center p-4">' +
            '<div style="font-size:4rem;margin-bottom:1rem;">🎧</div>' +
            '<div class="text-muted mb-3">听音选义（点击播放后再选择）</div>' +
            '<button class="btn btn-primary btn-lg mb-4" id="replayListenBtn" style="padding:0.75rem 2rem;">🔄 重播</button>' +
            '<div id="listeningOptions" class="grid grid-2 gap-3" style="max-width:500px;margin:0 auto;">' + optionsHtml + '</div>' +
            '<div id="listeningFeedback" class="mt-3"></div>' +
            '</div>' +
            '</div>';
    },

    checkSpelling: function (typed, correct) {
        var t = typed.toLowerCase().replace(/\s+/g, '');
        var c = correct.toLowerCase().replace(/\s+/g, '');
        return t === c;
    },

    submitSpelling: function () {
        this.modesUsed.spelling = true;
        var wordId = this.currentQueue[this.currentIndex];
        var word = this.currentWords.find(function (w) { return w.id === wordId; });
        var input = document.getElementById('spellingInput');
        var feedback = document.getElementById('spellingFeedback');
        var answerDiv = document.getElementById('spellingAnswer');
        var submitBtn = document.getElementById('spellingSubmit');

        if (!input || !feedback) return;

        var typed = input.value.trim();
        var correct = this.checkSpelling(typed, word.w);

        SpacedRepetition.rateSpelling(wordId, correct, typed, word.w);
        SpacedRepetition.recordDailyStat(false, correct);
        this.recordAnswer(correct, 'cnen');

        if (correct) {
            feedback.innerHTML = '<span style="color:#10b981;font-size:1.5rem;font-weight:700;">✓ 正确！</span>';
            AudioSystem.playCorrect();
            submitBtn.disabled = true;
            input.disabled = true;
        } else {
            var correctLower = word.w.toLowerCase();
            var typedLower = typed.toLowerCase();
            var highlighted = '';
            for (var i = 0; i < correctLower.length; i++) {
                if (i < typedLower.length && typedLower[i] === correctLower[i]) {
                    highlighted += '<span style="color:#10b981;">' + word.w[i] + '</span>';
                } else {
                    highlighted += '<span style="color:#ef4444;background:#fee2e2;border-radius:2px;">' + (word.w[i] || '') + '</span>';
                }
            }
            feedback.innerHTML = '<span style="color:#ef4444;font-size:1.2rem;">✗ 错误！正确拼写：' + highlighted + '</span>';
            AudioSystem.playWrong();
            submitBtn.disabled = true;
            input.disabled = true;
        }

        answerDiv.style.display = 'block';

        var self = this;
        setTimeout(function () {
            self.currentIndex++;
            if (self.currentIndex >= self.currentQueue.length) {
                self.finishSession();
            } else {
                self.showCurrentWord();
            }
        }, 3000);
    },

    submitDictation: function () {
        this.modesUsed.dictation = true;
        var wordId = this.currentQueue[this.currentIndex];
        var word = this.currentWords.find(function (w) { return w.id === wordId; });
        var input = document.getElementById('dictationInput');
        var feedback = document.getElementById('dictationFeedback');
        var answerDiv = document.getElementById('dictationAnswer');
        var submitBtn = document.getElementById('dictationSubmit');

        if (!input || !feedback) return;

        var typed = input.value.trim();
        var correct = this.checkSpelling(typed, word.w);

        SpacedRepetition.rateSpelling(wordId, correct, typed, word.w);
        SpacedRepetition.recordDailyStat(false, correct);
        this.recordAnswer(correct, 'cnen');

        if (correct) {
            feedback.innerHTML = '<span style="color:#10b981;font-size:1.5rem;font-weight:700;">✓ 正确！</span>';
            AudioSystem.playCorrect();
        } else {
            feedback.innerHTML = '<span style="color:#ef4444;font-size:1.2rem;">✗ 错误！正确答案：' + word.w + '</span>';
            AudioSystem.playWrong();
        }

        submitBtn.disabled = true;
        input.disabled = true;
        answerDiv.style.display = 'block';

        var self = this;
        setTimeout(function () {
            self.currentIndex++;
            if (self.currentIndex >= self.currentQueue.length) {
                self.finishSession();
            } else {
                self.showCurrentWord();
            }
        }, 3000);
    },

    handleListeningSelect: function (selectedId, correctId) {
        var self = this;
        var wordId = this.currentQueue[this.currentIndex];
        var correct = parseInt(selectedId) === correctId;

        SpacedRepetition.rateListening(wordId, correct);
        SpacedRepetition.recordDailyStat(false, correct);
        this.recordAnswer(correct, 'encn');

        var options = document.querySelectorAll('.listening-option');
        options.forEach(function (btn) {
            btn.disabled = true;
            if (parseInt(btn.dataset.answer) === correctId) {
                btn.style.background = '#d1fae5';
                btn.style.borderColor = '#10b981';
            } else if (parseInt(btn.dataset.answer) === parseInt(selectedId) && !correct) {
                btn.style.background = '#fee2e2';
                btn.style.borderColor = '#ef4444';
            }
        });

        var feedback = document.getElementById('listeningFeedback');
        if (feedback) {
            feedback.innerHTML = correct ?
                '<span style="color:#10b981;font-size:1.5rem;font-weight:700;">✓ 正确！</span>' :
                '<span style="color:#ef4444;font-size:1.2rem;">✗ 错误！正确答案是：' + this.currentWords.find(function (w) { return w.id === correctId }).m + '</span>';
        }

        if (correct) {
            AudioSystem.playCorrect();
        } else {
            AudioSystem.playWrong();
        }

        setTimeout(function () {
            self.currentIndex++;
            if (self.currentIndex >= self.currentQueue.length) {
                self.finishSession();
            } else {
                self.showCurrentWord();
            }
        }, 2000);
    },

    renderSpeakingMode: function (word, isNew, imgUrl) {
        return '<div class="learning-session card p-4">' +
            '<div class="session-info flex-between mb-3">' +
            '<span class="text-muted">🎤 口语练习 | 进度：' + (this.currentIndex + 1) + ' / ' + this.currentQueue.length + '</span>' +
            '<span class="badge ' + (isNew ? 'bg-success' : 'bg-info') + '">' + (isNew ? '新学' : '复习') + '</span>' +
            '</div>' +
            '<div class="text-center p-4">' +
            (imgUrl ? '<img src="' + imgUrl + '" alt="" style="width:120px;height:120px;border-radius:12px;margin-bottom:1rem;object-fit:cover;" onerror="this.style.display=\'none\';">' : '') +
            '<div style="font-size:2.5rem;font-weight:700;color:#8b5cf6;margin-bottom:0.5rem;">' + word.w + '</div>' +
            '<div style="font-size:1.25rem;color:#666;margin-bottom:0.25rem;">' + word.p + '</div>' +
            '<div style="font-size:1.15rem;color:#333;margin-bottom:1rem;">' + word.m + '</div>' +
            '<div style="background:#f3e8ff;border-radius:12px;padding:1rem;margin-bottom:1rem;">' +
            '<div style="font-weight:600;color:#7c3aed;margin-bottom:0.5rem;">📝 参考例句：</div>' +
            (word.ex || []).map(function (ex) { return '<div style="color:#555;padding:0.3rem 0;">' + ex + '</div>'; }).join('') +
            '</div>' +
            '<button class="btn btn-primary btn-lg mb-3" id="speakPlayBtn" style="padding:0.75rem 2rem;">🔊 播放正确发音</button>' +
            '<div id="speakingFeedback" class="mb-3"></div>' +
            '<div style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;">' +
            '<button class="btn speaking-rate-btn" data-rate="1" style="padding:0.5rem 1.5rem;background:#ef4444;color:white;border:none;border-radius:8px;cursor:pointer;font-size:0.9rem;">😵 不认识</button>' +
            '<button class="btn speaking-rate-btn" data-rate="2" style="padding:0.5rem 1.5rem;background:#f97316;color:white;border:none;border-radius:8px;cursor:pointer;font-size:0.9rem;">😅 发音不准</button>' +
            '<button class="btn speaking-rate-btn" data-rate="3" style="padding:0.5rem 1.5rem;background:#f59e0b;color:white;border:none;border-radius:8px;cursor:pointer;font-size:0.9rem;">😊 一般</button>' +
            '<button class="btn speaking-rate-btn" data-rate="4" style="padding:0.5rem 1.5rem;background:#22c55e;color:white;border:none;border-radius:8px;cursor:pointer;font-size:0.9rem;">😊 发音准确</button>' +
            '<button class="btn speaking-rate-btn" data-rate="5" style="padding:0.5rem 1.5rem;background:#10b981;color:white;border:none;border-radius:8px;cursor:pointer;font-size:0.9rem;">🎯 完美</button>' +
            '</div>' +
            '</div>' +
            '</div>';
    },

    renderSentenceMode: function (word, isNew) {
        return '<div class="learning-session card p-4">' +
            '<div class="session-info flex-between mb-3">' +
            '<span class="text-muted">✏️ 造句练习 | 进度：' + (this.currentIndex + 1) + ' / ' + this.currentQueue.length + '</span>' +
            '<span class="badge ' + (isNew ? 'bg-success' : 'bg-info') + '">' + (isNew ? '新学' : '复习') + '</span>' +
            '</div>' +
            '<div class="text-center p-4">' +
            '<div style="font-size:2rem;font-weight:700;color:#059669;margin-bottom:0.5rem;">' + word.w + '</div>' +
            '<div style="font-size:1.15rem;color:#666;margin-bottom:1.5rem;">' + word.m + ' | ' + word.pos + '</div>' +
            '<div style="background:#ecfdf5;border-left:4px solid #10b981;padding:1rem;margin-bottom:1.5rem;text-align:left;">' +
            '<div style="font-weight:600;color:#047857;margin-bottom:0.5rem;">💡 提示：请用 <strong style="color:#059669;">' + word.w + '</strong> 造一个句子</div>' +
            '</div>' +
            '<input type="text" id="sentenceInput" class="form-control text-center" style="font-size:1.2rem;max-width:500px;margin:0 auto 1rem;" placeholder="在这里输入你的句子..." autocomplete="off">' +
            '<div id="sentenceFeedback" class="mb-3"></div>' +
            '<button class="btn btn-primary btn-lg" id="sentenceSubmit">提交句子</button>' +
            '<div id="sentenceAnswer" class="mt-3" style="display:none;text-align:left;max-width:500px;margin:0.5rem auto;">' +
            '<div style="font-weight:600;color:#047857;margin-bottom:0.5rem;">✅ 参考例句：</div>' +
            (word.ex || []).map(function (ex) { return '<div style="background:#f0fdf4;padding:0.5rem;border-radius:6px;margin-top:0.3rem;">' + ex + '</div>'; }).join('') +
            '</div>' +
            '</div>' +
            '</div>';
    },

    renderTranslateMode: function (word, isNew) {
        var sentences = word.ex || ['No examples'];
        return '<div class="learning-session card p-4">' +
            '<div class="session-info flex-between mb-3">' +
            '<span class="text-muted">🌐 翻译挑战 | 进度：' + (this.currentIndex + 1) + ' / ' + this.currentQueue.length + '</span>' +
            '<span class="badge ' + (isNew ? 'bg-success' : 'bg-info') + '">' + (isNew ? '新学' : '复习') + '</span>' +
            '</div>' +
            '<div class="text-center p-4">' +
            '<div style="font-size:4rem;margin-bottom:1rem;">🌐</div>' +
            '<div style="background:#fef3c7;border-radius:12px;padding:1.5rem;margin-bottom:1.5rem;">' +
            '<div style="font-size:1.3rem;font-weight:600;color:#92400e;margin-bottom:0.5rem;">请将以下中文翻译成英文：</div>' +
            '<div style="font-size:1.5rem;color:#b45309;">' + word.m + '</div>' +
            '<div style="font-size:0.85rem;color:#d97706;margin-top:0.5rem;">提示：使用单词 <strong>' + word.w + '</strong></div>' +
            '</div>' +
            '<input type="text" id="translateInput" class="form-control text-center" style="font-size:1.2rem;max-width:400px;margin:0 auto 1rem;" placeholder="输入英文翻译..." autocomplete="off" spellcheck="false">' +
            '<div id="translateFeedback" class="mb-3"></div>' +
            '<button class="btn btn-primary btn-lg" id="translateSubmit">提交翻译</button>' +
            '<div id="translateAnswer" class="mt-3" style="display:none;">' +
            '<div style="font-size:1.2rem;"><strong>参考答案：</strong></div>' +
            '<div style="font-size:1.3rem;color:#059669;margin:0.5rem 0;">' + word.w + ' — ' + word.p + '</div>' +
            '<div style="margin-top:0.5rem;"><strong>例句：</strong></div>' +
            sentences.map(function (s) { return '<div style="color:#666;padding:0.25rem 0;">' + s + '</div>'; }).join('') +
            '</div>' +
            '</div>' +
            '</div>';
    },

    renderFiveDimMode: function (word, isNew) {
        if (!this.fiveDimState) {
            this.fiveDimState = {
                stage: 'heard',
                stages: ['heard', 'seen', 'spelled', 'used', 'produced'],
                attempts: 0
            };
        }

        var stageIndex = this.fiveDimState.stages.indexOf(this.fiveDimState.stage);
        var stageNames = { heard: '👂 听音辨义', seen: '👁️ 见词知义', spelled: '✍️ 看义拼词', used: '📝 语境填空', produced: '🗣️ 主动造句' };
        var stageDescs = {
            heard: '播放发音，选择对应的中文意思',
            seen: '看到英文单词，选择对应的中文意思',
            spelled: '看到中文意思，拼写出英文单词',
            used: '在句子中填入合适的单词形式',
            produced: '用这个单词造一个简单的英文句子'
        };

        var progress = Math.round((stageIndex / 4) * 100);
        var dimIcons = ['👂', '👁️', '✍️', '📝', '🗣️'];

        var dimBar = '';
        for (var i = 0; i < 5; i++) {
            var dimDone = i < stageIndex;
            dimBar += '<span style="font-size:1.5rem;opacity:' + (dimDone ? '1' : '0.3') + ';' + (i === stageIndex ? 'transform:scale(1.3);' : '') + '">' + dimIcons[i] + '</span>';
            if (i < 4) dimBar += '<span style="color:#ccc;">→</span>';
        }

        var stage = this.fiveDimState.stage;

        if (stage === 'heard') {
            return this.renderFiveDimHeard(word, isNew, dimBar, stageNames, progress);
        } else if (stage === 'seen') {
            return this.renderFiveDimSeen(word, isNew, dimBar, stageNames, progress);
        } else if (stage === 'spelled') {
            return this.renderFiveDimSpelled(word, isNew, dimBar, stageNames, progress);
        } else if (stage === 'used') {
            return this.renderFiveDimUsed(word, isNew, dimBar, stageNames, progress);
        } else {
            return this.renderFiveDimProduced(word, isNew, dimBar, stageNames, progress);
        }
    },

    renderFiveDimHeard: function (word, isNew, dimBar, stageNames, progress) {
        var allWords = typeof Grade7Data !== 'undefined' ? Grade7Data.getAllWords() : [];
        var options = [word];
        var seen = {};
        for (var k = options.length; k < 4; k++) {
            var ri = Math.floor(Math.random() * allWords.length);
            if (!seen[allWords[ri].id] && allWords[ri].id !== word.id) {
                options.push(allWords[ri]);
                seen[allWords[ri].id] = true;
            }
        }
        for (var i = options.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = options[i]; options[i] = options[j]; options[j] = t; }

        var optHtml = options.map(function (opt, idx) {
            return '<button class="five-dim-opt btn btn-outline mb-2 w-100 text-left p-3" data-correct="' + (opt.id === word.id ? '1' : '0') + '" data-kg="' + (word.kgPoint || 'vocab') + '">' +
                String.fromCharCode(65 + idx) + '. ' + (opt.m || '') + '</button>';
        }).join('');

        return '<div class="learning-session card p-4" style="max-width:600px;margin:0 auto;text-align:center;">' +
            this.getSessionHeader(isNew) +
            '<div class="dim-progress mb-3">' + dimBar + '</div>' +
            '<div class="dim-stage mb-3"><span class="badge bg-purple">' + stageNames.heard + '</span> ' + (progress) + '%</div>' +
            '<div class="mb-3">' +
            '<button class="btn btn-primary btn-lg mb-3 five-dim-play" data-word="' + word.w + '">🔊 播放发音</button><br>' +
            '<span class="text-muted">请选择对应的中文意思</span></div>' +
            '<div>' + optHtml + '</div>' +
            '</div>';
    },

    renderFiveDimSeen: function (word, isNew, dimBar, stageNames, progress) {
        var allWords = typeof Grade7Data !== 'undefined' ? Grade7Data.getAllWords() : [];
        var options = [word];
        var seen = {};
        for (var k = options.length; k < 4; k++) {
            var ri = Math.floor(Math.random() * allWords.length);
            if (!seen[allWords[ri].id] && allWords[ri].id !== word.id) {
                options.push(allWords[ri]);
                seen[allWords[ri].id] = true;
            }
        }
        for (var i = options.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = options[i]; options[i] = options[j]; options[j] = t; }

        var optHtml = options.map(function (opt, idx) {
            return '<button class="five-dim-opt btn btn-outline mb-2 w-100 text-left p-3" data-correct="' + (opt.id === word.id ? '1' : '0') + '" data-kg="' + (word.kgPoint || 'vocab') + '">' +
                String.fromCharCode(65 + idx) + '. ' + (opt.m || '') + '</button>';
        }).join('');

        return '<div class="learning-session card p-4" style="max-width:600px;margin:0 auto;text-align:center;">' +
            this.getSessionHeader(isNew) +
            '<div class="dim-progress mb-3">' + dimBar + '</div>' +
            '<div class="dim-stage mb-3"><span class="badge bg-blue">' + stageNames.seen + '</span> ' + (progress) + '%</div>' +
            '<div style="font-size:2rem;font-weight:700;margin-bottom:1rem;">' + word.w + '</div>' +
            '<span class="text-muted mb-2 d-block">请选择正确的中文意思</span>' +
            '<div>' + optHtml + '</div>' +
            '</div>';
    },

    renderFiveDimSpelled: function (word, isNew, dimBar, stageNames, progress) {
        return '<div class="learning-session card p-4" style="max-width:600px;margin:0 auto;text-align:center;">' +
            this.getSessionHeader(isNew) +
            '<div class="dim-progress mb-3">' + dimBar + '</div>' +
            '<div class="dim-stage mb-3"><span class="badge bg-green">' + stageNames.spelled + '</span> ' + (progress) + '%</div>' +
            '<div style="font-size:1.5rem;font-weight:700;margin-bottom:0.5rem;">' + (word.m || '') + '</div>' +
            '<span class="text-muted mb-2 d-block">请拼写对应的英文单词</span>' +
            '<input type="text" id="fiveDimInput" class="form-control text-center" style="font-size:1.3rem;max-width:300px;margin:0 auto 1rem;" placeholder="输入英文..." autocomplete="off">' +
            '<button class="btn btn-primary btn-lg five-dim-submit" data-word="' + word.w + '" data-kg="' + (word.kgPoint || 'vocab') + '">✓ 提交</button>' +
            '<div id="fiveDimFeedback" class="mt-3"></div>' +
            '</div>';
    },

    renderFiveDimUsed: function (word, isNew, dimBar, stageNames, progress) {
        var sentences = word.ex || [];
        var fillSentence = sentences.length > 0
            ? sentences[0].replace(new RegExp(word.w, 'i'), '<span style="border-bottom:2px dashed #f59e0b;padding:0 4px;">______</span>')
            : 'Please ______ (使用单词的正确形式)';
        return '<div class="learning-session card p-4" style="max-width:600px;margin:0 auto;text-align:center;">' +
            this.getSessionHeader(isNew) +
            '<div class="dim-progress mb-3">' + dimBar + '</div>' +
            '<div class="dim-stage mb-3"><span class="badge bg-orange">' + stageNames.used + '</span> ' + (progress) + '%</div>' +
            '<div class="mb-3 p-3" style="background:#fef3c7;border-radius:8px;font-size:1.2rem;">' + fillSentence + '</div>' +
            '<span class="text-muted mb-2 d-block">请在横线上填入正确的单词形式</span>' +
            '<input type="text" id="fiveDimInput" class="form-control text-center" style="font-size:1.3rem;max-width:300px;margin:0 auto 1rem;" placeholder="输入单词..." autocomplete="off">' +
            '<button class="btn btn-primary btn-lg five-dim-submit" data-word="' + word.w + '" data-kg="' + (word.kgPoint || 'vocab') + '">✓ 提交</button>' +
            '<div id="fiveDimFeedback" class="mt-3"></div>' +
            '</div>';
    },

    renderFiveDimProduced: function (word, isNew, dimBar, stageNames, progress) {
        return '<div class="learning-session card p-4" style="max-width:600px;margin:0 auto;text-align:center;">' +
            this.getSessionHeader(isNew) +
            '<div class="dim-progress mb-3">' + dimBar + '</div>' +
            '<div class="dim-stage mb-3"><span class="badge bg-red">' + stageNames.produced + '</span> ' + (progress) + '%</div>' +
            '<div style="font-size:1.5rem;font-weight:700;margin-bottom:0.5rem;">🎯 ' + word.w + '</div>' +
            '<div class="text-muted mb-3">用 <strong>' + word.w + '</strong> 造一个简单的英文句子</div>' +
            '<textarea id="fiveDimInput" class="form-control" style="font-size:1.1rem;max-width:450px;margin:0 auto 1rem;min-height:80px;" placeholder="例如：I am very ' + word.w + ' about..."></textarea>' +
            '<button class="btn btn-primary btn-lg five-dim-submit" data-word="' + word.w + '" data-kg="' + (word.kgPoint || 'vocab') + '">✓ 提交</button>' +
            '<div id="fiveDimFeedback" class="mt-3"></div>' +
            '<div id="fiveDimModel" class="mt-2 text-muted" style="display:none;">参考例句：' + (word.ex ? word.ex.slice(0, 2).join('；') : 'Creating a sentence is a great way to remember.') + '</div>' +
            '</div>';
    },

    getSessionHeader: function (isNew) {
        return '<div class="session-info flex-between mb-3">' +
            '<span class="text-muted">🎯 五维掌握 | ' + (this.currentIndex + 1) + ' / ' + this.currentQueue.length + '</span>' +
            '<span class="badge ' + (isNew ? 'bg-success' : 'bg-info') + '">' + (isNew ? '新学' : '复习') + '</span>' +
            '</div>';
    },

    handleFiveDimAnswer: function (isCorrect, kgPoint, word) {
        if (isCorrect) {
            var stages = ['heard', 'seen', 'spelled', 'used', 'produced'];
            var currentIdx = stages.indexOf(this.fiveDimState.stage);
            if (currentIdx < 4) {
                this.fiveDimState.stage = stages[currentIdx + 1];
            }
        } else {
            if (this.fiveDimState.attempts >= 1) {
                var stages = ['heard', 'seen', 'spelled', 'used', 'produced'];
                var currentIdx = stages.indexOf(this.fiveDimState.stage);
                if (currentIdx > 0) {
                    this.fiveDimState.stage = stages[currentIdx - 1];
                }
                this.fiveDimState.attempts = 0;
            } else {
                this.fiveDimState.attempts++;
            }
        }

        if (typeof AdaptiveEngine !== 'undefined') {
            AdaptiveEngine.recordInteraction(kgPoint, isCorrect, isCorrect ? 4 : 1, 0);
        }
    },

    submitSpeaking: function (rate) {
        var wordId = this.currentQueue[this.currentIndex];
        SpacedRepetition.rateListening(wordId, rate >= 3);
        SpacedRepetition.recordDailyStat(false, rate >= 3);
        this.modesUsed.speaking = true;
        this.recordAnswer(rate >= 3, 'encn');

        var feedback = document.getElementById('speakingFeedback');
        if (feedback) {
            feedback.innerHTML = rate >= 4 ?
                '<span style="color:#10b981;font-size:1.3rem;font-weight:700;">👏 很好！继续保持！</span>' :
                '<span style="color:#f59e0b;font-size:1.1rem;">💪 多练习几次会更好！</span>';
        }

        if (rate >= 3) {
            AudioSystem.playCorrect();
        } else {
            AudioSystem.playWrong();
        }

        document.querySelectorAll('.speaking-rate-btn').forEach(function (b) { b.disabled = true; });

        var self = this;
        setTimeout(function () {
            self.currentIndex++;
            if (self.currentIndex >= self.currentQueue.length) { self.finishSession(); }
            else { self.showCurrentWord(); }
        }, 2000);
    },

    submitSentence: function () {
        var wordId = this.currentQueue[this.currentIndex];
        var word = this.currentWords.find(function (w) { return w.id === wordId; });
        var input = document.getElementById('sentenceInput');
        var feedback = document.getElementById('sentenceFeedback');
        var answerDiv = document.getElementById('sentenceAnswer');
        var submitBtn = document.getElementById('sentenceSubmit');
        if (!input || !feedback) return;

        var userSentence = input.value.trim();
        var hasKeyword = userSentence.toLowerCase().indexOf(word.w.toLowerCase()) >= 0;

        SpacedRepetition.recordDailyStat(false, hasKeyword && userSentence.length > 5);
        this.recordAnswer(hasKeyword && userSentence.length > 5, 'cnen');

        if (hasKeyword && userSentence.length > 5) {
            feedback.innerHTML = '<span style="color:#10b981;font-size:1.3rem;font-weight:700;">✓ 正确使用了 ' + word.w + '！</span>';
            AudioSystem.playCorrect();
        } else if (userSentence.length > 0) {
            feedback.innerHTML = '<span style="color:#f59e0b;font-size:1.1rem;">⚠ 句子需要包含 "' + word.w + '"</span>';
            AudioSystem.playWrong();
        }

        submitBtn.disabled = true;
        input.disabled = true;
        answerDiv.style.display = 'block';

        var self = this;
        setTimeout(function () {
            self.currentIndex++;
            if (self.currentIndex >= self.currentQueue.length) { self.finishSession(); }
            else { self.showCurrentWord(); }
        }, 3000);
    },

    submitTranslate: function () {
        var wordId = this.currentQueue[this.currentIndex];
        var word = this.currentWords.find(function (w) { return w.id === wordId; });
        var input = document.getElementById('translateInput');
        var feedback = document.getElementById('translateFeedback');
        var answerDiv = document.getElementById('translateAnswer');
        var submitBtn = document.getElementById('translateSubmit');
        if (!input || !feedback) return;

        var userAnswer = input.value.trim().toLowerCase();
        var correctAnswer = word.w.toLowerCase();
        var isCorrect = userAnswer.indexOf(correctAnswer) >= 0 || userAnswer === correctAnswer;

        SpacedRepetition.recordDailyStat(false, isCorrect);
        this.recordAnswer(isCorrect, 'cnen');

        if (isCorrect) {
            feedback.innerHTML = '<span style="color:#10b981;font-size:1.3rem;font-weight:700;">✓ 翻译正确！</span>';
            AudioSystem.playCorrect();
        } else {
            feedback.innerHTML = '<span style="color:#ef4444;font-size:1.1rem;">✗ 再想想，正确答案包含：' + word.w + '</span>';
            AudioSystem.playWrong();
        }

        submitBtn.disabled = true;
        input.disabled = true;
        answerDiv.style.display = 'block';

        var self = this;
        setTimeout(function () {
            self.currentIndex++;
            if (self.currentIndex >= self.currentQueue.length) { self.finishSession(); }
            else { self.showCurrentWord(); }
        }, 2500);
    },

    bindLearningEvents: function () {
        var self = this;

        var slider = document.getElementById('maxNewSlider');
        if (slider) {
            slider.addEventListener('input', function () {
                SmartWordsModule.dynamicConfig.maxNew = parseInt(this.value);
                var label = document.getElementById('maxNewLabel');
                if (label) label.textContent = this.value;
            });
        }

        var flipBtn = document.getElementById('flipBtn');
        if (flipBtn) flipBtn.addEventListener('click', function () {
            AudioSystem.playFlip();
            var card = document.getElementById('wordCard');
            if (card) card.classList.toggle('flipped');
        });

        var modeEncn = document.getElementById('modeEncn');
        var modeCnen = document.getElementById('modeCnen');
        if (modeEncn) modeEncn.addEventListener('click', function () { AudioSystem.playClick(); self.wordMode = 'encn'; self.showCurrentWord(); });
        if (modeCnen) modeCnen.addEventListener('click', function () { AudioSystem.playClick(); self.wordMode = 'cnen'; self.showCurrentWord(); });

        document.querySelectorAll('.quality-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                AudioSystem.playClick();
                self.submitQuality(parseInt(btn.dataset.quality));
            });
        });

        var spellingSubmit = document.getElementById('spellingSubmit');
        if (spellingSubmit) spellingSubmit.addEventListener('click', function () { AudioSystem.playClick(); self.submitSpelling(); });

        var spellingInput = document.getElementById('spellingInput');
        if (spellingInput) spellingInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { AudioSystem.playClick(); self.submitSpelling(); }
        });

        var replayBtn = document.getElementById('replayBtn');
        if (replayBtn) replayBtn.addEventListener('click', function () {
            AudioSystem.playClick();
            var wordId = self.currentQueue[self.currentIndex];
            var word = self.currentWords.find(function (w) { return w.id === wordId; });
            if (word) ttsSpeak(word.w, self.speechSpeed);
        });

        var dictationSubmit = document.getElementById('dictationSubmit');
        if (dictationSubmit) dictationSubmit.addEventListener('click', function () { AudioSystem.playClick(); self.submitDictation(); });

        var dictationInput = document.getElementById('dictationInput');
        if (dictationInput) dictationInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { AudioSystem.playClick(); self.submitDictation(); }
        });

        var replayListenBtn = document.getElementById('replayListenBtn');
        if (replayListenBtn) replayListenBtn.addEventListener('click', function () {
            AudioSystem.playClick();
            var wordId = self.currentQueue[self.currentIndex];
            var word = self.currentWords.find(function (w) { return w.id === wordId; });
            if (word) ttsSpeak(word.w, self.speechSpeed);
        });

        document.querySelectorAll('.listening-option').forEach(function (btn) {
            btn.addEventListener('click', function () {
                AudioSystem.playClick();
                var wordId = self.currentQueue[self.currentIndex];
                var word = self.currentWords.find(function (w) { return w.id === wordId; });
                if (word) self.handleListeningSelect(btn.dataset.answer, word.id);
            });
        });

        // 口语播放
        var speakPlayBtn = document.getElementById('speakPlayBtn');
        if (speakPlayBtn) speakPlayBtn.addEventListener('click', function () {
            AudioSystem.playClick();
            var wordId = self.currentQueue[self.currentIndex];
            var word = self.currentWords.find(function (w) { return w.id === wordId; });
            if (word) ttsSpeak(word.w, self.speechSpeed);
        });

        // 口语评分
        document.querySelectorAll('.speaking-rate-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                AudioSystem.playClick();
                self.submitSpeaking(parseInt(btn.dataset.rate));
            });
        });

        // 造句提交
        var sentenceSubmit = document.getElementById('sentenceSubmit');
        if (sentenceSubmit) sentenceSubmit.addEventListener('click', function () { AudioSystem.playClick(); self.submitSentence(); });
        var sentenceInput = document.getElementById('sentenceInput');
        if (sentenceInput) sentenceInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { AudioSystem.playClick(); self.submitSentence(); }
        });

        // 翻译提交
        var translateSubmit = document.getElementById('translateSubmit');
        if (translateSubmit) translateSubmit.addEventListener('click', function () { AudioSystem.playClick(); self.submitTranslate(); });
        var translateInput = document.getElementById('translateInput');
        if (translateInput) translateInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { AudioSystem.playClick(); self.submitTranslate(); }
        });

        // 五维掌握事件
        var fiveDimOpts = document.querySelectorAll('.five-dim-opt');
        fiveDimOpts.forEach(function (opt) {
            opt.addEventListener('click', function () {
                var isCorrect = this.dataset.correct === '1';
                var kg = this.dataset.kg || 'vocab';
                var wordId = self.currentQueue[self.currentIndex];
                var word = self.currentWords.find(function (w) { return w.id === wordId; });

                if (isCorrect) {
                    this.classList.add('btn-success');
                } else {
                    this.classList.add('btn-danger');
                    var correctBtn = document.querySelector('.five-dim-opt[data-correct="1"]');
                    if (correctBtn) correctBtn.classList.add('btn-success');
                }

                document.querySelectorAll('.five-dim-opt').forEach(function (b) { b.disabled = true; });
                self.handleFiveDimAnswer(isCorrect, kg, word);
                self.recordAnswer(isCorrect, 'encn');
                if (isCorrect) AudioSystem.playCorrect(); else AudioSystem.playWrong();

                setTimeout(function () { self.nextWord(); }, 1000);
            });
        });

        var fiveDimPlay = document.querySelector('.five-dim-play');
        if (fiveDimPlay) fiveDimPlay.addEventListener('click', function () {
            var word = this.dataset.word;
            if (word && window.speechSynthesis) {
                var utter = new SpeechSynthesisUtterance(word);
                utter.lang = 'en-US'; utter.rate = 0.8;
                speechSynthesis.speak(utter);
            }
        });

        var fiveDimSubmit = document.querySelector('.five-dim-submit');
        var fiveDimInput = document.getElementById('fiveDimInput');
        if (fiveDimSubmit && fiveDimInput) {
            fiveDimSubmit.addEventListener('click', function () {
                var correctWord = this.dataset.word.toLowerCase();
                var userWord = fiveDimInput.value.trim().toLowerCase();
                var kg = this.dataset.kg || 'vocab';
                var wordId = self.currentQueue[self.currentIndex];
                var word = self.currentWords.find(function (w) { return w.id === wordId; });
                var isCorrect = userWord === correctWord || (userWord.length > 0 && correctWord.indexOf(userWord) === 0 && userWord.length >= 3);

                var fb = document.getElementById('fiveDimFeedback');
                if (isCorrect) {
                    if (fb) fb.innerHTML = '<div style="color:#10b981;font-weight:700;">✅ 正确！</div>';
                } else {
                    if (fb) fb.innerHTML = '<div style="color:#ef4444;">❌ 正确答案：<strong>' + correctWord + '</strong></div>';
                    var model = document.getElementById('fiveDimModel');
                    if (model) model.style.display = 'block';
                }

                if (self.fiveDimState && self.fiveDimState.stage === 'produced' && userWord.length > 5) {
                    isCorrect = true;
                }

                self.handleFiveDimAnswer(isCorrect, kg, word);
                self.recordAnswer(isCorrect, 'encn');
                if (isCorrect) AudioSystem.playCorrect(); else AudioSystem.playWrong();

                if (fiveDimSubmit) fiveDimSubmit.disabled = true;
                if (fiveDimInput) fiveDimInput.disabled = true;
                setTimeout(function () { self.nextWord(); }, 1500);
            });

            fiveDimInput.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' && fiveDimSubmit && !fiveDimSubmit.disabled) {
                    fiveDimSubmit.click();
                }
            });
        }
    },

    recordAnswer: function (correct, direction) {
        if (this.recentAnswers.length >= 10) this.recentAnswers.shift();
        this.recentAnswers.push({ correct: correct, direction: direction, timestamp: Date.now() });

        this.sessionStats.totalAnswered++;
        this.sessionStats.correctCount += correct ? 1 : 0;
        if (direction === 'encn') {
            this.sessionStats.encnAnswers++;
            if (correct) this.sessionStats.encnCorrect++;
        } else {
            this.sessionStats.cnenAnswers++;
            if (correct) this.sessionStats.cnenCorrect++;
        }

        if (!correct) {
            this.consecutiveErrors[direction]++;
            if (this.consecutiveErrors[direction] >= 2) {
                this.anchoredNext = true;
                this.consecutiveErrors[direction] = 0;
            }
        } else {
            this.consecutiveErrors[direction] = 0;
        }

        this.adjustLearningParams();
    },

    adjustLearningParams: function () {
        if (this.recentAnswers.length < 5) return;
        var recent = this.recentAnswers.slice(-10);
        var correctCount = recent.filter(function (r) { return r.correct; }).length;
        var accuracy = correctCount / recent.length;

        if (accuracy >= 0.90) {
            this.dynamicConfig.maxNew = Math.min(20, (this.dynamicConfig.maxNew || 10) + 1);
            this.dynamicConfig.baseCnenRatio = Math.min(0.70, (this.dynamicConfig.baseCnenRatio || 0.15) + 0.05);
        } else if (accuracy < 0.60) {
            this.dynamicConfig.maxNew = Math.max(3, (this.dynamicConfig.maxNew || 10) - 2);
            this.dynamicConfig.baseCnenRatio = Math.max(0.05, (this.dynamicConfig.baseCnenRatio || 0.15) - 0.10);
        }
    },

    submitQuality: function (quality) {
        const wordId = this.currentQueue[this.currentIndex];
        const isNew = !SpacedRepetition.getCard(wordId);
        const isCorrect = quality >= 3;
        var direction = this.lastDirection || 'encn';

        if (typeof SpacedRepetition.rateCard === 'function' && SpacedRepetition.rateCard.length >= 3) {
            SpacedRepetition.rateCard(wordId, quality, direction);
        } else {
            SpacedRepetition.rateCard(wordId, quality);
        }
        SpacedRepetition.recordDailyStat(isNew, isCorrect);
        this.modesUsed.visual = true;
        this.recordAnswer(isCorrect, direction);

        if (isCorrect) {
            AudioSystem.playCorrect();
        } else {
            AudioSystem.playWrong();
        }

        this.currentIndex++;

        if (this.currentIndex >= this.currentQueue.length) {
            this.finishSession();
        } else {
            this.showCurrentWord();
        }
    },

    finishSession: function () {
        const dailyStats = SpacedRepetition.getDailyStats();
        const streak = SpacedRepetition.getStreak();
        const learningArea = document.getElementById('learningArea');

        this.checkAutoUnlock();
        this.checkAchievement('first_word');
        this.checkAchievement('words_10');
        this.checkAchievement('words_30');
        this.checkAchievement('words_50');
        this.checkAchievement('words_100');
        this.checkAchievement('words_200');
        this.checkAchievement('exercises_20');
        this.checkAchievement('exercises_50');
        this.checkAchievement('exercises_100');
        this.checkAchievement('exercises_150');
        this.checkAchievement('streak_3');
        this.checkAchievement('streak_7');
        this.checkAchievement('streak_30');
        this.checkAchievement('accuracy_90');
        this.checkAchievement('accuracy_95');
        this.checkAchievement('perfect_day');
        this.checkAchievement('all_units');
        this.checkAchievement('spelling_10');
        this.checkAchievement('listening_10');
        this.checkAchievement('all_round');

        const unitMastery = this.getUnitMastery(this.activeUnitId);

        var ss = this.sessionStats;
        var sessionDuration = ss.startTime ? Math.round((Date.now() - ss.startTime) / 1000) : 0;
        var sessionMin = Math.floor(sessionDuration / 60);
        var sessionSec = sessionDuration % 60;
        var overallAccuracy = ss.totalAnswered > 0 ? Math.round(ss.correctCount / ss.totalAnswered * 100) : 0;
        var encnAccuracy = ss.encnAnswers > 0 ? Math.round(ss.encnCorrect / ss.encnAnswers * 100) : 0;
        var cnenAccuracy = ss.cnenAnswers > 0 ? Math.round(ss.cnenCorrect / ss.cnenAnswers * 100) : 0;

        learningArea.innerHTML = `
            <div class="session-complete card p-4 text-center">
                <div style="font-size:4rem;margin-bottom:1rem;">🎉</div>
                <h3 style="margin-bottom:1rem;">本轮学习完成！</h3>
                ${unitMastery.percent >= 70 ? '<div style="color:#059669;font-weight:700;margin-bottom:1rem;">🏅 当前单元已达70%，下一单元即将解锁！</div>' : ''}
                <div class="completion-stats grid grid-3 gap-3 mb-4">
                    <div class="p-3" style="background:#dbeafe;border-radius:8px;">
                        <div style="font-size:1.5rem;font-weight:700;color:#1e40af;">${this.currentQueue.length}</div>
                        <div class="text-muted">本轮单词</div>
                    </div>
                    <div class="p-3" style="background:#d1fae5;border-radius:8px;">
                        <div style="font-size:1.5rem;font-weight:700;color:#065f46;">${dailyStats.newWords}</div>
                        <div class="text-muted">今日新学</div>
                    </div>
                    <div class="p-3" style="background:#fef3c7;border-radius:8px;">
                        <div style="font-size:1.5rem;font-weight:700;color:#92400e;">${unitMastery.percent}%</div>
                        <div class="text-muted">单元掌握度</div>
                    </div>
                </div>
                <div class="efficiency-report card p-4 mb-4" style="background:#f8fafc;border-radius:12px;">
                    <h5 style="margin-bottom:1rem;color:#475569;">📊 效率报告</h5>
                    <div class="grid grid-4 gap-2 text-center">
                        <div class="p-2" style="background:white;border-radius:8px;">
                            <div style="font-size:1.25rem;font-weight:700;color:#3b82f6;">${ss.totalAnswered}</div>
                            <div style="font-size:0.7rem;color:#666;">总答题数</div>
                        </div>
                        <div class="p-2" style="background:white;border-radius:8px;">
                            <div style="font-size:1.25rem;font-weight:700;color:${overallAccuracy >= 80 ? '#10b981' : overallAccuracy >= 60 ? '#f59e0b' : '#ef4444'};">${overallAccuracy}%</div>
                            <div style="font-size:0.7rem;color:#666;">正确率</div>
                        </div>
                        <div class="p-2" style="background:white;border-radius:8px;">
                            <div style="font-size:1.25rem;font-weight:700;color:#8b5cf6;">${sessionMin}分${sessionSec}秒</div>
                            <div style="font-size:0.7rem;color:#666;">用时</div>
                        </div>
                        <div class="p-2" style="background:white;border-radius:8px;">
                            <div style="font-size:1.25rem;font-weight:700;color:#ec4899;">${ss.repeated}</div>
                            <div style="font-size:0.7rem;color:#666;">重复词</div>
                        </div>
                    </div>
                    ${ss.encnAnswers + ss.cnenAnswers > 0 ? `
                    <div class="mt-3 pt-3" style="border-top:1px solid #e5e7eb;">
                        <div class="grid grid-2 gap-2 text-center">
                            <div class="p-2" style="background:#eff6ff;border-radius:8px;">
                                <div style="font-size:1rem;font-weight:600;color:#1d4ed8;">EN→中 ${encnAccuracy}% (${ss.encnCorrect}/${ss.encnAnswers})</div>
                                <div style="font-size:0.65rem;color:#666;">英译中正确率</div>
                            </div>
                            <div class="p-2" style="background:#fef3c7;border-radius:8px;">
                                <div style="font-size:1rem;font-weight:600;color:#92400e;">中→EN ${cnenAccuracy}% (${ss.cnenCorrect}/${ss.cnenAnswers})</div>
                                <div style="font-size:0.65rem;color:#666;">中译英正确率</div>
                            </div>
                        </div>
                    </div>` : ''}
                    ${(this.dynamicConfig.maxNew !== 10 || this.dynamicConfig.baseCnenRatio !== 0.15) ? `
                    <div class="mt-3 pt-3 text-left" style="border-top:1px solid #e5e7eb;font-size:0.75rem;color:#6b7280;">
                        <strong>⚙️ 自适应调参：</strong> 新词上限→${this.dynamicConfig.maxNew} | CN→EN比例→${Math.round(this.dynamicConfig.baseCnenRatio * 100)}%
                    </div>` : ''}
                </div>
                <div class="flex gap-2 justify-center flex-wrap">
                    <button class="btn btn-primary" id="continueLearning">🔄 继续学习</button>
                    <button class="btn btn-success" id="backToOverview">🏠 返回概览</button>
                </div>
            </div>
        `;

        document.getElementById('continueLearning').addEventListener('click', () => this.startLearning(this.learningMode));
        document.getElementById('backToOverview').addEventListener('click', () => this.render());
    },

    bindEvents: function () {
        const mc = document.getElementById('moduleContent');
        mc.addEventListener('click', (e) => {
            const target = e.target.closest('.mode-btn');
            if (target) {
                this.startLearning(target.dataset.mode);
                return;
            }

            const unitCard = e.target.closest('.unit-card');
            if (unitCard && !unitCard.classList.contains('locked')) {
                const unitId = parseInt(unitCard.dataset.unit);
                if (this.unlockedUnits.includes(unitId)) {
                    this.activeUnitId = unitId;
                    this.saveState();
                    this.render();
                }
            }

            var studyBtn = e.target.closest('.study-mode-btn');
            if (studyBtn && !studyBtn.disabled) {
                this.studyMode = studyBtn.dataset.study;
                this.saveState();
                this.render();
                return;
            }
        });

        mc.addEventListener('input', (e) => {
            if (e.target.id === 'speedSlider') {
                this.speechSpeed = parseFloat(e.target.value);
                var speedLabel = document.getElementById('speedLabel');
                if (speedLabel) speedLabel.textContent = this.speechSpeed === 0.7 ? '慢' : this.speechSpeed === 1.3 ? '快' : '正常';
                this.saveState();
            }
        });

        var dragonBtn = document.getElementById('startDragonBtn');
        if (dragonBtn) {
            dragonBtn.addEventListener('click', function () {
                if (typeof DragonMode !== 'undefined') {
                    DragonMode.start();
                } else {
                    alert('一条龙模式加载中，请稍后重试...');
                }
            });
        }

        var dragonEntry = document.getElementById('dragonEntry');
        if (dragonEntry) {
            dragonEntry.addEventListener('click', function (e) {
                if (e.target.id !== 'startDragonBtn') {
                    var btn = document.getElementById('startDragonBtn');
                    if (btn) btn.click();
                }
            });
        }
    }
};