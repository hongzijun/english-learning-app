const ExercisesModule = {
    currentUnit: null,
    currentType: 'all',
    exercises: [],
    currentIndex: 0,
    answers: {},
    startTime: null,
    isExamMode: false,

    init: function () {
        this.exercises = Grade7Data.getAllExercises();
        this.render();
        this.bindEvents();
    },

    render: function () {
        const moduleContent = document.getElementById('moduleContent');
        moduleContent.innerHTML = `
            <div class="exercises-module">
                <div class="page-header mb-4">
                    <h2>✏️ 题库练习</h2>
                    <p class="text-muted">通过练习巩固知识，提升英语水平</p>
                </div>
                
                <div class="filter-bar flex flex-col gap-2 mb-4" style="gap: 1rem;">
                    <div class="flex gap-2 flex-wrap">
                        <div class="select-wrapper" style="flex: 1; min-width: 200px;">
                            <select id="exerciseUnitSelect" class="form-control">
                                <option value="">全部单元</option>
                                ${Grade7Data.units.map(unit =>
            `<option value="${unit.id}">${unit.name}</option>`
        ).join('')}
                            </select>
                        </div>
                        <div class="select-wrapper" style="width: 150px;">
                            <select id="exerciseTypeSelect" class="form-control">
                                <option value="all">全部题型</option>
                                <option value="choice">选择题</option>
                                <option value="fill">填空题</option>
                                <option value="reading">阅读理解</option>
                            </select>
                        </div>
                        <button class="btn btn-primary" id="startPracticeBtn">
                            🚀 开始练习
                        </button>
                    </div>
                </div>
                
                <div class="exercise-list" id="exerciseList">
                    ${this.renderExerciseList()}
                </div>
                
                <div class="practice-modal" id="practiceModal" style="display: none;">
                    <div class="practice-content">
                        <div class="practice-header flex-between">
                            <div class="flex gap-2 align-items-center">
                                <span class="badge badge-primary" id="progressBadge">1 / 10</span>
                                <span class="timer" id="timer">⏱️ 00:00</span>
                            </div>
                            <button class="btn-close" id="closePractice">&times;</button>
                        </div>
                        <div class="practice-body" id="practiceBody">
                        </div>
                        <div class="practice-footer flex-between">
                            <button class="btn btn-secondary" id="prevBtn">← 上一题</button>
                            <button class="btn btn-success" id="submitBtn">提交答案</button>
                            <button class="btn btn-primary" id="nextBtn">下一题 →</button>
                        </div>
                    </div>
                </div>
                
                <div class="result-modal" id="resultModal" style="display: none;">
                    <div class="result-content text-center">
                        <h2 id="resultTitle">练习完成！</h2>
                        <div class="result-stats grid grid-3 gap-3 mt-4">
                            <div class="card">
                                <div class="stat-number text-primary" id="totalCount">0</div>
                                <div class="stat-label text-muted">总题数</div>
                            </div>
                            <div class="card">
                                <div class="stat-number text-success" id="correctCount">0</div>
                                <div class="stat-label text-muted">正确</div>
                            </div>
                            <div class="card">
                                <div class="stat-number text-danger" id="wrongCount">0</div>
                                <div class="stat-label text-muted">错误</div>
                            </div>
                        </div>
                        <div class="progress-bar mt-4 mb-4">
                            <div class="progress-fill" id="resultProgress" style="width: 0%;"></div>
                        </div>
                        <p class="text-muted mb-4" id="resultMessage"></p>
                        <div class="flex gap-2 justify-center flex-wrap">
                            <button class="btn btn-primary" id="reviewMistakesBtn">查看错题</button>
                            <button class="btn btn-success" id="restartBtn">重新练习</button>
                            <button class="btn btn-secondary" id="closeResultBtn">返回</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        this.addPracticeStyles();
    },

    renderExerciseList: function () {
        let exercises = [...this.exercises];

        if (this.currentUnit) {
            exercises = exercises.filter(e => e.unitId === parseInt(this.currentUnit));
        }

        if (this.currentType !== 'all') {
            exercises = exercises.filter(e => e.type === this.currentType);
        }

        if (exercises.length === 0) {
            return '<div class="text-center text-muted">没有找到符合条件的题目</div>';
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
            <div class="grid grid-2 gap-3">
                ${exercises.map(ex => `
                    <div class="exercise-card card" data-exercise-id="${ex.id}">
                        <div class="flex-between mb-2">
                            <span class="badge ${typeColors[ex.type]}">${typeLabels[ex.type]}</span>
                            <span class="text-muted" style="font-size: 0.875rem;">${(ex.unitName || '').split(' ')[0]}</span>
                        </div>
                        <p class="mb-2">${(ex.question || '').substring(0, 100)}${(ex.question || '').length > 100 ? '...' : ''}</p>
                        <button class="btn btn-primary btn-sm" data-action="start-one">开始练习</button>
                    </div>
                `).join('')}
            </div>
        `;
    },

    startPractice: function (singleExercise = null) {
        let practiceExercises;
        if (singleExercise) {
            practiceExercises = [singleExercise];
        } else {
            practiceExercises = [...this.exercises];
            if (this.currentUnit) {
                practiceExercises = practiceExercises.filter(e => e.unitId === parseInt(this.currentUnit));
            }
            if (this.currentType !== 'all') {
                practiceExercises = practiceExercises.filter(e => e.type === this.currentType);
            }
            practiceExercises = Utils.shuffleArray(practiceExercises);
        }

        this.currentPracticeExercises = practiceExercises;
        this.currentIndex = 0;
        this.answers = {};
        this.startTime = Date.now();

        document.getElementById('practiceModal').style.display = 'flex';
        this.renderCurrentExercise();
        this.startTimer();
    },

    renderCurrentExercise: function () {
        const exercise = this.currentPracticeExercises[this.currentIndex];
        const total = this.currentPracticeExercises.length;

        document.getElementById('progressBadge').textContent = `${this.currentIndex + 1} / ${total}`;

        const practiceBody = document.getElementById('practiceBody');

        let questionHtml = '';
        if (exercise.type === 'choice') {
            var opts = exercise.options || [];
            questionHtml = `
                <div class="question-section">
                    <h3 class="mb-3">${exercise.question}</h3>
                    <div class="options-list">
                        ${opts.map((opt, i) => `
                            <div class="option-item ${this.answers[exercise.id] === i ? 'selected' : ''}" data-index="${i}">
                                <span class="option-letter">${String.fromCharCode(65 + i)}.</span>
                                <span class="option-text">${opt}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        } else if (exercise.type === 'fill') {
            var fillDisplay = exercise.question;
            if (typeof DifficultyEngine !== 'undefined') {
                var fillData = DifficultyEngine.generateFillQuestion(exercise, DifficultyEngine.getCurrentLevel(exercise.id));
                if (fillData && fillData.displayText) fillDisplay = fillData.displayText;
            }
            questionHtml = `
                <div class="question-section">
                    <h3 class="mb-3">${fillDisplay}</h3>
                    <input type="text" class="form-control" id="fillAnswer" placeholder="请输入答案" value="${this.answers[exercise.id] || ''}">
                </div>
            `;
        } else if (exercise.type === 'reading') {
            questionHtml = `
                <div class="question-section">
                    <div class="reading-text card mb-3" style="background: #f8f9fa; white-space: pre-wrap;">${exercise.question}</div>
                    <input type="text" class="form-control" id="readingAnswer" placeholder="请输入答案" value="${this.answers[exercise.id] || ''}">
                </div>
            `;
        }

        practiceBody.innerHTML = questionHtml;

        document.getElementById('prevBtn').style.display = this.currentIndex > 0 ? 'inline-flex' : 'none';
        document.getElementById('nextBtn').style.display = this.currentIndex < total - 1 ? 'inline-flex' : 'none';
        document.getElementById('submitBtn').style.display = this.currentIndex === total - 1 ? 'inline-flex' : 'none';
    },

    startTimer: function () {
        var self = this;
        this.timerInterval = setInterval(function () {
            var timerEl = document.getElementById('timer');
            if (timerEl) {
                var elapsed = Math.floor((Date.now() - self.startTime) / 1000);
                var minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
                var seconds = (elapsed % 60).toString().padStart(2, '0');
                timerEl.textContent = '\u23F1\uFE0F ' + minutes + ':' + seconds;
            }
        }, 1000);
    },

    submitAnswers: function () {
        clearInterval(this.timerInterval);

        let correct = 0;
        let wrong = 0;
        const mistakes = [];

        this.currentPracticeExercises.forEach(ex => {
            const userAnswer = this.answers[ex.id];
            let isCorrect = false;

            if (ex.type === 'choice') {
                isCorrect = userAnswer === ex.answer;
            } else {
                isCorrect = userAnswer && userAnswer.toLowerCase().trim() === ex.answer.toLowerCase().trim();
            }

            if (isCorrect) {
                correct++;
            } else {
                wrong++;
                mistakes.push({ ...ex, userAnswer });
                Storage.addMistake(ex);
            }
        });

        const timeSpent = Math.floor((Date.now() - this.startTime) / 1000);
        Storage.addLearningRecord('exercises', timeSpent, correct, this.currentPracticeExercises.length);

        this.showResults(correct, wrong, mistakes);
    },

    showResults: function (correct, wrong, mistakes) {
        document.getElementById('practiceModal').style.display = 'none';
        document.getElementById('resultModal').style.display = 'flex';

        const total = correct + wrong;
        const percentage = Math.round((correct / total) * 100);

        document.getElementById('totalCount').textContent = total;
        document.getElementById('correctCount').textContent = correct;
        document.getElementById('wrongCount').textContent = wrong;
        document.getElementById('resultProgress').style.width = `${percentage}%`;

        let message = '';
        if (percentage >= 90) message = '太棒了！优秀的成绩！🎉';
        else if (percentage >= 70) message = '很好！继续努力！👍';
        else if (percentage >= 50) message = '还需要加强练习！💪';
        else message = '别灰心，多练习会更好！📚';

        document.getElementById('resultMessage').textContent = message;

        this.mistakesToReview = mistakes;
    },

    refresh: function () {
        document.getElementById('exerciseList').innerHTML = this.renderExerciseList();
    },

    bindEvents: function () {
        document.getElementById('moduleContent').addEventListener('change', (e) => {
            if (e.target.id === 'exerciseUnitSelect') {
                this.currentUnit = e.target.value;
                this.refresh();
            } else if (e.target.id === 'exerciseTypeSelect') {
                this.currentType = e.target.value;
                this.refresh();
            }
        });

        document.getElementById('moduleContent').addEventListener('click', (e) => {
            if (e.target.id === 'startPracticeBtn') {
                this.startPractice();
            } else if (e.target.dataset.action === 'start-one') {
                const card = e.target.closest('.exercise-card');
                const exId = parseInt(card.dataset.exerciseId);
                const exercise = this.exercises.find(ex => ex.id === exId);
                this.startPractice(exercise);
            } else if (e.target.closest('.option-item')) {
                const optionItem = e.target.closest('.option-item');
                const index = parseInt(optionItem.dataset.index);
                const exercise = this.currentPracticeExercises[this.currentIndex];
                this.answers[exercise.id] = index;
                document.querySelectorAll('.option-item').forEach(item => item.classList.remove('selected'));
                optionItem.classList.add('selected');
            } else if (e.target.id === 'prevBtn') {
                this.saveCurrentAnswer();
                this.currentIndex--;
                this.renderCurrentExercise();
            } else if (e.target.id === 'nextBtn') {
                this.saveCurrentAnswer();
                this.currentIndex++;
                this.renderCurrentExercise();
            } else if (e.target.id === 'submitBtn') {
                this.saveCurrentAnswer();
                this.submitAnswers();
            } else if (e.target.id === 'closePractice') {
                clearInterval(this.timerInterval);
                document.getElementById('practiceModal').style.display = 'none';
            } else if (e.target.id === 'restartBtn') {
                document.getElementById('resultModal').style.display = 'none';
                this.startPractice();
            } else if (e.target.id === 'closeResultBtn') {
                document.getElementById('resultModal').style.display = 'none';
            } else if (e.target.id === 'reviewMistakesBtn') {
                if (this.mistakesToReview && this.mistakesToReview.length > 0) {
                    alert('错题：\n' + this.mistakesToReview.map(m => `${m.question}\n你的答案：${m.userAnswer || '未作答'}\n正确答案：${m.answer}\n`).join('\n---\n'));
                } else {
                    Utils.showNotification('恭喜，没有错题！', 'success');
                }
            }
        });

        document.getElementById('moduleContent').addEventListener('input', (e) => {
            if (e.target.id === 'fillAnswer' || e.target.id === 'readingAnswer') {
                const exercise = this.currentPracticeExercises[this.currentIndex];
                this.answers[exercise.id] = e.target.value;
            }
        });
    },

    saveCurrentAnswer: function () {
        const exercise = this.currentPracticeExercises[this.currentIndex];
        if (exercise.type === 'fill') {
            const input = document.getElementById('fillAnswer');
            if (input) this.answers[exercise.id] = input.value;
        } else if (exercise.type === 'reading') {
            const input = document.getElementById('readingAnswer');
            if (input) this.answers[exercise.id] = input.value;
        }
    },

    addPracticeStyles: function () {
        const style = document.createElement('style');
        style.textContent = `
            .practice-modal, .result-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                animation: fadeIn 0.3s ease;
            }
            
            .practice-content, .result-content {
                background: white;
                border-radius: 12px;
                max-width: 700px;
                width: 90%;
                max-height: 85vh;
                overflow-y: auto;
                animation: slideUp 0.3s ease;
            }
            
            .practice-header, .result-header {
                padding: 1.5rem;
                border-bottom: 1px solid #e0e0e0;
                position: sticky;
                top: 0;
                background: white;
            }
            
            .practice-body {
                padding: 1.5rem;
            }
            
            .practice-footer {
                padding: 1.5rem;
                border-top: 1px solid #e0e0e0;
            }
            
            .option-item {
                padding: 1rem;
                margin: 0.5rem 0;
                border: 2px solid var(--border-color);
                border-radius: 8px;
                cursor: pointer;
                transition: var(--transition);
                display: flex;
                gap: 1rem;
                align-items: flex-start;
            }
            
            .option-item:hover {
                border-color: var(--primary-color);
                background: rgba(74, 144, 226, 0.05);
            }
            
            .option-item.selected {
                border-color: var(--primary-color);
                background: rgba(74, 144, 226, 0.1);
            }
            
            .option-letter {
                font-weight: bold;
                color: var(--primary-color);
                min-width: 24px;
            }
            
            .stat-number {
                font-size: 2.5rem;
                font-weight: bold;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes slideUp {
                from { transform: translateY(20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            
            @media (max-width: 767px) {
                .practice-content, .result-content {
                    width: 95%;
                    max-height: 95vh;
                }
            }
        `;
        document.head.appendChild(style);
    }
};
