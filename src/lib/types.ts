export interface Firm {
  id: string;
  name: string;
  aliases: string[];
}

export interface ScoreBreakdown {
  githubActivity: number;   // 0-40
  aiToolMentions: number;   // 0-40
  projectsBuilt: number;    // 0-20
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
