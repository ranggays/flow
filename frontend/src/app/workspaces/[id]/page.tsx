"use client"

import dynamic from "next/dynamic";
import { useState, useRef, useEffect } from 'react';
import {
    Panel,
    Group,
    Separator,
    PanelImperativeHandle
} from "react-resizable-panels";
import WorkspaceHeader from "@/components/WorkspaceHeader";
import SourceLibrary from "@/components/SourceLibrary";
import ResearchAssistant from "@/components/ResearchAssistant";
// import "@excalidraw/excalidraw/index.css";
import "@excalidraw/excalidraw/";
import ExcalidrawComponent from "@/components/Excalidraw";
import { useTheme } from "next-themes";
import { useParams } from "next/navigation";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { Document } from "@/hooks/useDocuments";

export default function WorkspacePage(){
    const id = useParams <{id: string}>().id;
    console.log("Workspaces ID:", id);
    const { resolvedTheme } = useTheme();
    const leftPanelRef = useRef<PanelImperativeHandle | null>(null);
    const rightPanelRef = useRef<PanelImperativeHandle | null>(null);
    const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
    const [isRightCollapsed, setIsRightCollapsed] = useState(false);
    const [mounted, setMounted] = useState(false);
    const { fetchWorkspace, workspace } = useWorkspaces();
    const [activeDocument, setActiveDocument] = useState<Document | null>(null);

    useEffect(() => {
        fetchWorkspace(id);
    }, [fetchWorkspace]);

    useEffect(() => setMounted(true), []);

    const toggleLeftPanel = () => {
        const panel = leftPanelRef.current;
        if (panel){
            isLeftCollapsed ? panel.expand() : panel.collapse();
        };
    };

    const toggleRightPanel = () => {
        const panel = rightPanelRef.current;
        if (panel){
            isRightCollapsed ? panel.expand() : panel.collapse();
        };
    };

    if (!mounted) return null;

    return(
        <div className="h-screen flex flex-col bg-background-light dark:bg-background-dark overflow-hidden">
            <WorkspaceHeader workspace={workspace}/>

            <main className="relative flex flex-1 overflow-hidden">
                <Group orientation="horizontal" className="h-full w-full">
                    <Panel 
                        panelRef={leftPanelRef}
                        defaultSize={20}
                        collapsible={true}
                        collapsedSize={50}
                        minSize={200}
                        maxSize={500}
                        onResize={() => {
                            const collapsed = leftPanelRef.current?.isCollapsed() ?? false;
                            if (collapsed !== isLeftCollapsed){
                                setIsLeftCollapsed(collapsed);
                            }
                        }}
                        className="transition-all duration-300"
                    >
                        <SourceLibrary isCollapsed={isLeftCollapsed} toggleCollapse={toggleLeftPanel} workspaceId={id ?? null} documents={workspace?.documents || []} onUploadSuccess={() => fetchWorkspace(id)}
                        onDeleteSuccess={() => fetchWorkspace(id)} onDocumentClick={(doc) => setActiveDocument(doc)}/>
                    </Panel>
                    {activeDocument && (
                        <>
                            <Separator className="group flex w-1.5 cursor-col-resize items-center justify-center bg-transparent transition-colors hover:bg-blue-700/20 z-10 focus:outline-none">
                                <div className="h-8 w-0.5 rounded-full bg-slate-300 transition-colors group-hover:bg-blue-700 dark:bg-slate-700" />
                            </Separator>
                            
                            <Panel defaultSize={30} minSize={20} className="bg-white border-r border-slate-200 flex flex-col z-10">
                                <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-100 rounded text-blue-700">
                                            <span className="material-symbols-outlined block">description</span>
                                        </div>
                                        <div>
                                            <h2 className="text-sm font-bold text-slate-800 truncate w-48">{activeDocument.name}</h2>
                                            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Document Preview</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <button 
                                            onClick={() => setActiveDocument(null)} 
                                            className="p-1.5 hover:bg-slate-200 rounded text-slate-500 transition-colors" 
                                            title="Close preview"
                                        >
                                            <span className="material-symbols-outlined text-sm">close</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-hidden bg-slate-100">
                                    <iframe 
                                        src={`${activeDocument.fileUrl}#toolbar=0`} 
                                        className="w-full h-full border-none"
                                        title={activeDocument.name}
                                    />
                                </div>

                                <div className="p-3 border-t border-slate-100 flex items-center justify-between bg-white">
                                    <span className="text-[11px] text-slate-500">View mode</span>
                                    <button className="text-[11px] font-bold text-blue-700 hover:underline">
                                        Extract to Canvas
                                    </button>
                                </div>
                            </Panel>
                        </>
                    )}
                    <Separator className="group flex w-1.5 cursor-col-resize items-center justify-center bg-transparent transition-colors hover:bg-primary/20 z-10 focus:outline-none">
                        <div className="h-8 w-0.5 rounded-full bg-slate-300 transition-colors group-hover:bg-primary dark:bg-slate-700" />
                    </Separator>
                    <Panel defaultSize={60} minSize={20}>
                        <ExcalidrawComponent workspaceId={id}/>
                    </Panel>
                    <Separator className="group flex w-1.5 cursor-col-resize items-center justify-center bg-transparent transition-colors hover:bg-primary/20 z-10 focus:outline-none">
                        <div className="h-8 w-0.5 rounded-full bg-slate-300 transition-colors group-hover:bg-primary dark:bg-slate-700" />
                    </Separator>
                    <Panel
                        panelRef={rightPanelRef}
                        defaultSize={20}
                        collapsible={true}
                        collapsedSize={50}
                        minSize={200} 
                        maxSize={500}
                        onResize={() => {
                            const collapsed = rightPanelRef.current?.isCollapsed() ?? false;
                            if (collapsed !== isRightCollapsed){
                                setIsRightCollapsed(collapsed);
                            }
                        }}
                        className="border-l border-slate-200 bg-white transition-all duration-300 ease-in-out dark:border-slate-800 dark:bg-slate-900"
                    >
                        <ResearchAssistant isCollapsed={isRightCollapsed} toggleCollapse={toggleRightPanel} workspaceId={id} documents={workspace?.documents || []}/>
                    </Panel>
                </Group>
            </main>
        </div>
    )
}
