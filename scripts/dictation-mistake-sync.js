const DictationMistakeSync = {
    spellingModule: null,

    attach: function (spellingModuleInstance) {
        this.spellingModule = spellingModuleInstance;
    },

    syncMistake: function (wordObj, userInput, usedHints) {
        const mistakeObj = this.createMistakeObject(wordObj, userInput, usedHints);

        if (this.isDuplicate(wordObj.id)) {
            this.updateExisting(wordObj.id, { usedHints: usedHints });
        } else {
            this.addNewMistake(mistakeObj);
        }
    },

    createMistakeObject: function (wordObj, userInput, usedHints) {
        return {
            id: Date.now(),
            wordId: wordObj.id,
            word: wordObj.w,
            type: 'spelling',
            userInput: userInput,
            correctAnswer: wordObj.w,
            meaning: wordObj.m,
            usedHints: usedHints,
            priority: usedHints ? 'high' : 'medium',
            errorType: 'knowledge',
            timestamp: Date.now(),
            resolved: false,
            errorCount: 1,
            firstError: new Date().toISOString(),
            lastError: new Date().toISOString()
        };
    },

    isDuplicate: function (wordId) {
        const existingMistakes = this.getMistakes();
        return existingMistakes.some(mistake =>
            mistake.wordId === wordId && !mistake.resolved
        );
    },

    updateExisting: function (wordId, newData) {
        const existingMistakes = this.getMistakes();
        const mistakeIndex = existingMistakes.findIndex(mistake =>
            mistake.wordId === wordId && !mistake.resolved
        );

        if (mistakeIndex >= 0) {
            const mistake = existingMistakes[mistakeIndex];
            mistake.errorCount += 1;
            mistake.lastError = new Date().toISOString();

            if (newData.usedHints && !mistake.usedHints) {
                mistake.priority = 'high';
                mistake.usedHints = true;
            }

            this.saveMistakes(existingMistakes);

            if (typeof DataBridge !== 'undefined') {
                DataBridge.emit('mistake:updated', mistake);
            }
        }
    },

    addNewMistake: function (mistakeObj) {
        const existingMistakes = this.getMistakes();
        existingMistakes.push(mistakeObj);
        this.saveMistakes(existingMistakes);

        if (typeof DataBridge !== 'undefined') {
            DataBridge.emit('mistake:added', mistakeObj);
        }
    },

    getMistakes: function () {
        if (typeof DataBridge !== 'undefined' && DataBridge.state) {
            return DataBridge.state.getMistakes() || [];
        }

        if (typeof Storage !== 'undefined' && Storage.get) {
            return Storage.get(Storage.keys.MISTAKES) || [];
        }

        const stored = localStorage.getItem('mistakes');
        return stored ? JSON.parse(stored) : [];
    },

    saveMistakes: function (mistakes) {
        if (typeof Storage !== 'undefined' && Storage.set) {
            Storage.set(Storage.keys.MISTAKES, mistakes);
        } else {
            localStorage.setItem('mistakes', JSON.stringify(mistakes));
        }
    }
};