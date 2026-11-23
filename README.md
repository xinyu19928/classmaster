# 班主任管理工作台（PWA 云版）

一站式班级管理工具，已改造为 PWA，可通过 HTTPS 链接访问，并支持添加到手机主屏幕全屏使用。

## 在线访问地址

临时公网链接：https://garlic-dependence-composed-mods.trycloudflare.com

> 该链接通过 Cloudflare Quick Tunnel 临时生成，在当前沙箱会话期间有效。如需长期稳定使用，请改用 Cloudflare Pages / Cloudflare Tunnel 固定域名部署。

## 已完成功能

### 核心管理模块
- 仪表盘：数据总览 + 快捷操作 + 考试均分图表
- 学生管理：花名册、个人档案、Excel 导入导出、Word 报告
- 成绩分析：考试列表、成绩录入、单次分析、个人趋势、进退步、班级排名、科目设置
- 违纪统计：看板、饼图、柱状图、趋势图、明细记录
- 作业管理：布置作业、提交率统计、一键标记已交
- 请假管理：四步登记、记录列表、统计、请假条导出
- 工作留痕：时间轴视图、类型统计、批量 Word 导出
- 谈话记录：全维度档案、按学生导出
- 排座位：可视化编辑、自动排座、导出图片
- 家校沟通：家长台账、家访、家长会、群通知
- 班级活动：班会、活动档案、获奖记录、值日安排
- 待办备忘录：待办事项、笔记、重要提醒
- 爆款视频：B 站热门视频榜单（实时接口）
- 重要新闻：中国新闻网教育频道新闻（实时接口）

### 数据能力
- localStorage 本地存储，刷新不丢失
- Excel 导入导出（学生、成绩、请假等）
- Word 导出（学生报告、请假条、工作记录、谈话记录）
- 图片导出（座位表）
- 全量数据备份与恢复（JSON）
- 预置演示数据，开箱即用

### PWA 能力
- 已配置 `manifest.json`（standalone 全屏模式）
- 已配置 Service Worker 离线缓存
- 已生成 192/512/Maskable/Apple Touch Icon 等图标
- 支持从 Chrome 安卓 "添加到主屏幕"，像原生 App 一样全屏使用
- 已设置主题色、安全区适配、PWA shortcuts

## 数据来源

| 模块 | 数据源 | 接口路径 |
|------|--------|----------|
| 爆款视频 | B 站热门排行榜 | `/api/bilibili/hot` |
| 重要新闻 | 中国新闻网教育频道 RSS | `/api/news/edu` |

接口通过 Cloudflare Pages Functions 后端代理，自动解决浏览器 CORS 限制与目标站反爬问题。

## 如何在手机安装

1. 用手机浏览器打开上方链接（推荐 Chrome）
2. 点击菜单 → "添加到主屏幕" / "安装应用"
3. 桌面会出现"班主任"图标
4. 点击图标即可像 App 一样全屏使用，无浏览器地址栏

## 目录结构

```
/workspace/teacher-platform/
├── index.html              # 主应用（完整单页）
├── manifest.json           # PWA 配置
├── sw.js                   # Service Worker（离线缓存）
├── icons/                  # 应用图标
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── icon-maskable.png
│   ├── apple-touch-icon.png
│   ├── favicon-32.png
│   └── favicon-16.png
└── functions/              # Cloudflare Pages Functions
    └── api/
        ├── health.js
        ├── bilibili/hot.js
        └── news/edu.js
```

## 本地开发

```bash
cd /workspace/teacher-platform
# 方式1：纯静态预览
python3 -m http.server 8767

# 方式2：带 mock API 的完整预览
# 先启动 mock API（已提供）
python3 /root/.codebuddy/artifact/mock_api.py
# 再启动集成服务器
python3 /root/.codebuddy/artifact/integrated_server.py
# 访问 http://localhost:8767
```

## 升级到正式稳定部署

如需长期稳定访问地址：
1. 注册 Cloudflare 账号
2. 创建 Cloudflare Pages 项目并关联 GitHub 仓库
3. 将本项目 `functions/` 与根目录文件提交到仓库
4. Pages 会自动部署到 `https://你的项目.pages.dev`
5. 或使用 Cloudflare Tunnel 创建固定域名的 named tunnel

## 技术栈

- HTML5 + Tailwind CSS（响应式布局）
- Chart.js（图表）
- SheetJS + FileSaver（Excel 导入导出）
- html2canvas（座位表图片导出）
- localStorage（本地数据持久化）
- Cloudflare Pages Functions（后端代理与 API）
- Service Worker + Manifest（PWA）

---
生成时间：2026年7月31日
