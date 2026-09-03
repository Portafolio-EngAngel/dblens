"use client";

import { useState } from "react";

// ---- Type definitions -------------------------------------------------------

interface SlowQuery {
  query: string;
  calls: number;
  avg_time_ms: number;
  total_time_ms: number;
  rows: number;
}

interface MissingIndex {
  table: string;
  seq_scans: number;
  rows_read: number;
  suggestion: string;
}

interface TableHealth {
  table: string;
  live_rows: number;
  dead_rows: number;
  dead_ratio: number;
  needs_vacuum: boolean;
}

interface AnalysisSummary {
  total_slow_queries: number;
  tables_needing_vacuum: number;
  indexes_to_create: number;
}

interface AnalysisResult {
  connection_ok: boolean;
  database: string;
  slow_queries: SlowQuery[];
  missing_indexes: MissingIndex[];
  table_health: TableHealth[];
  summary: AnalysisSummary;
}

// ---- Sub-components ---------------------------------------------------------

function Spinner() {
  return (
    <div className="relative w-5 h-5">
      <span className="absolute inset-0 rounded-full border-2 border-gray-700" />
      <span className="absolute inset-0 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  colorClass,
  icon,
}: {
  label: string;
  value: number;
  colorClass: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex items-center gap-4 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20 transition-all duration-200">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClass === "text-blue-400" ? "bg-blue-900/30 border border-blue-800/40" : colorClass === "text-amber-400" ? "bg-amber-900/30 border border-amber-800/40" : "bg-red-900/30 border border-red-800/40"}`}>
        {icon}
      </div>
      <div>
        <span className={`text-3xl font-bold tabular-nums ${colorClass}`}>{value}</span>
        <p className="text-sm text-gray-400 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-base font-semibold text-gray-100">{title}</h2>
      {count !== undefined && (
        <span className="text-xs font-mono text-gray-500 bg-gray-800 border border-gray-700 px-2 py-0.5 rounded-full">{count}</span>
      )}
    </div>
  );
}

function EmptyState({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-2">
      <svg className="w-8 h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p className="text-gray-600 text-sm">{label ?? "None detected"}</p>
    </div>
  );
}

