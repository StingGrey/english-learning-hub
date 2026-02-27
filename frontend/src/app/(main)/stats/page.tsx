"use client";

import { api } from "@/lib/api";
import { useFetch } from "@/hooks/useFetch";

export default function StatsPage() {
  const { data: stats, loading } = useFetch(() => api.stats.weekly(), []);

  if (loading) {
    return (
      <div>
        <p className="swiss-label">Statistics</p>
        <h1 className="mb-12">Learning Stats</h1>
        <p className="text-swiss-gray">Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-12">
        <p className="swiss-label">Statistics</p>
        <h1>Learning Stats</h1>
        <p className="text-swiss-gray mt-2">Past 7 days overview.</p>
      </div>

      {/* Overview Grid */}
      <div className="grid grid-cols-3 gap-px bg-swiss-light mb-12">
        <div className="bg-swiss-white p-8">
          <p className="text-[10px] uppercase tracking-[0.15em] text-swiss-gray mb-2">
            Tasks Completed
          </p>
          <p className="text-3xl font-bold">
            {stats?.completed_tasks ?? 0}
            <span className="text-sm font-normal text-swiss-gray">
              /{stats?.total_tasks ?? 0}
            </span>
          </p>
        </div>
        <div className="bg-swiss-white p-8">
          <p className="text-[10px] uppercase tracking-[0.15em] text-swiss-gray mb-2">
            Study Time
          </p>
          <p className="text-3xl font-bold">
            {stats?.total_study_minutes ?? 0}
            <span className="text-sm font-normal text-swiss-gray"> min</span>
          </p>
        </div>
        <div className="bg-swiss-white p-8">
          <p className="text-[10px] uppercase tracking-[0.15em] text-swiss-gray mb-2">
            New Words
          </p>
          <p className="text-3xl font-bold">{stats?.new_vocab_count ?? 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px bg-swiss-light mb-12">
        <div className="bg-swiss-white p-8">
          <p className="text-[10px] uppercase tracking-[0.15em] text-swiss-gray mb-2">
            Reviews Done
          </p>
          <p className="text-3xl font-bold">{stats?.review_count ?? 0}</p>
        </div>
        <div className="bg-swiss-white p-8">
          <p className="text-[10px] uppercase tracking-[0.15em] text-swiss-gray mb-2">
            Review Completion
          </p>
          <p className="text-3xl font-bold">
            {Math.round((stats?.review_completion_rate ?? 0) * 100)}
            <span className="text-sm font-normal text-swiss-gray">%</span>
          </p>
        </div>
      </div>

      {/* Daily Breakdown */}
      <div>
        <p className="swiss-label mb-4">Daily Breakdown</p>
        <div className="space-y-px bg-swiss-light">
          <div className="grid grid-cols-3 bg-swiss-bg px-5 py-3">
            <span className="text-[10px] uppercase tracking-wider text-swiss-gray">
              Date
            </span>
            <span className="text-[10px] uppercase tracking-wider text-swiss-gray text-center">
              Tasks Done
            </span>
            <span className="text-[10px] uppercase tracking-wider text-swiss-gray text-right">
              New Words
            </span>
          </div>
          {stats?.daily_breakdown?.map((day: any) => (
            <div
              key={day.date}
              className="grid grid-cols-3 bg-swiss-white px-5 py-3"
            >
              <span className="text-sm">{day.date}</span>
              <span className="text-sm text-center">
                {day.completed_tasks}
              </span>
              <span className="text-sm text-right">{day.new_vocab}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
