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
        { role: "assistant", content: "抱歉，出了点小问题，请再试一次～" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const startNew = () => {
    setSessionId(null);
    setTurns([]);
  };

  const scenarioLabels: Record<string, string> = {
    daily: "日常对话",
    interview: "面试模拟",
    travel: "旅行场景",
    business: "商务英语",
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      {/* 页面标题 */}
      <div className="mb-6 lg:mb-8">
        <p className="s-label">口语练习</p>
        <h1 className="text-xl md:text-2xl font-black">对话训练</h1>
      </div>

      {/* 场景选择 */}
      <div className="flex items-center gap-2 mb-4 md:mb-6 flex-wrap">
        <span className="s-label mb-0 mr-1">
          场景：
        </span>
        {["daily", "interview", "travel", "business"].map((s) => (
          <button
            key={s}
            onClick={() => {
              setScenario(s);
              if (turns.length === 0) return;
              startNew();
            }}
            className={`px-3 md:px-4 py-2 font-sans font-bold text-xs uppercase tracking-wider border-2 border-black rounded-none transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] ${
              scenario === s
                ? "bg-black text-white"
                : "bg-white text-black hover:bg-black hover:text-white"
            }`}
          >
            {scenarioLabels[s]}
          </button>
        ))}
        {turns.length > 0 && (
          <button onClick={startNew} className="s-btn-ghost text-xs ml-auto">
            新对话
          </button>
        )}
      </div>

      {/* 聊天区域 */}
      <div className="flex-1 overflow-y-auto border-2 border-black rounded-none bg-white p-3 md:p-6 space-y-4 md:space-y-6">
        {turns.length === 0 && (
          <div className="text-center py-8 md:py-16">
            <p className="font-mono text-xs md:text-sm text-gray-500">
              用英语开始对话吧～ 我会帮你纠正语法并建议更地道的表达方式
            </p>
          </div>
        )}

        {turns.map((turn, i) => (
          <div key={i} className={`flex ${turn.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] md:max-w-[75%] rounded-none ${
                turn.role === "user"
                  ? "bg-black text-white p-3 md:p-4 shadow-[4px_4px_0px_0px_rgba(255,0,110,1)]"
                  : "bg-gray-100 border-2 border-black p-3 md:p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              }`}
            >
              <p className="font-mono text-xs md:text-sm leading-relaxed">{turn.content}</p>

              {/* 纠正 */}
              {turn.correction && (
                <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t-2 border-black/20">
                  <p className="font-sans font-bold text-xs uppercase tracking-widest text-accent mb-1">
                    纠正
                  </p>
                  <p className="font-mono text-xs md:text-sm leading-relaxed text-accent">
                    {turn.correction}
                  </p>
                </div>
              )}

              {/* 建议 */}
              {turn.suggestion && (
                <div className="mt-2">
                  <p className="font-sans font-bold text-xs uppercase tracking-widest text-gray-500 mb-1">
                    更好的表达
                  </p>
                  <p className="font-mono text-xs md:text-sm leading-relaxed text-gray-500">
                    {turn.suggestion}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 border-2 border-black rounded-none p-3 md:p-4">
              <p className="font-mono text-xs md:text-sm text-gray-500">思考中...</p>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* 输入区域 */}
      <div className="flex gap-2 md:gap-3 mt-3 md:mt-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="用英语输入你想说的话..."
          className="s-input flex-1"
          disabled={loading}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="s-btn px-4 md:px-6 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
