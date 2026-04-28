"use client"
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

// types
type Phase = "idle" | "analyzing" | "results";
type SearchTab = "pro" | "con";
type HoaxVerdict = "VALID" | "HOAX" | "MISLEADING" | "UNVERIFIED";

interface HoaxCheck {
  verdict: HoaxVerdict;
  confidence: number;
  reasoning: string;
}

interface AnalysisResult {
  platform: string;
  contentType: string;
  summary: string;
  mainClaim?: string;
  keyPoints: string[];
  hoaxCheck: HoaxCheck;
  keywords: string[];
}

interface SearchItem {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

interface SearchResults {
  pro: SearchItem[];
  con: SearchItem[];
}

interface ChatMessage {
  role: "user" | "ai";
  content: string;
}

// helpers
function detectPlatform(url: string): { icon: string; label: string; color: string } {
  if (/youtube\.com|youtu\.be/i.test(url))   return { icon: "smart_display",   label: "YouTube",   color: "text-red-500"    };
  if (/instagram\.com/i.test(url))           return { icon: "photo_camera",    label: "Instagram", color: "text-pink-500"   };
  if (/tiktok\.com/i.test(url))              return { icon: "music_video",     label: "TikTok",    color: "text-slate-800"  };
  if (/x\.com|twitter\.com/i.test(url))      return { icon: "alternate_email", label: "X / Twitter", color: "text-blue-500" };
  return { icon: "link", label: "Web", color: "text-slate-500" };
}

const verdictConfig: Record<HoaxVerdict, { label: string; bg: string; text: string; icon: string }> = {
  VALID:       { label: "Terverifikasi Valid",   bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", icon: "verified"         },
  HOAX:        { label: "Terindikasi Hoaks",     bg: "bg-red-50 border-red-200",         text: "text-red-700",     icon: "gpp_bad"          },
  MISLEADING:  { label: "Menyesatkan",           bg: "bg-amber-50 border-amber-200",     text: "text-amber-700",   icon: "warning"          },
  UNVERIFIED:  { label: "Belum Terverifikasi",   bg: "bg-slate-50 border-slate-200",     text: "text-slate-600",   icon: "help"             },
};

// badge
function PlatformBadge({ url }: { url: string }) {
  const p = detectPlatform(url);
  return (
    <span className={cn("flex items-center gap-1 text-xs font-medium", p.color)}>
      <span className="material-symbols-outlined text-[14px]">{p.icon}</span>
      {p.label}
    </span>
  );
}

function HoaxBadge({ verdict, confidence }: { verdict: HoaxVerdict; confidence: number }) {
  const cfg = verdictConfig[verdict];
  return (
    <div className={cn("flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold", cfg.bg, cfg.text)}>
      <span className="material-symbols-outlined text-[18px]">{cfg.icon}</span>
      <span>{cfg.label}</span>
      <span className="ml-auto text-xs opacity-70">{confidence}% yakin</span>
    </div>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  const color = value >= 70 ? "bg-emerald-500" : value >= 40 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
      <div className={cn("h-full rounded-full transition-all duration-700", color)} style={{ width: `${value}%` }} />
    </div>
  );
}

function SearchCard({ item }: { item: SearchItem }) {
  const safeGoogleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(item.title + " " + item.source)}`;
  return (
    <a
      href={safeGoogleSearchUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block group p-3 rounded-xl border border-slate-200 bg-white hover:border-blue-200 hover:shadow-md transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-xs font-semibold text-slate-800 group-hover:text-blue-700 line-clamp-2 leading-snug flex-1">
          {item.title}
        </p>
        <span className="material-symbols-outlined text-[14px] text-slate-400 group-hover:text-blue-500 shrink-0 mt-0.5">search</span>
      </div>
      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed mb-1.5">{item.snippet}</p>
      <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{item.source}</span>
    </a>
  );
}

// main
export default function WebAnalyzer({ workspaceId }: { workspaceId: string }) {
  const [url, setUrl]                       = useState("");
  const [phase, setPhase]                   = useState<Phase>("idle");
  const [analysisStep, setAnalysisStep]     = useState("");
  const [analysis, setAnalysis]             = useState<AnalysisResult | null>(null);
  const [searchResults, setSearchResults]   = useState<SearchResults>({ pro: [], con: [] });
  const [activeTab, setActiveTab]           = useState<SearchTab>("pro");
  const [isSearching, setIsSearching]       = useState(false);
  const [chatMessages, setChatMessages]     = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput]           = useState("");
  const [isChatLoading, setIsChatLoading]   = useState(false);
  const [showChat, setShowChat]             = useState(false);
  const chatEndRef  = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isChatLoading]);

  const handleAnalyze = async () => {
    if (!url.trim()) return;

    setPhase("analyzing");
    setAnalysis(null);
    setSearchResults({ pro: [], con: [] });
    setChatMessages([]);
    setIsSearching(true);

    try {
      setAnalysisStep("Mengekstrak transkrip, mencari fakta, & menganalisis hoaks...");
      const res = await fetch("/api/v1/web-analyzer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "analyze", url }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      setAnalysis(json.data);
      setSearchResults(json.data.searchResults);
      setPhase("results");

      // setIsSearching(true);
      // setAnalysisStep("Mencari artikel pendukung & kontra...");
      // const searchRes = await fetch("/api/v1/web-analyzer", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ action: "search", keywords: json.data.keywords }),
      // });
      // const searchJson = await searchRes.json();
      // if (searchJson.success) setSearchResults(searchJson.data);

    } catch (err) {
      console.error(err);
      setPhase("idle");
      alert("Gagal melakukan analisis web: " + (err instanceof Error ? err.message : err));
    } finally {
      setIsSearching(false);
    }
  };

  const handleChat = async () => {
    if (!chatInput.trim() || isChatLoading || !analysis) return;
    const userMsg: ChatMessage = { role: "user", content: chatInput };
    const newMessages = [...chatMessages, userMsg];
    setChatMessages(newMessages);
    setChatInput("");
    setIsChatLoading(true);

    try {
      const analysisContext = `
URL: ${url}
Platform: ${analysis.platform}
Klaim utama: ${analysis.mainClaim || "Tidak ada klaim spesifik"}
Ringkasan: ${analysis.summary}

HASIL CEK FAKTA:
Status: ${analysis.hoaxCheck.verdict} (${analysis.hoaxCheck.confidence}% yakin)
Alasan: ${analysis.hoaxCheck.reasoning}

ARTIKEL PENDUKUNG (PRO):
${searchResults.pro.map((i, idx) => `[${idx + 1}] ${i.title} (${i.source}) - ${i.snippet}`).join("\n")}

ARTIKEL PEMBANTAH (KONTRA):
${searchResults.con.map((i, idx) => `[${idx + 1}] ${i.title} (${i.source}) - ${i.snippet}`).join("\n")}
`.trim();

      const res = await fetch("/api/v1/web-analyzer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "chat", messages: newMessages, analysisContext }),
      });
      const json = await res.json();
      if (json.success) {
        setChatMessages(prev => [...prev, { role: "ai", content: json.data }]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleChatKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleChat(); }
  };

  const handleReset = () => {
    setPhase("idle");
    setUrl("");
    setAnalysis(null);
    setSearchResults({ pro: [], con: [] });
    setChatMessages([]);
    setShowChat(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-900">

      {phase === "idle" && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-5">
          <div className="text-center mb-2">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-blue-600 text-2xl">travel_explore</span>
            </div>
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base">Web Analyzer</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Masukkan link sosmed untuk dianalisis, dicek faktanya, dan ditelusuri referensinya
            </p>
          </div>

          <div className="w-full max-w-sm">
            <div className="flex flex-col gap-2">
              <div className="relative">
                <input
                  ref={inputRef}
                  type="url"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleAnalyze()}
                  placeholder="https://youtube.com/watch?v=..."
                  className={cn("w-full text-sm pl-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all", url ? "pr-28" : "pr-4")}
                />
                {url && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <PlatformBadge url={url} />
                  </div>
                )}
              </div>

              <button
                onClick={handleAnalyze}
                disabled={!url.trim()}
                className="w-full py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">travel_explore</span>
                Analisis Link
              </button>
            </div>

            <div className="flex items-center justify-center gap-3 mt-4 text-slate-400">
              {[
                { icon: "smart_display",   label: "YouTube"   },
                { icon: "photo_camera",    label: "Instagram" },
                { icon: "alternate_email", label: "X/Twitter" },
                { icon: "music_video",     label: "TikTok"    },
              ].map(p => (
                <div key={p.label} className="flex flex-col items-center gap-1">
                  <span className="material-symbols-outlined text-[18px]">{p.icon}</span>
                  <span className="text-[9px] font-medium">{p.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {phase === "analyzing" && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-blue-100 dark:border-slate-700" />
            <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="material-symbols-outlined text-blue-600 text-xl">travel_explore</span>
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Menganalisis konten...</p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs text-center leading-relaxed">{analysisStep}</p>
          </div>
          <div className="flex gap-1.5 mt-2">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      )}

      {phase === "results" && analysis && (
        <div className="flex-1 flex flex-col overflow-hidden">

          <div className="flex-1 overflow-y-auto p-3 space-y-3">

            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-xl px-3 py-2 border border-slate-200 dark:border-slate-700 shadow-sm">
              <PlatformBadge url={url} />
              <span className="text-[10px] text-slate-400 flex-1 truncate">{url}</span>
              <button onClick={handleReset} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition-colors">
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="px-3 pt-3 pb-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Cek Fakta</p>
                <HoaxBadge verdict={analysis.hoaxCheck.verdict} confidence={analysis.hoaxCheck.confidence} />
                <div className="mt-2 mb-1">
                  <ConfidenceBar value={analysis.hoaxCheck.confidence} />
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed mt-2">
                  {analysis.hoaxCheck.reasoning}
                </p>

                <button onClick={() => {
                  const event = new CustomEvent("drawDebateMap", {
                    detail: {
                      data: {
                        mainClaim: analysis.mainClaim,
                        hoaxCheck: analysis.hoaxCheck,
                        pro: searchResults.pro,
                        con: searchResults.con
                      }
                    }
                  });
                  window.dispatchEvent(event);
                }}
                className="w-full bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 font-bold p-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors border border-blue-200 dark:border-blue-800 shadow-sm"
                >
                  <span className="material-symbols-outlined text-[18px]">schema</span>
                  <span className="text-[11px] uppercase tracking-wider">Visualize Debate Map</span>
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Ringkasan Konten</p>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{analysis.summary}</p>

              {analysis.keyPoints.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {analysis.keyPoints.map((pt, i) => (
                    <li key={i} className="flex items-start gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                      <span className="material-symbols-outlined text-blue-500 text-[13px] shrink-0 mt-0.5">arrow_right</span>
                      {pt}
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex flex-wrap gap-1 mt-2.5">
                {analysis.keywords.map((kw, i) => (
                  <span key={i} className="text-[10px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-full">
                    {kw}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="flex border-b border-slate-100 dark:border-slate-700">
                <button
                  onClick={() => setActiveTab("pro")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition-colors",
                    activeTab === "pro"
                      ? "bg-emerald-50 text-emerald-700 border-b-2 border-emerald-500"
                      : "text-slate-500 hover:bg-slate-50"
                  )}
                >
                  <span className="material-symbols-outlined text-[14px]">thumb_up</span>
                  Mendukung
                  {searchResults.pro.length > 0 && (
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full", activeTab === "pro" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500")}>
                      {searchResults.pro.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("con")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition-colors",
                    activeTab === "con"
                      ? "bg-red-50 text-red-700 border-b-2 border-red-500"
                      : "text-slate-500 hover:bg-slate-50"
                  )}
                >
                  <span className="material-symbols-outlined text-[14px]">thumb_down</span>
                  Kontra
                  {searchResults.con.length > 0 && (
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full", activeTab === "con" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-500")}>
                      {searchResults.con.length}
                    </span>
                  )}
                </button>
              </div>

              <div className="p-2 space-y-2 max-h-64 overflow-y-auto">
                {isSearching ? (
                  <div className="flex items-center justify-center gap-2 py-6 text-slate-400">
                    <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs">Mencari referensi...</span>
                  </div>
                ) : (
                  <>
                    {(activeTab === "pro" ? searchResults.pro : searchResults.con).length === 0 ? (
                      <p className="text-center text-xs text-slate-400 py-4">Tidak ada hasil ditemukan.</p>
                    ) : (
                      (activeTab === "pro" ? searchResults.pro : searchResults.con).map((item, i) => (
                        <SearchCard key={i} item={item} />
                      ))
                    )}
                  </>
                )}
              </div>
            </div>

            {showChat && (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-600 text-[16px]">chat</span>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tanya Seputar Konten Ini</p>
                </div>
                <div className="max-h-52 overflow-y-auto p-2 space-y-2">
                  {chatMessages.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-3">Tanyakan apapun tentang konten ini...</p>
                  )}
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={cn("flex gap-2", msg.role === "user" ? "flex-row-reverse" : "")}>
                      <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-[10px]", msg.role === "user" ? "bg-blue-200 text-blue-700" : "bg-blue-100 text-blue-700")}>
                        <span className="material-symbols-outlined text-[12px]">{msg.role === "user" ? "person" : "auto_awesome"}</span>
                      </div>
                      <div className={cn(
                        "text-xs p-2 rounded-xl max-w-[80%] leading-relaxed",
                        msg.role === "user"
                          ? "bg-blue-700 text-white rounded-tr-none"
                          : "bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 rounded-tl-none"
                      )}>
                        {msg.role === "ai" ? (
                          <>
                            <div className="prose prose-xs dark:prose-invert max-w-none">
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>                            
                            <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700/50 flex justify-end">
                              <button
                                onClick={() => window.dispatchEvent(new CustomEvent("addToCanvas", { detail: { text: msg.content } }))}
                                className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-slate-700/80 px-2 py-1.5 rounded-md transition-colors"
                                title="Tambahkan ke Papan Tulis"
                              >
                                <span className="material-symbols-outlined text-[14px]">push_pin</span>
                                Send to Canvas
                              </button>
                            </div>
                          </>
                        ) : msg.content}
                      </div>
                    </div>
                  ))}
                  {isChatLoading && (
                    <div className="flex gap-2">
                      <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center">
                        <span className="material-symbols-outlined text-blue-600 text-[12px]">auto_awesome</span>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl rounded-tl-none p-2 flex gap-1 items-center">
                        {[0, 0.15, 0.3].map((d, i) => (
                          <div key={i} className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: `${d}s` }} />
                        ))}
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              </div>
            )}

          </div>

          <div className="shrink-0 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3">
            {!showChat ? (
              <button
                onClick={() => setShowChat(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-blue-300 text-blue-600 text-xs font-semibold hover:bg-blue-50 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">chat</span>
                Tanya Tentang Konten Ini
              </button>
            ) : (
              <div className="flex gap-2">
                <textarea
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={handleChatKeyDown}
                  disabled={isChatLoading}
                  rows={1}
                  placeholder="Tanyakan sesuatu..."
                  className="flex-1 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 resize-none outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 transition-all text-slate-700 dark:text-slate-200 placeholder-slate-400"
                />
                <button
                  onClick={handleChat}
                  disabled={!chatInput.trim() || isChatLoading}
                  className="p-2 rounded-xl bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">send</span>
                </button>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}