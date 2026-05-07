# UI/UX 设计规范

## 1. CSS 变量系统

### 颜色系统
```css
:root {
  /* 主色调 */
  --primary-color: #4A90E2;        /* 蓝色 - 主要操作 */
  --primary-hover: #357ABD;
  --primary-light: #6BA5E7;

  /* 辅助色 */
  --secondary-color: #7ED321;      /* 绿色 - 成功/正确 */
  --accent-color: #F5A623;         /* 橙色 - 警告/重点 */
  --danger-color: #D0021B;         /* 红色 - 错误/危险 */
  --info-color: #4A90E2;           /* 蓝色 - 信息 */
  --success-color: #7ED321;        /* 绿色 - 成功 */
  --warning-color: #F5A623;        /* 橙色 - 警告 */

  /* 文本色 */
  --text-primary: #2C3E50;         /* 主文本 */
  --text-secondary: #7F8C8D;       /* 次要文本 */
  --text-muted: #95A5A6;           /* 提示文本 */
  --text-white: #FFFFFF;

  /* 背景色 */
  --bg-primary: #F8F9FA;           /* 主背景 */
  --bg-secondary: #FFFFFF;         /* 卡片背景 */
  --bg-tertiary: #ECF0F1;          /* 次级背景 */

  /* 边框色 */
  --border-color: #E0E0E0;
  --border-light: #F0F0F0;

  /* 导航渐变 */
  --header-gradient-start: #667eea;
  --header-gradient-end: #764ba2;

  /* 徽章颜色 */
  --badge-primary: #4A90E2;
  --badge-success: #7ED321;
  --badge-warning: #F5A623;
  --badge-danger: #D0021B;
  --badge-gold: #FFD700;
  --badge-info: #4A90E2;
}
```

### 间距系统
```css
:root {
  --space-xs: 0.25rem;   /* 4px */
  --space-sm: 0.5rem;    /* 8px */
  --space-md: 1rem;      /* 16px */
  --space-lg: 1.5rem;    /* 24px */
  --space-xl: 2rem;      /* 32px */
  --space-2xl: 3rem;     /* 48px */
}
```

### 圆角系统
```css
:root {
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 50%;
}
```

### 阴影系统
```css
:root {
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.15);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.2);
  --shadow-hover: 0 6px 16px rgba(0, 0, 0, 0.2);
}
```

### 过渡动画
```css
:root {
  --transition: all 0.3s ease;
  --transition-fast: all 0.15s ease;
  --transition-slow: all 0.5s ease;
}
```

## 2. 组件样式规范

### 按钮
```css
/* 主要按钮 */
.btn-primary {
  background: var(--primary-color);
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: var(--radius-md);
  transition: var(--transition);
}
.btn-primary:hover {
  background: var(--primary-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

/* 次要按钮 */
.btn-secondary {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  padding: 0.75rem 1.5rem;
  border-radius: var(--radius-md);
}

/* 危险按钮 */
.btn-danger {
  background: var(--danger-color);
  color: white;
}
```

### 卡片
```css
.card {
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  padding: var(--space-md);
  transition: var(--transition);
}
.card:hover {
  box-shadow: var(--shadow-md);
}
```

### 导航项
```css
.nav-item {
  display: flex;
  align-items: center;
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: var(--transition);
}
.nav-item:hover {
  background: rgba(255, 255, 255, 0.1);
}
.nav-item.active {
  background: rgba(255, 255, 255, 0.2);
}
```

### 表单控件
```css
.form-control {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 1rem;
  transition: var(--transition);
}
.form-control:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.2);
  outline: none;
}
```

### 徽章 (Badge)
```css
.nav-badge {
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 600;
}
.nav-badge-primary { background: var(--badge-primary); color: white; }
.nav-badge-success { background: var(--badge-success); color: white; }
.nav-badge-warning { background: var(--badge-warning); color: white; }
.nav-badge-danger { background: var(--badge-danger); color: white; }
.nav-badge-gold { background: var(--badge-gold); color: #333; }
```

### 统计卡片
```css
.stat-card {
  text-align: center;
  padding: var(--space-md);
}
.stat-number {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: var(--space-xs);
}
.stat-label {
  font-size: 0.875rem;
  color: var(--text-muted);
}
```

## 3. 响应式断点规范

```css
/* 移动端: < 768px */
@media (max-width: 767px) {
  .main-nav { display: none; }
  .main-nav.active { display: block; }
  .menu-toggle { display: flex; }
  .grid-4 { grid-template-columns: repeat(2, 1fr); }
  .grid-3 { grid-template-columns: 1fr; }
  .header-content { padding: 0.5rem 1rem; }
}

/* 平板: 768px - 1023px */
@media (min-width: 768px) and (max-width: 1023px) {
  .grid-4 { grid-template-columns: repeat(2, 1fr); }
  .grid-3 { grid-template-columns: repeat(2, 1fr); }
}

/* 电脑: >= 1024px */
@media (min-width: 1024px) {
  .grid-4 { grid-template-columns: repeat(4, 1fr); }
  .grid-3 { grid-template-columns: repeat(3, 1fr); }
  .header-content { padding: 0.5rem 1.5rem; }
}
```

## 4. 交互动效规范

### 点击反馈
```css
/* 所有可点击元素 */
button, .nav-item, .card.clickable {
  transition: transform 0.1s ease, box-shadow 0.3s ease;
}
button:active, .nav-item:active {
  transform: scale(0.98);
}
```

### 卡片翻转
```css
.flip-card {
  transition: transform 0.6s;
  transform-style: preserve-3d;
}
.flip-card.flipped {
  transform: rotateY(180deg);
}
```

### 页面切换
```css
.module-content {
  animation: fadeIn 0.3s ease;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
```

### 进度动画
```css
.progress-bar {
  transition: width 0.5s ease;
}
```

### 加载动画
```css
@keyframes spin {
  to { transform: rotate(360deg); }
}
.loading-spinner {
  border: 3px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 0.8s linear infinite;
}
```

### 成就解锁动画
```css
@keyframes achievementPop {
  0% { transform: scale(0.5); opacity: 0; }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); opacity: 1; }
}
.achievement-unlocked {
  animation: achievementPop 0.5s ease;
}
```
