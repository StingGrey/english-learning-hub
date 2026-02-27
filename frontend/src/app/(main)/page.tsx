"use client";

import { api } from "@/lib/api";
import { useFetch } from "@/hooks/useFetch";
import Link from "next/link";
import { BookOpen, Languages, MessageCircle, PenLine } from "lucide-react";

export default function DashboardPage() {
  const { data: stats } = useFetch(() => api.stats.today(), []);
  const { data: plan } = useFetch(() => api.plan.getToday(), []);
  const { data: recommended } = useFetch(() => api.content.recommend(3), []);

  return (
    <div>
      {/* 页头 */}
      <div className="mb-12">
        <p className="s-label">学习概览</p>
        <h1>早上好。</h1>
        <p className="font-mono text-sm md:text-base text-gray-500 mt-2">
          这是你今天的英语学习总览。
        </p>
      </div>

      {/* 数据统计 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
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
      <div className="mb-12">
        <p className="s-label mb-4">快捷操作</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
          <div className="space-y-4">
            {recommended.map((article: any) => (
              <Link
                key={article.id}
                href={`/reader/?id=${article.id}`}
                className="s-card-hover block"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-sm md:text-base leading-snug truncate">
                      {article.title}
                    </h3>
                    {article.summary && (
                      <p className="font-mono text-xs md:text-sm text-gray-500 mt-1 line-clamp-1">
                        {article.summary}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="s-tag">{article.difficulty}</span>
                    <span className="font-mono text-xs text-gray-500">
                      {article.word_count}词
                    </span>
                  </div>
                </div>
              </Link>
            ))}
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
      <p className="text-2xl md:text-3xl font-black">{value}</p>
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
      className="s-card-hover flex flex-col items-center justify-center py-8 group"
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
