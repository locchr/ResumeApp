import { GitHubStats } from "./github";
import { Evidence, ScoreBreakdown } from "./types";

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
  "ai-first",
  "building with llm",
];

export function scoreGitHubActivity(stats: GitHubStats | null | undefined): number {
  if (!stats) return 0;
  let score = 0;

  // Has public GitHub profile: +10
  score += 10;

  // Recent commits in last 6 months: +10
  if (stats.hasRecentActivity) score += 10;

  // 5+ public repos: +5
  if (stats.publicRepos >= 5) score += 5;

  // AI-adjacent languages (Python, JS/TS): +5
  const aiLanguages = ["Python", "TypeScript", "JavaScript", "Jupyter Notebook"];
  if (stats.topLanguages.some((l) => aiLanguages.includes(l))) score += 5;

  // AI-adjacent repos (topics or name/description): strong builder signal
  if (stats.aiTopicRepos >= 3) score += 10;
  else if (stats.aiTopicRepos >= 1) score += 5;

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

export function scoreProjectsBuilt(
  signals: string[],
  githubStats?: GitHubStats | null
): number {
  const combined = signals.join(" ").toLowerCase();
  let score = 0;

  const hasPortfolio =
    combined.includes("portfolio") ||
    combined.includes("personal site") ||
    combined.includes("built") ||
    combined.includes("side project") ||
    combined.includes("launched") ||
    (githubStats?.deployedApps ?? 0) > 0 ||
    !!githubStats?.personalWebsite;

  if (hasPortfolio) score += 10;

  if (combined.includes("product hunt")) score += 10;

  return Math.min(score, 20);
}

export function calculateVibeScore(
  githubStats: GitHubStats | null | undefined,
  signals: string[]
): { vibeScore: number; scoreBreakdown: ScoreBreakdown } {
  const githubActivity = scoreGitHubActivity(githubStats);
  const aiToolMentions = scoreAIToolMentions(signals);
  const projectsBuilt = scoreProjectsBuilt(signals, githubStats);

  const vibeScore = githubActivity + aiToolMentions + projectsBuilt;

  return {
    vibeScore: Math.min(vibeScore, 100),
    scoreBreakdown: { githubActivity, aiToolMentions, projectsBuilt },
  };
}

export function extractEvidenceFromSearchResults(
  results: Array<{ title: string; snippet: string; link: string }>,
  githubUrl?: string
): Evidence[] {
  const evidence: Evidence[] = [];
  const seen = new Set<string>();

  const add = (item: Evidence) => {
    if (!seen.has(item.url)) {
      seen.add(item.url);
      evidence.push(item);
    }
  };

  if (githubUrl) {
    add({ text: "GitHub profile", url: githubUrl, title: "GitHub profile", category: "github" });
  }

  for (const r of results) {
    const combined = `${r.title} ${r.snippet}`.toLowerCase();

    if (r.link.includes("github.com") && !r.link.includes("github.com/sponsors")) {
      add({ text: "GitHub activity", url: r.link, title: r.title, category: "github" });
      continue;
    }

    if (r.link.includes("medium.com")) {
      add({ text: "Medium article", url: r.link, title: r.title, category: "ai_tools" });
      continue;
    }

    if (r.link.includes("reddit.com")) {
      add({ text: "Reddit discussion", url: r.link, title: r.title, category: "ai_tools" });
      continue;
    }

    if (r.link.includes("producthunt.com")) {
      add({ text: "Product Hunt", url: r.link, title: r.title, category: "projects" });
      continue;
    }

    for (const tool of AI_TOOLS) {
      if (combined.includes(tool)) {
        add({ text: `Mentions ${tool.charAt(0).toUpperCase() + tool.slice(1)}`, url: r.link, title: r.title, category: "ai_tools" });
        break;
      }
    }

    for (const phrase of VIBE_CODING_PHRASES) {
      if (combined.includes(phrase)) {
        add({ text: `"${phrase}" reference`, url: r.link, title: r.title, category: "ai_tools" });
        break;
      }
    }

    if (
      combined.includes("portfolio") ||
      combined.includes("side project") ||
      combined.includes("launched")
    ) {
      add({ text: "Project or portfolio", url: r.link, title: r.title, category: "projects" });
    }
  }

  return evidence.slice(0, 12);
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

  const linkedinResults = results.filter((r) => r.link.includes("linkedin.com"));
  if (linkedinResults.some((r) => `${r.title} ${r.snippet}`.toLowerCase().match(/ai|cursor|claude|copilot|llm|vibe/))) {
    signals.push("Active on LinkedIn about AI");
  }

  if (results.some((r) => r.link.includes("medium.com"))) {
    signals.push("Medium author on AI");
  }

  if (results.some((r) => r.link.includes("reddit.com") && `${r.title} ${r.snippet}`.toLowerCase().match(/ai|cursor|claude|llm|vibe/))) {
    signals.push("Reddit AI contributor");
  }

  return [...new Set(signals)];
}
