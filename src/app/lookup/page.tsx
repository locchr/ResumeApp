"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Candidate } from "@/lib/types";
import { CandidateCard } from "@/components/CandidateCard";
import { Button } from "@/components/ui/button";
import { Search, Loader2, User, Zap } from "lucide-react";

function linkedInHandle(url: string): string | null {
  const m = url.match(/linkedin\.com\/in\/([^/?#]+)/i);
  return m ? m[1].toLowerCase() : null;
}

export default function LookupPage() {
  const [query, setQuery] = useState("");
  const [allCandidates, setAllCandidates] = useState<Candidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<Candidate[] | null>(null);
  const [status, setStatus] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/candidates").then((r) => r.json()).then(setAllCandidates);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const isLinkedInUrl = /linkedin\.com\/in\//i.test(query.trim());

  const dbMatches = useMemo(() => {
    const q = query.trim();
    if (/linkedin\.com\/in\//i.test(q)) {
      const handle = linkedInHandle(q);
      if (!handle) return [];
      return allCandidates.filter((c) => {
        if (!c.linkedinUrl) return false;
        return linkedInHandle(c.linkedinUrl) === handle;
      }).slice(0, 1);
    }
    const lower = q.toLowerCase();
    if (lower.length < 2) return [];
    return allCandidates.filter((c) => c.name.toLowerCase().includes(lower)).slice(0, 6);
  }, [query, allCandidates]);

  const showLinkedInButton = !isLinkedInUrl && query.trim().length >= 3 && dbMatches.length === 0 && !searching && searchResult === null;
  const showScoreButton = isLinkedInUrl && dbMatches.length === 0 && !searching && searchResult === null && query.trim().length > 0;
  const showNotFound = query.trim().length >= 3 && dbMatches.length === 0 && searchResult !== null && searchResult.length === 0;

  const handleSearch = useCallback(async () => {
    const isUrl = /linkedin\.com\/in\//i.test(query.trim());
    if (!query.trim() || searching) return;
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }

    setSearching(true);
    setStatus(isUrl ? "Looking up LinkedIn profile…" : `Searching LinkedIn for "${query.trim()}"…`);
    setSearchResult(null);

    try {
      const body = isUrl
        ? { linkedinUrl: query.trim() }
        : { personName: query.trim() };

      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus(`Error: ${data.error}`);
        setSearchResult([]);
        return;
      }

      const found = (data.candidates ?? []) as Candidate[];
      setSearchResult(found);
      setAllCandidates((prev) => {
        const newIds = new Set(found.map((c: Candidate) => c.id));
        return [...prev.filter((c) => !newIds.has(c.id)), ...found];
      });

      const pendingIds = found.filter((c) => c.status === "pending").map((c) => c.id);

      if (pendingIds.length === 0) {
        setStatus(found.length === 0 ? "No results found." : "");
        return;
      }

      setStatus(`Found ${found.length} candidate${found.length !== 1 ? "s" : ""} — enriching…`);
      pendingIds.forEach((id) => fetch(`/api/enrich/${id}`, { method: "POST" }).catch(() => {}));

      pollRef.current = setInterval(async () => {
        const all: Candidate[] = await fetch("/api/candidates").then((r) => r.json());
        const updated = all.filter((c) => pendingIds.includes(c.id) || found.map((f) => f.id).includes(c.id));
        setSearchResult(updated);
        setAllCandidates(all);
        const stillPending = updated.filter((c) => c.status === "pending").length;
        if (stillPending === 0) {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          setStatus("");
        } else {
          const done = updated.filter((c) => c.status === "enriched").length;
          setStatus(`Enriching… ${done} done, ${stillPending} remaining`);
        }
      }, 3000);
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : "Unknown"}`);
      setSearchResult([]);
    } finally {
      setSearching(false);
    }
  }, [query, searching]);

  function handleQueryChange(val: string) {
    setQuery(val);
    setSearchResult(null);
    setStatus("");
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Find a PM</h1>
        <p className="text-slate-400 text-sm mt-1">
          Type a name or paste a LinkedIn URL to check their vibe score.
        </p>
      </div>

      <div className="relative">
        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (showLinkedInButton || showScoreButton)) handleSearch(); }}
          placeholder="Full name or LinkedIn URL"
          className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          autoFocus
        />
      </div>

      {dbMatches.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">In your database</p>
          {dbMatches.map((c) => <CandidateCard key={c.id} candidate={c} />)}
        </div>
      )}

      {showLinkedInButton && (
        <div className="text-center space-y-3">
          <p className="text-sm text-slate-400">
            No match for <span className="text-slate-200">&ldquo;{query}&rdquo;</span> in your database.
          </p>
          <Button onClick={handleSearch} className="gap-2">
            <Search className="w-4 h-4" />
            Find on LinkedIn
          </Button>
        </div>
      )}

      {showScoreButton && (
        <div className="text-center space-y-3">
          <p className="text-sm text-slate-400">LinkedIn profile not in your database yet.</p>
          <Button onClick={handleSearch} className="gap-2">
            <Zap className="w-4 h-4" />
            Score this person
          </Button>
        </div>
      )}

      {searching && (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
          {status}
        </div>
      )}

      {!searching && status && (
        <p className="text-sm text-slate-400 bg-slate-800 rounded px-3 py-2">{status}</p>
      )}

      {showNotFound && (
        <div className="text-center py-8 border border-dashed border-slate-700 rounded-lg">
          <p className="text-slate-400 text-sm">No results found for <span className="text-slate-200">&ldquo;{query}&rdquo;</span>.</p>
          <p className="text-slate-600 text-xs mt-1">Try a different spelling or full name.</p>
        </div>
      )}

      {searchResult && searchResult.length > 0 && dbMatches.length === 0 && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Found on LinkedIn</p>
          {searchResult.map((c) => <CandidateCard key={c.id} candidate={c} />)}
        </div>
      )}
    </div>
  );
}
