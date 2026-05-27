---
title: dvlproad 项目列表 HTML — PRD
date: 2026-04-12 21:58:23
updated: 2026-04-13 17:00:36
categories: 
- 管理相关
- 项目列表
---
# dvlproad 项目列表 HTML — PRD

dvlproad项目列表.md 文档呈现的项目列表太丑，通过自己实现HTML来展示，并新增一些使用的功能。

# 📋 [打开 dvlproad项目列表.html (网页版) →](/管理相关/项目列表/dvlproad项目列表/dvlproad项目列表.html)

<!-- more -->

## 1. 概述

Dvlproad

单文件 HTML 页面，可视化展示 `repos_with_pods.json` 中的仓库和 Pod 数据。所有数据通过 `<script>` 内嵌（一个全局 `DATA` 变量），纯前端渲染，零依赖。

## 2. 布局结构

<!-- more -->

```
┌─────────┬──────────────────────────────────────┐
│ Sidebar │ Header (标题 + 仓库总数)             │
│ 240px   ├──────────────────────────────────────┤
│         │ Toolbar (sticky 吸顶)                │
│         │  [搜索框] [不匹配隐藏] [筛选]         │
│         ├──────────────────────────────────────┤
│         │ Content                              │
│         │  Category → SubCategory              │
│         │   仓库表 (Repo table)                │
│         │     ├ Pod 表 (内嵌)                  │
│         │     │  ├ Subspec 详情 (内嵌)         │
│         │  ...                                 │
│         │  未匹配 Pod (底部)                   │
└─────────┴──────────────────────────────────────┘
```

- **Sidebar**: 固定左侧，分级导航（`l1` / `l2` / `l3`），点击跳转锚点
- **Header**: 标题 + 统计，正常滚动
- **Toolbar**: `position: sticky; top: 0` 吸顶，z-index 50
- **Content**: 分类/子分类/仓库表/Pod 表/Subspec 详情逐级嵌套

## 3. 视图控制（优先级链）

**全局 toolbar（层 0）** + **分类级 seg（层 1-2）** 两层控制，按优先级链层叠：

| layer | 层级范围 | 存储对象 | 修改触发 |
|-------|---------|---------|---------|
| 0 | 全局视图模式 | `viewMode`（单值） | 页面顶部 toolbar seg 切换 |
| 1 | 父分类 | `catDetailLevel[父分类]` | 父分类 seg 点击 |
| 2 | 自身分类 | `catDetailLevel[自身]` | 自身 seg 点击 |

### 全局 Toolbar

顶部 `项目 / +Pod / +Subspec` 三档 seg 控件，切换触发全量 `render()` 并清空所有分类级 seg 设置（`catDetailLevel = {}`）。默认：`+Subspec`（全显）。

### 分类级 Seg

每个有 Pod 的分类头部有独立三档 seg，颜色跟随层级色系（紫→蓝→青绿）。

### 三档效果

| 档位 | 仓库行 | Pod 区域 | Subspec 子库 |
|------|--------|----------|-------------|
| **repo** | 显示 | ❌ 不渲染 | ❌ |
| **+Pod** | 显示 + 展开图标 ▼ | ✅ 显示 | ❌ 默认折叠 ▶，可点击展开 |
| **+Subspec** | 显示 + 展开图标 ▼ | ✅ 显示 | ✅ 默认展开 ▼，可点击折叠 |

### 关键行为

- **读（显示）**：fallback 链 `自身 >> 父分类 >> 全局toolbar`，高优先覆盖低优先
- **写（修改）**：改全局 toolbar → 清空所有 `catDetailLevel`；改父分类 seg → 递归清除后代 `catDetailLevel`
- **局部刷新**：修改分类 seg 只重建该分类的 DOM（`updateCat` → `outerHTML` 替换）
- **全局切换**：全局 toolbar 改变会触发全量 `render()`

详见 `AI-qskills/priority-chain/SKILL.md` 和 `AI-qskills/html-table-hierarchy/SKILL.md`。

## 4. 搜索行为

### 4.1 搜索范围（按视图模式分层）

| 视图模式 | 搜索匹配字段 |
|----------|------------|
| 项目 | `repo_name`、`description` |
| +Pod | 项目字段 + `pod`、`summary` |
| +Subspec | 前两者 + subspec 的 `name`、`summary`（递归） |

支持多关键词搜索，用空格分隔（OR 逻辑）— 输入 `手势 GR GestureRecognizer` 匹配任意一个。

### 4.2 不匹配隐藏 Toggle

搜索框右侧有 toggle 开关（默认开启）：

- **开启**：搜索结果只显示命中的 pod 行，未命中 pod 完全隐藏（`continue` 跳过渲染）
- **关闭**：所有 pod 行都显示，命中的展开子库，未命中的折叠

该开关只影响搜索时有输入的情况（`lq` 非空）。

### 4.3 搜索高亮

匹配文本用 `<mark style="background:#fff3b0">` 包裹高亮。

## 5. 筛选按钮

在搜索框右侧：

