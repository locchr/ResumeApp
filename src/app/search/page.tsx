"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Firm, Candidate } from "@/lib/types";
import { CandidateCard } from "@/components/CandidateCard";
import { Button } from "@/components/ui/button";
import { Loader2, Search, User, Building2 } from "lucide-react";

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
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/firms").then((r) => r.json()).then(setFirms);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const selectedFirm = firms.find((f) => f.id === selectedFirmId);

  const loadCandidates = useCallback(async (firmName: string) => {
    const res = await fetch(`/api/candidates?firm=${encodeURIComponent(firmName)}`);
    const data = await res.json();
    setCandidates(data);
    return data as Candidate[];
  }, []);

  useEffect(() => {
    if (mode === "firm" && selectedFirm) loadCandidates(selectedFirm.name);
  }, [selectedFirm, loadCandidates, mode]);

  function switchMode(next: SearchMode) {
    setMode(next);
    setCandidates([]);
    setStatus("");
    setNameResultIds([]);
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }

  function startFirmEnrichPoll(firmName: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    setBatchEnriching(true);

    fetch("/api/enrich/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firm: firmName }),
    });

    pollRef.current = setInterval(async () => {
      const c: Candidate[] = await fetch(`/api/candidates?firm=${encodeURIComponent(firmName)}`).then((r) => r.json());
      setCandidates(c);
      const stillPending = c.filter((x) => x.status === "pending").length;
      const done = c.filter((x) => x.status === "enriched").length;
      if (stillPending === 0) {
        clearInterval(pollRef.current!);
        pollRef.current = null;
        setBatchEnriching(false);
        setStatus(`All ${done} candidate${done !== 1 ? "s" : ""} enriched`);
      } else {
        setStatus(`Enriching… ${done} done, ${stillPending} remaining`);
      }
    }, 3000);
  }

  function startNameEnrichPoll(ids: string[]) {
    if (pollRef.current) clearInterval(pollRef.current);
    setEnrichingId(ids[0] ?? null);

    // Fire enrichment for all pending IDs (don't await — let server handle them)
    ids.forEach((id) => fetch(`/api/enrich/${id}`, { method: "POST" }).catch(() => {}));

    pollRef.current = setInterval(async () => {
      const all: Candidate[] = await fetch("/api/candidates").then((r) => r.json());
      const updated = all.filter((c) => ids.includes(c.id));
      setCandidates(updated);
      const stillPending = updated.filter((c) => c.status === "pending").length;
      if (stillPending === 0) {
        clearInterval(pollRef.current!);
        pollRef.current = null;
        setEnrichingId(null);
        setStatus("Enrichment complete");
      } else {
        setStatus(`Enriching… ${updated.filter((c) => c.status === "enriched").length} done`);
      }
    }, 3000);
  }

  const canSearch = mode === "firm" ? !!selectedFirmId : !!personName.trim();

  async function handleSearch() {
    if (!canSearch) return;
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }

    setSearching(true);
    setStatus(mode === "firm"
      ? "Searching LinkedIn for product managers…"
      : `Searching LinkedIn for "${personName.trim()}"…`);

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
        return;
      }

      if (mode === "firm") {
        const allForFirm = await loadCandidates(selectedFirm!.name);
        const pendingCount = allForFirm.filter((c) => c.status === "pending").length;
        if (pendingCount > 0) {
          setStatus(`Found ${data.found} new candidates — enriching now…`);
          startFirmEnrichPoll(selectedFirm!.name);
        } else {
          setStatus(`Found ${data.found} new candidates`);
        }
      } else {
        const foundCandidates = data.candidates as Candidate[];
        setCandidates(foundCandidates);
        const foundIds = foundCandidates.map((c: Candidate) => c.id);
        setNameResultIds(foundIds);
        const pendingIds = foundCandidates.filter((c: Candidate) => c.status === "pending").map((c: Candidate) => c.id);

        if (data.found === 0 && foundCandidates.length === 0) {
          setStatus("No results found. If this person is already in your database, search on the Candidates page.");
        } else if (pendingIds.length > 0) {
          setStatus(`Found ${foundCandidates.length} candidate${foundCandidates.length !== 1 ? "s" : ""} — enriching…`);
          startNameEnrichPoll(pendingIds);
        } else {
          setStatus(`Found ${foundCandidates.length} candidate${foundCandidates.length !== 1 ? "s" : ""}`);
        }
      }
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      setSearching(false);
    }
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
            <Button onClick={handleSearch} disabled={!canSearch || searching || batchEnriching} className="gap-2">
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {searching ? "Searching…" : "Search LinkedIn"}
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
            <Button onClick={handleSearch} disabled={!canSearch || searching || !!enrichingId} className="gap-2">
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {searching ? "Searching…" : "Search by Name"}
            </Button>
          </div>
        )}

        {status && (
          <div className="flex items-center gap-2 text-sm text-slate-400 bg-slate-900 rounded px-3 py-2">
            {(batchEnriching || enrichingId) && (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400 flex-shrink-0" />
            )}
            {status}
          </div>
        )}
      </div>

      {/* Results */}
      {candidates.length > 0 && (
        <div className="space-y-4">
          <div className="text-sm text-slate-400">
            <span className="text-slate-200 font-medium">{candidates.length}</span> candidate{candidates.length !== 1 ? "s" : ""}{mode === "firm" && selectedFirm ? ` for ${selectedFirm.name}` : ""} ·{" "}
            <span className="text-amber-400 font-medium">{enriched.length}</span> enriched ·{" "}
            <span className="text-slate-400">{pending.length}</span> pending
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
              <h3 className="text-sm font-medium text-slate-300 mb-3">
                Pending enrichment
                {(batchEnriching || enrichingId) && (
                  <span className="ml-2 text-xs text-indigo-400 font-normal">
                    <Loader2 className="w-3 h-3 animate-spin inline mr-1" />
                    Enriching automatically…
                  </span>
                )}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {pending.map((c) => (
                  <CandidateCard
                    key={c.id}
                    candidate={c}
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
