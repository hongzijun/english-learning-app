const FlashcardModule = {
    currentUnit: null,
    flashcards: [],
    currentIndex: 0,
    isFlipped: false,
    currentRating: 0,
    sessionStartTime: null,

    init: function () {
        this.render();
        this.bindEvents();
    },

    render: function () {
        const moduleContent = document.getElementById('moduleContent');
        moduleContent.innerHTML = `
            <div class="flashcard-module">
                <div class="page-header mb-4">
                    <h2>🔄 单词翻翻卡</h2>
                    <p class="text-muted">通过翻转动画，高效记忆单词</p>
                </div>
                
                <div class="filter-bar flex gap-2 mb-4 flex-wrap">
                    <div class="select-wrapper" style="flex: 1; min-width: 200px;">
                        <select id="flashcardUnitSelect" class="form-control">
                            <option value="">全部单词</option>
                            ${Grade7Data.units.map(unit =>
            `<option value="${unit.id}">${unit.name}</option>`
        ).join('')}
                        </select>
                    </div>
                    <div class="select-wrapper" style="width: 180px;">
                        <select id="flashcardFilter" class="form-control">
                            <option value="all">全部单词</option>
                            <option value="not_started">未学习</option>
                            <option value="learning">学习中</option>
                            <option value="mastered">已掌握</option>
                        </select>
                    </div>
                    <button class="btn btn-primary" id="startFlashcards">
                        🚀 开始学习
                    </button>
                </div>
                
                <div class="stats-summary grid grid-4 gap-3 mb-4">
                    <div class="card text-center">
                        <div class="stat-number text-primary">${Grade7Data.getAllWords().length}</div>
                        <div class="stat-label text-muted">总单词数</div>
                    </div>
                    <div class="card text-center">
                        <div class="stat-number text-success">${this.getMasteredCount()}</div>
                        <div class="stat-label text-muted">已掌握</div>
                    </div>
                    <div class="card text-center">
                        <div class="stat-number text-warning">${this.getLearningCount()}</div>
                        <div class="stat-label text-muted">学习中</div>
                    </div>
                    <div class="card text-center">
                        <div class="stat-number text-danger">${Storage.get(Storage.keys.FLASHCARD_SESSIONS).length}</div>
                        <div class="stat-label text-muted">学习次数</div>
                    </div>
                </div>
                
                <div class="flashcard-modal" id="flashcardModal" style="display: none;">
                    <div class="flashcard-content">
                        <div class="flashcard-header flex-between mb-4">
                            <div class="flex gap-2 align-items-center">
                                <span class="badge badge-primary" id="flashcardProgress">1 / 10</span>
                                <span class="text-muted" id="flashcardStreak">连续正确: 0</span>
                            </div>
                            <button class="btn-close" id="closeFlashcard">&times;</button>
                        </div>
                        
                        <div class="flashcard-container" id="flashcardContainer">
                            <div class="flashcard" id="flashcard">
                                <div class="flashcard-front" id="flashcardFront">
                                    <div class="word-image mb-3">
                                        <img id="wordImage" src="" alt="Word image" style="max-width: 200px; border-radius: 12px;">
                                    </div>
                                    <h2 class="word-display" id="flashcardWord">Word</h2>
                                    <p class="phonetic text-muted" id="flashcardPhonetic">/pronunciation/</p>
                                    <button class="btn btn-secondary mt-3" id="playFlashcardAudio">
                                        🔊 发音
                                    </button>
                                    <p class="text-muted mt-4" style="font-size: 0.875rem;">点击卡片查看释义</p>
                                </div>
                                <div class="flashcard-back" id="flashcardBack">
                                    <h3 class="mb-2" id="flashcardMeaning">释义</h3>
                                    <p class="text-muted mb-3" id="flashcardPartOfSpeech">词性</p>
                                    <div class="examples mb-4">
                                        <h4 class="mb-2 text-primary">📖 例句</h4>
                                        <ul id="flashcardExamples" class="list-none">
                                        </ul>
                                    </div>
                                    <div class="rating-section mb-4">
                                        <h4 class="mb-2">📝 自我评分</h4>
                                        <div class="rating-stars flex gap-1 justify-center" id="ratingStars">
                                            ${[1, 2, 3, 4, 5].map(i =>
            `<span class="star" data-rating="${i}" style="font-size: 2rem; cursor: pointer; transition: transform 0.2s;">☆</span>`
        ).join('')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="flashcard-footer flex gap-2 justify-center mt-4">
                            <button class="btn btn-danger" id="forgotBtn">
                                😵 不记得
                            </button>
                            <button class="btn btn-warning" id="hardBtn">
                                😐 有点印象
                            </button>
                            <button class="btn btn-success" id="knowBtn">
                                😊 记得很清楚
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        this.addFlashcardStyles();
    },

    getMasteredCount: function () {
        const wordStatus = Storage.get(Storage.keys.WORD_STATUS);
        return Object.values(wordStatus).filter(s => s.status === 'mastered').length;
    },

    getLearningCount: function () {
        const wordStatus = Storage.get(Storage.keys.WORD_STATUS);
        return Object.values(wordStatus).filter(s => s.status === 'learning').length;
    },

    startFlashcards: function () {
        let words = Grade7Data.getAllWords();

        if (this.currentUnit) {
            words = words.filter(w => w.unitId === parseInt(this.currentUnit));
        }

        const filter = document.getElementById('flashcardFilter').value;
        if (filter !== 'all') {
            words = words.filter(w => {
                const status = Storage.getWordStatus(w.id);
                return status.status === filter;
            });
        }

        if (words.length === 0) {
            Utils.showNotification('没有符合条件的单词！', 'warning');
            return;
        }

        this.flashcards = Utils.shuffleArray(words);
        this.currentIndex = 0;
        this.isFlipped = false;
        this.currentRating = 0;
        this.sessionStartTime = Date.now();

        document.getElementById('flashcardModal').style.display = 'flex';
        AudioSystem.playPopup({ isOpen: true });
        this.showCurrentCard();
    },

    showCurrentCard: function () {
        const word = this.flashcards[this.currentIndex];
        const total = this.flashcards.length;

        document.getElementById('flashcardProgress').textContent = `${this.currentIndex + 1} / ${total}`;
        document.getElementById('flashcardStreak').textContent = `连续正确: ${Storage.getCorrectStreak()}`;

        document.getElementById('flashcardWord').textContent = word.word;
        document.getElementById('flashcardPhonetic').textContent = word.phonetic;
        document.getElementById('wordImage').src = word.image;
        document.getElementById('wordImage').onerror = function () {
            this.style.display = 'none';
        };

        document.getElementById('flashcardMeaning').textContent = word.meaning;
        document.getElementById('flashcardPartOfSpeech').textContent = word.partOfSpeech;

        const examplesList = document.getElementById('flashcardExamples');
        examplesList.innerHTML = word.examples.map(ex =>
            `<li class="mb-2 p-2" style="background: #f8f9fa; border-radius: 4px;">${ex}</li>`
        ).join('');

        this.isFlipped = false;
        document.getElementById('flashcard').classList.remove('flipped');

        document.querySelectorAll('.star').forEach(star => {
            star.textContent = '☆';
            star.style.color = '#ccc';
        });
    },

    flipCard: function () {
        this.isFlipped = !this.isFlipped;
        document.getElementById('flashcard').classList.toggle('flipped');
    },

    rateCard: function (rating) {
        this.currentRating = rating;
        document.querySelectorAll('.star').forEach((star, index) => {
            star.textContent = index < rating ? '★' : '☆';
            star.style.color = index < rating ? '#FFD700' : '#ccc';
        });
    },

    nextCard: function (remembered) {
        const word = this.flashcards[this.currentIndex];

        if (remembered) {
            AudioSystem.playCorrect();
            const currentStreak = Storage.getCorrectStreak() + 1;
            Storage.setCorrectStreak(currentStreak);
            Storage.setWordStatus(word.id, {
                status: currentStreak >= 3 ? 'mastered' : 'learning',
                reviewCount: (Storage.getWordStatus(word.id).reviewCount || 0) + 1
            });
            Storage.addScore(10 * this.currentRating);
        } else {
            AudioSystem.playWrong();
            Storage.setCorrectStreak(0);
            Storage.setWordStatus(word.id, {
                status: 'learning'
            });
        }

        Storage.updateDailyChallengeProgress('learn_5_words', 1);

        this.currentIndex++;

        if (this.currentIndex < this.flashcards.length) {
            this.showCurrentCard();
        } else {
            this.endSession();
        }
    },

    endSession: function () {
        const sessionDuration = Math.floor((Date.now() - this.sessionStartTime) / 1000);

        Storage.addFlashcardSession({
            date: new Date().toISOString(),
            duration: sessionDuration,
            cardsReviewed: this.flashcards.length,
            correctStreak: Storage.getCorrectStreak()
        });

        Storage.addLearningRecord('flashcards', sessionDuration);

        const newAchievements = Storage.checkAchievements();
        if (newAchievements.length > 0) {
            newAchievements.forEach(achId => {
                const achievement = Grade7Data.achievements.find(a => a.id === achId);
                if (achievement) {
                    Utils.showNotification(`🎉 解锁成就: ${achievement.icon} ${achievement.name}`, 'success');
                }
            });
        }

        document.getElementById('flashcardModal').style.display = 'none';
        Utils.showNotification('学习完成！继续保持！🎉', 'success');
        this.render();
    },

    playAudio: function (word) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(word);
            utterance.lang = 'en-US';
            utterance.rate = 0.8;
            speechSynthesis.speak(utterance);
        } else {
            Utils.showNotification('您的浏览器不支持语音功能', 'warning');
        }
    },

    bindEvents: function () {
        document.getElementById('moduleContent').addEventListener('change', (e) => {
            if (e.target.id === 'flashcardUnitSelect') {
                AudioSystem.playClick();
                this.currentUnit = e.target.value;
            }
        });

        document.getElementById('moduleContent').addEventListener('click', (e) => {
            if (e.target.id === 'startFlashcards') {
                AudioSystem.playClick();
                this.startFlashcards();
            } else if (e.target.id === 'closeFlashcard') {
                AudioSystem.playClick();
                if (confirm('确定要结束学习吗？')) {
                    document.getElementById('flashcardModal').style.display = 'none';
                }
            } else if (e.target.closest('#flashcard') && !e.target.closest('button') && !e.target.classList.contains('star')) {
                AudioSystem.playFlip();
                this.flipCard();
            } else if (e.target.id === 'playFlashcardAudio') {
                AudioSystem.playClick();
                const word = this.flashcards[this.currentIndex];
                this.playAudio(word.word);
            } else if (e.target.classList.contains('star')) {
                AudioSystem.playClick();
                this.rateCard(parseInt(e.target.dataset.rating));
            } else if (e.target.id === 'forgotBtn') {
                AudioSystem.playClick();
                this.nextCard(false);
            } else if (e.target.id === 'hardBtn') {
                AudioSystem.playClick();
                this.rateCard(2);
                this.nextCard(true);
            } else if (e.target.id === 'knowBtn') {
                AudioSystem.playClick();
                if (this.currentRating === 0) this.rateCard(5);
                this.nextCard(true);
            }
        });
    },

    addFlashcardStyles: function () {
        const style = document.createElement('style');
        style.textContent = `
            .flashcard-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                animation: fadeIn 0.3s ease;
            }
            
            .flashcard-content {
                background: white;
                border-radius: 16px;
                max-width: 500px;
                width: 90%;
                padding: 2rem;
                animation: slideUp 0.3s ease;
            }
            
            .flashcard-container {
                perspective: 1000px;
                margin: 2rem 0;
            }
            
            .flashcard {
                position: relative;
                width: 100%;
                min-height: 400px;
                transform-style: preserve-3d;
                transition: transform 0.6s ease;
                cursor: pointer;
            }
            
            .flashcard.flipped {
                transform: rotateY(180deg);
            }
            
            .flashcard-front,
            .flashcard-back {
                position: absolute;
                width: 100%;
                min-height: 400px;
                backface-visibility: hidden;
                background: linear-gradient(135deg, #f8f9fa, #e9ecef);
                border-radius: 12px;
                padding: 2rem;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                box-shadow: 0 8px 24px rgba(0,0,0,0.15);
            }
            
            .flashcard-back {
                transform: rotateY(180deg);
                background: linear-gradient(135deg, #4A90E2, #357ABD);
                color: white;
            }
            
            .flashcard-back h3,
            .flashcard-back h4 {
                color: white;
            }
            
            .flashcard-back .examples {
                text-align: left;
                width: 100%;
            }
            
            .flashcard-back .examples li {
                background: rgba(255,255,255,0.1);
                border-radius: 4px;
            }
            
            .word-display {
                font-size: 3rem;
                color: var(--primary-color);
                font-weight: bold;
                margin: 1rem 0;
            }
            
            .star:hover {
                transform: scale(1.2);
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
                .flashcard-content {
                    width: 95%;
                    padding: 1.5rem;
                }
                
                .flashcard-front,
                .flashcard-back {
                    min-height: 350px;
                    padding: 1.5rem;
                }
                
                .word-display {
                    font-size: 2rem;
                }
            }
        `;
        document.head.appendChild(style);
    }
};
