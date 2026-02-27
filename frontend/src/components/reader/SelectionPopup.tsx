"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { BookmarkPlus, Languages, Lightbulb, X, Check } from "lucide-react";

interface SelectionPopupProps {
  text: string;
  context: string;
  x: number;
  y: number;
  articleId?: number;
  onClose: () => void;
}

export default function SelectionPopup({
  text,
  context,
  x,
  y,
  articleId,
  onClose,
}: SelectionPopupProps) {
  const [mode, setMode] = useState<"actions" | "translate" | "explain" | "saved">("actions");
  const [translation, setTranslation] = useState("");
  const [explanation, setExplanation] = useState("");
  const [aiExplanation, setAiExplanation] = useState("");
  const [loading, setLoading] = useState(false);

  const handleTranslate = async () => {
    setMode("translate");
    setLoading(true);
    try {
      const result = await api.translate.selection(text, context);
      setTranslation(result.translation);
      setExplanation(result.explanation || "");
    } catch {
      setTranslation("翻译失败。");
    } finally {
      setLoading(false);
    }
  };

  const handleExplain = async () => {
    setMode("explain");
    setLoading(true);
    try {
      const result = await api.translate.explain(text, context);
      setAiExplanation(result.explanation);
    } catch {
      setAiExplanation("讲解失败。");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveVocab = async () => {
    try {
      await api.vocab.mark({
        word: text,
        example_sentence: context,
        article_id: articleId,
      });
      setMode("saved");
      setTimeout(onClose, 1200);
    } catch {
      console.error("Failed to save vocab");
    }
  };

  return (
    <div
      data-popup
      className="fixed z-50 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:bg-zinc-900 dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
      style={{
        left: Math.min(x - 160, window.innerWidth - 340),
        top: y,
        width: 320,
      }}
    >
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b-2 border-black dark:border-white">
        <p className="font-sans font-bold text-sm truncate max-w-[240px]">&ldquo;{text}&rdquo;</p>
        <button onClick={onClose} className="text-gray-500 hover:text-black transition-colors dark:text-zinc-400 dark:hover:text-white">
          <X size={14} />
        </button>
      </div>

      {/* 操作按钮 */}
      {mode === "actions" && (
        <div className="p-2">
          <button
            onClick={handleTranslate}
            className="flex items-center gap-2 w-full px-3 py-2.5 font-mono text-sm text-left rounded-none hover:bg-gray-100 transition-colors dark:hover:bg-zinc-800"
          >
            <Languages size={16} className="text-gray-500 dark:text-zinc-400" />
            翻译
          </button>
          <button
            onClick={handleSaveVocab}
            className="flex items-center gap-2 w-full px-3 py-2.5 font-mono text-sm text-left rounded-none hover:bg-gray-100 transition-colors dark:hover:bg-zinc-800"
          >
            <BookmarkPlus size={16} className="text-gray-500 dark:text-zinc-400" />
            收藏单词
          </button>
          <button
            onClick={handleExplain}
            className="flex items-center gap-2 w-full px-3 py-2.5 font-mono text-sm text-left rounded-none hover:bg-gray-100 transition-colors dark:hover:bg-zinc-800"
          >
            <Lightbulb size={16} className="text-gray-500 dark:text-zinc-400" />
            AI 讲解
          </button>
        </div>
      )}

      {/* 翻译结果 */}
      {mode === "translate" && (
        <div className="p-4">
          {loading ? (
            <p className="font-mono text-sm text-gray-500">翻译中...</p>
          ) : (
            <>
              <p className="font-mono text-sm font-bold mb-2">{translation}</p>
              {explanation && (
                <p className="font-mono text-xs text-gray-500 leading-relaxed">
                  {explanation}
                </p>
              )}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleSaveVocab}
                  className="s-btn-outline text-xs py-1.5 flex items-center gap-1"
                >
                  <BookmarkPlus size={12} />
                  收藏单词
                </button>
                <button
                  onClick={() => setMode("actions")}
                  className="s-btn-ghost text-xs"
                >
                  返回
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* AI 讲解 */}
      {mode === "explain" && (
        <div className="p-4 max-h-64 overflow-y-auto">
          {loading ? (
            <p className="font-mono text-sm text-gray-500">分析中...</p>
          ) : (
            <>
              <p className="font-mono text-sm leading-relaxed whitespace-pre-wrap">
                {aiExplanation}
              </p>
              <button
                onClick={() => setMode("actions")}
                className="s-btn-ghost text-xs mt-3"
              >
                返回
              </button>
            </>
          )}
        </div>
      )}

      {/* 已收藏确认 */}
      {mode === "saved" && (
        <div className="p-4 flex items-center gap-2 font-mono text-sm">
          <Check size={16} className="text-green-600" />
          <span>已收藏到生词本!</span>
        </div>
      )}
    </div>
  );
}