| 按钮 | 行为 |
|------|------|
| 全部 | 不过滤 |
| 公有 | 只显示 `visibility === "公有"` |
| 私有 | 只显示 `visibility === "私有"` |

筛选与搜索叠加生效，与视图模式独立。

每个按钮右下角有数字角标（`.count-badge`），显示该可见性对应的 repo 总数。数字在 `render()` 末尾由 `updateFilterCounts()` 计算并刷新。

### 5.1 hideFromWeb 过滤

数据层面支持 `hideFromWeb: true` 字段。设为 `true` 的 repo 在 HTML 渲染时由 `removeHiddenRepos()` 在 `startApp()` 入口一次性剥离，不会出现在列表、搜索、计数和侧栏中。与 `visibility`（公有/私有）无关——即使仓库是公有的也可隐藏。

## 6. 数据层级与展示

### 6.1 JSON Schema

```json
{
  "repos": [
    {
      "type": "string",          // 分类名
      "intro": "string",        // 可选，分类简介
      "values": [
        {
          "repo_name": "string",
          "url": "string",
          "description": "string",
          "source": "GitHub | Gitee",
          "org": "string",
          "visibility": "公有 | 私有",
          "language": "string",
          "stars": 0,
          "pods": [              // 可选
            {
              "pod": "string",
              "version": "string",
              "summary": "string",
              "source": "CocoaPods",
              "visibility": "公有 | 私有",
              "language": "string",
              "subspec_count": 0,
              "subspecs": [
                {
                  "name": "string",
                  "summary": "string",
                  "subspecs": []  // 可递归嵌套
                }
              ]
            }
          ]
        }
      ],
      "children": [ /* 递归 */ ]
    }
  ],
  "unmatched_pods": [ /* 同 pods 结构，无 subspecs */ ]
}
```

每个分类标题旁的计数 badge：无筛选时仅显示总数（如 `4`），筛选或搜索生效时显示 `已筛选/总数`（如 `2/4`）并变橙色。

### 6.2 仓库表

列：`仓库名 | Pod | 描述 | 来源 | 可见 | 语言 | Stars`

- 仓库名：蓝色链接，`target="_blank"`
- Pod 列：有 Pod 的行显示 `2 ▼`（数字 + 展开符号），无 Pod 的行显示 `-`
- 描述：大屏换行全显示，≤800px 截断（`ellipsis`）+ `title` 悬浮查看全文
- 来源：`<span class="source-tag">` 小灰标
- 可见：绿色标签 `公有` / 红色标签 `私有`，圆角 pill 样式
- 有 Pod 的仓库行除仓库名链接外整行可点击展开 Pod 区域

### 6.3 Pod 表

列：`Pod | 子库 | 描述 | 版本 | 来源 | 可见 | 语言`

- 嵌入在仓库行下方的 `repo-pod-row` 中
- 背景色 `#fafbfc`，字号略小（13px）
- 子数列：有 Subspec 的行显示 `9 ▼`，无 Subspec 的行显示 `-`
- 有 Subspec 的 Pod 行整行可点击展开

### 6.4 Subspec 表

列：`Subspec | Summary`

- 嵌入在 Pod 行下方的 `pod-subspec-row` 中
- 字号 12px，背景 `#f8f9fb`
- 支持递归嵌套（`Subspec/Subsubspec` 格式）
- Subspec 表外层包裹 `<div style="padding-left:32px">`，视觉嵌套在 Pod 下

> 表格层级、列序、展开控制设计遵循 **html-table-hierarchy** skill（详见 `AI-qskills/html-table-hierarchy/SKILL.md`）。

## 7. 扩展信息区域

### 7.1 未匹配 Pod

底部独立区域，黄色背景（`#fff8e1`），黄色边框（`#ffe082`）。列：`Pod | Summary | Version | Git URL | 可见 | 语言`

### 7.2 Sidebar 导航

左侧边栏自动生成分类层级树：
- L1（顶级分类）：分类名后显示仓库总数，格式 `名称 (N)`
- L2（子分类）、L3（孙分类）：右下角小字角标（`.side-count-badge`），分别 `0.6rem` / `0.533rem`，半透明

空分类（`countAll === 0`）不在侧栏出现。

当 `activeData.unmatched_pods` 存在时，末尾追加 "未匹配 Pod" 导航项。

## 8. 视觉规范

| 元素 | 值 |
|------|-----|
| 字体 | `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans SC'` |
| 背景色 | `#f6f8fa` |
| 卡片/表格背景 | `#ffffff` |
| 主色/链接 | `#0969da` |
| 文字 | `#24292f` / 次级 `#656d76` |
| 标签绿色 | 背景 `#dafbe1`，文字 `#1a7f37` |
| 标签红色 | 背景 `#ffebe9`，文字 `#cf222e` |
| 表格圆角 | 5px，带 `#e5edf5` 边框 |
| 按钮 | 圆角 4px，active 变紫底白字 |
| 展开图标 | `▶` / `▼`，点击切换 |
| Segmented control | 三段连带式：[紫│蓝│青绿] 填充选中状态 |
| 层级色系 | Repo hover 紫 → Pod hover 蓝 → Subspec hover 青绿 |

