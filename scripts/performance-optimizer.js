const PerformanceOptimizer = {
    maxStorageSize: 5 * 1024 * 1024,
    maxHistoryRecords: 100,
    maxMistakesRecords: 200,
    cleanupInterval: 24 * 60 * 60 * 1000,

    init: function () {
        this.checkStorageSize();
        this.setupAutoCleanup();
        this.optimizeMemory();
        this.addPerformanceStyles();

        console.log('🚀 Performance Optimizer initialized');
    },

    checkStorageSize: function () {
        try {
            let totalSize = 0;
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    totalSize += localStorage.getItem(key).length * 2;
                }
            }

            const sizeMB = (totalSize / 1024 / 1024).toFixed(2);
            console.log(`📊 Current storage size: ${sizeMB} MB`);

            if (totalSize > this.maxStorageSize) {
                console.warn('⚠️ Storage size exceeds limit, performing cleanup...');
                this.performCleanup();
            }

            return sizeMB;
        } catch (error) {
            console.error('Error checking storage size:', error);
            return '0';
        }
    },

    performCleanup: function () {
        console.log('🧹 Performing cleanup...');

        this.cleanupOldRecords();
        this.cleanupDuplicateData();
        this.compressData();

        Utils.showNotification('🧹 已自动清理旧数据，释放存储空间', 'info');
    },

    cleanupOldRecords: function () {
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

        const reviewHistory = Storage.get(Storage.keys.REVIEW_HISTORY) || [];
        const cleanedHistory = reviewHistory.filter(record => {
            return new Date(record.date).getTime() > thirtyDaysAgo;
        });
        Storage.set(Storage.keys.REVIEW_HISTORY, cleanedHistory.slice(-this.maxHistoryRecords));

        const exerciseHistory = Storage.get(Storage.keys.EXERCISE_HISTORY) || [];
        const cleanedExercises = exerciseHistory.filter(record => {
            return new Date(record.date).getTime() > thirtyDaysAgo;
        });
        Storage.set(Storage.keys.EXERCISE_HISTORY, cleanedExercises.slice(-this.maxHistoryRecords));

        const flashcardSessions = Storage.get(Storage.keys.FLASHCARD_SESSIONS) || [];
        const cleanedSessions = flashcardSessions.filter(session => {
            return new Date(session.date).getTime() > thirtyDaysAgo;
        });
        Storage.set(Storage.keys.FLASHCARD_SESSIONS, cleanedSessions.slice(-this.maxHistoryRecords));

        const mistakes = Storage.get(Storage.keys.MISTAKES) || [];
        if (mistakes.length > this.maxMistakesRecords) {
            const sortedMistakes = mistakes.sort((a, b) => {
                return new Date(b.lastError).getTime() - new Date(a.lastError).getTime();
            });
            Storage.set(Storage.keys.MISTAKES, sortedMistakes.slice(0, this.maxMistakesRecords));
        }

        console.log('✅ Old records cleaned up');
    },

    cleanupDuplicateData: function () {
        const mistakes = Storage.get(Storage.keys.MISTAKES) || [];
        const uniqueMistakes = [];
        const seen = new Set();

        mistakes.forEach(mistake => {
            const key = `${mistake.type}-${mistake.question}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueMistakes.push(mistake);
            }
        });

        if (uniqueMistakes.length !== mistakes.length) {
            Storage.set(Storage.keys.MISTAKES, uniqueMistakes);
            console.log(`✅ Removed ${mistakes.length - uniqueMistakes.length} duplicate mistakes`);
        }
    },

    compressData: function () {
        const learningProgress = Storage.get(Storage.keys.LEARNING_PROGRESS);
        if (learningProgress && learningProgress.dailyRecords) {
            const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
            learningProgress.dailyRecords = learningProgress.dailyRecords.filter(record => {
                return new Date(record.date).getTime() > thirtyDaysAgo;
            });
            Storage.set(Storage.keys.LEARNING_PROGRESS, learningProgress);
        }
    },

    setupAutoCleanup: function () {
        setInterval(() => {
            this.checkStorageSize();
        }, this.cleanupInterval);

        setInterval(() => {
            this.optimizeMemory();
        }, 60 * 60 * 1000);

        window.addEventListener('beforeunload', () => {
            this.saveState();
        });

        console.log('⏰ Auto cleanup scheduled');
    },

    optimizeMemory: function () {
        if (window.gc) {
            window.gc();
        }

        this.clearUnusedVariables();

        console.log('💾 Memory optimized');
    },

    clearUnusedVariables: function () {
        if (typeof FlashcardModule !== 'undefined' && FlashcardModule.flashcards) {
            if (FlashcardModule.flashcards.length > 100) {
                FlashcardModule.flashcards = FlashcardModule.flashcards.slice(0, 100);
            }
        }

        if (typeof AssistantModule !== 'undefined' && AssistantModule.chatHistory) {
            if (AssistantModule.chatHistory.length > 50) {
                AssistantModule.chatHistory = AssistantModule.chatHistory.slice(-50);
            }
        }
    },

    saveState: function () {
        try {
            const currentState = {
                timestamp: Date.now(),
                currentModule: App.currentModule
            };
            localStorage.setItem('app_state', JSON.stringify(currentState));
        } catch (error) {
            console.error('Error saving state:', error);
        }
    },

    restoreState: function () {
        try {
            const savedState = localStorage.getItem('app_state');
            if (savedState) {
                const state = JSON.parse(savedState);
                const hoursSinceLastVisit = (Date.now() - state.timestamp) / (1000 * 60 * 60);

                if (hoursSinceLastVisit < 24) {
                    return state.currentModule;
                }
            }
            return null;
        } catch (error) {
            console.error('Error restoring state:', error);
            return null;
        }
    },

    getStorageInfo: function () {
        let totalSize = 0;
        const details = {};

        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                const size = localStorage.getItem(key).length * 2;
                totalSize += size;
                details[key] = (size / 1024).toFixed(2) + ' KB';
            }
        }

        return {
            total: (totalSize / 1024 / 1024).toFixed(2) + ' MB',
            details: details
        };
    },

    showStorageInfo: function () {
        const info = this.getStorageInfo();
        console.table(info.details);
        console.log(`Total: ${info.total}`);
    },

    exportAllData: function () {
        const allData = {};

        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key) && key.startsWith('english_')) {
                try {
                    allData[key] = JSON.parse(localStorage.getItem(key));
                } catch (e) {
                    allData[key] = localStorage.getItem(key);
                }
            }
        }

        const exportData = {
            exportDate: new Date().toISOString(),
            version: '1.0',
            data: allData
        };

        Utils.exportToJSON(exportData, `english-learning-backup-${Utils.getTodayDate()}.json`);
        Utils.showNotification('✅ 数据备份成功！', 'success');
    },

    importAllData: function (jsonData) {
        try {
            const importData = JSON.parse(jsonData);

            if (!importData.data) {
                throw new Error('Invalid backup file format');
            }

            for (let key in importData.data) {
                localStorage.setItem(key, JSON.stringify(importData.data[key]));
            }

            Utils.showNotification('✅ 数据恢复成功！即将刷新页面...', 'success');

            setTimeout(() => {
                window.location.reload();
            }, 1500);

        } catch (error) {
            console.error('Error importing data:', error);
            Utils.showNotification('❌ 数据恢复失败，请检查文件格式', 'error');
        }
    },

    addPerformanceStyles: function () {
        const style = document.createElement('style');
        style.textContent = `
            .performance-indicator {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: rgba(0,0,0,0.8);
                color: white;
                padding: 10px 15px;
                border-radius: 8px;
                font-size: 12px;
                z-index: 10000;
                opacity: 0;
                transition: opacity 0.3s ease;
                pointer-events: none;
            }
            
            .performance-indicator.show {
                opacity: 1;
            }
            
            @keyframes optimizeAnimation {
                0% { transform: scale(1); }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); }
            }
            
            .optimizing {
                animation: optimizeAnimation 0.5s ease;
            }
        `;
        document.head.appendChild(style);
    },

    showPerformanceIndicator: function (message) {
        let indicator = document.querySelector('.performance-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'performance-indicator';
            document.body.appendChild(indicator);
        }

        indicator.textContent = message;
        indicator.classList.add('show');

        setTimeout(() => {
            indicator.classList.remove('show');
        }, 2000);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    PerformanceOptimizer.init();
});
