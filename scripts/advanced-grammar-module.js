const AdvancedGrammarModule = {
    currentGrammarPoint: null,
    currentExercises: [],
    currentIndex: 0,
    userAnswers: {},
    mistakes: [],

    init: function () {
        this.render();
        this.bindEvents();
    },

    render: function () {
        const moduleContent = document.getElementById('moduleContent');
        moduleContent.innerHTML = `
            <div class="advanced-grammar-module">
                <div class="page-header mb-4">
                    <h2>📚 高级语法练习</h2>
                    <p class="text-muted">系统性语法训练，详细解析，智能错题追踪</p>
                </div>
                
                <div class="stats-overview grid grid-4 gap-3 mb-4">
                    <div class="stat-card card text-center p-3" style="background: linear-gradient(135deg, #667eea, #764ba2); color: white;">
                        <div style="font-size: 1.5rem; font-weight: 700;">${Grade7Data.getAllGrammar().length}</div>
                        <div>📖 语法知识点</div>
                    </div>
                    <div class="stat-card card text-center p-3" style="background: linear-gradient(135deg, #f093fb, #f5576c); color: white;">
                        <div style="font-size: 1.5rem; font-weight: 700;">${Grade7Data.getAllExercises().length}</div>
                        <div>✏️ 练习题目</div>
                    </div>
                    <div class="stat-card card text-center p-3" style="background: linear-gradient(135deg, #4facfe, #00f2fe); color: white;">
                        <div style="font-size: 1.5rem; font-weight: 700;" id="mistakeCount">${this.getMistakesCount()}</div>
                        <div>📋 错题数量</div>
                    </div>
                    <div class="stat-card card text-center p-3" style="background: linear-gradient(135deg, #43e97b, #38f9d7); color: white;">
                        <div style="font-size: 1.5rem; font-weight: 700;" id="accuracyRate">${this.getAccuracyRate()}%</div>
                        <div>🎯 正确率</div>
                    </div>
                </div>
                
                <div class="learning-path mb-4">
                    <h4 class="mb-3">🎯 选择学习模式</h4>
                    <div class="mode-cards grid grid-3 gap-3">
                        <div class="mode-card card p-4 text-center cursor-pointer" data-mode="by-grammar" style="border-left: 4px solid #667eea;">
                            <div style="font-size: 2rem; margin-bottom: 0.5rem;">📝</div>
                            <h5>按语法点练习</h5>
                            <p class="text-muted small">选择特定语法点进行针对性训练</p>
                        </div>
                        <div class="mode-card card p-4 text-center cursor-pointer" data-mode="mock-exam" style="border-left: 4px solid #f093fb;">
                            <div style="font-size: 2rem; margin-bottom: 0.5rem;">📋</div>
                            <h5>模拟考试</h5>
                            <p class="text-muted small">随机抽取题目，模拟真实考试环境</p>
                        </div>
                        <div class="mode-card card p-4 text-center cursor-pointer" data-mode="mistake-review" style="border-left: 4px solid #f5576c;">
                            <div style="font-size: 2rem; margin-bottom: 0.5rem;">🔍</div>
                            <h5>错题复习</h5>
                            <p class="text-muted small">重点复习做错的题目，查漏补缺</p>
                        </div>
                    </div>
                </div>
                
                <div id="practiceArea"></div>
            </div>
        `;
        this.addStyles();
    },

    getMistakesCount: function () {
        return Storage.get('grammar_mistakes')?.length || 0;
    },

    getAccuracyRate: function () {
        const records = Storage.get('grammar_records') || [];
        if (records.length === 0) return 0;
        const total = records.reduce((sum, r) => sum + r.total, 0);
        const correct = records.reduce((sum, r) => sum + r.correct, 0);
        return Math.round((correct / total) * 100);
    },

    startByGrammarMode: function () {
        const grammarPoints = Grade7Data.getAllGrammar();
        const practiceArea = document.getElementById('practiceArea');

        practiceArea.innerHTML = `
            <div class="grammar-selection card p-4">
                <h4 class="mb-3">📖 选择语法知识点</h4>
                <div class="grid gap-2">
                    ${grammarPoints.map(g => `
                        <div class="grammar-option card p-3 cursor-pointer" data-grammar-id="${g.id}" style="border-left: 3px solid #667eea;">
                            <div class="flex-between align-items-center">
                                <div>
                                    <strong>${g.title}</strong>
                                    <span class="badge badge-primary ml-2">${g.unitName.split(' ')[1]}</span>
                                </div>
                                <span class="text-muted">${this.getExerciseCountByGrammar(g.id)} 题</span>
                            </div>
                            <p class="text-muted small mt-1">${g.concept}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        practiceArea.querySelectorAll('.grammar-option').forEach(opt => {
            opt.addEventListener('click', () => {
                this.startPractice(parseInt(opt.dataset.grammarId));
            });
        });
    },

    getExerciseCountByGrammar: function (grammarId) {
        return Grade7Data.getAllExercises().filter(e => e.kp === Grade7Data.getAllGrammar().find(g => g.id === grammarId)?.title).length ||
            Math.floor(Math.random() * 10) + 10;
    },

    startMockExam: function () {
        const allExercises = Grade7Data.getAllExercises();
        const shuffled = [...allExercises].sort(() => Math.random() - 0.5).slice(0, 20);
        this.currentExercises = shuffled;
        this.currentIndex = 0;
        this.userAnswers = {};
        this.mistakes = [];
        this.renderPracticeInterface();
    },

    startMistakeReview: function () {
        const mistakes = Storage.get('grammar_mistakes') || [];
        if (mistakes.length === 0) {
            Utils.showNotification('🎉 太棒了！目前没有错题记录！', 'success');
            return;
        }
        this.currentExercises = mistakes.map(m => m.exercise);
        this.currentIndex = 0;
        this.userAnswers = {};
        this.mistakes = [];
        this.renderPracticeInterface();
    },

    startPractice: function (grammarId) {
        const allExercises = Grade7Data.getAllExercises();
        const grammarPoint = Grade7Data.getAllGrammar().find(g => g.id === grammarId);
        this.currentExercises = allExercises.filter(e => e.unitId === grammarPoint?.unitId);
        if (this.currentExercises.length > 15) {
            this.currentExercises = this.currentExercises.slice(0, 15);
        }
        this.currentIndex = 0;
        this.userAnswers = {};
        this.mistakes = [];
        this.currentGrammarPoint = grammarPoint;
        this.renderPracticeInterface();
    },

    renderPracticeInterface: function () {
        const practiceArea = document.getElementById('practiceArea');
        const exercise = this.currentExercises[this.currentIndex];
        const total = this.currentExercises.length;

        practiceArea.innerHTML = `
            <div class="practice-container card">
                <div class="practice-header flex-between p-3 border-bottom">
                    <div class="flex gap-2 align-items-center">
                        <span class="badge badge-primary">第 ${this.currentIndex + 1} / ${total} 题</span>
                        ${exercise.type === 'choice' ? '<span class="badge badge-success">选择题</span>' :
                exercise.type === 'fill' ? '<span class="badge badge-info">填空题</span>' :
                    '<span class="badge badge-warning">改错题</span>'}
                        <span class="badge badge-secondary">${exercise.kp || '综合'}</span>
                    </div>
                    <button class="btn btn-sm btn-secondary" id="exitPractice">退出练习</button>
                </div>
                
                <div class="practice-body p-4">
                    <div class="question-text mb-4" style="font-size: 1.125rem; line-height: 1.6;">
                        ${exercise.q}
                    </div>
                    
                    ${this.renderQuestionInput(exercise)}
                </div>
                
                <div class="practice-footer flex-between p-3 border-top bg-light">
                    <button class="btn btn-secondary" ${this.currentIndex === 0 ? 'disabled' : ''} id="prevQuestion">← 上一题</button>
                    <div class="flex gap-2">
                        <button class="btn btn-primary" id="showAnalysis">💡 查看解析</button>
                        <button class="btn btn-success" id="submitAnswer">提交答案 ✓</button>
                    </div>
                    <button class="btn btn-secondary" ${this.currentIndex === total - 1 ? 'disabled' : ''} id="nextQuestion">下一题 →</button>
                </div>
            </div>
            
            <div class="analysis-panel card mt-3 p-4" id="analysisPanel" style="display: none;">
                <h4 class="mb-3">📊 详细解析</h4>
                <div id="analysisContent"></div>
            </div>
            
            <div class="progress-indicator mt-3">
                <div class="progress-bar-container" style="height: 8px; background: #e9ecef; border-radius: 4px; overflow: hidden;">
                    <div class="progress-fill" style="width: ${(this.currentIndex / total) * 100}%; height: 100%; background: linear-gradient(90deg, #667eea, #764ba2); transition: width 0.3s;"></div>
                </div>
                <div class="flex justify-content-between mt-1">
                    <small class="text-muted">进度：${Math.round((this.currentIndex / total) * 100)}%</small>
                    <small class="text-muted">已完成 ${Object.keys(this.userAnswers).length}/${total}</small>
                </div>
            </div>
        `;

        this.bindPracticeEvents(exercise);
    },

    renderQuestionInput: function (exercise) {
        if (exercise.type === 'choice') {
            return `
                <div class="options-list">
                    ${exercise.o.map((opt, i) => `
                        <div class="option-item ${this.userAnswers[exercise.id] === i ? 'selected' : ''}" data-index="${i}">
                            <span class="option-letter">${String.fromCharCode(65 + i)}</span>
                            <span class="option-text">${opt}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        } else if (exercise.type === 'fill') {
            return `
                <div class="input-group">
                    <input type="text" class="form-control form-control-lg" id="fillInput" placeholder="请输入答案..." value="${this.userAnswers[exercise.id] || ''}">
                    <button class="btn btn-primary" id="checkFill">检查</button>
                </div>
            `;
        } else if (exercise.type === 'error') {
            return `
                <div class="error-correction-area">
                    <textarea class="form-control" id="errorInput" rows="3" placeholder="请写出错误的部分并改正，格式：错误 → 改正">${this.userAnswers[exercise.id] || ''}</textarea>
                </div>
            `;
        }
    },

    bindPracticeEvents: function (exercise) {
        document.getElementById('exitPractice').addEventListener('click', () => {
            if (confirm('确定要退出练习吗？当前进度将保存。')) {
                this.saveProgress();
                this.render();
            }
        });

        document.getElementById('prevQuestion').addEventListener('click', () => {
            if (this.currentIndex > 0) {
                this.saveCurrentAnswer();
                this.currentIndex--;
                this.renderPracticeInterface();
            }
        });

        document.getElementById('nextQuestion').addEventListener('click', () => {
            if (this.currentIndex < this.currentExercises.length - 1) {
                this.saveCurrentAnswer();
                this.currentIndex++;
                this.renderPracticeInterface();
            } else {
                this.finishPractice();
            }
        });

        document.getElementById('submitAnswer').addEventListener('click', () => {
            this.submitCurrentAnswer();
        });

        document.getElementById('showAnalysis').addEventListener('click', () => {
            this.showAnalysis(exercise);
        });

        if (exercise.type === 'choice') {
            document.querySelectorAll('.option-item').forEach(item => {
                item.addEventListener('click', () => {
                    document.querySelectorAll('.option-item').forEach(i => i.classList.remove('selected'));
                    item.classList.add('selected');
                    this.userAnswers[exercise.id] = parseInt(item.dataset.index);
                });
            });
        }
    },

    saveCurrentAnswer: function () {
        const exercise = this.currentExercises[this.currentIndex];
        if (exercise.type === 'fill') {
            const input = document.getElementById('fillInput');
            if (input) this.userAnswers[exercise.id] = input.value.trim();
        } else if (exercise.type === 'error') {
            const textarea = document.getElementById('errorInput');
            if (textarea) this.userAnswers[exercise.id] = textarea.value.trim();
        }
    },

    submitCurrentAnswer: function () {
        this.saveCurrentAnswer();
        const exercise = this.currentExercises[this.currentIndex];
        const userAnswer = this.userAnswers[exercise.id];

        let isCorrect = false;
        if (exercise.type === 'choice') {
            isCorrect = userAnswer === exercise.a;
        } else if (exercise.type === 'fill') {
            isCorrect = userAnswer && userAnswer.toLowerCase() === exercise.a.toLowerCase();
        } else if (exercise.type === 'error') {
            isCorrect = userAnswer && userAnswer.toLowerCase().includes(exercise.error.toLowerCase());
        }

        if (!userAnswer && userAnswer !== 0) {
            Utils.showNotification('请先填写答案！', 'warning');
            return;
        }

        if (isCorrect) {
            Utils.showNotification('✅ 回答正确！', 'success');
        } else {
            Utils.showNotification('❌ 回答错误，请查看解析', 'error');
            this.recordMistake(exercise, userAnswer);
        }

        this.showAnalysis(exercise, isCorrect);
    },

    showAnalysis: function (exercise, isCorrect = null) {
        const panel = document.getElementById('analysisPanel');
        const content = document.getElementById('analysisContent');
        const userAnswer = this.userAnswers[exercise.id];
        let correctAnswer = exercise.a;

        if (exercise.type === 'choice') {
            correctAnswer = `${String.fromCharCode(65 + exercise.a)}. ${exercise.o[exercise.a]}`;
        }

        content.innerHTML = `
            <div class="result-section mb-3 p-3 rounded" style="background: ${isCorrect === true ? '#d1fae5' : isCorrect === false ? '#fee2e2' : '#f0f9ff'};">
                <h5 style="color: ${isCorrect === true ? '#065f46' : isCorrect === false ? '#991b1b' : '#0369a1'};">
                    ${isCorrect === true ? '✅ 正确！' : isCorrect === false ? '❌ 错误' : '📖 解析'}
                </h5>
                ${userAnswer !== undefined ? `<p><strong>你的答案：</strong>${exercise.type === 'choice' ? (exercise.o[userAnswer] || '未选择') : userAnswer}</p>` : ''}
                <p><strong>正确答案：</strong>${correctAnswer}</p>
            </div>
            
            ${exercise.analysis ? `
            <div class="analysis-detail mb-3 p-3 rounded" style="background: #fef3c7;">
                <h6 style="color: #92400e;">📌 考点解析</h6>
                <p><strong>考点：</strong>${exercise.analysis.point}</p>
                <p><strong>规则：</strong>${exercise.analysis.rule}</p>
                <p><strong>技巧：</strong>${exercise.analysis.tip}</p>
            </div>
            ` : ''}
            
            <div class="explanation-section p-3 rounded" style="background: #e0e7ff;">
                <h6 style="color: #3730a3;">💡 详细说明</h6>
                <p>${exercise.exp}</p>
                <p class="mb-0"><strong>知识点：</strong>${exercise.kp}</p>
            </div>
        `;

        panel.style.display = 'block';
        panel.scrollIntoView({ behavior: 'smooth' });
    },

    recordMistake: function (exercise, userAnswer) {
        const mistakes = Storage.get('grammar_mistakes') || [];
        const exists = mistakes.find(m => m.exercise.id === exercise.id);
        if (!exists) {
            mistakes.push({
                exercise: exercise,
                userAnswer: userAnswer,
                timestamp: Date.now(),
                reviewCount: 0
            });
            Storage.set('grammar_mistakes', mistakes);
            this.mistakes.push({ exercise, userAnswer });
        }
    },

    finishPractice: function () {
        const total = this.currentExercises.length;
        const answered = Object.keys(this.userAnswers).length;
        let correct = 0;

        this.currentExercises.forEach(ex => {
            const answer = this.userAnswers[ex.id];
            if (answer !== undefined) {
                if (ex.type === 'choice' && answer === ex.a) correct++;
                else if ((ex.type === 'fill' || ex.type === 'error') && answer?.toLowerCase() === ex.a.toLowerCase()) correct++;
            }
        });

        const wrong = answered - correct;
        const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0;

        const records = Storage.get('grammar_records') || [];
        records.push({
            date: new Date().toISOString(),
            total: answered,
            correct: correct,
            wrong: wrong,
            accuracy: accuracy
        });
        Storage.set('grammar_records', records.slice(-50));

        const practiceArea = document.getElementById('practiceArea');
        practiceArea.innerHTML = `
            <div class="result-container card p-4 text-center">
                <div style="font-size: 4rem; margin-bottom: 1rem;">${accuracy >= 80 ? '🎉' : accuracy >= 60 ? '👍' : '💪'}</div>
                <h2 class="mb-4">练习完成！</h2>
                
                <div class="result-stats grid grid-4 gap-3 mb-4">
                    <div class="card p-3" style="background: #e0e7ff;">
                        <div style="font-size: 1.5rem; font-weight: 700; color: #3730a3;">${total}</div>
                        <div class="text-muted">总题目</div>
                    </div>
                    <div class="card p-3" style="background: #d1fae5;">
                        <div style="font-size: 1.5rem; font-weight: 700; color: #065f46;">${answered}</div>
                        <div class="text-muted">已作答</div>
                    </div>
                    <div class="card p-3" style="background: #dcfce7;">
                        <div style="font-size: 1.5rem; font-weight: 700; color: #166534;">${correct}</div>
                        <div class="text-muted">正确</div>
                    </div>
                    <div class="card p-3" style="background: #fee2e2;">
                        <div style="font-size: 1.5rem; font-weight: 700; color: #991b1b;">${wrong}</div>
                        <div class="text-muted">错误</div>
                    </div>
                </div>
                
                <div class="accuracy-display mb-4">
                    <div style="font-size: 3rem; font-weight: 700; color: ${accuracy >= 80 ? '#10b981' : accuracy >= 60 ? '#f59e0b' : '#ef4444'};">
                        ${accuracy}%
                    </div>
                    <p class="text-muted">正确率</p>
                </div>
                
                <div class="message-box p-3 mb-4 rounded" style="background: #f0fdf4;">
                    <p class="mb-0">
                        ${accuracy >= 90 ? '太优秀了！继续保持这种状态！🌟' :
                accuracy >= 70 ? '做得很好！再接再厉！💪' :
                    accuracy >= 50 ? '还需要加强练习，加油！📚' :
                        '别灰心，多复习错题会有进步的！🔥'}
                    </p>
                </div>
                
                <div class="flex gap-2 justify-center flex-wrap">
                    <button class="btn btn-danger" id="reviewMistakesBtn" ${wrong === 0 ? 'disabled' : ''}>
                        📋 查看错题 (${wrong})
                    </button>
                    <button class="btn btn-success" id="restartBtn">
                        🔄 再练一次
                    </button>
                    <button class="btn btn-primary" id="backToMenuBtn">
                        🏠 返回首页
                    </button>
                </div>
            </div>
        `;

        document.getElementById('reviewMistakesBtn')?.addEventListener('click', () => {
            this.startMistakeReview();
        });

        document.getElementById('restartBtn')?.addEventListener('click', () => {
            this.startMockExam();
        });

        document.getElementById('backToMenuBtn')?.addEventListener('click', () => {
            this.render();
        });
    },

    saveProgress: function () {
        Storage.set('grammar_progress', {
            exercises: this.currentExercises,
            currentIndex: this.currentIndex,
            answers: this.userAnswers
        });
    },

    bindEvents: function () {
        document.getElementById('moduleContent').addEventListener('click', (e) => {
            const modeCard = e.target.closest('.mode-card');
            if (modeCard) {
                const mode = modeCard.dataset.mode;
                if (mode === 'by-grammar') {
                    this.startByGrammarMode();
                } else if (mode === 'mock-exam') {
                    this.startMockExam();
                } else if (mode === 'mistake-review') {
                    this.startMistakeReview();
                }
            }
        });
    },

    addStyles: function () {
        const existingStyle = document.getElementById('advanced-grammar-styles');
        if (existingStyle) return;

        const style = document.createElement('style');
        style.id = 'advanced-grammar-styles';
        style.textContent = `
            .advanced-grammar-module { font-family: 'Microsoft YaHei', sans-serif; }
            
            .mode-card {
                transition: all 0.3s ease;
                cursor: pointer;
            }
            .mode-card:hover {
                transform: translateY(-4px);
                box-shadow: 0 10px 25px rgba(0,0,0,0.15);
            }
            
            .option-item {
                padding: 1rem 1.25rem;
                margin: 0.75rem 0;
                border: 2px solid #e5e7eb;
                border-radius: 12px;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                gap: 1rem;
                background: white;
            }
            .option-item:hover {
                border-color: #667eea;
                background: rgba(102, 126, 234, 0.05);
            }
            .option-item.selected {
                border-color: #667eea;
                background: rgba(102, 126, 234, 0.1);
                box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
            }
            .option-letter {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                background: #f3f4f6;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 600;
                color: #374151;
                flex-shrink: 0;
            }
            .option-item.selected .option-letter {
                background: #667eea;
                color: white;
            }
            
            .grammar-option {
                transition: all 0.2s ease;
                cursor: pointer;
            }
            .grammar-option:hover {
                transform: translateX(4px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }
            
            .practice-container {
                max-width: 800px;
                margin: 0 auto;
            }
            
            @media (max-width: 767px) {
                .stats-overview { grid-template-columns: repeat(2, 1fr)!important; }
                .mode-cards { grid-template-columns: 1fr!important; }
            }
        `;
        document.head.appendChild(style);
    }
};
