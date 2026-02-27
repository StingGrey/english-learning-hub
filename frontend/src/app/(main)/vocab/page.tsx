"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useFetch } from "@/hooks/useFetch";
import { Trash2, RotateCcw, Check, ChevronRight } from "lucide-react";

export default function VocabPage() {
  const [tab, setTab] = useState<"all" | "review">("all");
  const { data: vocabList, refetch: refetchList } = useFetch(
    () => api.vocab.list({ limit: 100 }),
    []
  );
  const { data: reviewList, refetch: refetchReview } = useFetch(
    () => api.vocab.reviewToday(),
    []
  );

  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);

  const handleReview = async (vocabId: number, quality: number) => {
    await api.vocab.submitReview(vocabId, quality);
    setReviewingId(null);
    setShowAnswer(false);
    refetchReview();
    refetchList();
  };

  const handleDelete = async (vocabId: number) => {
    await api.vocab.delete(vocabId);
    refetchList();
    refetchReview();
  };

  const currentReview = reviewList?.find((v: any) => v.id === reviewingId);

  return (
    <div>
      {/* 页面标题 */}
      <div className="mb-8 lg:mb-12">
        <p className="s-label">词汇本</p>
        <h1 className="text-xl md:text-2xl font-black">单词库</h1>
      </div>

      {/* 标签切换 */}
      <div className="flex mb-6 lg:mb-8 border-2 border-black rounded-none">
        <button
          onClick={() => setTab("all")}
          className={`flex-1 py-2 md:py-3 font-sans font-bold text-xs uppercase tracking-widest text-center transition-all rounded-none ${
            tab === "all"
              ? "bg-black text-white"
              : "bg-white text-gray-500 hover:text-black"
          }`}
        >
          全部单词 ({vocabList?.length ?? 0})
        </button>
        <button
          onClick={() => setTab("review")}
          className={`flex-1 py-2 md:py-3 font-sans font-bold text-xs uppercase tracking-widest text-center transition-all rounded-none border-l-2 border-black ${
            tab === "review"
              ? "bg-black text-white"
              : "bg-white text-gray-500 hover:text-black"
          }`}
        >
          今日复习 ({reviewList?.length ?? 0})
        </button>
      </div>

      {/* 全部单词 */}
      {tab === "all" && (
        <div className="space-y-3">
          {vocabList?.length === 0 ? (
            <div className="s-card text-center py-12">
              <p className="font-mono text-sm text-gray-500">
                还没有单词哦～ 阅读文章时标记生词就会出现在这里
              </p>
            </div>
          ) : (
            vocabList?.map((vocab: any) => (
              <div
                key={vocab.id}
                className="border-2 border-black rounded-none bg-white p-3 md:p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(255,0,110,1)] hover:-translate-y-0.5 transition-all"
              >
                <div className="flex flex-wrap items-center gap-3 md:gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="font-sans font-bold text-base">{vocab.word}</span>
                      {vocab.pos && (
                        <span className="font-sans font-bold text-xs uppercase tracking-widest text-gray-500">
                          {vocab.pos}
                        </span>
                      )}
                      {vocab.is_mastered && (
                        <span className="s-tag-accent">已掌握</span>
                      )}
                    </div>
                    <p className="font-mono text-xs md:text-sm text-gray-500 mt-1">
                      {vocab.definition}
                    </p>
                    {vocab.example_sentence && (
                      <p className="font-mono text-xs md:text-sm text-gray-500 mt-1 truncate">
                        {vocab.example_sentence}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="s-tag hidden md:inline-block">
                      复习 {vocab.repetitions} 次
                    </span>
                    <button
                      onClick={() => handleDelete(vocab.id)}
                      className="p-1.5 border-2 border-black rounded-none text-gray-500 hover:text-accent hover:border-accent transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 复习模式 */}
      {tab === "review" && (
        <div>
          {reviewList?.length === 0 ? (
            <div className="s-card text-center py-16">
              <Check size={32} className="mx-auto text-gray-500 mb-4" />
              <p className="font-mono text-sm text-gray-500">
                太棒了！今天没有需要复习的单词啦～
              </p>
            </div>
          ) : !reviewingId ? (
            <div className="space-y-3">
              {reviewList?.map((vocab: any) => (
                <button
                  key={vocab.id}
                  onClick={() => setReviewingId(vocab.id)}
                  className="flex items-center justify-between w-full border-2 border-black rounded-none bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(255,0,110,1)] hover:-translate-y-0.5 transition-all text-left"
                >
                  <div>
                    <span className="font-sans font-bold text-base">{vocab.word}</span>
                    <span className="font-mono text-xs text-gray-500 ml-3">
                      (已复习 {vocab.repetitions} 次)
                    </span>
                  </div>
                  <ChevronRight size={16} className="text-black" />
                </button>
              ))}
            </div>
          ) : (
            /* 复习卡片 */
            <div className="s-card max-w-lg mx-auto text-center py-8 md:py-12 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <p className="text-2xl md:text-3xl font-black mb-6 md:mb-8">{currentReview?.word}</p>

              {!showAnswer ? (
                <button
                  onClick={() => setShowAnswer(true)}
                  className="s-btn"
                >
                  显示答案
                </button>
              ) : (
                <>
                  <div className="mb-6 md:mb-8 text-left px-4 md:px-8">
                    {currentReview?.pos && (
                      <p className="s-label mb-1">
                        {currentReview.pos}
                      </p>
                    )}
                    <p className="font-mono text-xs md:text-sm mb-2">{currentReview?.definition}</p>
                    {currentReview?.definition_en && (
                      <p className="font-mono text-xs md:text-sm text-gray-500 mb-2">
                        {currentReview.definition_en}
                      </p>
                    )}
                    {currentReview?.example_sentence && (
                      <p className="font-mono text-xs md:text-sm text-gray-500 mt-3 pt-3 border-t-2 border-black">
                        {currentReview.example_sentence}
                      </p>
                    )}
                  </div>

                  <p className="s-label mb-3 text-center">
                    记忆程度如何？
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {[
                      { q: 0, label: "忘了", style: "border-2 border-red-500 text-red-500 bg-white hover:bg-red-500 hover:text-white" },
                      { q: 2, label: "困难", style: "border-2 border-orange-500 text-orange-500 bg-white hover:bg-orange-500 hover:text-white" },
                      { q: 3, label: "一般", style: "border-2 border-black text-black bg-white hover:bg-black hover:text-white" },
                      { q: 5, label: "简单", style: "border-2 border-green-500 text-green-500 bg-white hover:bg-green-500 hover:text-white" },
                    ].map((opt) => (
                      <button
                        key={opt.q}
                        onClick={() => handleReview(reviewingId!, opt.q)}
                        className={`px-3 md:px-5 py-2 font-sans font-bold text-xs uppercase tracking-wider rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all ${opt.style}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}

              <button
                onClick={() => {
                  setReviewingId(null);
                  setShowAnswer(false);
                }}
                className="s-btn-ghost mt-6 mx-auto flex items-center gap-1"
              >
                <RotateCcw size={12} />
                返回列表
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
