"use client";

import { Evidence, ScoreBreakdown as ScoreBreakdownType } from "@/lib/types";
import { ScoreExplanation, ScoreCriterion } from "@/lib/scoring";
import { ExternalLink, CheckCircle2, Circle } from "lucide-react";

interface Props {
  breakdown: ScoreBreakdownType;
  evidence?: Evidence[];
  githubUrl?: string;
  explanation?: ScoreExplanation;
}

function CriteriaList({ criteria }: { criteria: ScoreCriterion[] }) {
  return (
    <div className="mt-2 space-y-1">
      {criteria.map((c, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          {c.achieved
            ? <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
            : <Circle className="w-3 h-3 text-slate-600 flex-shrink-0" />}
          <span className={c.achieved ? "text-slate-400" : "text-slate-600"}>{c.label}</span>
          <span className={`ml-auto flex-shrink-0 font-mono ${c.achieved ? "text-slate-500" : "text-slate-700"}`}>+{c.pts}</span>
        </div>
      ))}
    </div>
  );
}

function EvidenceLinks({ items }: { items: Evidence[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-2 space-y-1">
      {items.map((e, i) => (
        <a key={i} href={e.url} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-300 transition-colors group">
          <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-50 group-hover:opacity-100" />
          <span className="truncate">{e.title || e.text}</span>
        </a>
      ))}
    </div>
  );
}

function Bar({ label, value, max, color, criteria, evidenceItems }: {
  label: string;
  value: number;
  max: number;
  color: string;
  criteria?: ScoreCriterion[];
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
      {criteria && <CriteriaList criteria={criteria} />}
      {evidenceItems && <EvidenceLinks items={evidenceItems} />}
    </div>
  );
}

export function ScoreBreakdown({ breakdown, evidence = [], githubUrl, explanation }: Props) {
  const githubEvidence: Evidence[] = [
    ...(githubUrl ? [{ text: "GitHub profile", url: githubUrl, title: "View GitHub profile", category: "github" as const }] : []),
    ...evidence.filter((e) => e.category === "github" && e.url !== githubUrl),
  ];
  const aiEvidence = evidence.filter((e) => e.category === "ai_tools");
  const projectEvidence = evidence.filter((e) => e.category === "projects");

  return (
    <div className="space-y-5">
      <Bar label="GitHub Activity" value={breakdown.githubActivity} max={40} color="bg-blue-500"
        criteria={explanation?.githubActivity} evidenceItems={githubEvidence} />
      <Bar label="AI Tool Signals" value={breakdown.aiToolMentions} max={40} color="bg-purple-500"
        criteria={explanation?.aiToolMentions} evidenceItems={aiEvidence} />
      <Bar label="Product Impact" value={breakdown.projectsBuilt} max={20} color="bg-emerald-500"
        criteria={explanation?.projectsBuilt} evidenceItems={projectEvidence} />
    </div>
  );
}
