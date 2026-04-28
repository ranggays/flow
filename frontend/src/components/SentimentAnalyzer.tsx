"use client";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

// types
interface SentimentDistribution {
  positive: number;
  negative: number;
  neutral: number;
}

interface SentimentSamples {
  positive: string[];
  negative: string[];
  neutral: string[];
}

interface AnalysisData {
  total_analyzed: number;
  sentiment_distribution: SentimentDistribution;
  sentiment_samples?: SentimentSamples;
  summary: string;
}

interface SocialListeningResponse {
  success: boolean;
  data: AnalysisData;
}

type Platform = "youtube" | "tiktok" | null;
type Phase = "idle" | "analyzing" | "results" | "error";

// helpers
function detectPlatform(url: string): Platform {
  if (/youtube\.com|youtu\.be/i.test(url)) return "youtube";
  if (/tiktok\.com/i.test(url)) return "tiktok";
  return null;
}

function pct(n: number, total: number) {
  return total > 0 ? Math.round((n / total) * 100) : 0;
}

const SENTIMENTS = [
  {
    key: "positive" as const,
    label: "Positif",
    barColor: "bg-emerald-500",
    textColor: "text-emerald-700",
    bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
    borderColor: "border-emerald-200 dark:border-emerald-800",
    chipColor: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
    dotColor: "bg-emerald-500",
  },
  {
    key: "negative" as const,
    label: "Negatif",
    barColor: "bg-red-500",
    textColor: "text-red-700",
    bgColor: "bg-red-50 dark:bg-red-900/20",
    borderColor: "border-red-200 dark:border-red-800",
    chipColor: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300",
    dotColor: "bg-red-500",
  },
  {
    key: "neutral" as const,
    label: "Netral",
    barColor: "bg-slate-400",
    textColor: "text-slate-600",
    bgColor: "bg-slate-50 dark:bg-slate-800/50",
    borderColor: "border-slate-200 dark:border-slate-700",
    chipColor: "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300",
    dotColor: "bg-slate-400",
  },
];

const ANALYZE_STEPS = [
  "Menghubungi server & scraping komentar...",
  "Analisis sentimen dengan model Pre-Trained...",
  "Merangkum hasil dengan AI...",
];


