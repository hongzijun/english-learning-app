const GrammarModule = {
    currentUnit: null,
    grammarPoints: [],

    init: function () {
        this.grammarPoints = Grade7Data.getAllGrammar();
        this.render();
        this.bindEvents();
    },

    render: function () {
        const moduleContent = document.getElementById('moduleContent');
        moduleContent.innerHTML = `
            <div class="grammar-module">
                <div class="page-header mb-4">
                    <h2>📝 语法学习</h2>
                    <p class="text-muted">系统学习语法知识，打好语言基础</p>
                </div>
                
                <div class="filter-bar mb-4">
                    <div class="select-wrapper" style="max-width: 400px;">
                        <select id="grammarUnitSelect" class="form-control">
                            <option value="">全部单元</option>
                            ${Grade7Data.units.map(unit =>
            `<option value="${unit.id}">${unit.name}</option>`
        ).join('')}
                        </select>
                    </div>
                </div>
                
                <div class="grammar-list" id="grammarList">
                    ${this.renderGrammarList()}
                </div>
            </div>
        `;
    },

    renderGrammarList: function () {
        let grammar = [...this.grammarPoints];

        if (this.currentUnit) {
            grammar = grammar.filter(g => g.unitId === parseInt(this.currentUnit));
        }

        if (grammar.length === 0) {
            return '<div class="text-center text-muted">没有找到语法知识点</div>';
        }

        return `
            <div class="grid gap-3">
                ${grammar.map(g => {
            const status = Storage.get(Storage.keys.GRAMMAR_STATUS) || {};
            const learned = status[g.id];

            return `
                        <div class="grammar-card card" data-grammar-id="${g.id}">
                            <div class="flex-between mb-2">
                                <h3 class="card-title mb-0">${g.title}</h3>
                                <span class="badge ${learned ? 'badge-success' : 'badge-warning'}">
                                    ${learned ? '已学习' : '未学习'}
                                </span>
                            </div>
                            <p class="text-muted mb-2">${g.unitName}</p>
                            
                            <div class="grammar-section mb-3">
                                <h4 class="mb-2 text-primary">📚 基本概念</h4>
                                <p>${g.concept}</p>
                            </div>
                            
                            <div class="grammar-section mb-3">
                                <h4 class="mb-2 text-primary">✏️ 结构分析</h4>
                                <ul>
                                    ${(Array.isArray(g.structure) ? g.structure : [g.structure]).map(s => `<li class="mb-1">${s}</li>`).join('')}
                                </ul>
                            </div>
                            
                            <div class="grammar-section mb-3">
                                <h4 class="mb-2 text-primary">📖 例句解析</h4>
                                <ul>
                                    ${g.examples.map(ex => `<li class="mb-1" style="padding: 0.5rem; background: #f8f9fa; border-radius: 4px;">${ex}</li>`).join('')}
                                </ul>
                            </div>
                            
                            <div class="flex gap-2">
                                <button class="btn btn-primary" data-action="practice">
                                    🎯 配套练习
                                </button>
                                <button class="btn ${learned ? 'btn-warning' : 'btn-success'}" data-action="toggle-learned">
                                    ${learned ? '📚 标记未学习' : '✅ 标记已学习'}
                                </button>
                            </div>
                        </div>
                    `;
        }).join('')}
            </div>
        `;
    },

    refresh: function () {
        document.getElementById('grammarList').innerHTML = this.renderGrammarList();
    },

    bindEvents: function () {
        document.getElementById('moduleContent').addEventListener('change', (e) => {
            if (e.target.id === 'grammarUnitSelect') {
                this.currentUnit = e.target.value;
                this.refresh();
            }
        });

        document.getElementById('moduleContent').addEventListener('click', (e) => {
            const card = e.target.closest('.grammar-card');
            if (!card) return;

            const grammarId = parseInt(card.dataset.grammarId);

            if (e.target.dataset.action === 'toggle-learned') {
                const status = Storage.get(Storage.keys.GRAMMAR_STATUS) || {};
                status[grammarId] = !status[grammarId];
                Storage.set(Storage.keys.GRAMMAR_STATUS, status);
                this.refresh();
                Utils.showNotification(status[grammarId] ? '已标记为已学习！' : '已标记为未学习！', 'success');
            } else if (e.target.dataset.action === 'practice') {
                const grammar = this.grammarPoints.find(g => g.id === grammarId);
                const unit = Grade7Data.getUnitById(grammar.unitId);
                if (unit && unit.exercises.length > 0) {
                    Utils.showNotification('跳转到练习模块...', 'info');
                    setTimeout(() => {
                        document.querySelector('[data-module="exercises"]').click();
                    }, 500);
                } else {
                    Utils.showNotification('暂无配套练习', 'warning');
                }
            }
        });
    }
};
