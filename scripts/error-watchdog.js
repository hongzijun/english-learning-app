var ErrorWatchdog = (function() {
    var VERSION = '3.0';
    var STORAGE_KEY = 'ewd_v3_data';
    var PANEL_ID = 'ewd-panel-root';

    var state = {
        logs: [],
        counters: { E: 0, W: 0, I: 0 },
        startTime: Date.now(),
        ready: false,
        auditDone: false,
        config: {
            maxLogs: 300,
            showPanel: true,
            auditDelayMs: 2000,
            checkIntervalMs: 25000,
            perfCheckMs: 50000
        }
    };

    function _esc(s) {
        if (!s) return '';
        return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function _ts() { return new Date().toISOString(); }

    function _caller(depth) {
        depth = depth || 4;
        try { throw new Error(); } catch(e) {
            var lines = e.stack.split('\n');
            for (var i = 0; i < lines.length; i++) {
                var m = lines[i].trim();
                if (m.indexOf('ErrorWatchdog') < 0 && m.indexOf('at ') >= 0) {
                    var f = m.match(/\((.+):(\d+):(\d+)/);
                    return f ? f[1].split('/').pop() + ':' + f[2] : m;
                }
            }
        }
        return '?';
    }

    function add(level, cat, msg, detail) {
        var entry = {
            t: _ts(),
            l: level,
            c: cat || '?',
            m: String(msg || ''),
            d: detail !== undefined ? detail : null,
            s: _caller()
        };
        state.logs.push(entry);
        if (state.counters[level] !== undefined) state.counters[level]++;
        while (state.logs.length > state.config.maxLogs) state.logs.shift();
        _save();
        _uiRefresh();
        return entry;
    }

    function error(cat, msg, d) { return add('E', cat, msg, d); }
    function warn(cat, msg, d) { return add('W', cat, msg, d); }
    function info(cat, msg, d) { return add('I', cat, msg, d); }

    function _save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                v: VERSION, t: _ts(), c: state.counters, l: state.logs.slice(-100)
            }));
        } catch(e) {}
    }

    function _load() {
        try {
            var d = localStorage.getItem(STORAGE_KEY);
            if (d) {
                var p = JSON.parse(d);
                if (p.l) { state.logs = p.l; state.counters = p.c || state.counters; }
            }
        } catch(e) {}
    }

    function _isSelf(el) {
        if (!el) return false;
        if (el.id === PANEL_ID) return true;
        if (el.closest && el.closest('#' + PANEL_ID)) return true;
        if (el.id && el.id.indexOf('ewd-') === 0) return true;
        return false;
    }

    function _captureJS() {
        window.addEventListener('error', function(e) {
            if (_isSelf(e.target)) return;
            if (e.target && e.target !== window) {
                error('resource', 'Load failed: ' + (e.target.src || e.target.href || e.target.tagName), { tag: e.target.tagName });
            } else {
                error('js', e.message || 'Script error', { file: e.filename, line: e.lineno, col: e.colno, stack: e.error ? e.error.stack : null });
            }
        }, true);

        window.addEventListener('unhandledrejection', function(e) {
            error('promise', String(e.reason ? (e.reason.message || e.reason) : 'unknown'));
        });
    }

    function _captureNetwork() {
        var origOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(m, u) {
            this._ewd_u = u; this._ewd_m = m; this._ewd_t = Date.now();
            this.addEventListener('load', function() {
                if (this.status >= 400) warn('net', this.status + ' ' + m + ' ' + u);
            });
            this.addEventListener('error', function() {
                error('net', 'FAIL ' + m + ' ' + u);
            });
            return origOpen.apply(this, arguments);
        };
    }

    function _startTimers() {
        setInterval(function() { _checkRender(); }, state.config.checkIntervalMs);
        setInterval(function() { _checkPerf(); }, state.config.perfCheckMs);
        document.addEventListener('visibilitychange', function() {
            if (!document.hidden) { _checkRender(); info('audit', 'visible'); }
        });
    }

    function runAudit() {
        info('audit', '====== AUDIT START ======');
        _auditDOM();
        _auditData();
        _auditModules();
        _auditCSS();
        _auditA11y();
        _checkRender();
        _checkPerf();
        state.auditDone = true;
        info('audit', '====== DONE: E=' + state.counters.E + ' W=' + state.counters.W + ' ======');
    }

    function _auditDOM() {
        var empties = [];
        document.querySelectorAll('[id]').forEach(function(el) {
            if (_isSelf(el)) return;
            if (el.offsetHeight > 10 && el.innerHTML.trim().length === 0 && el.children.length === 0)
                empties.push('#' + el.id);
        });
        if (empties.length > 0) warn('render', empties.length + ' empty visible containers', empties.slice(0, 8));

        var dupMap = {};
        document.querySelectorAll('[id]').forEach(function(el) {
            if (_isSelf(el)) return;
            if (el.id) dupMap[el.id] = (dupMap[el.id] || 0) + 1;
        });
        Object.keys(dupMap).forEach(function(id) {
            if (dupMap[id] > 1) error('dom', 'DUP #' + id + ' x' + dupMap[id]);
        });

        var overflows = [];
        document.querySelectorAll('*').forEach(function(el) {
            if (_isSelf(el)) return;
            if (el.scrollWidth > el.clientWidth + 5 && el.clientHeight > 20 && el.scrollWidth - el.clientWidth > 8)
                overflows.push({ tag: el.tagName, id: el.id || '', ow: el.scrollWidth - el.clientWidth });
        });
        if (overflows.length > 0) warn('css', overflows.length + ' overflow clips', overflows.slice(0, 6));
    }

    function _auditData() {
        if (typeof Grade7Data === 'undefined') { warn('data', 'Grade7Data not found yet'); return; }
        try {
            if (!Grade7Data.units) { error('data', 'Grade7Data.units missing'); return; }
            var totalW = 0, missingM = 0, missingW = 0, dupW = {};
            Grade7Data.units.forEach(function(u) {
                if (!u.words || !u.words.length) error('data', 'U' + u.id + ' no words');
                else {
                    totalW += u.words.length;
                    u.words.forEach(function(w) {
                        if (!w.w) { missingW++; error('data', 'word missing w in U' + u.id + ' id=' + w.id); }
                        if (!w.m) missingM++;
                        if (w.w) dupW[w.w] = (dupW[w.w] || 0) + 1;
                    });
                }
                if (!u.grammar || !u.grammar.length) warn('data', 'U' + u.id + ' no grammar');
                if (!u.exercises || !u.exercises.length) warn('data', 'U' + u.id + ' no exercises');
            });
            Object.keys(dupW).forEach(function(w) {
                if (dupW[w] > 1) warn('data', 'DUP word "' + w + '" x' + dupW[w]);
            });
            info('data', 'OK: ' + totalW + 'w, ' + Grade7Data.units.length + ' units, ' + missingM + ' no-CN, ' + missingW + ' no-w');
        } catch(e) { error('data', 'audit crash: ' + e.message); }
    }

    function _auditModules() {
        var mods = ['App','WordsModule','EnhancedWordsModule','SmartWordsModule','SpacedRepetition',
                    'AdvancedGrammarModule','MistakeAnalysisSystem','ExamPrepModule'];
        var miss = [];
        mods.forEach(function(n) {
            if (typeof window[n] === 'undefined') miss.push(n);
        });
        if (miss.length > 0) {
            if (document.readyState !== 'complete')
                warn('module', miss.length + ' loading: ' + miss.join(','));
            else
                miss.forEach(function(n) { warn('module', n + ' MISSING'); });
        } else {
            info('module', 'All ' + mods.length + ' OK');
        }
    }

    function _auditCSS() {
        var inlineCount = document.querySelectorAll('[style]').length;
        if (inlineCount > 60) warn('css', inlineCount + ' inline styles');

        var sheets = document.styleSheets;
        var cssErr = 0;
        for (var s = 0; s < sheets.length; s++) {
            try { var r = sheets[s].cssRules || []; cssErr += r.length; } catch(e) { cssErr++; }
        }
        if (cssErr < 0) {} 
    }

    function _auditA11y() {
        var imgs = document.querySelectorAll('img:not([alt])');
        if (imgs.length > 0) warn('a11y', imgs.length + ' images no alt');
    }

    function _checkRender() {
        var mc = document.getElementById('moduleContent');
        if (mc) {
            var r = mc.getBoundingClientRect();
            if (r.width > 80 && r.height > 20 && mc.innerHTML.trim().length === 0)
                error('render', '#moduleContent VISIBLE but EMPTY! w=' + Math.round(r.width) + ' h=' + Math.round(r.height));
        }
        var la = document.getElementById('learningArea');
        if (la && la.offsetHeight > 80 && la.innerHTML.trim().length === 0)
            warn('render', '#learningArea visible but empty');
    }

    function _checkPerf() {
        var mb = '-', lim = '-';
        if (performance && performance.memory) {
            mb = Math.round(performance.memory.usedJSHeapSize / 1048576);
            lim = Math.round(performance.memory.jsHeapSizeLimit / 1048576);
            if (mb > lim * 0.8) error('perf', mb + '/' + lim + 'MB');
            else info('perf', mb + '/' + lim + 'MB');
        }
        var up = Math.round((Date.now() - state.startTime) / 1000);
        info('perf', up + 's | logs:' + state.logs.length + ' | E:' + state.counters.E + ' W:' + state.counters.W);
    }

    var currentFilter = 'all';

    function init(opts) {
        if (state.ready) { warn('system', 'already inited'); return; }
        state.ready = true;
        if (opts) for (var k in opts) state.config[k] = opts[k];
        _load();
        _captureJS();
        _captureNetwork();
        _startTimers();
        if (state.config.showPanel) setTimeout(_renderPanel, 700);
        info('system', 'ErrorWatchdog v' + VERSION + ' ready');

        var self = { runAudit: runAudit };
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(function() { self.runAudit(); }, state.config.auditDelayMs);
        });
        if (document.readyState === 'complete')
            setTimeout(function() { self.runAudit(); }, state.config.auditDelayMs);
    }

    function _renderPanel() {
        if (document.getElementById(PANEL_ID)) return;

        var root = document.createElement('div');
        root.id = PANEL_ID;
        root.innerHTML = '<style>' +
            '#ewd-panel-root{position:fixed;bottom:6px;right:6px;z-index:2147483647;font-family:Consolas,"SF Mono",monospace;font-size:11px;width:340px;max-height:52vh;background:#0c1222;color:#cbd5e1;border-radius:8px;box-shadow:0 12px 40px rgba(0,0,0,.65);border:1px solid #1e293b;display:flex;flex-direction:column;overflow:hidden}' +
            '.ewd-hd{background:#0f172a;padding:6px 10px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;user-select:none}' +
            '.ewd-hd:hover{background:#1e293b}' +
            '.ewd-title{font-weight:700;font-size:11.5px;display:flex;align-items:center;gap:5px}' +
            '.ewd-bdg{display:flex;gap:4px}' +
            '.ewd-bdg span{padding:1px 7px;border-radius:8px;font-size:9.5px;font-weight:700}' +
            '.ewd-be{background:#dc2626;color:#fff}.ewd-bw{background:#f59e0b;color:#000}.ewd-bi{background:#3b82f6;color:#fff}' +
            '.ewd-body{display:none;flex-direction:column;max-height:38vh;overflow:hidden}' +
            '.ewd-body.on{display:flex}' +
            '.ewd-tb{display:flex;gap:2px;padding:4px 8px;background:#0f172a;border-bottom:1px solid #1e293b;flex-wrap:wrap}' +
            '.ewd-flt{padding:2px 7px;border:1px solid #334155;background:#0c1222;color:#94a3b8;border-radius:3px;cursor:pointer;font-size:9.5px;transition:.15s}' +
            '.ewd-flt:hover{background:#1e293b;color:#e2e8f0}' +
            '.ewd-flt.act{background:#3b82f6;color:#fff;border-color:#3b82f6}' +
            '.ewd-list{flex:1;overflow-y:auto;padding:2px 0}' +
            '.ewd-row{padding:4px 8px;border-bottom:1px solid #162032;display:flex;gap:6px;align-items:flex-start;line-height:1.35;transition:.1s}' +
            '.ewd-row:hover{background:#1e293b}' +
            '.ewd-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;margin-top:4px}' +
            '.ewd-de{background:#dc2626}.ewd-dw{background:#f59e0b}.ewd-di{background:#3b82f6}.ewd-dp{background:#8b5cf6}.ewd-dd{background:#06b6d4}.ewd-dr{background:#f97316}' +
            '.ewd-msg{flex:1;word-break:break-all;font-size:10.3px}' +
            '.ewd-ct{color:#64748b;font-size:8.5px;margin-right:3px}' +
            '.ewd-tm{color:#475569;font-size:8.5px;white-space:nowrap;flex-shrink:0}' +
            '.ewd-ft{padding:5px 8px;background:#0f172a;border-top:1px solid #1e293b;display:flex;justify-content:space-between;align-items:center;font-size:9.5px;color:#64748b;flex-wrap:wrap;gap:4px}' +
            '.ewd-btn{padding:2px 8px;border:1px solid #334155;background:#0c1222;color:#94a3b8;border-radius:3px;cursor:pointer;font-size:9.5px;transition:.15s;white-space:nowrap}' +
            '.ewd-btn:hover{background:#1e293b;color:#e2e8f0}' +
            '.ewd-btn-copy{background:#059669;color:#fff;border-color:#059669}' +
            '.ewd-btn-copy:hover{background:#047857}' +
            '.ewd-toast{position:fixed;top:-40px;left:50%;transform:translateX(-50%);background:#059669;color:#fff;padding:6px 16px;border-radius:6px;font-size:12px;font-weight:600;z-index:2147483647;transition:top .3s ease;box-shadow:0 4px 12px rgba(0,0,0,.3)}' +
            '.ewd-toast.show{top:12px}' +
            '</style>' +
            '<div class="ewd-hd" onclick="ErrorWatchdog.toggleBody()">' +
                '<div class="ewd-title">🐕 ErrorWatchdog <span style="color:#38bdf8;font-size:9px">v' + VERSION + '</span> <span style="color:#94a3b8;font-size:10px" id="ewd-cn">0</span></div>' +
                '<div class="ewd-bdg"><span class="ewd-be" id="ewd-ec">E0</span><span class="ewd-bw" id="ewd-wc">W0</span></div>' +
            '</div>' +
            '<div class="ewd-body" id="ewd-body">' +
                '<div class="ewd-tb" id="ewd-tb"></div>' +
                '<div class="ewd-list" id="ewd-list"></div>' +
            '</div>' +
            '<div class="ewd-ft">' +
                '<span id="ewd-st">-</span>' +
                '<div>' +
                    '<button class="ewd-btn ewd-btn-copy" onclick="ErrorWatchdog.copyReport()" title="复制报告到剪贴板，直接发送给AI修复">📋 复制报告</button> ' +
                    '<button class="ewd-btn" onclick="ErrorWatchdog.exportJSON()">📥 导出JSON</button> ' +
                    '<button class="ewd-btn" onclick="ErrorWatchdog.clearAll()">🗑 清空</button> ' +
                    '<button class="ewd-btn" onclick="ErrorWatchdog.runAudit()">🔎 审计</button>' +
                '</div>' +
            '</div>';
        document.body.appendChild(root);
        _buildToolbar();
        _uiRefresh();

        var hd = root.querySelector('.ewd-hd');
        hd.addEventListener('dblclick', function() { root.style.display = root.style.display === 'none' ? '' : 'none'; });
    }

    function _buildToolbar() {
        var tb = document.getElementById('ewd-tb');
        var flts = ['all','E-error','W-warn','js','dom','render','data','module','net','perf','css','a11y','audit','system'];
        flts.forEach(function(f) {
            var b = document.createElement('button');
            b.className = 'ewd-flt' + (f === 'all' ? ' act' : '');
            var label = f.split('-')[1] || f;
            b.textContent = label;
            b.onclick = function() {
                tb.querySelectorAll('.ewd-flt').forEach(function(x){ x.classList.remove('act'); });
                b.classList.add('act');
                currentFilter = f.split('-')[0];
                _renderList();
            };
            tb.appendChild(b);
        });
    }

    function toggleBody() {
        var body = document.getElementById('ewd-body');
        if (body) body.classList.toggle('on');
    }

    function _uiRefresh() {
        var ec = document.getElementById('ewd-ec'), wc = document.getElementById('ewd-wc'),
            cn = document.getElementById('ewd-cn'), st = document.getElementById('ewd-st');
        if (ec) { ec.textContent = 'E' + state.counters.E; ec.style.background = state.counters.E > 0 ? '#dc2626' : '#374151'; }
        if (wc) { wc.textContent = 'W' + state.counters.W; wc.style.background = state.counters.W > 0 ? '#f59e0b' : '#374151'; }
        if (cn) cn.textContent = state.logs.length;
        if (st) st.textContent = state.logs.length + ' logs | ' +
            (performance.memory ? Math.round(performance.memory.usedJSHeapSize/1048576)+'MB':'?') +
            ' | ' + Math.round((Date.now()-state.startTime)/1000)+'s';
        _renderList();
    }

    function _renderList() {
        var list = document.getElementById('ewd-list');
        if (!list) return;
        var items = currentFilter === 'all' ? state.logs :
            state.logs.filter(function(l) { return l.l === currentFilter || l.c === currentFilter; });
        var show = items.slice(-60).reverse();
        list.innerHTML = show.map(function(l) {
            var detStr = l.d ? '<span style="color:#475569;font-size:8.5px;margin-left:4px">' +
                _esc(typeof l.d === 'string' ? l.d : JSON.stringify(l.d)).substring(0, 90) + '</span>' : '';
            return '<div class="ewd-row"><div class="ewd-dot ewd-d' + l.l + '"></div>' +
                '<div class="ewd-msg"><span class="ewd-ct">[' + _esc(l.c) + ']</span>' + _esc(l.m) + detStr + '</div>' +
                '<div class="ewd-tm">' + l.t.substring(11,19) + '</div></div>';
        }).join('');
    }

    function copyReport() {
        var lines = [];
        lines.push('=== ErrorWatchdog Report v' + VERSION + ' ===');
        lines.push('Time: ' + new Date().toISOString());
        lines.push('URL: ' + location.href);
        lines.push('UA: ' + navigator.userAgent.substring(0,120));
        lines.push('Uptime: ' + Math.round((Date.now()-state.startTime)/1000) + 's');
        lines.push('Summary: E=' + state.counters.E + ' W=' + state.counters.W + ' I=' + state.counters.I + ' Total=' + state.logs.length);
        lines.push('');

        var errs = state.logs.filter(function(l){return l.l==='E';});
        var warns = state.logs.filter(function(l){return l.l==='W';});

        if (errs.length > 0) {
            lines.push('=== ERRORS (' + errs.length + ') ===');
            errs.forEach(function(l,i){
                lines.push('['+(i+1)+'] ['+l.c+'] '+l.m);
                if (l.d) lines.push('    Detail: ' + (typeof l.d==='string'?l.d:JSON.stringify(l.d)));
                lines.push('    Source: ' + l.s + ' | Time: ' + l.t.substring(11));
            });
            lines.push('');
        }

        if (warns.length > 0) {
            lines.push('=== WARNINGS (' + warns.length + ') ===');
            warns.forEach(function(l,i){
                lines.push('['+(i+1)+'] ['+l.c+'] '+l.m);
                if (l.d) lines.push('    Detail: ' + (typeof l.d==='string'?l.d:JSON.stringify(l.d)).substring(0,150));
                lines.push('    Time: ' + l.t.substring(11));
            });
            lines.push('');
        }

        var recentInfo = state.logs.filter(function(l){return l.l==='I';}).slice(-10);
        if (recentInfo.length > 0) {
            lines.push('=== RECENT INFO ===');
            recentInfo.forEach(function(l){ lines.push('['+l.c+'] '+l.m); });
            lines.push('');
        }

        lines.push('=== END REPORT ===');
        var text = lines.join('\n');

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function() {
                _toast('✅ 报告已复制！直接粘贴给AI即可');
            }).catch(function() { _fallbackCopy(text); });
        } else {
            _fallbackCopy(text);
        }
    }

    function _fallbackCopy(text) {
        var ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); _toast('✅ 已复制！'); } catch(e) { _toast('❌ 复制失败，请手动选择日志'); }
        document.body.removeChild(ta);
    }

    function _toast(msg) {
        var existing = document.querySelector('.ewd-toast');
        if (existing) existing.remove();
        var toast = document.createElement('div');
        toast.className = 'ewd-toast';
        toast.textContent = msg;
        document.body.appendChild(toast);
        requestAnimationFrame(function(){ toast.classList.add('show'); });
        setTimeout(function() { toast.classList.remove('show'); setTimeout(function(){toast.remove();},300); }, 2200);
    }

    function exportJSON() {
        var data = {
            v: VERSION, time: _ts(), url: location.href, ua: navigator.userAgent,
            uptime: Math.round((Date.now()-state.startTime)/1000),
            summary: state.counters,
            logs: state.logs.map(function(l){return l;})
        };
        var blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'ewd-report-' + Date.now() + '.json';
        a.click();
        URL.revokeObjectURL(a.href);
        info('system', 'exported JSON');
    }

    function clearAll() {
        state.logs = [];
        state.counters = { E:0, W:0, I:0 };
        try { localStorage.removeItem(STORAGE_KEY); } catch(e) {}
        _uiRefresh();
    }

    return {
        VERSION: VERSION,
        init: init,
        runAudit: runAudit,
        toggleBody: toggleBody,
        copyReport: copyReport,
        exportJSON: exportJSON,
        clearAll: clearAll,
        error: error,
        warn: warn,
        info: info,
        getLogs: function() { return state.logs; },
        getCounters: function() { return state.counters; },
        getReportText: function() {
            var lines = ['EW v'+VERSION+' | E='+state.counters.E+' W='+state.counters.W+' | '+new Date().toISOString()];
            state.logs.filter(function(l){return l.l==='E';}).forEach(function(l){
                lines.push('['+l.c+'] '+l.m+(l.d?' | '+_esc(typeof l.d==='string'?l.d:JSON.stringify(l.d).substring(0,80)):''));
            });
            return lines.join('\n');
        }
    };
})();

if (typeof window !== 'undefined') window.ErrorWatchdog = ErrorWatchdog;