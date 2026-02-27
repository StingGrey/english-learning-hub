"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useFetch } from "@/hooks/useFetch";
import Link from "next/link";
import { RefreshCw } from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  world: "世界",
  general: "综合",
  science: "科学",
  technology: "科技",
  business: "商业",
  topic: "专题",
  "ai-generated": "AI生成",
};

export default function DiscoverPage() {
  const { data: articles, loading, refetch } = useFetch(
    () => api.content.articles({ limit: 50 }),
    []
  );
  const { data: categories } = useFetch(() => api.content.categories(), []);
  const [fetching, setFetching] = useState(false);
  const [fetchMsg, setFetchMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [filter, setFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [topic, setTopic] = useState("");

  const handleFetch = async () => {
    setFetching(true);
    setFetchMsg(null);
    try {
      const result = await api.content.fetch({ topic: topic.trim() || undefined });
      await refetch();
      setFetchMsg({ text: `获取到 ${result.new_articles} 篇新文章${topic.trim() ? `（主题：${topic.trim()}）` : ""}`, ok: true });
      setTimeout(() => setFetchMsg(null), 3000);
    } catch (e: any) {
      setFetchMsg({ text: e?.message || "获取失败，请检查网络", ok: false });
      setTimeout(() => setFetchMsg(null), 4000);
    } finally {
      setFetching(false);
    }
  };

  const filtered = (articles || []).filter((a: any) => {
    if (filter && a.difficulty !== filter) return false;
    if (categoryFilter && a.category !== categoryFilter) return false;
    return true;
  });

  const difficultyLabel = (d: string | null) => {
    if (!d) return "全部";
    if (d === "easy") return "简单";
    if (d === "medium") return "中等";
    if (d === "hard") return "困难";
    return d;
  };

  const difficultyTag = (d: string) => {
    if (d === "easy") return "简单";
    if (d === "medium") return "中等";
    if (d === "hard") return "困难";
    return d;
  };

  return (
    <div>
      {/* 页面标题 */}
      <div className="flex items-end justify-between mb-8 lg:mb-12">
        <div>
          <p className="s-label">发现</p>
          <h1 className="font-black text-xl md:text-2xl lg:text-3xl tracking-tight">文章列表</h1>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button
            onClick={handleFetch}
            disabled={fetching}
            className="s-btn flex items-center gap-2"
          >
            <RefreshCw size={14} className={fetching ? "animate-spin" : ""} />
            {fetching ? "获取中..." : "获取新文章"}
          </button>
          {fetchMsg && (
            <p className={`font-mono text-xs ${fetchMsg.ok ? "text-green-600" : "text-red-500"}`}>
              {fetchMsg.text}
            </p>
          )}
        </div>
      </div>

      {/* 抓取主题 */}
      <div className="mb-4 md:mb-6">
        <label className="s-label">抓取主题（可选）</label>
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="例如：AI, climate change, finance"
          className="w-full md:max-w-md mt-2 px-3 py-2 font-mono text-sm border-2 border-black rounded-none bg-white text-black dark:bg-zinc-950 dark:text-white dark:border-white"
        />
      </div>

      {/* 难度筛选 */}
      <div className="flex flex-wrap gap-2 mb-3">
        {[null, "easy", "medium", "hard"].map((d) => (
          <button
            key={d ?? "all"}
            onClick={() => setFilter(d)}
            className={`px-3 md:px-4 py-2 font-sans font-bold text-xs uppercase tracking-widest border-2 border-black rounded-none transition-all dark:border-white ${
              filter === d
                ? "bg-black text-white shadow-[4px_4px_0px_0px_rgba(255,0,110,1)] dark:bg-white dark:text-black"
                : "bg-white text-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 dark:bg-zinc-950 dark:text-white dark:hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
            }`}
          >
            {difficultyLabel(d)}
          </button>
        ))}
      </div>

      {/* 分类筛选 */}
      {categories && categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6 md:mb-8">
          <button
            onClick={() => setCategoryFilter(null)}
            className={`px-3 py-1.5 font-mono text-xs border border-black rounded-none transition-all dark:border-white ${
              categoryFilter === null
                ? "bg-black text-white dark:bg-white dark:text-black"
                : "bg-white text-gray-500 hover:text-black dark:bg-zinc-950 dark:text-zinc-400 dark:hover:text-white"
            }`}
          >
            所有分类
          </button>
          {categories.map((cat: string) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 font-mono text-xs border border-black rounded-none transition-all dark:border-white ${
                categoryFilter === cat
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "bg-white text-gray-500 hover:text-black dark:bg-zinc-950 dark:text-zinc-400 dark:hover:text-white"
              }`}
            >
              {CATEGORY_LABELS[cat] || cat}
            </button>
          ))}
        </div>
      )}

      {/* 文章列表 */}
      {loading ? (
        <p className="font-mono text-sm text-gray-500">加载文章中...</p>
      ) : !filtered?.length ? (
        <div className="s-card text-center py-16">
          <p className="font-mono text-sm text-gray-500 mb-4">暂无文章</p>
          <button onClick={handleFetch} className="s-btn">
            获取文章
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {filtered.map((article: any) => (
            <Link
              key={article.id}
              href={`/reader/?id=${article.id}`}
              className="s-card-hover block p-4 md:p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-sm md:text-base leading-snug">
                    {article.title}
                  </h3>
                  {article.summary && (
                    <p className="font-mono text-xs md:text-sm text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">
                      {article.summary}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2.5">
                    {article.source_name && (
                      <span className="s-label !mb-0">
                        {article.source_name}
                      </span>
                    )}
                    {article.category && CATEGORY_LABELS[article.category] && (
                      <span className="font-mono text-[10px] text-gray-400 uppercase">
                        {CATEGORY_LABELS[article.category]}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span
                    className={
                      article.difficulty === "hard"
                        ? "s-tag-accent"
                        : "s-tag"
                    }
                  >
                    {difficultyTag(article.difficulty)}
                  </span>
                  <span className="font-mono text-xs text-gray-500">
                    {article.word_count} 词
                  </span>
                  {article.is_read && (
                    <span className="s-tag-filled">已读</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
