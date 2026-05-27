"use client";

import { Evidence, ScoreBreakdown as ScoreBreakdownType } from "@/lib/types";
import { ExternalLink } from "lucide-react";

interface Props {
  breakdown: ScoreBreakdownType;
  evidence?: Evidence[];
  githubUrl?: string;
}

function EvidenceLinks({ items }: { items: Evidence[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-2 space-y-1">
      {items.map((e, i) => (
        <a
          key={i}
          href={e.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-300 transition-colors group"
        >
          <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-50 group-hover:opacity-100" />
          <span className="truncate">{e.title || e.text}</span>
        </a>
      ))}
    </div>
  );
}

function Bar({
  label, value, max, color, evidenceItems,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  evidenceItems?: Evidence[];
}) {
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
      {evidenceItems && <EvidenceLinks items={evidenceItems} />}
    </div>
  );
}

export function ScoreBreakdown({ breakdown, evidence = [], githubUrl }: Props) {
  const githubEvidence: Evidence[] = [
    ...(githubUrl ? [{ text: "GitHub profile", url: githubUrl, title: "View GitHub profile", category: "github" as const }] : []),
    ...evidence.filter((e) => e.category === "github" && e.url !== githubUrl),
  ];
  const aiEvidence = evidence.filter((e) => e.category === "ai_tools");
  const projectEvidence = evidence.filter((e) => e.category === "projects");

  return (
    <div className="space-y-4">
      <Bar label="GitHub Activity" value={breakdown.githubActivity} max={40} color="bg-blue-500" evidenceItems={githubEvidence} />
      <Bar label="AI Tool Signals" value={breakdown.aiToolMentions} max={40} color="bg-purple-500" evidenceItems={aiEvidence} />
      <Bar label="Projects Built" value={breakdown.projectsBuilt} max={20} color="bg-emerald-500" evidenceItems={projectEvidence} />
    </div>
  );
}
