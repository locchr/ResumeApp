"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Firm, Candidate } from "@/lib/types";
import { CandidateCard } from "@/components/CandidateCard";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Zap } from "lucide-react";

function SearchPageInner() {
  const searchParams = useSearchParams();
  const initialFirmId = searchParams.get("firm") ?? "";

  const [firms, setFirms] = useState<Firm[]>([]);
  const [selectedFirmId, setSelectedFirmId] = useState(initialFirmId);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [enrichingId, setEnrichingId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [batchEnriching, setBatchEnriching] = useState(false);

  useEffect(() => {
    fetch("/api/firms").then((r) => r.json()).then(setFirms);
  }, []);

  const selectedFirm = firms.find((f) => f.id === selectedFirmId);

  const loadCandidates = useCallback(async (firmName: string) => {
    const res = await fetch(`/api/candidates?firm=${encodeURIComponent(firmName)}`);
    const data = await res.json();
    setCandidates(data);
  }, []);

  useEffect(() => {
    if (selectedFirm) loadCandidates(selectedFirm.name);
  }, [selectedFirm, loadCandidates]);

  async function handleSearch() {
    if (!selectedFirm) return;
    setSearching(true);
    setStatus("Searching LinkedIn for product managers...");
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firmName: selectedFirm.name, firmId: selectedFirm.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(`Error: ${data.error}`);
      } else {
        setStatus(`Found ${data.found} new candidates`);
        loadCandidates(selectedFirm.name);
      }
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      setSearching(false);
    }
  }

  async function handleEnrich(id: string) {
    setEnrichingId(id);
    try {
      const res = await fetch(`/api/enrich/${id}`, { method: "POST" });
      if (res.ok && selectedFirm) {
        loadCandidates(selectedFirm.name);
      }
    } finally {
      setEnrichingId(null);
    }
  }

  async function handleBatchEnrich() {
    if (!selectedFirm) return;
    setBatchEnriching(true);
    setStatus("Enriching all pending candidates...");
    await fetch("/api/enrich/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firm: selectedFirm.name }),
    });

    // Poll for updates
    const poll = setInterval(async () => {
      await loadCandidates(selectedFirm.name);
      const c = await fetch(`/api/candidates?firm=${encodeURIComponent(selectedFirm.name)}`).then(r => r.json());
      const stillPending = c.filter((x: Candidate) => x.status === "pending").length;
      setStatus(`Enriching... ${c.filter((x: Candidate) => x.status === "enriched").length} done, ${stillPending} remaining`);
      if (stillPending === 0) {
        clearInterval(poll);
        setBatchEnriching(false);
        setStatus("All candidates enriched!");
        loadCandidates(selectedFirm.name);
      }
    }, 3000);
  }

  const pending = candidates.filter((c) => c.status === "pending");
  const enriched = candidates.filter((c) => c.status === "enriched");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Search for PMs</h1>
        <p className="text-slate-400 text-sm mt-1">Find product managers at your target firms</p>
      </div>

      {/* Search controls */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-5 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={selectedFirmId}
            onChange={(e) => setSelectedFirmId(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select a firm...</option>
            {firms.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
          <Button onClick={handleSearch} disabled={!selectedFirmId || searching} className="gap-2">
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {searching ? "Searching..." : "Search LinkedIn"}
          </Button>
        </div>

        {status && (
          <p className="text-sm text-slate-400 bg-slate-900 rounded px-3 py-2">{status}</p>
        )}
      </div>

      {/* Results */}
      {candidates.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-400">
              <span className="text-slate-200 font-medium">{candidates.length}</span> candidates for {selectedFirm?.name} ·{" "}
              <span className="text-amber-400 font-medium">{enriched.length}</span> enriched ·{" "}
              <span className="text-slate-400">{pending.length}</span> pending
            </div>
            {pending.length > 0 && (
              <Button size="sm" variant="outline" onClick={handleBatchEnrich}
                disabled={batchEnriching} className="gap-2">
                {batchEnriching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                Enrich All ({pending.length})
              </Button>
            )}
          </div>

          {/* Enriched */}
          {enriched.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-slate-300 mb-3">Enriched</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {enriched
                  .sort((a, b) => b.vibeScore - a.vibeScore)
                  .map((c) => <CandidateCard key={c.id} candidate={c} />)}
              </div>
            </div>
          )}

          {/* Pending */}
          {pending.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-slate-300 mb-3">Pending enrichment</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {pending.map((c) => (
                  <CandidateCard
                    key={c.id}
                    candidate={c}
                    onEnrich={handleEnrich}
                    enriching={enrichingId === c.id}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchPageInner />
    </Suspense>
  );
}
