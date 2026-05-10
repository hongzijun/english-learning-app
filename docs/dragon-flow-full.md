# 🐉 一条龙学习模式 — 完整流程文档

> 版本：v3.0 | 最后更新：2026-05-10
> 涉及文件：`dragon-mode.js`、`learning-flow-controller.js`、`memory-self-assessment.js`

---

## 一、全局架构

### 1.1 两种模式

| 模式 | 入口 | 流程 |
|------|------|------|
| **📚 单元学习** | 默认模式 | 8个微阶段顺序推进，逐单元通关 |
| **🏆 全学期冲刺** | 手动切换 | 综合诊断 → 全真模考 → 综合复盘（3步） |

### 1.2 状态持久化

所有进度存储在 `localStorage('dragon_progress')`，关键字段：

```
state = {
  mode: 'unit' | 'semester',
  currentUnit: 1-6,
  currentMicroPhase: 0-7,        // 8阶段索引
  completedUnits: {},             // { '1': 'passed' | 'gap-filled' }
  unitPhasesDone: {},             // { '1': ['preview','new-lesson',...] }
  learnedWords: {},               // { wordId: { dimsDone:[], mastered:bool } }
  masteredWordIds: [],            // 全局已掌握词ID列表
  unitScores: {},                 // { '1': { 'new-lesson':85, 'practice':70 } }
  errorCounts: {},                // { kgPoint: count }
  gapFillRounds: {},              // { '1': 0-2 } 补漏轮次
  diagnosticResults: {},          // { '1': { vocab:80, grammar:60, reading:70 } }
  totalTimeSpent: {}              // { '1': ms }
}
```

### 1.3 单元解锁规则

- `u < currentUnit` → ✅ 已完成
- `u === currentUnit` → 🔄 进行中
- `u === currentUnit + 1` → 🔓 可进入
- 其余 → 🔒 锁定

---

## 二、8个微阶段详解

### 阶段1：📖 学习预热 (preview)

**目标**：快速浏览本单元所有词汇，建立初步印象

**流程**：
1. 加载 `Unit[currentUnit]` 的全部词汇
2. 两种浏览模式：
   - **快速浏览**：网格展示所有词卡（单词+音标+释义）
   - **详细预习**：逐词翻页，展示单词/音标/释义/词性/例句
3. 点击「开始学习」→ 进入阶段2

**判断**：无评分，纯浏览，用户自行决定何时进入下一阶段

**数据记录**：`localStorage('preview_history')` 记录浏览时间

---

### 阶段2：📝 新课学习 (new-lesson) — 核心阶段

**目标**：通过5阶段子流程系统学习词汇，建立记忆

**⚠️ 此阶段由 `LearningFlowController` 独立控制，是嵌套在一条龙内部的完整子流程**

#### 子流程入口

点击「开始学习」→ `LearningFlowController.startFlow(unitId)`

#### 5阶段子流程

##### 子阶段1：🧠 检测 (assessment)

**目标**：用户对每个词自评记忆程度

**流程**：
1. 逐词展示单词（大字）+ 🔊发音按钮
2. 用户从5个按钮中选择记忆程度：

| 等级 | 标签 | 颜色 | 含义 |
|------|------|------|------|
| 1 | 😶 完全忘记 | 灰色 | 没有任何印象 |
| 2 | 🤔 有点印象 | 紫色 | 见过但想不起来 |
| 3 | 💡 模糊记得 | 蓝色 | 大概知道意思 |
| 4 | 👍 基本记得 | 绿色 | 知道意思但不够确定 |
| 5 | 🌟 非常熟悉 | 金色 | 完全掌握 |

3. 结果存入 `_memoryLevels[wordId] = level`
4. 所有词评完 → 进入子阶段2

**算法**：无，纯用户自评

##### 子阶段2：📊 规划 (plan)

**目标**：根据自评结果，将词分为3类学习路径

**分类算法** (`_doPlan`)：
```
level 1-3 → priority（重点学习）
level 4   → quickVerify（快速验证）
level 5   → 不进入学习队列（已掌握）
```

**显示内容**：
- 🔴 重点学习：X个词（含前5个词预览）
- 🔵 巩固学习：0个词（当前未使用）
- 🟢 快速验证：Y个词
- ⏱ 预计学习时间：约 `max(1, round(total*0.5))` 分钟
- 📊 记忆分布可视化（堆叠条形图）

**注意**：`MemorySelfAssessment.planLearningPath()` 内部也有分类逻辑（level≤2→priority, level=3→consolidate, level=4→quickOnly），但 `_doPlan` 覆盖了它，只用 level 1-3→priority + level 4→quickVerify

##### 子阶段3：📖 词语学习 (memoryLearn)

**目标**：逐词记忆，展开释义后确认

