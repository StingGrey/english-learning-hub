"use client";

import { api } from "@/lib/api";
import { useFetch } from "@/hooks/useFetch";

export default function StatsPage() {
  const { data: stats, loading } = useFetch(() => api.stats.weekly(), []);

  if (loading) {
    return (
      <div>
        <p className="s-label">学习统计</p>
        <h1 className="font-black mb-12">数据概览</h1>
        <p className="font-mono text-sm text-gray-500">加载中...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-12">
        <p className="s-label">学习统计</p>
        <h1 className="font-black">数据概览</h1>
        <p className="font-mono text-sm text-gray-500 mt-2">过去 7 天的学习数据。</p>
      </div>

      {/* 概览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
        <div className="s-card">
          <p className="s-label">完成任务</p>
          <p className="text-4xl font-black">
            {stats?.completed_tasks ?? 0}
            <span className="font-mono text-sm font-normal text-gray-500">
              /{stats?.total_tasks ?? 0}
            </span>
          </p>
        </div>
        <div className="s-card">
          <p className="s-label">学习时长</p>
          <p className="text-4xl font-black">
            {stats?.total_study_minutes ?? 0}
            <span className="font-mono text-sm font-normal text-gray-500"> 分钟</span>
          </p>
        </div>
        <div className="s-card">
          <p className="s-label">新增词汇</p>
          <p className="text-4xl font-black">{stats?.new_vocab_count ?? 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
        <div className="s-card">
          <p className="s-label">复习次数</p>
          <p className="text-4xl font-black">{stats?.review_count ?? 0}</p>
        </div>
        <div className="s-card">
          <p className="s-label">复习完成率</p>
          <p className="text-4xl font-black">
            {Math.round((stats?.review_completion_rate ?? 0) * 100)}
            <span className="font-mono text-sm font-normal text-gray-500">%</span>
          </p>
        </div>
      </div>

      {/* 每日明细 */}
      <div>
        <p className="s-label mb-4">每日明细</p>
        <div className="border-2 border-black">
          <div className="grid grid-cols-3 bg-black px-5 py-3">
            <span className="font-sans font-bold text-xs uppercase tracking-widest text-white">
              日期
            </span>
            <span className="font-sans font-bold text-xs uppercase tracking-widest text-white text-center">
              完成任务
            </span>
            <span className="font-sans font-bold text-xs uppercase tracking-widest text-white text-right">
              新增词汇
            </span>
          </div>
          {stats?.daily_breakdown?.map((day: any) => (
            <div
              key={day.date}
              className="grid grid-cols-3 px-5 py-3 border-t-2 border-black"
            >
              <span className="font-mono text-sm">{day.date}</span>
              <span className="font-mono text-sm text-center">
                {day.completed_tasks}
              </span>
              <span className="font-mono text-sm text-right">{day.new_vocab}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
