const SpacedRepetition = {
    STORAGE_KEY: 'spaced_repetition_data',

    init: function () {
        this.loadData();
    },

    loadData: function () {
        const saved = Storage.get(this.STORAGE_KEY);
        this.data = saved || {
            cards: {},
            dailyStats: [],
            reviewHistory: []
        };
    },

    saveData: function () {
        Storage.set(this.STORAGE_KEY, this.data);
    },

    getCard: function (wordId) {
        var card = this.data.cards[wordId] || null;
        if (card) card = this.migrateCard(card);
        return card;
    },

    createCard: function (wordId) {
        if (!this.data.cards[wordId]) {
            this.data.cards[wordId] = {
                wordId: wordId,
                easiness: 2.5,
                consecutiveCorrect: 0,
                nextReview: Date.now(),
                repetitions: 0,
                lastReview: null,
                history: [],
                spellingLevel: 0,
                listeningLevel: 0,
                spellingHistory: [],
                listeningHistory: [],
                encnTrack: {
                    easiness: 2.5,
                    repetitions: 0,
                    nextReview: Date.now(),
                    lastQuality: null,
                    history: []
                },
                cnenTrack: {
                    easiness: 2.5,
                    repetitions: 0,
                    nextReview: Date.now(),
                    lastQuality: null,
                    history: []
                },
                directionStats: {
                    encnTotal: 0,
                    encnCorrect: 0,
                    cnenTotal: 0,
                    cnenCorrect: 0,
                    lastDirection: ''
                }
            };
        }
        return this.migrateCard(this.data.cards[wordId]);
    },

    migrateCard: function (card) {
        if (card.encnTrack && card.cnenTrack && card.directionStats) return card;

        var now = Date.now();
        card.encnTrack = {
            easiness: card.easiness || 2.5,
            repetitions: card.repetitions || 0,
            nextReview: card.nextReview || now,
            lastQuality: card.history && card.history.length > 0
                ? card.history[card.history.length - 1].quality : null,
            history: card.history ? card.history.slice() : []
        };
        card.cnenTrack = {
            easiness: 2.5,
            repetitions: 0,
            nextReview: now,
            lastQuality: null,
            history: []
        };
        card.directionStats = {
            encnTotal: card.repetitions || 0,
            encnCorrect: card.consecutiveCorrect || 0,
            cnenTotal: 0,
            cnenCorrect: 0,
            lastDirection: 'encn'
        };
        this.saveData();
        return card;
    },

    rateCard: function (wordId, quality, direction) {
        var card = this.getCard(wordId);
        if (!card) card = this.createCard(wordId);

        direction = direction || 'encn';

        card.lastReview = Date.now();
        card.history.push({
            timestamp: Date.now(),
            quality: quality
        });

        var trackKey = direction + 'Track';
        var track = card[trackKey];

        if (!track) {
            track = { easiness: 2.5, repetitions: 0, nextReview: Date.now(), history: [] };
            card[trackKey] = track;
        }

        track.lastQuality = quality;
        track.history.push({ timestamp: Date.now(), quality: quality });

        if (quality < 3) {
            track.easiness = Math.max(1.3, track.easiness - 0.2);
            track.repetitions = 0;
            track.nextReview = Date.now() + 24 * 60 * 60 * 1000;
        } else {
            track.easiness += (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
            if (track.easiness < 1.3) track.easiness = 1.3;
            track.repetitions++;
            var n = track.repetitions;
            var interval;
            if (n === 1) interval = 1;
            else if (n === 2) interval = 6;
            else {
                var prevInterval = n === 3 ? 6 : Math.round(this._calcInterval(n - 2, track.easiness));
                interval = Math.round(prevInterval * track.easiness);
            }
            track.nextReview = Date.now() + interval * 24 * 60 * 60 * 1000;
        }

        var ds = card.directionStats;
        if (direction === 'encn') {
            ds.encnTotal++;
            if (quality >= 3) ds.encnCorrect++;
        } else {
            ds.cnenTotal++;
            if (quality >= 3) ds.cnenCorrect++;
        }
        ds.lastDirection = direction;

        var overallCorrect = quality >= 3;
        if (overallCorrect) {
            card.consecutiveCorrect++;
        } else {
            card.consecutiveCorrect = 0;
        }
        card.repetitions = Math.min(card.encnTrack.repetitions, card.cnenTrack.repetitions) +
            Math.max(0, Math.abs(card.encnTrack.repetitions - card.cnenTrack.repetitions));
        card.nextReview = Math.min(card.encnTrack.nextReview, card.cnenTrack.nextReview);
        card.easiness = (card.encnTrack.easiness + card.cnenTrack.easiness) / 2;

        this.saveData();
        return card;
    },

    rateSpelling: function (wordId, correct, typedAnswer, correctAnswer) {
        var card = this.getCard(wordId);
        if (!card) card = this.createCard(wordId);

        card.lastReview = Date.now();
        card.spellingHistory.push({
            timestamp: Date.now(),
            correct: correct,
            typed: typedAnswer,
            expected: correctAnswer
        });

        if (correct) {
            card.spellingLevel = Math.min(5, (card.spellingLevel || 0) + 1);
        } else {
            card.spellingLevel = Math.max(0, (card.spellingLevel || 0) - 1);
        }

        this.saveData();
        return card;
    },

    rateListening: function (wordId, correct) {
        var card = this.getCard(wordId);
        if (!card) card = this.createCard(wordId);

        card.lastReview = Date.now();
        card.listeningHistory.push({
            timestamp: Date.now(),
            correct: correct
        });

        if (correct) {
            card.listeningLevel = Math.min(5, (card.listeningLevel || 0) + 1);
        } else {
            card.listeningLevel = Math.max(0, (card.listeningLevel || 0) - 1);
        }

        this.saveData();
        return card;
    },

    calculateNextReview: function (n, easiness = 2.5) {
        if (n === 1) {
            return Date.now() + 24 * 60 * 60 * 1000;
        } else if (n === 2) {
            return Date.now() + 6 * 24 * 60 * 60 * 1000;
        } else {
            const interval = Math.round(this.calculateInterval(n - 1, easiness) * easiness);
            return Date.now() + interval * 24 * 60 * 60 * 1000;
        }
    },

    calculateInterval: function (n, easiness) {
        if (n === 1) return 1;
        if (n === 2) return 6;
        return Math.round(this.calculateInterval(n - 1, easiness) * easiness);
    },

    _calcInterval: function (n, easiness) {
        if (n <= 1) return 1;
        if (n === 2) return 6;
        return Math.round(this._calcInterval(n - 1, easiness) * easiness);
    },

    getDueCards: function (wordIds) {
        const now = Date.now();
        return wordIds.filter(wordId => {
            const card = this.getCard(wordId);
            return !card || card.nextReview <= now;
        });
    },

    getReviewQueue: function (wordIds, limit = 20) {
        const dueCards = this.getDueCards(wordIds);
        const newCards = wordIds.filter(wordId => !this.getCard(wordId));
        const reviewCards = dueCards.filter(wordId => this.getCard(wordId));

        const queue = [];
        const newLimit = Math.min(newCards.length, Math.ceil(limit * 0.3));
        const reviewLimit = limit - newLimit;

        queue.push(...newCards.slice(0, newLimit));
        queue.push(...reviewCards.slice(0, reviewLimit));

        return queue;
    },

    getLearningProgress: function (wordIds) {
        const total = wordIds.length;
        const newWords = wordIds.filter(id => !this.getCard(id)).length;
        const learningWords = wordIds.filter(id => {
            const card = this.getCard(id);
            return card && card.consecutiveCorrect < 3;
        }).length;
        const masteredWords = wordIds.filter(id => {
            const card = this.getCard(id);
            return card && card.consecutiveCorrect >= 3;
        }).length;

        return {
            total,
            new: newWords,
            learning: learningWords,
            mastered: masteredWords,
            progressPercent: total > 0 ? Math.round(((masteredWords + learningWords * 0.5) / total) * 100) : 0
        };
    },

    getDailyStats: function (date = new Date()) {
        const dateStr = date.toISOString().split('T')[0];
        const stats = this.data.dailyStats.find(s => s.date === dateStr);

        return stats || {
            date: dateStr,
            reviews: 0,
            newWords: 0,
            correct: 0,
            total: 0
        };
    },

    recordDailyStat: function (isNewWord, isCorrect) {
        const dateStr = new Date().toISOString().split('T')[0];
        let stats = this.data.dailyStats.find(s => s.date === dateStr);

        if (!stats) {
            stats = {
                date: dateStr,
                reviews: 0,
                newWords: 0,
                correct: 0,
                total: 0
            };
            this.data.dailyStats.push(stats);
        }

        stats.reviews++;
        stats.total++;
        if (isNewWord) stats.newWords++;
        if (isCorrect) stats.correct++;

        this.saveData();
    },

    getWeeklyStats: function () {
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const weeklyStats = this.data.dailyStats.filter(s => {
            const date = new Date(s.date);
            return date.getTime() >= weekAgo;
        });

        return {
            totalReviews: weeklyStats.reduce((sum, s) => sum + s.reviews, 0),
            totalNewWords: weeklyStats.reduce((sum, s) => sum + s.newWords, 0),
            averageAccuracy: weeklyStats.length > 0
                ? Math.round(weeklyStats.reduce((sum, s) => sum + (s.total > 0 ? (s.correct / s.total * 100) : 0), 0) / weeklyStats.length)
                : 0,
            dailyBreakdown: weeklyStats
        };
    },

    getStreak: function () {
        if (this.data.dailyStats.length === 0) return 0;

        const sortedDates = [...this.data.dailyStats]
            .map(s => new Date(s.date))
            .sort((a, b) => b - a);

        let streak = 0;
        let checkDate = new Date();
        checkDate.setHours(0, 0, 0, 0);

        for (const date of sortedDates) {
            const dateOnly = new Date(date);
            dateOnly.setHours(0, 0, 0, 0);

            if (dateOnly.getTime() === checkDate.getTime()) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else if (dateOnly.getTime() < checkDate.getTime()) {
                break;
            }
        }

        return streak;
    },

    resetCard: function (wordId) {
        if (this.data.cards[wordId]) {
            delete this.data.cards[wordId];
            this.saveData();
        }
    },

    clearAll: function () {
        this.data = {
            cards: {},
            dailyStats: [],
            reviewHistory: []
        };
        this.saveData();
    },

    getWordStage: function (wordId) {
        var card = this.getCard(wordId);
        if (!card) return 'new';
        var er = card.encnTrack ? card.encnTrack.repetitions : 0;
        var cr = card.cnenTrack ? card.cnenTrack.repetitions : 0;
        var minR = Math.min(er, cr);
        var maxR = Math.max(er, cr);
        if (minR === 0 && maxR === 0) return 'new';
        if (maxR < 3) return 'learning';
        if (minR < 3 || maxR < 5) return 'mastering';
        return 'fluent';
    },

    getDirectionWeakness: function (wordId) {
        var card = this.getCard(wordId);
        if (!card || !card.directionStats) return { encnErrorRate: 0.5, cnenErrorRate: 0.5, weakerDir: null };
        var ds = card.directionStats;
        var encnRate = ds.encnTotal > 0 ? 1 - ds.encnCorrect / ds.encnTotal : 0.5;
        var cnenRate = ds.cnenTotal > 0 ? 1 - ds.cnenCorrect / ds.cnenTotal : 0.5;
        var weakerDir = cnenRate > encnRate ? 'cnen' : (encnRate > cnenRate ? 'encn' : null);
        return { encnErrorRate: encnRate, cnenErrorRate: cnenRate, weakerDir: weakerDir };
    },

    isWordMastered: function (wordId) {
        var card = this.getCard(wordId);
        if (!card) return false;
        var eT = card.encnTrack, cT = card.cnenTrack;
        if (!eT || !cT) return false;
        return eT.repetitions >= 3 && eT.easiness >= 2.3 &&
            cT.repetitions >= 3 && cT.easiness >= 2.3;
    },

    getDueCardsForTrack: function (wordIds, trackName) {
        var self = this;
        var now = Date.now();
        return wordIds.filter(function (wordId) {
            var card = self.getCard(wordId);
            if (!card) return true;
            var track = card[trackName];
            return !track || track.nextReview <= now;
        });
    },

    exportData: function () {
        return JSON.stringify(this.data, null, 2);
    },

    importData: function (jsonStr) {
        try {
            this.data = JSON.parse(jsonStr);
            this.saveData();
            return true;
        } catch (e) {
            console.error('Failed to import data:', e);
            return false;
        }
    }
};
