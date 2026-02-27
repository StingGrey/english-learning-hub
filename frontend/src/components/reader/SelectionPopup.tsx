"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import * as ai from "@/lib/ai";
import { BookmarkPlus, Languages, Lightbulb, X, Check, Loader2 } from "lucide-react";

interface WordDetail {
  word: string;
  lemma: string;
  pos: string;
  definition: string;
  definition_en: string;
  pronunciation: string;
}

interface SelectionPopupProps {
  text: string;
  context: string;
  x: number;
  y: number;
  articleId?: number;
  onClose: () => void;
}

const POS_LABELS: Record<string, string> = {
  noun: "名词",
  verb: "动词",
  adj: "形容词",
  adv: "副词",
  prep: "介词",
  conj: "连词",
  pron: "代词",
  det: "限定词",
};

export default function SelectionPopup({
  text,
  context,
  x,
  y,
  articleId,
  onClose,
}: SelectionPopupProps) {
  const isSingleWord = !text.includes(" ") && text.length <= 30;

  const [mode, setMode] = useState<"actions" | "word" | "translate" | "explain" | "saved">(
    isSingleWord ? "word" : "actions"
  );
  const [wordDetail, setWordDetail] = useState<WordDetail | null>(null);
  const [wordLoading, setWordLoading] = useState(false);
  const [translation, setTranslation] = useState("");
  const [explanation, setExplanation] = useState("");
  const [aiExplanation, setAiExplanation] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 单词模式：自动加载词义
  useEffect(() => {
    if (isSingleWord) {
      setWordLoading(true);
      ai.getWordDefinition(text, context)
        .then((detail) => setWordDetail(detail))
        .catch(() => setWordDetail(null))
        .finally(() => setWordLoading(false));
    }
  }, [text, context, isSingleWord]);

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

  const handleSaveVocab = async (detail?: WordDetail | null) => {
    setSaving(true);
    try {
      await api.vocab.mark({
        word: text,
        lemma: detail?.lemma,
        pos: detail?.pos,
        definition: detail?.definition,
        definition_en: detail?.definition_en,
        pronunciation: detail?.pronunciation,
        example_sentence: context,
        article_id: articleId,
      });
      setMode("saved");
      setTimeout(onClose, 1200);
    } catch {
      console.error("Failed to save vocab");
    } finally {
      setSaving(false);
    }
  };

  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 800;
  const popupWidth = Math.min(320, viewportWidth - 16);
  const popupLeft = Math.max(8, Math.min(x - popupWidth / 2, viewportWidth - popupWidth - 8));
  const popupTop = typeof window !== "undefined" ? Math.min(y, window.innerHeight - 16) : y;

  return (
    <div
      data-popup
      className="fixed z-50 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:bg-zinc-900 dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
      style={{
        left: popupLeft,
        top: popupTop,
        width: popupWidth,
        maxHeight: "80vh",
        overflowY: "auto",
      }}
    >
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b-2 border-black dark:border-white sticky top-0 bg-white dark:bg-zinc-900 z-10">
        <p className="font-sans font-bold text-sm truncate max-w-[240px]">&ldquo;{text}&rdquo;</p>
        <button onClick={onClose} className="text-gray-500 hover:text-black transition-colors dark:text-zinc-400 dark:hover:text-white">
          <X size={14} />
        </button>
      </div>

      {/* 单词详解模式（单词自动触发） */}
      {mode === "word" && (
        <div className="p-4">
          {wordLoading ? (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 size={14} className="animate-spin" />
              <span className="font-mono text-sm">分析中...</span>
            </div>
          ) : wordDetail ? (
            <>
              {/* 音标 + 词性 */}
              <div className="flex items-center gap-3 mb-3">
                {wordDetail.pronunciation && (
                  <span className="font-mono text-xs text-gray-500">/{wordDetail.pronunciation}/</span>
                )}
                {wordDetail.pos && (
                  <span className="s-tag !text-[10px]">
                    {POS_LABELS[wordDetail.pos] || wordDetail.pos}
                  </span>
                )}
              </div>

              {/* 中文释义 */}
              {wordDetail.definition && (
                <div className="mb-2">
                  <p className="font-mono text-xs text-gray-400 uppercase tracking-wider mb-0.5">中文释义</p>
                  <p className="font-mono text-sm font-bold leading-snug">{wordDetail.definition}</p>
                </div>
              )}

              {/* 英文释义 */}
              {wordDetail.definition_en && (
                <div className="mb-3">
                  <p className="font-mono text-xs text-gray-400 uppercase tracking-wider mb-0.5">English</p>
                  <p className="font-mono text-xs text-gray-600 dark:text-zinc-400 leading-relaxed">{wordDetail.definition_en}</p>
                </div>
              )}

              {/* 来源句子 */}
              {context && (
                <div className="mb-3 px-2 py-1.5 bg-gray-50 dark:bg-zinc-800 border-l-2 border-gray-300 dark:border-zinc-600">
                  <p className="font-mono text-xs text-gray-500 leading-relaxed line-clamp-2">{context}</p>
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex gap-2 mt-3 flex-wrap">
                <button
                  onClick={() => handleSaveVocab(wordDetail)}
                  disabled={saving}
                  className="s-btn text-xs py-1.5 flex items-center gap-1 flex-1"
                >
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <BookmarkPlus size={12} />}
                  加入生词本
                </button>
                <button
                  onClick={handleTranslate}
                  className="s-btn-outline text-xs py-1.5 flex items-center gap-1"
                >
                  <Languages size={12} />
                  翻译
                </button>
                <button
                  onClick={handleExplain}
                  className="s-btn-outline text-xs py-1.5 flex items-center gap-1"
                >
                  <Lightbulb size={12} />
                  讲解
                </button>
              </div>
            </>
          ) : (
            /* 词义获取失败，退回操作列表 */
            <div>
              <p className="font-mono text-xs text-gray-500 mb-3">无法获取词义，请选择操作：</p>
              <button
                onClick={handleTranslate}
                className="flex items-center gap-2 w-full px-3 py-2.5 font-mono text-sm text-left hover:bg-gray-100 transition-colors dark:hover:bg-zinc-800"
              >
                <Languages size={16} className="text-gray-500" />
                翻译
              </button>
              <button
                onClick={() => handleSaveVocab(null)}
                disabled={saving}
                className="flex items-center gap-2 w-full px-3 py-2.5 font-mono text-sm text-left hover:bg-gray-100 transition-colors dark:hover:bg-zinc-800"
              >
                <BookmarkPlus size={16} className="text-gray-500" />
                收藏单词
              </button>
            </div>
          )}
        </div>
      )}

      {/* 操作按钮（多词选中时） */}
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
            onClick={() => handleSaveVocab(null)}
            disabled={saving}
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
                  onClick={() => handleSaveVocab(null)}
                  disabled={saving}
                  className="s-btn-outline text-xs py-1.5 flex items-center gap-1"
                >
                  <BookmarkPlus size={12} />
                  收藏单词
                </button>
                <button
                  onClick={() => setMode(isSingleWord ? "word" : "actions")}
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
        <div className="p-4">
          {loading ? (
            <p className="font-mono text-sm text-gray-500">分析中...</p>
          ) : (
            <>
              <p className="font-mono text-sm leading-relaxed whitespace-pre-wrap">
                {aiExplanation}
              </p>
              <button
                onClick={() => setMode(isSingleWord ? "word" : "actions")}
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
