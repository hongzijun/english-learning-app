const SettingsModule = {
    init: function () {
        this.render();
        this.bindEvents();
    },

    render: function () {
        var content = document.getElementById('moduleContent');
        if (!content) return;

        var prefs = {};
        var celebPrefs = {};
        var encPrefs = {};
        try {
            prefs = JSON.parse(localStorage.getItem('audio_preferences') || '{}');
            celebPrefs = JSON.parse(localStorage.getItem('celebration_prefs') || '{}');
            encPrefs = JSON.parse(localStorage.getItem('encouragement_prefs') || '{}');
        } catch (e) { }

        var masterVolume = prefs.masterVolume !== undefined ? prefs.masterVolume : 0.5;

        content.innerHTML = this.createSettingsHTML(prefs, celebPrefs, encPrefs, masterVolume);
    },

    createSettingsHTML: function (prefs, celebPrefs, encPrefs, masterVolume) {
        var e = prefs;

        return '<div class="module-content" style="max-width:700px;margin:0 auto;">' +
            '<h2 style="font-size:1.5rem;font-weight:700;margin-bottom:1.5rem;color:#1f2937;"> 音效与反馈设置</h2>' +

            '<div style="background:white;border-radius:12px;padding:1.25rem;box-shadow:0 2px 8px rgba(0,0,0,0.08);margin-bottom:1rem;">' +
            '<h3 style="font-size:1rem;font-weight:600;margin-bottom:1rem;color:#374151;"> 主音量</h3>' +
            '<div style="display:flex;align-items:center;gap:0.75rem;">' +
            '<span style="font-size:0.85rem;color:#6b7280;"> </span>' +
            '<input type="range" id="masterVolumeSlider" min="0" max="100" value="' + Math.round(masterVolume * 100) + '" style="flex:1;cursor:pointer;">' +
            '<span id="masterVolumeValue" style="font-size:0.85rem;color:#6b7280;min-width:40px;text-align:right;">' + Math.round(masterVolume * 100) + '%</span>' +
            '</div>' +
            '</div>' +

            '<div style="background:white;border-radius:12px;padding:1.25rem;box-shadow:0 2px 8px rgba(0,0,0,0.08);margin-bottom:1rem;">' +
            '<h3 style="font-size:1rem;font-weight:600;margin-bottom:1rem;color:#374151;"> 答题音效</h3>' +
            '<div style="display:flex;flex-wrap:wrap;gap:0.75rem;">' +
            this._toggleItem('sndCorrect', e.correct !== false, ' 答对音效') +
            this._toggleItem('sndWrong', e.wrong !== false, ' 答错音效') +
            this._toggleItem('sndStreak', e.streak !== false, ' 连击音效') +
            this._toggleItem('sndMastered', e.mastered !== false, ' 单词掌握') +
            this._toggleItem('sndUnitComplete', e.unitComplete !== false, ' 单元完成') +
            this._toggleItem('sndAchievement', e.achievement !== false, ' 成就解锁') +
            this._toggleItem('sndLevelUp', e.levelUp !== false, ' 等级提升') +
            '</div>' +
            '</div>' +

            '<div style="background:white;border-radius:12px;padding:1.25rem;box-shadow:0 2px 8px rgba(0,0,0,0.08);margin-bottom:1rem;">' +
            '<h3 style="font-size:1rem;font-weight:600;margin-bottom:1rem;color:#374151;"> 视觉反馈</h3>' +
            '<div style="display:flex;flex-wrap:wrap;gap:0.75rem;">' +
            this._toggleItem('celebrationEnabled', celebPrefs.enabled !== false, ' 庆祝动画') +
            '</div>' +
            '</div>' +

            '<div style="background:white;border-radius:12px;padding:1.25rem;box-shadow:0 2px 8px rgba(0,0,0,0.08);margin-bottom:1rem;">' +
            '<h3 style="font-size:1rem;font-weight:600;margin-bottom:1rem;color:#374151;"> 鼓励提示</h3>' +
            '<div style="display:flex;flex-wrap:wrap;gap:0.75rem;">' +
            this._toggleItem('encouragementEnabled', encPrefs.enabled !== false, ' 随机鼓励提示') +
            '</div>' +
            '</div>' +

            '<div style="background:white;border-radius:12px;padding:1.25rem;box-shadow:0 2px 8px rgba(0,0,0,0.08);margin-bottom:1rem;">' +
            '<h3 style="font-size:1rem;font-weight:600;margin-bottom:1rem;color:#374151;"> 音效预览</h3>' +
            '<div style="display:flex;flex-wrap:wrap;gap:0.5rem;">' +
            '<button class="preview-btn" data-preview="correct" style="padding:0.5rem 1rem;border:1px solid #d1d5db;border-radius:8px;background:white;cursor:pointer;font-size:0.85rem;"> 答对</button>' +
            '<button class="preview-btn" data-preview="wrong" style="padding:0.5rem 1rem;border:1px solid #d1d5db;border-radius:8px;background:white;cursor:pointer;font-size:0.85rem;"> 答错</button>' +
            '<button class="preview-btn" data-preview="click" style="padding:0.5rem 1rem;border:1px solid #d1d5db;border-radius:8px;background:white;cursor:pointer;font-size:0.85rem;"> 点击</button>' +
            '<button class="preview-btn" data-preview="streak" style="padding:0.5rem 1rem;border:1px solid #d1d5db;border-radius:8px;background:white;cursor:pointer;font-size:0.85rem;"> 连击</button>' +
            '<button class="preview-btn" data-preview="mastered" style="padding:0.5rem 1rem;border:1px solid #d1d5db;border-radius:8px;background:white;cursor:pointer;font-size:0.85rem;"> 掌握</button>' +
            '<button class="preview-btn" data-preview="levelUp" style="padding:0.5rem 1rem;border:1px solid #d1d5db;border-radius:8px;background:white;cursor:pointer;font-size:0.85rem;"> 升级</button>' +
            '</div>' +
            '</div>' +

            '<div style="background:white;border-radius:12px;padding:1.25rem;box-shadow:0 2px 8px rgba(0,0,0,0.08);margin-bottom:1rem;">' +
            '<h3 style="font-size:1rem;font-weight:600;margin-bottom:1rem;color:#374151;">🎵 背景音</h3>' +
            '<div style="margin-bottom:8px;">' +
            '<select id="ambientType" style="padding:0.5rem;border:1px solid #d1d5db;border-radius:8px;font-size:0.85rem;width:100%;">' +
            '<option value="none">🔇 关闭</option>' +
            '<option value="rain">🌧️ 雨声</option>' +
            '<option value="forest">🌲 森林</option>' +
            '<option value="cafe">☕ 咖啡厅</option>' +
            '<option value="whitenoise">📻 白噪音</option>' +
            '</select>' +
            '</div>' +
            '<div style="display:flex;align-items:center;gap:0.75rem;">' +
            '<span style="font-size:0.85rem;color:#6b7280;">音量</span>' +
            '<input type="range" id="ambientVolume" min="0" max="100" value="30" style="flex:1;">' +
            '<span id="ambientVolumeLabel" style="font-size:0.85rem;color:#6b7280;min-width:40px;">30%</span>' +
            '</div>' +
            '</div>' +

            '<div style="background:white;border-radius:12px;padding:1.25rem;box-shadow:0 2px 8px rgba(0,0,0,0.08);margin-bottom:1rem;">' +
            '<h3 style="font-size:1rem;font-weight:600;margin-bottom:1rem;color:#374151;">🌙 智能护眼</h3>' +
            '<div style="display:flex;flex-wrap:wrap;gap:0.75rem;margin-bottom:8px;">' +
            this._toggleItem('eyeCareEnabled', true, ' 自动护眼模式') +
            '</div>' +
            '<div style="display:flex;align-items:center;gap:0.75rem;">' +
            '<span style="font-size:0.85rem;color:#6b7280;">色温</span>' +
            '<input type="range" id="eyeCareLevel" min="0" max="100" value="30" style="flex:1;">' +
            '<span id="eyeCareLevelLabel" style="font-size:0.85rem;color:#6b7280;min-width:40px;">30%</span>' +
            '</div>' +
            '</div>' +

            '<div style="background:white;border-radius:12px;padding:1.25rem;box-shadow:0 2px 8px rgba(0,0,0,0.08);margin-bottom:1rem;">' +
            '<h3 style="font-size:1rem;font-weight:600;margin-bottom:1rem;color:#374151;">🍅 番茄钟</h3>' +
            '<div style="display:flex;flex-wrap:wrap;gap:0.75rem;">' +
            this._toggleItem('pomodoroEnabled', true, ' 启用番茄钟') +
            '</div>' +
            '</div>' +

            '<div style="background:white;border-radius:12px;padding:1.25rem;box-shadow:0 2px 8px rgba(0,0,0,0.08);margin-bottom:1rem;">' +
            '<h3 style="font-size:1rem;font-weight:600;margin-bottom:1rem;color:#374151;"> 数据管理</h3>' +
            '<div style="display:flex;flex-wrap:wrap;gap:0.5rem;">' +
            '<button id="resetXPBtn" style="padding:0.5rem 1rem;border:1px solid #f87171;border-radius:8px;background:#fef2f2;color:#dc2626;cursor:pointer;font-size:0.85rem;"> 重置 XP</button>' +
            '<button id="resetCalendarBtn" style="padding:0.5rem 1rem;border:1px solid #f87171;border-radius:8px;background:#fef2f2;color:#dc2626;cursor:pointer;font-size:0.85rem;"> 重置打卡</button>' +
            '<button id="resetChallengeBtn" style="padding:0.5rem 1rem;border:1px solid #f87171;border-radius:8px;background:#fef2f2;color:#dc2626;cursor:pointer;font-size:0.85rem;"> 重置挑战</button>' +
            '</div>' +
            '</div>' +
            '</div>';
    },

    _toggleItem: function (id, checked, label) {
        return '<label style="display:flex;align-items:center;gap:0.4rem;padding:0.4rem 0.75rem;border:1px solid #e5e7eb;border-radius:8px;cursor:pointer;font-size:0.85rem;background:#fafafa;">' +
            '<input type="checkbox" id="' + id + '" ' + (checked ? 'checked' : '') + ' style="cursor:pointer;">' +
            '<span>' + label + '</span>' +
            '</label>';
    },

    bindEvents: function () {
        var self = this;
        var content = document.getElementById('moduleContent');
        if (!content) return;

        // Master volume
        var masterSlider = document.getElementById('masterVolumeSlider');
        var masterValue = document.getElementById('masterVolumeValue');
        if (masterSlider) {
            masterSlider.addEventListener('input', function () {
                var vol = parseInt(masterSlider.value) / 100;
                if (typeof AudioSystem !== 'undefined') AudioSystem.setMasterVolume(vol);
                if (masterValue) masterValue.textContent = masterSlider.value + '%';
            });
        }

        // Sound toggles
        var soundToggles = [
            { id: 'sndCorrect', key: 'correct' },
            { id: 'sndWrong', key: 'wrong' },
            { id: 'sndStreak', key: 'streak' },
            { id: 'sndMastered', key: 'mastered' },
            { id: 'sndUnitComplete', key: 'unitComplete' },
            { id: 'sndAchievement', key: 'achievement' },
            { id: 'sndLevelUp', key: 'levelUp' }
        ];

        for (var i = 0; i < soundToggles.length; i++) {
            var el = document.getElementById(soundToggles[i].id);
            if (el) {
                el.addEventListener('change', (function (key) {
                    return function (e) {
                        if (typeof AudioSystem !== 'undefined') AudioSystem.setSoundEnabled(key, e.target.checked);
                    };
                })(soundToggles[i].key));
            }
        }

        // Celebration toggle
        var celebToggle = document.getElementById('celebrationEnabled');
        if (celebToggle) {
            celebToggle.addEventListener('change', function (e) {
                if (typeof Celebration !== 'undefined') Celebration.setEnabled(e.target.checked);
            });
        }

        // Encouragement toggle
        var encToggle = document.getElementById('encouragementEnabled');
        if (encToggle) {
            encToggle.addEventListener('change', function (e) {
                if (typeof EncouragementSystem !== 'undefined') EncouragementSystem.setEnabled(e.target.checked);
            });
        }

        // Preview buttons
        var previewBtns = content.querySelectorAll('.preview-btn');
        for (var j = 0; j < previewBtns.length; j++) {
            previewBtns[j].addEventListener('click', (function (btn) {
                return function () {
                    if (typeof AudioSystem === 'undefined') return;
                    var type = btn.dataset.preview;
                    switch (type) {
                        case 'correct': AudioSystem.playCorrect(); break;
                        case 'wrong': AudioSystem.playWrong(); break;
                        case 'click': AudioSystem.playClick(); break;
                        case 'streak': AudioSystem.playStreak(5); break;
                        case 'mastered': AudioSystem.playMastered(); break;
                        case 'levelUp': AudioSystem.playLevelUp(); break;
                    }
                };
            })(previewBtns[j]));
        }

        // Reset buttons
        var resetXP = document.getElementById('resetXPBtn');
        if (resetXP) {
            resetXP.addEventListener('click', function () {
                if (typeof XPSystem !== 'undefined') XPSystem.reset();
                alert('XP 数据已重置');
            });
        }

        var resetCal = document.getElementById('resetCalendarBtn');
        if (resetCal) {
            resetCal.addEventListener('click', function () {
                if (typeof DailyCalendar !== 'undefined') DailyCalendar.reset();
                alert('打卡数据已重置');
            });
        }

        var resetCh = document.getElementById('resetChallengeBtn');
        if (resetCh) {
            resetCh.addEventListener('click', function () {
                if (typeof QuickChallenge !== 'undefined') QuickChallenge.reset();
                alert('挑战记录已重置');
            });
        }

        var ambientType = document.getElementById('ambientType');
        if (ambientType && typeof AmbientSound !== 'undefined') {
            var savedType = (function () { try { return JSON.parse(localStorage.getItem('ambient_prefs') || '{}').type || 'none'; } catch (e) { return 'none'; } })();
            ambientType.value = savedType;
            ambientType.addEventListener('change', function () {
                if (ambientType.value === 'none') {
                    AmbientSound.stop();
                } else {
                    AmbientSound.play(ambientType.value);
                }
            });
        }

        var ambientVol = document.getElementById('ambientVolume');
        var ambientVolLabel = document.getElementById('ambientVolumeLabel');
        if (ambientVol && typeof AmbientSound !== 'undefined') {
            var savedVol = (function () { try { return JSON.parse(localStorage.getItem('ambient_prefs') || '{}').volume || 30; } catch (e) { return 30; } })();
            ambientVol.value = savedVol;
            if (ambientVolLabel) ambientVolLabel.textContent = savedVol + '%';
            ambientVol.addEventListener('input', function () {
                AmbientSound.setVolume(parseInt(ambientVol.value));
                if (ambientVolLabel) ambientVolLabel.textContent = ambientVol.value + '%';
            });
        }

        var eyeCareToggle = document.getElementById('eyeCareEnabled');
        if (eyeCareToggle && typeof SmartEyeCare !== 'undefined') {
            eyeCareToggle.addEventListener('change', function (e) {
                if (e.target.checked) { SmartEyeCare.enable(); } else { SmartEyeCare.disable(); }
            });
        }

        var eyeCareSlider = document.getElementById('eyeCareLevel');
        var eyeCareLevelLabel = document.getElementById('eyeCareLevelLabel');
        if (eyeCareSlider && typeof SmartEyeCare !== 'undefined') {
            eyeCareSlider.addEventListener('input', function () {
                document.body.style.filter = 'sepia(' + eyeCareSlider.value + '%) brightness(0.95)';
                document.body.style.transition = 'filter 0.5s';
                if (eyeCareLevelLabel) eyeCareLevelLabel.textContent = eyeCareSlider.value + '%';
            });
        }

        var pomodoroToggle = document.getElementById('pomodoroEnabled');
        if (pomodoroToggle && typeof PomodoroTimer !== 'undefined') {
            pomodoroToggle.addEventListener('change', function (e) {
                PomodoroTimer.enabled = e.target.checked;
                localStorage.setItem('pomodoro_enabled', e.target.checked ? '1' : '0');
            });
        }
    }
};
