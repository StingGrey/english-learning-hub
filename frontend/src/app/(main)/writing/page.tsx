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
      setFeedback({ overall_comment: "Evaluation failed. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  return (
    <div>
      <div className="mb-12">
        <p className="swiss-label">Writing</p>
        <h1>Essay Correction</h1>
      </div>

      <div className="grid grid-cols-2 gap-8">
        {/* Input Panel */}
        <div>
          <div className="mb-4">
            <label className="swiss-label">Title (Optional)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Essay title..."
              className="swiss-input"
            />
          </div>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="swiss-label mb-0">Your Essay</label>
              <span className="text-xs text-swiss-gray">{wordCount} words</span>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your essay in English..."
              rows={16}
              className="swiss-input resize-none"
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={loading || !content.trim()}
            className="swiss-btn w-full flex items-center justify-center gap-2"
          >
            <Send size={14} />
            {loading ? "Evaluating..." : "Submit for Review"}
          </button>
        </div>

        {/* Feedback Panel */}
        <div>
          {!feedback && !loading && (
            <div className="swiss-card h-full flex items-center justify-center">
              <p className="text-swiss-gray text-sm text-center">
                Write your essay and submit
                <br />
                to receive AI feedback.
              </p>
            </div>
          )}

          {loading && (
            <div className="swiss-card h-full flex items-center justify-center">
              <p className="text-swiss-gray text-sm">Analyzing your essay...</p>
            </div>
          )}

          {feedback && (
            <div className="space-y-4">
              {/* Score */}
              {feedback.score && (
                <div className="swiss-card text-center py-6">
                  <p className="swiss-label">Score</p>
                  <p className="text-4xl font-bold">{feedback.score}</p>
                  <p className="text-xs text-swiss-gray mt-1">/ 100</p>
                </div>
              )}

              {/* Overall Comment */}
              {feedback.overall_comment && (
                <div className="swiss-card">
                  <p className="swiss-label">Overall</p>
                  <p className="text-sm leading-relaxed">
                    {feedback.overall_comment}
                  </p>
                </div>
              )}

              {/* Grammar Issues */}
              {feedback.grammar_issues && (
                <div className="swiss-card">
                  <p className="swiss-label">Grammar Issues</p>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {feedback.grammar_issues}
                  </p>
                </div>
              )}

              {/* Expression */}
              {feedback.expression_suggestions && (
                <div className="swiss-card">
                  <p className="swiss-label">Expression</p>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {feedback.expression_suggestions}
                  </p>
                </div>
              )}

              {/* Structure */}
              {feedback.structure_feedback && (
                <div className="swiss-card">
                  <p className="swiss-label">Structure</p>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {feedback.structure_feedback}
                  </p>
                </div>
              )}

              {/* Improved Version */}
              {feedback.improved_version && (
                <div className="swiss-card bg-swiss-bg">
                  <p className="swiss-label">Improved Version</p>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
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
