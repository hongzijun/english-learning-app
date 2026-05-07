const MistakeAnalysisSystem = {
    STORAGE_KEY: 'mistake_analysis_data',

    init: function () {
        this.loadData();
    },

    loadData: function () {
        this.data = Storage.get(this.STORAGE_KEY) || {
            mistakes: [],
            statistics: {},
            weakPoints: [],
            lastUpdate: null
        };
    },

    saveData: function () {
        Storage.set(this.STORAGE_KEY, this.data);
    },

    recordMistake: function (exercise, userAnswer, context = {}) {
        const mistake = {
            id: Date.now(),
            exerciseId: exercise.id,
            question: exercise.q,
            type: exercise.type,
            correctAnswer: exercise.a,
            userAnswer: userAnswer,
            knowledgePoint: exercise.kp || '综合',
            unitId: exercise.unitId,
            timestamp: Date.now(),
            timesWrong: 1,
            lastReview: null,
            mastered: false,
            ...context
        };

        const existingIndex = this.data.mistakes.findIndex(m => m.exerciseId === exercise.id);
        if (existingIndex >= 0) {
            this.data.mistakes[existingIndex].timesWrong++;
            this.data.mistakes[existingIndex].userAnswer = userAnswer;
            this.data.mistakes[existingIndex].timestamp = Date.now();
            this.data.mistakes[existingIndex].mastered = false;
        } else {
            this.data.mistakes.push(mistake);
        }

        this.updateStatistics();
        this.saveData();

        return mistake;
    },

    markAsReviewed: function (mistakeId, isCorrect) {
        const mistake = this.data.mistakes.find(m => m.id === mistakeId);
        if (mistake) {
            mistake.lastReview = Date.now();
            if (isCorrect) {
                mistake.mastered = true;
            }
            this.saveData();
        }
    },

    updateStatistics: function () {
        const totalMistakes = this.data.mistakes.length;
        const byKnowledgePoint = {};
        const byUnit = {};
        const byType = { choice: 0, fill: 0, error: 0 };

        this.data.mistakes.forEach(m => {
            if (!byKnowledgePoint[m.knowledgePoint]) {
                byKnowledgePoint[m.knowledgePoint] = 0;
            }
            byKnowledgePoint[m.knowledgePoint]++;

            if (!byUnit[m.unitId]) {
                byUnit[m.unitId] = 0;
            }
            byUnit[m.unitId]++;

            if (byType[m.type] !== undefined) {
                byType[m.type]++;
            }
        });

        this.data.statistics = {
            total: totalMistakes,
            unmastered: this.data.mistakes.filter(m => !m.mastered).length,
            mastered: this.data.mistakes.filter(m => m.mastered).length,
            byKnowledgePoint: byKnowledgePoint,
            byUnit: byUnit,
            byType: byType
        };

        this.identifyWeakPoints();
        this.data.lastUpdate = Date.now();
    },

    identifyWeakPoints: function () {
        const points = Object.entries(this.data.statistics.byKnowledgePoint)
            .map(([point, count]) => ({
                point,
                count,
                percentage: Math.round((count / this.data.statistics.total) * 100)
            }))
            .sort((a, b) => b.count - a.count);

        this.data.weakPoints = points.slice(0, 5);
    },

    getWeakPoints: function () {
        return this.data.weakPoints;
    },

    getPersonalizedReport: function () {
        const stats = this.data.statistics;
        const weakPoints = this.data.weakPoints;

        let level = '优秀';
        let color = '#10b981';
        let message = '';

        if (stats.total === 0) {
            level = '暂无数据';
            message = '继续练习，系统会自动记录您的学习情况！';
        } else if (stats.unmastered / stats.total > 0.6) {
            level = '需要加强';
            color = '#ef4444';
            message = `您有${stats.unmastered}道错题需要复习，重点关注薄弱知识点。`;
        } else if (stats.unmastered / stats.total > 0.3) {
            level = '良好';
            color = '#f59e0b';
            message = `整体表现不错，还有${stats.unmastered}道题可以进一步巩固。`;
        } else {
            level = '优秀';
            message = '太棒了！您的掌握情况非常好，继续保持！';
        }

        return {
            level,
            color,
            message,
            totalMistakes: stats.total,
            unmastered: stats.unmastered,
            mastered: stats.mastered,
            accuracyRate: stats.total > 0 ? Math.round(((stats.total - stats.unmastered) / stats.total) * 100) : 100,
            weakPoints: weakPoints.slice(0, 3),
            recommendations: this.generateRecommendations()
        };
    },

    generateRecommendations: function () {
        const recommendations = [];
        const weakPoints = this.data.weakPoints;

        if (weakPoints.length > 0) {
            recommendations.push({
                priority: 'high',
                title: '重点复习薄弱知识点',
                content: `建议优先复习"${weakPoints[0].point}"相关内容，该知识点错误率最高（${weakPoints[0].percentage}%）。`,
                action: 'review-weak-points'
            });

            if (weakPoints.length >= 2) {
                recommendations.push({
                    priority: 'medium',
                    title: '巩固次薄弱点',
                    content: `"${weakPoints[1].point}"也需要关注，错误率为${weakPoints[1].percentage}%。`,
                    action: 'review-secondary'
                });
            }
        }

        const recentMistakes = this.data.mistakes
            .filter(m => Date.now() - m.timestamp < 7 * 24 * 60 * 60 * 1000)
            .length;

        if (recentMistakes > 3) {
            recommendations.push({
                priority: 'medium',
                title: '近期错误较多',
                content: `最近一周有${recentMistakes}道错题，建议每天安排15分钟复习时间。`,
                action: 'daily-review'
            });
        }

        recommendations.push({
            priority: 'low',
            title: '保持练习频率',
            content: '建议每天坚持练习，使用间隔重复法巩固记忆。',
            action: 'regular-practice'
        });

        return recommendations;
    },

    getMistakesByKnowledgePoint: function (pointName) {
        return this.data.mistakes.filter(m => m.knowledgePoint === pointName);
    },

    getRecentMistakes: function (days = 7) {
        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
        return this.data.mistakes.filter(m => m.timestamp >= cutoff);
    },

    getUnmasteredMistakes: function () {
        return this.data.mistakes.filter(m => !m.mastered);
    },

    clearMastered: function () {
        this.data.mistakes = this.data.mistakes.filter(m => !m.mastered);
        this.updateStatistics();
        this.saveData();
    },

    clearAll: function () {
        this.data = {
            mistakes: [],
            statistics: {},
            weakPoints: [],
            lastUpdate: null
        };
        this.saveData();
    },

    exportData: function () {
        return JSON.stringify(this.data, null, 2);
    },

    renderReport: function (container) {
        const report = this.getPersonalizedReport();

        container.innerHTML = `
            <div class="mistake-report">
                <div class="report-header mb-4 p-4 rounded" style="background: linear-gradient(135deg, ${report.color}22, ${report.color}44);">
                    <h3 style="color: ${report.color};">📊 学习诊断报告</h3>
                    <p class="mb-0">${report.message}</p>
                    <div class="mt-2">
                        <span class="badge" style="background: ${report.color}; color: white; font-size: 1rem; padding: 0.5rem 1rem;">
                            综合评级：${report.level}
                        </span>
                        <span class="badge badge-primary ml-2" style="font-size: 1rem; padding: 0.5rem 1rem;">
                            正确率：${report.accuracyRate}%
                        </span>
                    </div>
                </div>
                
                <div class="stats-grid grid grid-4 gap-3 mb-4">
                    <div class="card text-center p-3">
                        <div style="font-size: 1.75rem; font-weight: 700; color: #667eea;">${report.totalMistakes}</div>
                        <div class="text-muted">总错题数</div>
                    </div>
                    <div class="card text-center p-3">
                        <div style="font-size: 1.75rem; font-weight: 700; color: #f59e0b;">${report.unmastered}</div>
                        <div class="text-muted">待复习</div>
                    </div>
                    <div class="card text-center p-3">
                        <div style="font-size: 1.75rem; font-weight: 700; color: #10b981;">${report.mastered}</div>
                        <div class="text-muted">已掌握</div>
                    </div>
                    <div class="card text-center p-3">
                        <div style="font-size: 1.75rem; font-weight: 700; color: #8b5cf6;">${this.getRecentMistakes().length}</div>
                        <div class="text-muted">本周新增</div>
                    </div>
                </div>
                
                ${report.weakPoints.length > 0 ? `
                <div class="weak-points-section card p-4 mb-4">
                    <h4 class="mb-3">⚠️ 薄弱知识点 TOP ${Math.min(report.weakPoints.length, 3)}</h4>
                    <div class="list-group">
                        ${report.weakPoints.slice(0, 3).map((wp, i) => `
                            <div class="list-group-item d-flex justify-content-between align-items-center p-3" style="border-left: 4px solid ${i === 0 ? '#ef4444' : i === 1 ? '#f59e0b' : '#3b82f6'};">
                                <div>
                                    <strong>${i + 1}. ${wp.point}</strong>
                                    <small class="d-block text-muted">${wp.count}道错题 (${wp.percentage}%)</small>
                                </div>
                                <button class="btn btn-sm btn-primary review-point-btn" data-point="${wp.point}">
                                    立即复习
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
                
                <div class="recommendations-section card p-4">
                    <h4 class="mb-3">💡 个性化建议</h4>
                    <div class="timeline">
                        ${report.recommendations.map(rec => `
                            <div class="timeline-item mb-3 pb-3 border-bottom">
                                <div class="badge ${rec.priority === 'high' ? 'badge-danger' : rec.priority === 'medium' ? 'badge-warning' : 'badge-info'} mb-2">
                                    ${rec.priority === 'high' ? '重要' : rec.priority === 'medium' ? '建议' : '提示'}
                                </div>
                                <h6>${rec.title}</h6>
                                <p class="text-muted small mb-2">${rec.content}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        container.querySelectorAll('.review-point-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const point = btn.dataset.point;
                Utils.showNotification(`正在准备"${point}"的复习题目...`, 'info');
            });
        });
    }
};
