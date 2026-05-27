"use client";

import { useState } from "react";
import { Candidate } from "@/lib/types";
import { vibeScoreBg, vibeScoreLabel } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScoreBreakdown } from "@/components/ScoreBreakdown";
import { Loader2, Zap } from "lucide-react";
import { GitHubIcon, LinkedInIcon } from "@/components/icons";
import Link from "next/link";

interface Props {
  candidate: Candidate;
  onEnrich?: (id: string) => void;
  enriching?: boolean;
}

export function CandidateCard({ candidate, onEnrich, enriching }: Props) {
  const [expanded, setExpanded] = useState(false);
  const isEnriched = candidate.status === "enriched";
  const isPending = candidate.status === "pending";

  const initials = candidate.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Card className="hover:border-slate-600 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center flex-shrink-0 text-sm font-semibold text-indigo-300">
            {candidate.githubStats?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={candidate.githubStats.avatarUrl} alt={initials} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              initials
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link href={`/candidates/${candidate.id}`} className="font-semibold text-slate-100 hover:text-indigo-300 transition-colors truncate block">
                  {candidate.name}
                </Link>
                <p className="text-sm text-slate-400 truncate">{candidate.title}</p>
                <p className="text-xs text-slate-500">{candidate.firm}</p>
              </div>

              {/* Score badge */}
              {isEnriched && (
                <div className={`flex-shrink-0 px-2.5 py-1 rounded-full border text-xs font-bold ${vibeScoreBg(candidate.vibeScore)}`}>
                  {candidate.vibeScore}
                </div>
              )}
              {isPending && (
                <Badge variant="muted" className="flex-shrink-0">Pending</Badge>
              )}
            </div>

            {/* Assessment */}
            {isEnriched && candidate.assessment && (
              <p className="text-xs text-slate-400 mt-2 italic">"{candidate.assessment}"</p>
            )}

            {/* Score label */}
            {isEnriched && (
              <div className="flex items-center gap-1 mt-1.5">
                <Zap className="w-3 h-3 text-amber-400" />
                <span className="text-xs text-amber-400 font-medium">{vibeScoreLabel(candidate.vibeScore)}</span>
              </div>
            )}

            {/* Signals */}
            {isEnriched && candidate.signals.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {candidate.signals.slice(0, 3).map((s, i) => (
                  <Badge key={i} variant="indigo" className="text-xs">{s}</Badge>
                ))}
                {candidate.signals.length > 3 && (
                  <Badge variant="muted" className="text-xs">+{candidate.signals.length - 3}</Badge>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 mt-3">
              {candidate.linkedinUrl && (
                <a href={candidate.linkedinUrl} target="_blank" rel="noopener noreferrer"
                  className="text-slate-500 hover:text-blue-400 transition-colors">
                  <LinkedInIcon className="w-4 h-4" />
                </a>
              )}
              {candidate.githubUrl && (
                <a href={candidate.githubUrl} target="_blank" rel="noopener noreferrer"
                  className="text-slate-500 hover:text-slate-300 transition-colors">
                  <GitHubIcon className="w-4 h-4" />
                </a>
              )}

              <div className="flex-1" />

              {isEnriched && (
                <button onClick={() => setExpanded(!expanded)}
                  className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
                  {expanded ? "Less" : "Score breakdown"}
                </button>
              )}

              {isPending && onEnrich && (
                <Button size="sm" variant="outline" onClick={() => onEnrich(candidate.id)}
                  disabled={enriching}>
                  {enriching ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                  Enrich
                </Button>
              )}
            </div>

            {/* Expanded breakdown */}
            {expanded && isEnriched && (
              <div className="mt-3 pt-3 border-t border-slate-700">
                <ScoreBreakdown breakdown={candidate.scoreBreakdown} />
                {candidate.githubStats && (
                  <div className="mt-3 text-xs text-slate-500 space-y-0.5">
                    <p>{candidate.githubStats.publicRepos} public repos · {candidate.githubStats.followers} followers</p>
                    {candidate.githubStats.topLanguages.length > 0 && (
                      <p>Languages: {candidate.githubStats.topLanguages.join(", ")}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