## 9. 响应式

整个页面通过 `--font-base` + `rem` 单位 + 5 个断点实现多级缩放。所有字体、间距、边距用 `rem`，随根字体联动变化。

### 断点表

| 断点 | 根字体 | 侧栏 | 主内容边距 | 说明 |
|------|--------|------|------------|------|
| >1200px | 16px | 280px | 280px | 大屏全宽 |
| ≤1200px | 15px | 240px | 240px | 常规缩小 |
| ≤1000px | 14px | 200px | 200px | 中等屏 |
| ≤800px | 13px | 160px | 160px | 描述列截断 |
| ≤600px | 12px | 隐藏 | 0 | 移动端紧凑 |
| ≤480px | 12px | 隐藏 | 0 | 单元格间距缩小 |

### 表格响应式

`table-layout: fixed` 强制表格不超过容器宽度，列宽按比例分配：

| 列 | 宽度 |
|----|------|
| 仓库名 | 22% |
| Pod | 10% |
| 描述 | 32% |
| 来源 | auto |
| 可见 | auto |
| 语言 | auto |
| Stars | 10% |

`td { word-break: break-word; }` 保证长内容换行不溢出。

### 描述列行为

- **大屏（>800px）**：换行全显示，不限宽
- **小屏（≤800px）**：截断（`text-overflow: ellipsis`），鼠标悬停 `title` 查看全文

## 10. 数据加载机制

数据加载采用 **html-data-loading** skill 定义的三阶段降级方案
（详见 `AI-qskills/html-data-loading/SKILL.md`）。

### 文件结构

```
项目列表/
├── dvlproad项目列表.html              ← 渲染器（25 KB，纯逻辑）
├── dvlproad项目列表_PRD.md            ← 设计规范
├── dvlproad项目列表.md
└── dvlproad项目列表/
    └── data/
        ├── repos_with_pods.json       ← 数据源（Phase 1 fetch）
        ├── repos_with_pods.js         ← 可选：Phase 2 备用（file:// 用）
        ├── pods_all.json
        └── repos.json
```

### 数据更新

- **HTTP 场景**：更新 `repos_with_pods.json` 后刷新即可
- **file:// 场景**：除更新 `.json` 外，需重新生成 `.js`：

```bash
echo 'window.DATA = ' > dvlproad项目列表/data/repos_with_pods.js
cat dvlproad项目列表/data/repos_with_pods.json >> dvlproad项目列表/data/repos_with_pods.js
```

### 技术约束

- 单文件 HTML，所有 CSS 内联在 `<style>` 中，所有 JS 内联在 `</body>` 前
- `startApp(data, keepHidden)` 支持重复调用，每次重建 sidebar + 重新渲染。`keepHidden=true` 时保留 `hideFromWeb` 的 repo（"所有"模式），`false` 时过滤（"可见"模式）
- 渲染入口：`render()`，搜索/筛选/视图模式切换均调用 `render()` 全量重绘

## 11. 交互清单

1. **仓库行展开/收起** — `toggleRepoPod(id)`，切换 `.repo-pod-row.hidden` class
2. **Pod 行展开/收起** — `togglePodSubspec(id)`，切换 `.pod-subspec-row.hidden` class
3. **分类级视图切换** — `setCatLevel(type, level)`，写入 `catDetailLevel`，递归清除后代（`clearDescendantLevels`），调用 `updateCat(type)` 局部刷新
4. **筛选切换** — `setFilter(f)`，更新全局 `currentFilter`，触发 `render()`
5. **搜索** — `oninput="render()"`，实时过滤 + 高亮
6. **不匹配隐藏切换** — `setHideNonMatching(v)`，更新全局 `hideNonMatching`，触发 `render()`
7. **Sidebar 导航** — 锚点跳转 `#cat-{type}`
8. **筛选按钮角标** — `updateFilterCounts()` 在 `render()` 末尾遍历所有 repo，按 `visibility` 统计分布，写入 `.filter-btn .count-badge`。按钮 `position:relative`，角标定位 `bottom:0.133rem; right:0.133rem`，`font-size:0.6rem`
9. **hideFromWeb 过滤** — `removeHiddenRepos()` 在 `startApp()` 入口递归剥离 `hideFromWeb: true` 的 repo，不参与后续渲染和计数
10. **Stars 列隐藏** — 全局变量 `showStars` 控制整列显示，默认 `false`（表头和数据 `<td>` 均不渲染）。仅在手动选择文件且选"显示所有的"时设为 `true`（与 `fileKeepHidden` 同步）
11. **文件选择模式** — `pickFile(keepHidden)` 设 `fileKeepHidden` 后触发文件选择器；`loadLocalFile()` 传递 `fileKeepHidden` 给 `startApp()`，`true` 时不过滤（"所有"模式），`false` 时过滤（"可见"模式）

## 12. 参考来源

| 领域 | Skill | 说明 |
|------|-------|------|
| 层级表格 | `html-table-hierarchy` | 展开规则、列序、优先级链、响应式适配 |
| 数据加载 | `html-data-loading` | 三阶段降级方案 |
