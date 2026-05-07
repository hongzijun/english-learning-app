const MistakesModule = {
    mistakes: [],
    currentFilter: 'all',

    init: function () {
        this.mistakes = (typeof DataBridge !== 'undefined') ? (DataBridge.state.getMistakes() || []) : (Storage.get(Storage.keys.MISTAKES) || []);
        this.render();
        this.bindEvents();
        var self = this;
        if (typeof DataBridge !== 'undefined') {
            DataBridge.on('mistake:added', function () { self.render(); });
            DataBridge.on('mistake:resolved', function () { self.render(); });
        }
    },

    render: function () {
        const moduleContent = document.getElementById('moduleContent');
        if (!moduleContent) return;

        moduleContent.innerHTML = `
            <div class="mistakes-module">
                <div class="page-header mb-4">
                    <h2>📋 错题本</h2>
                    <p class="text-muted">整理错题，查漏补缺，巩固知识</p>
                </div>
                
                <div class="stats-cards grid grid-4 gap-3 mb-4">
                    <div class="card text-center">
                        <div class="stat-number text-primary">${this.mistakes.length}</div>
                        <div class="stat-label text-muted">总错题数</div>
                    </div>
                    <div class="card text-center">
                        <div class="stat-number text-warning">${this.getMistakesByType('choice').length}</div>
                        <div class="stat-label text-muted">选择题</div>
                    </div>
                    <div class="card text-center">
                        <div class="stat-number text-success">${this.getMistakesByType('fill').length}</div>
                        <div class="stat-label text-muted">填空题</div>
                    </div>
                    <div class="card text-center">
                        <div class="stat-number text-danger">${this.getMistakesByType('reading').length}</div>
                        <div class="stat-label text-muted">阅读理解</div>
                    </div>
                </div>
                
                <div class="filter-bar flex gap-2 mb-4 flex-wrap">
                    <select id="mistakeFilter" class="form-control" style="width: 200px;">
                        <option value="all">全部错题</option>
                        <option value="choice">选择题</option>
                        <option value="fill">填空题</option>
                        <option value="reading">阅读理解</option>
                    </select>
                    <button class="btn btn-warning" id="exportBtn">
                        📤 导出错题
                    </button>
                    <button class="btn btn-danger" id="clearBtn">
                        🗑️ 清空错题本
                    </button>
                </div>
                
                <div class="mistakes-list" id="mistakesList">
                    ${this.renderMistakesList()}
                </div>
            </div>
        `;
    },

    getMistakesByType: function (type) {
        if (type === 'all') return this.mistakes || [];
        return (this.mistakes || []).filter(m => m.type === type);
    },

    _renderErrorType: function (errorType) {
        var config = {
            knowledge: { icon: '📚', label: '知识型', color: '#ef4444', tip: '该知识点尚未掌握，需要重新学习' },
            method: { icon: '🧩', label: '方法型', color: '#f59e0b', tip: '解题方法或策略需要改进' },
            habit: { icon: '⚠️', label: '习惯型', color: '#8b5cf6', tip: '可能是粗心或习惯问题，注意仔细审题' }
        };
        var cfg = config[errorType] || config.knowledge;
        return '<div style="border-left:3px solid ' + cfg.color + ';padding:0.3rem 0.7rem;font-size:0.85rem;background:#fafafa;border-radius:4px;">' +
            '<strong>' + cfg.icon + ' ' + cfg.label + '错误：</strong>' + cfg.tip + '</div>';
    },

    renderMistakesList: function () {
        let mistakes = this.getMistakesByType(this.currentFilter);

        if (!mistakes || mistakes.length === 0) {
            return '<div class="text-center text-muted card">太棒了！没有错题记录，继续保持！🎉</div>';
        }

        const typeLabels = {
            choice: '选择题',
            fill: '填空题',
            reading: '阅读理解'
        };

        const typeColors = {
            choice: 'badge-primary',
            fill: 'badge-success',
            reading: 'badge-warning'
        };

        return `
            <div class="grid gap-3">
                ${mistakes.map(mistake => `
                    <div class="mistake-card card" data-mistake-id="${mistake.id}">
                        <div class="flex-between mb-2">
                            <div class="flex gap-2 align-items-center">
                                <span class="badge ${typeColors[mistake.type]}">${typeLabels[mistake.type]}</span>
                                <span class="text-muted" style="font-size: 0.875rem;">${mistake.unitName ? mistake.unitName.split(' ')[0] : ''}</span>
                            </div>
                            <span class="badge badge-danger">错误 ${mistake.errorCount || 1} 次</span>
                        </div>
                        ${mistake.errorType ? `
                        <div class="mb-2">
                            ${this._renderErrorType(mistake.errorType)}
                        </div>
                        ` : ''}
                        <div class="mistake-question mb-3">
                            <h4 class="mb-2">题目</h4>
                            <p style="white-space: pre-wrap;">${mistake.question || ''}</p>
                        </div>
                        ${mistake.type === 'choice' && mistake.options ? `
                        <div class="mistake-options mb-3">
                            ${mistake.options.map((opt, i) => `
                                <div class="option-item ${i === mistake.answer ? 'correct' : ''}" style="padding: 0.5rem; margin: 0.25rem 0; border-radius: 4px; ${i === mistake.answer ? 'background: rgba(126, 211, 33, 0.1); border: 2px solid #7ED321;' : 'background: #f8f9fa;'}">
                                    ${String.fromCharCode(65 + i)}. ${opt}
                                </div>
                            `).join('')}
                        </div>
                        ` : ''}
                        <div class="mistake-answer mb-3">
                            <h4 class="mb-2">正确答案</h4>
                            <p class="text-success"><strong>${mistake.answer || ''}</strong></p>
                        </div>
                        <div class="mistake-explanation mb-3">
                            <h4 class="mb-2">解析</h4>
                            <p class="text-muted">${mistake.explanation || ''}</p>
                        </div>
                        <div class="flex gap-2 flex-wrap">
                            <button class="btn btn-primary" data-action="retry">
                                🔄 重新练习
                            </button>
                            <button class="btn btn-success" data-action="remove">
                                ✅ 已掌握，移除
                            </button>
                        </div>
                        <div class="text-muted mt-2" style="font-size: 0.875rem;">
                            首次错误：${Utils.formatDateTime(mistake.firstError)} | 最近错误：${Utils.formatDateTime(mistake.lastError)}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    refresh: function () {
        this.mistakes = Storage.get(Storage.keys.MISTAKES) || [];
        const mistakesList = document.getElementById('mistakesList');
        if (mistakesList) {
            mistakesList.innerHTML = this.renderMistakesList();
        }
    },

    bindEvents: function () {
        const moduleContent = document.getElementById('moduleContent');
        if (!moduleContent) return;

        moduleContent.addEventListener('change', (e) => {
            if (e.target.id === 'mistakeFilter') {
                this.currentFilter = e.target.value;
                this.refresh();
            }
        });

        moduleContent.addEventListener('click', (e) => {
            if (e.target.id === 'exportBtn') {
                this.exportMistakes();
            } else if (e.target.id === 'clearBtn') {
                if (confirm('确定要清空所有错题吗？')) {
                    Storage.set(Storage.keys.MISTAKES, []);
                    this.mistakes = [];
                    this.refresh();
                    Utils.showNotification('错题本已清空！', 'success');
                }
            } else if (e.target.dataset.action === 'retry') {
                const card = e.target.closest('.mistake-card');
                if (card) {
                    const mistakeId = parseInt(card.dataset.mistakeId);
                    const mistake = this.mistakes.find(m => m.id === mistakeId);
                    if (mistake && typeof ExercisesModule !== 'undefined') {
                        ExercisesModule.startPractice(mistake);
                    }
                }
            } else if (e.target.dataset.action === 'remove') {
                const card = e.target.closest('.mistake-card');
                if (card) {
                    const mistakeId = parseInt(card.dataset.mistakeId);
                    Storage.removeMistake(mistakeId);
                    this.mistakes = this.mistakes.filter(m => m.id !== mistakeId);
                    this.refresh();
                    Utils.showNotification('已从错题本移除！', 'success');
                }
            }
        });
    },

    exportMistakes: function () {
        if (!this.mistakes || this.mistakes.length === 0) {
            Utils.showNotification('没有错题可导出', 'warning');
            return;
        }

        const exportData = {
            exportDate: new Date().toISOString(),
            mistakes: this.mistakes
        };

        Utils.exportToJSON(exportData, `english-mistakes-${Utils.getTodayDate()}.json`);
        Utils.showNotification('错题导出成功！', 'success');
    }
};
