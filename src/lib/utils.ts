import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function vibeScoreColor(score: number): string {
  if (score >= 70) return "text-emerald-400";
  if (score >= 40) return "text-amber-400";
  return "text-slate-400";
}

export function vibeScoreBg(score: number): string {
  if (score >= 70) return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
  if (score >= 40) return "bg-amber-500/20 text-amber-300 border-amber-500/30";
  return "bg-slate-500/20 text-slate-300 border-slate-500/30";
}

export function vibeScoreLabel(score: number): string {
  if (score >= 80) return "Elite Vibe Coder";
  if (score >= 60) return "Strong Vibe Coder";
  if (score >= 40) return "Emerging Vibe Coder";
  if (score >= 20) return "AI Curious";
  return "Classic PM";
}
