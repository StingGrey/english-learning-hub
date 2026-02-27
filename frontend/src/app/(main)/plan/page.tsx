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
          <p className="swiss-label">Today&apos;s Plan</p>
          <h1>Study Plan</h1>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="swiss-btn flex items-center gap-2"
        >
          <RotateCw size={14} className={generating ? "animate-spin" : ""} />
          {generating ? "Generating..." : "Generate Plan"}
        </button>
      </div>

      {loading ? (
        <p className="text-swiss-gray">Loading...</p>
      ) : !plan ? (
        <div className="swiss-card text-center py-16">
          <p className="text-swiss-gray mb-4">No plan for today yet.</p>
          <button onClick={handleGenerate} className="swiss-btn">
            Generate Plan
          </button>
        </div>
      ) : (
        <div>
          {/* Plan Info */}
          <div className="flex items-center gap-6 mb-8 text-sm text-swiss-gray">
            <span>
              Goal:{" "}
              <span className="text-swiss-black font-medium uppercase">
                {plan.goal}
              </span>
            </span>
            <span>
              Duration:{" "}
              <span className="text-swiss-black font-medium">
                {plan.total_minutes} min
              </span>
            </span>
          </div>

          {/* Tasks */}
          <div className="space-y-px bg-swiss-light">
            {plan.tasks?.map((task: any) => (
              <div
                key={task.id}
                className={`flex items-center gap-4 bg-swiss-white p-5 ${
                  task.is_completed ? "opacity-60" : ""
                }`}
              >
                <button
                  onClick={() => !task.is_completed && handleComplete(task.id)}
                  className={`w-6 h-6 border flex items-center justify-center shrink-0 transition-colors ${
                    task.is_completed
                      ? "bg-swiss-black border-swiss-black text-swiss-white"
                      : "border-swiss-light hover:border-swiss-black"
                  }`}
                >
                  {task.is_completed && <Check size={14} />}
                </button>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm ${
                      task.is_completed ? "line-through text-swiss-gray" : ""
                    }`}
                  >
                    {task.title}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="swiss-tag">{task.task_type}</span>
                  <span className="text-xs text-swiss-gray">
                    {task.duration_minutes}m
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
