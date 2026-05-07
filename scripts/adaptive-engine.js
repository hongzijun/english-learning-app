var AdaptiveEngine = {
  version: '1.0.0',

  init: function () {
    this._initBKT();
    this._initIRT();
    this._initAKT();
    this.totalInteractions = parseInt(localStorage.getItem('ae_interactions') || '0');
  },

  _initBKT: function () {
    var stored = localStorage.getItem('ae_bkt_states');
    this.bktStates = stored ? JSON.parse(stored) : {};
  },

  _initIRT: function () {
    this.theta = parseFloat(localStorage.getItem('ae_theta') || '0');
    this.thetaHistory = JSON.parse(localStorage.getItem('ae_theta_history') || '[]');
    if (this.thetaHistory.length > 100) {
      this.thetaHistory = this.thetaHistory.slice(-100);
    }
  },

  _initAKT: function () {
    this.interactionLog = JSON.parse(localStorage.getItem('ae_interaction_log') || '[]');
    if (this.interactionLog.length > 200) {
      this.interactionLog = this.interactionLog.slice(-200);
    }
  },

  _saveAll: function () {
    localStorage.setItem('ae_bkt_states', JSON.stringify(this.bktStates));
    localStorage.setItem('ae_theta', this.theta.toString());
    localStorage.setItem('ae_theta_history', JSON.stringify(this.thetaHistory));
    localStorage.setItem('ae_interaction_log', JSON.stringify(this.interactionLog));
    localStorage.setItem('ae_interactions', this.totalInteractions.toString());
  },

  // ========== BKT 贝叶斯知识追踪 ==========
  // 四参数：P(L)掌握概率, P(T)学会转移概率, P(G)猜对概率, P(S)失误概率
  recordInteraction: function (kgPoint, correct, quality, responseTimeMs) {
    quality = typeof quality === 'number' ? quality : (correct ? 4 : 1);
    this.totalInteractions++;

    this._logInteraction(kgPoint, correct, quality, responseTimeMs);
    this._updateBKT(kgPoint, correct);
    this._updateIRT(correct, quality);
    this._updateAKT(kgPoint, correct, quality);

    this._saveAll();

    if (typeof StorageEnhanced !== 'undefined' && StorageEnhanced.setKnowledgeState) {
      var prob = this.getMasteryProbability(kgPoint);
      StorageEnhanced.setKnowledgeState(kgPoint, prob);
      if (!correct) {
        StorageEnhanced.addWeaknessPoint(kgPoint);
      }
    }

    return {
      kgPoint: kgPoint,
      bktProb: this.bktStates[kgPoint] ? this.bktStates[kgPoint].pL : 0.3,
      theta: this.theta,
      fusionProb: this.getMasteryProbability(kgPoint),
      interactions: this.totalInteractions
    };
  },

  _logInteraction: function (kgPoint, correct, quality, responseTimeMs) {
    this.interactionLog.push({
      kgPoint: kgPoint,
      correct: correct,
      quality: quality,
      time: responseTimeMs || 0,
      timestamp: Date.now()
    });
    if (this.interactionLog.length > 200) {
      this.interactionLog = this.interactionLog.slice(-200);
    }
  },

  _updateBKT: function (kgPoint, correct) {
    var state = this.bktStates[kgPoint] || {
      pL: 0.3,
      pT: 0.1,
      pG: 0.25,
      pS: 0.1,
      totalAttempts: 0,
      correctCount: 0
    };

    state.totalAttempts++;
    if (correct) state.correctCount++;

    // 用 Experience Replay 平滑 P(L) 更新
    var alpha = 0.15;
    var oldPL = state.pL;

    if (correct) {
      // P(S) 抵消后，提升 P(L)
      var delta = alpha * (1.0 - state.pL);
      state.pL = Math.min(0.99, oldPL + delta);
    } else {
      // 降低 P(L)，但不低于最低值
      var decay = alpha * (state.pL - 0.05);
      state.pL = Math.max(0.05, oldPL - decay);
    }

    // 动态调整 P(S) 和 P(G)
    state.pS = 0.1 + 0.1 * Math.exp(-state.totalAttempts / 5);
    state.pG = Math.max(0.1, 0.25 - 0.02 * state.totalAttempts);

    this.bktStates[kgPoint] = state;
  },

  // ========== IRT 项目反应理论 (2PL) ==========
  _updateIRT: function (correct, quality) {
    var itemDifficulty = correct ? -0.2 : 0.2;
    var avgQuality = quality || (correct ? 4 : 1);

    if (correct) {
      this.theta += 0.08 * (avgQuality / 5.0);
    } else {
      this.theta -= 0.12 * (1.0 - avgQuality / 5.0);
    }

    this.theta = Math.max(-3.0, Math.min(3.0, Math.round(this.theta * 100) / 100));
    this.thetaHistory.push({ theta: this.theta, time: Date.now() });
    if (this.thetaHistory.length > 100) {
      this.thetaHistory = this.thetaHistory.slice(-100);
    }
  },

  // ========== AKT 注意力知识追踪 ==========
  _updateAKT: function (kgPoint, correct, quality) {
    // AKT 基于最近交互的滑动窗口
    var windowSize = 5;
    var recent = this.interactionLog.slice(-windowSize);
    var samePointRecent = recent.filter(function (item) {
      return item.kgPoint === kgPoint;
    });

    var correctRecent = 0;
    for (var i = 0; i < samePointRecent.length; i++) {
      if (samePointRecent[i].correct) correctRecent++;
    }

    var aktAttentionWeight = samePointRecent.length > 0
      ? correctRecent / samePointRecent.length
      : 0.5;

    this._aktCache = this._aktCache || {};
    this._aktCache[kgPoint] = Math.round(aktAttentionWeight * 100) / 100;
  },

  // ========== 融合模型 ==========
  getMasteryProbability: function (kgPoint) {
    var bktProb = (this.bktStates[kgPoint] && this.bktStates[kgPoint].pL) || 0.3;
    var aktProb = (this._aktCache && this._aktCache[kgPoint]) || 0.5;

    // IRT 贡献
    var irtProb = 0.5 + 0.15 * this.theta;

    // 融合（BKT权重0.4 + AKT权重0.3 + IRT权重0.3）
    var fusion = 0.4 * bktProb + 0.3 * aktProb + 0.3 * irtProb;
    return Math.round(Math.max(0, Math.min(1, fusion)) * 100) / 100;
  },

  getAllMasteryLevels: function () {
    var results = [];
    var self = this;
    if (typeof Grade7Data !== 'undefined') {
      var allWords = Grade7Data.getAllWords();
      var kgPoints = {};
      for (var i = 0; i < allWords.length; i++) {
        kgPoints[allWords[i].kgPoint] = true;
      }
      for (var kp in kgPoints) {
        results.push({
          kgPoint: kp,
          probability: self.getMasteryProbability(kp),
          bktProb: self.bktStates[kp] ? self.bktStates[kp].pL : 0.3,
          attempts: self.bktStates[kp] ? self.bktStates[kp].totalAttempts : 0
        });
      }
    }
    return results;
  },

  // ========== 三级错题归因 ==========
  classifyError: function (kgPoint, isFirstError, responseTimeMs, quality) {
    var mastery = this.getMasteryProbability(kgPoint);
    var tooFast = responseTimeMs && responseTimeMs < 2000;

    // 习惯型：高掌握率 + 过快 + 低质量
    if (mastery >= 0.7 && tooFast && quality <= 2) {
      return { type: 'habit', level: 'careless', reason: '可能的粗心错误：速度快但质量低' };
    }

    // 知识型：首次错误 + 低掌握概率
    if (mastery < 0.4) {
      return { type: 'knowledge', level: 'not_learned', reason: '知识型错误：该考点尚未掌握' };
    }

    if (isFirstError && mastery < 0.6) {
      return { type: 'knowledge', level: 'weak', reason: '知识型错误：首次接触该考点题型' };
    }

    // 方法型：中等掌握率但多次错误
    var state = this.bktStates[kgPoint];
    if (state && state.totalAttempts >= 3 && mastery >= 0.4 && mastery < 0.7) {
      return { type: 'method', level: 'strategy', reason: '方法型错误：可能是解题策略或步骤有问题' };
    }

    return { type: 'knowledge', level: 'weak', reason: '知识型错误：需要进一步巩固' };
  },

  // ========== 动态路径规划 ==========
  getNextRecommendation: function () {
    var allLevels = this.getAllMasteryLevels();
    allLevels.sort(function (a, b) { return a.probability - b.probability; });

    if (allLevels.length === 0) {
      return { action: 'diagnose', target: null, reason: '暂无数据，建议先进行诊断' };
    }

    var weakest = allLevels[0];
    var action;

    if (weakest.probability < 0.3) {
      action = 'learn';
    } else if (weakest.probability < 0.6) {
      action = 'practice';
    } else if (weakest.probability < 0.8) {
      action = 'review';
    } else {
      action = 'test';
    }

    return {
      action: action,
      target: weakest.kgPoint,
      mastery: weakest.probability,
      reason: '当前最薄弱考点：' + weakest.kgPoint + '（掌握率' + (weakest.probability * 100).toFixed(0) + '%）',
      topWeaknesses: allLevels.slice(0, 5)
    };
  },

  // ========== 能力估计 ==========
  estimateScore: function () {
    var rawTheta = this.theta;
    var baseScore = (rawTheta + 3.0) / 6.0 * 120;
    var score = Math.round(Math.max(20, Math.min(120, baseScore)));
    return {
      score: score,
      range: [Math.max(20, score - 10), Math.min(120, score + 10)],
      level: score >= 105 ? '优秀' : score >= 85 ? '良好' : score >= 60 ? '中等' : '待提升',
      theta: this.theta
    };
  },

  getSprintAdvice: function () {
    var rec = this.getNextRecommendation();
    var estimate = this.estimateScore();
    var advices = [];

    if (estimate.score < 105) {
      advices.push('目标105+，距离约' + (105 - estimate.score) + '分');
      advices.push('优先攻克：' + (rec.target || '诊断'));
      advices.push('每天至少复习30个单词');
      advices.push('重点突破：' + (rec.topWeaknesses ? rec.topWeaknesses.slice(0, 3).map(function (w) { return w.kgPoint; }).join('、') : ''));
    } else {
      advices.push('当前水平已达105+，保持练习');
      advices.push('重点关注：模考中的细节失分');
    }

    return {
      currentScore: estimate.score,
      targetScore: 108,
      focus: rec.topWeaknesses ? rec.topWeaknesses.slice(0, 3) : [],
      advices: advices
    };
  },

  // ========== BKT 在线参数调优 (V3.3) ==========
  calibrateParams: function () {
    var completedUnits = 0;
    if (typeof Grade7Data !== 'undefined') {
      var units = Grade7Data.units || [];
      for (var i = 0; i < units.length; i++) {
        var prefix = 'dragon_progress';
        try {
          var raw = localStorage.getItem(prefix);
          if (raw) {
            var prog = JSON.parse(raw);
            if (prog && prog.completedUnits && prog.completedUnits[units[i].id]) completedUnits++;
          }
        } catch (e) { }
      }
    }
    if (completedUnits < 3) return;

    this._calibratedParams = this._calibratedParams || { pL0_adjust: 0, pT_adjust: 0 };

    var recallStats = { correctRate: 0.5 };
    try { recallStats = JSON.parse(localStorage.getItem('active_recall_stats') || '{}'); } catch (e) { }
    var recallRate = recallStats.correctRate || recallStats.totalAttempts > 0 ? (recallStats.correct / recallStats.totalAttempts) : 0.5;

    if (recallRate < 0.5) {
      this._calibratedParams.pL0_adjust = Math.max(-0.15, this._calibratedParams.pL0_adjust - 0.05);
    } else if (recallRate > 0.8) {
      this._calibratedParams.pL0_adjust = Math.min(0.15, this._calibratedParams.pL0_adjust + 0.05);
    }

    if (typeof MemoryTracker !== 'undefined') {
      try {
        var retention = MemoryTracker.getShortTermRetention();
        if (retention !== null) {
          if (retention < 0.5) {
            this._calibratedParams.pT_adjust = Math.max(-0.1, this._calibratedParams.pT_adjust - 0.05);
          } else if (retention > 0.85) {
            this._calibratedParams.pT_adjust = Math.min(0.1, this._calibratedParams.pT_adjust + 0.05);
          }
        }
      } catch (e) { }
    }

    var self = this;
    var keys = Object.keys(this.bktStates);
    for (var k = 0; k < keys.length; k++) {
      var kg = keys[k];
      var state = self.bktStates[kg];
      if (state) {
        state.pT = Math.max(0.02, Math.min(0.3, (state.pT || 0.1) + self._calibratedParams.pT_adjust));
      }
    }

    this._saveAll();
    return this._calibratedParams;
  },

  getCalibratedParams: function () {
    return this._calibratedParams || { pL0_adjust: 0, pT_adjust: 0 };
  },

  // ========== 重置 ==========
  reset: function () {
    this.bktStates = {};
    this.theta = 0;
    this.thetaHistory = [];
    this.interactionLog = [];
    this.totalInteractions = 0;
    this._aktCache = {};
    localStorage.removeItem('ae_bkt_states');
    localStorage.removeItem('ae_theta');
    localStorage.removeItem('ae_theta_history');
    localStorage.removeItem('ae_interaction_log');
    localStorage.removeItem('ae_interactions');
  }
};