"use client";

import { useState, useEffect, useCallback } from "react";
import { Candidate } from "@/lib/types";
import { vibeScoreBg, vibeScoreLabel } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Download, Trash2, Zap } from "lucide-react";
import { GitHubIcon, LinkedInIcon } from "@/components/icons";
import Link from "next/link";

type SortKey = "vibeScore" | "name" | "firm";

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("vibeScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [firmFilter, setFirmFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const load = useCallback(async () => {
    const data = await fetch("/api/candidates").then((r) => r.json());
    setCandidates(data);
  }, []);

  useEffect(() => { load(); }, [load]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/candidates?id=${id}`, { method: "DELETE" });
    load();
  }

  const firms = [...new Set(candidates.map((c) => c.firm))].sort();

  const filtered = candidates
    .filter((c) => !firmFilter || c.firm === firmFilter)
    .filter((c) => !statusFilter || c.status === statusFilter)
    .sort((a, b) => {
      let va: string | number = a[sortKey] ?? "";
      let vb: string | number = b[sortKey] ?? "";
      if (typeof va === "number" && typeof vb === "number") {
        return sortDir === "asc" ? va - vb : vb - va;
      }
      va = String(va).toLowerCase();
      vb = String(vb).toLowerCase();
      return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    });

  const SortBtn = ({ col, label }: { col: SortKey; label: string }) => (
    <button onClick={() => toggleSort(col)}
      className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors">
      {label}
      <ArrowUpDown className={`w-3 h-3 ${sortKey === col ? "text-indigo-400" : ""}`} />
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Candidates</h1>
          <p className="text-slate-400 text-sm mt-1">{filtered.length} of {candidates.length} candidates</p>
        </div>
        <a href="/api/export" className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-700 hover:bg-slate-600 text-sm text-slate-200 transition-colors">
          <Download className="w-4 h-4" />
          Export CSV
        </a>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select value={firmFilter} onChange={(e) => setFirmFilter(e.target.value)}
          className="bg-slate-800 border border-slate-600 rounded-md px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">All firms</option>
          {firms.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-800 border border-slate-600 rounded-md px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">All statuses</option>
          <option value="enriched">Enriched</option>
          <option value="pending">Pending</option>
          <option value="error">Error</option>
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-slate-700 rounded-lg">
          <p className="text-slate-400">No candidates found. <Link href="/search" className="text-indigo-400 hover:underline">Start a search</Link>.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-slate-800 border-b border-slate-700">
              <tr>
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
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/candidates/${c.id}`} className="font-medium text-slate-100 hover:text-indigo-300 transition-colors">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-400 hidden md:table-cell max-w-[200px] truncate">{c.title}</td>
                  <td className="px-4 py-3 text-slate-400 hidden lg:table-cell">{c.firm}</td>
                  <td className="px-4 py-3">
                    {c.status === "enriched" ? (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-bold ${vibeScoreBg(c.vibeScore)}`}>
                        <Zap className="w-3 h-3" />
                        {c.vibeScore}
                      </span>
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
