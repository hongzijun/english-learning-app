# 技术架构文档

## 系统架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        UI Layer (表现层)                          │
│  ──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│  │  index.html   │ │   main.css   │ │enhanced-words│             │
│  │  (页面入口)    │ │  (主样式)     │ │   .css      │             │
│  └──────┬───────┘ └──────────────┘ └──────────────┘             │
└─────────┼───────────────────────────────────────────────────────┘
          │
┌─────────▼───────────────────────────────────────────────────────┐
│                    Business Logic Layer (业务逻辑层)              │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    App (应用控制器)                           ││
│  │  模块注册/路由切换/导航管理/徽章更新                           ││
│  └─────────────┬───────────────┬───────────────┬──────────────│
│                │               │               │              ││
│  ┌─────────────▼──┐  ┌────────▼─────┐  ┌──────▼───────┐      ││
│  │  核心学习模块    │  │  专项训练模块  │  │  学习工具模块  │      ││
│  │  smart-words   │  │  mistakes    │  │  progress    │      ││
│  │  words         │  │  enhanced    │  │  review      │      ││
│  │  grammar       │  │  spelling    │  │  achievements│      ││
│  │  advanced-g    │  │  flashcards  │  │  goals       │      ││
│  │  exercises     │  │              │  │  assistant   │      ││
│  │  exam-prep     │  │              │  │  settings    │      ││
│  └────────────────  └──────────────┘  └──────────────┘      ││
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                  公共模块层                                    ││
│  │  Storage / SpacedRepetition / Utils / AudioSystem            ││
│  │  MistakeAnalysisSystem / PerformanceOptimizer                ││
│  │  QualityMonitor / ErrorWatchdog                              ││
│  └─────────────────────────────────────────────────────────────┘│
─────────┬───────────────────────────────────────────────────────┘
          │
┌─────────▼───────────────────────────────────────────────────────┐
│                      Data Layer (数据层)                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│  │ Grade7Data   │ │ localStorage │ │ Web Speech   │             │
│  │ (词库/语法/题)│ │ (学习数据)    │ │ API (TTS)   │             │
│  └──────────────┘ └──────────────┘ ──────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

## 模块依赖关系

```
App (入口)
 ├── words-module ──────────────┬── Storage
 ├── smart-words-module ───────┼── Storage ─ SpacedRepetition
 ├── grammar-module ────────────┼── Storage
 ├── exercises-module ──────────┼── Storage ── MistakeAnalysisSystem
 ├── advanced-grammar-module ───┤── Storage ── MistakeAnalysisSystem
 ├── exam-prep-module ─────────┤── Storage
 ├── mistakes-module ───────────┤── Storage ─ MistakeAnalysisSystem
 ├── enhanced-words-module ─────┤── Storage
 ├── spelling-module ───────────┤── Storage ─ AudioSystem
 ├── flashcard-module ──────────┤── Storage
 ├── progress-module ───────────┤── Storage
 ├── review-module ─────────────┤── Storage
 ├── achievements-module ───────┤── Storage
 ├── goals-module ──────────────┤── Storage ── Utils
 ├── assistant-module ──────────┤── Storage ─ Utils
 ├── settings-module ───────────┤── Storage ── AudioSystem
 ├── spaced-repetition ─────────── Storage
 ├── mistake-analysis-system ───┤── Storage
 ├── performance-optimizer ────┤── (独立)
 ├── error-watchdog ────────────┤── (独立)
 ├── dragon-mode ───────────────┤── Storage
 ├── quality-monitor ───────────┤── (独立)
 ── audio-system ──────────────┴── (独立)
```

## 模块接口规范

### 标准模块接口 (ModuleInterface)
每个模块必须实现以下方法：

```javascript
const SomeModule = {
    // 初始化模块（必须）
    init: function() {
        // 1. 加载数据
        // 2. 渲染UI (调用 this.render())
        // 3. 绑定事件 (调用 this.bindEvents())
    },

    // 渲染UI（必须）
    render: function() {
        // 1. 获取 moduleContent
        // 2. 构建HTML
        // 3. 设置 innerHTML
    },

    // 绑定事件（必须）
    bindEvents: function() {
        // 1. 绑定按钮点击
        // 2. 绑定表单提交
        // 3. 绑定其他交互
    },

    // 销毁模块（可选）
    destroy: function() {
        // 1. 解绑事件
        // 2. 清理状态
    }
};
```

### 模块注册方式
```javascript
const App = {
    modules: {
        'module-name': SomeModule,
        // ...
    },
    loadModule: function(moduleName) {
        const module = this.modules[moduleName];
        if (module && typeof module.init === 'function') {
            module.init();
        }
    }
};
```

## 数据流文档

