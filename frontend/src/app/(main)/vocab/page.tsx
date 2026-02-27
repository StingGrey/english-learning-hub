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
      <div className="mb-12">
        <p className="swiss-label">Vocabulary</p>
        <h1>Word Bank</h1>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-px bg-swiss-light mb-8">
        <button
          onClick={() => setTab("all")}
          className={`flex-1 py-3 text-xs uppercase tracking-wider text-center transition-colors ${
            tab === "all"
              ? "bg-swiss-black text-swiss-white"
              : "bg-swiss-white text-swiss-gray hover:text-swiss-black"
          }`}
        >
          All Words ({vocabList?.length ?? 0})
        </button>
        <button
          onClick={() => setTab("review")}
          className={`flex-1 py-3 text-xs uppercase tracking-wider text-center transition-colors ${
            tab === "review"
              ? "bg-swiss-black text-swiss-white"
              : "bg-swiss-white text-swiss-gray hover:text-swiss-black"
          }`}
        >
          Review Today ({reviewList?.length ?? 0})
        </button>
      </div>

      {/* All Words */}
      {tab === "all" && (
        <div className="space-y-px bg-swiss-light">
          {vocabList?.length === 0 ? (
            <div className="bg-swiss-white p-12 text-center">
              <p className="text-swiss-gray">
                No words yet. Mark words while reading articles.
              </p>
            </div>
          ) : (
            vocabList?.map((vocab: any) => (
              <div
                key={vocab.id}
                className="flex items-center gap-4 bg-swiss-white p-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium">{vocab.word}</span>
                    {vocab.pos && (
                      <span className="text-[10px] text-swiss-gray uppercase">
                        {vocab.pos}
                      </span>
                    )}
                    {vocab.is_mastered && (
                      <span className="swiss-tag text-[10px]">Mastered</span>
                    )}
                  </div>
                  <p className="text-xs text-swiss-gray mt-0.5">
                    {vocab.definition}
                  </p>
                  {vocab.example_sentence && (
                    <p className="text-xs text-swiss-gray mt-1 italic truncate">
                      {vocab.example_sentence}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[10px] text-swiss-gray mr-2">
                    Rep: {vocab.repetitions}
                  </span>
                  <button
                    onClick={() => handleDelete(vocab.id)}
                    className="p-1.5 text-swiss-gray hover:text-swiss-accent transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Review Mode */}
      {tab === "review" && (
        <div>
          {reviewList?.length === 0 ? (
            <div className="swiss-card text-center py-16">
              <Check size={32} className="mx-auto text-swiss-gray mb-4" />
              <p className="text-swiss-gray">
                All caught up! No words to review today.
              </p>
            </div>
          ) : !reviewingId ? (
            <div className="space-y-px bg-swiss-light">
              {reviewList?.map((vocab: any) => (
                <button
                  key={vocab.id}
                  onClick={() => setReviewingId(vocab.id)}
                  className="flex items-center justify-between w-full bg-swiss-white p-4 hover:bg-swiss-bg transition-colors text-left"
                >
                  <div>
                    <span className="text-sm font-medium">{vocab.word}</span>
                    <span className="text-xs text-swiss-gray ml-2">
                      ({vocab.repetitions} reps)
                    </span>
                  </div>
                  <ChevronRight size={16} className="text-swiss-gray" />
                </button>
              ))}
            </div>
          ) : (
            /* Review Card */
            <div className="swiss-card max-w-lg mx-auto text-center py-12">
              <p className="text-2xl font-bold mb-8">{currentReview?.word}</p>

              {!showAnswer ? (
                <button
                  onClick={() => setShowAnswer(true)}
                  className="swiss-btn"
                >
                  Show Answer
                </button>
              ) : (
                <>
                  <div className="mb-8 text-left px-8">
                    {currentReview?.pos && (
                      <p className="text-xs text-swiss-gray uppercase mb-1">
                        {currentReview.pos}
                      </p>
                    )}
                    <p className="text-sm mb-2">{currentReview?.definition}</p>
                    {currentReview?.definition_en && (
                      <p className="text-xs text-swiss-gray mb-2">
                        {currentReview.definition_en}
                      </p>
                    )}
                    {currentReview?.example_sentence && (
                      <p className="text-xs text-swiss-gray italic mt-3 pt-3 border-t border-swiss-light">
                        {currentReview.example_sentence}
                      </p>
                    )}
                  </div>

                  <p className="text-xs text-swiss-gray uppercase tracking-wider mb-3">
                    How well did you remember?
                  </p>
                  <div className="flex justify-center gap-2">
                    {[
                      { q: 0, label: "Forgot", style: "border-red-300 text-red-600 hover:bg-red-50" },
                      { q: 2, label: "Hard", style: "border-orange-300 text-orange-600 hover:bg-orange-50" },
                      { q: 3, label: "OK", style: "border-swiss-light text-swiss-gray hover:bg-swiss-bg" },
                      { q: 5, label: "Easy", style: "border-green-300 text-green-600 hover:bg-green-50" },
                    ].map((opt) => (
                      <button
                        key={opt.q}
                        onClick={() => handleReview(reviewingId!, opt.q)}
                        className={`px-4 py-2 text-xs font-medium uppercase border transition-colors ${opt.style}`}
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
                className="swiss-btn-ghost mt-6 mx-auto flex items-center gap-1"
              >
                <RotateCcw size={12} />
                Back to list
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
