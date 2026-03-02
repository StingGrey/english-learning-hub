# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI English Learning Hub — 纯前端静态英语学习应用，部署到 GitHub Pages。功能闭环：RSS 阅读 → 划词标词 → SM-2 复习 → 口语/写作 AI 陪练。单用户，无后端认证，数据全部存浏览器 IndexedDB。

## Commands

```bash
# 前端开发（所有命令在 frontend/ 目录执行）
cd frontend
npm install          # 安装依赖
npm run dev          # 本地开发 http://localhost:3000
npm run build        # 静态导出到 out/
npm run lint         # ESLint 检查

# 后端开发（可选，在 backend/ 目录执行）
cd backend
pip install -r requirements.txt
python main.py       # http://localhost:8000, API 文档 /docs
```

## Architecture

**前端**: Next.js 14 静态导出 + TypeScript + Tailwind CSS + Dexie.js (IndexedDB)
**后端**: FastAPI + SQLAlchemy + SQLite（可选，前端可独立运行）

### 前端核心模块 (`frontend/src/lib/`)

- **db.ts** — IndexedDB 数据库层，Dexie ORM，15 张表定义及索引
- **ai.ts** — 所有 AI 能力（翻译/讲解/词义/计划生成/口语陪练/写作批改/词汇提取），支持 OpenAI/Claude/Gemini 多种 API 格式
- **api.ts** — API 适配层，保持与后端相同的接口签名，但实际读写本地 IndexedDB
- **rss.ts** — RSS 抓取（通过 CORS 代理 + r.jina.ai 全文提取 + DOM 解析兜底）+ Flesch 可读性评分自动分级
- **review.ts** — SM-2 间隔重复算法
- **webdav.ts** — WebDAV 多设备同步（坚果云/NextCloud/Synology）

### 路由结构

所有页面在 `frontend/src/app/(main)/` 路由组下，共享侧边栏布局。页面包括：仪表盘(`/`)、计划(`/plan`)、发现(`/discover`)、阅读器(`/reader`)、生词本(`/vocab`)、词汇书(`/wordbook`)、口语(`/speaking`)、写作(`/writing`)、统计(`/stats`)、设置(`/settings`)。

### 数据流

用户数据（API Key、学习记录、词汇）全部存储在浏览器 IndexedDB，通过 WebDAV 可选同步。API Key 不上传任何第三方。AI 调用由浏览器直连用户配置的 OpenAI 兼容端点。

## Swiss Style Design Rules (严格执行)

UI 遵循瑞士国际风格，详细规范见 `swiss-style-soft-prompt.md`。关键约束：

**必须**: `rounded-none`, `border-black`, `font-sans`, 平面纯色, 响应式间距/字号
**禁止**: `rounded-lg/xl/2xl/3xl/full`, `shadow-sm/md/lg/xl/2xl`, `bg-gradient-to-*`, `font-serif`, `italic`, `border-dashed/dotted`

阴影只允许硬偏移格式：`shadow-[4px_4px_0px_0px_rgba(...)]`。全局 CSS 组件在 `frontend/src/app/globals.css` 中定义（`.s-card`, `.s-btn`, `.s-input` 等）。

支持暗色主题（`dark:` 前缀），跟随系统自动切换。

## Deployment

GitHub Actions 自动部署到 GitHub Pages（`.github/workflows/deploy.yml`）。push 到 `main` 触发构建。`basePath` 设为 `/english-learning-hub`（见 `frontend/next.config.js`）。

## Key Design Decisions

- 纯前端架构，后端为可选组件，前端 `api.ts` 已实现全部本地替代
- RSS 通过 CORS 代理在客户端抓取，全文通过 r.jina.ai 提取（DOM 解析作为兜底）
- 支持 OpenAI / Claude / Gemini (Vertex) 三种 API 格式
- 中文 UI，面向中国英语学习者
