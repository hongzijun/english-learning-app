const App = {
    currentModule: 'smart-words',

    sessionData: {
        startTime: null,
        correctCount: 0,
        totalCount: 0,
        wrongWords: {},
        wordsStudied: []
    },

    startSession: function () {
        this.sessionData.startTime = Date.now();
        this.sessionData.correctCount = 0;
        this.sessionData.totalCount = 0;
        this.sessionData.wrongWords = {};
        this.sessionData.wordsStudied = [];
    },

    trackAnswer: function (wordId, word, correct) {
        this.sessionData.totalCount++;
        if (correct) {
            this.sessionData.correctCount++;
        } else {
            if (!this.sessionData.wrongWords[wordId]) {
                this.sessionData.wrongWords[wordId] = { word: word, count: 0 };
            }
            this.sessionData.wrongWords[wordId].count++;
        }
        if (typeof PeakTimeAnalyzer !== 'undefined') PeakTimeAnalyzer.recordAnswer(correct);
        if (typeof PaceRegulator !== 'undefined') PaceRegulator.recordResult(correct);
        if (typeof BreakReminder !== 'undefined') BreakReminder.check(this.sessionData);
        if (typeof DailyPlanner !== 'undefined') DailyPlanner.trackProgress(1);
    },

    endSession: function () {
        var duration = (Date.now() - this.sessionData.startTime) / 60000;
        var wrongList = [];
        for (var k in this.sessionData.wrongWords) {
            wrongList.push(this.sessionData.wrongWords[k]);
        }
        wrongList.sort(function (a, b) { return b.count - a.count; });
        if (typeof AutoNotes !== 'undefined') {
            AutoNotes.generate({
                wordsStudied: this.sessionData.wordsStudied.length,
                correctCount: this.sessionData.correctCount,
                totalCount: this.sessionData.totalCount,
                duration: duration,
                wrongWords: wrongList.slice(0, 3)
            });
        }
        if (typeof PoststudyReflection !== 'undefined') {
            PoststudyReflection.reflect({
                wordsStudied: this.sessionData.wordsStudied,
                wrongWords: wrongList.slice(0, 3)
            });
        }
    },

    modules: {
        dragon: DragonMode,
        words: WordsModule,
        'enhanced-words': EnhancedWordsModule,
        'smart-words': SmartWordsModule,
        'exam-prep': ExamPrepModule,
        spelling: SpellingModule,
        flashcards: FlashcardModule,
        achievements: AchievementsModule,
        goals: GoalsModule,
        assistant: AssistantModule,
        settings: SettingsModule,
        exercises: ExercisesModule,
        grammar: GrammarModule,
        'advanced-grammar': AdvancedGrammarModule,
        mistakes: MistakesModule,
        review: ReviewModule,
        progress: ProgressModule,
        diagnostic: DiagnosticModule,
        'grammar-system': GrammarSystemModule,
        'exam-strategy': ExamStrategyModule,
        'mock-exam': MockExamModule,
        dashboard: DashboardModule,
        'quick-challenge': QuickChallenge,
        'knowledge-map': KnowledgeMap,
        'focus-mode': FocusMode,
        'ambient-sound': AmbientSound,
        'smart-eye-care': SmartEyeCare,
        'feynman-method': FeynmanMethod,
        'interleaved-practice': InterleavedPractice,
        'self-explanation': SelfExplanation,
        'association-builder': AssociationBuilder,
        'contrast-drill': ContrastDrill,
        'pomodoro-timer': PomodoroTimer,
        'peak-time-analyzer': PeakTimeAnalyzer,
        'daily-planner': DailyPlanner,
        'break-reminder': BreakReminder,
        'spiral-review': SpiralReview,
        'weekly-quiz': WeeklyQuiz,
        'auto-notes': AutoNotes,
        'journey-map': JourneyMap,
        'prestudy-check': PrestudyCheck,
        'poststudy-reflection': PoststudyReflection,
        'pace-regulator': PaceRegulator,
        'milestone-review': MilestoneReview,
        'peer-ranking': PeerRanking
    },

    init: function () {
        Storage.init();
        if (typeof AdaptiveEngine !== 'undefined') {
            AdaptiveEngine.init();
        }
        if (typeof SpacedRepetition !== 'undefined') {
            SpacedRepetition.init();
        }
        if (typeof MistakeAnalysisSystem !== 'undefined') {
            MistakeAnalysisSystem.init();
        }

        AudioSystem.init();
        AudioSystem.resume();
        if (typeof XPSystem !== 'undefined') XPSystem.init();
        if (typeof Celebration !== 'undefined') Celebration.init();
        if (typeof DailyCalendar !== 'undefined') DailyCalendar.init();
        if (typeof QuickChallenge !== 'undefined') QuickChallenge.init();
        if (typeof EncouragementSystem !== 'undefined') EncouragementSystem.init();
        if (typeof SmartEyeCare !== 'undefined') SmartEyeCare.init();
        if (typeof AmbientSound !== 'undefined') AmbientSound.init();
        if (typeof PomodoroTimer !== 'undefined') PomodoroTimer.init();
        if (typeof SpiralReview !== 'undefined') SpiralReview.init();
        if (typeof WeeklyQuiz !== 'undefined') WeeklyQuiz.init();
        if (typeof DailyPlanner !== 'undefined') DailyPlanner.init();
        if (typeof PoststudyReflection !== 'undefined') PoststudyReflection.init();
        if (typeof PrestudyCheck !== 'undefined') PrestudyCheck.init();
        if (typeof PeerRanking !== 'undefined') PeerRanking.init();
        App.startSession();

        window.addEventListener('beforeunload', function () {
            App.endSession();
        });

        this.bindEvents();
        this.initNavState();
        this.updateNavBadges();
        if (typeof ExamPrepModule !== 'undefined') {
            ExamPrepModule.setUnit2Complete();
        }
        this.loadModule('smart-words');
    },

    initNavState: function () {
        var coreGroup = document.querySelector('.nav-group[data-group="core"]');
        if (coreGroup) coreGroup.classList.add('expanded');
    },

    updateNavState: function () {
        var self = this;
        document.querySelectorAll('.nav-item').forEach(function (item) {
            item.classList.remove('active');
            if (item.dataset.module === self.currentModule) {
                item.classList.add('active');
            }
        });
    },

    updateNavBadges: function () {
        try {
            if (typeof Grade7Data !== 'undefined' && Grade7Data.words) {
                var totalWords = Grade7Data.words.length;
                var bWords = document.getElementById('navBadgeWords');
                if (bWords) bWords.textContent = totalWords + '词';
            }
            if (typeof Grade7Data !== 'undefined' && Grade7Data.grammar) {
                var bGrammar = document.getElementById('navBadgeGrammar');
                if (bGrammar) bGrammar.textContent = Grade7Data.grammar.length + '点';
            }
            if (typeof Grade7Data !== 'undefined' && Grade7Data.exercises) {
                var bExercises = document.getElementById('navBadgeExercises');
                if (bExercises) bExercises.textContent = Grade7Data.exercises.length + '题';
            }
            if (typeof SpacedRepetition !== 'undefined') {
                var allIds = [];
                if (typeof Grade7Data !== 'undefined' && Grade7Data.words) {
                    Grade7Data.words.forEach(function (w) { if (w.id) allIds.push(w.id); });
                }
                var progress = allIds.length > 0 ? SpacedRepetition.getLearningProgress(allIds) : null;
                if (progress) {
                    var bSmart = document.getElementById('navBadgeSmartWords');
                    if (bSmart) bSmart.textContent = progress.mastered + '/' + progress.total;
                    var bProg = document.getElementById('navBadgeProgress');
                    if (bProg) bProg.textContent = progress.progressPercent + '%';
                }
                var dailyStats = SpacedRepetition.getDailyStats();
                var bReview = document.getElementById('navBadgeReview');
                if (bReview) bReview.textContent = dailyStats.reviews + '条';
            }
            if (typeof SmartWordsModule !== 'undefined' && SmartWordsModule.getAchievements) {
                var achs = SmartWordsModule.getAchievements();
                var totalAch = (Grade7Data.achievements || []).length;
                var bAch = document.getElementById('navBadgeAchievements');
                if (bAch) bAch.textContent = achs.length + '/' + totalAch;
            }
            if (typeof Storage !== 'undefined') {
                try {
                    var mistakes = JSON.parse(Storage.get(Storage.keys.MISTAKES || 'mistakes') || '[]');
                    var bMis = document.getElementById('navBadgeMistakes');
                    if (bMis) bMis.textContent = mistakes.length + '题';
                } catch (e) { }
            }
        } catch (e) {
            console.warn('[App] 导航徽章更新失败:', e);
        }
    },

    bindEvents: function () {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const moduleName = item.dataset.module;
                if (moduleName && moduleName !== this.currentModule) {
                    if (typeof AudioSystem !== 'undefined' && AudioSystem.playTransition) AudioSystem.playTransition();
                    this.switchModule(moduleName);
                }
            });
        });

        document.querySelectorAll('.nav-group-header').forEach(header => {
            header.addEventListener('click', (e) => {
                e.stopPropagation();
                AudioSystem.playClick();
                const group = header.closest('.nav-group');
                group.classList.toggle('expanded');
            });
        });

        var sidebarFoldBtn = document.getElementById('sidebarFoldBtn');
        if (sidebarFoldBtn) {
            sidebarFoldBtn.addEventListener('click', function () {
                var sidebar = document.getElementById('sidebar');
                if (!sidebar) return;
                if (typeof AudioSystem !== 'undefined' && AudioSystem.playClick) AudioSystem.playClick();
                var isFolded = sidebar.classList.toggle('folded');
                var mc = document.querySelector('.main-content');
                if (mc) mc.classList.toggle('sidebar-folded');
                sidebarFoldBtn.textContent = isFolded ? '▶' : '◀';
                sidebarFoldBtn.style.left = isFolded ? '0px' : '280px';
            });
        }

        document.addEventListener('click', function (e) {
            var sidebar = document.querySelector('.sidebar');
            var toggle = document.getElementById('menuToggle');
            if (window.innerWidth <= 767 && sidebar && toggle && !sidebar.contains(e.target) && !toggle.contains(e.target)) {
                sidebar.classList.remove('open');
            }
        });

        window.addEventListener('resize', function () {
            var sidebar = document.querySelector('.sidebar');
            if (window.innerWidth > 767 && sidebar) {
                sidebar.classList.remove('open');
            }
        });
    },

    _autoSave: function () {
        try {
            var d = {};
            if (typeof XPSystem !== 'undefined') d.xp = XPSystem.data;
            if (typeof DailyCalendar !== 'undefined') d.calendar = DailyCalendar.data;
            if (typeof DragonMode !== 'undefined') d.dragon = DragonMode.state;
            if (typeof Storage !== 'undefined') {
                d.wordStatus = Storage.getWordStatus();
                d.mistakes = Storage.get(Storage.keys.MISTAKES);
                d.achievements = Storage.get(Storage.keys.ACHIEVEMENTS);
                d.reviewSchedule = Storage.get(Storage.keys.REVIEW_SCHEDULE);
            }
            d.ts = Date.now();
            localStorage.setItem('autosave', JSON.stringify(d));
            App._updateSaveIndicator();
        } catch (e) { }
    },

    _updateSaveIndicator: function () {
        var el = document.getElementById('auto-save-indicator');
        if (!el) return;
        el.style.opacity = '1';
        clearTimeout(this._saveIndicatorTimer);
        this._saveIndicatorTimer = setTimeout(function () {
            el.style.opacity = '0.4';
        }, 800);
    },

    switchModule: function (moduleName) {
        this._autoSave();
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.module === moduleName) {
                item.classList.add('active');
            }
        });

        if (window.innerWidth <= 767) {
            document.getElementById('mainNav').classList.remove('active');
        }

        this.loadModule(moduleName);
        setTimeout(() => this.updateNavBadges(), 300);
    },

    loadModule: function (moduleName) {
        if (moduleName === 'quick-challenge' && typeof QuickChallenge !== 'undefined') {
            var mainContent = document.getElementById('moduleContent');
            QuickChallenge.start(mainContent);
            this.currentModule = moduleName;
            this.updateNavState();
            if (typeof AudioSystem !== 'undefined' && AudioSystem.playTransition) AudioSystem.playTransition();
            return;
        }
        this.currentModule = moduleName;
        var module = this.modules[moduleName];
        if (module && typeof module.init === 'function') {
            module.init();
        }
    },

    _showSaveToast: function () {
        var existing = document.getElementById('saveToast');
        if (existing) existing.remove();

        var toast = document.createElement('div');
        toast.id = 'saveToast';
        toast.textContent = '✅ 保存成功';
        toast.style.cssText =
            'position:fixed;bottom:80px;right:20px;background:linear-gradient(135deg,#10b981,#059669);' +
            'color:white;padding:0.75rem 1.5rem;border-radius:12px;font-size:0.9rem;font-weight:600;' +
            'z-index:10001;box-shadow:0 4px 15px rgba(16,185,129,0.4);' +
            'animation:tipSlideIn 0.3s ease, tipFadeOut 0.5s ease 1.5s forwards;';
        document.body.appendChild(toast);

        setTimeout(function () {
            if (toast.parentNode) toast.remove();
        }, 2000);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
