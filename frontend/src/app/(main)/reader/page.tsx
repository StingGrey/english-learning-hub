"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useFetch } from "@/hooks/useFetch";
import SelectionPopup from "@/components/reader/SelectionPopup";
import { ArrowLeft, BookOpen, Globe, Loader2 } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

function ReaderContent() {
  const searchParams = useSearchParams();
  const articleId = Number(searchParams.get("id"));

  const { data: article, loading } = useFetch(
    () => (articleId ? api.content.getArticle(articleId) : Promise.resolve(null)),
    [articleId]
  );

  const [viewMode, setViewMode] = useState<"en" | "bilingual">("en");
  const [sentences, setSentences] = useState<{ index: number; text_en: string; text_zh: string }[]>([]);
  const [translating, setTranslating] = useState(false);
  const [popup, setPopup] = useState<{
    text: string;
    context: string;
    x: number;
    y: number;
  } | null>(null);

  const contentRef = useRef<HTMLDivElement>(null);

  // 当文章加载完成后，初始化本地 sentences 状态
  useEffect(() => {
    if (article?.sentences) {
      setSentences(article.sentences);
    }
  }, [article]);

  // 切换到双语模式时，如果没有翻译则自动触发 AI 翻译
  const handleBilingualSwitch = useCallback(async () => {
    setViewMode("bilingual");
    if (!sentences.length) return;

    const hasTranslations = sentences.some((s) => s.text_zh && s.text_zh.trim());
    if (hasTranslations) return;

    setTranslating(true);
    try {
      const texts = sentences.map((s) => s.text_en);
      const result = await api.translate.sentences(texts);
      const translations = result.translations;

      const updated = sentences.map((s, i) => ({
        ...s,
        text_zh: translations[i] || "",
      }));
      setSentences(updated);

      // 持久化到 IndexedDB
      if (articleId) {
        await api.content.saveTranslations(articleId, translations);
      }
    } catch (e) {
      console.error("翻译失败:", e);
    } finally {
      setTranslating(false);
    }
  }, [sentences, articleId]);

  const triggerSelectionPopup = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;
    if (!contentRef.current || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const isInsideContent = contentRef.current.contains(
      container.nodeType === Node.ELEMENT_NODE ? container : container.parentElement
    );
    if (!isInsideContent) return;

    const text = selection.toString().trim();
    if (!text || text.length > 500) return;

    const contextNode = range.startContainer.nodeType === Node.ELEMENT_NODE
      ? (range.startContainer as Element)
      : range.startContainer.parentElement;
    const context = contextNode?.textContent || "";

    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;

    setPopup({
      text,
      context,
      x: rect.left + rect.width / 2,
      y: rect.bottom + 8,
    });
  }, []);

  const handleTouchEnd = useCallback(() => {
    window.setTimeout(triggerSelectionPopup, 80);
  }, [triggerSelectionPopup]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-popup]")) {
        setPopup(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const difficultyLabel = (d: string) => {
    if (d === "easy") return "简单";
    if (d === "medium") return "中等";
    if (d === "hard") return "困难";
    return d;
  };

  if (!articleId) {
    return (
      <div className="s-card text-center py-16">
        <p className="font-mono text-sm text-gray-500">未选择文章</p>
        <Link href="/discover/" className="s-btn mt-4 inline-block">
          浏览文章
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="font-mono text-sm text-gray-500">加载文章中...</p>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="s-card text-center py-16">
        <p className="font-mono text-sm text-gray-500">未找到文章</p>
        <Link href="/discover/" className="s-btn mt-4 inline-block">
          返回发现
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* 页面头部 */}
      <div className="mb-6 lg:mb-8">
        <Link
          href="/discover/"
          className="s-btn-ghost inline-flex items-center gap-1 mb-3 md:mb-4 -ml-4"
        >
          <ArrowLeft size={14} />
          返回
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
          <div className="flex-1">
            <p className="s-label">阅读器</p>
            <h1 className="font-black text-xl md:text-2xl lg:text-3xl leading-snug tracking-tight">
              {article.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-2 md:mt-3">
              <span className="s-tag">{difficultyLabel(article.difficulty)}</span>
              <span className="font-mono text-xs text-gray-500">
                {article.word_count} 词
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 阅读模式切换 */}
      <div className="flex items-center gap-2 mb-6 lg:mb-8 pb-4 md:pb-6 border-b-2 border-black dark:border-white">
        <button
          onClick={() => setViewMode("en")}
          className={`flex items-center gap-1.5 px-3 py-2 md:px-4 font-sans font-bold text-xs uppercase tracking-widest border-2 border-black rounded-none transition-all dark:border-white ${
            viewMode === "en"
              ? "bg-black text-white shadow-[4px_4px_0px_0px_rgba(255,0,110,1)] dark:bg-white dark:text-black"
              : "bg-white text-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 dark:bg-zinc-950 dark:text-white dark:hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
          }`}
        >
          <BookOpen size={12} />
          英文
        </button>
        <button
          onClick={handleBilingualSwitch}
          disabled={translating}
          className={`flex items-center gap-1.5 px-3 py-2 md:px-4 font-sans font-bold text-xs uppercase tracking-widest border-2 border-black rounded-none transition-all dark:border-white ${
            viewMode === "bilingual"
              ? "bg-black text-white shadow-[4px_4px_0px_0px_rgba(255,0,110,1)] dark:bg-white dark:text-black"
              : "bg-white text-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 dark:bg-zinc-950 dark:text-white dark:hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
          }`}
        >
          {translating ? <Loader2 size={12} className="animate-spin" /> : <Globe size={12} />}
          {translating ? "翻译中..." : "双语"}
        </button>
      </div>

      {/* 摘要 */}
      {article.summary && (
        <div className="s-card mb-6 lg:mb-8 bg-gray-50 dark:bg-zinc-800">
          <p className="s-label">摘要</p>
          <p className="font-mono text-sm md:text-base text-black leading-relaxed">
            {article.summary}
          </p>
        </div>
      )}

      {/* 文章内容 */}
      <div
        ref={contentRef}
        onMouseUp={triggerSelectionPopup}
        onTouchEnd={handleTouchEnd}
        className="reader-content"
      >
        {sentences && sentences.length > 0 ? (
          <div className="space-y-4">
            {sentences.map((sentence, i) => (
              <div key={i} className="group">
                <p className="font-mono text-sm md:text-base leading-relaxed text-black dark:text-zinc-50">
                  {sentence.text_en}
                </p>
                {viewMode === "bilingual" && sentence.text_zh && (
                  <p className="font-mono text-sm text-gray-500 mt-1 leading-relaxed dark:text-zinc-400">
                    {sentence.text_zh}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="max-w-none">
            <p className="font-mono text-sm md:text-base leading-relaxed text-black whitespace-pre-wrap dark:text-zinc-50">
              {article.content}
            </p>
          </div>
        )}
      </div>

      {/* 选词弹窗 */}
      {popup && (
        <SelectionPopup
          text={popup.text}
          context={popup.context}
          x={popup.x}
          y={popup.y}
          articleId={articleId}
          onClose={() => setPopup(null)}
        />
      )}
    </div>
  );
}

export default function ReaderPage() {
  return (
    <Suspense fallback={<p className="font-mono text-sm text-gray-500">加载中...</p>}>
      <ReaderContent />
    </Suspense>
  );
}
