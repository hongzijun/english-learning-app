var QualityMonitorV2 = {
    version: '2.0.0',
    logs: [],
    startTime: Date.now(),
    config: { maxLogs: 500, autoCapture: true, showPanel: true, checkInterval: 30000 },
    counters: { error: 0, warn: 0, info: 0 },
    _ready: false,
    _auditDone: false,

    init: function (opts) {
        if (this._ready) return;
        this._ready = true;
        if (opts) for (var k in opts) this.config[k] = opts[k];
        this._loadSaved();
        if (this.config.autoCapture) {
            this._captureErrors();
            this._capturePromises();
            this._startPeriodic();
        }
        if (this.config.showPanel) setTimeout(function () { QualityMonitorV2._renderPanel(); }, 600);
        this.log('info', 'system', 'QM v' + this.version + ' OK');

        var self = this;
        document.addEventListener('DOMContentLoaded', function () {
            setTimeout(function () { self.runAudit(); }, 1500);
        });
        if (document.readyState === 'complete') {
            setTimeout(function () { self.runAudit(); }, 1500);
        }
    },

    log: function (lv, cat, msg, det) {
        var e = { id: this.logs.length + 1, ts: new Date().toISOString(), level: lv, cat: cat || '?', msg: msg || '', detail: det || null };
        this.logs.push(e);
        if (this.counters[lv] !== undefined) this.counters[lv]++;
        if (this.logs.length > this.config.maxLogs) this.logs.shift();
        this._save();
        this._refreshUI();
        return e;
    },
    error: function (c, m, d) { return this.log('error', c, m, d); },
    warn: function (c, m, d) { return this.log('warn', c, m, d); },
    info: function (c, m, d) { return this.log('info', c, m, d); },

    _captureErrors: function () {
        window.addEventListener('error', function (ev) {
            if (ev.target && ev.target !== window) {
                QualityMonitorV2.error('resource', 'Failed: ' + (ev.target.src || ev.target.href || ev.target.tagName), { tag: ev.target.tagName });
            } else {
                QualityMonitorV2.error('js', ev.message || 'Script error.', { file: ev.filename, line: ev.lineno, col: ev.colno, stack: ev.error ? ev.error.stack : null });
            }
        }, true);
        window.addEventListener('unhandledrejection', function (ev) {
            QualityMonitorV2.error('promise', String(ev.reason ? (ev.reason.message || ev.reason) : 'unknown'));
        });
    },

    _capturePromises: function () {
        var self = this;
        var _open = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function (m, u) {
            this._qm_u = u; this._qm_m = m; this._qm_t = Date.now();
            this.addEventListener('load', function () { if (this.status >= 400) self.warn('net', 'HTTP ' + this.status + ' ' + m + ' ' + u); });
            this.addEventListener('error', function () { self.error('net', 'FAIL ' + m + ' ' + u); });
            return _open.apply(this, arguments);
        };
    },

    _startPeriodic: function () {
        var self = this;
        setInterval(function () { self.checkRender(); }, this.config.checkInterval);
        setInterval(function () { self.checkPerf(); }, this.config.checkInterval * 2);
        document.addEventListener('visibilitychange', function () {
            if (!document.hidden) { self.checkRender(); self.info('audit', 'visible - checking'); }
        });
    },

    runAudit: function () {
        if (this._auditDone && this.counters.error === 0) return;
        this.info('audit', '--- Full Audit ---');
        this._checkDOM();
        this._checkData();
        this._checkModules();
        this._checkRender();
        this._auditDone = true;
        var total = this.counters.error + this.counters.warn;
        this.info('audit', '--- Done: E=' + this.counters.error + ' W=' + this.counters.warn + ' ---');
    },

    _checkDOM: function () {
        var self = this;
        var panel = document.getElementById('qm-panel-v2');
        var empties = [];
        document.querySelectorAll('[id]').forEach(function (el) {
            if (panel && (el.id.indexOf('qm-') === 0 || el.closest('#qm-panel-v2'))) return;
            if (el.offsetHeight > 10 && el.innerHTML.trim().length === 0 && el.children.length === 0) {
                empties.push('#' + el.id);
            }
        });
        if (empties.length > 0) this.warn('render', empties.length + ' empty visible containers', { ids: empties.slice(0, 8) });

        var dupMap = {};
        document.querySelectorAll('[id]').forEach(function (el) {
            if (panel && (el.id.indexOf('qm-') === 0 || el.closest('#qm-panel-v2'))) return;
            if (el.id) dupMap[el.id] = (dupMap[el.id] || 0) + 1;
        });
        Object.keys(dupMap).forEach(function (id) {
            if (dupMap[id] > 1) self.error('dom', 'DUP #' + id + ' x' + dupMap[id]);
        });
    },

    _checkData: function () {
        if (typeof Grade7Data !== 'undefined') {
            try {
                if (!Grade7Data.units) { this.error('data', 'Grade7Data.units missing'); return; }
                Grade7Data.units.forEach(function (u) {
                    if (!u.words || !u.words.length) this.error('data', 'U' + u.id + ' no words');
                    else u.words.forEach(function (w) {
                        if (!w.w) this.error('data', 'word missing w in U' + u.id);
                        if (!w.m) this.warn('data', '"' + w.w + '" no Chinese m');
                    });
                });
                var totalW = Grade7Data.getAllWords ? Grade7Data.getAllWords().length : '?';
                this.info('data', 'Grade7Data: ' + totalW + 'w, ' + Grade7Data.units.length + ' units');
            } catch (e) { this.error('data', 'audit crash: ' + e.message); }
        } else {
            this.warn('data', 'Grade7Data not found (may load later)');
        }
    },

    _checkModules: function () {
        var mods = ['App', 'WordsModule', 'EnhancedWordsModule', 'SmartWordsModule', 'SpacedRepetition', 'AdvancedGrammarModule', 'MistakeAnalysisSystem'];
        var miss = [];
        mods.forEach(function (n) {
            if (typeof window[n] === 'undefined') miss.push(n);
            else if (typeof window[n].init === 'function') { } else { }
        });
        if (miss.length > 0) {
            if (document.readyState !== 'complete') {
                this.warn('module', miss.length + ' loading: ' + miss.join(','));
            } else {
                miss.forEach(function (n) { this.warn('module', n + ' MISSING after load'); }.bind(this));
            }
        } else {
            this.info('module', 'All ' + mods.length + ' modules loaded');
        }
    },

    checkRender: function () {
        var mc = document.getElementById('moduleContent');
        if (!mc) return;
        var r = mc.getBoundingClientRect();
        if (r.width > 50 && r.height > 20 && mc.innerHTML.trim().length === 0) {
            this.error('render', '#moduleContent VISIBLE but EMPTY! height=' + Math.round(r.height) + ' width=' + Math.round(r.width));
        } else if (mc.innerHTML.trim().length > 0) {
            // OK
        }

        var la = document.getElementById('learningArea');
        if (la && la.offsetHeight > 100 && la.innerHTML.trim().length === 0) {
            this.warn('render', '#learningArea visible but empty');
        }
    },

    checkPerf: function () {
        if (performance && performance.memory) {
            var mb = Math.round(performance.memory.usedJSHeapSize / 1048576);
            var lim = Math.round(performance.memory.jsHeapSizeLimit / 1048576);
            if (mb > lim * 0.8) this.error('perf', mb + 'MB/' + lim + 'MB');
            else this.info('perf', mb + 'MB/' + lim + 'MB');
        }
        var up = Math.round((Date.now() - this.startTime) / 1000);
        this.info('perf', up + 's up | logs:' + this.logs.length + ' E:' + this.counters.error);
    },

    _renderPanel: function () {
        if (document.getElementById('qm-panel-v2')) return;
        var p = document.createElement('div');
        p.id = 'qm-panel-v2';
        p.innerHTML = '<style>#qm-panel-v2{position:fixed;bottom:8px;right:8px;z-index:999999;font-family:Consolas,monospace;font-size:11px;width:360px;max-height:55vh;background:#0f172a;color:#e2e8f0;border-radius:10px;box-shadow:0 8px 32px rgba(0,0,0,.6);border:1px solid #334155;display:flex;flex-direction:column;overflow:hidden}#qm-hd-v2{background:linear-gradient(135deg,#1e293b,#0f172a);padding:6px 10px;display:flex;justify-content:space-between;align-items:center;cursor:pointer}#qm-tit-v2{font-weight:700;font-size:12px}#qm-bdg-v2{display:flex;gap:4px}#qm-bdg-v2 span{padding:1px 7px;border-radius:8px;font-size:10px;font-weight:700}#qm-bdg-v2 .e{background:#dc2626;color:#fff}#qm-bdg-v2 .w{background:#f59e0b;color:#000}#qm-body-v2{display:none;flex-direction:column;max-height:40vh;overflow-y:auto}#qm-body-v2.on{display:flex}#qm-tb-v2{display:flex;gap:3px;padding:5px 8px;background:#1e293b;border-bottom:1px solid #334155;flex-wrap:wrap}#qm-flt-v2{padding:2px 8px;border:1px solid #475569;background:#0f172a;color:#94a3b8;border-radius:3px;cursor:pointer;font-size:10px}#qm-flt-v2.on{background:#3b82f6;color:#fff;border-color:#3b82f6}#qm-list-v2{flex:1;overflow-y:auto;padding:2px 0}.qm-e-v2{padding:4px 8px;border-bottom:1px solid #1e293b;display:flex;gap:6px;line-height:1.35}.qm-e-v2:hover{background:#1e293b}.qm-dot-v2{width:7px;height:7px;border-radius:50%;flex-shrink:0;margin-top:3px}.qm-dot-v2.e{background:#dc2626}.qm-dot-v2.w{background:#f59e0b}.qm-dot-v2.i{background:#3b82f6}.qm-dot-v2.p{background:#8b5cf6}.qm-dot-v2.d{background:#06b6d4}.qm-dot-v2.r{background:#f97316}.qm-msg-v2{flex:1;word-break:break-all;font-size:10.5px}.qm-ct-v2{color:#64748b;font-size:9px;margin-right:3px}.qm-tm-v2{color:#475569;font-size:9px;white-space:nowrap}#qm-ft-v2{padding:5px 8px;background:#1e293b;border-top:1px solid #334155;display:flex;justify-content:space-between;font-size:10px;color:#64748b}#qm-btn-v2{padding:2px 8px;border:1px solid #475569;background:#0f172a;color:#94a3b8;border-radius:3px;cursor:pointer;font-size:10px}#qm-btn-v2:hover{background:#334155}</style><div id="qm-hd-v2" onclick="QualityMonitorV2.toggleBody()"><div id="qm-tit-v2">🔍 QM <span style="color:#60a5fa">v2</span> <span id="qm-cn-v2">0</span></div><div id="qm-bdg-v2"><span class="e" id="qm-ec-v2">E0</span><span class="w" id="qm-wc-v2">W0</span></div></div><div id="qm-body-v2"><div id="qm-tb-v2"></div><div id="qm-list-v2"></div></div><div id="qm-ft-v2"><span id="qm-st-v2"></span><div><button class="qm-btn-v2" onclick="QualityMonitorV2.exportLog()">Export</button> <button class="qm-btn-v2" onclick="QualityMonitorV2.clearAll()">Clear</button> <button class="qm-btn-v2" onclick="QualityMonitorV2.runAudit()">Audit</button></div></div>';
        document.body.appendChild(p);
        this._buildToolbar();
        this._refreshUI();

        var hd = document.getElementById('qm-hd-v2');
        hd.addEventListener('dblclick', function () { p.style.display = p.style.display === 'none' ? '' : 'none'; });
    },

    _filter: 'all',
    toggleBody: function () { document.getElementById('qm-body-v2').classList.toggle('on'); },

    _buildToolbar: function () {
        var tb = document.getElementById('qm-tb-v2');
        var flts = ['all', 'error', 'warn', 'js', 'dom', 'render', 'data', 'module', 'net', 'perf', 'css', 'audit', 'system'];
        var self = this;
        flts.forEach(function (f) {
            var b = document.createElement('button');
            b.className = 'qm-flt-v2' + (f === 'all' ? ' on' : '');
            b.textContent = f;
            b.onclick = function () {
                tb.querySelectorAll('.qm-flt-v2').forEach(function (x) { x.classList.remove('on'); });
                b.classList.add('on');
                self._filter = f;
                self._refreshList();
            };
            tb.appendChild(b);
        });
    },

    _refreshUI: function () {
        var ec = document.getElementById('qm-ec-v2'), wc = document.getElementById('qm-wc-v2'), cn = document.getElementById('qm-cn-v2');
        if (ec) { ec.textContent = 'E' + this.counters.error; ec.style.background = this.counters.error > 0 ? '#dc2626' : '#374151'; }
        if (wc) { wc.textContent = 'W' + this.counters.warn; wc.style.background = this.counters.warn > 0 ? '#f59e0b' : '#374151'; }
        if (cn) cn.textContent = this.logs.length;
        var st = document.getElementById('qm-st-v2');
        if (st) st.textContent = this.logs.length + ' | ' + (performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) + 'MB' : '?') + ' | ' + Math.round((Date.now() - this.startTime) / 1000) + 's';
        this._refreshList();
    },

    _refreshList: function () {
        var list = document.getElementById('qm-list-v2');
        if (!list) return;
        var f = this._filter;
        var items = f === 'all' ? this.logs : this.logs.filter(function (l) { return l.level === f || l.cat === f; });
        var show = items.slice(-60).reverse();
        list.innerHTML = show.map(function (l) {
            var d = l.detail ? '<span style="color:#475569;font-size:9px">' + _e(String(typeof l.detail === 'string' ? l.detail : JSON.stringify(l.detail)).substring(0, 100)) + '</span>' : '';
            return '<div class="qm-e-v2"><div class="qm-dot-v2 ' + l.level + '"></div><div class="qm-msg-v2"><span class="qm-ct-v2">[' + l.cat + ']</span>' + _e(l.msg) + d + '</div><div class="qm-tm-v2">' + l.ts.substring(11, 19) + '</div></div>';
        }).join('');
    },

    exportLog: function () {
        var data = { v: this.version, time: new Date().toISOString(), url: location.href, ua: navigator.userAgent, summary: this.counters, logs: this.logs.map(function (l) { return l; }) };
        var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = 'qm-v2-' + Date.now() + '.json'; a.click(); URL.revokeObjectURL(a.href);
        this.info('system', 'exported');
    },

    clearAll: function () { this.logs = []; this.counters = { error: 0, warn: 0, info: 0 }; try { localStorage.removeItem('qm_v2_logs'); } catch (e) { } this._refreshUI(); },

    _save: function () {
        try { localStorage.setItem('qm_v2_logs', JSON.stringify({ v: this.version, t: new Date().toISOString(), c: this.counters, l: this.logs.slice(-80) })); } catch (e) { }
    },
    _loadSaved: function () {
        try { var d = localStorage.getItem('qm_v2_logs'); if (d) { var p = JSON.parse(d); if (p.l) { this.logs = p.l; this.counters = p.c || this.counters; } } } catch (e) { }
    }
};

function _e(s) { if (!s) return ''; return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

window.QualityMonitorV2 = QualityMonitorV2;