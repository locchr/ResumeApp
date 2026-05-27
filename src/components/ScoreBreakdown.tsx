"use client";

import { ScoreBreakdown as ScoreBreakdownType } from "@/lib/types";

interface Props {
  breakdown: ScoreBreakdownType;
}

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-slate-400">
        <span>{label}</span>
        <span className="text-slate-300 font-medium">{value}/{max}</span>
      </div>
      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function ScoreBreakdown({ breakdown }: Props) {
  return (
    <div className="space-y-3">
      <Bar label="GitHub Activity" value={breakdown.githubActivity} max={40} color="bg-blue-500" />
      <Bar label="AI Tool Signals" value={breakdown.aiToolMentions} max={40} color="bg-purple-500" />
      <Bar label="Projects Built" value={breakdown.projectsBuilt} max={20} color="bg-emerald-500" />
    </div>
  );
}