**流程**：
1. 队列 = `priority + consolidate`（若空则用 `quickVerify`）
2. **每次进入前打乱队列**（Fisher-Yates shuffle）
3. 逐词展示：
   - 顶部：当前记忆等级标签（颜色标记）
   - 中部：大字单词 + 音标 + 🔊发音
   - 释义默认折叠，点击「👁️ 展开释义」展开
   - 底部：「✅ 记忆完成」按钮
4. 点击记忆完成 → `SpacedRepetition.rateCard(wordId, 4, 'encn')` → 下一词
5. 所有词完成 → 进入子阶段4

**学习轮次**：`_learnRound` 计数，多轮时队列重新打乱

##### 子阶段4：✍️ 最终检验 (finalCheck)

**目标**：输入中文意思验证记忆，动态调整记忆等级

**流程**：
1. 筛选所有 `memoryLevel !== 5` 的词
2. **打乱队列**（Fisher-Yates shuffle）
3. 逐词展示：英文单词 + 输入框 + 「确认」/「不知道」按钮
4. 答题后：
   - **答对** → 记忆等级 +1（上限5）
   - **答错** → 记忆等级 -1（下限1）
   - **跳过** → 记忆等级 -1（等同答错）
5. 每次答题后：
   - 立即更新记忆分布图（`_updateMemoryVizDynamic`，width百分比1秒平滑过渡）
   - 显示反馈卡片（✅正确/❌错误 + 等级变化动画：旧等级→箭头→新等级）
6. 2.2秒后自动进入下一词

**答案匹配算法** (`_checkAnswer`)：
```
1. 清洗：去英文缩写、去括号、分号逗号替换为|、去空格、转小写
2. 拆分：按|拆分中文释义为多个部分
3. 匹配规则：
   - 核心词≤2字：双向包含匹配
   - 核心词>2字：输入包含核心词 → 正确
   - 模糊匹配：输入中匹配核心词字符比例 ≥ 60% → 正确
```

**记忆等级变迁规则**：

| 当前等级 | 答对 → | 答错/跳过 → |
|---------|--------|------------|
| 1 完全忘记 | 2 有点印象 | 1（不变） |
| 2 有点印象 | 3 模糊记得 | 1 完全忘记 |
| 3 模糊记得 | 4 基本记得 | 2 有点印象 |
| 4 基本记得 | 5 非常熟悉 | 3 模糊记得 |
| 5 非常熟悉 | 5（不变） | 4 基本记得 |

**通过判断** (`_evaluateCheck`)：
- 所有词都达到 level 5 → 进入子阶段5（报告）
- 否则 → `_roundCount++`，未达标词重新进入词语学习（循环）

**多轮循环**：
```
最终检验 → 还有词未达level5 → 显示"还有X个词未达标"
→ 2秒后 → 回到词语学习（打乱队列）
→ 词语学习完成 → 再次最终检验
→ ... 直到全部level5
```

##### 子阶段5：📊 报告 (report)

**目标**：展示学习成果

**内容**：
- 正确率（X/Y）
- ⏱️ 学习时长（分秒）
- 🔄 学习轮次
- ✅ 认识提升的词列表
- 🔄 仍需复习的词列表
- 📈 自评分析（自评过高/惊喜掌握/一致率）
- 📊 记忆程度分布

**出口**：
- 「完成学习」→ `_finishAndReturn()` → `DragonMode.currentMicroPhase++` → 回到一条龙阶段3
- 「重新学习错词」→ 只保留错词 → 回到词语学习

---

### 阶段3：🧠 主动回忆 (active-recall)

**目标**：用不同难度模式回忆已学词汇

**流程**：
1. 取本单元已掌握词（`masteredWordIds`），最多15个，打乱
2. 根据BKT概率自动选择回忆模式：

| BKT概率 | 模式 | 说明 |
|---------|------|------|
| < 0.4 | 选择题(mc) | 四选一 |
| 0.4-0.75 | 拼写(text) | 输入英文 |
| ≥ 0.75 | 听写(dictation) | 听音写词 |

3. 使用 `ActiveRecall.renderRecallUI()` 渲染题目
4. 答对/答错 → `AdaptiveEngine.recordInteraction()` 更新概率
5. 全部完成 → 显示摘要（正确数/总数）

**判断**：无通过/不通过，纯练习

---

### 阶段4：✏️ 即时练习 (practice)

**目标**：做本单元练习题

**流程**：
1. 加载本单元练习题，取前10题
2. 逐题展示（选择题）
3. 答对/答错：
   - `AdaptiveEngine.recordInteraction()` 更新知识掌握概率
   - 答错 → `MistakesModule.addMistake()` 加入错题本
   - 答错 → `DictationMistakeSync.syncMistake()` 同步
   - 答错 → `MistakeAnalysisSystem.analyzeMistake()` 分析