### 数据读写路径

```
用户操作
    ↓
模块事件处理 (bindEvents)
    ↓
模块业务逻辑
    ↓
Storage.get() / Storage.set()  ←→  localStorage
    ↓
SpacedRepetition.loadData() / saveData()  ←→  localStorage
    ↓
模块渲染 (render)
    ↓
UI更新
```

### 存储结构 (localStorage keys)
| Key | 存储内容 | 数据类型 | 维护模块 |
|-----|---------|---------|---------|
| word_status | 单词掌握状态 | Object{id: status} | Storage/SmartWords |
| word_progress | 单词学习进度 | Object | Storage |
| mistakes | 错题列表 | Array | MistakesModule |
| review_schedule | 复习计划 | Array | ReviewModule |
| learning_progress | 学习进度统计 | Object | ProgressModule |
| settings | 用户设置 | Object | SettingsModule |
| achievements | 成就解锁状态 | Object | AchievementsModule |
| spaced_repetition_data | SM-2算法数据 | Object | SpacedRepetition |
| total_score | 总积分 | Number | Storage |
| streak_count | 连续学习天数 | Number | Storage |
| flashcard_sessions | 翻卡记录 | Array | FlashcardModule |

### 数据模型

#### 单词数据模型
```javascript
{
    id: 1,                    // 唯一ID
    w: "review",              // 单词
    p: "/rI-vju:/",           // 音标
    pos: "n.",                // 词性
    m: "评论；复习",           // 释义
    ex: ["Write a review"],   // 例句
    f: 4,                     // 难度(1-5)
    img: "br",                // 图片标识
    l: 1                      // 层级
}
```

#### 语法数据模型
```javascript
{
    id: 1,                    // 唯一ID
    title: "形容词和副词",      // 标题
    rule: "规则描述",          // 规则
    examples: ["例句"],       // 例句
    analysis: "解析",          // 结构分析
    unitId: 1                 // 所属单元
}
```

#### 练习数据模型
```javascript
{
    id: 1,                    // 唯一ID
    type: "choice",           // 题型: choice/fill/cloze
    question: "题目内容",      // 题目
    options: ["A","B","C","D"],// 选项
    answer: "A",              // 答案
    explanation: "解析",       // 解析
    unitId: 1                 // 所属单元
}
```

#### SM-2卡片数据模型
```javascript
{
    wordId: 1,                // 单词ID
    interval: 0,              // 复习间隔(天)
    ease: 2.5,                // 难度系数
    repetitions: 0,           // 重复次数
    nextReview: timestamp,    // 下次复习时间
    status: "new"             // 状态: new/learning/mastered
}
```

#### 错题数据模型
```javascript
{
    id: timestamp,            // 唯一ID
    exerciseId: 1,            // 题目ID
    type: "choice",           // 题型
    question: "题目",          // 题目内容
    userAnswer: "B",          // 用户答案
    correctAnswer: "A",       // 正确答案
    explanation: "解析",       // 解析
    timestamp: timestamp,     // 记录时间
    unitId: 1                 // 所属单元
}
```

## API接口规范（模块间通信）

### Storage API
```javascript
Storage.init()                                    // 初始化存储
Storage.get(key)                                  // 获取数据
Storage.set(key, value)                           // 保存数据
Storage.getWordStatus(wordId)                     // 获取单词状态
Storage.setWordStatus(wordId, status)             // 设置单词状态
Storage.getMistakes()                             // 获取错题
Storage.addMistake(mistake)                       // 添加错题
Storage.getScore()                                // 获取积分
Storage.addScore(points)                          // 增加积分
```

### SpacedRepetition API
```javascript
SpacedRepetition.init()                           // 初始化
SpacedRepetition.getCard(wordId)                  // 获取卡片
SpacedRepetition.createCard(wordId)               // 创建卡片
SpacedRepetition.updateCard(wordId, quality)      // 更新卡片(SM-2)
SpacedRepetition.getDueCards()                    // 获取待复习卡片
SpacedRepetition.getLearningProgress(wordIds)     // 获取学习进度
```

### Utils API
```javascript
Utils.shuffle(array)                              // 数组洗牌
Utils.getDaysBetween(date1, date2)                // 计算天数差
Utils.addDays(date, days)                         // 日期加法
Utils.getTodayDate()                              // 获取今日日期
```

### AudioSystem API
```javascript
AudioSystem.init()                                // 初始化音频
AudioSystem.playClick()                           // 播放点击音效
AudioSystem.playNavigate()                        // 播放导航音效
AudioSystem.playCorrect()                         // 播放正确音效
AudioSystem.playWrong()                           // 播放错误音效
AudioSystem.speak(word)                           // TTS朗读
```
