# Changelog

All notable changes to this project will be documented in this file.

## [3.0.0] - 2026-05-02

### Added
- 🧠 自适应算法核心引擎 (adaptive-engine.js)
  - BKT贝叶斯知识追踪（四参数模型）
  - IRT项目反应理论（2PL：难度b + 区分度a）
  - AKT注意力知识追踪（滑动窗口加权）
  - 融合模型（BKT 0.4 + AKT 0.3 + IRT 0.3）
  - 三级错题归因算法（知识型/方法型/习惯型）
  - 动态学习路径规划（薄弱点优先推荐）
  - 期末冲刺建议生成
- 🔬 前置全维度智能诊断模块 (diagnostic-module.js)
  - 词汇广度/语法理解/阅读速度/听力辨音四维测试
  - Canvas雷达图诊断报告
  - 首次自动引导 + 定期复诊提醒
- 🎯 词汇五维掌握模式 (smart-words-module.js升级)
  - 听音辨义→见词知义→看义拼词→语境填空→主动造句
  - 五维进度条 + 降级复习
- 📐 语法体系化闭环 (grammar-system-module.js)
  - 30个语法点图谱（依赖边 + 可视化渲染）
  - 薄弱节点自动定位（红/黄/绿三色标注）
  - 薄弱点靶向练习
- 📝 全题型应试提分 (exam-strategy-module.js)
  - 单选/完形/阅读三大题型策略
  - 每道题考点类型标注（细节/推断/主旨/词义猜测）
- 📋 期末冲刺模考 (mock-exam-module.js)
  - 自适应难度调整（+0.2/-0.2）
  - 45分钟全真模考（倒计时 + 答题卡 + 进度条）
  - 模考报告 + 冲刺建议
- 📊 数据可视化Dashboard (dashboard-module.js)
  - 知识热力图（6单元×5维度颜色矩阵）
  - Canvas进步曲线图（30天θ值折线）
  - 薄弱点地图 + 周日自动周报
- 💾 存储数据结构升级 (storage-enhanced.js)
  - knowledgeState/diagnosticHistory/examRecords/weaknessMap
  - 数据版本迁移（v1.1.0→v2.1.0）
  - 周报自动生成

### Changed
- 单词数据模型扩展：291词新增 kgPoint/unitTheme/examType 考点标签
- 版本号升至 v3.0.0
- 添加 adaptive-engine.js 初始化到 App.init()

## [2.0.0] - 2026-05-01

### Added
- 全新课本词汇数据（291词，6单元）
  - Unit 1: 43词 (Happiness)
  - Unit 2: 41词 (Go for it!)
  - Unit 3: 36词 (Hobbies)
  - Unit 4: 45词 (Life in the future)
  - Unit 5: 75词 (Heroes)
  - Unit 6: 51词 (Travelling)
- 新增 w200 成就（200词里程碑）

### Changed
- 单词总数从190更新至291
- 所有单词数据根据最新课本图片重新录入
- 音标、释义、词性全面更新
- 版本升级至 2.0.0

## [1.0.0] - 2026-05-01

### Added
- 16个功能模块完整实现
  - 核心学习：智能学习(SM-2)、单词学习、语法学习、高级练习、题库练习、期末备考
  - 专项训练：错题本、增强学习、拼写练习、单词翻翻卡
  - 学习工具：学习进度、复习计划、成就系统、学习目标、学习助手、音效设置
- SM-2间隔重复算法实现
- 190个单词数据（6单元）
- 30个语法知识点
- 50道练习题
- 20个成就系统
- 艾宾浩斯复习计划
- 学习进度可视化
- 背景音乐系统
- 数据导入导出功能
- 单元解锁机制
- 每日挑战系统

### Changed
- 优化项目文件结构（测试文件归档、生成脚本归档）
- 更新项目规则和协作规范

### Technical
- 纯前端实现（HTML5/CSS3/Vanilla JS）
- localStorage本地存储
- Node.js本地服务器
- Web Speech API语音合成
