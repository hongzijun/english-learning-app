const QualityMonitor = {
    version: '1.0.0',
    logs: [],
    startTime: Date.now(),
    config: {
        maxLogs: 500,
        autoCapture: true,
        showPanel: true,
        reportUrl: '',
        checkInterval: 30000,
        perfThreshold: 50,
        memoryCheck: true
    },
    counters: { error: 0, warn: 0, info: 0, render: 0, perf: 0, data: 0 },

    init: function(opts) {
        if (this._initialized) { this.log('warn', 'system', 'QualityMonitor already initialized, skipping'); return; }
        this._initialized = true;
        if (opts) Object.assign(this.config, opts);
        this.loadPersisted();
        if (this.config.autoCapture) {
            this.captureErrors();
            this.capturePromises();
            this.captureResources();
            this.captureConsole();
            this.startPeriodicChecks();
        }
        if (this.config.showPanel) {
            setTimeout(() => this.renderPanel(), 500);
        }
        this.log('info', 'system', 'QualityMonitor v' + this.version + ' initialized');

        var self = this;
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(function() { self.runFullAudit(); }, 1000);
        });
    },

    log: function(level, category, message, detail, source) {
        var entry = {
            id: this.logs.length + 1,
            ts: new Date().toISOString(),
            level: level,
            cat: category || 'general',
            msg: message,
            detail: detail || null,
            src: source || this._getCaller(3),
            url: location.href,
            mem: this._getMemory()
        };
        this.logs.push(entry);
        if (this.counters[level] !== undefined) this.counters[level]++;
        if (this.logs.length > this.config.maxLogs) this.logs.shift();
        this.persist();
        this.updatePanel();
        return entry;
    },

    error: function(cat, msg, detail) { return this.log('error', cat, msg, detail); },
    warn: function(cat, msg, detail) { return this.log('warn', cat, msg, detail); },
    info: function(cat, msg, detail) { return this.log('info', cat, msg, detail); },

    captureErrors: function() {
        window.addEventListener('error', (e) => {
            var cat = 'js-error';
            var msg = e.message;
            if (e.target && e.target !== window) {
                cat = 'resource-error';
                msg = 'Resource failed: ' + (e.target.src || e.target.href || e.target.tagName);
                this.error(cat, msg, { tag: e.target.tagName, src: e.target.src || e.target.href });
            } else {
                this.error(cat, msg, {
                    file: e.filename,
                    line: e.lineno,
                    col: e.colno,
                    stack: e.error ? e.error.stack : null
                });
            }
        }, true);
    },

    capturePromises: function() {
        window.addEventListener('unhandledrejection', (e) => {
            this.error('promise', 'Unhandled rejection: ' + (e.reason ? e.reason.message || e.reason : 'unknown'), {
                stack: e.reason && e.reason.stack ? e.reason.stack : null
            });
        });
    },

    captureResources: function() {
        var origXHR = XMLHttpRequest.prototype.open;
        var self = this;
        XMLHttpRequest.prototype.open = function(method, url) {
            this._qm_url = url;
            this._qm_method = method;
            this._qm_start = Date.now();
            this.addEventListener('load', function() {
                if (this.status >= 400) {
                    self.warn('network', 'HTTP ' + this.status + ': ' + method + ' ' + url, {
                        status: this.status, time: Date.now() - this._qm_start
                    });
                }
            });
            this.addEventListener('error', function() {
                self.error('network', 'Request failed: ' + method + ' ' + url, { time: Date.now() - this._qm_start });
            });
            this.addEventListener('timeout', function() {
                self.warn('network', 'Timeout: ' + method + ' ' + url);
            });
            return origXHR.apply(this, arguments);
        };

        var origFetch = window.fetch;
        if (origFetch) {
            window.fetch = function(url, opts) {
                var start = Date.now();
                return origFetch.apply(this, arguments).then(function(resp) {
                    if (!resp.ok) {
                        self.warn('network', 'Fetch HTTP ' + resp.status + ': ' + url, { time: Date.now() - start });
                    }
                    return resp;
                }).catch(function(err) {
                    self.error('network', 'Fetch failed: ' + url, { err: err.message, time: Date.now() - start });
                    throw err;
                });
            };
        }
    },

    captureConsole: function() {
        var methods = ['warn', 'error'];
        var self = this;
        methods.forEach(function(m) {
            var orig = console[m];
            console[m] = function() {
                var args = Array.prototype.slice.call(arguments);
                var msg = args.map(function(a) {
                    try { return typeof a === 'object' ? JSON.stringify(a).substring(0, 200) : String(a); }
                    catch(e) { return String(a); }
                }).join(' ');
                self.log(m === 'error' ? 'console-err' : 'console-warn', m, msg, { args: args.slice(0, 5) });
                orig.apply(console, args);
            };
        });
    },

    startPeriodicChecks: function() {
        var self = this;
        setInterval(function() { self.checkRendering(); }, self.config.checkInterval);
        setInterval(function() { self.checkPerformance(); }, self.config.checkInterval * 2);
        document.addEventListener('visibilitychange', function() {
            if (!document.hidden) { self.checkRendering(); self.info('audit', 'Page became visible - running checks'); }
        });
    },

    runFullAudit: function() {
        this.info('audit', '=== Running full quality audit ===');
        this.checkDOMIntegrity();
        this.checkDataIntegrity();
        this.checkEventBindings();
        this.checkCSSIssues();
        this.checkAccessibility();
        this.checkModuleHealth();
        this.info('audit', '=== Audit complete. Total issues: ' + (this.counters.error + this.counters.warn) + ' ===');
    },

    checkDOMIntegrity: function() {
        var self = this;
        var emptyContainers = [];
        document.querySelectorAll('[id]').forEach(function(el) {
            if (el.offsetHeight > 0 && el.innerHTML.trim().length === 0 && el.children.length === 0) {
                emptyContainers.push('#' + el.id);
            }
        });
        if (emptyContainers.length > 0) {
            this.warn('render', emptyContainers.length + ' visible but empty containers found', { ids: emptyContainers.slice(0, 10) });
        }

        var hiddenContent = [];
        document.querySelectorAll('[style*="display:none"],[style*="display: none"],[hidden],[class*="hidden"]').forEach(function(el) {
            if (el.children.length > 3) hiddenContent.push(el.tagName + '#' + (el.id || '') + '.' + (el.className || '').split(' ')[0]);
        });
        if (hiddenContent.length > 2) {
            this.info('render', hiddenContent.length + ' hidden elements detected (may be intentional)', { elements: hiddenContent.slice(0, 8) });
        }

        var dupIds = {};
        document.querySelectorAll('[id]').forEach(function(el) {
            if (el.id && el.id.indexOf('qm-') !== 0 && !el.closest('#qm-panel')) {
                dupIds[el.id] = (dupIds[el.id] || 0) + 1;
            }
        });
        Object.keys(dupIds).forEach(function(id) {
            if (dupIds[id] > 1) self.error('dom', 'Duplicate ID: #' + id + ' (' + dupIds[id] + ' occurrences)');
        });

        var textOverflow = [];
        document.querySelectorAll('*').forEach(function(el) {
            if (el.scrollWidth > el.clientWidth + 2 && el.clientHeight > 30 && el.scrollWidth - el.clientWidth > 10) {
                textOverflow.push({ tag: el.tagName, id: el.id, cls: (el.className||'').toString().substring(0,40), overflow: el.scrollWidth - el.clientWidth });
            }
        });
        if (textOverflow.length > 0) {
            this.warn('css', textOverflow.length + ' elements have horizontal overflow/clip', { items: textOverflow.slice(0, 8) });
        }
    },

    checkDataIntegrity: function() {
        if (typeof Grade7Data !== 'undefined') {
            try {
                if (!Grade7Data.units) { this.error('data', 'Grade7Data.units is undefined'); return; }
                Grade7Data.units.forEach(function(u, i) {
                    if (!u.words || u.words.length === 0) this.error('data', 'Unit ' + u.id + ' has no words');
                    else u.words.forEach(function(w) {
                        if (!w.w) this.error('data', 'Word missing "w" field in U' + u.id + ' id=' + w.id);
                        if (!w.m) this.warn('data', 'Word "' + w.w + '" missing Chinese meaning (m)');
                        if (!w.p) this.warn('data', 'Word "' + w.w + '" missing pronunciation (p)');
                        if (!w.ex || w.ex.length === 0) this.warn('data', 'Word "' + w.w + '" has no examples');
                    });
                    if (!u.grammar || u.grammar.length === 0) this.warn('data', 'Unit ' + u.id + ' has no grammar points');
                    if (!u.exercises || u.exercises.length === 0) this.warn('data', 'Unit ' + u.id + ' has no exercises');
                });
                if (Grade7Data.getAllWords) {
                    var allW = Grade7Data.getAllWords();
                    var dupW = {}; allW.forEach(function(w) { dupW[w.w] = (dupW[w.w] || 0) + 1; });
                    Object.keys(dupW).forEach(function(w) { if (dupW[w] > 1) this.warn('data', 'Duplicate word: "' + w + '" (' + dupW[w] + 'x)'); }.bind(this));
                }
                this.info('data', 'Grade7Data OK: ' + (Grade7Data.getAllWords ? Grade7Data.getAllWords().length : '?') + ' words, ' + Grade7Data.units.length + ' units');
            } catch(e) { this.error('data', 'Grade7Data audit crashed', { err: e.message }); }
        }

        if (typeof SpacedRepetition !== 'undefined') {
            try {
                var srData = localStorage.getItem(SpacedRepetition.STORAGE_KEY || 'sr_data');
                if (srData) {
                    var parsed = JSON.parse(srData);
                    if (!parsed.cards || Object.keys(parsed.cards).length === 0) this.info('data', 'SpacedRepetition: no cards yet (normal for first use)');
                    else this.info('data', 'SpacedRepetition: ' + Object.keys(parsed.cards).length + ' cards stored');
                } else this.info('data', 'SpacedRepetition: no saved data in localStorage');
            } catch(e) { this.error('data', 'SpacedRepetition data corrupt', { err: e.message }); }
        }
    },

    checkEventBindings: function() {
        var btns = document.querySelectorAll('button:not([disabled])');
        var unboundBtns = [];
        btns.forEach(function(btn) {
            var hasClick = btn.onclick || btn.getAttribute('onclick');
            if (!hasClick && btn.id && !btn.classList.contains('quality-*')) unboundBtns.push(btn.id || btn.className || btn.textContent.substring(0,20));
        });
        if (unboundBtns.length > 3) this.warn('events', unboundBtns.length + ' buttons may lack direct click handlers (may use delegation)', { sample: unboundBtns.slice(0, 10) });
    },

    checkCSSIssues: function() {
        var inlineStyles = document.querySelectorAll('[style]');
        if (inlineStyles.length > 50) this.warn('css', inlineStyles.length + ' inline styles detected (consider using classes)');
        
        var importantRules = [];
        document.querySelectorAll('*').forEach(function(el) {
            if (el.style && el.style.cssText && el.style.cssText.indexOf('!important') >= 0) {
                importantRules.push((el.id||el.tagName) + ': ' + el.style.cssText.substring(0,60));
            }
        });
        if (importantRules.length > 0) this.warn('css', importantRules.length + ' !important rules found', { rules: importantRules.slice(0, 8) });

        var sheets = document.styleSheets;
        var cssErrors = 0;
        try {
            for (var s = 0; s < sheets.length; s++) {
                try {
                    var rules = sheets[s].cssRules || [];
                    for (var r = 0; r < rules.length; r++) {
                        if (rules[r].selectorText && rules[r].selectorText.indexOf(':not(') >= 0 && rules[r].selectorText.match(/\(/g).length > 1) cssErrors++;
                    }
                } catch(se) { cssErrors++; }
            }
        } catch(e) {}
        if (cssErrors > 0) this.warn('css', cssErrors + ' CSS access errors or complex selectors');
    },

    checkAccessibility: function() {
        var imgs = document.querySelectorAll('img:not([alt])');
        if (imgs.length > 0) this.warn('a11y', imgs.length + ' images missing alt attribute');

        var noLabelInputs = document.querySelectorAll('input:not([aria-label]):not([placeholder]):not([id])');
        if (noLabelInputs.length > 0) this.warn('a11y', noLabelInputs.length + ' inputs without label/placeholder/aria-label');

        var lowContrast = [];
        document.querySelectorAll('*').forEach(function(el) {
            var style = getComputedStyle(el);
            if (style.color && style.backgroundColor && el.textContent.trim().length > 0 && el.offsetHeight > 20) {
                var fg = style.color.match(/\d+/g);
                var bg = style.backgroundColor.match(/\d+/g);
                if (fg && bg && fg.length >= 3 && bg.length >= 3) {
                    var ratio = (Math.abs(parseInt(fg[0])-parseInt(bg[0])) + Math.abs(parseInt(fg[1])-parseInt(bg[1])) + Math.abs(parseInt(fg[2])-parseInt(bg[2]))) / 765;
                    if (ratio < 0.15) lowContrast.push(el.tagName + (el.id?'#'+el.id:''));
                }
            }
        });
        if (lowContrast.length > 0) this.warn('a11y', lowContrast.length + ' potential low contrast elements', { tags: lowContrast.slice(0, 8) });
    },

    checkModuleHealth: function() {
        var modules = ['App','WordsModule','EnhancedWordsModule','SmartWordsModule','SpacedRepetition','AdvancedGrammarModule','MistakeAnalysisSystem'];
        var missing = [];
        modules.forEach(function(name) {
            if (typeof window[name] === 'undefined') missing.push(name);
            else if (typeof window[name].init === 'function') this.info('module', name + ' loaded OK');
            else this.info('module', name + ' exists (type: ' + typeof window[name] + ')');
        }.bind(this));
        if (missing.length > 0) {
            if (document.readyState !== 'complete') {
                this.warn('module', missing.length + ' modules still loading (page not complete): ' + missing.join(', '));
            } else {
                missing.forEach(function(name) { this.warn('module', name + ' not found after page load'); }.bind(this));
            }
        }
    },

    checkRendering: function() {
        var mainContent = document.getElementById('moduleContent') || document.getElementById('app') || document.getElementById('main') || document.body;
        if (!mainContent) { this.error('render', 'No main content container found'); return; }
        var rect = mainContent.getBoundingClientRect();
        if (rect.width < 100) this.warn('render', 'Main content width only ' + Math.round(rect.width) + 'px');
        if (mainContent.scrollHeight > 0 && mainContent.clientHeight === 0) this.warn('render', 'Main content has scrollHeight but zero clientHeight (possibly hidden)');
        
        var learningArea = document.getElementById('learningArea');
        if (learningArea) {
            var lr = learningArea.getBoundingClientRect();
            if (learningArea.innerHTML.trim().length === 0 && lr.height > 100) {
                this.warn('render', '#learningArea is visible but empty (blank screen issue?)');
            }
        }
    },

    checkPerformance: function() {
        var now = performance.now();
        if (window.performance && performance.memory) {
            var mb = Math.round(performance.memory.usedJSHeapSize / 1048576);
            var limit = Math.round(performance.memory.jsHeapSizeLimit / 1048576);
            if (mb > limit * 0.8) this.error('perf', 'Memory high: ' + mb + 'MB / ' + limit + 'MB (' + Math.round(mb/limit*100) + '%)');
            else if (mb > limit * 0.6) this.warn('perf', 'Memory usage: ' + mb + 'MB / ' + limit + 'MB (' + Math.round(mb/limit*100) + '%)');
            else this.info('perf', 'Memory: ' + mb + 'MB / ' + limit + 'MB');
        }

        if (performance.getEntriesByType) {
            var longTasks = performance.getEntriesByType('longtask');
            if (longTasks.length > 0) {
                var lastTask = longTasks[longTasks.length - 1];
                if (lastTask.duration > 200) this.warn('perf', 'Long task detected: ' + Math.round(lastTask.duration) + 'ms');
            }
        }

        var fps = this._measureFPS();
        if (fps < 15) this.error('perf', 'Very low FPS: ' + fps.toFixed(1));
        else if (fps < 30) this.warn('perf', 'Low FPS: ' + fps.toFixed(1));

        var elapsed = (Date.now() - this.startTime) / 1000;
        this.info('perf', 'Uptime: ' + Math.round(elapsed) + 's, Logs: ' + this.logs.length + ', Errors: ' + this.counters.error);
    },

    _measureFPS: function() {
        var frames = 0;
        var start = performance.now();
        return new Promise(function(resolve) {
            function count() { frames++; if (performance.now() - start < 500) requestAnimationFrame(count); else resolve(frames * 2); }
            requestAnimationFrame(count);
        });
    },

    _getCaller: function(depth) {
        depth = depth || 3;
        try { throw new Error(); } catch(e) {
            var lines = e.stack.split('\n');
            for (var i = 0; i < lines.length; i++) {
                if (lines[i].indexOf('QualityMonitor') < 0 && lines[i].indexOf('at ') >= 0) {
                    var m = lines[i].trim().match(/at\s+(\S+)\s+\((.+):(\d+):(\d+)/);
                    return m ? m[1] + ':' + m[3] : lines[i].trim();
                }
            }
        }
        return 'unknown';
    },

    _getMemory: function() {
        try { if (performance && performance.memory) return Math.round(performance.memory.usedJSHeapSize / 1048576) + 'MB'; } catch(e) {}
        return '-';
    },

    persist: function() {
        try {
            var data = {
                version: this.version,
                savedAt: new Date().toISOString(),
                logs: this.logs.slice(-100),
                counters: this.counters,
                url: location.href
            };
            localStorage.setItem('qm_logs', JSON.stringify(data));
        } catch(e) { /* storage full */ }
    },

    loadPersisted: function() {
        try {
            var d = localStorage.getItem('qm_logs');
            if (d) {
                var p = JSON.parse(d);
                if (p.logs) { this.logs = p.logs; this.counters = p.counters || this.counters; }
            }
        } catch(e) {}
    },

    exportLog: function() {
        var data = {
            exportTime: new Date().toISOString(),
            url: location.href,
            userAgent: navigator.userAgent,
            uptime: Math.round((Date.now() - this.startTime) / 1000) + 's',
            summary: this.counters,
            logs: this.logs.map(function(l) { return l; })
        };
        var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a'); a.href = url;
        a.download = 'quality-log-' + Date.now() + '.json';
        a.click(); URL.revokeObjectURL(url);
        this.info('system', 'Log exported: ' + a.download);
    },

    clearLogs: function() {
        this.logs = []; this.counters = { error: 0, warn: 0, info: 0, render: 0, perf: 0, data: 0 };
        localStorage.removeItem('qm_logs');
        this.updatePanel();
    },

    renderPanel: function() {
        if (document.getElementById('qm-panel')) return;
        var panel = document.createElement('div');
        panel.id = 'qm-panel';
        panel.innerHTML = '<style>#qm-panel{position:fixed;bottom:10px;right:10px;z-index:99999;font-family:Consolas,monospace;font-size:12px;width:380px;max-height:60vh;background:#1a1a2e;color:#e0e0e0;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.5);overflow:hidden;display:flex;flex-direction:column;border:1px solid #333}#qm-header{background:linear-gradient(135deg,#16213e,#0f3460);padding:8px 12px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;user-select:none}#qm-header:hover{background:#1a2744}#qm-title{font-weight:700;font-size:13px;display:flex;align-items:center;gap:6px}#qm-badges{display:flex;gap:4px}#qm-badge{padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600}#qm-badge.err{background:#dc2626;color:#fff}#qm-badge.wrn{background:#f59e0b;color:#000}#qm-badge.inf{background:#3b82f6;color:#fff}#qm-body{display:none;flex-direction:column;max-height:45vh;overflow-y:auto}#qm-body.show{display:flex}#qm-toolbar{display:flex;gap:4px;padding:6px 10px;background:#16213e;border-bottom:1px solid #333;flex-wrap:wrap}#qm-filter-btn{padding:3px 10px;border:1px solid #444;background:#0f3460;color:#aaa;border-radius:4px;cursor:pointer;font-size:11px}#qm-filter-btn.active{background:#3b82f6;color:#fff;border-color:#3b82f6}#qm-log-list{flex:1;overflow-y:auto;padding:4px 0}.qm-entry{padding:6px 10px;border-bottom:1px solid #222;display:flex;gap:8px;align-items:flex-start;line-height:1.4}.qm-entry:hover{background:#1e293b}.qm-lv{width:8px;height:8px;border-radius:50%;flex-shrink:0;margin-top:4px}.qm-lv-err{background:#dc2626}.qm-lv-wrn{background:#f59e0b}.qm-lv-inf{background:#3b82f6}.qm-lv-perf{background:#8b5cf6}.qm-lv-data{background:#06b6d4}.qm-lv-render{background:#f97316}.qm-msg{flex:1;word-break:break-all}.qm-cat{color:#888;font-size:10px;margin-right:4px}.qm-time{color:#555;font-size:10px;white-space:nowrap}#qm-footer{padding:6px 10px;background:#16213e;border-top:1px solid #333;display:flex;justify-content:space-between;font-size:11px;color:#888}#qm-action-btn{padding:3px 10px;border:1px solid #444;background:#0f3460;color:#ccc;border-radius:4px;cursor:pointer;font-size:11px}#qm-action-btn:hover{background:#1e3a5f}</style><div id="qm-header" onclick="QualityMonitor.toggleBody()"><div id="qm-title">🔍 QM <span id="qm-count">0</span></div><div id="qm-badges"><span class="qm-badge err" id="qm-e-count" title="Errors">E0</span><span class="qm-badge wrn" id="qm-w-count" title="Warnings">W0</span></div></div><div id="qm-body"><div id="qm-toolbar"></div><div id="qm-log-list"></div></div><div id="qm-footer"><span id="qm-stats"></span><div><button class="qm-action-btn" onclick="QualityMonitor.exportLog()">📥 Export</button> <button class="qm-action-btn" onclick="QualityMonitor.clearLogs()">🗑 Clear</button> <button class="qm-action-btn" onclick="QualityMonitor.runFullAudit()">🔎 Audit</button></div></div>';
        document.body.appendChild(panel);
        this.updatePanel();
        this._bindToolbar();

        var header = document.getElementById('qm-header');
        header.addEventListener('dblclick', function() {
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        });
    },

    currentFilter: 'all',
    
    toggleBody: function() {
        var body = document.getElementById('qm-body');
        body.classList.toggle('show');
    },

    updatePanel: function() {
        var panel = document.getElementById('qm-panel');
        if (!panel) return;

        var ec = this.counters.error;
        var wc = this.counters.warn;
        var el = document.getElementById('qm-e-count');
        var wl = document.getElementById('qm-w-count');
        var ct = document.getElementById('qm-count');

        if (el) { el.textContent = 'E' + ec; el.style.background = ec > 0 ? '#dc2626' : '#374151'; }
        if (wl) { wl.textContent = 'W' + wc; wl.style.background = wc > 0 ? '#f59e0b' : '#374151'; }
        if (ct) ct.textContent = this.logs.length;

        var stEl = document.getElementById('qm-stats');
        if (stEl) stEl.textContent = this.logs.length + ' logs | ' + this._getMemory() + ' | ' + Math.round((Date.now() - this.startTime)/1000) + 's';

        this._renderLogs();
    },

    _bindToolbar: function() {
        var toolbar = document.getElementById('qm-toolbar');
        var filters = ['all','error','warn','info','render','perf','data','dom','css','events','module','audit','network','a11y','console-err','console-warn','system'];
        var self = this;
        filters.forEach(function(f) {
            var btn = document.createElement('button');
            btn.className = 'qm-filter-btn' + (f === 'all' ? ' active' : '');
            btn.textContent = f;
            btn.dataset.filter = f;
            btn.onclick = function() {
                toolbar.querySelectorAll('.qm-filter-btn').forEach(function(b){ b.classList.remove('active'); });
                btn.classList.add('active');
                self.currentFilter = f;
                self._renderLogs();
            };
            toolbar.appendChild(btn);
        });
    },

    _renderLogs: function() {
        var list = document.getElementById('qm-log-list');
        if (!list) return;
        var filter = this.currentFilter;
        var filtered = filter === 'all' ? this.logs : this.logs.filter(function(l) { return l.level === filter || l.cat === filter; });
        var display = filtered.slice(-80).reverse();
        list.innerHTML = display.map(function(l) {
            return '<div class="qm-entry"><div class="qm-lv qm-lv-' + l.level + '"></div><div class="qm-msg"><span class="qm-cat">[' + l.cat + ']</span>' + _escHtml(l.msg) + (l.detail ? ' <span style="color:#666;font-size:10px">' + _escHtml(typeof l.detail === 'string' ? l.detail : JSON.stringify(l.detail).substring(0, 120)) + '</span>' : '') + '</div><div class="qm-time">' + l.ts.substring(11,19) + '</div></div>';
        }).join('');
    }
};

function _escHtml(s) { if(!s) return ''; return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

if (typeof window !== 'undefined') { window.QualityMonitor = QualityMonitor; }