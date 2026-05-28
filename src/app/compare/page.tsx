"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Candidate } from "@/lib/types";
import { vibeScoreBg } from "@/lib/utils";
import { GitHubIcon, LinkedInIcon } from "@/components/icons";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const SCORE_CATEGORIES = [
  { key: "githubActivity" as const, label: "GitHub Activity", max: 40, color: "bg-blue-500" },
  { key: "aiToolMentions" as const, label: "AI Tool Signals", max: 40, color: "bg-purple-500" },
  { key: "projectsBuilt" as const, label: "Product Impact", max: 20, color: "bg-emerald-500" },
];

function CompareInner() {
  const searchParams = useSearchParams();
  const ids = searchParams.get("ids")?.split(",").filter(Boolean) ?? [];
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ids.length === 0) { setLoading(false); return; }
    fetch("/api/candidates")
      .then((r) => r.json())
      .then((all: Candidate[]) => {
        setCandidates(all.filter((c) => ids.includes(c.id)));
        setLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return <div className="text-center py-16 text-slate-400 text-sm">Loading comparison…</div>;
  }

  if (candidates.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-400">No candidates found. <Link href="/candidates" className="text-indigo-400 hover:underline">Go back</Link>.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/candidates" className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to candidates
      </Link>

      <h1 className="text-2xl font-bold text-slate-100">Compare Candidates</h1>
      <p className="text-slate-400 text-sm">{candidates.length} candidates selected</p>

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4" style={{ minWidth: `${candidates.length * 296}px` }}>
          {candidates.map((c) => {
            const initials = c.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
            return (
              <div key={c.id} className="w-72 flex-shrink-0 bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
                {/* Header */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center flex-shrink-0 text-sm font-semibold text-indigo-300 overflow-hidden">
                    {c.githubStats?.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.githubStats.avatarUrl} alt={initials} className="w-10 h-10 object-cover" />
                    ) : initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/candidates/${c.id}`} className="font-semibold text-slate-100 hover:text-indigo-300 transition-colors truncate block text-sm">
                      {c.name}
                    </Link>
                    <p className="text-xs text-slate-500 truncate">{c.title}</p>
                    <p className="text-xs text-slate-600 truncate">{c.firm}</p>
                  </div>
                  <div className={`flex-shrink-0 px-2 py-1 rounded-full border text-xs font-bold ${vibeScoreBg(c.vibeScore)}`}>
                    {c.vibeScore}
                  </div>
                </div>

                {/* Score bars */}
                <div className="space-y-3">
                  {SCORE_CATEGORIES.map(({ key, label, max, color }) => {
                    const value = c.scoreBreakdown[key];
                    const pct = Math.round((value / max) * 100);
                    return (
                      <div key={key} className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-400">
                          <span>{label}</span>
                          <span className="text-slate-300 font-medium">{value}/{max}</span>
                        </div>
                        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* GitHub stats */}
                {c.githubStats && (
                  <div className="text-xs text-slate-500 space-y-0.5 border-t border-slate-700 pt-3">
                    <p>{c.githubStats.publicRepos} repos · {c.githubStats.followers} followers</p>
                    <p>{c.githubStats.recentCommits} commits (6mo) · {c.githubStats.aiTopicRepos} AI repos</p>
                    {c.githubStats.totalStars > 0 && (
                      <p>★ {c.githubStats.totalStars} stars · {c.githubStats.totalForks ?? 0} forks</p>
                    )}
                    {c.githubStats.deployedApps > 0 && (
                      <p>{c.githubStats.deployedApps} deployed app{c.githubStats.deployedApps !== 1 ? "s" : ""}</p>
                    )}
                  </div>
                )}

                {/* Top signals */}
                {c.signals.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {c.signals.slice(0, 3).map((s, i) => (
                      <span key={i} className="text-xs bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded">
                        {s}
                      </span>
                    ))}
                    {c.signals.length > 3 && (
                      <span className="text-xs text-slate-600">+{c.signals.length - 3}</span>
                    )}
                  </div>
                )}

                {/* Links */}
                <div className="flex items-center gap-3 pt-1 border-t border-slate-700">
                  {c.linkedinUrl && (
                    <a href={c.linkedinUrl} target="_blank" rel="noopener noreferrer"
                      className="text-slate-500 hover:text-blue-400 transition-colors">
                      <LinkedInIcon className="w-4 h-4" />
                    </a>
                  )}
                  {c.githubUrl && (
                    <a href={c.githubUrl} target="_blank" rel="noopener noreferrer"
                      className="text-slate-500 hover:text-slate-300 transition-colors">
                      <GitHubIcon className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense>
      <CompareInner />
    </Suspense>
  );
}
