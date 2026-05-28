"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Firm, Candidate, FirmSector, SECTOR_LABELS } from "@/lib/types";
import { FirmCard } from "@/components/FirmCard";
import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const SECTORS = Object.entries(SECTOR_LABELS) as [FirmSector, string][];

type DiscoveryState = { loading: boolean; status: string };

export default function HomePage() {
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
    setDiscoveryStates((prev) => ({
      ...prev,
      [firm.id]: { loading: true, status: "Searching LinkedIn…" },
    }));

    try {
      await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firmName: firm.name, firmId: firm.id, division: firm.division }),
      });

      const fresh: Candidate[] = await fetch(`/api/candidates?firm=${encodeURIComponent(firm.name)}`).then((r) => r.json());
      setAllCandidates((prev) => [...prev.filter((c) => c.firm !== firm.name), ...fresh]);

      const pendingCount = fresh.filter((c) => c.status === "pending").length;
      if (pendingCount === 0) {
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

  const candidatesByFirm = (firmName: string) => allCandidates.filter((c) => c.firm === firmName);

  const visibleFirms = sectorFilter ? firms.filter((f) => f.sector === sectorFilter) : firms;
  const hasSectors = firms.some((f) => f.sector);
  const totalEnriched = allCandidates.filter((c) => c.status === "enriched").length;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">
            {firms.length} firms · {allCandidates.length} PMs found · {totalEnriched} enriched
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleFirms.map((firm) => {
            const ds = discoveryStates[firm.id];
            return (
              <FirmCard
                key={firm.id}
                firm={firm}
                candidates={candidatesByFirm(firm.name)}
                onDiscover={() => handleDiscover(firm)}
                discovering={ds?.loading ?? false}
                discoveryStatus={ds?.status ?? ""}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
