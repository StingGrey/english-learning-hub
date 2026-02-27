"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Send } from "lucide-react";

export default function WritingPage() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [feedback, setFeedback] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim() || loading) return;
    setLoading(true);
    setFeedback(null);
    try {
      const result = await api.writing.evaluate({ title, content });
      setFeedback(result);
    } catch {
      setFeedback({ overall_comment: "批改失败，请重试。" });
    } finally {
      setLoading(false);
    }
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  return (
    <div>
      <div className="mb-8 lg:mb-12">
        <p className="s-label">写作批改</p>
        <h1 className="font-black">英文作文批改</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        {/* 输入面板 */}
        <div>
          <div className="mb-4">
            <label className="s-label">标题（选填）</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="请输入作文标题..."
              className="s-input"
            />
          </div>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="s-label mb-0">你的作文</label>
              <span className="font-mono text-xs text-gray-500">{wordCount} 词</span>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="请用英文写下你的作文..."
              rows={16}
              className="s-textarea"
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={loading || !content.trim()}
            className="s-btn w-full flex items-center justify-center gap-2"
          >
            <Send size={14} />
            {loading ? "批改中..." : "提交批改"}
          </button>
        </div>

        {/* 反馈面板 */}
        <div>
          {!feedback && !loading && (
            <div className="s-card h-full flex items-center justify-center">
              <p className="font-mono text-sm text-gray-500 text-center">
                写下你的作文并提交，
                <br />
                即可获得 AI 反馈。
              </p>
            </div>
          )}

          {loading && (
            <div className="s-card h-full flex items-center justify-center">
              <p className="font-mono text-sm text-gray-500">正在分析你的作文...</p>
            </div>
          )}

          {feedback && (
            <div className="space-y-4">
              {/* 分数 */}
              {feedback.score && (
                <div className="s-card text-center py-4 md:py-6">
                  <p className="s-label">综合评分</p>
                  <p className="text-4xl md:text-5xl font-black">{feedback.score}</p>
                  <p className="font-mono text-xs text-gray-500 mt-1">/ 100</p>
                </div>
              )}

              {/* 总体评价 */}
              {feedback.overall_comment && (
                <div className="s-card">
                  <p className="s-label">总体评价</p>
                  <p className="font-mono text-xs md:text-sm leading-relaxed">
                    {feedback.overall_comment}
                  </p>
                </div>
              )}

              {/* 语法问题 */}
              {feedback.grammar_issues && (
                <div className="s-card">
                  <p className="s-label">语法问题</p>
                  <p className="font-mono text-xs md:text-sm leading-relaxed whitespace-pre-wrap">
                    {feedback.grammar_issues}
                  </p>
                </div>
              )}

              {/* 表达建议 */}
              {feedback.expression_suggestions && (
                <div className="s-card">
                  <p className="s-label">表达建议</p>
                  <p className="font-mono text-xs md:text-sm leading-relaxed whitespace-pre-wrap">
                    {feedback.expression_suggestions}
                  </p>
                </div>
              )}

              {/* 结构反馈 */}
              {feedback.structure_feedback && (
                <div className="s-card">
                  <p className="s-label">文章结构</p>
                  <p className="font-mono text-xs md:text-sm leading-relaxed whitespace-pre-wrap">
                    {feedback.structure_feedback}
                  </p>
                </div>
              )}

              {/* 改进版本 */}
              {feedback.improved_version && (
                <div className="s-card bg-gray-50">
                  <p className="s-label">改进版本</p>
                  <p className="font-mono text-xs md:text-sm leading-relaxed whitespace-pre-wrap">
                    {feedback.improved_version}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
