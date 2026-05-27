import { notFound } from "next/navigation";
import { getCandidate } from "@/lib/data";
import { vibeScoreBg, vibeScoreLabel } from "@/lib/utils";
import { ScoreBreakdown } from "@/components/ScoreBreakdown";
import { Badge } from "@/components/ui/badge";
import { Globe, ArrowLeft, Zap, Star } from "lucide-react";
import { GitHubIcon, LinkedInIcon } from "@/components/icons";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CandidateProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const candidate = await getCandidate(id);
  if (!candidate) notFound();

  const isEnriched = candidate.status === "enriched";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/candidates" className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to candidates
      </Link>

      {/* Profile header */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-14 h-14 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center flex-shrink-0 text-lg font-semibold text-indigo-300 overflow-hidden">
            {candidate.githubStats?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={candidate.githubStats.avatarUrl} alt="" className="w-14 h-14 object-cover" />
            ) : (
              candidate.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h1 className="text-xl font-bold text-slate-100">{candidate.name}</h1>
                <p className="text-slate-400">{candidate.title}</p>
                <p className="text-sm text-slate-500">{candidate.firm}</p>
              </div>
              {isEnriched && (
                <div className={`px-3 py-1.5 rounded-full border text-sm font-bold ${vibeScoreBg(candidate.vibeScore)}`}>
                  {candidate.vibeScore}/100
                </div>
              )}
            </div>

            {isEnriched && (
              <div className="flex items-center gap-1.5 mt-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="text-sm text-amber-400 font-medium">{vibeScoreLabel(candidate.vibeScore)}</span>
              </div>
            )}

            {/* Links */}
            <div className="flex items-center gap-3 mt-3">
              {candidate.linkedinUrl && (
                <a href={candidate.linkedinUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-blue-400 transition-colors">
                  <LinkedInIcon className="w-4 h-4" />
                  LinkedIn
                </a>
              )}
              {candidate.githubUrl && (
                <a href={candidate.githubUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors">
                  <GitHubIcon className="w-4 h-4" />
                  GitHub
                </a>
              )}
              {candidate.personalSiteUrl && (
                <a href={candidate.personalSiteUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors">
                  <Globe className="w-4 h-4" />
                  Website
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Assessment */}
        {isEnriched && candidate.assessment && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            <p className="text-sm text-slate-300 italic">"{candidate.assessment}"</p>
          </div>
        )}
      </div>

      {/* Score breakdown */}
      {isEnriched && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-slate-200">Vibe Score Breakdown</h2>
          <ScoreBreakdown
            breakdown={candidate.scoreBreakdown}
            evidence={candidate.evidence ?? []}
            githubUrl={candidate.githubUrl}
          />
          <div className="grid grid-cols-3 gap-3 pt-2">
            {[
              { label: "GitHub", value: candidate.scoreBreakdown.githubActivity, max: 40 },
              { label: "AI Signals", value: candidate.scoreBreakdown.aiToolMentions, max: 40 },
              { label: "Projects", value: candidate.scoreBreakdown.projectsBuilt, max: 20 },
            ].map(({ label, value, max }) => (
              <div key={label} className="bg-slate-900 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-slate-100">{value}<span className="text-sm text-slate-500">/{max}</span></p>
                <p className="text-xs text-slate-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GitHub stats */}
      {candidate.githubStats && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-slate-200 flex items-center gap-2">
            <GitHubIcon className="w-4 h-4" />
            GitHub Activity
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-900 rounded-lg p-3">
              <p className="text-xl font-bold text-slate-100">{candidate.githubStats.publicRepos}</p>
              <p className="text-xs text-slate-500">Public repos</p>
            </div>
            <div className="bg-slate-900 rounded-lg p-3">
              <p className="text-xl font-bold text-slate-100">{candidate.githubStats.followers}</p>
              <p className="text-xs text-slate-500">Followers</p>
            </div>
            <div className="bg-slate-900 rounded-lg p-3">
              <p className="text-xl font-bold text-slate-100">{candidate.githubStats.recentCommits}</p>
              <p className="text-xs text-slate-500">Recent commits (6mo)</p>
            </div>
            <div className="bg-slate-900 rounded-lg p-3">
              <p className="text-xl font-bold text-slate-100">
                {candidate.githubStats.hasRecentActivity ? "✓" : "✗"}
              </p>
              <p className="text-xs text-slate-500">Recent activity</p>
            </div>
          </div>
          {candidate.githubStats.topLanguages.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 mb-2">Top languages</p>
              <div className="flex flex-wrap gap-2">
                {candidate.githubStats.topLanguages.map((lang) => (
                  <Badge key={lang} variant="indigo">{lang}</Badge>
                ))}
              </div>
            </div>
          )}
          {candidate.githubStats.bio && (
            <p className="text-sm text-slate-400 border-t border-slate-700 pt-3">
              {candidate.githubStats.bio}
            </p>
          )}
        </div>
      )}

      {/* Evidence sources */}
      {(candidate.evidence ?? []).length > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-3">
          <h2 className="font-semibold text-slate-200 flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-400" />
            All Sources
          </h2>
          <div className="space-y-2">
            {(candidate.evidence ?? []).map((e, i) => (
              <a
                key={i}
                href={e.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2 p-2 rounded-lg hover:bg-slate-700 transition-colors group"
              >
                <span className={`mt-0.5 flex-shrink-0 w-2 h-2 rounded-full ${
                  e.category === "github" ? "bg-blue-400" :
                  e.category === "ai_tools" ? "bg-purple-400" : "bg-emerald-400"
                }`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-200 group-hover:text-indigo-300 truncate transition-colors">{e.title}</p>
                  <p className="text-xs text-slate-500 truncate">{e.url}</p>
                </div>
                <Badge variant={e.category === "github" ? "indigo" : e.category === "ai_tools" ? "default" : "success"} className="flex-shrink-0 text-xs">
                  {e.category === "github" ? "GitHub" : e.category === "ai_tools" ? "AI Signal" : "Project"}
                </Badge>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Status */}
      {candidate.status === "pending" && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 text-center">
          <p className="text-slate-400 text-sm">This candidate hasn't been enriched yet.</p>
          <p className="text-slate-500 text-xs mt-1">Go to the Search page and click "Enrich" to analyze their vibe coding profile.</p>
        </div>
      )}
    </div>
  );
}
