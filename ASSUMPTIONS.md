# 设计假设

1. **单用户**: 不做认证鉴权，所有数据属于同一用户。
2. **AI 模型**: 默认使用 OpenAI 兼容 API（可替换为任何兼容接口）。
3. **RSS 源**: 预置 BBC、Reuters、NPR、The Guardian、AP News 的公开 RSS。
4. **文章难度**: 通过 Flesch-Kincaid 可读性评分自动打标（Easy/Medium/Hard）。
5. **SM-2 复习算法**: 使用简化版 SuperMemo-2 间隔重复算法。
6. **翻译**: 通过 AI 模型完成，不依赖第三方翻译 API。
7. **口语陪练**: 基于文本对话（不涉及语音识别/合成）。
8. **数据存储**: SQLite 单文件存储于 `backend/data/` 目录。
9. **时区**: 默认使用系统本地时区。
10. **瑞士风格**: UI 使用 Helvetica/Inter 无衬线字体、严格网格、黑白为主、大量负空间。
