"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Trophy, User, Settings, Download } from "lucide-react";

const nav = [
  { href: "/candidates", label: "Leaderboard", icon: Trophy },
  { href: "/lookup", label: "Find Person", icon: User },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <header className="border-b border-slate-700 bg-slate-900 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-2 font-bold text-slate-100">
          <span className="text-lg">⚡</span>
          <span>VibePM</span>
        </Link>

        <nav className="flex items-center gap-1">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors",
                pathname === href || pathname.startsWith(href + "/")
                  ? "bg-slate-700 text-slate-100"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:block">{label}</span>
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <Link
            href="/firms"
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors",
              pathname === "/firms" || pathname.startsWith("/firms/")
                ? "bg-slate-700 text-slate-100"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            )}
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:block">Firms</span>
          </Link>
          <a
            href="/api/export"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:block">Export</span>
          </a>
        </div>
      </div>
    </header>
  );
}
