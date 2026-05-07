const ExamPrepModule = {
    examDate: new Date(2026, 5, 29),
    examDates: '6月28日-29日',
    currentUnitProgress: 2,

    init: function () {
        this.render();
        this.bindEvents();
    },

    render: function () {
        const moduleContent = document.getElementById('moduleContent');
        moduleContent.innerHTML = `
            <div class="exam-prep-module">
                <div class="page-header mb-4">
                    <h2>📝 期末备考计划</h2>
                    <p class="text-muted">针对6月28日-29日考试的系统性复习方案</p>
                </div>
                
                <div class="exam-countdown card mb-4" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 2px solid #f59e0b;">
                    <div class="flex-between align-items-center">
                        <div>
                            <h3 style="margin: 0; color: #92400e;">⏰ 考试倒计时</h3>
                            <p style="margin: 0; color: #b45309; font-size: 0.875rem;">考试日期：2026年6月28日-29日</p>
                        </div>
                        <div class="countdown-display text-center">
                            <div style="font-size: 2.5rem; font-weight: 700; color: #d97706;">${this.getDaysUntilExam()}</div>
                            <div style="font-size: 0.875rem; color: #92400e;">天</div>
                        </div>
                    </div>
                </div>

                <div class="card mb-4 p-4" style="background:linear-gradient(135deg,#7c3aed,#a855f7);color:white;" id="dragonEntryExam">
                    <div style="display:flex;align-items:center;gap:1rem;">
                        <span style="font-size:2.5rem;">🐉</span>
                        <div style="flex:1;">
                            <h3 style="margin:0;font-size:1.2rem;font-weight:700;">一条龙 · 全智能学习</h3>
                            <p style="margin:0.3rem 0 0;font-size:0.82rem;opacity:0.88;line-height:1.4;">
                                AI自动规划路径 · 7种模式无缝切换 · 实时难度适配
                            </p>
                        </div>
                        <button class="btn" id="startDragonExam" style="background:rgba(255,255,255,0.2);color:white;border:1px solid rgba(255,255,255,0.4);padding:0.6rem 1.5rem;font-weight:600;font-size:0.95rem;border-radius:50px;">开始学习 →</button>
                    </div>
                </div>
                
                <div class="progress-overview card mb-4">
                    <h3 class="mb-3">📊 当前学习进度</h3>
                    <div class="progress-grid grid grid-4 gap-3">
                        <div class="progress-item text-center">
                            <div class="progress-value" style="font-size: 1.5rem; font-weight: 700; color: #10b981;">Unit 1-2</div>
                            <div class="progress-label" style="font-size: 0.875rem; color: #065f46;">已完成</div>
                        </div>
                        <div class="progress-item text-center">
                            <div class="progress-value" style="font-size: 1.5rem; font-weight: 700; color: #f59e0b;">Unit 3-4</div>
                            <div class="progress-label" style="font-size: 0.875rem; color: #92400e;">进行中</div>
                        </div>
                        <div class="progress-item text-center">
                            <div class="progress-value" style="font-size: 1.5rem; font-weight: 700; color: #94a3b8;">Unit 5-6</div>
                            <div class="progress-label" style="font-size: 0.875rem; color: #64748b;">待学习</div>
                        </div>
                        <div class="progress-item text-center">
                            <div class="progress-value" style="font-size: 1.5rem; font-weight: 700; color: #3b82f6;">66%</div>
                            <div class="progress-label" style="font-size: 0.875rem; color: #1d4ed8;">总进度</div>
                        </div>
                    </div>
                </div>
                
                <div class="quick-nav card mb-4">
                    <h3 class="mb-3">🧭 快速导航</h3>
                    <div class="nav-grid grid grid-5 gap-2">
                        <button class="quick-nav-btn card" data-nav="words">📖 单词</button>
                        <button class="quick-nav-btn card" data-nav="grammar">📝 语法</button>
                        <button class="quick-nav-btn card" data-nav="exercises">✏️ 练习</button>
                        <button class="quick-nav-btn card" data-nav="tests">📋 测试</button>
                        <button class="quick-nav-btn card" data-nav="mistakes">❌ 错题</button>
                    </div>
                </div>
                
                <div class="unit-consolidation card mb-4">
                    <h3 class="mb-3">🔧 知识点巩固</h3>
                    
                    <div class="consolidation-tabs flex gap-2 mb-3 flex-wrap">
                        <button class="btn btn-primary tab-btn active" data-tab="vocabulary">📖 单词复习</button>
                        <button class="btn btn-secondary tab-btn" data-tab="grammar">📝 语法重点</button>
                        <button class="btn btn-secondary tab-btn" data-tab="exercises">✏️ 专项练习</button>
                        <button class="btn btn-secondary tab-btn" data-tab="difficulties">🎯 难点突破</button>
                    </div>
                    
                    <div class="tab-content" id="tabContent">
                        ${this.renderVocabularyReview()}
                    </div>
                </div>
                
                <div class="mock-test-section card mb-4">
                    <h3 class="mb-3">📋 模拟测试（大量题目）</h3>
                    <div class="test-options grid grid-3 gap-3">
                        <div class="test-option card" style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border: 2px solid #3b82f6;">
                            <h4 style="margin: 0 0 0.5rem; color: #1e40af;">📝 Unit 1 测试</h4>
                            <p style="margin: 0 0 1rem; color: #374151; font-size: 0.875rem;">50道题，60分钟</p>
                            <button class="btn btn-primary" data-action="start-unit1-test">开始测试</button>
                        </div>
                        <div class="test-option card" style="background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); border: 2px solid #10b981;">
                            <h4 style="margin: 0 0 0.5rem; color: #065f46;">📝 Unit 2 测试</h4>
                            <p style="margin: 0 0 1rem; color: #374151; font-size: 0.875rem;">50道题，60分钟</p>
                            <button class="btn btn-success" data-action="start-unit2-test">开始测试</button>
                        </div>
                        <div class="test-option card" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 2px solid #f59e0b;">
                            <h4 style="margin: 0 0 0.5rem; color: #92400e;">📚 综合模拟</h4>
                            <p style="margin: 0 0 1rem; color: #374151; font-size: 0.875rem;">100道题，90分钟</p>
                            <button class="btn btn-warning" data-action="start-comprehensive-test">开始测试</button>
                        </div>
                    </div>
                    
                    <div class="test-types mt-4">
                        <h4 class="mb-3">📝 专项题型练习</h4>
                        <div class="type-grid grid grid-4 gap-2">
                            <button class="type-btn card" data-type="vocabulary">
                                <div style="font-size: 1.5rem; margin-bottom: 0.25rem;">📖</div>
                                <div style="font-size: 0.8125rem;">词汇填空</div>
                                <div style="font-size: 0.75rem; color: #94a3b8;">40题</div>
                            </button>
                            <button class="type-btn card" data-type="grammar">
                                <div style="font-size: 1.5rem; margin-bottom: 0.25rem;">📝</div>
                                <div style="font-size: 0.8125rem;">语法选择</div>
                                <div style="font-size: 0.75rem; color: #94a3b8;">60题</div>
                            </button>
                            <button class="type-btn card" data-type="reading">
                                <div style="font-size: 1.5rem; margin-bottom: 0.25rem;">📚</div>
                                <div style="font-size: 0.8125rem;">阅读理解</div>
                                <div style="font-size: 0.75rem; color: #94a3b8;">30题</div>
                            </button>
                            <button class="type-btn card" data-type="cloze">
                                <div style="font-size: 1.5rem; margin-bottom: 0.25rem;">✏️</div>
                                <div style="font-size: 0.8125rem;">完形填空</div>
                                <div style="font-size: 0.75rem; color: #94a3b8;">20题</div>
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="study-timeline card mb-4">
                    <h3 class="mb-3">📅 复习时间安排</h3>
                    <div class="timeline">
                        ${this.renderStudyTimeline()}
                    </div>
                </div>
                
                <div class="mistake-analysis card mb-4">
                    <h3 class="mb-3">📋 错题分析</h3>
                    ${this.renderMistakeAnalysis()}
                </div>
                
                <div class="key-points card">
                    <h3 class="mb-3">🎯 重点难点梳理</h3>
                    ${this.renderKeyPoints()}
                </div>
            </div>
        `;
        this.addExamPrepStyles();
    },

    getDaysUntilExam: function () {
        const today = new Date();
        const diffTime = this.examDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return Math.max(0, diffDays);
    },

    renderVocabularyReview: function () {
        const unit2Words = Grade7Data.getAllWords().filter(w => w.unitId === 2);

        return `
            <div class="vocabulary-review">
                <h4 class="mb-3">Unit 2 核心单词（${unit2Words.length}个）</h4>
                <div class="word-review-grid grid grid-3 gap-2">
                    ${unit2Words.map(word => `
                        <div class="word-review-item card" style="padding: 0.75rem;">
                            <div style="font-weight: 600; color: #1e293b; margin-bottom: 0.25rem;">${word.word}</div>
                            <div style="font-size: 0.75rem; color: #64748b; margin-bottom: 0.25rem;">${word.phonetic}</div>
                            <div style="font-size: 0.8125rem; color: #374151;">${word.partOfSpeech} ${word.meaning}</div>
                            <div class="word-review-actions mt-2">
                                <button class="btn btn-primary btn-sm" onclick="App.modules['exam-prep'].playWord(${word.id})">
                                    <span class="icon">🔊</span> 朗读
                                </button>
                                <button class="btn btn-secondary btn-sm" onclick="App.modules['exam-prep'].reviewWord(${word.id})">
                                    <span class="icon">📝</span> 复习
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="mt-3">
                    <button class="btn btn-primary" data-action="quick-review-unit2">
                        🔄 快速复习
                    </button>
                </div>
            </div>
        `;
    },

    renderGrammarReview: function () {
        var unit2Grammar = Grade7Data.getUnitById(2).grammar || [];

        var h = '<div class="grammar-review">';
        for (var gi = 0; gi < unit2Grammar.length; gi++) {
            var g = unit2Grammar[gi];
            var structArr = Array.isArray(g.structure) ? g.structure : [];
            var exArr = Array.isArray(g.examples) ? g.examples : [];
            h += '<div class="grammar-point mb-4">';
            h += '<h4 style="color: #8b5cf6; margin-bottom: 0.5rem;">\uD83D\uDCCC ' + g.title + '</h4>';
            h += '<p style="background: #f5f3ff; padding: 1rem; border-radius: 8px; margin-bottom: 0.75rem;">' + g.concept + '</p>';
            if (structArr.length) {
                h += '<div style="margin-bottom: 0.75rem;"><strong style="color: #7c3aed;">结构：</strong>';
                h += '<ul style="margin: 0.5rem 0; padding-left: 1.5rem;">';
                for (var si = 0; si < structArr.length; si++) h += '<li style="margin-bottom: 0.25rem;">' + structArr[si] + '</li>';
                h += '</ul></div>';
            }
            if (exArr.length) {
                h += '<div><strong style="color: #7c3aed;">例句：</strong>';
                h += '<ul style="margin: 0.5rem 0; padding-left: 1.5rem;">';
                for (var ei = 0; ei < exArr.length; ei++) h += '<li style="margin-bottom: 0.25rem; font-style: italic;">' + exArr[ei] + '</li>';
                h += '</ul></div>';
            }
            h += '</div>';
        }
        h += '<button class="btn btn-primary" data-action="grammar-quiz">\u270F\uFE0F 语法小测</button></div>';
        return h;
    },

    renderExercisesReview: function () {
        var unit2Exercises = Grade7Data.getUnitById(2).exercises || [];

        var h = '<div class="exercises-review">';
        h += '<h4 class="mb-3">Unit 2 专项练习（' + unit2Exercises.length + '道）</h4>';
        h += '<div class="exercise-list">';
        for (var xi = 0; xi < unit2Exercises.length; xi++) {
            var ex = unit2Exercises[xi];
            var typeLabel = ex.type === 'choice' ? '选择题' : '填空题';
            var opts = Array.isArray(ex.options) ? ex.options : [];
            h += '<div class="exercise-item card mb-2" style="padding: 1rem;">';
            h += '<div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:0.5rem;">';
            h += '<span style="background:#dbeafe;color:#1e40af;padding:0.25rem 0.5rem;border-radius:4px;font-size:0.75rem;">' + typeLabel + '</span>';
            h += '<span style="font-size:0.75rem;color:#94a3b8;">知识点：' + (ex.knowledgePoint || '') + '</span>';
            h += '</div>';
            h += '<p style="margin-bottom:0.75rem;font-weight:500;">' + (xi + 1) + '. ' + ex.question + '</p>';
            if (ex.type === 'choice' && opts.length) {
                h += '<div style="margin-bottom:0.75rem;">';
                for (var oi = 0; oi < opts.length; oi++) {
                    var bg = oi === ex.answer ? 'background:#dcfce7;border:2px solid #10b981;' : 'background:#f8f9fa;';
                    h += '<div style="padding:0.5rem;margin:0.25rem 0;border-radius:4px;' + bg + '">' + String.fromCharCode(65 + oi) + '. ' + opts[oi] + '</div>';
                }
                h += '</div>';
            }
            h += '<div style="background:#f0f9ff;padding:0.75rem;border-radius:4px;border-left:3px solid #3b82f6;">';
            h += '<strong style="color:#1d4ed8;">答案：</strong>';
            h += ex.type === 'choice' ? String.fromCharCode(65 + ex.answer) : (ex.answer || '');
            h += '<br><strong style="color:#1d4ed8;">解析：</strong>' + (ex.explanation || '') + '</div>';
            h += '</div>';
        }
        h += '</div>';
        h += '<button class="btn btn-primary mt-3" data-action="start-exercises">\uD83D\uDE80 开始练习</button></div>';
        return h;
    },

    renderDifficultiesReview: function () {
        return `
            <div class="difficulties-review">
                <h4 class="mb-3">Unit 2 难点突破</h4>
                
                <div class="difficulty-point card mb-3" style="padding: 1rem; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-left: 4px solid #f59e0b;">
                    <h5 style="color: #92400e; margin-top: 0; margin-bottom: 0.5rem;">🔴 难点1：祈使句的否定形式</h5>
                    <p style="margin-bottom: 0.5rem;"><strong>易错点：</strong>容易混淆 don't 和 not 的用法</p>
                    <div style="background: white; padding: 0.75rem; border-radius: 4px;">
                        <p style="margin-bottom: 0.25rem;"><span style="color: #ef4444;">❌ 错误：</span>Not give up!</p>
                        <p style="margin-bottom: 0.25rem;"><span style="color: #10b981;">✅ 正确：</span>Don't give up!</p>
                    </div>
                    <p style="margin-top: 0.5rem; font-size: 0.875rem; color: #92400e;">💡 记忆口诀：祈使句变否定，句首Don't要牢记！</p>
                </div>
                
                <div class="difficulty-point card mb-3" style="padding: 1rem; background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border-left: 4px solid #3b82f6;">
                    <h5 style="color: #1e40af; margin-top: 0; margin-bottom: 0.5rem;">🔵 难点2：however的用法</h5>
                    <p style="margin-bottom: 0.5rem;"><strong>易错点：</strong>however 作为转折副词时的位置</p>
                    <div style="background: white; padding: 0.75rem; border-radius: 4px;">
                        <p style="margin-bottom: 0.25rem;">位置1：句首 + 逗号</p>
                        <p style="margin-bottom: 0.5rem; padding-left: 1rem;">However, it's not easy.</p>
                        <p style="margin-bottom: 0.25rem;">位置2：句中（前后逗号）</p>
                        <p style="padding-left: 1rem;">It's not easy, however.</p>
                    </div>
                </div>
                
                <button class="btn btn-warning" data-action="difficulty-quiz">
                    🎯 难点专项测试
                </button>
            </div>
        `;
    },

    renderStudyTimeline: function () {
        const weeks = [
            { week: '第1周（4.7-4.13）', task: 'Unit 1-2 复习巩固（每天1.5小时）', status: 'current', time: '稳定学习' },
            { week: '第2周（4.14-4.20）', task: 'Unit 3-4 学习（每天1.5小时）', status: 'pending', time: '稳定学习' },
            { week: '第3周（4.21-4.27）', task: 'Unit 5-6 学习（每天1.5小时）', status: 'pending', time: '稳定学习' },
            { week: '第4周（4.28-5.4）', task: '全册单词复习（每天1.5小时）', status: 'pending', time: '稳定学习' },
            { week: '第5周（5.5-5.11）', task: '语法专项突破（每天1.5小时）', status: 'pending', time: '稳定学习' },
            { week: '第6周（5.12-5.18）', task: '综合练习（每天1.5小时）', status: 'pending', time: '稳定学习' },
            { week: '第7周（5.19-5.25）', task: '模拟测试（每天2小时）', status: 'pending', time: '稳定学习' },
            { week: '第8周（5.26-6.1）', task: '错题回顾（每天1.5小时）', status: 'pending', time: '稳定学习' },
            { week: '第9周（6.2-6.8）', task: '查漏补缺（每天1.5小时）', status: 'pending', time: '稳定学习' },
            { week: '第10周（6.9-6.15）', task: '最后冲刺（每天2小时）', status: 'pending', time: '稳定学习' },
            { week: '第11周（6.16-6.22）', task: '放松调整（每天1小时）', status: 'pending', time: '适度学习' },
            { week: '第12周（6.23-6.27）', task: '考前准备（每天1小时）', status: 'pending', time: '适度学习' }
        ];

        return `
            <div class="timeline-stats grid grid-3 gap-3 mb-4">
                <div class="stat-item card text-center">
                    <div style="font-size: 2rem; font-weight: 700; color: #3b82f6;">12</div>
                    <div style="font-size: 0.875rem; color: #666;">总周数</div>
                </div>
                <div class="stat-item card text-center">
                    <div style="font-size: 2rem; font-weight: 700; color: #10b981;">1-1.5h</div>
                    <div style="font-size: 0.875rem; color: #666;">每日学习</div>
                </div>
                <div class="stat-item card text-center">
                    <div style="font-size: 2rem; font-weight: 700; color: #f59e0b;">稳定</div>
                    <div style="font-size: 0.875rem; color: #666;">学习节奏</div>
                </div>
            </div>
            
            <div class="timeline-list">
                ${weeks.map(week => `
                    <div class="timeline-item ${week.status === 'current' ? 'current' : ''}" style="display: flex; gap: 1rem; margin-bottom: 1rem; padding: 1rem; border-radius: 8px; ${week.status === 'current' ? 'background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border: 2px solid #3b82f6;' : 'background: #f8f9fa;'};}">
                        <div style="flex-shrink: 0; width: 200px; font-weight: 600; color: ${week.status === 'current' ? '#1e40af' : '#64748b'};">
                            ${week.status === 'current' ? '📍 ' : ''}${week.week}
                        </div>
                        <div style="flex: 1;">
                            <div style="font-weight: 500; color: ${week.status === 'current' ? '#1e40af' : '#374151'}; margin-bottom: 0.25rem;">${week.task}</div>
                            <div style="font-size: 0.8125rem; color: ${week.time.includes('适度') ? '#f59e0b' : '#10b981'};">⏰ ${week.time}</div>
                        </div>
                        ${week.status === 'current' ? '<div style="flex-shrink: 0; background: #10b981; color: white; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.75rem;">进行中</div>' : ''}
                    </div>
                `).join('')}
            </div>
        `;
    },

    renderMistakeAnalysis: function () {
        const mistakes = Storage.get(Storage.keys.MISTAKES) || [];
        const unit1Mistakes = mistakes.filter(m => m.unitName && m.unitName.includes('Unit 1'));
        const unit2Mistakes = mistakes.filter(m => m.unitName && m.unitName.includes('Unit 2'));
        const allUnitMistakes = [...unit1Mistakes, ...unit2Mistakes];

        if (allUnitMistakes.length === 0) {
            return `
                <div class="no-mistakes text-center" style="padding: 2rem;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">🎉</div>
                    <p style="color: #666;">太棒了！Unit 1-2 还没有错题记录</p>
                    <p style="color: #666;">继续保持！</p>
                    <div class="mt-4">
                        <button class="btn btn-primary" data-action="start-exercises">
                            ✏️ 开始练习积累错题
                        </button>
                    </div>
                </div>
            `;
        }

        const mistakeStats = {};
        allUnitMistakes.forEach(m => {
            const type = m.type === 'choice' ? '选择题' : '填空题';
            mistakeStats[type] = (mistakeStats[type] || 0) + 1;
        });

        const knowledgePointStats = {};
        allUnitMistakes.forEach(m => {
            if (m.knowledgePoint) {
                knowledgePointStats[m.knowledgePoint] = (knowledgePointStats[m.knowledgePoint] || 0) + 1;
            }
        });

        const sortedKnowledgePoints = Object.entries(knowledgePointStats)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        return `
            <div class="mistake-stats grid grid-4 gap-3 mb-4">
                <div class="stat-item card text-center">
                    <div style="font-size: 2rem; font-weight: 700; color: #ef4444;">${allUnitMistakes.length}</div>
                    <div style="font-size: 0.875rem; color: #666;">总错题数</div>
                </div>
                <div class="stat-item card text-center">
                    <div style="font-size: 2rem; font-weight: 700; color: #3b82f6;">${mistakeStats['选择题'] || 0}</div>
                    <div style="font-size: 0.875rem; color: #666;">选择题错误</div>
                </div>
                <div class="stat-item card text-center">
                    <div style="font-size: 2rem; font-weight: 700; color: #f59e0b;">${mistakeStats['填空题'] || 0}</div>
                    <div style="font-size: 0.875rem; color: #666;">填空题错误</div>
                </div>
                <div class="stat-item card text-center">
                    <div style="font-size: 2rem; font-weight: 700; color: #8b5cf6;">Unit 1-2</div>
                    <div style="font-size: 0.875rem; color: #666;">覆盖范围</div>
                </div>
            </div>
            
            ${sortedKnowledgePoints.length > 0 ? `
            <div class="weak-points card mb-4" style="padding: 1rem; background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);">
                <h5 style="color: #991b1b; margin-top: 0; margin-bottom: 0.75rem;">📌 高频错误知识点（前5名）</h5>
                <div class="weak-list">
                    ${sortedKnowledgePoints.map(([kp, count], i) => `
                        <div class="weak-item flex-between align-items-center" style="background: white; padding: 0.75rem; border-radius: 4px; margin-bottom: 0.5rem;">
                            <div>
                                <span style="background: #fee2e2; color: #991b1b; padding: 0.125rem 0.5rem; border-radius: 4px; font-size: 0.75rem; margin-right: 0.5rem;">第${i + 1}名</span>
                                <strong>${kp}</strong>
                            </div>
                            <span style="color: #ef4444; font-weight: 600;">${count}次错误</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
            
            <div class="mistake-list">
                <h5 class="mb-3">📋 错题列表（最新10题）</h5>
                ${allUnitMistakes.slice(0, 10).map(mistake => `
                    <div class="mistake-item card mb-2" style="padding: 1rem;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                            <div class="flex gap-2">
                                <span style="background: #fee2e2; color: #991b1b; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem;">
                                    ${mistake.type === 'choice' ? '选择题' : '填空题'}
                                </span>
                                ${mistake.knowledgePoint ? `<span style="background: #fef3c7; color: #92400e; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem;">${mistake.knowledgePoint}</span>` : ''}
                            </div>
                            <span style="font-size: 0.75rem; color: #999;">错误 ${mistake.errorCount || 1} 次</span>
                        </div>
                        <p style="margin-bottom: 0.5rem; font-weight: 500;">${mistake.question}</p>
                        <div style="background: #fef2f2; padding: 0.5rem; border-radius: 4px; border-left: 3px solid #ef4444; margin-bottom: 0.5rem;">
                            <p style="margin: 0;"><strong style="color: #991b1b;">正确答案：</strong>${mistake.answer}</p>
                        </div>
                        ${mistake.explanation ? `
                        <p style="margin-top: 0.5rem; font-size: 0.875rem; color: #666;">💡 ${mistake.explanation}</p>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
            
            ${allUnitMistakes.length > 10 ? `
            <div class="text-center mt-3">
                <button class="btn btn-secondary" data-action="view-all-mistakes">
                    📄 查看全部错题 (${allUnitMistakes.length}题)
                </button>
            </div>
            ` : ''}
            
            <div class="mt-4 flex gap-2 flex-wrap">
                <button class="btn btn-danger" data-action="retry-unit1-mistakes">
                    🔄 重做Unit 1错题
                </button>
                <button class="btn btn-danger" data-action="retry-unit2-mistakes">
                    🔄 重做Unit 2错题
                </button>
                <button class="btn btn-warning" data-action="retry-all-mistakes">
                    🔄 重做全部错题
                </button>
            </div>
        `;
    },

    renderKeyPoints: function () {
        const unit1Words = Grade7Data.getAllWords().filter(w => w.unitId === 1);
        const unit2Words = Grade7Data.getAllWords().filter(w => w.unitId === 2);

        return `
            <div class="key-points-list">
                <div class="key-point-card card mb-3" style="padding: 1rem; background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);">
                    <h4 style="color: #166534; margin-top: 0; margin-bottom: 0.75rem;">📖 Unit 1 必背单词（30个）</h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 0.5rem;">
                        ${unit1Words.slice(0, 30).map(word => `
                            <div style="background: white; padding: 0.5rem; border-radius: 4px; text-align: center;">
                                <strong style="font-size: 0.875rem;">${word.word}</strong><br>
                                <span style="font-size: 0.75rem; color: #666;">${word.meaning}</span>
                            </div>
                        `).join('')}
                    </div>
                    ${unit1Words.length > 30 ? `<p class="text-center text-muted mt-2">... 还有 ${unit1Words.length - 30} 个单词</p>` : ''}
                </div>
                
                <div class="key-point-card card mb-3" style="padding: 1rem; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);">
                    <h4 style="color: #1e40af; margin-top: 0; margin-bottom: 0.75rem;">📖 Unit 2 必背单词（5个）</h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 0.75rem;">
                        ${unit2Words.map(word => `
                            <div style="background: white; padding: 0.75rem; border-radius: 8px; text-align: center;">
                                <strong style="font-size: 1rem;">${word.word}</strong><br>
                                <span style="font-size: 0.75rem; color: #64748b;">${word.phonetic}</span><br>
                                <span style="font-size: 0.8125rem; color: #374151;">${word.partOfSpeech} ${word.meaning}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="key-point-card card mb-3" style="padding: 1rem; background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);">
                    <h4 style="color: #7c3aed; margin-top: 0; margin-bottom: 0.75rem;">📝 核心语法（${Grade7Data.units.slice(0, 2).reduce((sum, u) => sum + u.grammar.length, 0)}个）</h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.75rem;">
                        ${Grade7Data.units.slice(0, 2).flatMap(unit =>
            unit.grammar.map(g => `
                                <div style="background: white; padding: 0.75rem; border-radius: 8px; border-left: 3px solid #8b5cf6;">
                                    <strong style="color: #7c3aed;">${unit.name.split(' ')[0]}</strong><br>
                                    <span style="font-size: 0.875rem;">${g.title}</span>
                                </div>
                            `)
        ).join('')}
                    </div>
                </div>
                
                <div class="key-point-card card mb-3" style="padding: 1rem; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);">
                    <h4 style="color: #92400e; margin-top: 0; margin-bottom: 0.75rem;">💡 考试技巧</h4>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                        <div style="background: white; padding: 1rem; border-radius: 8px;">
                            <h5 style="color: #92400e; margin-top: 0; margin-bottom: 0.5rem;">⏰ 时间管理</h5>
                            <ul style="margin: 0; padding-left: 1.25rem; font-size: 0.875rem; color: #666;">
                                <li style="margin-bottom: 0.25rem;">选择题：每题≤1分钟</li>
                                <li style="margin-bottom: 0.25rem;">填空题：每题≤2分钟</li>
                                <li style="margin-bottom: 0.25rem;">阅读理解：每篇≤10分钟</li>
                                <li>完形填空：每篇≤15分钟</li>
                            </ul>
                        </div>
                        <div style="background: white; padding: 1rem; border-radius: 8px;">
                            <h5 style="color: #92400e; margin-top: 0; margin-bottom: 0.5rem;">📋 答题策略</h5>
                            <ul style="margin: 0; padding-left: 1.25rem; font-size: 0.875rem; color: #666;">
                                <li style="margin-bottom: 0.25rem;">先易后难，确保基础分</li>
                                <li style="margin-bottom: 0.25rem;">仔细审题，划出关键词</li>
                                <li style="margin-bottom: 0.25rem;">相信第一感觉，不轻易改答案</li>
                                <li>答完必检查，注意拼写错误</li>
                            </ul>
                        </div>
                        <div style="background: white; padding: 1rem; border-radius: 8px;">
                            <h5 style="color: #92400e; margin-top: 0; margin-bottom: 0.5rem;">🧘 心态调整</h5>
                            <ul style="margin: 0; padding-left: 1.25rem; font-size: 0.875rem; color: #666;">
                                <li style="margin-bottom: 0.25rem;">遇到难题别慌张，先跳过</li>
                                <li style="margin-bottom: 0.25rem;">深呼吸，保持冷静</li>
                                <li style="margin-bottom: 0.25rem;">相信自己，正常发挥</li>
                                <li>考前保证充足睡眠</li>
                            </ul>
                        </div>
                        <div style="background: white; padding: 1rem; border-radius: 8px;">
                            <h5 style="color: #92400e; margin-top: 0; margin-bottom: 0.5rem;">📝 考前准备</h5>
                            <ul style="margin: 0; padding-left: 1.25rem; font-size: 0.875rem; color: #666;">
                                <li style="margin-bottom: 0.25rem;">提前准备好文具</li>
                                <li style="margin-bottom: 0.25rem;">确认考试时间和地点</li>
                                <li style="margin-bottom: 0.25rem;">考前复习错题本</li>
                                <li>不要熬夜，保持状态</li>
                            </ul>
                        </div>
                    </div>
                </div>
                
                <div class="text-center">
                    <button class="btn btn-primary" data-action="download-cheatsheet">
                        📥 下载知识点汇总PDF
                    </button>
                </div>
            </div>
        `;
    },

    bindEvents: function () {
        var self = this;
        var dragonBtn = document.getElementById('startDragonExam');
        if (dragonBtn) {
            dragonBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                window.__dragonModeRequested = true;
                console.log('[ExamPrep] 一条龙已设置，切换至智能学习');
                if (typeof App !== 'undefined') {
                    App.switchModule('smart-words');
                } else {
                    alert('App未定义！');
                }
            });
        } else {
            console.warn('[ExamPrep] 一条龙按钮未找到！');
        }

        document.getElementById('moduleContent').addEventListener('click', (e) => {
            if (e.target.classList.contains('quick-nav-btn')) {
                const nav = e.target.dataset.nav;
                if (nav === 'words') {
                    App.loadModule('words');
                } else if (nav === 'grammar') {
                    App.loadModule('grammar');
                } else if (nav === 'exercises') {
                    App.loadModule('exercises');
                } else if (nav === 'tests') {
                    Utils.showNotification('📋 测试功能即将开始！', 'info');
                } else if (nav === 'mistakes') {
                    App.loadModule('mistakes');
                }
            }

            if (e.target.classList.contains('tab-btn')) {
                document.querySelectorAll('.tab-btn').forEach(btn => {
                    btn.classList.remove('active', 'btn-primary');
                    btn.classList.add('btn-secondary');
                });
                e.target.classList.add('active', 'btn-primary');
                e.target.classList.remove('btn-secondary');

                const tab = e.target.dataset.tab;
                const tabContent = document.getElementById('tabContent');

                if (tab === 'vocabulary') {
                    tabContent.innerHTML = this.renderVocabularyReview();
                } else if (tab === 'grammar') {
                    tabContent.innerHTML = this.renderGrammarReview();
                } else if (tab === 'exercises') {
                    tabContent.innerHTML = this.renderExercisesReview();
                } else if (tab === 'difficulties') {
                    tabContent.innerHTML = this.renderDifficultiesReview();
                }
            }

            if (e.target.classList.contains('unit-tab')) {
                document.querySelectorAll('.unit-tab').forEach(btn => {
                    btn.classList.remove('active', 'btn-primary');
                    btn.classList.add('btn-secondary');
                });
                e.target.classList.add('active', 'btn-primary');
                e.target.classList.remove('btn-secondary');

                const unitId = parseInt(e.target.dataset.unit);
                const words = Grade7Data.getAllWords().filter(w => w.unitId === unitId);
                document.getElementById('wordsDisplay').innerHTML = this.renderWordGrid(words);
            }

            if (e.target.dataset.action === 'quick-review-all') {
                Utils.showNotification('🚀 开始Unit 1-2单词快速复习！', 'info');
            } else if (e.target.dataset.action === 'word-quiz') {
                Utils.showNotification('📝 开始单词小测（30题）！', 'info');
            } else if (e.target.dataset.action === 'grammar-quiz-unit1') {
                Utils.showNotification('📝 开始Unit 1语法小测（20题）！', 'info');
            } else if (e.target.dataset.action === 'grammar-quiz-unit2') {
                Utils.showNotification('📝 开始Unit 2语法小测（20题）！', 'info');
            } else if (e.target.dataset.action === 'grammar-quiz-all') {
                Utils.showNotification('📝 开始综合语法测试（50题）！', 'info');
            } else if (e.target.dataset.action === 'practice-basic') {
                Utils.showNotification('📝 开始基础练习（30题）！', 'info');
            } else if (e.target.dataset.action === 'practice-advance') {
                Utils.showNotification('📝 开始进阶练习（30题）！', 'info');
            } else if (e.target.dataset.action === 'practice-challenge') {
                Utils.showNotification('📝 开始挑战练习（20题）！', 'info');
            } else if (e.target.dataset.action === 'practice-all') {
                Utils.showNotification('📝 开始综合练习（80题）！', 'info');
            } else if (e.target.dataset.action === 'difficulty-quiz-1') {
                Utils.showNotification('🎯 开始难点1专项测试（15题）！', 'info');
            } else if (e.target.dataset.action === 'difficulty-quiz-2') {
                Utils.showNotification('🎯 开始难点2专项测试（15题）！', 'info');
            } else if (e.target.dataset.action === 'difficulty-quiz-all') {
                Utils.showNotification('🎯 开始难点综合测试（30题）！', 'info');
            } else if (e.target.dataset.action === 'start-unit1-test') {
                Utils.showNotification('📋 开始Unit 1单元测试（50题）！', 'info');
            } else if (e.target.dataset.action === 'start-unit2-test') {
                Utils.showNotification('📋 开始Unit 2单元测试（50题）！', 'info');
            } else if (e.target.dataset.action === 'start-comprehensive-test') {
                Utils.showNotification('📚 开始综合模拟测试（100题）！', 'info');
            } else if (e.target.dataset.action === 'load-more-exercises') {
                Utils.showNotification('📄 正在加载更多题目...', 'info');
            } else if (e.target.dataset.action === 'view-all-mistakes') {
                App.loadModule('mistakes');
            } else if (e.target.dataset.action === 'retry-unit1-mistakes') {
                Utils.showNotification('🔄 开始重做Unit 1错题！', 'info');
            } else if (e.target.dataset.action === 'retry-unit2-mistakes') {
                Utils.showNotification('🔄 开始重做Unit 2错题！', 'info');
            } else if (e.target.dataset.action === 'retry-all-mistakes') {
                Utils.showNotification('🔄 开始重做全部错题！', 'info');
            } else if (e.target.dataset.action === 'start-exercises') {
                App.loadModule('exercises');
            } else if (e.target.dataset.action === 'download-cheatsheet') {
                Utils.showNotification('📥 知识点汇总PDF正在生成中...', 'info');
            }

            if (e.target.classList.contains('type-btn')) {
                const type = e.target.dataset.type;
                const typeNames = { vocabulary: '词汇填空', grammar: '语法选择', reading: '阅读理解', cloze: '完形填空' };
                Utils.showNotification(`📝 开始${typeNames[type]}专项练习！`, 'info');
            }
        });
    },

    renderWordGrid: function (words) {
        if (words.length === 0) {
            return `
                <div class="text-center text-muted py-4">
                    <p>暂无单词数据</p>
                </div>
            `;
        }

        return `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 0.75rem;">
                ${words.map(word => `
                    <div style="background: white; padding: 0.75rem; border-radius: 8px; border: 1px solid #e5e7eb;">
                        <strong style="font-size: 1rem; display: block; margin-bottom: 0.25rem;">${word.word}</strong>
                        <span style="font-size: 0.75rem; color: #64748b; display: block; margin-bottom: 0.25rem;">${word.phonetic || ''}</span>
                        <span style="font-size: 0.8125rem; color: #374151;">${word.partOfSpeech || ''} ${word.meaning}</span>
                    </div>
                `).join('')}
            </div>
        `;
    },

    addExamPrepStyles: function () {
        const existingStyle = document.getElementById('exam-prep-styles');
        if (existingStyle) return;

        const style = document.createElement('style');
        style.id = 'exam-prep-styles';
        style.textContent = `
            .exam-prep-module {
                font-family: 'Arial', 'Microsoft YaHei', sans-serif;
            }
            
            .exam-countdown {
                animation: pulse 2s infinite;
            }
            
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.9; }
            }
            
            .countdown-display {
                min-width: 100px;
            }
            
            .progress-grid {
                margin-top: 1rem;
            }
            
            .tab-btn.active {
                background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
                color: white;
            }
            
            .word-review-item {
                transition: all 0.2s ease;
            }
            
            .word-review-item:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }
            
            .timeline-item.current {
                animation: highlight 2s infinite;
            }
            
            @keyframes highlight {
                0%, 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
                50% { box-shadow: 0 0 0 8px rgba(59, 130, 246, 0); }
            }
            
            .test-option {
                transition: all 0.3s ease;
            }
            
            .test-option:hover {
                transform: translateY(-4px);
                box-shadow: 0 8px 25px rgba(0,0,0,0.15);
            }
            
            @media (max-width: 767px) {
                .progress-grid {
                    grid-template-columns: repeat(2, 1fr);
                }
                
                .word-review-grid {
                    grid-template-columns: repeat(2, 1fr);
                }
                
                .test-options {
                    grid-template-columns: 1fr;
                }
            }
        `;
        document.head.appendChild(style);
    }
};

ExamPrepModule.setUnit2Complete = function () {
    const unit2Words = Grade7Data.getAllWords().filter(w => w.unitId === 2);
    unit2Words.forEach(word => {
        Storage.setWordStatus(word.id, {
            status: 'mastered',
            lastLearned: new Date().toISOString(),
            reviewCount: 3
        });
    });

    const unit2Grammar = Grade7Data.getUnitById(2).grammar;
    const grammarStatus = Storage.get(Storage.keys.GRAMMAR_STATUS) || {};
    unit2Grammar.forEach(grammar => {
        grammarStatus[grammar.id] = {
            mastered: true,
            lastReviewed: new Date().toISOString()
        };
    });
    Storage.set(Storage.keys.GRAMMAR_STATUS, grammarStatus);

    Utils.showNotification('✅ Unit 2 已标记为完成！', 'success');
};