4. 完成后显示正确率 + 薄弱考点提示

**评分**：`unitScores[currentUnit].practice = pct`

---

### 阶段5：🎤 发音训练 (pronunciation)

**目标**：跟读练习发音

**流程**：
1. 取本单元已掌握词，最多8个，打乱
2. 使用 `PronunciationTrainer` 模块：
   - 播放标准发音
   - 用户点击「🎤 跟读」开始录音
   - 点击「⏹ 停止」结束录音
   - 系统评分（1-5星⭐）
3. 逐词完成 → 显示平均评分

**判断**：无通过/不通过，纯练习

---

### 阶段6：🔧 错题订正 (mistake-fix)

**目标**：重做错题本中的错题

**流程**：
1. 从 `Storage` 读取错题列表
2. 若无错题 → 直接显示"暂无疑难错题"，跳过
3. 按错误类型排序：知识型 > 方法型 > 习惯型
4. 取前10题，逐题展示：
   - 显示错误类型标签（颜色区分）
   - 显示上次错误答案
   - 选择题或填空题
5. 完成后显示纠正数/总数

**判断**：无通过/不通过

---

### 阶段7：📊 单元诊断 (unit-diagnostic)

**目标**：综合测试本单元掌握情况

**题目构成**：
- 5道词汇题（四选一辨义）
- 3道语法题
- 2道阅读理解题

**流程**：
1. 逐题展示，记录各维度正确数
2. 完成后计算总分和分维度得分

**通过判断**：
```
正确率 ≥ 70% → ✅ 诊断通过 → 可进入下一单元
正确率 < 70% → ⚠️ 诊断未达标 → 进入补漏冲刺
```

**数据记录**：
- `unitScores[currentUnit].diagnostic = pct`
- `diagnosticResults[currentUnit] = { vocab:X, grammar:Y, reading:Z }`

---

### 阶段8：🔍 查漏补缺 (gap-fill)

**目标**：针对薄弱点强化训练

**触发条件**：诊断未达标（<70%）时自动进入

**补漏轮次限制**：每单元最多2轮

**流程**：
1. 提取薄弱词：
   - 优先：`AdaptiveEngine.getMasteryProbability() < 0.6` 的词
   - 备选：未在 `masteredWordIds` 中的词
   - 兜底：本单元前10个词
2. 使用 `InterleavedPractice.interleave()` 交叉排列
3. 两个子阶段：
   - **词汇补漏**：听音默写 + 语境填空（每词2个维度）
   - **语法补漏**：本单元语法点 + 对应练习题
4. 完成后选择：
   - 「🔬 重新诊断」→ 回到阶段7
   - 「⏭ 跳过」→ 进入下一单元

---

## 三、新课学习（阶段2）的3级路由系统

> 阶段2内部除了 `LearningFlowController` 的5阶段子流程外，`DragonMode` 自身还有一套更复杂的词汇路由系统。两套系统**并行存在**，当前实际使用的是 `LearningFlowController`。

### 3.1 BKT概率分类

每个词通过 `AdaptiveEngine.getMasteryProbability(kgPoint)` 获取BKT掌握概率：

### 3.2 预检阶段 (precheck)

每个词1道四选一快速检测，结果影响路由分类。

### 3.3 三级路由

| 路径 | 条件 | 维度 | 说明 |
|------|------|------|------|
| 🟢 快速 | BKT≥0.75 且预检正确 | context + produce | 已基本掌握 |
| 🟡 标准 | BKT≥0.4 或预检降级 | spell + context + produce | 需巩固拼写 |
| 🔴 深度 | BKT<0.4 或预检错误 | identify + spell + context + produce | 需全面学习 |

### 3.4 四个维度

| 维度 | ID | 题型 |
|------|-----|------|
| 辨义合一 | identify | 听发音+看英文→选中文 |
| 拼写合一 | spell | 听发音→拼写英文 |
| 语境填空 | context | 句中挖空→填入正确形式 |
| 主动造句 | produce | 看中文→写英文句子 |

### 3.5 维度互证豁免

- spell通过 且 identify无失败记录 → identify自动通过
- produce通过 且 context无失败记录 → context自动通过

### 3.6 双击退出

同一词同一维度连续错误2次 → 跳过该维度，词进入待复习队列

### 3.7 快速路径质量门

快速路径词全部完成后：
1. 抽查20%的词（最少1个）
2. 全部答对 → 快速路径通过
3. 有答错 → **所有快速路径词降级**，移出 `masteredWordIds`

### 3.8 动态阈值

预检错误率 > 40% → 快速路径阈值从0.75提高到0.85（更难进入快速路径）

---

## 四、全学期冲刺模式

### 4.1 综合诊断 (global-diagnostic)

4维度测试：词汇(20题) → 语法(10题) → 阅读(5题)
- 结果：各维度百分比 + Canvas雷达图
- 预估分数（`AdaptiveEngine.estimateScore()`）

