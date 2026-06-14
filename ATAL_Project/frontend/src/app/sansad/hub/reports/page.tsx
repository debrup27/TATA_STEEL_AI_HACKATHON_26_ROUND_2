"use client";

import React, { useState, useMemo, useEffect } from "react";
import HubShell from "../components/HubShell";
import { fetchReports } from "@/services/reports";
import { riskLevelColor } from "@/services/sansadOutputs";
import type { MaintenanceReport } from "@/services/sansadOutputs";
import { FileText, Bell, BookOpen, Users, Search, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

const TYPE_META: Record<MaintenanceReport["type"], { label: string; icon: typeof FileText }> = {
  maintenance: { label: "Maintenance Report", icon: FileText },
  abnormal_alert: { label: "Abnormal Alert", icon: Bell },
  decision_summary: { label: "Decision Summary", icon: Users },
  digital_log: { label: "Digital Log", icon: BookOpen },
};

type ReportRow = MaintenanceReport;

export default function IntelligenceReportsPage() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [activeId, setActiveId] = useState("");
  const [filter, setFilter] = useState<MaintenanceReport["type"] | "all">("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchReports()
      .then((rows) => {
        if (cancelled) return;
        const mapped: ReportRow[] = rows.map((r) => ({
          id: r.id,
          code: r.code,
          type: r.type,
          title: r.title,
          asset: r.asset,
          factory: r.factory,
          date: r.date,
          author: r.author,
          audience: r.audience,
          riskLevel: (r.verdict.toLowerCase() as ReportRow["riskLevel"]) || "medium",
          summary: r.summary,
          body: r.reportMarkdown,
        }));
        setReports(mapped);
        if (mapped[0]) setActiveId(mapped[0].id);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load reports");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      const matchType = filter === "all" || r.type === filter;
      const q = search.toLowerCase();
      const matchSearch = !q || r.title.toLowerCase().includes(q) || r.asset.toLowerCase().includes(q) || r.code.toLowerCase().includes(q);
      return matchType && matchSearch;
    });
  }, [filter, search, reports]);

  const active = filtered.find((r) => r.id === activeId) ?? filtered[0];

  if (loading) {
    return (
      <HubShell title="Intelligence Reports" subtitle="Loading reports…">
        <div className="flex items-center justify-center py-24 text-zinc-400 gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-mono uppercase">Fetching maintenance reports</span>
        </div>
      </HubShell>
    );
  }

  if (error) {
    return (
      <HubShell title="Intelligence Reports" subtitle="Structured reports">
        <div className="text-center py-24 text-zinc-500 text-sm">{error}</div>
      </HubShell>
    );
  }

  return (
    <HubShell
      title="Intelligence Reports"
      subtitle="Structured reports · abnormal alerts · decision summaries · digital logbook"
    >
      <div className="max-w-7xl mx-auto h-[calc(100vh-12rem)] flex flex-col gap-4">
        <div className="flex flex-wrap gap-2 items-center">
          {(["all", "maintenance", "abnormal_alert", "decision_summary", "digital_log"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setFilter(t)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase border cursor-pointer transition-colors ${
                filter === t ? "bg-[#1b253c] text-white border-[#1b253c]" : "bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300"
              }`}
            >
              {t === "all" ? "All" : TYPE_META[t].label}
            </button>
          ))}
          <div className="relative flex-1 min-w-[200px] max-w-xs ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reports…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-zinc-200 rounded-xl bg-white focus:outline-none focus:border-orange-300"
            />
          </div>
        </div>

        <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
          <div className="col-span-12 lg:col-span-4 bg-white border border-zinc-200 rounded-2xl overflow-hidden flex flex-col min-h-0">
            <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50 shrink-0">
              <p className="text-[10px] font-black uppercase text-zinc-500">{filtered.length} reports</p>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-zinc-50">
              {filtered.length === 0 ? (
                <p className="p-4 text-sm text-zinc-400 text-center">No reports match filter</p>
              ) : (
                filtered.map((r) => {
                  const meta = TYPE_META[r.type];
                  const Icon = meta.icon;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setActiveId(r.id)}
                      className={`w-full text-left px-4 py-3 hover:bg-zinc-50 transition-colors cursor-pointer ${
                        active?.id === r.id ? "bg-orange-50/60" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="w-3.5 h-3.5 text-zinc-400" />
                        <span className="text-[9px] font-mono text-zinc-400">{r.code}</span>
                      </div>
                      <p className="text-sm font-bold text-zinc-800 line-clamp-2">{r.title}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border ${riskLevelColor(r.riskLevel)}`}>
                          {r.riskLevel}
                        </span>
                        <span className="text-[9px] text-zinc-400">{r.date}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="col-span-12 lg:col-span-8 bg-white border border-zinc-200 rounded-2xl flex flex-col min-h-0 overflow-hidden">
            {active ? (
              <>
                <div className="px-6 py-4 border-b border-zinc-100 shrink-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-mono text-[#f97316] uppercase">{TYPE_META[active.type].label}</p>
                      <h2 className="text-lg font-black text-[#1b253c] mt-0.5" style={{ fontFamily: "var(--font-questrial)" }}>
                        {active.title}
                      </h2>
                      <p className="text-xs text-zinc-500 mt-1">{active.asset} · {active.factory} · {active.author}</p>
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full border ${riskLevelColor(active.riskLevel)}`}>
                      {active.riskLevel}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-600 mt-3 bg-zinc-50 rounded-xl p-3 border border-zinc-100">{active.summary}</p>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-4 prose prose-zinc prose-sm max-w-none">
                  <ReactMarkdown>{active.body}</ReactMarkdown>
                </div>
                <div className="px-6 py-3 border-t border-zinc-100 bg-zinc-50/50 shrink-0 flex justify-between items-center">
                  <span className="text-[10px] text-zinc-400 uppercase font-mono">Audience: {active.audience}</span>
                  <span className="text-[10px] text-zinc-400 font-mono">{active.code}</span>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-zinc-400 text-sm">No reports match filter</div>
            )}
          </div>
        </div>
      </div>
    </HubShell>
  );
}
