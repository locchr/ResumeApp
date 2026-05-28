"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { Firm, Candidate, SECTOR_LABELS } from "@/lib/types";
import { vibeScoreBg } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Search, Zap, Loader2, SlidersHorizontal } from "lucide-react";
import Link from "next/link";

export default function FirmDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [firm, setFirm] = useState<Firm | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [discovering, setDiscovering] = useState(false);
  const [enrichingIds, setEnrichingIds] = useState<Set<string>>(new Set());
  // pendingSelectedIds — for "Enrich selected"
  const [pendingSelectedIds, setPendingSelectedIds] = useState<Set<string>>(new Set());
  // enrichedSelectedIds — for "Compare"
  const [enrichedSelectedIds, setEnrichedSelectedIds] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState("");
  const discoverPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (discoverPollRef.current) clearInterval(discoverPollRef.current); };
  }, []);

  const loadCandidates = useCallback(async (firmName: string) => {
    const c: Candidate[] = await fetch(`/api/candidates?firm=${encodeURIComponent(firmName)}`).then((r) => r.json());
    const sorted = c.sort((a, b) => b.vibeScore - a.vibeScore);
    setCandidates(sorted);
    return sorted;
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

  async function handleDiscover() {
    if (!firm || discovering) return;
    setDiscovering(true);
    setStatus("Searching LinkedIn…");
    try {
      await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firmName: firm.name, firmId: firm.id, division: firm.division }),
      });
      const fresh = await loadCandidates(firm.name);
      const pendingCount = fresh.filter((c) => c.status === "pending").length;
      setStatus(
        pendingCount > 0
          ? `Found ${pendingCount} new PM${pendingCount !== 1 ? "s" : ""} — click Enrich to score them`
          : "Search complete — no new PMs found"
      );
      setDiscovering(false);
    } catch {
      setStatus("Error — try again");
      setDiscovering(false);
    }
  }

  async function enrichOne(candidateId: string, firmName: string) {
    setEnrichingIds((prev) => new Set(prev).add(candidateId));
    try {
      await fetch(`/api/enrich/${candidateId}`, { method: "POST" });
      const poll = setInterval(async () => {
        const c: Candidate[] = await fetch(`/api/candidates?firm=${encodeURIComponent(firmName)}`).then((r) => r.json());
        const updated = c.find((x) => x.id === candidateId);
        if (!updated || updated.status !== "pending") {
          clearInterval(poll);
          setEnrichingIds((prev) => { const next = new Set(prev); next.delete(candidateId); return next; });
          setCandidates(c.sort((a, b) => b.vibeScore - a.vibeScore));
        }
      }, 3000);
    } catch {
      setEnrichingIds((prev) => { const next = new Set(prev); next.delete(candidateId); return next; });
    }
  }

  function handleEnrichSelected() {
    if (!firm) return;
    const ids = [...pendingSelectedIds];
    setPendingSelectedIds(new Set());
    ids.forEach((cid) => enrichOne(cid, firm.name));
  }

  function handleEnrichAll() {
    if (!firm) return;
    const pendingIds = candidates.filter((c) => c.status === "pending").map((c) => c.id);
    setPendingSelectedIds(new Set());
    pendingIds.forEach((cid) => enrichOne(cid, firm.name));
  }

  function togglePendingSelect(cid: string) {
    setPendingSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(cid)) next.delete(cid); else next.add(cid);
      return next;
    });
  }

  function toggleEnrichedSelect(cid: string) {
    setEnrichedSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(cid)) next.delete(cid); else next.add(cid);
      return next;
    });
  }

  function toggleSelectAllPending(pending: Candidate[]) {
    const allSelected = pending.every((c) => pendingSelectedIds.has(c.id));
    setPendingSelectedIds(allSelected ? new Set() : new Set(pending.map((c) => c.id)));
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
  const allPendingSelected = pending.length > 0 && pending.every((c) => pendingSelectedIds.has(c.id));
  const compareUrl = `/compare?ids=${[...enrichedSelectedIds].join(",")}`;

  return (
    <div className="space-y-6">
      <Link href="/" className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to dashboard
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">{firm.name}</h1>
          {firm.sector && (
            <p className="text-sm text-indigo-400 mt-0.5">{SECTOR_LABELS[firm.sector]}</p>
          )}
          {firm.division && (
            <p className="text-xs text-slate-500 mt-0.5">Searching: {firm.division}</p>
          )}
        </div>
        <Button variant="outline" onClick={handleDiscover} disabled={discovering} className="gap-2 flex-shrink-0">
          {discovering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          {candidates.length === 0 ? "Discover PMs" : "Search more"}
        </Button>
      </div>

      {status && (
        <div className="flex items-center gap-2 text-sm text-slate-400 bg-slate-800 rounded px-3 py-2">
          {discovering && <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400 flex-shrink-0" />}
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
          <Button onClick={handleDiscover} disabled={discovering} className="gap-2">
            {discovering && <Loader2 className="w-4 h-4 animate-spin" />}
            Discover PMs
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ── Enriched section ── */}
          {enriched.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3 gap-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={enriched.length > 0 && enriched.every((c) => enrichedSelectedIds.has(c.id))}
                    onChange={() => {
                      const allSel = enriched.every((c) => enrichedSelectedIds.has(c.id));
                      setEnrichedSelectedIds(allSel ? new Set() : new Set(enriched.map((c) => c.id)));
                    }}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900 cursor-pointer"
                    title="Select all enriched"
                  />
                  <h2 className="text-sm font-medium text-slate-300">
                    Enriched · sorted by vibe score ({enriched.length})
                  </h2>
                </div>
                {enrichedSelectedIds.size >= 2 && (
                  <Link
                    href={compareUrl}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-md transition-colors"
                  >
                    <SlidersHorizontal className="w-3 h-3" />
                    Compare ({enrichedSelectedIds.size})
                  </Link>
                )}
              </div>

              <div className="space-y-1.5">
                {enriched.map((c, i) => {
                  const isSelected = enrichedSelectedIds.has(c.id);
                  return (
                    <div
                      key={c.id}
                      className={`flex items-center gap-3 rounded-lg px-4 py-3 border transition-colors ${
                        isSelected
                          ? "bg-indigo-900/20 border-indigo-700"
                          : "bg-slate-800 border-slate-700 hover:border-slate-600"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleEnrichedSelect(c.id)}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900 cursor-pointer flex-shrink-0"
                      />
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
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Pending section ── */}
          {pending.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3 gap-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={allPendingSelected}
                    onChange={() => toggleSelectAllPending(pending)}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900 cursor-pointer"
                    title="Select all pending"
                  />
                  <h2 className="text-sm font-medium text-slate-300">
                    Pending enrichment ({pending.length})
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  {pendingSelectedIds.size > 0 && (
                    <Button size="sm" onClick={handleEnrichSelected} className="gap-1.5">
                      <Zap className="w-3 h-3" />
                      Enrich selected ({pendingSelectedIds.size})
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleEnrichAll}
                    disabled={enrichingIds.size === pending.length}
                    className="gap-1.5"
                  >
                    <Zap className="w-3 h-3" />
                    Enrich all
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                {pending.map((c) => {
                  const isEnriching = enrichingIds.has(c.id);
                  const isSelected = pendingSelectedIds.has(c.id);
                  return (
                    <div
                      key={c.id}
                      className={`flex items-center gap-3 rounded-lg px-4 py-3 border transition-colors ${
                        isSelected
                          ? "bg-indigo-900/20 border-indigo-700"
                          : "bg-slate-800 border-slate-700 hover:border-slate-600"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => togglePendingSelect(c.id)}
                        disabled={isEnriching}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-200 truncate">{c.name}</p>
                        <p className="text-xs text-slate-500 truncate">{c.title}</p>
                      </div>
                      {c.linkedinUrl && (
                        <a
                          href={c.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-slate-500 hover:text-blue-400 transition-colors hidden sm:block flex-shrink-0"
                        >
                          LinkedIn ↗
                        </a>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => enrichOne(c.id, firm.name)}
                        disabled={isEnriching}
                        className="flex-shrink-0 gap-1.5"
                      >
                        {isEnriching ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Zap className="w-3 h-3" />
                        )}
                        {isEnriching ? "Enriching…" : "Enrich"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
