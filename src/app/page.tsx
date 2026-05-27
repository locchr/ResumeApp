"use client";

import { useState, useEffect, useCallback } from "react";
import { Firm, Candidate, FirmSector, SECTOR_LABELS } from "@/lib/types";
import { FirmCard } from "@/components/FirmCard";
import { CandidateCard } from "@/components/CandidateCard";
import { vibeScoreLabel } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Trophy, Zap } from "lucide-react";

const SECTORS = Object.entries(SECTOR_LABELS) as [FirmSector, string][];

export default function DashboardPage() {
  const [firms, setFirms] = useState<Firm[]>([]);
  const [allCandidates, setAllCandidates] = useState<Candidate[]>([]);
  const [sectorFilter, setSectorFilter] = useState<FirmSector | "">("");

  const load = useCallback(async () => {
    const [f, c] = await Promise.all([
      fetch("/api/firms").then((r) => r.json()),
      fetch("/api/candidates").then((r) => r.json()),
    ]);
    setFirms(f);
    setAllCandidates(c);
  }, []);

  useEffect(() => { load(); }, [load]);

  const visibleFirms = sectorFilter
    ? firms.filter((f) => f.sector === sectorFilter)
    : firms;

  const visibleFirmNames = new Set(visibleFirms.map((f) => f.name));

  const enriched = allCandidates.filter(
    (c) => c.status === "enriched" && (!sectorFilter || visibleFirmNames.has(c.firm))
  );

  const avgScore =
    enriched.length > 0
      ? Math.round(enriched.reduce((s, c) => s + c.vibeScore, 0) / enriched.length)
      : 0;

  const topCoders = [...enriched].sort((a, b) => b.vibeScore - a.vibeScore).slice(0, 8);

  const candidatesByFirm = (firmName: string) =>
    allCandidates.filter((c) => c.firm === firmName);

  const hasSectors = firms.some((f) => f.sector);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Track vibe coders across top financial firms</p>
        </div>
        <Link href="/search">
          <Button className="gap-2">
            <Zap className="w-4 h-4" />
            New Search
          </Button>
        </Link>
      </div>

      {/* Sector filter pills — only shown once at least one firm has a sector */}
      {hasSectors && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSectorFilter("")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
              sectorFilter === ""
                ? "bg-indigo-600 border-indigo-500 text-white"
                : "border-slate-600 text-slate-400 hover:border-slate-400 hover:text-slate-200"
            }`}
          >
            All
          </button>
          {SECTORS.map(([val, label]) =>
            firms.some((f) => f.sector === val) ? (
              <button
                key={val}
                onClick={() => setSectorFilter(sectorFilter === val ? "" : val)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                  sectorFilter === val
                    ? "bg-indigo-600 border-indigo-500 text-white"
                    : "border-slate-600 text-slate-400 hover:border-slate-400 hover:text-slate-200"
                }`}
              >
                {label}
              </button>
            ) : null
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Firms", value: visibleFirms.length },
          { label: "Candidates", value: sectorFilter ? enriched.length + allCandidates.filter(c => c.status !== "enriched" && visibleFirmNames.has(c.firm)).length : allCandidates.length },
          { label: "Enriched", value: enriched.length },
          { label: "Avg Vibe Score", value: avgScore || "—" },
        ].map(({ label, value }) => (
          <div key={label} className="bg-slate-800 border border-slate-700 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-slate-100">{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Firms grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-200">
            Target Firms
            {sectorFilter && <span className="text-slate-400 font-normal text-sm ml-2">· {SECTOR_LABELS[sectorFilter]}</span>}
          </h2>
          <Link href="/firms" className="text-sm text-indigo-400 hover:text-indigo-300">Manage →</Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleFirms.map((firm) => (
            <FirmCard key={firm.id} firm={firm} candidates={candidatesByFirm(firm.name)} />
          ))}
        </div>
      </div>

      {/* Top vibe coders leaderboard */}
      {topCoders.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-slate-200">
              Top Vibe Coders
              {sectorFilter && <span className="text-slate-400 font-normal text-sm ml-2">· {SECTOR_LABELS[sectorFilter]}</span>}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {topCoders.map((c) => (
              <CandidateCard key={c.id} candidate={c} />
            ))}
          </div>
          <div className="mt-4 text-center">
            <Link href="/candidates" className="text-sm text-indigo-400 hover:text-indigo-300">
              View all candidates →
            </Link>
          </div>
        </div>
      )}

      {/* Empty state */}
      {allCandidates.length === 0 && (
        <div className="text-center py-16 border border-dashed border-slate-700 rounded-lg">
          <Zap className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-slate-300 font-medium mb-2">No candidates yet</h3>
          <p className="text-slate-500 text-sm mb-4">Search for PMs at your target firms to get started</p>
          <Link href="/search">
            <Button>Start Searching</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
