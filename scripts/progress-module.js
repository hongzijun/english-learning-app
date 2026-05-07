const ProgressModule = {
    init: function () {
        this.render();
        this.bindEvents();
    },

    render: function () {
        const moduleContent = document.getElementById('moduleContent');
        const progress = Storage.get(Storage.keys.LEARNING_PROGRESS);
        const wordStatus = Storage.get(Storage.keys.WORD_STATUS);
        const grammarStatus = Storage.get(Storage.keys.GRAMMAR_STATUS) || {};
        const allWords = Grade7Data.getAllWords();
        const allGrammar = Grade7Data.getAllGrammar();

        const wordStats = this.getWordStats(wordStatus, allWords);
        const grammarStats = this.getGrammarStats(grammarStatus, allGrammar);
        const weeklyData = this.getWeeklyData(progress);

        moduleContent.innerHTML = `
            <div class="progress-module">
                <div class="page-header mb-4">
                    <h2>📊 学习进度</h2>
                    <p class="text-muted">跟踪学习数据，见证进步</p>
                </div>
                
                <div class="stats-cards grid grid-4 gap-3 mb-4">
                    <div class="card text-center">
                        <div class="stat-number text-primary">${this.formatTime(progress.totalTime)}</div>
                        <div class="stat-label text-muted">总学习时长</div>
                    </div>
                    <div class="card text-center">
                        <div class="stat-number text-success">${wordStats.mastered}</div>
                        <div class="stat-label text-muted">已掌握单词</div>
                    </div>
                    <div class="card text-center">
                        <div class="stat-number text-warning">${grammarStats.learned}</div>
                        <div class="stat-label text-muted">已学语法点</div>
                    </div>
                    <div class="card text-center">
                        <div class="stat-number text-danger">${progress.dailyRecords.length}</div>
                        <div class="stat-label text-muted">学习天数</div>
                    </div>
                </div>
                
                <div class="grid grid-2 gap-3 mb-4">
                    <div class="card">
                        <h3 class="card-title">📖 单词掌握进度</h3>
                        <div class="progress-section mb-3">
                            <div class="flex-between mb-1">
                                <span>总进度</span>
                                <span>${wordStats.progress}%</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${wordStats.progress}%;"></div>
                            </div>
                        </div>
                        <div class="grid grid-3 gap-2 text-center">
                            <div class="p-2" style="background: #f8f9fa; border-radius: 4px;">
                                <div class="text-success font-bold">${wordStats.mastered}</div>
                                <div class="text-muted text-sm">已掌握</div>
                            </div>
                            <div class="p-2" style="background: #f8f9fa; border-radius: 4px;">
                                <div class="text-primary font-bold">${wordStats.learning}</div>
                                <div class="text-muted text-sm">学习中</div>
                            </div>
                            <div class="p-2" style="background: #f8f9fa; border-radius: 4px;">
                                <div class="text-warning font-bold">${wordStats.notStarted}</div>
                                <div class="text-muted text-sm">未学习</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="card">
                        <h3 class="card-title">📝 语法学习进度</h3>
                        <div class="progress-section mb-3">
                            <div class="flex-between mb-1">
                                <span>总进度</span>
                                <span>${grammarStats.progress}%</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${grammarStats.progress}%;"></div>
                            </div>
                        </div>
                        <div class="grid grid-2 gap-2 text-center">
                            <div class="p-2" style="background: #f8f9fa; border-radius: 4px;">
                                <div class="text-success font-bold">${grammarStats.learned}</div>
                                <div class="text-muted text-sm">已学习</div>
                            </div>
                            <div class="p-2" style="background: #f8f9fa; border-radius: 4px;">
                                <div class="text-warning font-bold">${grammarStats.notLearned}</div>
                                <div class="text-muted text-sm">未学习</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="card mb-4">
                    <h3 class="card-title">📅 本周学习统计</h3>
                    ${this.renderWeeklyChart(weeklyData)}
                </div>
                
                <div class="grid gap-3">
                    <div class="card">
                        <h3 class="card-title mb-3">⚙️ 数据管理</h3>
                        <div class="flex gap-2 flex-wrap">
                            <button class="btn btn-primary" id="backupBtn">
                                💾 备份数据
                            </button>
                            <button class="btn btn-warning" id="restoreBtn">
                                📂 恢复数据
                            </button>
                            <button class="btn btn-danger" id="resetBtn">
                                🗑️ 重置数据
                            </button>
                            <input type="file" id="restoreFile" style="display: none;" accept=".json">
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    getWordStats: function (wordStatus, allWords) {
        let mastered = 0, learning = 0, notStarted = 0;

        allWords.forEach(word => {
            const status = wordStatus[word.id] || { status: 'not_started' };
            if (status.status === 'mastered') mastered++;
            else if (status.status === 'learning') learning++;
            else notStarted++;
        });

        const total = allWords.length;
        const progress = total > 0 ? Math.round(((mastered + learning * 0.5) / total) * 100) : 0;

        return { mastered, learning, notStarted, progress, total };
    },

    getGrammarStats: function (grammarStatus, allGrammar) {
        let learned = 0;

        allGrammar.forEach(g => {
            if (grammarStatus[g.id]) learned++;
        });

        const total = allGrammar.length;
        const progress = total > 0 ? Math.round((learned / total) * 100) : 0;

        return { learned, notLearned: total - learned, progress, total };
    },

    getWeeklyData: function (progress) {
        const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
        const today = new Date();
        const data = [];

        for (let i = 6; i >= 0; i--) {
            const date = Utils.addDays(today, -i);
            const dateStr = Utils.formatDate(date);
            const dayOfWeek = weekDays[date.getDay()];
            const record = progress.dailyRecords.find(r => r.date === dateStr);

            let time = 0;
            if (record) {
                Object.values(record.modules).forEach(m => {
                    time += m.time;
                });
            }

            data.push({
                day: dayOfWeek,
                date: dateStr,
                time: time
            });
        }

        return data;
    },

    renderWeeklyChart: function (weeklyData) {
        const maxTime = Math.max(...weeklyData.map(d => d.time), 60);

        return `
            <div class="weekly-chart">
                <div class="chart-bars flex gap-2 align-items-end" style="height: 200px;">
                    ${weeklyData.map(day => {
            const height = maxTime > 0 ? (day.time / maxTime) * 100 : 0;
            return `
                            <div class="chart-bar flex-1" style="text-align: center;">
                                <div class="bar" style="height: ${Math.max(height, 5)}%; background: linear-gradient(to top, var(--primary-color), #7ED321); border-radius: 4px 4px 0 0; min-height: 5px;">
                                </div>
                                <div class="text-muted" style="font-size: 0.875rem; margin-top: 0.5rem;">${day.day}</div>
                                <div class="text-sm" style="color: var(--primary-color);">${this.formatTime(day.time)}</div>
                            </div>
                        `;
        }).join('')}
                </div>
            </div>
        `;
    },

    formatTime: function (seconds) {
        if (seconds < 60) return `${seconds}秒`;
        const mins = Math.floor(seconds / 60);
        if (mins < 60) return `${mins}分钟`;
        const hours = Math.floor(mins / 60);
        const remainingMins = mins % 60;
        return `${hours}小时${remainingMins}分钟`;
    },

    bindEvents: function () {
        document.getElementById('moduleContent').addEventListener('click', (e) => {
            if (e.target.id === 'backupBtn') {
                const backup = Storage.backup();
                Utils.exportToJSON(backup, `english-learning-backup-${Utils.getTodayDate()}.json`);
                Utils.showNotification('数据备份成功！', 'success');
            } else if (e.target.id === 'restoreBtn') {
                document.getElementById('restoreFile').click();
            } else if (e.target.id === 'resetBtn') {
                if (confirm('确定要重置所有学习数据吗？此操作不可恢复！')) {
                    Storage.clearAll();
                    Utils.showNotification('数据已重置！', 'success');
                    this.render();
                }
            }
        });

        document.getElementById('moduleContent').addEventListener('change', (e) => {
            if (e.target.id === 'restoreFile') {
                const file = e.target.files[0];
                if (file) {
                    Utils.importFromJSON(file).then(data => {
                        Storage.restore(data);
                        this.render();
                    }).catch(err => {
                        Utils.showNotification('文件导入失败，请检查文件格式', 'error');
                    });
                }
            }
        });
    }
};
