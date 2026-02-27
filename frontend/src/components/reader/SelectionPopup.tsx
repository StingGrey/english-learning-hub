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
      setTranslation("Translation failed.");
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
      setAiExplanation("Explanation failed.");
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
      className="fixed z-50 bg-swiss-white border border-swiss-light shadow-lg"
      style={{
        left: Math.min(x - 160, window.innerWidth - 340),
        top: y,
        width: 320,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-swiss-light">
        <p className="text-sm font-medium truncate max-w-[240px]">&ldquo;{text}&rdquo;</p>
        <button onClick={onClose} className="text-swiss-gray hover:text-swiss-black">
          <X size={14} />
        </button>
      </div>

      {/* Actions */}
      {mode === "actions" && (
        <div className="p-2">
          <button
            onClick={handleTranslate}
            className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-left hover:bg-swiss-bg transition-colors"
          >
            <Languages size={16} className="text-swiss-gray" />
            Translate
          </button>
          <button
            onClick={handleSaveVocab}
            className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-left hover:bg-swiss-bg transition-colors"
          >
            <BookmarkPlus size={16} className="text-swiss-gray" />
            Save to Vocabulary
          </button>
          <button
            onClick={handleExplain}
            className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-left hover:bg-swiss-bg transition-colors"
          >
            <Lightbulb size={16} className="text-swiss-gray" />
            AI Explain
          </button>
        </div>
      )}

      {/* Translation Result */}
      {mode === "translate" && (
        <div className="p-4">
          {loading ? (
            <p className="text-sm text-swiss-gray">Translating...</p>
          ) : (
            <>
              <p className="text-sm font-medium mb-2">{translation}</p>
              {explanation && (
                <p className="text-xs text-swiss-gray leading-relaxed">
                  {explanation}
                </p>
              )}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleSaveVocab}
                  className="swiss-btn-outline text-xs py-1.5 flex items-center gap-1"
                >
                  <BookmarkPlus size={12} />
                  Save Word
                </button>
                <button
                  onClick={() => setMode("actions")}
                  className="swiss-btn-ghost text-xs"
                >
                  Back
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* AI Explanation */}
      {mode === "explain" && (
        <div className="p-4 max-h-64 overflow-y-auto">
          {loading ? (
            <p className="text-sm text-swiss-gray">Analyzing...</p>
          ) : (
            <>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {aiExplanation}
              </p>
              <button
                onClick={() => setMode("actions")}
                className="swiss-btn-ghost text-xs mt-3"
              >
                Back
              </button>
            </>
          )}
        </div>
      )}

      {/* Saved Confirmation */}
      {mode === "saved" && (
        <div className="p-4 flex items-center gap-2 text-sm">
          <Check size={16} className="text-green-600" />
          <span>Saved to vocabulary!</span>
        </div>
      )}
    </div>
  );
}
