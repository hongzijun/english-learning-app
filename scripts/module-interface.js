/**
 * @file 统一模块接口规范 (Module Interface)
 * @description 定义所有模块必须遵循的标准接口，确保模块间一致性
 * @version 1.0.0
 * @date 2026-05-01
 */

/**
 * 标准模块接口
 * 每个模块必须实现 init(), render(), bindEvents() 三个核心方法
 * 可选实现 destroy() 方法用于资源清理
 *
 * 使用方式:
 * const MyModule = Object.assign({}, ModuleInterface, {
 *     moduleName: 'my-module',
 *     moduleContent: '#my-module-content',
 *     render: function() { ... },
 *     bindEvents: function() { ... }
 * });
 */
const ModuleInterface = {
    /** 模块名称（必须） */
    moduleName: '',

    /** 模块内容容器选择器（必须） */
    moduleContent: '#module-content',

    /**
     * 初始化模块（必须）
     * 流程：准备数据 → 渲染UI → 绑定事件
     */
    init: function () {
        if (!this.moduleContent) {
            console.warn('[ModuleInterface] 模块未设置 moduleContent');
            return;
        }
        this.render();
        this.bindEvents();
    },

    /**
     * 渲染UI（必须）
     * 子类必须重写此方法
     */
    render: function () {
        console.warn('[ModuleInterface] 模块未实现 render() 方法');
    },

    /**
     * 绑定事件（必须）
     * 子类必须重写此方法
     */
    bindEvents: function () {
        console.warn('[ModuleInterface] 模块未实现 bindEvents() 方法');
    },

    /**
     * 销毁模块（可选）
     * 用于清理事件监听器、定时器等资源
     */
    destroy: function () {
        // 子类可重写
    },

    /**
     * 获取模块内容容器
     * @returns {HTMLElement|null}
     */
    getContainer: function () {
        return document.querySelector(this.moduleContent);
    },

    /**
     * 安全地获取元素
     * @param {string} selector - CSS选择器
     * @param {HTMLElement} [container] - 容器元素
     * @returns {HTMLElement|null}
     */
    safeQuery: function (selector, container) {
        const el = container || this.getContainer();
        if (!el) return null;
        return el.querySelector(selector);
    },

    /**
     * 安全地获取元素列表
     * @param {string} selector - CSS选择器
     * @param {HTMLElement} [container] - 容器元素
     * @returns {NodeList}
     */
    safeQueryAll: function (selector, container) {
        const el = container || this.getContainer();
        if (!el) return document.querySelectorAll('');
        return el.querySelectorAll(selector);
    },

    /**
     * 安全地添加事件监听
     * @param {HTMLElement} el - 目标元素
     * @param {string} event - 事件类型
     * @param {Function} handler - 事件处理函数
     */
    safeOn: function (el, event, handler) {
        if (el && typeof handler === 'function') {
            el.addEventListener(event, handler);
        }
    },

    /**
     * 显示加载状态
     */
    showLoading: function () {
        const container = this.getContainer();
        if (container) {
            container.innerHTML = '<div style="text-align:center;padding:2rem;"><div class="loading-spinner"></div><p style="color:#7F8C8D;margin-top:1rem;">加载中...</p></div>';
        }
    },

    /**
     * 显示错误信息
     * @param {string} message - 错误信息
     */
    showError: function (message) {
        const container = this.getContainer();
        if (container) {
            container.innerHTML = '<div style="text-align:center;padding:2rem;color:#D0021B;"><p>加载失败: ' + message + '</p></div>';
        }
    },

    /**
     * 检查数据是否存在
     * @param {*} data - 要检查的数据
     * @returns {boolean}
     */
    hasData: function (data) {
        return data !== null && data !== undefined && data !== '';
    }
};
