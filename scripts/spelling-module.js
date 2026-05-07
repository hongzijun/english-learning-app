const SpellingModule = {
    currentUnit: null,
    words: [],
    currentIndex: 0,
    score: 0,
    totalAttempts: 0,
    mistakes: [],

    init: function () {
        this.render();
        this.bindEvents();
    },

    render: function () {
        const moduleContent = document.getElementById('moduleContent');
        moduleContent.innerHTML = `
            <div class="spelling-module">
                <div class="page-header mb-4">
                    <h2>✍️ 拼写练习</h2>
                    <p class="text-muted">通过拼写练习，巩固单词记忆</p>
                </div>
                
                <div class="filter-bar flex gap-2 mb-4 flex-wrap">
                    <div class="select-wrapper" style="flex: 1; min-width: 200px;">
                        <select id="spellingUnitSelect" class="form-control">
                            <option value="">全部单词</option>
                            ${Grade7Data.units.map(unit =>
            `<option value="${unit.id}">${unit.name}</option>`
        ).join('')}
                        </select>
                    </div>
                    <div class="select-wrapper" style="width: 150px;">
                        <select id="spellingMode" class="form-control">
                            <option value="normal">普通模式</option>
                            <option value="challenge">挑战模式</option>
                        </select>
                    </div>
                    <button class="btn btn-primary" id="startSpelling">
                        🚀 开始练习
                    </button>
                </div>
                
                <div class="stats-summary grid grid-3 gap-3 mb-4">
                    <div class="card text-center">
                        <div class="stat-number text-primary">0</div>
                        <div class="stat-label text-muted">总练习</div>
                    </div>
                    <div class="card text-center">
                        <div class="stat-number text-success">0</div>
                        <div class="stat-label text-muted">正确</div>
                    </div>
                    <div class="card text-center">
                        <div class="stat-number text-warning">0</div>
                        <div class="stat-label text-muted">正确率</div>
                    </div>
                </div>
                
                <div class="spelling-practice-area" id="spellingPractice" style="display: none;">
                    <div class="card">
                        <div class="spelling-header flex-between mb-4">
                            <span class="badge badge-primary" id="spellingProgress">1 / 10</span>
                            <span class="text-lg font-bold" id="spellingScore">得分: 0</span>
                        </div>
                        
                        <div class="spelling-content text-center mb-4">
                            <div class="word-image mb-4" id="spellingImageContainer">
                                <img id="spellingImage" src="" alt="Word" style="max-width: 150px; border-radius: 8px;">
                            </div>
                            <div class="word-meaning mb-3" id="spellingMeaning">
                                <span class="text-muted">中文含义：</span>
                                <span id="meaningText" class="text-xl font-bold"></span>
                            </div>
                            <div class="word-phonetic mb-3">
                                <button class="btn btn-secondary btn-sm" id="playSpellingAudio">
                                    🔊 听发音
                                </button>
                            </div>
                            
                            <div class="spelling-input-area mb-4">
                                <input type="text" 
                                       id="spellingInput" 
                                       class="form-control text-center text-xl" 
                                       placeholder="请输入单词拼写"
                                       autocomplete="off"
                                       autocapitalize="off">
                            </div>
                            
                            <div class="spelling-hint" id="spellingHint" style="display: none;">
                                <p class="text-warning" id="hintText"></p>
                            </div>
                            
                            <div class="spelling-feedback" id="spellingFeedback" style="display: none;">
                            </div>
                        </div>
                        
                        <div class="spelling-actions flex gap-2 justify-center">
                            <button class="btn btn-secondary" id="spellingHintBtn">
                                💡 提示
                            </button>
                            <button class="btn btn-success" id="spellingSubmit">
                                ✅ 提交
                            </button>
                            <button class="btn btn-primary" id="spellingSkip">
                                ⏭️ 跳过
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="spelling-results" id="spellingResults" style="display: none;">
                    <div class="card text-center">
                        <h2 class="mb-4">🎉 练习完成！</h2>
                        <div class="results-stats grid grid-3 gap-3 mb-4">
                            <div class="card">
                                <div class="stat-number text-primary" id="finalTotal">0</div>
                                <div class="stat-label text-muted">总题数</div>
                            </div>
                            <div class="card">
                                <div class="stat-number text-success" id="finalCorrect">0</div>
                                <div class="stat-label text-muted">正确</div>
                            </div>
                            <div class="card">
                                <div class="stat-number text-warning" id="finalAccuracy">0%</div>
                                <div class="stat-label text-muted">正确率</div>
                            </div>
                        </div>
                        <div class="progress-bar mb-4">
                            <div class="progress-fill" id="finalProgress" style="width: 0%;"></div>
                        </div>
                        <p class="text-muted mb-4" id="finalMessage"></p>
                        <div class="flex gap-2 justify-center flex-wrap">
                            <button class="btn btn-primary" id="reviewMistakes">
                                📋 查看错题
                            </button>
                            <button class="btn btn-success" id="restartSpelling">
                                🔄 重新开始
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        this.addSpellingStyles();
    },

    startSpelling: function () {
        let words = Grade7Data.getAllWords();

        if (this.currentUnit) {
            words = words.filter(w => w.unitId === parseInt(this.currentUnit));
        }

        if (words.length === 0) {
            Utils.showNotification('没有符合条件的单词！', 'warning');
            return;
        }

        this.words = Utils.shuffleArray(words).slice(0, Math.min(10, words.length));
        this.currentIndex = 0;
        this.score = 0;
        this.totalAttempts = 0;
        this.mistakes = [];

        document.querySelector('.spelling-practice-area').style.display = 'block';
        document.querySelector('.filter-bar').style.display = 'none';
        document.querySelector('.stats-summary').style.display = 'none';
        document.getElementById('spellingResults').style.display = 'none';

        this.showCurrentWord();
    },

    showCurrentWord: function () {
        const word = this.words[this.currentIndex];
        const total = this.words.length;

        document.getElementById('spellingProgress').textContent = `${this.currentIndex + 1} / ${total}`;
        document.getElementById('spellingScore').textContent = `得分: ${this.score}`;

        document.getElementById('meaningText').textContent = word.meaning;
        document.getElementById('spellingImage').src = word.image;
        document.getElementById('spellingImage').onerror = function () {
            this.style.display = 'none';
        };

        document.getElementById('spellingInput').value = '';
        document.getElementById('spellingInput').focus();
        document.getElementById('spellingHint').style.display = 'none';
        document.getElementById('spellingFeedback').style.display = 'none';

        this.currentWord = word;
        this.hintLevel = 0;
    },

    checkSpelling: function () {
        const input = document.getElementById('spellingInput').value.trim().toLowerCase();
        const correct = this.currentWord.word.toLowerCase();

        this.totalAttempts++;

        if (input === correct) {
            this.score += 10;
            this.showFeedback(true);
            Storage.updateDailyChallengeProgress('learn_5_words', 1);
        } else {
            this.mistakes.push({
                word: this.currentWord,
                userAnswer: input,
                correctAnswer: correct
            });
            if (typeof DictationMistakeSync !== 'undefined') {
                DictationMistakeSync.syncMistake(this.currentWord, input, this.hintLevel > 0);
            }
            this.showFeedback(false);
        }
    },

    showFeedback: function (isCorrect) {
        const feedback = document.getElementById('spellingFeedback');
        feedback.style.display = 'block';

        if (isCorrect) {
            feedback.innerHTML = `
                <div class="feedback-correct p-3 mb-3" style="background: rgba(126, 211, 33, 0.1); border: 2px solid #7ED321; border-radius: 8px;">
                    <h3 class="text-success mb-2">✅ 正确！</h3>
                    <p class="text-lg">${this.currentWord.word}</p>
                    <p class="text-muted">${this.currentWord.phonetic}</p>
                </div>
            `;

            setTimeout(() => {
                this.nextWord();
            }, 1500);
        } else {
            feedback.innerHTML = `
                <div class="feedback-wrong p-3 mb-3" style="background: rgba(208, 2, 27, 0.1); border: 2px solid #D0021B; border-radius: 8px;">
                    <h3 class="text-danger mb-2">❌ 错误</h3>
                    <p class="text-lg">正确答案: <strong>${this.currentWord.word}</strong></p>
                    <p class="text-muted">${this.currentWord.phonetic}</p>
                </div>
            `;

            document.querySelector('.spelling-actions').innerHTML = `
                <button class="btn btn-primary" id="spellingNext">
                    ➡️ 下一题
                </button>
            `;
        }
    },

    showHint: function () {
        this.hintLevel++;
        const word = this.currentWord.word;
        const hintContainer = document.getElementById('spellingHint');
        const hintText = document.getElementById('hintText');

        hintContainer.style.display = 'block';

        if (this.hintLevel === 1) {
            hintText.textContent = `提示1：单词有 ${word.length} 个字母`;
        } else if (this.hintLevel === 2) {
            hintText.textContent = `提示2：单词以 "${word[0]}" 开头`;
        } else {
            hintText.textContent = `提示3：单词是 "${word.substring(0, Math.ceil(word.length / 2))}..."`;
        }
    },

    nextWord: function () {
        this.currentIndex++;

        if (this.currentIndex < this.words.length) {
            document.querySelector('.spelling-actions').innerHTML = `
                <button class="btn btn-secondary" id="spellingHintBtn">
                    💡 提示
                </button>
                <button class="btn btn-success" id="spellingSubmit">
                    ✅ 提交
                </button>
                <button class="btn btn-primary" id="spellingSkip">
                    ⏭️ 跳过
                </button>
            `;
            this.showCurrentWord();
        } else {
            this.showResults();
        }
    },

    showResults: function () {
        document.querySelector('.spelling-practice-area').style.display = 'none';
        document.getElementById('spellingResults').style.display = 'block';

        const correct = this.totalAttempts - this.mistakes.length;
        const accuracy = this.totalAttempts > 0 ? Math.round((correct / this.totalAttempts) * 100) : 0;

        document.getElementById('finalTotal').textContent = this.totalAttempts;
        document.getElementById('finalCorrect').textContent = correct;
        document.getElementById('finalAccuracy').textContent = accuracy + '%';
        document.getElementById('finalProgress').style.width = accuracy + '%';

        let message = '';
        if (accuracy >= 90) message = '太棒了！优秀的成绩！🎉';
        else if (accuracy >= 70) message = '很好！继续努力！👍';
        else if (accuracy >= 50) message = '还需要加强练习！💪';
        else message = '别灰心，多练习会更好！📚';

        document.getElementById('finalMessage').textContent = message;

        Storage.addLearningRecord('spelling', 0, correct, this.totalAttempts);

        const newAchievements = Storage.checkAchievements();
        if (newAchievements.length > 0) {
            newAchievements.forEach(achId => {
                const achievement = Grade7Data.achievements.find(a => a.id === achId);
                if (achievement) {
                    setTimeout(() => {
                        Utils.showNotification(`🎉 解锁成就: ${achievement.icon} ${achievement.name}`, 'success');
                    }, 500);
                }
            });
        }
    },

    playAudio: function (word) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(word);
            utterance.lang = 'en-US';
            utterance.rate = 0.7;
            speechSynthesis.speak(utterance);
        } else {
            Utils.showNotification('您的浏览器不支持语音功能', 'warning');
        }
    },

    bindEvents: function () {
        document.getElementById('moduleContent').addEventListener('change', (e) => {
            if (e.target.id === 'spellingUnitSelect') {
                this.currentUnit = e.target.value;
            }
        });

        document.getElementById('moduleContent').addEventListener('click', (e) => {
            if (e.target.id === 'startSpelling') {
                this.startSpelling();
            } else if (e.target.id === 'spellingSubmit') {
                this.checkSpelling();
            } else if (e.target.id === 'spellingHintBtn') {
                this.showHint();
            } else if (e.target.id === 'spellingSkip' || e.target.id === 'spellingNext') {
                this.nextWord();
            } else if (e.target.id === 'playSpellingAudio') {
                this.playAudio(this.currentWord.word);
            } else if (e.target.id === 'restartSpelling') {
                document.querySelector('.filter-bar').style.display = 'flex';
                document.querySelector('.stats-summary').style.display = 'grid';
                document.getElementById('spellingResults').style.display = 'none';
                this.render();
            } else if (e.target.id === 'reviewMistakes') {
                if (this.mistakes.length > 0) {
                    alert('错题：\n' + this.mistakes.map(m =>
                        `${m.word.word}\n你的答案：${m.userAnswer || '未作答'}\n正确答案：${m.correctAnswer}\n`
                    ).join('\n---\n'));
                } else {
                    Utils.showNotification('恭喜，没有错题！', 'success');
                }
            }
        });

        document.getElementById('moduleContent').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.target.id === 'spellingInput') {
                this.checkSpelling();
            }
        });
    },

    addSpellingStyles: function () {
        const style = document.createElement('style');
        style.textContent = `
            .spelling-input-area input {
                font-size: 1.5rem;
                padding: 1rem;
                text-transform: lowercase;
            }
            
            .feedback-correct {
                animation: pulse 0.5s ease;
            }
            
            .feedback-wrong {
                animation: shake 0.5s ease;
            }
            
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); }
            }
            
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-5px); }
                75% { transform: translateX(5px); }
            }
            
            .spelling-content .text-xl {
                font-size: 1.25rem;
            }
            
            .spelling-content .text-lg {
                font-size: 1.125rem;
            }
            
            .spelling-header .text-lg {
                font-size: 1.25rem;
            }
            
            .spelling-header .font-bold {
                font-weight: bold;
            }
        `;
        document.head.appendChild(style);
    }
};
