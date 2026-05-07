const AssistantModule = {
    chatHistory: [],
    quickSuggestions: [
        '如何高效记忆单词？',
        '今天应该复习什么？',
        '推荐一些学习方法',
        '如何制定学习计划？',
        '语法知识点总结',
        '我的学习进度如何？'
    ],

    init: function () {
        this.render();
        this.bindEvents();
    },

    render: function () {
        const moduleContent = document.getElementById('moduleContent');
        const learningStats = this.getLearningStats();

        moduleContent.innerHTML = `
            <div class="assistant-module">
                <div class="page-header mb-4">
                    <h2>🤖 学习助手</h2>
                    <p class="text-muted">智能助手，随时为您解答学习疑问</p>
                </div>
                
                <div class="assistant-dashboard grid grid-3 gap-3 mb-4">
                    <div class="card text-center">
                        <div class="icon-large mb-2" style="font-size: 2.5rem;">📊</div>
                        <div class="stat-number text-primary">${learningStats.totalWords}</div>
                        <div class="stat-label text-muted">学习单词</div>
                    </div>
                    <div class="card text-center">
                        <div class="icon-large mb-2" style="font-size: 2.5rem;">✅</div>
                        <div class="stat-number text-success">${learningStats.masteredWords}</div>
                        <div class="stat-label text-muted">已掌握</div>
                    </div>
                    <div class="card text-center">
                        <div class="icon-large mb-2" style="font-size: 2.5rem;">🔥</div>
                        <div class="stat-number text-warning">${Storage.getStreak()}</div>
                        <div class="stat-label text-muted">连续学习</div>
                    </div>
                </div>
                
                <div class="quick-suggestions card mb-4">
                    <h4 class="card-title mb-3">💡 快速问题</h4>
                    <div class="suggestions-grid grid grid-2 gap-2">
                        ${this.quickSuggestions.map((suggestion, index) => `
                            <button class="suggestion-btn btn btn-secondary text-left" data-suggestion="${index}">
                                ${suggestion}
                            </button>
                        `).join('')}
                    </div>
                </div>
                
                <div class="assistant-chat card mb-4">
                    <div class="chat-header card-title mb-3">
                        <h4>💬 对话助手</h4>
                    </div>
                    <div class="chat-messages" id="chatMessages">
                        ${this.renderChatMessages()}
                    </div>
                    <div class="chat-input flex gap-2">
                        <input type="text" class="form-control" id="chatInput" placeholder="输入您的问题...">
                        <button class="btn btn-primary" id="sendBtn">
                            📤 发送
                        </button>
                    </div>
                </div>
                
                <div class="learning-tips card">
                    <h4 class="card-title mb-3">📚 今日学习建议</h4>
                    <div class="tips-list">
                        ${this.renderLearningTips()}
                    </div>
                </div>
            </div>
        `;
        this.addAssistantStyles();
    },

    getLearningStats: function () {
        const wordStatus = Storage.get(Storage.keys.WORD_STATUS);
        const allWords = Grade7Data.getAllWords().length;
        const masteredCount = Object.values(wordStatus).filter(s => s.status === 'mastered').length;

        return {
            totalWords: allWords,
            masteredWords: masteredCount
        };
    },

    renderChatMessages: function () {
        if (this.chatHistory.length === 0) {
            return `
                <div class="chat-message assistant">
                    <div class="message-avatar">🤖</div>
                    <div class="message-content">
                        <p>你好！我是你的英语学习助手！有什么我可以帮助你的吗？</p>
                        <p class="text-sm text-muted mt-2">你可以问我关于单词、语法、学习方法等问题。</p>
                    </div>
                </div>
            `;
        }

        return this.chatHistory.map(msg => `
            <div class="chat-message ${msg.isUser ? 'user' : 'assistant'}">
                <div class="message-avatar">${msg.isUser ? '👤' : '🤖'}</div>
                <div class="message-content">
                    <p>${msg.content}</p>
                </div>
            </div>
        `).join('');
    },

    renderLearningTips: function () {
        const tips = [
            { icon: '🎯', title: '重点复习', content: '重点复习今天学习的单词，巩固记忆' },
            { icon: '⏰', title: '学习时长', content: '建议每天学习30-45分钟，效果最佳' },
            { icon: '🔄', title: '及时复习', content: '根据艾宾浩斯记忆曲线，及时复习效果更好' },
            { icon: '✍️', title: '拼写练习', content: '通过拼写练习加深单词记忆' }
        ];

        return tips.map(tip => `
            <div class="tip-item flex gap-3 align-items-start p-3 mb-2" style="background: #f8f9fa; border-radius: 8px;">
                <div class="tip-icon" style="font-size: 1.5rem; flex-shrink: 0;">${tip.icon}</div>
                <div class="tip-content">
                    <h5 class="mb-1">${tip.title}</h5>
                    <p class="text-muted mb-0">${tip.content}</p>
                </div>
            </div>
        `).join('');
    },

    sendMessage: function (message) {
        if (!message.trim()) return;

        this.chatHistory.push({
            isUser: true,
            content: message,
            timestamp: new Date()
        });

        this.renderChat();

        setTimeout(() => {
            const response = this.getAssistantResponse(message);
            this.chatHistory.push({
                isUser: false,
                content: response,
                timestamp: new Date()
            });
            this.renderChat();
        }, 800);
    },

    getAssistantResponse: function (message) {
        const lowercaseMessage = message.toLowerCase();

        if (lowercaseMessage.includes('单词') && lowercaseMessage.includes('记忆')) {
            return this.getWordMemoryTips();
        } else if (lowercaseMessage.includes('复习')) {
            return this.getReviewAdvice();
        } else if (lowercaseMessage.includes('学习方法') || lowercaseMessage.includes('方法')) {
            return this.getLearningMethods();
        } else if (lowercaseMessage.includes('计划') || lowercaseMessage.includes('学习计划')) {
            return this.getStudyPlanAdvice();
        } else if (lowercaseMessage.includes('语法')) {
            return this.getGrammarHelp();
        } else if (lowercaseMessage.includes('进度') || lowercaseMessage.includes('如何')) {
            return this.getProgressAnalysis();
        } else {
            return this.getDefaultResponse();
        }
    },

    getWordMemoryTips: function () {
        return `📚 单词记忆小贴士：

1. **联想记忆法**：将单词与具体事物或场景联系起来
2. **词根词缀**：学习常见的词根和词缀，举一反三
3. **重复复习**：遵循艾宾浩斯记忆曲线，及时复习
4. **使用场景**：在句子和文章中学习单词
5. **多感官学习**：看、读、写、听结合使用

试试看我们的"单词翻翻卡"和"拼写练习"功能！`;
    },

    getReviewAdvice: function () {
        const wordStatus = Storage.get(Storage.keys.WORD_STATUS);
        const learningWords = Object.entries(wordStatus).filter(([_, s]) => s.status === 'learning');

        let advice = '📅 今天的复习建议：\n\n';

        if (learningWords.length > 0) {
            advice += `你有 ${learningWords.length} 个单词正在学习中，建议重点复习这些单词。\n\n`;
        }

        advice += `**复习策略**：
1. 先复习昨天学习的内容
2. 再复习3天前学习的内容
3. 最后复习7天前学习的内容

去"复习计划"模块开始复习吧！`;

        return advice;
    },

    getLearningMethods: function () {
        return `🎯 高效学习方法：

1. **番茄工作法**：学习25分钟，休息5分钟
2. **主动回忆**：尝试回忆而非反复阅读
3. **分散学习**：每天学习一点，比一次学很多更有效
4. **教授他人**：尝试把学到的知识讲给别人听
5. **测试自己**：定期进行自我测试

我们的应用支持这些学习方法，试试看吧！`;
    },

    getStudyPlanAdvice: function () {
        return `📋 学习计划建议：

**每日计划**：
- 10分钟：复习昨天学习的单词
- 20分钟：学习10-15个新单词
- 10分钟：做一些练习题
- 5分钟：总结今天的学习内容

**每周计划**：
- 周一至周五：每天学习新内容
- 周六：复习本周学习的所有内容
- 周日：做一套综合练习

去"学习目标"模块设定你的目标吧！`;
    },

    getGrammarHelp: function () {
        return `📝 语法学习建议：

我们的教材包含以下重点语法：
1. 情态动词 can 的用法
2. What time 和 When 引导的疑问句
3. 祈使句的用法
4. Why 引导的特殊疑问句

**学习建议**：
1. 先理解基本概念
2. 多看例句
3. 自己造句子
4. 通过练习题巩固

去"语法学习"模块开始学习吧！`;
    },

    getProgressAnalysis: function () {
        const wordStatus = Storage.get(Storage.keys.WORD_STATUS);
        const masteredCount = Object.values(wordStatus).filter(s => s.status === 'mastered').length;
        const learningCount = Object.values(wordStatus).filter(s => s.status === 'learning').length;
        const allWords = Grade7Data.getAllWords().length;
        const progress = Math.round((masteredCount / allWords) * 100);
        const streak = Storage.getStreak();

        return `📊 你的学习进度分析：

**单词学习**：
- 已掌握：${masteredCount} 个
- 学习中：${learningCount} 个
- 总进度：${progress}%

**其他统计**：
- 连续学习：${streak} 天
- 总积分：${Storage.getScore()} 分

**建议**：
${progress < 30 ? '继续加油！每天坚持学习一点，积少成多！' :
                progress < 60 ? '不错的进度！继续保持这个学习节奏！' :
                    progress < 90 ? '太棒了！你已经掌握了大部分内容！' :
                        '🎉 恭喜！你已经完成了所有学习内容！'}

继续努力，你做得很好！`;
    },

    getDefaultResponse: function () {
        return `😊 很高兴能帮助你！

你可以问我以下问题：
- 如何高效记忆单词？
- 今天应该复习什么？
- 推荐一些学习方法
- 如何制定学习计划？
- 语法知识点总结
- 我的学习进度如何？

或者点击上面的"快速问题"按钮！`;
    },

    renderChat: function () {
        const chatMessages = document.getElementById('chatMessages');
        if (chatMessages) {
            chatMessages.innerHTML = this.renderChatMessages();
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    },

    handleQuickSuggestion: function (index) {
        const suggestion = this.quickSuggestions[index];
        document.getElementById('chatInput').value = suggestion;
        this.sendMessage(suggestion);
    },

    bindEvents: function () {
        document.getElementById('moduleContent').addEventListener('click', (e) => {
            if (e.target.id === 'sendBtn') {
                const input = document.getElementById('chatInput');
                this.sendMessage(input.value);
                input.value = '';
            } else if (e.target.dataset.suggestion !== undefined) {
                this.handleQuickSuggestion(parseInt(e.target.dataset.suggestion));
            }
        });

        document.getElementById('moduleContent').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.target.id === 'chatInput') {
                this.sendMessage(e.target.value);
                e.target.value = '';
            }
        });
    },

    addAssistantStyles: function () {
        const style = document.createElement('style');
        style.textContent = `
            .assistant-chat {
                max-height: 500px;
                display: flex;
                flex-direction: column;
            }
            
            .chat-messages {
                flex: 1;
                overflow-y: auto;
                max-height: 350px;
                padding: 1rem;
                background: #f8f9fa;
                border-radius: 8px;
                margin-bottom: 1rem;
            }
            
            .chat-message {
                display: flex;
                gap: 1rem;
                margin-bottom: 1rem;
                animation: slideIn 0.3s ease;
            }
            
            .chat-message.user {
                flex-direction: row-reverse;
            }
            
            .message-avatar {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.25rem;
                flex-shrink: 0;
                background: linear-gradient(135deg, #4A90E2, #357ABD);
            }
            
            .chat-message.user .message-avatar {
                background: linear-gradient(135deg, #7ED321, #5DAE1B);
            }
            
            .message-content {
                background: white;
                padding: 1rem;
                border-radius: 12px;
                max-width: 80%;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            
            .chat-message.user .message-content {
                background: linear-gradient(135deg, rgba(74, 144, 226, 0.1), white);
            }
            
            .suggestion-btn {
                text-align: left;
                white-space: normal;
            }
            
            .suggestion-btn:hover {
                transform: translateX(4px);
            }
            
            .tip-item {
                transition: all 0.3s ease;
            }
            
            .tip-item:hover {
                background: #e9ecef;
                transform: translateX(4px);
            }
            
            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateY(10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            .text-sm {
                font-size: 0.875rem;
            }
            
            .icon-large {
                animation: bounce 2s infinite;
            }
            
            @keyframes bounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-10px); }
            }
        `;
        document.head.appendChild(style);
    }
};
