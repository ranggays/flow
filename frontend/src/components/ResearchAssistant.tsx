"use client"
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useChatAssistant } from "@/hooks/useChatAssistant";
import { Document } from "@/hooks/useDocuments";
import ReactMarkdown from "react-markdown";
import WebAnalyzer from "./WebAnalyzer";
import SentimentAnalyzer from "./SentimentAnalyzer";

interface ResearchAssistantProps {
  isCollapsed: boolean;
  toggleCollapse: () => void;
  workspaceId: string;
  documents: Document[];
}

type ActiveMode = "document" | "web" | "sentiment";

const TABS: { id: ActiveMode; label: string; icon: string }[] = [
  { id: "document",  label: "Doc Chat", icon: "library_books"           },
  { id: "web",       label: "Web",      icon: "travel_explore"           },
  { id: "sentiment", label: "Sentimen", icon: "sentiment_very_satisfied" },
];

export default function ResearchAssistant({
  isCollapsed, toggleCollapse, workspaceId, documents,
}: ResearchAssistantProps) {
  const chat = useChatAssistant(workspaceId);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [activeMode, setActiveMode] = useState<ActiveMode>("document");
  const [panelWidth, setPanelWidth] = useState(999);
  const asideRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = asideRef.current;
    if (!el) return;
    const observer = new ResizeObserver(entries => {
      setPanelWidth(entries[0].contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const tabMode: "icon" | "short" | "full" =
    panelWidth < 200 ? "icon" : panelWidth < 260 ? "short" : "full";

  const TAB_LABELS: Record<ActiveMode, { full: string; short: string }> = {
    document:  { full: "Doc Chat", short: "Doc"      },
    web:       { full: "Web",      short: "Web"      },
    sentiment: { full: "Sentimen", short: "Senti"    },
  };

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.messages, chat.isLoading, chat.showHistory]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); chat.handleSend(); }
  };

  if (isCollapsed) {
    return (
      <aside className="h-full w-full bg-white dark:bg-slate-900 flex flex-col items-center border-l border-slate-200 dark:border-slate-800">
        <div className="h-14 flex items-center justify-center w-full border-b border-slate-100 dark:border-slate-800">
          <button onClick={toggleCollapse} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 dark:text-slate-400" title="Expand">
            <span className="material-symbols-outlined">first_page</span>
          </button>
        </div>
        <div className="flex flex-col gap-4 mt-4 items-center">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
            <span className="material-symbols-outlined text-sm">auto_awesome</span>
          </div>
          <button onClick={toggleCollapse} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            <span className="material-symbols-outlined text-slate-600 dark:text-slate-400">add</span>
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside ref={asideRef} className="h-full w-full bg-white dark:bg-slate-900 flex flex-col border-l border-slate-200 dark:border-slate-800 overflow-hidden">

      <div className="shrink-0 border-b border-slate-100 dark:border-slate-800 flex flex-col">

        <div className="flex items-center justify-between px-3 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="material-symbols-outlined text-blue-700 text-[20px] shrink-0">support_agent</span>
            {panelWidth >= 180 && (
              <h2 className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate">Assistant</h2>
            )}
          </div>
          <div className="flex gap-0.5 items-center shrink-0">
            {activeMode === "document" && panelWidth >= 180 && (
              <>
                <button onClick={chat.toggleHistory}
                  className={cn("p-1.5 rounded-lg transition-colors", chat.showHistory ? "bg-blue-100 text-blue-700" : "hover:bg-slate-100 text-slate-500")}
                  title="Riwayat">
                  <span className="material-symbols-outlined text-[18px] block">history</span>
                </button>
                <button onClick={chat.handleNewChat} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors" title="Chat baru">
                  <span className="material-symbols-outlined text-[18px] block">chat_add_on</span>
                </button>
              </>
            )}
            <button onClick={toggleCollapse} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 dark:text-slate-500" title="Collapse">
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>

        <div className="px-2 pb-2.5">
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg gap-0.5">
            {TABS.map(tab => {
              const isActive = activeMode === tab.id;
              const label = tabMode === "full"
                ? TAB_LABELS[tab.id].full
                : tabMode === "short"
                  ? TAB_LABELS[tab.id].short
                  : null;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveMode(tab.id)}
                  title={TAB_LABELS[tab.id].full}
                  className={cn(
                    "flex-1 py-1.5 rounded-md transition-all flex items-center justify-center gap-1 min-w-0",
                    isActive
                      ? "bg-white dark:bg-slate-700 shadow-sm text-blue-700"
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  )}
                >
                  <span className={cn("material-symbols-outlined shrink-0", label ? "text-[13px]" : "text-[16px]")}>
                    {tab.icon}
                  </span>
                  {label && (
                    <span className="text-[11px] font-bold truncate">{label}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {activeMode === "web" ? (
        <WebAnalyzer workspaceId={workspaceId} />
      ) : activeMode === "sentiment" ? (
        <SentimentAnalyzer workspaceId={workspaceId} />
      ) : (
        <>
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-6">
            {chat.showHistory ? (
              <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Riwayat Percakapan</h3>
                {chat.chatHistoryList.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center mt-10">Belum ada riwayat obrolan.</p>
                ) : (
                  chat.chatHistoryList.map(item => (
                    <div key={item.id} onClick={() => chat.selectOldChat(item.id)}
                      className="group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border bg-white border-transparent hover:border-slate-200 shadow-sm hover:shadow-md">
                      <div className="flex-1 overflow-hidden pr-3">
                        <p className="text-sm font-semibold text-slate-800 truncate">{item.title}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {new Date(item.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                        </p>
                      </div>
                      <button onClick={(e) => chat.deleteChat(e, item.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                        <span className="material-symbols-outlined text-[18px] block">delete</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <>
                {chat.messages.map((msg, idx) => (
                  <div key={idx} className={cn("flex gap-3", msg.role === "user" && "flex-row-reverse")}>
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                      msg.role === "user" ? "bg-blue-200 text-blue-700" : "bg-blue-100 text-blue-700")}>
                      <span className={cn("material-symbols-outlined", msg.role === "ai" ? "p-1" : "text-sm")}>
                        {msg.role === "user" ? "person" : "auto_awesome"}
                      </span>
                    </div>
                    <div className={cn(
                      "p-3 text-sm leading-relaxed shadow-sm max-w-[85%]",
                      msg.role === "user"
                        ? "bg-blue-700 text-white rounded-2xl rounded-tr-none"
                        : "bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-2xl rounded-tl-none"
                    )}>
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-1 w-full">
                          {msg.attachments.map(att => (
                            <div key={att.id} className="flex items-center gap-1 bg-blue-800/50 text-blue-100 border border-blue-500/30 text-[10px] px-2 py-1 rounded-md max-w-full">
                              <span className="material-symbols-outlined text-[12px] shrink-0">description</span>
                              <span className="truncate max-w-37.5 font-medium">{att.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {msg.role === "ai" ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-slate-800 prose-pre:text-slate-100 prose-ul:pl-4 prose-ol:pl-4 prose-li:my-0.5">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                          <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700/50 flex justify-end">
                            <button
                              onClick={() => window.dispatchEvent(new CustomEvent("addToCanvas", { detail: { text: msg.content } }))}
                              className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-slate-700/80 px-2 py-1.5 rounded-md transition-colors"
                            >
                              <span className="material-symbols-outlined text-[14px]">push_pin</span>
                              Send to Canvas
                            </button>
                          </div>
                        </div>
                      ) : (
                        <span className="whitespace-pre-wrap">{msg.content}</span>
                      )}
                    </div>
                  </div>
                ))}
                {chat.isLoading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined p-1">auto_awesome</span>
                    </div>
                    <div className="bg-white border border-slate-200 dark:bg-slate-800/80 rounded-2xl rounded-tl-none p-4 flex gap-1 items-center shadow-sm">
                      {[0, 0.2, 0.4].map((d, i) => (
                        <div key={i} className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: `${d}s` }} />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={messageEndRef} />
              </>
            )}
          </div>

          {!chat.showHistory && (
            <div className="shrink-0 p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 relative">
              {showAttachMenu && (
                <div className="absolute bottom-full left-3 mb-2 right-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-xl py-2 z-50 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex justify-between items-center px-3 mb-2">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fokus Pencarian</div>
                    {chat.selectedDocs.length > 0 && <button onClick={chat.clearSelectedDocs} className="text-[10px] text-blue-600 hover:underline">Reset</button>}
                  </div>
                  <div className="max-h-48 overflow-y-auto px-1">
                    <div onClick={() => { chat.clearSelectedDocs(); setShowAttachMenu(false); }}
                      className={cn("px-3 py-2 mx-1 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg cursor-pointer flex items-center gap-3 transition-colors", chat.selectedDocs.length === 0 && "bg-blue-50 text-blue-700")}>
                      <span className="material-symbols-outlined text-[18px]">library_books</span>
                      <span className="text-sm font-medium flex-1">Seluruh Workspace</span>
                      {chat.selectedDocs.length === 0 && <span className="material-symbols-outlined text-[18px]">check_circle</span>}
                    </div>
                    <div className="my-1 border-t border-slate-100 dark:border-slate-700/50 mx-2" />
                    {documents.filter(d => d.isVectorized).map(doc => {
                      const isSelected = chat.selectedDocs.some(d => d.id === doc.id);
                      return (
                        <div key={doc.id} onClick={() => chat.toggleDocument({ id: doc.id, name: doc.name })}
                          className={cn("px-3 py-2 mx-1 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg cursor-pointer flex items-center gap-3 transition-colors group", isSelected && "bg-blue-50 text-blue-800")}>
                          <span className={cn("material-symbols-outlined text-[18px]", isSelected ? "text-blue-600" : "text-slate-400 group-hover:text-blue-500")}>
                            {isSelected ? "check_box" : "check_box_outline_blank"}
                          </span>
                          <span className="text-sm font-medium truncate flex-1">{doc.name}</span>
                          <span className="material-symbols-outlined text-sm text-red-500">picture_as_pdf</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="relative bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 flex flex-col">
                {chat.selectedDocs.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mb-2 max-h-16 overflow-y-auto">
                    {chat.selectedDocs.map(doc => (
                      <div key={doc.id} className="flex items-center gap-1 bg-blue-100 text-blue-800 text-[11px] font-medium px-2 py-1 rounded-md">
                        <span className="material-symbols-outlined text-[12px]">description</span>
                        <span className="truncate max-w-30">{doc.name}</span>
                        <button onClick={() => chat.toggleDocument(doc)} className="hover:bg-blue-200 rounded-full p-0.5 ml-1 transition-colors">
                          <span className="material-symbols-outlined text-[12px] block">close</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <textarea
                  value={chat.input} onChange={e => chat.setInput(e.target.value)}
                  onKeyDown={handleKeyDown} disabled={chat.isLoading}
                  className="w-full bg-transparent border-none focus:ring-0 text-sm resize-none h-20 p-2 outline-none text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500"
                  placeholder="Ask assistant..."
                />
                <div className="flex justify-between items-center">
                  <div className="relative">
                    <button onClick={() => setShowAttachMenu(!showAttachMenu)}
                      className={cn("p-1.5 rounded-lg flex items-center justify-center transition-colors", showAttachMenu ? "bg-slate-200 text-slate-800" : "text-slate-400 hover:text-blue-600 hover:bg-slate-200/50")}>
                      <span className="material-symbols-outlined text-slate-400 dark:text-slate-500 hover:text-primary cursor-pointer">attach_file</span>
                      {chat.selectedDocs.length > 0 && !showAttachMenu && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-white">
                          {chat.selectedDocs.length}
                        </span>
                      )}
                    </button>
                  </div>
                  <button onClick={chat.handleSend} disabled={chat.isLoading || !chat.input.trim()}
                    className="flex items-center bg-blue-700 text-white rounded-lg p-1 hover:opacity-90 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-opacity">
                    <span className="material-symbols-outlined text-sm">send</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </aside>
  );
}