"use client";

import { useState, useEffect, useCallback } from "react";
import { Firm, Candidate } from "@/lib/types";
import { FirmCard } from "@/components/FirmCard";
import { Button } from "@/components/ui/button";
import { Plus, Building2 } from "lucide-react";

export default function FirmsPage() {
  const [firms, setFirms] = useState<Firm[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [newFirmName, setNewFirmName] = useState("");
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    const [f, c] = await Promise.all([
      fetch("/api/firms").then((r) => r.json()),
      fetch("/api/candidates").then((r) => r.json()),
    ]);
    setFirms(f);
    setCandidates(c);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newFirmName.trim()) return;
    setAdding(true);
    await fetch("/api/firms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newFirmName.trim(), aliases: [] }),
    });
    setNewFirmName("");
    setShowForm(false);
    setAdding(false);
    load();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/firms?id=${id}`, { method: "DELETE" });
    load();
  }

  const candidatesByFirm = (firmName: string) =>
    candidates.filter((c) => c.firm === firmName);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Target Firms</h1>
          <p className="text-slate-400 text-sm mt-1">{firms.length} firms configured</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Firm
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-slate-800 border border-slate-700 rounded-lg p-4 flex gap-3">
          <input
            type="text"
            value={newFirmName}
            onChange={(e) => setNewFirmName(e.target.value)}
            placeholder="Firm name (e.g. Andreessen Horowitz)"
            className="flex-1 bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            autoFocus
          />
          <Button type="submit" disabled={adding || !newFirmName.trim()}>
            {adding ? "Adding..." : "Add"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
            Cancel
          </Button>
        </form>
      )}

      {firms.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-slate-700 rounded-lg">
          <Building2 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No firms yet. Add one to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {firms.map((firm) => (
            <FirmCard
              key={firm.id}
              firm={firm}
              candidates={candidatesByFirm(firm.name)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
