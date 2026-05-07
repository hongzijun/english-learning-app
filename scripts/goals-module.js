const GoalsModule = {
    goals: [],

    init: function () {
        this.goals = this.getGoals();
        this.render();
        this.bindEvents();
    },

    getGoals: function () {
        const stored = localStorage.getItem('learning_goals');
        if (stored) {
            return JSON.parse(stored);
        }
        return this.getDefaultGoals();
    },

    getDefaultGoals: function () {
        return [
            {
                id: 1,
                title: '每日学习目标',
                type: 'daily',
                description: '每天学习30分钟',
                targetValue: 30,
                currentValue: 0,
                unit: '分钟',
                startDate: Utils.getTodayDate(),
                deadline: null,
                completed: false,
                completedDate: null
            },
            {
                id: 2,
                title: '单词学习',
                type: 'words',
                description: '掌握50个新单词',
                targetValue: 50,
                currentValue: 0,
                unit: '个',
                startDate: Utils.getTodayDate(),
                deadline: null,
                completed: false,
                completedDate: null
            },
            {
                id: 3,
                title: '练习完成',
                type: 'exercises',
                description: '完成20道练习题',
                targetValue: 20,
                currentValue: 0,
                unit: '道',
                startDate: Utils.getTodayDate(),
                deadline: null,
                completed: false,
                completedDate: null
            }
        ];
    },

    saveGoals: function () {
        localStorage.setItem('learning_goals', JSON.stringify(this.goals));
    },

    render: function () {
        const moduleContent = document.getElementById('moduleContent');
        const progress = this.calculateOverallProgress();

        moduleContent.innerHTML = `
            <div class="goals-module">
                <div class="page-header mb-4">
                    <h2>🎯 学习目标</h2>
                    <p class="text-muted">设定目标，追踪进度，见证成长</p>
                </div>
                
                <div class="stats-summary grid grid-3 gap-3 mb-4">
                    <div class="card text-center">
                        <div class="stat-number text-primary">${this.goals.length}</div>
                        <div class="stat-label text-muted">总目标</div>
                    </div>
                    <div class="card text-center">
                        <div class="stat-number text-success">${this.goals.filter(g => g.completed).length}</div>
                        <div class="stat-label text-muted">已完成</div>
                    </div>
                    <div class="card text-center">
                        <div class="stat-number text-warning">${progress}%</div>
                        <div class="stat-label text-muted">总体进度</div>
                    </div>
                </div>
                
                <div class="filter-bar flex gap-2 mb-4 flex-wrap">
                    <select id="goalFilter" class="form-control" style="width: 150px;">
                        <option value="all">全部目标</option>
                        <option value="active">进行中</option>
                        <option value="completed">已完成</option>
                    </select>
                    <button class="btn btn-primary" id="addGoalBtn">
                        ➕ 添加新目标
                    </button>
                    <button class="btn btn-success" id="exportGoalsBtn">
                        📤 导出目标
                    </button>
                </div>
                
                <div class="goals-list" id="goalsList">
                    ${this.renderGoalsList()}
                </div>
                
                <div class="goal-modal" id="goalModal" style="display: none;">
                    <div class="goal-modal-content card">
                        <div class="flex-between mb-4">
                            <h3 id="goalModalTitle">添加新目标</h3>
                            <button class="btn-close" id="closeGoalModal">&times;</button>
                        </div>
                        <form id="goalForm">
                            <div class="mb-3">
                                <label class="form-label">目标标题 *</label>
                                <input type="text" class="form-control" id="goalTitle" placeholder="例如：掌握100个单词" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">目标类型</label>
                                <select class="form-control" id="goalType">
                                    <option value="daily">每日学习</option>
                                    <option value="words">单词学习</option>
                                    <option value="exercises">练习完成</option>
                                    <option value="custom">自定义</option>
                                </select>
                            </div>
                            <div class="grid grid-2 gap-3 mb-3">
                                <div>
                                    <label class="form-label">目标值 *</label>
                                    <input type="number" class="form-control" id="goalTarget" min="1" required>
                                </div>
                                <div>
                                    <label class="form-label">单位</label>
                                    <input type="text" class="form-control" id="goalUnit" placeholder="例如：个、分钟、道">
                                </div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">描述</label>
                                <textarea class="form-control" id="goalDescription" rows="3" placeholder="详细描述你的目标..."></textarea>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">截止日期（可选）</label>
                                <input type="date" class="form-control" id="goalDeadline">
                            </div>
                            <div class="flex gap-2 justify-end">
                                <button type="button" class="btn btn-secondary" id="cancelGoalBtn">取消</button>
                                <button type="submit" class="btn btn-primary">保存</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
        this.addGoalStyles();
    },

    calculateOverallProgress: function () {
        if (this.goals.length === 0) return 0;
        let totalProgress = 0;
        this.goals.forEach(goal => {
            if (goal.targetValue > 0) {
                totalProgress += (goal.currentValue / goal.targetValue) * 100;
            }
        });
        return Math.round(totalProgress / this.goals.length);
    },

    renderGoalsList: function (filter = 'all') {
        let goals = this.goals;

        if (filter === 'active') {
            goals = goals.filter(g => !g.completed);
        } else if (filter === 'completed') {
            goals = goals.filter(g => g.completed);
        }

        if (goals.length === 0) {
            return '<div class="text-center text-muted card">还没有设定目标，快来添加一个吧！🎯</div>';
        }

        return `
            <div class="grid gap-3">
                ${goals.map(goal => this.renderGoalCard(goal)).join('')}
            </div>
        `;
    },

    renderGoalCard: function (goal) {
        const progress = goal.targetValue > 0 ? Math.round((goal.currentValue / goal.targetValue) * 100) : 0;
        const isOverdue = goal.deadline && !goal.completed && new Date(goal.deadline) < new Date();
        const progressColor = isOverdue ? '#D0021B' : (progress >= 80 ? '#7ED321' : (progress >= 50 ? '#FF9500' : '#4A90E2'));

        return `
            <div class="goal-card card ${goal.completed ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}" data-goal-id="${goal.id}">
                <div class="flex-between mb-3">
                    <h4 class="mb-0">${goal.title}</h4>
                    <div class="flex gap-2">
                        ${goal.completed ? '<span class="badge badge-success">✅ 已完成</span>' : ''}
                        ${isOverdue ? '<span class="badge badge-danger">⚠️ 已过期</span>' : ''}
                    </div>
                </div>
                ${goal.description ? `<p class="text-muted mb-3">${goal.description}</p>` : ''}
                <div class="goal-progress mb-3">
                    <div class="flex-between mb-1">
                        <span>进度</span>
                        <span>${goal.currentValue} / ${goal.targetValue} ${goal.unit}</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%; background: ${progressColor};"></div>
                    </div>
                </div>
                <div class="flex-between text-sm">
                    <span class="text-muted">开始: ${goal.startDate}</span>
                    ${goal.deadline ? `<span class="text-muted">截止: ${goal.deadline}</span>` : ''}
                    ${goal.completed && goal.completedDate ? `<span class="text-success">完成: ${goal.completedDate}</span>` : ''}
                </div>
                <div class="flex gap-2 mt-3 justify-end">
                    ${!goal.completed ? `
                        <button class="btn btn-secondary btn-sm" data-action="edit">✏️ 编辑</button>
                        <button class="btn btn-success btn-sm" data-action="update">➕ 更新进度</button>
                        <button class="btn btn-primary btn-sm" data-action="complete">✅ 标记完成</button>
                    ` : ''}
                    <button class="btn btn-danger btn-sm" data-action="delete">🗑️ 删除</button>
                </div>
            </div>
        `;
    },

    addGoal: function (goalData) {
        const newGoal = {
            id: Date.now(),
            title: goalData.title,
            type: goalData.type,
            description: goalData.description,
            targetValue: parseInt(goalData.targetValue),
            currentValue: 0,
            unit: goalData.unit,
            startDate: Utils.getTodayDate(),
            deadline: goalData.deadline || null,
            completed: false,
            completedDate: null
        };
        this.goals.push(newGoal);
        this.saveGoals();
        this.refresh();
        Utils.showNotification('目标添加成功！', 'success');
    },

    updateGoalProgress: function (goalId, increment) {
        const goal = this.goals.find(g => g.id === goalId);
        if (!goal) return;

        goal.currentValue = Math.min(goal.currentValue + increment, goal.targetValue);

        if (goal.currentValue >= goal.targetValue && !goal.completed) {
            goal.completed = true;
            goal.completedDate = Utils.getTodayDate();
            Storage.addScore(100);
            Utils.showNotification('🎉 恭喜完成目标！获得100积分！', 'success');
        }

        this.saveGoals();
        this.refresh();
    },

    completeGoal: function (goalId) {
        const goal = this.goals.find(g => g.id === goalId);
        if (!goal) return;

        goal.completed = true;
        goal.completedDate = Utils.getTodayDate();
        goal.currentValue = goal.targetValue;
        Storage.addScore(100);

        this.saveGoals();
        this.refresh();
        Utils.showNotification('🎉 目标完成！获得100积分！', 'success');
    },

    deleteGoal: function (goalId) {
        if (confirm('确定要删除这个目标吗？')) {
            this.goals = this.goals.filter(g => g.id !== goalId);
            this.saveGoals();
            this.refresh();
            Utils.showNotification('目标已删除', 'success');
        }
    },

    refresh: function () {
        this.goals = this.getGoals();
        const filter = document.getElementById('goalFilter')?.value || 'all';
        document.getElementById('goalsList').innerHTML = this.renderGoalsList(filter);

        const stats = document.querySelector('.stats-summary');
        if (stats) {
            this.render();
        }
    },

    bindEvents: function () {
        document.getElementById('moduleContent').addEventListener('change', (e) => {
            if (e.target.id === 'goalFilter') {
                document.getElementById('goalsList').innerHTML = this.renderGoalsList(e.target.value);
            }
        });

        document.getElementById('moduleContent').addEventListener('click', (e) => {
            if (e.target.id === 'addGoalBtn') {
                this.showAddGoalModal();
            } else if (e.target.id === 'closeGoalModal' || e.target.id === 'cancelGoalBtn') {
                this.closeGoalModal();
            } else if (e.target.id === 'exportGoalsBtn') {
                this.exportGoals();
            } else if (e.target.dataset.action === 'update') {
                const card = e.target.closest('.goal-card');
                const goalId = parseInt(card.dataset.goalId);
                const increment = prompt('请输入要增加的进度值：', '1');
                if (increment && !isNaN(parseInt(increment))) {
                    this.updateGoalProgress(goalId, parseInt(increment));
                }
            } else if (e.target.dataset.action === 'complete') {
                const card = e.target.closest('.goal-card');
                const goalId = parseInt(card.dataset.goalId);
                if (confirm('确定要标记这个目标为完成吗？')) {
                    this.completeGoal(goalId);
                }
            } else if (e.target.dataset.action === 'delete') {
                const card = e.target.closest('.goal-card');
                const goalId = parseInt(card.dataset.goalId);
                this.deleteGoal(goalId);
            }
        });

        document.getElementById('moduleContent').addEventListener('submit', (e) => {
            if (e.target.id === 'goalForm') {
                e.preventDefault();
                const goalData = {
                    title: document.getElementById('goalTitle').value,
                    type: document.getElementById('goalType').value,
                    description: document.getElementById('goalDescription').value,
                    targetValue: document.getElementById('goalTarget').value,
                    unit: document.getElementById('goalUnit').value || '次',
                    deadline: document.getElementById('goalDeadline').value
                };
                this.addGoal(goalData);
                this.closeGoalModal();
            }
        });
    },

    showAddGoalModal: function () {
        document.getElementById('goalModal').style.display = 'flex';
        document.getElementById('goalModalTitle').textContent = '添加新目标';
        document.getElementById('goalForm').reset();
    },

    closeGoalModal: function () {
        document.getElementById('goalModal').style.display = 'none';
    },

    exportGoals: function () {
        const exportData = {
            exportDate: new Date().toISOString(),
            goals: this.goals
        };
        Utils.exportToJSON(exportData, `learning-goals-${Utils.getTodayDate()}.json`);
        Utils.showNotification('目标导出成功！', 'success');
    },

    addGoalStyles: function () {
        const style = document.createElement('style');
        style.textContent = `
            .goal-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                display: none;
                align-items: center;
                justify-content: center;
                z-index: 1000;
            }
            
            .goal-modal-content {
                max-width: 500px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;
            }
            
            .goal-card.completed {
                border: 2px solid #7ED321;
                background: linear-gradient(135deg, rgba(126, 211, 33, 0.05), white);
            }
            
            .goal-card.overdue {
                border: 2px solid #D0021B;
                background: linear-gradient(135deg, rgba(208, 2, 27, 0.05), white);
            }
            
            .goal-card {
                transition: all 0.3s ease;
            }
            
            .goal-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 24px rgba(0,0,0,0.1);
            }
        `;
        document.head.appendChild(style);
    }
};
