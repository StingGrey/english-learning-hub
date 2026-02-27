"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useFetch } from "@/hooks/useFetch";
import Link from "next/link";
import { BookOpen, Languages, MessageCircle, PenLine, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";

export default function DashboardPage() {
  const { data: stats } = useFetch(() => api.stats.today(), []);
  const { data: plan } = useFetch(() => api.plan.getToday(), []);
  const { data: recommended } = useFetch(() => api.content.recommend(3), []);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const difficultyLabel = (d: string) => {
    if (d === "easy") return "简单";
    if (d === "medium") return "中等";
    if (d === "hard") return "困难";
    return d;
  };

  return (
    <div>
      {/* 页头 */}
      <div className="mb-8 lg:mb-12">
        <p className="s-label">学习概览</p>
        <h1 className="text-xl md:text-2xl lg:text-3xl">早上好。</h1>
        <p className="font-mono text-sm md:text-base text-gray-500 mt-2">
          这是你今天的英语学习总览。
        </p>
      </div>

      {/* 数据统计 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8 lg:mb-12">
        <StatCard
          label="已完成任务"
          value={`${stats?.tasks_done ?? 0}/${stats?.tasks_total ?? 0}`}
        />
        <StatCard label="新学单词" value={stats?.new_vocab ?? 0} />
        <StatCard label="待复习" value={stats?.due_review ?? 0} />
        <StatCard
          label="学习计划"
          value={plan ? "进行中" : "暂无"}
        />
      </div>

      {/* 快捷操作 */}
      <div className="mb-8 lg:mb-12">
        <p className="s-label mb-4">快捷操作</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <QuickAction href="/discover" icon={BookOpen} label="阅读文章" />
          <QuickAction href="/vocab" icon={Languages} label="复习词汇" />
          <QuickAction href="/speaking" icon={MessageCircle} label="口语练习" />
          <QuickAction href="/writing" icon={PenLine} label="写作练习" />
        </div>
      </div>

      {/* 推荐阅读 */}
      {recommended && recommended.length > 0 && (
        <div>
          <p className="s-label mb-4">推荐阅读</p>
          <div className="space-y-3 md:space-y-4">
            {recommended.map((article: any) => {
              const isExpanded = expandedId === article.id;
              return (
                <div key={article.id} className="s-card-hover">
                  {/* 卡片头部：标题 + 标签 + 展开按钮 */}
                  <div
                    className="flex items-start justify-between gap-4 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : article.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-sm md:text-base leading-snug">
                        {article.title}
                      </h3>
                      {!isExpanded && article.summary && (
                        <p className="font-mono text-xs md:text-sm text-gray-500 mt-1 line-clamp-1">
                          {article.summary}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="s-tag">{difficultyLabel(article.difficulty)}</span>
                      <span className="font-mono text-xs text-gray-500">
                        {article.word_count}词
                      </span>
                      <button
                        className="text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                        aria-label={isExpanded ? "收起" : "展开"}
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* 展开内容 */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-zinc-700">
                      {article.summary && (
                        <p className="font-mono text-xs md:text-sm text-gray-600 dark:text-zinc-400 leading-relaxed mb-3">
                          {article.summary}
                        </p>
                      )}
                      <div className="flex items-center gap-3">
                        {article.source_name && (
                          <span className="s-label !mb-0">{article.source_name}</span>
                        )}
                        <Link
                          href={`/reader/?id=${article.id}`}
                          className="flex items-center gap-1 font-sans font-bold text-xs uppercase tracking-widest text-black dark:text-white hover:opacity-70 transition-opacity ml-auto"
                          onClick={(e) => e.stopPropagation()}
                        >
                          开始阅读 <ArrowRight size={12} />
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="s-card-hover">
      <p className="font-sans font-bold text-xs uppercase tracking-widest text-gray-500 mb-2">
        {label}
      </p>
      <p className="text-xl md:text-2xl lg:text-3xl font-black">{value}</p>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: any;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="s-card-hover flex flex-col items-center justify-center py-6 md:py-8 group"
    >
      <Icon
        size={24}
        strokeWidth={1.5}
        className="text-gray-500 group-hover:text-black transition-colors mb-3"
      />
      <span className="font-sans font-bold text-xs uppercase tracking-widest text-gray-500 group-hover:text-black transition-colors">
        {label}
      </span>
    </Link>
  );
}
