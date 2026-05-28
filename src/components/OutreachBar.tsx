"use client";

import { useState } from "react";
import { LinkedInIcon } from "@/components/icons";

const OUTREACH_LABELS: Record<string, string> = {
  none: "Not contacted",
  reached_out: "Reached out",
  responded: "Responded",
  not_interested: "Not interested",
};

const STATUS_PILL: Record<string, string> = {
  reached_out: "bg-amber-500/20 text-amber-400 border border-amber-500/40",
  responded: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40",
  not_interested: "bg-red-500/20 text-red-400 border border-red-500/40",
};

interface Props {
  candidateId: string;
  linkedinUrl?: string;
  outreachStatus?: string;
}

export function OutreachBar({ candidateId, linkedinUrl, outreachStatus: initial }: Props) {
  const [status, setStatus] = useState(initial ?? "none");

  async function updateStatus(next: string) {
    setStatus(next);
    await fetch("/api/candidates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: candidateId, outreachStatus: next }),
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-slate-700">
      {linkedinUrl ? (
        <a
          href={linkedinUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <LinkedInIcon className="w-4 h-4" />
          Message on LinkedIn
        </a>
      ) : (
        <span className="text-sm text-slate-500 italic">No LinkedIn URL on file</span>
      )}

      <div className="flex items-center gap-2 ml-auto">
        {status !== "none" && STATUS_PILL[status] && (
          <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_PILL[status]}`}>
            {OUTREACH_LABELS[status]}
          </span>
        )}
        <select
          value={status}
          onChange={(e) => updateStatus(e.target.value)}
          className="bg-slate-700 border border-slate-600 rounded-md px-2 py-1 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {Object.entries(OUTREACH_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
