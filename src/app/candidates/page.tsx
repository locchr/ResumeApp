"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Candidate } from "@/lib/types";
import { vibeScoreBg, vibeScoreLabel } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Download, Loader2, RefreshCw, Star, Trash2, Zap, Search, ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import { GitHubIcon, LinkedInIcon } from "@/components/icons";
import Link from "next/link";

type SortKey = "vibeScore" | "name" | "firm";
const PAGE_SIZE = 25;

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("vibeScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [firmFilter, setFirmFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [nameQuery, setNameQuery] = useState("");
  const [showStarred, setShowStarred] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const refreshPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    const data = await fetch("/api/candidates").then((r) => r.json());
    setCandidates(data);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    return () => { if (refreshPollRef.current) clearInterval(refreshPollRef.current); };
  }, []);

  // Reset to page 1 whenever filters change
  useEffect(() => { setPage(1); }, [nameQuery, firmFilter, statusFilter, sortKey, sortDir, showStarred]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/candidates?id=${id}`, { method: "DELETE" });
    setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    load();
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 5) next.add(id);
      return next;
    });
  }

  async function handleFavorite(c: Candidate) {
    const newVal = !c.favorited;
    setCandidates((prev) => prev.map((x) => x.id === c.id ? { ...x, favorited: newVal } : x));
    await fetch("/api/candidates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: c.id, favorited: newVal }),
    });
  }

  async function handleRefreshStarred() {
    if (refreshing) return;
    const starredEnriched = candidates.filter((c) => c.favorited && c.status === "enriched");
    if (!starredEnriched.length) return;

    setRefreshing(true);
    const starredIds = starredEnriched.map((c) => c.id);
    const refreshStart = Date.now();
    starredIds.forEach((id) => fetch(`/api/enrich/${id}`, { method: "POST" }).catch(() => {}));

    refreshPollRef.current = setInterval(async () => {
      const all: Candidate[] = await fetch("/api/candidates").then((r) => r.json());
      setCandidates(all);
      const allDone = starredIds.every((id) => {
        const c = all.find((x) => x.id === id);
        return c && c.enrichedAt && new Date(c.enrichedAt).getTime() > refreshStart;
      });
      if (allDone) {
        clearInterval(refreshPollRef.current!);
        refreshPollRef.current = null;
        setRefreshing(false);
      }
    }, 3000);
  }

  const firms = useMemo(() => [...new Set(candidates.map((c) => c.firm))].sort(), [candidates]);
  const starredCount = useMemo(() => candidates.filter((c) => c.favorited).length, [candidates]);

  const filtered = useMemo(() =>
    candidates
      .filter((c) => !showStarred || c.favorited === true)
      .filter((c) => !firmFilter || c.firm === firmFilter)
      .filter((c) => !statusFilter || c.status === statusFilter)
      .filter((c) => !nameQuery || c.name.toLowerCase().includes(nameQuery.toLowerCase()))
      .sort((a, b) => {
        let va: string | number = a[sortKey] ?? "";
        let vb: string | number = b[sortKey] ?? "";
        if (typeof va === "number" && typeof vb === "number") {
          return sortDir === "asc" ? va - vb : vb - va;
        }
        va = String(va).toLowerCase();
        vb = String(vb).toLowerCase();
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      }),
    [candidates, showStarred, firmFilter, statusFilter, nameQuery, sortKey, sortDir]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const start = (safePage - 1) * PAGE_SIZE + 1;
  const end = Math.min(safePage * PAGE_SIZE, filtered.length);

  const SortBtn = ({ col, label }: { col: SortKey; label: string }) => (
    <button onClick={() => toggleSort(col)}
      className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors">
      {label}
      <ArrowUpDown className={`w-3 h-3 ${sortKey === col ? "text-indigo-400" : ""}`} />
    </button>
  );

  const compareUrl = `/compare?ids=${[...selectedIds].join(",")}`;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Leaderboard</h1>
          <p className="text-slate-400 text-sm mt-1">
            {filtered.length > 0
              ? `Showing ${start}–${end} of ${filtered.length} candidates`
              : `0 of ${candidates.length} candidates`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {showStarred && starredCount > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefreshStarred}
              disabled={refreshing}
              className="gap-1.5"
            >
              {refreshing
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <RefreshCw className="w-3.5 h-3.5" />}
              {refreshing ? "Refreshing…" : "Refresh starred"}
            </Button>
          )}
          <a href="/api/export" className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-700 hover:bg-slate-600 text-sm text-slate-200 transition-colors">
            <Download className="w-4 h-4" />
            Export CSV
          </a>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-3">
          {/* Name search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              value={nameQuery}
              onChange={(e) => setNameQuery(e.target.value)}
              placeholder="Search by name..."
              className="pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-600 rounded-md text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48"
            />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-800 border border-slate-600 rounded-md px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">All statuses</option>
            <option value="enriched">Enriched</option>
            <option value="pending">Pending</option>
            <option value="error">Error</option>
          </select>
          {(nameQuery || firmFilter || statusFilter || showStarred) && (
            <button onClick={() => { setNameQuery(""); setFirmFilter(""); setStatusFilter(""); setShowStarred(false); }}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors px-2">
              Clear filters
            </button>
          )}
        </div>

        {/* Firm + starred pills */}
        {firms.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-0.5">
            {/* Starred pill */}
            <button
              onClick={() => setShowStarred(!showStarred)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                showStarred
                  ? "bg-amber-600 border-amber-500 text-white"
                  : "border-slate-600 text-slate-400 hover:border-slate-400 hover:text-slate-200"
              }`}
            >
              <Star className={`w-3 h-3 ${showStarred ? "fill-white" : ""}`} />
              Starred {starredCount > 0 && `(${starredCount})`}
            </button>

            <button
              onClick={() => setFirmFilter("")}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                firmFilter === ""
                  ? "bg-indigo-600 border-indigo-500 text-white"
                  : "border-slate-600 text-slate-400 hover:border-slate-400 hover:text-slate-200"
              }`}
            >
              All firms
            </button>
            {firms.map((f) => (
              <button
                key={f}
                onClick={() => setFirmFilter(firmFilter === f ? "" : f)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                  firmFilter === f
                    ? "bg-indigo-600 border-indigo-500 text-white"
                    : "border-slate-600 text-slate-400 hover:border-slate-400 hover:text-slate-200"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-slate-700 rounded-lg">
          {showStarred ? (
            <p className="text-slate-400">No starred candidates yet. Click the <Star className="w-3.5 h-3.5 inline" /> on any candidate to add them.</p>
          ) : nameQuery ? (
            <p className="text-slate-400">No candidates match "<span className="text-slate-200">{nameQuery}</span>".</p>
          ) : (
            <p className="text-slate-400">No candidates found. <Link href="/lookup" className="text-indigo-400 hover:underline">Find a PM</Link>.</p>
          )}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-slate-700">
            <table className="w-full text-sm">
              <thead className="bg-slate-800 border-b border-slate-700">
                <tr>
                  <th className="px-3 py-3 w-8">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-slate-600 mx-auto" />
                  </th>
                  <th className="text-left px-4 py-3"><SortBtn col="name" label="Name" /></th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Title</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell"><SortBtn col="firm" label="Firm" /></th>
                  <th className="text-left px-4 py-3"><SortBtn col="vibeScore" label="Score" /></th>
                  <th className="text-left px-4 py-3 hidden sm:table-cell">Label</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Signals</th>
                  <th className="text-left px-4 py-3">Links</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {paginated.map((c) => {
                  const delta = c.status === "enriched" && c.previousScore !== undefined
                    ? c.vibeScore - c.previousScore
                    : 0;
                  return (
                    <tr key={c.id} className={`hover:bg-slate-800/50 transition-colors ${selectedIds.has(c.id) ? "bg-indigo-900/20" : ""}`}>
                      <td className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(c.id)}
                          onChange={() => toggleSelect(c.id)}
                          disabled={!selectedIds.has(c.id) && selectedIds.size >= 5}
                          className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/candidates/${c.id}`} className="font-medium text-slate-100 hover:text-indigo-300 transition-colors">
                          {c.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-400 hidden md:table-cell max-w-[200px] truncate">{c.title}</td>
                      <td className="px-4 py-3 text-slate-400 hidden lg:table-cell">{c.firm}</td>
                      <td className="px-4 py-3">
                        {c.status === "enriched" ? (
                          <div className="flex items-center gap-1.5">
                            {delta !== 0 && (
                              <span className={`text-xs font-semibold ${delta > 0 ? "text-green-400" : "text-red-400"}`}>
                                {delta > 0 ? "+" : ""}{delta}
                              </span>
                            )}
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-bold ${vibeScoreBg(c.vibeScore)}`}>
                              <Zap className="w-3 h-3" />
                              {c.vibeScore}
                            </span>
                          </div>
                        ) : (
                          <Badge variant="muted">{c.status}</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        {c.status === "enriched" && (
                          <span className="text-xs text-slate-400">{vibeScoreLabel(c.vibeScore)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {c.signals.slice(0, 2).map((s, i) => (
                            <span key={i} className="text-xs bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded">{s}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
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
                          <button
                            onClick={() => handleFavorite(c)}
                            className="text-slate-500 hover:text-amber-400 transition-colors"
                            title={c.favorited ? "Remove from favorites" : "Add to favorites"}
                          >
                            <Star className={`w-4 h-4 ${c.favorited ? "fill-amber-400 text-amber-400" : ""}`} />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Button size="icon" variant="ghost"
                          onClick={() => handleDelete(c.id)}
                          className="w-7 h-7 text-slate-600 hover:text-red-400">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-slate-400">
              <span>Page {safePage} of {totalPages}</span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1} className="gap-1">
                  <ChevronLeft className="w-3.5 h-3.5" /> Prev
                </Button>
                <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages} className="gap-1">
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Compare bar */}
      {selectedIds.size >= 2 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur border-t border-slate-700 px-6 py-3 flex items-center justify-between gap-4">
          <span className="text-sm text-slate-300">
            <span className="font-semibold text-slate-100">{selectedIds.size}</span> candidates selected
            {selectedIds.size < 5 && (
              <span className="text-slate-500 ml-1">(up to 5)</span>
            )}
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Clear
            </button>
            <Link
              href={compareUrl}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Compare →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
