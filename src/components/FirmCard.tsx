"use client";

import { Firm, Candidate, SECTOR_LABELS } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Search, Trash2, Users, List, Loader2 } from "lucide-react";
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
  const avgScore =
    enriched.length > 0
      ? Math.round(enriched.reduce((sum, c) => sum + c.vibeScore, 0) / enriched.length)
      : null;

  return (
    <Card className="hover:border-slate-600 transition-colors">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5 text-slate-400" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-100 truncate">{firm.name}</h3>
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
              <Button size="icon" variant="ghost" onClick={() => onDelete(firm.id)}
                className="text-slate-600 hover:text-red-400 w-8 h-8">
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {discoveryStatus && (
          <p className="text-xs text-indigo-300 mt-2">{discoveryStatus}</p>
        )}

        {candidates.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-700">
            <div className="grid grid-cols-3 gap-2 text-center mb-3">
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
            <Link href={`/firms/${firm.id}`}
              className="flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-indigo-300 transition-colors">
              <List className="w-3 h-3" />
              View all PMs
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
