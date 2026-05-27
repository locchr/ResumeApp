export type FirmSector = "investment_bank" | "retail_bank" | "asset_manager" | "alternatives" | "hedge_fund" | "other";

export const SECTOR_LABELS: Record<FirmSector, string> = {
  investment_bank: "Investment Bank",
  retail_bank: "Retail Bank",
  asset_manager: "Asset Manager",
  alternatives: "Alternatives",
  hedge_fund: "Hedge Fund",
  other: "Other",
};

export interface Firm {
  id: string;
  name: string;
  aliases: string[];
  sector?: FirmSector;
}

export interface ScoreBreakdown {
  githubActivity: number;   // 0-40
  aiToolMentions: number;   // 0-40
  projectsBuilt: number;    // 0-20
}

export interface Evidence {
  text: string;
  url: string;
  title: string;
  category: "github" | "ai_tools" | "projects";
}

export interface Candidate {
  id: string;
  name: string;
  title: string;
  firm: string;
  linkedinUrl?: string;
  githubUsername?: string;
  githubUrl?: string;
  twitterUrl?: string;
  personalSiteUrl?: string;
  vibeScore: number;
  scoreBreakdown: ScoreBreakdown;
  signals: string[];
  evidence: Evidence[];
  assessment: string;
  githubStats?: {
    publicRepos: number;
    followers: number;
    recentCommits: number;
    topLanguages: string[];
    hasRecentActivity: boolean;
    profileUrl: string;
    avatarUrl?: string;
    bio?: string;
  };
  enrichedAt?: string;
  status: 'pending' | 'enriched' | 'error';
  errorMessage?: string;
}
