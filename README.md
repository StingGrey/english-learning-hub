# AI English Learning Hub

自用 AI 英语学习网站 —— 阅读 · 标词 · 复习 · 口语/写作提升闭环。

**纯前端静态应用**，可直接部署到 GitHub Pages，无需服务器。

## 技术栈

- **前端**: Next.js 14 + TypeScript + Tailwind CSS（静态导出）
- **数据存储**: IndexedDB（浏览器本地，Dexie.js）
- **AI**: 浏览器直连 OpenAI 兼容 API
- **RSS**: 通过 CORS 代理在浏览器端抓取
- **部署**: GitHub Pages（GitHub Actions 自动构建）

## 部署到 GitHub Pages

### 方式一：GitHub Actions 自动部署（推荐）

1. 将项目推送到 GitHub 仓库
2. 进入仓库 Settings → Pages → Source，选择 **GitHub Actions**
3. 每次 push 到 `main` 分支会自动构建部署

如果仓库名不是 `username.github.io`，需要在 `frontend/next.config.js` 设置 basePath：

```js
const nextConfig = {
  output: "export",
  images: { unoptimized: true },
  basePath: "/你的仓库名",  // 取消注释并修改
  trailingSlash: true,
};
```

### 方式二：本地构建后手动部署

```bash
cd frontend
npm install
npx next build
# 将 out/ 目录内容部署到 GitHub Pages
```

## 本地开发

```bash
cd frontend
npm install
npm run dev
```

打开 `http://localhost:3000`

## 首次使用

1. 打开网站后，进入 **Settings** 页面
2. 填入你的 AI API Key（支持 OpenAI 或任何兼容 API）
3. 设置学习目标和每日时长
4. 去 **Discover** 页面点击 "Fetch New" 抓取文章
5. 开始学习！

> API Key 仅存储在浏览器本地 IndexedDB 中，不会发送到任何第三方服务器。

## 功能

| 功能 | 说明 |
|------|------|
| 仪表盘 | 今日统计 + 快捷入口 + 推荐文章 |
| 学习计划 | AI 根据目标和时长生成每日任务 |
| 外刊发现 | RSS 自动抓取，按难度筛选 |
| 阅读器 | 划词翻译/标词/AI 讲解，中英对照 |
| 生词本 | 一键标词，自动获取释义 |
| 复习系统 | SM-2 间隔重复算法安排复习 |
| 口语陪练 | 文本对话 + 纠错 + 替代表达建议 |
| 写作批改 | 语法纠错 + 表达优化 + 评分 |
| 学习统计 | 7 天任务/词汇/复习数据总览 |

## 页面路由

| 路径 | 功能 |
|------|------|
| `/` | 仪表盘 |
| `/plan` | 今日计划 |
| `/discover` | 外刊推荐 |
| `/reader?id=N` | 阅读器 |
| `/vocab` | 生词本与复习 |
| `/speaking` | 口语陪练 |
| `/writing` | 写作批改 |
| `/stats` | 学习统计 |
| `/settings` | 设置 |

## 设计风格

瑞士国际风格（Swiss Style）—— 理性、网格、Helvetica、大量负空间、黑白为主。
