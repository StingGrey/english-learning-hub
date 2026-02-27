"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Save, Eye, EyeOff } from "lucide-react";

export default function SettingsPage() {
  const [goal, setGoal] = useState("general");
  const [dailyMinutes, setDailyMinutes] = useState(30);
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("https://api.openai.com/v1");
  const [model, setModel] = useState("gpt-4o-mini");
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.settings.get().then((data: any) => {
      setGoal(data.goal || "general");
      setDailyMinutes(data.daily_minutes || 30);
      setApiKey(data.ai_api_key || "");
      setBaseUrl(data.ai_base_url || "https://api.openai.com/v1");
      setModel(data.ai_model || "gpt-4o-mini");
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    await api.settings.update({
      goal,
      daily_minutes: dailyMinutes,
      ai_api_key: apiKey,
      ai_base_url: baseUrl,
      ai_model: model,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) return <p className="font-mono text-sm text-gray-500">加载中...</p>;

  return (
    <div>
      <div className="mb-12">
        <p className="s-label">设置</p>
        <h1 className="font-black">偏好设置</h1>
      </div>

      <div className="max-w-lg space-y-10">
        {/* AI 配置 */}
        <div>
          <h2 className="font-sans font-bold text-sm uppercase tracking-wider mb-4 pb-2 border-b-2 border-black">
            AI 配置
          </h2>
          <p className="font-mono text-xs text-gray-500 mb-4">
            API Key 仅保存在本地浏览器中，不会发送到除你配置的 AI 服务商以外的任何服务器。
          </p>
          <div className="space-y-4">
            <div>
              <label className="s-label">API 密钥</label>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="s-input pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black transition-colors"
                >
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="s-label">API 基础地址</label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.openai.com/v1"
                className="s-input"
              />
            </div>
            <div>
              <label className="s-label">模型</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="gpt-4o-mini"
                className="s-input"
              />
            </div>
          </div>
        </div>

        {/* 学习目标 */}
        <div>
          <h2 className="font-sans font-bold text-sm uppercase tracking-wider mb-4 pb-2 border-b-2 border-black">
            学习设置
          </h2>
          <label className="s-label">学习目标</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: "general", label: "综合提升" },
              { value: "speaking", label: "口语表达" },
              { value: "exam", label: "备考冲刺" },
              { value: "work", label: "职场商务" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setGoal(opt.value)}
                className={`rounded-none py-3 font-sans font-bold text-xs uppercase tracking-wider border-2 border-black transition-all ${
                  goal === opt.value
                    ? "bg-black text-white"
                    : "bg-white text-gray-500 hover:text-black"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 每日学习时长 */}
        <div>
          <label className="s-label">
            每日学习时长：{dailyMinutes} 分钟
          </label>
          <input
            type="range"
            min={10}
            max={120}
            step={5}
            value={dailyMinutes}
            onChange={(e) => setDailyMinutes(Number(e.target.value))}
            className="w-full accent-[#ff006e]"
          />
          <div className="flex justify-between font-mono text-xs text-gray-500 mt-1">
            <span>10 分钟</span>
            <span>120 分钟</span>
          </div>
        </div>

        {/* 保存按钮 */}
        <button
          onClick={handleSave}
          className="s-btn flex items-center gap-2"
        >
          <Save size={14} />
          {saved ? "已保存!" : "保存设置"}
        </button>
      </div>
    </div>
  );
}
