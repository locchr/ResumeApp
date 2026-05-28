"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Firm, Candidate, FirmSector, SECTOR_LABELS } from "@/lib/types";
import { vibeScoreBg } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Zap, Search, Loader2, Building2, Plus, ChevronRight } from "lucide-react";

const SECTORS = Object.entries(SECTOR_LABELS) as [FirmSector, string][];

type DiscoveryState = { loading: boolean; status: string };

export default function PipelinePage() {
  const [firms, setFirms] = useState<Firm[]>([]);
  const [allCandidates, setAllCandidates] = useState<Candidate[]>([]);
  const [sectorFilter, setSectorFilter] = useState<FirmSector | "">("");
  const [discoveryStates, setDiscoveryStates] = useState<Record<string, DiscoveryState>>({});
  const pollRefs = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  const load = useCallback(async () => {
    const [f, c] = await Promise.all([
      fetch("/api/firms").then((r) => r.json()),
      fetch("/api/candidates").then((r) => r.json()),
    ]);
    setFirms(f);
    setAllCandidates(c);
  }, []);

  useEffect(() => {
    load();
    return () => { Object.values(pollRefs.current).forEach(clearInterval); };
  }, [load]);

  async function handleDiscover(firm: Firm) {
    setDiscoveryStates((prev) => ({ ...prev, [firm.id]: { loading: true, status: "Searching LinkedIn…" } }));

    try {
      await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firmName: firm.name, firmId: firm.id }),
      });

      const fresh: Candidate[] = await fetch(`/api/candidates?firm=${encodeURIComponent(firm.name)}`).then((r) => r.json());
      setAllCandidates((prev) => [...prev.filter((c) => c.firm !== firm.name), ...fresh]);

      const pending = fresh.filter((c) => c.status === "pending");
      if (pending.length === 0) {
        setDiscoveryStates((prev) => ({ ...prev, [firm.id]: { loading: false, status: "" } }));
        return;
      }

      fetch("/api/enrich/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firm: firm.name }),
      });

      setDiscoveryStates((prev) => ({ ...prev, [firm.id]: { loading: true, status: "Enriching…" } }));

      if (pollRefs.current[firm.id]) clearInterval(pollRefs.current[firm.id]);
      pollRefs.current[firm.id] = setInterval(async () => {
        const c: Candidate[] = await fetch(`/api/candidates?firm=${encodeURIComponent(firm.name)}`).then((r) => r.json());
        setAllCandidates((prev) => [...prev.filter((x) => x.firm !== firm.name), ...c]);
        const stillPending = c.filter((x) => x.status === "pending").length;
        const done = c.filter((x) => x.status === "enriched").length;
        if (stillPending === 0) {
          clearInterval(pollRefs.current[firm.id]);
          delete pollRefs.current[firm.id];
          setDiscoveryStates((prev) => ({ ...prev, [firm.id]: { loading: false, status: "" } }));
        } else {
          setDiscoveryStates((prev) => ({
            ...prev,
            [firm.id]: { loading: true, status: `Enriching… ${done} done, ${stillPending} remaining` },
          }));
        }
      }, 3000);
    } catch {
      setDiscoveryStates((prev) => ({ ...prev, [firm.id]: { loading: false, status: "Error — try again" } }));
    }
  }

  const visibleFirms = sectorFilter ? firms.filter((f) => f.sector === sectorFilter) : firms;
  const hasSectors = firms.some((f) => f.sector);
  const totalEnriched = allCandidates.filter((c) => c.status === "enriched").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Pipeline</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {firms.length} firm{firms.length !== 1 ? "s" : ""} · {allCandidates.length} PMs found · {totalEnriched} enriched
          </p>
        </div>
        <Link href="/firms" className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Manage firms</span>
        </Link>
      </div>

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

      {visibleFirms.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-slate-700 rounded-lg">
          <Building2 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 mb-4">No firms added yet</p>
          <Link href="/firms">
            <Button>Add target firms</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleFirms.map((firm) => {
            const firmCandidates = allCandidates.filter((c) => c.firm === firm.name);
            const enriched = firmCandidates
              .filter((c) => c.status === "enriched")
              .sort((a, b) => b.vibeScore - a.vibeScore);
            const pending = firmCandidates.filter((c) => c.status === "pending");
            const top3 = enriched.slice(0, 3);
            const avgScore =
              enriched.length > 0
                ? Math.round(enriched.reduce((s, c) => s + c.vibeScore, 0) / enriched.length)
                : null;
            const ds = discoveryStates[firm.id];
            const isWorking = ds?.loading ?? false;

            return (
              <div key={firm.id} className="bg-slate-800 border border-slate-700 rounded-xl p-5 hover:border-slate-600 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-100">{firm.name}</h3>
                      {firm.sector && (
                        <span className="text-xs text-indigo-400 bg-indigo-900/40 px-1.5 py-0.5 rounded">
                          {SECTOR_LABELS[firm.sector]}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {firmCandidates.length > 0
                        ? `${firmCandidates.length} found · ${enriched.length} enriched${avgScore ? ` · avg ${avgScore}/100` : ""}`
                        : "No candidates yet"}
                      {pending.length > 0 && (
                        <span className="text-amber-500 ml-1">· {pending.length} pending</span>
                      )}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDiscover(firm)}
                    disabled={isWorking}
                    className="flex-shrink-0 gap-1.5"
                  >
                    {isWorking ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Search className="w-3 h-3" />
                    )}
                    {firmCandidates.length === 0 ? "Discover PMs" : "Search more"}
                  </Button>
                </div>

                {ds?.status && (
                  <p className="text-xs text-indigo-300 mt-2">{ds.status}</p>
                )}

                {top3.length > 0 && (
                  <div className="mt-4 space-y-1">
                    {top3.map((c, i) => (
                      <Link
                        key={c.id}
                        href={`/candidates/${c.id}`}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-700 transition-colors group"
                      >
                        <span className="text-slate-600 text-xs w-4 flex-shrink-0 text-right">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-200 group-hover:text-indigo-300 transition-colors truncate">
                            {c.name}
                          </p>
                          <p className="text-xs text-slate-500 truncate">{c.title}</p>
                        </div>
                        <span className={`flex-shrink-0 px-2 py-0.5 rounded-full border text-xs font-bold ${vibeScoreBg(c.vibeScore)}`}>
                          {c.vibeScore}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}

                {top3.length === 0 && pending.length > 0 && !isWorking && (
                  <p className="text-xs text-slate-600 mt-3 italic">
                    {pending.length} candidate{pending.length !== 1 ? "s" : ""} pending enrichment
                  </p>
                )}

                {top3.length === 0 && pending.length === 0 && firmCandidates.length === 0 && !isWorking && (
                  <p className="text-xs text-slate-600 mt-3 italic">
                    Click Discover to find PMs at {firm.name}
                  </p>
                )}

                {firmCandidates.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-700/50">
                    <Link
                      href={`/firms/${firm.id}`}
                      className="flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-300 transition-colors"
                    >
                      View all {firmCandidates.length} PM{firmCandidates.length !== 1 ? "s" : ""}
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {allCandidates.length === 0 && firms.length > 0 && (
        <p className="text-center text-sm text-slate-500">
          Click <span className="text-slate-300">Discover PMs</span> on any firm above to get started.
        </p>
      )}
    </div>
  );
}
