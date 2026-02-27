"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useFetch } from "@/hooks/useFetch";
import SelectionPopup from "@/components/reader/SelectionPopup";
import { ArrowLeft, BookOpen, Globe } from "lucide-react";
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
  const [popup, setPopup] = useState<{
    text: string;
    context: string;
    x: number;
    y: number;
  } | null>(null);

  const contentRef = useRef<HTMLDivElement>(null);

  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const text = selection.toString().trim();
    if (!text || text.length > 500) return;

    const anchorNode = selection.anchorNode;
    const context = anchorNode?.parentElement?.textContent || "";

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    setPopup({
      text,
      context,
      x: rect.left + rect.width / 2,
      y: rect.bottom + window.scrollY + 8,
    });
  }, []);

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

  if (!articleId) {
    return (
      <div className="swiss-card text-center py-16">
        <p className="text-swiss-gray">No article selected.</p>
        <Link href="/discover/" className="swiss-btn mt-4 inline-block">
          Browse Articles
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-swiss-gray">Loading article...</p>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="swiss-card text-center py-16">
        <p className="text-swiss-gray">Article not found.</p>
        <Link href="/discover/" className="swiss-btn mt-4 inline-block">
          Back to Discover
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/discover/"
          className="swiss-btn-ghost inline-flex items-center gap-1 mb-4 -ml-4"
        >
          <ArrowLeft size={14} />
          Back
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="swiss-label">Reader</p>
            <h1 className="text-2xl leading-snug">{article.title}</h1>
            <div className="flex items-center gap-4 mt-3">
              <span className="swiss-tag">{article.difficulty}</span>
              <span className="text-xs text-swiss-gray">
                {article.word_count} words
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center gap-2 mb-8 pb-6 border-b border-swiss-light">
        <button
          onClick={() => setViewMode("en")}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs uppercase tracking-wider border transition-colors ${
            viewMode === "en"
              ? "bg-swiss-black text-swiss-white border-swiss-black"
              : "border-swiss-light text-swiss-gray hover:border-swiss-black"
          }`}
        >
          <BookOpen size={12} />
          English
        </button>
        <button
          onClick={() => setViewMode("bilingual")}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs uppercase tracking-wider border transition-colors ${
            viewMode === "bilingual"
              ? "bg-swiss-black text-swiss-white border-swiss-black"
              : "border-swiss-light text-swiss-gray hover:border-swiss-black"
          }`}
        >
          <Globe size={12} />
          Bilingual
        </button>
      </div>

      {/* Summary */}
      {article.summary && (
        <div className="swiss-card mb-8 bg-swiss-bg">
          <p className="swiss-label">Summary</p>
          <p className="text-sm text-swiss-dark leading-relaxed">
            {article.summary}
          </p>
        </div>
      )}

      {/* Article Content */}
      <div
        ref={contentRef}
        onMouseUp={handleMouseUp}
        className="reader-content"
      >
        {article.sentences && article.sentences.length > 0 ? (
          <div className="space-y-4">
            {article.sentences.map((sentence: any, i: number) => (
              <div key={i} className="group">
                <p className="text-base leading-[1.8] text-swiss-dark selection:bg-swiss-black selection:text-swiss-white">
                  {sentence.text_en}
                </p>
                {viewMode === "bilingual" && sentence.text_zh && (
                  <p className="text-sm text-swiss-gray mt-1 leading-relaxed">
                    {sentence.text_zh}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="prose max-w-none">
            <p className="text-base leading-[1.8] text-swiss-dark whitespace-pre-wrap selection:bg-swiss-black selection:text-swiss-white">
              {article.content}
            </p>
          </div>
        )}
      </div>

      {/* Selection Popup */}
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
    <Suspense fallback={<p className="text-swiss-gray">Loading...</p>}>
      <ReaderContent />
    </Suspense>
  );
}
