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
      {/* Header */}
      <div className="mb-12">
        <p className="swiss-label">Dashboard</p>
        <h1>Good morning.</h1>
        <p className="text-swiss-gray mt-2">
          Your daily English learning overview.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-px bg-swiss-light mb-12">
        <StatCard
          label="Tasks Done"
          value={`${stats?.tasks_done ?? 0}/${stats?.tasks_total ?? 0}`}
        />
        <StatCard label="New Words" value={stats?.new_vocab ?? 0} />
        <StatCard label="Due Review" value={stats?.due_review ?? 0} />
        <StatCard
          label="Plan"
          value={plan ? "Active" : "None"}
        />
      </div>

      {/* Quick Actions */}
      <div className="mb-12">
        <p className="swiss-label mb-4">Quick Actions</p>
        <div className="grid grid-cols-4 gap-4">
          <QuickAction href="/discover" icon={BookOpen} label="Read Article" />
          <QuickAction href="/vocab" icon={Languages} label="Review Vocab" />
          <QuickAction href="/speaking" icon={MessageCircle} label="Practice Speaking" />
          <QuickAction href="/writing" icon={PenLine} label="Write Essay" />
        </div>
      </div>

      {/* Recommended Articles */}
      {recommended && recommended.length > 0 && (
        <div>
          <p className="swiss-label mb-4">Recommended Reading</p>
          <div className="space-y-px bg-swiss-light">
            {recommended.map((article: any) => (
              <Link
                key={article.id}
                href={`/reader/?id=${article.id}`}
                className="block bg-swiss-white p-5 hover:bg-swiss-bg transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium leading-snug truncate">
                      {article.title}
                    </h3>
                    {article.summary && (
                      <p className="text-xs text-swiss-gray mt-1 line-clamp-1">
                        {article.summary}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="swiss-tag">{article.difficulty}</span>
                    <span className="text-xs text-swiss-gray">
                      {article.word_count}w
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
    <div className="bg-swiss-white p-6">
      <p className="text-[10px] uppercase tracking-[0.15em] text-swiss-gray mb-2">
        {label}
      </p>
      <p className="text-2xl font-bold">{value}</p>
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
      className="swiss-card flex flex-col items-center justify-center py-8 hover:bg-swiss-bg transition-colors group"
    >
      <Icon
        size={24}
        strokeWidth={1.5}
        className="text-swiss-gray group-hover:text-swiss-black transition-colors mb-3"
      />
      <span className="text-xs uppercase tracking-wider text-swiss-gray group-hover:text-swiss-black">
        {label}
      </span>
    </Link>
  );
}
