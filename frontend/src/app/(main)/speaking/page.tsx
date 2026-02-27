"use client";

import { useState, useRef, useEffect } from "react";
import { api } from "@/lib/api";
import { Send } from "lucide-react";

interface Turn {
  role: string;
  content: string;
  correction?: string | null;
  suggestion?: string | null;
}

export default function SpeakingPage() {
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [scenario, setScenario] = useState("daily");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const content = input.trim();
    setInput("");
    setTurns((prev) => [...prev, { role: "user", content }]);
    setLoading(true);

    try {
      const result = await api.speaking.turn({
        session_id: sessionId ?? undefined,
        content,
        scenario,
      });
      setSessionId(result.session_id);
      setTurns((prev) => [
        ...prev,
        {
          role: "assistant",
          content: result.content,
          correction: result.correction,
          suggestion: result.suggestion,
        },
      ]);
    } catch {
      setTurns((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const startNew = () => {
    setSessionId(null);
    setTurns([]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      {/* Header */}
      <div className="mb-8">
        <p className="swiss-label">Speaking</p>
        <h1>Conversation Practice</h1>
      </div>

      {/* Scenario Selector */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-xs text-swiss-gray uppercase tracking-wider">
          Scenario:
        </span>
        {["daily", "interview", "travel", "business"].map((s) => (
          <button
            key={s}
            onClick={() => {
              setScenario(s);
              if (turns.length === 0) return;
              startNew();
            }}
            className={`px-3 py-1.5 text-xs uppercase tracking-wider border transition-colors ${
              scenario === s
                ? "bg-swiss-black text-swiss-white border-swiss-black"
                : "border-swiss-light text-swiss-gray hover:border-swiss-black"
            }`}
          >
            {s}
          </button>
        ))}
        {turns.length > 0 && (
          <button onClick={startNew} className="swiss-btn-ghost text-xs ml-auto">
            New Conversation
          </button>
        )}
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto border border-swiss-light bg-swiss-white p-6 space-y-6">
        {turns.length === 0 && (
          <div className="text-center py-16">
            <p className="text-swiss-gray text-sm">
              Start a conversation in English. I&apos;ll help correct your
              grammar and suggest better expressions.
            </p>
          </div>
        )}

        {turns.map((turn, i) => (
          <div key={i} className={`flex ${turn.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[75%] ${
                turn.role === "user"
                  ? "bg-swiss-black text-swiss-white p-4"
                  : "bg-swiss-bg p-4"
              }`}
            >
              <p className="text-sm leading-relaxed">{turn.content}</p>

              {/* Correction */}
              {turn.correction && (
                <div className="mt-3 pt-3 border-t border-swiss-gray/20">
                  <p className="text-[10px] uppercase tracking-wider text-swiss-accent mb-1">
                    Correction
                  </p>
                  <p className="text-xs leading-relaxed opacity-80">
                    {turn.correction}
                  </p>
                </div>
              )}

              {/* Suggestion */}
              {turn.suggestion && (
                <div className="mt-2">
                  <p className="text-[10px] uppercase tracking-wider text-swiss-gray mb-1">
                    Better Expression
                  </p>
                  <p className="text-xs leading-relaxed opacity-80 italic">
                    {turn.suggestion}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-swiss-bg p-4">
              <p className="text-sm text-swiss-gray">Thinking...</p>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 mt-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Type your message in English..."
          className="swiss-input flex-1"
          disabled={loading}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="swiss-btn px-6"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
