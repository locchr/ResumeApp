"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { Firm, Candidate, SECTOR_LABELS } from "@/lib/types";
import { vibeScoreBg } from "@/lib/utils";
import { CandidateCard } from "@/components/CandidateCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Search, Zap, Loader2 } from "lucide-react";
import Link from "next/link";

export default function FirmDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [firm, setFirm] = useState<Firm | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [discovering, setDiscovering] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [status, setStatus] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const loadCandidates = useCallback(async (firmName: string) => {
    const c: Candidate[] = await fetch(`/api/candidates?firm=${encodeURIComponent(firmName)}`).then((r) => r.json());
    setCandidates(c.sort((a, b) => b.vibeScore - a.vibeScore));
    return c;
  }, []);

  useEffect(() => {
    async function init() {
      const firms: Firm[] = await fetch("/api/firms").then((r) => r.json());
      const found = firms.find((f) => f.id === id);
      if (!found) return;
      setFirm(found);
      loadCandidates(found.name);
    }
    init();
  }, [id, loadCandidates]);

  function startEnrichPoll(firmName: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    setEnriching(true);

    fetch("/api/enrich/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firm: firmName }),
    });

    pollRef.current = setInterval(async () => {
      const updated = await loadCandidates(firmName);
      const stillPending = updated.filter((c) => c.status === "pending").length;
      const done = updated.filter((c) => c.status === "enriched").length;
      if (stillPending === 0) {
        clearInterval(pollRef.current!);
        pollRef.current = null;
        setEnriching(false);
        setDiscovering(false);
        setStatus(`${done} candidate${done !== 1 ? "s" : ""} enriched`);
      } else {
        setStatus(`Enriching… ${done} done, ${stillPending} remaining`);
      }
    }, 3000);
  }

  async function handleDiscover() {
    if (!firm || discovering || enriching) return;
    setDiscovering(true);
    setStatus("Searching LinkedIn…");
    try {
      await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firmName: firm.name, firmId: firm.id }),
      });
      const fresh = await loadCandidates(firm.name);
      const pendingCount = fresh.filter((c) => c.status === "pending").length;
      if (pendingCount > 0) {
        setStatus(`Found new candidates — enriching…`);
        startEnrichPoll(firm.name);
      } else {
        setDiscovering(false);
        setStatus("Search complete");
      }
    } catch {
      setStatus("Error — try again");
      setDiscovering(false);
    }
  }

  async function handleEnrichAll() {
    if (!firm || enriching) return;
    setStatus("Enriching…");
    startEnrichPoll(firm.name);
  }

  if (!firm) {
    return <div className="text-center py-16 text-slate-400 text-sm">Loading…</div>;
  }

  const enriched = candidates.filter((c) => c.status === "enriched");
  const pending = candidates.filter((c) => c.status === "pending");
  const avgScore =
    enriched.length > 0
      ? Math.round(enriched.reduce((s, c) => s + c.vibeScore, 0) / enriched.length)
      : null;
  const isWorking = discovering || enriching;

  return (
    <div className="space-y-6">
      <Link href="/" className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to pipeline
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">{firm.name}</h1>
          {firm.sector && (
            <p className="text-sm text-indigo-400 mt-0.5">{SECTOR_LABELS[firm.sector]}</p>
          )}
        </div>
        <Button variant="outline" onClick={handleDiscover} disabled={isWorking} className="gap-2 flex-shrink-0">
          {isWorking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          {candidates.length === 0 ? "Discover PMs" : "Search more"}
        </Button>
      </div>

      {status && (
        <div className="flex items-center gap-2 text-sm text-slate-400 bg-slate-800 rounded px-3 py-2">
          {isWorking && <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400 flex-shrink-0" />}
          {status}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total found", value: candidates.length },
          { label: "Enriched", value: enriched.length },
          { label: "Pending", value: pending.length },
          { label: "Avg vibe score", value: avgScore ?? "—" },
        ].map(({ label, value }) => (
          <div key={label} className="bg-slate-800 border border-slate-700 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-slate-100">{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {candidates.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-slate-700 rounded-lg">
          <Zap className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 mb-4">No product managers found yet.</p>
          <Button onClick={handleDiscover} disabled={isWorking} className="gap-2">
            {isWorking && <Loader2 className="w-4 h-4 animate-spin" />}
            Discover PMs
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {enriched.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-slate-300 mb-3">Enriched · sorted by vibe score</h2>
              <div className="space-y-2">
                {enriched.map((c, i) => (
                  <div key={c.id} className="flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 hover:border-slate-600 transition-colors">
                    <span className="text-slate-500 text-sm w-5 text-right flex-shrink-0">{i + 1}</span>
                    <Link href={`/candidates/${c.id}`} className="flex-1 min-w-0">
                      <p className="font-medium text-slate-100 hover:text-indigo-300 transition-colors truncate">{c.name}</p>
                      <p className="text-xs text-slate-500 truncate">{c.title}</p>
                    </Link>
                    <span className={`flex-shrink-0 px-2.5 py-1 rounded-full border text-xs font-bold ${vibeScoreBg(c.vibeScore)}`}>
                      <span className="flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        {c.vibeScore}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pending.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-medium text-slate-300">
                  Pending enrichment ({pending.length})
                </h2>
                {!enriching && (
                  <Button size="sm" variant="outline" onClick={handleEnrichAll} className="gap-1.5">
                    <Zap className="w-3 h-3" />
                    Enrich all
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {pending.map((c) => <CandidateCard key={c.id} candidate={c} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
