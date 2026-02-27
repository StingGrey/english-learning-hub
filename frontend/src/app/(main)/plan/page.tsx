"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useFetch } from "@/hooks/useFetch";
import { Check, RotateCw } from "lucide-react";

export default function PlanPage() {
  const { data: plan, loading, refetch } = useFetch(() => api.plan.getToday(), []);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await api.plan.generate();
      refetch();
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const handleComplete = async (taskId: number) => {
    await api.plan.completeTask(taskId);
    refetch();
  };

  return (
    <div>
      <div className="flex items-end justify-between mb-12">
        <div>
          <p className="s-label">今日计划</p>
          <h1>学习计划</h1>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="s-btn flex items-center gap-2"
        >
          <RotateCw size={14} className={generating ? "animate-spin" : ""} />
          {generating ? "生成中..." : "生成计划"}
        </button>
      </div>

      {loading ? (
        <p className="font-mono text-sm text-gray-500">加载中...</p>
      ) : !plan ? (
        <div className="s-card text-center py-16">
          <p className="font-mono text-sm text-gray-500 mb-4">今天还没有学习计划哦。</p>
          <button onClick={handleGenerate} className="s-btn">
            生成计划
          </button>
        </div>
      ) : (
        <div>
          {/* 计划信息 */}
          <div className="flex items-center gap-6 mb-8">
            <span className="font-mono text-sm text-gray-500">
              目标：{" "}
              <span className="font-black text-black uppercase">
                {plan.goal}
              </span>
            </span>
            <span className="font-mono text-sm text-gray-500">
              时长：{" "}
              <span className="font-black text-black">
                {plan.total_minutes} 分钟
              </span>
            </span>
          </div>

          {/* 任务列表 */}
          <div className="space-y-4">
            {plan.tasks?.map((task: any) => (
              <div
                key={task.id}
                className={`flex items-center gap-4 border-2 border-black bg-white p-4 md:p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all ${
                  task.is_completed ? "opacity-50" : ""
                }`}
              >
                <button
                  onClick={() => !task.is_completed && handleComplete(task.id)}
                  className={`w-6 h-6 border-2 border-black flex items-center justify-center shrink-0 transition-all ${
                    task.is_completed
                      ? "bg-black text-white"
                      : "bg-white hover:bg-gray-100"
                  }`}
                >
                  {task.is_completed && <Check size={14} />}
                </button>
                <div className="flex-1 min-w-0">
                  <p
                    className={`font-mono text-sm md:text-base ${
                      task.is_completed ? "line-through text-gray-500" : "text-black"
                    }`}
                  >
                    {task.title}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="s-tag">{task.task_type}</span>
                  <span className="font-mono text-xs text-gray-500">
                    {task.duration_minutes}分钟
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
