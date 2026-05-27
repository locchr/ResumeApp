import { GitHubStats } from "./github";
import { ScoreBreakdown } from "./types";

const AI_TOOLS = [
  "cursor",
  "copilot",
  "claude",
  "v0",
  "bolt",
  "lovable",
  "replit",
  "windsurf",
  "codeium",
  "tabnine",
  "devin",
];

const VIBE_CODING_PHRASES = [
  "vibe cod",
  "built with ai",
  "building with ai",
  "ai-powered app",
  "shipped with ai",
  "no-code ai",
  "prompt engineer",
  "ai native",
  "llm app",
];

export function scoreGitHubActivity(stats: GitHubStats | null | undefined): number {
  if (!stats) return 0;
  let score = 0;

  // Has public GitHub profile: +10
  score += 10;

  // Recent commits in last 6 months: +10
  if (stats.hasRecentActivity) score += 10;

  // 5+ public repos: +10
  if (stats.publicRepos >= 5) score += 10;

  // AI-adjacent languages (Python, JS/TS): +10
  const aiLanguages = ["Python", "TypeScript", "JavaScript", "Jupyter Notebook"];
  if (stats.topLanguages.some((l) => aiLanguages.includes(l))) score += 10;

  return Math.min(score, 40);
}

export function scoreAIToolMentions(signals: string[]): number {
  const combined = signals.join(" ").toLowerCase();
  let score = 0;

  for (const tool of AI_TOOLS) {
    if (combined.includes(tool)) score += 8;
  }

  for (const phrase of VIBE_CODING_PHRASES) {
    if (combined.includes(phrase)) score += 16;
  }

  return Math.min(score, 40);
}

export function scoreProjectsBuilt(signals: string[]): number {
  const combined = signals.join(" ").toLowerCase();
  let score = 0;

  if (
    combined.includes("portfolio") ||
    combined.includes("personal site") ||
    combined.includes("built") ||
    combined.includes("side project") ||
    combined.includes("launched")
  ) {
    score += 10;
  }

  if (combined.includes("product hunt")) score += 10;

  return Math.min(score, 20);
}

export function calculateVibeScore(
  githubStats: GitHubStats | null | undefined,
  signals: string[]
): { vibeScore: number; scoreBreakdown: ScoreBreakdown } {
  const githubActivity = scoreGitHubActivity(githubStats);
  const aiToolMentions = scoreAIToolMentions(signals);
  const projectsBuilt = scoreProjectsBuilt(signals);

  const vibeScore = githubActivity + aiToolMentions + projectsBuilt;

  return {
    vibeScore: Math.min(vibeScore, 100),
    scoreBreakdown: { githubActivity, aiToolMentions, projectsBuilt },
  };
}

export function extractSignalsFromSearchResults(
  results: Array<{ title: string; snippet: string; link: string }>
): string[] {
  const signals: string[] = [];
  const combined = results.map((r) => `${r.title} ${r.snippet}`).join(" ").toLowerCase();

  for (const tool of AI_TOOLS) {
    if (combined.includes(tool)) {
      signals.push(`Mentions ${tool.charAt(0).toUpperCase() + tool.slice(1)}`);
    }
  }

  for (const phrase of VIBE_CODING_PHRASES) {
    if (combined.includes(phrase)) {
      signals.push(`Found "${phrase}" reference`);
    }
  }

  if (combined.includes("github.com")) signals.push("Has GitHub presence");
  if (combined.includes("product hunt")) signals.push("Active on Product Hunt");
  if (combined.includes("twitter") || combined.includes("x.com")) signals.push("Active on Twitter/X");

  return [...new Set(signals)];
}
