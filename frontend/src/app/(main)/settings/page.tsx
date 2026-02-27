"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import { fetchModels } from "@/lib/ai";
import { webdav, type WebDAVConfig } from "@/lib/webdav";
import {
  Save,
  Eye,
  EyeOff,
  RefreshCw,
  Check,
  Cloud,
  UploadCloud,
  DownloadCloud,
  Download,
  Upload,
  Loader2,
  Wifi,
  WifiOff,
} from "lucide-react";

export default function SettingsPage() {
  const [goal, setGoal] = useState("general");
  const [dailyMinutes, setDailyMinutes] = useState(30);
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("https://api.openai.com/v1");
  const [model, setModel] = useState("gpt-4o-mini");
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // 模型列表相关状态
  const [models, setModels] = useState<{ id: string; owned_by?: string }[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState("");
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [modelFilter, setModelFilter] = useState("");

  // WebDAV 相关状态
  const [davUrl, setDavUrl] = useState("");
  const [davUser, setDavUser] = useState("");
  const [davPass, setDavPass] = useState("");
  const [davPath, setDavPath] = useState("/english-hub/");
  const [showDavPass, setShowDavPass] = useState(false);
  const [davTesting, setDavTesting] = useState(false);
  const [davConnected, setDavConnected] = useState<boolean | null>(null);
  const [davSaving, setDavSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");

  const importFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      const data: any = await api.settings.get();
      setGoal(data.goal || "general");
      setDailyMinutes(data.daily_minutes || 30);
      setApiKey(data.ai_api_key || "");
      setBaseUrl(data.ai_base_url || "https://api.openai.com/v1");
      setModel(data.ai_model || "gpt-4o-mini");

      // 加载 WebDAV 配置
      const davConfig = await webdav.getConfig();
      if (davConfig) {
        setDavUrl(davConfig.url);
        setDavUser(davConfig.username);
        setDavPass(davConfig.password);
        setDavPath(davConfig.syncPath || "/english-hub/");
      }

      setLoading(false);
    }
    load();
  }, []);

  const handleFetchModels = useCallback(async () => {
    if (!apiKey.trim()) {
      setModelsError("请先填写 API 密钥");
      return;
    }
    if (!baseUrl.trim()) {
      setModelsError("请先填写 API 基础地址");
      return;
    }

    setModelsLoading(true);
    setModelsError("");
    try {
      const list = await fetchModels(apiKey.trim(), baseUrl.trim());
      setModels(list);
      if (list.length > 0) {
        setShowModelDropdown(true);
      } else {
        setModelsError("未找到可用模型");
      }
    } catch (err: any) {
      setModelsError(err.message || "获取模型失败");
      setModels([]);
    } finally {
      setModelsLoading(false);
    }
  }, [apiKey, baseUrl]);

  useEffect(() => {
    setModels([]);
    setModelsError("");
    setShowModelDropdown(false);
  }, [apiKey, baseUrl]);

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

  // WebDAV 操作
  const davConfig: WebDAVConfig = {
    url: davUrl,
    username: davUser,
    password: davPass,
    syncPath: davPath,
  };

  const handleDavTest = async () => {
    setDavTesting(true);
    setDavConnected(null);
    try {
      const ok = await webdav.testConnection(davConfig);
      setDavConnected(ok);
    } catch {
      setDavConnected(false);
    } finally {
      setDavTesting(false);
    }
  };

  const handleDavSave = async () => {
    setDavSaving(true);
    try {
      await webdav.saveConfig(davConfig);
      setSyncMsg("WebDAV 配置已保存");
      setTimeout(() => setSyncMsg(""), 2000);
    } catch (err: any) {
      setSyncMsg("保存失败: " + err.message);
    } finally {
      setDavSaving(false);
    }
  };

  const handleBackup = async () => {
    setSyncing(true);
    setSyncMsg("正在备份到 WebDAV...");
    try {
      const result = await webdav.backup();
      setSyncMsg(`备份成功！(${new Date(result.exported_at).toLocaleString("zh-CN")})`);
    } catch (err: any) {
      setSyncMsg("备份失败: " + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleRestore = async () => {
    if (!confirm("恢复数据将覆盖本地所有数据，确定继续吗？")) return;
    setSyncing(true);
    setSyncMsg("正在从 WebDAV 恢复数据...");
    try {
      const result = await webdav.restore();
      setSyncMsg(`恢复成功！共 ${result.record_count} 条记录，页面将刷新...`);
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      setSyncMsg("恢复失败: " + err.message);
      setSyncing(false);
    }
  };

  const handleExportFile = async () => {
    try {
      await webdav.exportToFile();
    } catch (err: any) {
      alert("导出失败: " + err.message);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm("导入数据将覆盖本地所有数据，确定继续吗？")) return;
    try {
      const result = await webdav.importFromFile(file);
      alert(`导入成功！共 ${result.record_count} 条记录，页面将刷新`);
      window.location.reload();
    } catch (err: any) {
      alert("导入失败: " + err.message);
    }
    if (importFileRef.current) importFileRef.current.value = "";
  };

  const filteredModels = modelFilter
    ? models.filter((m) => m.id.toLowerCase().includes(modelFilter.toLowerCase()))
    : models;

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
          <h2 className="font-sans font-bold text-sm uppercase tracking-wider mb-4 pb-2 border-b-2 border-black dark:border-white">
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black transition-colors dark:text-zinc-400 dark:hover:text-white"
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
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => {
                      setModel(e.target.value);
                      if (models.length > 0) {
                        setModelFilter(e.target.value);
                        setShowModelDropdown(true);
                      }
                    }}
                    onFocus={() => {
                      if (models.length > 0) {
                        setShowModelDropdown(true);
                        setModelFilter("");
                      }
                    }}
                    placeholder="gpt-4o-mini"
                    className="s-input"
                  />
                  {showModelDropdown && filteredModels.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 top-full mt-1 border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] max-h-60 overflow-y-auto dark:border-white dark:bg-zinc-900 dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
                      {filteredModels.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setModel(m.id);
                            setShowModelDropdown(false);
                            setModelFilter("");
                          }}
                          className={`w-full text-left px-3 py-2 font-mono text-xs hover:bg-black hover:text-white transition-colors flex items-center justify-between dark:hover:bg-white dark:hover:text-black ${
                            model === m.id ? "bg-gray-100 font-bold dark:bg-zinc-700" : ""
                          }`}
                        >
                          <span className="truncate">{m.id}</span>
                          {model === m.id && <Check size={12} className="flex-shrink-0 ml-2" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleFetchModels}
                  disabled={modelsLoading}
                  className="s-btn-outline flex items-center gap-1.5 whitespace-nowrap"
                  title="从 API 获取可用模型列表"
                >
                  <RefreshCw size={14} className={modelsLoading ? "animate-spin" : ""} />
                  {modelsLoading ? "获取中" : "获取模型"}
                </button>
              </div>
              {modelsError && (
                <p className="font-mono text-xs text-red-600 mt-1">{modelsError}</p>
              )}
              {models.length > 0 && !modelsError && (
                <p className="font-mono text-xs text-gray-500 mt-1">
                  找到 {models.length} 个模型，点击输入框选择
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 学习目标 */}
        <div>
          <h2 className="font-sans font-bold text-sm uppercase tracking-wider mb-4 pb-2 border-b-2 border-black dark:border-white">
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
                className={`rounded-none py-3 font-sans font-bold text-xs uppercase tracking-wider border-2 border-black transition-all dark:border-white ${
                  goal === opt.value
                    ? "bg-black text-white dark:bg-white dark:text-black"
                    : "bg-white text-gray-500 hover:text-black dark:bg-zinc-950 dark:text-zinc-400 dark:hover:text-white"
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

        {/* WebDAV 同步 */}
        <div>
          <h2 className="font-sans font-bold text-sm uppercase tracking-wider mb-4 pb-2 border-b-2 border-black flex items-center gap-2 dark:border-white">
            <Cloud size={16} />
            数据同步与备份
          </h2>
          <p className="font-mono text-xs text-gray-500 mb-4">
            通过 WebDAV 在多台设备间同步数据。支持坚果云、NextCloud、Synology 等。
          </p>

          <div className="space-y-4">
            <div>
              <label className="s-label">WebDAV 服务器地址</label>
              <input
                type="text"
                value={davUrl}
                onChange={(e) => { setDavUrl(e.target.value); setDavConnected(null); }}
                placeholder="https://dav.jianguoyun.com/dav/"
                className="s-input"
              />
            </div>
            <div>
              <label className="s-label">用户名</label>
              <input
                type="text"
                value={davUser}
                onChange={(e) => setDavUser(e.target.value)}
                placeholder="your@email.com"
                className="s-input"
              />
            </div>
            <div>
              <label className="s-label">密码 / 应用密码</label>
              <div className="relative">
                <input
                  type={showDavPass ? "text" : "password"}
                  value={davPass}
                  onChange={(e) => setDavPass(e.target.value)}
                  placeholder="应用专用密码"
                  className="s-input pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowDavPass(!showDavPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black transition-colors dark:text-zinc-400 dark:hover:text-white"
                >
                  {showDavPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="s-label">同步路径</label>
              <input
                type="text"
                value={davPath}
                onChange={(e) => setDavPath(e.target.value)}
                placeholder="/english-hub/"
                className="s-input"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleDavTest}
                disabled={davTesting || !davUrl}
                className="s-btn-outline flex items-center gap-1.5"
              >
                {davTesting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : davConnected === true ? (
                  <Wifi size={14} className="text-green-600" />
                ) : davConnected === false ? (
                  <WifiOff size={14} className="text-red-500" />
                ) : (
                  <Wifi size={14} />
                )}
                {davTesting ? "测试中" : davConnected === true ? "连接成功" : davConnected === false ? "连接失败" : "测试连接"}
              </button>
              <button
                onClick={handleDavSave}
                disabled={davSaving || !davUrl}
                className="s-btn-outline flex items-center gap-1.5"
              >
                <Save size={14} />
                保存配置
              </button>
            </div>

            {/* 同步操作 */}
            <div className="border-2 border-black p-4 space-y-3 dark:border-white">
              <p className="s-label">同步操作</p>
              <div className="flex gap-2">
                <button
                  onClick={handleBackup}
                  disabled={syncing || !davUrl}
                  className="s-btn flex-1 flex items-center justify-center gap-1.5"
                >
                  {syncing ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
                  备份到云端
                </button>
                <button
                  onClick={handleRestore}
                  disabled={syncing || !davUrl}
                  className="s-btn-outline flex-1 flex items-center justify-center gap-1.5"
                >
                  <DownloadCloud size={14} />
                  从云端恢复
                </button>
              </div>
              {syncMsg && (
                <p className="font-mono text-xs text-gray-600">{syncMsg}</p>
              )}
            </div>

            {/* 本地导入导出 */}
            <div className="border-2 border-black p-4 space-y-3 dark:border-white">
              <p className="s-label">本地备份</p>
              <p className="font-mono text-xs text-gray-500">
                不使用 WebDAV？也可以手动导出/导入 JSON 文件来迁移数据。
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleExportFile}
                  className="s-btn-outline flex-1 flex items-center justify-center gap-1.5"
                >
                  <Download size={14} />
                  导出 JSON
                </button>
                <label className="s-btn-outline flex-1 flex items-center justify-center gap-1.5 cursor-pointer">
                  <Upload size={14} />
                  导入 JSON
                  <input
                    ref={importFileRef}
                    type="file"
                    accept=".json"
                    onChange={handleImportFile}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 点击外部关闭下拉 */}
      {showModelDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowModelDropdown(false)}
        />
      )}
    </div>
  );
}
