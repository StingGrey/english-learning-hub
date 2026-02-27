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

  if (loading) return <p className="text-swiss-gray">Loading...</p>;

  return (
    <div>
      <div className="mb-12">
        <p className="swiss-label">Settings</p>
        <h1>Preferences</h1>
      </div>

      <div className="max-w-lg space-y-10">
        {/* AI Config */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider mb-4 pb-2 border-b border-swiss-light">
            AI Configuration
          </h2>
          <p className="text-xs text-swiss-gray mb-4">
            API Key is stored locally in your browser. It is never sent to any
            server other than the AI provider you configure below.
          </p>
          <div className="space-y-4">
            <div>
              <label className="swiss-label">API Key</label>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="swiss-input pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-swiss-gray hover:text-swiss-black"
                >
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="swiss-label">API Base URL</label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.openai.com/v1"
                className="swiss-input"
              />
            </div>
            <div>
              <label className="swiss-label">Model</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="gpt-4o-mini"
                className="swiss-input"
              />
            </div>
          </div>
        </div>

        {/* Goal */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider mb-4 pb-2 border-b border-swiss-light">
            Learning
          </h2>
          <label className="swiss-label">Learning Goal</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: "general", label: "General" },
              { value: "speaking", label: "Speaking" },
              { value: "exam", label: "Exam Prep" },
              { value: "work", label: "Work / Business" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setGoal(opt.value)}
                className={`py-3 text-xs uppercase tracking-wider border transition-colors ${
                  goal === opt.value
                    ? "bg-swiss-black text-swiss-white border-swiss-black"
                    : "bg-swiss-white border-swiss-light text-swiss-gray hover:border-swiss-black"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Daily Minutes */}
        <div>
          <label className="swiss-label">
            Daily Study Time: {dailyMinutes} min
          </label>
          <input
            type="range"
            min={10}
            max={120}
            step={5}
            value={dailyMinutes}
            onChange={(e) => setDailyMinutes(Number(e.target.value))}
            className="w-full accent-swiss-black"
          />
          <div className="flex justify-between text-[10px] text-swiss-gray mt-1">
            <span>10 min</span>
            <span>120 min</span>
          </div>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          className="swiss-btn flex items-center gap-2"
        >
          <Save size={14} />
          {saved ? "Saved!" : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
