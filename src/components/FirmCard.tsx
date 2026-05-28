"use client";

import { Firm, Candidate, SECTOR_LABELS } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Search, Trash2, Users, Loader2 } from "lucide-react";
import Link from "next/link";

interface Props {
  firm: Firm;
  candidates: Candidate[];
  onDiscover?: () => void;
  discovering?: boolean;
  discoveryStatus?: string;
  onDelete?: (id: string) => void;
}

export function FirmCard({ firm, candidates, onDiscover, discovering, discoveryStatus, onDelete }: Props) {
  const enriched = candidates.filter((c) => c.status === "enriched");
  const pending = candidates.filter((c) => c.status === "pending");
  const avgScore =
    enriched.length > 0
      ? Math.round(enriched.reduce((sum, c) => sum + c.vibeScore, 0) / enriched.length)
      : null;

  return (
    <Card className="hover:border-slate-500 transition-colors">
      <CardContent className="p-5">
        {/* Header: icon + name/meta + action buttons */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href={`/firms/${firm.id}`}
              className="w-9 h-9 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center flex-shrink-0 transition-colors"
            >
              <Building2 className="w-5 h-5 text-slate-400" />
            </Link>
            <div className="min-w-0">
              <Link href={`/firms/${firm.id}`}>
                <h3 className="font-semibold text-slate-100 truncate hover:text-indigo-300 transition-colors">
                  {firm.name}
                </h3>
              </Link>
              <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {candidates.length} found
                </span>
                {avgScore !== null && (
                  <span className="text-amber-400 font-medium">avg {avgScore}/100</span>
                )}
                {firm.sector && (
                  <span className="text-indigo-400">{SECTOR_LABELS[firm.sector]}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {onDiscover && (
              <Button
                size="sm"
                variant="outline"
                onClick={onDiscover}
                disabled={discovering}
                className="gap-1.5"
                title={candidates.length === 0 ? "Search LinkedIn for PMs at this firm" : "Search LinkedIn for more PMs"}
              >
                {discovering ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Search className="w-3 h-3" />
                )}
                {candidates.length === 0 ? "Discover" : "More"}
              </Button>
            )}
            {onDelete && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onDelete(firm.id)}
                className="text-slate-600 hover:text-red-400 w-8 h-8"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {discoveryStatus && (
          <p className="text-xs text-indigo-300 mt-2">{discoveryStatus}</p>
        )}

        {/* Stats block — entire section links to firm detail */}
        <Link href={`/firms/${firm.id}`} className="block mt-4 pt-3 border-t border-slate-700 group">
          {candidates.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-lg font-bold text-slate-100">{candidates.length}</p>
                <p className="text-xs text-slate-500">Found</p>
              </div>
              <div>
                <p className="text-lg font-bold text-slate-100">{enriched.length}</p>
                <p className="text-xs text-slate-500">Enriched</p>
              </div>
              <div>
                <p className="text-lg font-bold text-amber-400">{avgScore ?? "—"}</p>
                <p className="text-xs text-slate-500">Avg Score</p>
              </div>
            </div>
          ) : (
            <div className="text-center">
              {pending.length > 0 ? (
                <p className="text-xs text-slate-500">{pending.length} pending enrichment</p>
              ) : (
                <p className="text-xs text-slate-600 italic">Not yet discovered</p>
              )}
            </div>
          )}
          <p className="text-xs text-center text-slate-500 group-hover:text-indigo-300 transition-colors mt-2">
            View all PMs →
          </p>
        </Link>
      </CardContent>
    </Card>
  );
}
