# PR5c 审计报告（阶段 1，仅审计不改代码）

审计范围：`mieru-panel/panel/components/`，以及相关样式 `mieru-panel/panel/app/globals.css` 与用户要求的 grep 检查项。

## 不变量 1：Buttons

| 不变量 | 文件:行号 | 当前状态 | 建议修复 |
| --- | --- | --- | --- |
| 仅通过共享 `Button` 变体使用按钮 | `mieru-panel/panel/components/AddUserModal.tsx:302` | 仍直接使用 `<button className="btn-secondary">` / `<button className="btn-primary">` | 改为共享 `Button` 组件并显式传入 `variant` |
| 仅允许三种变体 | `mieru-panel/panel/components/ConfirmModal.tsx:84` | 使用 `btn-danger`（第 4 种变体） | 通过统一的 destructive action 方案收敛到共享按钮体系 |
| 禁止大量 raw `<button>` | `mieru-panel/panel/components/SubPanel.tsx:155` | 多处 raw button（`action-btn` 等） | 迁移到共享 `Button` 并统一尺寸/间距 |
| 按钮高度仅 28/32/36 | `mieru-panel/panel/app/globals.css:511` | `.btn-primary`/`.btn-secondary` 通过 padding 决定高度，未固定 | 增加显式 size token，组件层只用 size class |
| 渐变只允许单个主 CTA | `mieru-panel/panel/app/globals.css:517` | 全局 `.btn-primary` 都是渐变 | 将渐变限制为每页单一 CTA，其余 primary 改为平面 |

## 不变量 2：Modals

| 不变量 | 文件:行号 | 当前状态 | 建议修复 |
| --- | --- | --- | --- |
| 最大宽度 480px | `mieru-panel/panel/app/globals.css:1313` | `.modal` 为 `max-width: 420px` | 调整到 480px（或引入 size 变体） |
| 内边距 16px | `mieru-panel/panel/app/globals.css:1311` | `.modal` 为 `padding: 28px` | 收敛到 16px 基线 |
| 背景层 60% 黑 + blur 8px | `mieru-panel/panel/app/globals.css:1298` | 当前为 `rgba(0,0,0,0.65)`，blur 正确 | 透明度调为 0.60 |
| 需要右上角 X 关闭 | `mieru-panel/panel/components/AddUserModal.tsx:180` | 有标题和 footer 按钮，但没有右上角关闭按钮 | 给所有 modal header 增加统一 close button |
| Footer actions 右对齐 | `mieru-panel/panel/app/globals.css:1399` | 当前已右对齐 | 维持现状 |

## 不变量 3：Empty states

| 不变量 | 文件:行号 | 当前状态 | 建议修复 |
| --- | --- | --- | --- |
| Empty 结构必须 icon + title + desc + CTA | `mieru-panel/panel/components/UserTable.tsx:104` | 仅文本 empty | 改为统一 empty-state 组件 |
| Empty 结构一致性 | `mieru-panel/panel/components/logs/AuditList.tsx:18` | 仅 muted 文本 | 增加 icon/title/description/CTA |
| Empty 结构一致性 | `mieru-panel/panel/components/logs/LogStream.tsx:65` | 仅一行 muted 文本 | 改为结构化 empty block |
| Empty 结构一致性 | `mieru-panel/panel/components/ConnectionsPanel.tsx:55` | empty/unavailable 仅文本 | 引入紧凑型结构化空态/错误态 |

## 不变量 4：Loading states

| 不变量 | 文件:行号 | 当前状态 | 建议修复 |
| --- | --- | --- | --- |
| 优先 skeleton，而非文本 loading | `mieru-panel/panel/components/ConnectionsPanel.tsx:51` | 文本 loading | 使用 skeleton 行占位 |
| 优先 skeleton，而非文本 loading | `mieru-panel/panel/components/logs/AuditList.tsx:16` | 文本 loading | 使用紧凑审计 skeleton 行 |
| spinner 仅允许按钮内联 | `mieru-panel/panel/components/users/KpiStrip.tsx:59` | KPI 已是 skeleton（合规示例） | 将该模式复用到其他数据区块 |

## 不变量 5：Focus rings