function SlowQueriesTable({ rows }: { rows: SlowQuery[] }) {
  if (rows.length === 0) return <EmptyState label="No slow queries detected" />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
            <th className="pb-3 pr-4 font-medium">Query</th>
            <th className="pb-3 pr-4 font-medium text-right whitespace-nowrap">Avg (ms)</th>
            <th className="pb-3 pr-4 font-medium text-right">Calls</th>
            <th className="pb-3 font-medium text-right whitespace-nowrap">Total (ms)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((q, i) => (
            <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors duration-150">
              <td className="py-3 pr-4 max-w-xs">
                <span
                  className="font-mono text-xs text-gray-300 truncate block max-w-xs"
                  title={q.query}
                >
                  {q.query.length > 80 ? q.query.slice(0, 80) + "…" : q.query}
                </span>
              </td>
              <td className="py-3 pr-4 text-right text-blue-400 font-mono text-xs">
                {q.avg_time_ms.toFixed(2)}
              </td>
              <td className="py-3 pr-4 text-right text-gray-300 font-mono text-xs">
                {q.calls.toLocaleString()}
              </td>
              <td className="py-3 text-right text-gray-300 font-mono text-xs">
                {q.total_time_ms.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MissingIndexesTable({ rows }: { rows: MissingIndex[] }) {
  if (rows.length === 0) return <EmptyState label="No missing indexes detected" />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
            <th className="pb-3 pr-4 font-medium">Table</th>
            <th className="pb-3 pr-4 font-medium text-right whitespace-nowrap">Seq Scans</th>
            <th className="pb-3 pr-4 font-medium text-right whitespace-nowrap">Rows Read</th>
            <th className="pb-3 font-medium">Suggested Index</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((idx, i) => (
            <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors duration-150">
              <td className="py-3 pr-4 font-mono text-xs text-gray-300">{idx.table}</td>
              <td className="py-3 pr-4 text-right text-amber-400 font-mono text-xs">
                {idx.seq_scans.toLocaleString()}
              </td>
              <td className="py-3 pr-4 text-right text-gray-300 font-mono text-xs">
                {idx.rows_read.toLocaleString()}
              </td>
              <td className="py-3">
                <code className="text-xs bg-gray-800 text-sky-300 px-2.5 py-1 rounded-lg font-mono block border border-gray-700/60">
                  {idx.suggestion}
                </code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TableHealthTable({ rows }: { rows: TableHealth[] }) {
  if (rows.length === 0) return <EmptyState label="No table health issues detected" />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
            <th className="pb-3 pr-4 font-medium">Table</th>
            <th className="pb-3 pr-4 font-medium text-right whitespace-nowrap">Live Rows</th>
            <th className="pb-3 pr-4 font-medium text-right whitespace-nowrap">Dead Rows</th>
            <th className="pb-3 pr-4 font-medium text-right whitespace-nowrap">Dead %</th>
            <th className="pb-3 font-medium text-right">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t, i) => (
            <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors duration-150">
              <td className="py-3 pr-4 font-mono text-xs text-gray-300">{t.table}</td>
              <td className="py-3 pr-4 text-right text-gray-300 font-mono text-xs">
                {t.live_rows.toLocaleString()}
              </td>
              <td className="py-3 pr-4 text-right text-gray-300 font-mono text-xs">
                {t.dead_rows.toLocaleString()}
              </td>
              <td className="py-3 pr-4 text-right font-mono text-xs text-gray-300">
                {t.dead_ratio.toFixed(1)}%
              </td>
              <td className="py-3 text-right">
                {t.needs_vacuum ? (
                  <span className="inline-flex items-center gap-1 bg-red-900/40 text-red-300 border border-red-700/60 text-xs px-2.5 py-0.5 rounded-full whitespace-nowrap font-medium">
                    Needs VACUUM
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 bg-emerald-900/30 text-emerald-300 border border-emerald-700/50 text-xs px-2.5 py-0.5 rounded-full font-medium">
                    Healthy
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ResultsPanel({ result }: { result: AnalysisResult }) {
  return (
    <div className="mt-10 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="bg-blue-900/40 text-blue-300 border border-blue-700/60 text-sm font-mono px-3 py-1 rounded-full">
          {result.database}
        </span>
        <h1 className="text-xl font-semibold text-gray-100 tracking-tight">Analysis Complete</h1>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          label="Slow Queries"
          value={result.summary.total_slow_queries}
          colorClass="text-blue-400"
          icon={
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <SummaryCard
          label="Missing Indexes"
          value={result.summary.indexes_to_create}
          colorClass="text-amber-400"
          icon={
            <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
        />
        <SummaryCard
          label="Tables Need Vacuum"
          value={result.summary.tables_needing_vacuum}
          colorClass="text-red-400"
          icon={
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Slow Queries */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <SectionHeader title="Slow Queries" count={result.slow_queries.length} />
        <SlowQueriesTable rows={result.slow_queries} />
      </section>

      {/* Missing Indexes */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <SectionHeader title="Missing Indexes" count={result.missing_indexes.length} />
        <MissingIndexesTable rows={result.missing_indexes} />
      </section>

      {/* Table Health */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <SectionHeader title="Table Health" count={result.table_health.length} />
        <TableHealthTable rows={result.table_health} />
      </section>
    </div>
  );
}

// ---- Main page --------------------------------------------------------------

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function HomePage() {
  const [connectionString, setConnectionString] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connectionString.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`${API_URL}/analyses/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connection_string: connectionString.trim() }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      const data: AnalysisResult = await response.json();

      if (!data.connection_ok) {
        setError(
          "Could not connect to the database. Please verify the connection string and ensure the database is reachable."
        );
        return;
      }

      setResult(data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">

      {/* Navbar */}
      <header className="border-b border-gray-800/60 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight">
              <span className="text-white">DB</span>
              <span className="text-blue-400">Lens</span>
            </span>
          </div>
          <span className="text-xs text-gray-600 font-mono hidden sm:block tracking-widest uppercase">
            PostgreSQL Performance Analyzer
          </span>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-gray-950 via-blue-950/20 to-gray-950 pt-20 pb-10 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <span className="inline-block bg-blue-900/40 text-blue-400 border border-blue-800/50 text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full mb-6">
            PostgreSQL Performance
          </span>
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-4">
            <span className="text-white">DB</span>
            <span className="text-blue-400">Lens</span>
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            Analyze your PostgreSQL database performance instantly. Surface slow queries, missing indexes, and table bloat — in one request.
          </p>
        </div>
      </section>

      {/* Main content */}
      <main className="flex-1 px-4 py-10 pb-20">
        <div className="max-w-4xl mx-auto">

          {/* Connection form card */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-2xl mx-auto shadow-2xl shadow-black/40">
            <h2 className="text-base font-semibold text-gray-100 mb-5">Connect to Database</h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="connection-string"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  PostgreSQL Connection String
                </label>
                <div className="relative">
                  <input
                    id="connection-string"
                    type={showPassword ? "text" : "password"}
                    value={connectionString}
                    onChange={(e) => setConnectionString(e.target.value)}
                    placeholder="postgresql://user:password@host:5432/dbname"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 pr-12 text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm transition-all duration-200 hover:border-gray-600"
                    disabled={loading}
                    autoComplete="off"
                    spellCheck={false}
                    aria-describedby="conn-hint"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 focus:outline-none focus:text-gray-300 text-xs font-medium transition-colors duration-200"
                    aria-label={showPassword ? "Hide connection string" : "Show connection string"}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                <p id="conn-hint" className="mt-1.5 text-xs text-gray-600">
                  Your connection string is never stored or logged.
                </p>
              </div>

              {error && (
                <div className="bg-red-900/30 border border-red-700/60 rounded-xl px-4 py-3 text-red-300 text-sm flex items-start gap-3" role="alert">
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !connectionString.trim()}
                className="w-full flex items-center justify-center gap-2.5 bg-blue-600 hover:bg-blue-500 active:scale-95 hover:scale-[1.01] disabled:bg-blue-900/40 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg shadow-blue-900/25 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
              >
                {loading ? (
                  <>
                    <Spinner />
                    Analyzing database…
                  </>
                ) : (
                  "Analyze Database →"
                )}
              </button>
            </form>
          </div>

          {/* Results */}
          {result && <ResultsPanel result={result} />}

          {/* Initial feature cards — shown before first analysis */}
          {!result && !loading && (
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              {[
                {
                  label: "Slow query detection",
                  desc: "Surfaces queries above your latency threshold",
                  icon: (
                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ),
                },
                {
                  label: "Missing index hints",
                  desc: "Flags tables with high sequential scan counts",
                  icon: (
                    <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  ),
                },
                {
                  label: "Bloat & vacuum alerts",
                  desc: "Identifies tables with excessive dead rows",
                  icon: (
                    <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ),
                },
              ].map((item) => (
                <div key={item.label} className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex flex-col items-center gap-3 hover:-translate-y-0.5 hover:border-gray-700 hover:shadow-lg transition-all duration-200">
                  <div className="w-10 h-10 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center">
                    {item.icon}
                  </div>
                  <span className="text-sm font-semibold text-gray-200">{item.label}</span>
                  <span className="text-xs text-gray-500 leading-relaxed">{item.desc}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
