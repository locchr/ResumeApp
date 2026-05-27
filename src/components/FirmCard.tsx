"use client";

import { Firm, Candidate } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Search, Trash2, Users } from "lucide-react";
import Link from "next/link";

interface Props {
  firm: Firm;
  candidates: Candidate[];
  onDelete?: (id: string) => void;
}

export function FirmCard({ firm, candidates, onDelete }: Props) {
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
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Link href={`/search?firm=${encodeURIComponent(firm.id)}`}>
              <Button size="sm" variant="outline" className="gap-1.5">
                <Search className="w-3 h-3" />
                Search
              </Button>
            </Link>
            {onDelete && (
              <Button size="icon" variant="ghost" onClick={() => onDelete(firm.id)}
                className="text-slate-600 hover:text-red-400 w-8 h-8">
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {candidates.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-700">
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}