| 不变量 | 文件:行号 | 当前状态 | 建议修复 |
| --- | --- | --- | --- |
| 2px accent + 2px offset | `mieru-panel/panel/app/globals.css:1386` | 仅 `box-shadow`，无统一 offset token | 增加共享 focus utility（含 `outline-offset: 2px`） |
| 不应直接去掉 outline 且无统一替代 | `mieru-panel/panel/app/globals.css:1144` | 输入框先 `outline: none` | 使用统一 focus class 并保证键盘可见性 |
| 焦点样式跨控件一致 | `mieru-panel/panel/app/globals.css:2053` | 搜索框 focus 规则与表单控件不一致 | 统一所有输入类 focus 样式 |

## 不变量 6：Transitions

| 不变量 | 文件:行号 | 当前状态 | 建议修复 |
| --- | --- | --- | --- |
| 仅 color/bg/border 150ms ease-out | `mieru-panel/panel/app/globals.css:379` | `transition: all 0.15s ease` | 改为显式属性列表 |
| 禁止 `transition: all` | `mieru-panel/panel/app/globals.css:1087` | 仍有 `transition: all 0.15s ease` | 改为属性级 transition |
| 动效时长需收敛 | `mieru-panel/panel/app/globals.css:531` | 存在 0.2s/0.5s/0.6s 等多种时长 | 收敛到标准时长（必要例外单独标注） |

## 不变量 7：Tabular numbers

| 不变量 | 文件:行号 | 当前状态 | 建议修复 |
| --- | --- | --- | --- |
| 数值列使用 tabular nums | `mieru-panel/panel/app/globals.css:2815` | `log-time-v2` 已使用（合规） | 维持 |
| 数值列使用 tabular nums | `mieru-panel/panel/app/globals.css:2935` | `audit-time-v2` 已使用（合规） | 维持 |
| 卡片/表格中的数值一致性 | `mieru-panel/panel/app/globals.css:2248` | `kpi-value` 未显式设置 tabular | 为 KPI 数值增加 tabular 样式 |

## 不变量 8：Status pills 单一来源

| 不变量 | 文件:行号 | 当前状态 | 建议修复 |
| --- | --- | --- | --- |
| Status pill 统一组件 | `mieru-panel/panel/components/TopBar.tsx:62` | `v2-status-pill` 自实现 | 提取共享 `StatusPill` |
| Status pill 统一组件 | `mieru-panel/panel/components/server/DaemonHeader.tsx:87` | `daemon-chip` 自实现 | 迁移到共享 `StatusPill` |
| Status pill 统一组件 | `mieru-panel/panel/components/logs/AuditRow.tsx:25` | `audit-result-v2` 自实现 | 统一为共享 `StatusPill` + tone map |
| 计数 badge 语义统一 | `mieru-panel/panel/components/ConnectionsPanel.tsx:45` | 使用通用 `badge` | 评估抽象为 badge/pill 基元体系 |

## 不变量 9：Native confirm/prompt/alert

| 不变量 | 文件:行号 | 当前状态 | 建议修复 |
| --- | --- | --- | --- |
| 原生 `confirm/prompt/alert` 必须为 0 | `mieru-panel/panel/components/SubPanel.tsx:109` | 仍使用 `confirm(...)` | 改为现有 `ConfirmModal` 流程 |

## 不变量 10：Card-level gradients

| 不变量 | 文件:行号 | 当前状态 | 建议修复 |
| --- | --- | --- | --- |
| 卡片不得使用渐变 | `mieru-panel/panel/app/globals.css:172` | App 背景网格使用线性渐变 | 若不属于卡片可保留，否则改为平面 token |
| 渐变仅单一主 CTA | `mieru-panel/panel/app/globals.css:517` | 全局 primary 按钮渐变 | 限制为单 CTA，其他按钮平面化 |
| 非装饰性例外说明 | `mieru-panel/panel/app/globals.css:1371` | select caret 使用渐变绘制 | 作为功能性图形可保留，文档注明例外 |

## 优先级汇总

- HIGH（影响 UX/安全）：**4 项**
  - `SubPanel` 中仍有 native `confirm`
  - Modal 关闭交互不一致（缺少右上角关闭）
  - Button 变体漂移（`btn-danger` + raw button）
  - Primary 渐变全局泛化
- MEDIUM（用户可见的样式/一致性问题）：**12 项**
  - Empty/loading 结构不一致
  - Focus ring 规范不一致
  - Transition 规范不一致
  - Status pill 多处重复实现
- LOW（内部一致性与规范性）：**6 项**
  - 局部数值排版未统一 tabular
  - Modal token（宽度/内边距）未对齐
  - 背景渐变与规范归类需澄清