### 4.2 全真模考 (mock-exam)

- 25题，45分钟限时
- 题型分布：单选(1-15) + 完形(16-20) + 阅读(21-25)
- 评分：百分制→120分制
- 等级：A+(≥108) / A(≥96) / B(≥84) / C(≥72) / D(<72)
- 考后：`AdaptiveEngine.getSprintAdvice()` 生成冲刺建议

### 4.3 综合复盘 (final-report)

基于诊断+模考数据的综合分析报告

---

## 五、核心算法汇总

### 5.1 Fisher-Yates 洗牌

```javascript
_shuffle(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}
```
使用位置：词语学习队列、最终检验队列、预检队列、选项生成

### 5.2 答案模糊匹配

见阶段2子阶段4的「答案匹配算法」

### 5.3 记忆等级升降

见阶段2子阶段4的「记忆等级变迁规则」

### 5.4 BKT概率路由

见「三、3级路由系统」

### 5.5 SM-2间隔重复

`SpacedRepetition.rateCard(wordId, quality, deck)` — 在词语学习确认时调用(quality=4)

### 5.6 自评一致性验证

`MemorySelfAssessment.verifyResults()`：
- 自评≥4但答错 → overrated（自评过高）
- 自评≤2但答对 → surprised（惊喜掌握）
- 其余 → consistent（一致）

---

## 六、全局操作

| 按钮 | 功能 |
|------|------|
| ⏭ 跳过当前阶段 | `currentMicroPhase++`，直接进入下一阶段 |
| 🔄 重学当前阶段 | 重新渲染当前阶段内容 |
| 🗑 重置全部进度 | 清空所有localStorage，从零开始 |

---

## 七、完整流程图

```
一条龙开始
│
├─ 阶段1 📖 学习预热
│   ├─ 快速浏览（网格词卡）
│   └─ 详细预习（逐词翻页）
│       └─ 点击「开始学习」
│
├─ 阶段2 📝 新课学习 (LearningFlowController)
│   ├─ 🧠 检测：逐词自评5级记忆
│   ├─ 📊 规划：分3类（重点/巩固/快速验证）
│   ├─ 📖 词语学习：逐词记忆（打乱队列）
│   ├─ ✍️ 最终检验：输入验证（打乱队列）
│   │   ├─ 答对 → level+1
│   │   ├─ 答错 → level-1
│   │   ├─ 全部level5 → 通过
│   │   └─ 有未达标 → 循环回词语学习
│   └─ 📊 报告 → 完成学习 → 回到一条龙
│
├─ 阶段3 🧠 主动回忆
│   └─ BKT概率自动选模式（选择/拼写/听写）
│
├─ 阶段4 ✏️ 即时练习
│   └─ 10道选择题 + 错题自动收录
│
├─ 阶段5 🎤 发音训练
│   └─ 跟读评分（1-5星）
│
├─ 阶段6 🔧 错题订正
│   └─ 重做错题本（按错误类型排序）
│
├─ 阶段7 📊 单元诊断
│   ├─ 5词汇+3语法+2阅读
│   ├─ ≥70% → 通过 → 下一单元
│   └─ <70% → 进入补漏
│
└─ 阶段8 🔍 查漏补缺
    ├─ 薄弱词听音默写+语境填空
    ├─ 薄弱语法练习
    ├─ 重新诊断 或 跳过
    └─ 最多2轮 → 进入下一单元
```

---

## 八、涉及的外部模块

| 模块 | 使用阶段 | 功能 |
|------|---------|------|
| `AdaptiveEngine` | 全局 | BKT概率计算、知识掌握度追踪、分数预估、冲刺建议 |
| `SpacedRepetition` | 词语学习 | SM-2间隔重复算法、到期复习词获取 |
| `MistakesModule` | 练习/新课 | 错题收录 |
| `MistakeAnalysisSystem` | 练习 | 错题分析 |
| `DictationMistakeSync` | 练习 | 听写错题同步 |
| `ActiveRecall` | 主动回忆 | 回忆UI渲染 |
| `PronunciationTrainer` | 发音训练 | 发音播放/录音/评分 |
| `EbbinghausScheduler` | 间隔复习 | 艾宾浩斯遗忘曲线调度 |
| `SpiralReview` | 间隔复习 | 螺旋复习重排序 |
| `InterleavedPractice` | 补漏 | 交叉练习排列 |
| `AssociationBuilder` | 补漏 | 词汇关联 |
| `Enrichment` | 补漏 | 词汇拓展 |
| `MemoryTracker` | 新课 | 记忆追踪 |
| `Grade7Data` | 全局 | 数据源（词汇/语法/练习） |
| `DataBridge` | 全局 | 数据查询桥接 |
