"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Firm, Candidate } from "@/lib/types";
import { CandidateCard } from "@/components/CandidateCard";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Zap, User, Building2 } from "lucide-react";

type SearchMode = "firm" | "name";

function SearchPageInner() {
  const searchParams = useSearchParams();
  const initialFirmId = searchParams.get("firm") ?? "";

  const [mode, setMode] = useState<SearchMode>("firm");
  const [firms, setFirms] = useState<Firm[]>([]);
  const [selectedFirmId, setSelectedFirmId] = useState(initialFirmId);
  const [personName, setPersonName] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [nameResultIds, setNameResultIds] = useState<string[]>([]);
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
    if (mode === "firm" && selectedFirm) loadCandidates(selectedFirm.name);
  }, [selectedFirm, loadCandidates, mode]);

  function switchMode(next: SearchMode) {
    setMode(next);
    setCandidates([]);
    setStatus("");
    setNameResultIds([]);
  }

  const canSearch = mode === "firm" ? !!selectedFirmId : !!personName.trim();

  async function handleSearch() {
    if (!canSearch) return;
    setSearching(true);
    setStatus(mode === "firm"
      ? "Searching LinkedIn for product managers..."
      : `Searching LinkedIn for "${personName.trim()}"...`);

    try {
      const body = mode === "firm"
        ? { firmName: selectedFirm!.name, firmId: selectedFirm!.id }
        : {
            personName: personName.trim(),
            ...(selectedFirm ? { firmName: selectedFirm.name, firmId: selectedFirm.id } : {}),
          };

      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus(`Error: ${data.error}`);
      } else if (mode === "firm") {
        setStatus(`Found ${data.found} new candidates`);
        loadCandidates(selectedFirm!.name);
      } else {
        if (data.found > 0) {
          setStatus(`Found ${data.found} candidate${data.found === 1 ? "" : "s"}`);
        } else {
          setStatus("No new results. If this person is already in your database, search for them on the Candidates page.");
        }
        setCandidates(data.candidates);
        setNameResultIds((data.candidates as Candidate[]).map((c) => c.id));
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
      if (res.ok) {
        if (mode === "firm" && selectedFirm) {
          loadCandidates(selectedFirm.name);
        } else {
          const all: Candidate[] = await fetch("/api/candidates").then((r) => r.json());
          const ids = nameResultIds;
          setCandidates(all.filter((c) => ids.includes(c.id)));
        }
      }
    } finally {
      setEnrichingId(null);
    }
  }

  async function handleBatchEnrich() {
    if (!selectedFirm || mode !== "firm") return;
    setBatchEnriching(true);
    setStatus("Enriching all pending candidates...");
    await fetch("/api/enrich/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firm: selectedFirm.name }),
    });

    const poll = setInterval(async () => {
      await loadCandidates(selectedFirm.name);
      const c: Candidate[] = await fetch(`/api/candidates?firm=${encodeURIComponent(selectedFirm.name)}`).then((r) => r.json());
      const stillPending = c.filter((x) => x.status === "pending").length;
      setStatus(`Enriching... ${c.filter((x) => x.status === "enriched").length} done, ${stillPending} remaining`);
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

      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => switchMode("firm")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors border ${
            mode === "firm"
              ? "bg-indigo-600 border-indigo-500 text-white"
              : "border-slate-600 text-slate-400 hover:border-slate-400 hover:text-slate-200"
          }`}
        >
          <Building2 className="w-4 h-4" />
          By Firm
        </button>
        <button
          onClick={() => switchMode("name")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors border ${
            mode === "name"
              ? "bg-indigo-600 border-indigo-500 text-white"
              : "border-slate-600 text-slate-400 hover:border-slate-400 hover:text-slate-200"
          }`}
        >
          <User className="w-4 h-4" />
          By Name
        </button>
      </div>

      {/* Search controls */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-5 space-y-4">
        {mode === "firm" ? (
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
            <Button onClick={handleSearch} disabled={!canSearch || searching} className="gap-2">
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {searching ? "Searching..." : "Search LinkedIn"}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && canSearch && !searching) handleSearch(); }}
              placeholder="Full name (e.g. Ameya Shanbhag)"
              className="flex-1 bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
            <select
              value={selectedFirmId}
              onChange={(e) => setSelectedFirmId(e.target.value)}
              className="bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Any firm</option>
              {firms.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            <Button onClick={handleSearch} disabled={!canSearch || searching} className="gap-2">
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {searching ? "Searching..." : "Search by Name"}
            </Button>
          </div>
        )}

        {status && (
          <p className="text-sm text-slate-400 bg-slate-900 rounded px-3 py-2">{status}</p>
        )}
      </div>

      {/* Results */}
      {candidates.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-400">
              <span className="text-slate-200 font-medium">{candidates.length}</span> candidate{candidates.length !== 1 ? "s" : ""}{mode === "firm" && selectedFirm ? ` for ${selectedFirm.name}` : ""} ·{" "}
              <span className="text-amber-400 font-medium">{enriched.length}</span> enriched ·{" "}
              <span className="text-slate-400">{pending.length}</span> pending
            </div>
            {pending.length > 0 && mode === "firm" && (
              <Button size="sm" variant="outline" onClick={handleBatchEnrich}
                disabled={batchEnriching} className="gap-2">
                {batchEnriching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                Enrich All ({pending.length})
              </Button>
            )}
          </div>

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
