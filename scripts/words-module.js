const WordsModule = {
    currentUnit: null,
    currentSort: 'alphabetical',
    currentFilter: 'all',
    selectedWord: null,

    init: function () {
        this.render();
        this.bindEvents();
        var self = this;
        if (typeof DataBridge !== 'undefined') {
            DataBridge.on('word:status-changed', function () { self.renderWordsList(); });
            DataBridge.on('word:mastered', function () { self.renderWordsList(); });
            DataBridge.on('unit:completed', function () { self.renderWordsList(); });
        }
    },

    render: function () {
        const moduleContent = document.getElementById('moduleContent');
        moduleContent.innerHTML = `
            <div class="words-module">
                <div class="page-header mb-4">
                    <h2>📖 单词学习</h2>
                    <p class="text-muted">按单元学习单词，掌握重点词汇</p>
                </div>
                
                <div class="filter-bar flex flex-col gap-2 mb-4" style="gap: 1rem;">
                    <div class="flex gap-2 flex-wrap">
                        <div class="select-wrapper" style="flex: 1; min-width: 200px;">
                            <select id="unitSelect" class="form-control">
                                <option value="">全部单元</option>
                                ${Grade7Data.units.map(unit =>
            `<option value="${unit.id}">${unit.name}</option>`
        ).join('')}
                            </select>
                        </div>
                        <div class="select-wrapper" style="width: 150px;">
                            <select id="sortSelect" class="form-control">
                                <option value="alphabetical">字母顺序</option>
                                <option value="frequency">使用频率</option>
                                <option value="mastery">掌握程度</option>
                            </select>
                        </div>
                        <div class="select-wrapper" style="width: 150px;">
                            <select id="filterSelect" class="form-control">
                                <option value="all">全部</option>
                                <option value="mastered">已掌握</option>
                                <option value="learning">学习中</option>
                                <option value="not_started">未学习</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <div class="words-container grid grid-3 gap-3" id="wordsList">
                    ${this.renderWordsList()}
                </div>
                
                <div class="word-detail-modal" id="wordDetailModal" style="display: none;">
                    <div class="modal-content">
                        <div class="modal-header flex-between">
                            <h3 id="modalWordTitle">单词详情</h3>
                            <button class="btn-close" id="closeModal">&times;</button>
                        </div>
                        <div class="modal-body" id="modalBody">
                        </div>
                    </div>
                </div>
            </div>
        `;
        this.addModalStyles();
    },

    renderWordsList: function () {
        let words = (typeof DataBridge !== 'undefined') ? DataBridge.query('words') : Grade7Data.getAllWords();

        if (this.currentUnit) {
            var filtered = words.filter(w => w.unitId === parseInt(this.currentUnit));
            console.log('[WordsModule] Unit:', this.currentUnit, 'Total words:', words.length, 'Filtered:', filtered.length, 'First 3:', filtered.slice(0, 3).map(w => w.w));
            words = filtered;
        }

        if (this.currentFilter !== 'all') {
            words = words.filter(w => {
                const status = Storage.getWordStatus(w.id);
                return status.status === this.currentFilter;
            });
        }

        words = this.sortWords(words);

        if (words.length === 0) {
            return '<div class="text-center text-muted col-span-3">没有找到符合条件的单词</div>';
        }

        return words.map(word => {
            const status = Storage.getWordStatus(word.id);
            const statusColors = {
                not_started: 'badge-warning',
                learning: 'badge-primary',
                mastered: 'badge-success'
            };
            const statusLabels = {
                not_started: '未学习',
                learning: '学习中',
                mastered: '已掌握'
            };

            return `
                <div class="word-card card" data-word-id="${word.id}">
                    <div class="flex-between mb-2">
                        <span class="badge ${statusColors[status.status]}">${statusLabels[status.status]}</span>
                        <span class="text-muted" style="font-size: 0.875rem;">${(word.unitName || '').split(' ')[0]}</span>
                    </div>
                    ${word.image ? `
                    <div class="word-image-container text-center mb-2">
                        <img src="${word.image}" alt="${word.word}" class="word-image" style="max-width: 120px; border-radius: 8px; margin-bottom: 0.5rem;" onerror="this.style.display='none'">
                    </div>
                    ` : ''}
                    <h3 class="word-text" style="font-size: 1.5rem; margin-bottom: 0.5rem;">${word.word}</h3>
                    <p class="phonetic text-muted" style="font-family: monospace;">${word.phonetic}</p>
                    <p class="meaning" style="margin-bottom: 1rem;">${word.partOfSpeech} ${word.meaning}</p>
                    <div class="word-actions flex gap-1 flex-wrap">
                        <button class="btn btn-primary btn-sm" data-action="play" style="padding: 0.5rem 1rem;">
                            🔊 发音
                        </button>
                        <button class="btn btn-secondary btn-sm" data-action="detail" style="padding: 0.5rem 1rem;">
                            📝 详情
                        </button>
                        <button class="btn ${status.status === 'mastered' ? 'btn-warning' : 'btn-success'} btn-sm" data-action="toggle-master" style="padding: 0.5rem 1rem;">
                            ${status.status === 'mastered' ? '📚 重新学习' : '✅ 已掌握'}
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    },

    sortWords: function (words) {
        return [...words].sort((a, b) => {
            switch (this.currentSort) {
                case 'alphabetical':
                    return (a.word || '').localeCompare(b.word || '');
                case 'frequency':
                    return b.frequency - a.frequency;
                case 'mastery':
                    const statusA = Storage.getWordStatus(a.id);
                    const statusB = Storage.getWordStatus(b.id);
                    const order = { mastered: 0, learning: 1, not_started: 2 };
                    return order[statusA.status] - order[statusB.status];
                default:
                    return 0;
            }
        });
    },

    showWordDetail: function (word) {
        const status = Storage.getWordStatus(word.id);
        const modal = document.getElementById('wordDetailModal');
        const modalTitle = document.getElementById('modalWordTitle');
        const modalBody = document.getElementById('modalBody');

        modalTitle.textContent = word.word;

        modalBody.innerHTML = `
            <div class="word-detail-content">
                ${word.image ? `
                <div class="detail-section mb-3 text-center">
                    <img src="${word.image}" alt="${word.word}" style="max-width: 150px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" onerror="this.style.display='none'">
                </div>
                ` : ''}
                
                <div class="detail-section mb-3" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1rem; border-radius: 12px;">
                    <p style="margin-bottom: 0.5rem;"><strong>音标：</strong><span class="phonetic">${word.phonetic}</span></p>
                    <p style="margin-bottom: 0.5rem;"><strong>词性：</strong>${word.partOfSpeech}</p>
                    <p style="margin-bottom: 0.5rem;"><strong>释义：</strong>${word.meaning}</p>
                    <p style="margin-bottom: 0;"><strong>使用频率：</strong>${'⭐'.repeat(word.frequency)}</p>
                </div>
                
                <div class="collapsible-section mb-2">
                    <button class="collapsible-btn w-100 text-left p-3" style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; cursor: pointer;">
                        <span style="font-weight: 600; color: #0369a1;">📖 例句</span>
                        <span style="float: right;">▼</span>
                    </button>
                    <div class="collapsible-content" style="display: none; padding: 1rem; border: 1px solid #bae6fd; border-top: none; border-radius: 0 0 8px 8px; background: white;">
                        <ul class="examples-list" style="list-style: none; padding: 0; margin: 0;">
                            ${word.examples.map((ex, i) => `<li style="padding: 0.75rem; background: ${i % 2 === 0 ? '#f8fafc' : 'white'}; border-radius: 6px; margin-bottom: 0.5rem;">${ex}</li>`).join('')}
                        </ul>
                    </div>
                </div>
                
                <div class="collapsible-section mb-2">
                    <button class="collapsible-btn w-100 text-left p-3" style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; cursor: pointer;">
                        <span style="font-weight: 600; color: #92400e;">📚 学习状态</span>
                        <span style="float: right;">▼</span>
                    </button>
                    <div class="collapsible-content" style="display: none; padding: 1rem; border: 1px solid #fcd34d; border-top: none; border-radius: 0 0 8px 8px; background: white;">
                        <div class="flex gap-2 flex-wrap justify-center">
                            <button class="btn ${status.status === 'not_started' ? 'btn-primary' : 'btn-secondary'}" data-status="not_started" style="flex: 1;">
                                未学习
                            </button>
                            <button class="btn ${status.status === 'learning' ? 'btn-primary' : 'btn-secondary'}" data-status="learning" style="flex: 1;">
                                学习中
                            </button>
                            <button class="btn ${status.status === 'mastered' ? 'btn-primary' : 'btn-secondary'}" data-status="mastered" style="flex: 1;">
                                已掌握
                            </button>
                        </div>
                    </div>
                </div>
                
                ${word.synonyms && word.synonyms.length > 0 ? `
                <div class="collapsible-section mb-2">
                    <button class="collapsible-btn w-100 text-left p-3" style="background: #d1fae5; border: 1px solid #6ee7b7; border-radius: 8px; cursor: pointer;">
                        <span style="font-weight: 600; color: #065f46;">🔤 同义词</span>
                        <span style="float: right;">▼</span>
                    </button>
                    <div class="collapsible-content" style="display: none; padding: 1rem; border: 1px solid #6ee7b7; border-top: none; border-radius: 0 0 8px 8px; background: white;">
                        <div class="flex gap-1 flex-wrap">
                            ${word.synonyms.map(syn => `<span class="badge badge-primary" style="font-size: 0.875rem; padding: 0.35rem 0.75rem;">${syn}</span>`).join('')}
                        </div>
                    </div>
                </div>
                ` : ''}
                
                ${word.antonyms && word.antonyms.length > 0 ? `
                <div class="collapsible-section mb-2">
                    <button class="collapsible-btn w-100 text-left p-3" style="background: #fce7f3; border: 1px solid #f9a8d4; border-radius: 8px; cursor: pointer;">
                        <span style="font-weight: 600; color: #9d174d;">↔️ 反义词</span>
                        <span style="float: right;">▼</span>
                    </button>
                    <div class="collapsible-content" style="display: none; padding: 1rem; border: 1px solid #f9a8d4; border-top: none; border-radius: 0 0 8px 8px; background: white;">
                        <div class="flex gap-1 flex-wrap">
                            ${word.antonyms.map(ant => `<span class="badge badge-warning" style="font-size: 0.875rem; padding: 0.35rem 0.75rem;">${ant}</span>`).join('')}
                        </div>
                    </div>
                </div>
                ` : ''}
            </div>
        `;

        modalBody.querySelectorAll('.collapsible-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const content = btn.nextElementSibling;
                const arrow = btn.querySelector('span:last-child');
                if (content.style.display === 'block') {
                    content.style.display = 'none';
                    arrow.textContent = '▼';
                } else {
                    content.style.display = 'block';
                    arrow.textContent = '▲';
                }
            });
        });

        modalBody.querySelectorAll('[data-status]').forEach(btn => {
            btn.addEventListener('click', () => {
                AudioSystem.playClick();
                Storage.setWordStatus(word.id, { status: btn.dataset.status });
                this.refresh();
                Utils.showNotification('状态已更新！', 'success');
            });
        });

        modal.style.display = 'flex';
        AudioSystem.playPopup({ isOpen: true });
    },

    playAudio: function (word) {
        if ('speechSynthesis' in window) {
            speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(word);
            utterance.lang = 'en-US';
            utterance.rate = 1.2;
            utterance.pitch = 1;
            utterance.volume = 1;
            speechSynthesis.speak(utterance);
        } else {
            Utils.showNotification('您的浏览器不支持语音功能', 'warning');
        }
    },

    refresh: function () {
        document.getElementById('wordsList').innerHTML = this.renderWordsList();
    },

    bindEvents: function () {
        document.getElementById('moduleContent').addEventListener('change', (e) => {
            if (e.target.id === 'unitSelect') {
                AudioSystem.playClick();
                this.currentUnit = e.target.value;
                this.refresh();
            } else if (e.target.id === 'sortSelect') {
                AudioSystem.playClick();
                this.currentSort = e.target.value;
                this.refresh();
            } else if (e.target.id === 'filterSelect') {
                AudioSystem.playClick();
                this.currentFilter = e.target.value;
                this.refresh();
            }
        });

        document.getElementById('moduleContent').addEventListener('click', (e) => {
            const wordCard = e.target.closest('.word-card');
            if (!wordCard) return;

            const wordId = parseInt(wordCard.dataset.wordId);
            const word = ((typeof DataBridge !== 'undefined') ? DataBridge.query('words') : Grade7Data.getAllWords()).find(w => w.id === wordId);

            if (e.target.dataset.action === 'play') {
                AudioSystem.playClick();
                this.playAudio(word.word);
            } else if (e.target.dataset.action === 'detail') {
                AudioSystem.playClick();
                this.showWordDetail(word);
            } else if (e.target.dataset.action === 'toggle-master') {
                AudioSystem.playClick();
                const currentStatus = Storage.getWordStatus(word.id);
                const newStatus = currentStatus.status === 'mastered' ? 'learning' : 'mastered';
                Storage.setWordStatus(word.id, { status: newStatus });
                this.refresh();
                Utils.showNotification(newStatus === 'mastered' ? '太棒了！已标记为掌握！' : '继续学习！', 'success');
            }
        });

        document.getElementById('moduleContent').addEventListener('click', (e) => {
            if (e.target.id === 'closeModal' || e.target.id === 'wordDetailModal') {
                AudioSystem.playClick();
                document.getElementById('wordDetailModal').style.display = 'none';
            }
        });
    },

    addModalStyles: function () {
        const style = document.createElement('style');
        style.textContent = `
            .word-detail-modal {
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
            
            .modal-content {
                background: white;
                border-radius: 12px;
                max-width: 600px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
                animation: slideUp 0.3s ease;
            }
            
            .modal-header {
                padding: 1.5rem;
                border-bottom: 1px solid #e0e0e0;
                position: sticky;
                top: 0;
                background: white;
            }
            
            .btn-close {
                background: none;
                border: none;
                font-size: 2rem;
                cursor: pointer;
                color: #999;
            }
            
            .modal-body {
                padding: 1.5rem;
            }
            
            .detail-section h4 {
                color: var(--primary-color);
            }
            
            .examples-list {
                list-style: none;
                padding: 0;
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
                .modal-content {
                    width: 95%;
                    max-height: 90vh;
                }
            }
        `;
        document.head.appendChild(style);
    }
};
