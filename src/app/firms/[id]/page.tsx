import { notFound } from "next/navigation";
import { getFirms, getCandidates } from "@/lib/data";
import { SECTOR_LABELS } from "@/lib/types";
import { CandidateCard } from "@/components/CandidateCard";
import { vibeScoreBg } from "@/lib/utils";
import { ArrowLeft, Search, Zap } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function FirmDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [firms, allCandidates] = await Promise.all([getFirms(), getCandidates()]);

  const firm = firms.find((f) => f.id === id);
  if (!firm) notFound();

  const candidates = allCandidates
    .filter((c) => c.firm === firm.name)
    .sort((a, b) => b.vibeScore - a.vibeScore);

  const enriched = candidates.filter((c) => c.status === "enriched");
  const pending = candidates.filter((c) => c.status === "pending");
  const avgScore =
    enriched.length > 0
      ? Math.round(enriched.reduce((s, c) => s + c.vibeScore, 0) / enriched.length)
      : null;

  return (
    <div className="space-y-6">
      <Link href="/firms" className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to firms
      </Link>

      {/* Firm header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">{firm.name}</h1>
          {firm.sector && (
            <p className="text-sm text-indigo-400 mt-0.5">{SECTOR_LABELS[firm.sector]}</p>
          )}
        </div>
        <Link href={`/search?firm=${encodeURIComponent(firm.id)}`}>
          <Button variant="outline" className="gap-2">
            <Search className="w-4 h-4" />
            Search for more
          </Button>
        </Link>
      </div>

      {/* Stats */}
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
          <Link href={`/search?firm=${encodeURIComponent(firm.id)}`}>
            <Button>Search LinkedIn</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Enriched — sorted by score */}
          {enriched.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-slate-300 mb-3">
                Enriched · sorted by vibe score
              </h2>
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

          {/* Pending */}
          {pending.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-medium text-slate-300">Pending enrichment ({pending.length})</h2>
                <Link href={`/search?firm=${encodeURIComponent(firm.id)}`}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                  Enrich on search page →
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {pending.map((c) => (
                  <CandidateCard key={c.id} candidate={c} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