// chart 
function DonutChart({ dist, total }: { dist: SentimentDistribution; total: number }) {
  const cx = 60, cy = 60, r = 46, strokeW = 14;
  const circumference = 2 * Math.PI * r;

  const segments = [
    { value: dist.positive, color: "#22c55e" },
    { value: dist.negative, color: "#ef4444" },
    { value: dist.neutral, color: "#94a3b8" },
  ];

  let offset = circumference * 0.25;
  const arcs = segments.map(seg => {
    const len = total > 0 ? (seg.value / total) * circumference : 0;
    const arc = { ...seg, dashOffset: offset, dashLen: len - 2 };
    offset += len;
    return arc;
  });

  const dominantSentiment = SENTIMENTS.reduce((a, b) =>
    dist[a.key] >= dist[b.key] ? a : b
  );
  const dominantPct = pct(dist[dominantSentiment.key], total);

  return (
    <div className="relative flex items-center justify-center">
      <svg viewBox="0 0 120 120" className="w-36 h-36 -rotate-90">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeWidth={strokeW} className="text-slate-100 dark:text-slate-800" />
        {arcs.map((arc, i) => (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={arc.color}
            strokeWidth={strokeW}
            strokeDasharray={`${arc.dashLen} ${circumference}`}
            strokeDashoffset={-arc.dashOffset + circumference}
            strokeLinecap="butt"
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className={cn("text-xl font-bold", dominantSentiment.textColor)}>{dominantPct}%</span>
        <span className="text-[10px] text-slate-500 font-medium">{dominantSentiment.label}</span>
      </div>
    </div>
  );
}

// sample comment 
function SampleComments({
  samples,
  dist,
  total,
}: {
  samples: SentimentSamples;
  dist: SentimentDistribution;
  total: number;
}) {
  const [activeTab, setActiveTab] = useState<"positive" | "negative" | "neutral">(
    SENTIMENTS.reduce((a, b) => dist[a.key] >= dist[b.key] ? a : b).key
  );

  const activeSentiment = SENTIMENTS.find(s => s.key === activeTab)!;
  const activeComments = samples[activeTab] ?? [];

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <div className="w-5 h-5 rounded bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
          <span className="material-symbols-outlined text-slate-500 text-[12px]">comment</span>
        </div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sampel Komentar</p>
      </div>

      <div className="flex gap-1.5 px-3 pb-2">
        {SENTIMENTS.map(s => {
          const count = dist[s.key];
          const isActive = activeTab === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setActiveTab(s.key)}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all",
                isActive
                  ? s.chipColor + " ring-1 ring-inset " + s.borderColor
                  : "bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
              )}
            >
              <span className={cn("w-1.5 h-1.5 rounded-full", isActive ? s.dotColor : "bg-slate-300 dark:bg-slate-600")} />
              {s.label}
              <span className={cn(
                "ml-0.5 text-[10px] font-bold",
                isActive ? s.textColor : "text-slate-400"
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="px-3 pb-3 space-y-1.5 max-h-48 overflow-y-auto">
        {activeComments.length === 0 ? (
          <p className="text-[11px] text-slate-400 italic py-2 text-center">Tidak ada sampel komentar</p>
        ) : (
          activeComments.map((comment, i) => (
            <div
              key={i}
              className={cn(
                "flex items-start gap-2 px-2.5 py-2 rounded-lg border text-xs",
                activeSentiment.bgColor,
                activeSentiment.borderColor
              )}
            >
              <span className={cn("w-1.5 h-1.5 rounded-full mt-1.5 shrink-0", activeSentiment.dotColor)} />
              <p className="text-slate-700 dark:text-slate-300 leading-snug">{comment}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// main component
export default function SentimentAnalyzer({ workspaceId }: { workspaceId: string }) {
  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [stepIdx, setStepIdx] = useState(0);
  const [result, setResult] = useState<AnalysisData | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const stepTimer = useRef<NodeJS.Timeout | null>(null);

  const platform = detectPlatform(url);

  useEffect(() => () => { if (stepTimer.current) clearInterval(stepTimer.current); }, []);

  const handleAnalyze = async () => {
    if (!url.trim() || !platform || phase === "analyzing") return;
    setPhase("analyzing");
    setResult(null);
    setErrorMsg("");
    setStepIdx(0);

    stepTimer.current = setInterval(() => {
      setStepIdx(prev => Math.min(prev + 1, ANALYZE_STEPS.length - 1));
    }, 4000);

    try {
      const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

      const endpoint = platform === "youtube"
        ? `${BASE_URL}/api/social-listening/youtube`
        : `${BASE_URL}/api/social-listening/tiktok`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const json: SocialListeningResponse = await res.json();

      if (!res.ok || !json.success) {
        throw new Error((json as unknown as { detail: string }).detail || "Analisis gagal.");
      }

      setResult(json.data);
      setPhase("results");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan.");
      setPhase("error");
    } finally {
      if (stepTimer.current) clearInterval(stepTimer.current);
    }
  };

  const handleReset = () => {
    setPhase("idle");
    setUrl("");
    setResult(null);
    setErrorMsg("");
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-900">
      <div className="flex-1 overflow-y-auto p-3 space-y-3">

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex flex-col gap-2.5 shadow-sm">
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-[16px] pointer-events-none">link</span>
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAnalyze()}
                disabled={phase === "analyzing"}
                placeholder="Paste link YouTube atau TikTok..."
                className={cn(
                  "w-full text-sm pl-8 py-2 rounded-lg border bg-white dark:bg-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 transition-all",
                  platform ? "pr-24" : "pr-3",
                  "border-slate-200 dark:border-slate-700"
                )}
              />
              {platform && (
                <span className={cn(
                  "absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold",
                  platform === "youtube" ? "text-red-600" : "text-slate-700 dark:text-slate-300"
                )}>
                  {platform === "youtube" ? "YouTube" : "TikTok"}
                </span>
              )}
            </div>

            <button
              onClick={handleAnalyze}
              disabled={phase === "analyzing" || !url.trim() || !platform}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-700 text-white text-xs font-semibold hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              {phase === "analyzing"
                ? <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                : <span className="material-symbols-outlined text-[16px]">analytics</span>
              }
              {phase === "analyzing" ? "Proses..." : "Analisis"}
            </button>
          </div>

          {url && !platform && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">warning</span>
              Hanya mendukung link YouTube dan TikTok
            </p>
          )}

          {phase === "analyzing" && (
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <div className="flex gap-1">
                {[0, 0.15, 0.3].map((d, i) => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: `${d}s` }} />
                ))}
              </div>
              <span className="transition-all">{ANALYZE_STEPS[stepIdx]}</span>
            </div>
          )}
        </div>

        {phase === "error" && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 flex items-start gap-2.5">
            <span className="material-symbols-outlined text-red-500 text-[18px] shrink-0 mt-0.5">error</span>
            <div>
              <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-0.5">Analisis gagal</p>
              <p className="text-[11px] text-red-600 dark:text-red-400/80">{errorMsg}</p>
              <button onClick={handleReset} className="mt-2 text-[11px] font-semibold text-red-700 dark:text-red-400 hover:underline">
                Coba lagi
              </button>
            </div>
          </div>
        )}

        {phase === "results" && result && (() => {
          const { total_analyzed: total, sentiment_distribution: dist, sentiment_samples, summary } = result;
          return (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">

              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Total Dianalisis", value: total.toLocaleString("id-ID"), sub: "komentar" },
                  {
                    label: "Sentimen Dominan",
                    value: SENTIMENTS.reduce((a, b) => dist[a.key] >= dist[b.key] ? a : b).label,
                    sub: `${pct(dist[SENTIMENTS.reduce((a, b) => dist[a.key] >= dist[b.key] ? a : b).key], total)}% dari total`,
                  },
                ].map((stat, i) => (
                  <div key={i} className="bg-slate-100 dark:bg-slate-800 rounded-xl p-3 text-center">
                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">{stat.label}</p>
                    <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{stat.value}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{stat.sub}</p>
                  </div>
                ))}
              </div>

              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Distribusi Sentimen</p>
                <div className="flex items-center gap-4">
                  <DonutChart dist={dist} total={total} />
                  <div className="flex-1 space-y-3">
                    {SENTIMENTS.map(s => {
                      const p = pct(dist[s.key], total);
                      return (
                        <div key={s.key}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{s.label}</span>
                            <div className="flex items-baseline gap-1">
                              <span className={cn("text-xs font-bold", s.textColor)}>{p}%</span>
                              <span className="text-[10px] text-slate-400">{dist[s.key]}</span>
                            </div>
                          </div>
                          <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all duration-700", s.barColor)}
                              style={{ width: `${p}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-3 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 justify-center flex-wrap">
                  {SENTIMENTS.map(s => (
                    <div key={s.key} className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <div className={cn("w-2.5 h-2.5 rounded-sm", s.barColor)} />
                      {s.label} · {pct(dist[s.key], total)}%
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {SENTIMENTS.map(s => (
                  <div key={s.key} className={cn("rounded-xl p-3 border text-center", s.bgColor, s.borderColor)}>
                    <p className={cn("text-[10px] font-bold uppercase tracking-wider mb-1", s.textColor)}>{s.label}</p>
                    <p className={cn("text-xl font-bold", s.textColor)}>{dist[s.key]}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{pct(dist[s.key], total)}%</p>
                  </div>
                ))}
              </div>

              {sentiment_samples && (
                <SampleComments
                  samples={sentiment_samples}
                  dist={dist}
                  total={total}
                />
              )}

              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-5 h-5 rounded bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                    <span className="material-symbols-outlined text-blue-600 text-[12px]">auto_awesome</span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kesimpulan AI</p>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{summary}</p>
              </div>

              <button
                onClick={handleReset}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <span className="material-symbols-outlined text-[15px]">refresh</span>
                Analisis link lain
              </button>
            </div>
          );
        })()}

        {phase === "idle" && (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <span className="material-symbols-outlined text-slate-500 text-2xl">sentiment_very_satisfied</span>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Analisis Sentimen Komentar</p>
              <p className="text-xs text-slate-400 mt-1">Pre-trained Model · YouTube & TikTok</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}