"use client"
import dynamic from "next/dynamic";
import { useState, useEffect, useRef } from "react";
import "@excalidraw/excalidraw/index.css";
import { useTheme } from "next-themes";

const Excalidraw = dynamic(() => 
    import("@excalidraw/excalidraw").then((mod) => mod.Excalidraw),
    {ssr: false, loading: () =>
        <div className="flex items-center justify-center h-full text-slate-400">
            Loading Canvas...
        </div>
    }
);

interface ExcalidrawProps{
    workspaceId: string;
}

const baseElement = () => ({
    angle: 0,
    opacity: 100,
    groupIds: [] as string[],
    strokeSharpness: "sharp" as const,
    locked: false,
    seed: Math.floor(Math.random() * 100000),
    version: 1,
    versionNonce: Math.floor(Math.random() * 100000),
    isDeleted: false as const,
    updated: Date.now(),
});

export default function ExcalidrawComponent(props: ExcalidrawProps){
    const [isMounted, setIsMounted] = useState(false);
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === "dark";

    const [initialElements, setInitialElements] = useState<any>(null);

    const hasLoadedRef = useRef(false);

    const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

    const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
    const apiRef = useRef<any>(null);
    const isUpdatingFromEventRef = useRef(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (!props.workspaceId) return;
        
        const fetchCanvas = async () => {
            try {
                const res = await fetch(`/api/v1/canvas?workspace_id=${props.workspaceId}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.canvasData) {
                        const elementsArray = typeof data.canvasData === "string"
                            ? JSON.parse(data.canvasData)
                            : data.canvasData;
                        
                        if (Array.isArray(elementsArray) && elementsArray.length > 0) {
                            setInitialElements(elementsArray);
                        }
                    }
                }
            } catch (error) {
                console.error("Failed load canvas", error);
            }
        };

        fetchCanvas();
    }, [props.workspaceId]);

    useEffect(() => {
        if (!excalidrawAPI) return;

        const handleAddToCanvas = (event: any) => {
            isUpdatingFromEventRef.current = true;
            const textToInsert = event.detail.text;
            const currentElements = excalidrawAPI.getSceneElements();
            const appState = excalidrawAPI.getAppState();
            
            const centerX = -appState.scrollX + (appState.width / 2) - 200; 
            const centerY = -appState.scrollY + (appState.height / 2) - 150;

            const rectId = "rect-" + Date.now();
            const textId = "text-" + Date.now();

            const newRect = {
                ...baseElement(),
                type: "rectangle",
                id: rectId,
                x: centerX,
                y: centerY,
                width: 400,
                height: 300, 
                strokeColor: "#1e1e1e", 
                backgroundColor: "#fef08a", 
                fillStyle: "hachure",
                strokeWidth: 1,
                strokeStyle: "solid",
                roughness: 1,
                roundness: { type: 3 }, 
                boundElements: [{ id: textId, type: "text" }], 
            };

            const newText = {
                ...baseElement(),
                type: "text",
                id: textId,
                x: centerX + 10,
                y: centerY + 10,
                width: 380,
                height: 280,
                strokeColor: "#1e1e1e", 
                backgroundColor: "transparent",
                fillStyle: "hachure",
                strokeWidth: 1,
                strokeStyle: "solid",
                roughness: 1,
                boundElements: null,
                text: textToInsert,
                originalText: textToInsert, 
                fontSize: 16,
                fontFamily: 1, 
                textAlign: "center",
                verticalAlign: "middle",
                baseline: 18,
                lineHeight: 1.2,
                containerId: rectId,
            };

            excalidrawAPI.updateScene({
                elements: [...currentElements, newRect, newText]
            });

            setTimeout(() => {
                isUpdatingFromEventRef.current = false; 
            }, 500);
        };

        const handleDrawMindmap = async (event: any) => {
            const generateId = () => Math.random().toString(36).substring(2, 15);

            isUpdatingFromEventRef.current = true;

            const { core_concept, branches } = event.detail.data;
            const currentElements = excalidrawAPI.getSceneElements();
            const appState = excalidrawAPI.getAppState();

            const canvasContainer = document.querySelector(".excalidraw__canvas") as HTMLElement 
                || document.querySelector(".excalidraw") as HTMLElement;
            
            const domWidth = canvasContainer?.clientWidth || window.innerWidth;
            const domHeight = canvasContainer?.clientHeight || window.innerHeight;

            const scrollX = appState.scrollX || 0;
            const scrollY = appState.scrollY || 0;
            
            const centerX = -scrollX + (domWidth / 2);
            const centerY = -scrollY + (domHeight / 2);

            const newElements: any[] = [];
            const coreRectId = "core-rect-" + generateId();
            const coreTextId = "core-text-" + generateId();

            newElements.push({
                ...baseElement(),
                type: "rectangle",
                id: coreRectId,
                x: centerX - 150,
                y: centerY - 50,
                width: 300,
                height: 100,
                backgroundColor: "#bfdbfe",
                strokeColor: "#1e3a8a",
                fillStyle: "solid",
                strokeWidth: 2,
                strokeStyle: "solid",
                roughness: 1,
                roundness: { type: 3 },
                boundElements: [{ id: coreTextId, type: "text" }],
            });

            newElements.push({
                ...baseElement(),
                type: "text",
                id: coreTextId,
                x: centerX - 140,
                y: centerY - 40,
                width: 280,
                height: 80,
                strokeColor: "#1e3a8a",
                backgroundColor: "transparent",
                fillStyle: "solid",
                strokeWidth: 1,
                strokeStyle: "solid",
                roughness: 1,
                boundElements: null,
                text: core_concept,
                originalText: core_concept,
                fontSize: 20,
                fontFamily: 2,
                textAlign: "center",
                verticalAlign: "middle",
                baseline: 18,
                lineHeight: 1.2,
                containerId: coreRectId,
            });

            const radius = 280;
            const angleStep = (2 * Math.PI) / branches.length;

            branches.forEach((branchText: string, index: number) => {
                const angle = index * angleStep;
                const branchX = centerX + radius * Math.cos(angle);
                const branchY = centerY + radius * Math.sin(angle);

                const branchRectId = `branch-rect-${index}-` + generateId();
                const branchTextId = `branch-text-${index}-` + generateId();

                newElements.push({
                    ...baseElement(),
                    type: "rectangle",
                    id: branchRectId,
                    x: branchX - 120,
                    y: branchY - 40,
                    width: 240,
                    height: 80,
                    backgroundColor: "#fef08a",
                    strokeColor: "#854d0e",
                    fillStyle: "solid",
                    strokeWidth: 1,
                    strokeStyle: "solid",
                    roughness: 1,
                    roundness: { type: 3 },
                    boundElements: [{ id: branchTextId, type: "text" }],
                });

                newElements.push({
                    ...baseElement(),
                    type: "text",
                    id: branchTextId,
                    x: branchX - 110,
                    y: branchY - 30,
                    width: 220,
                    height: 60,
                    strokeColor: "#854d0e",
                    backgroundColor: "transparent",
                    fillStyle: "solid",
                    strokeWidth: 1,
                    strokeStyle: "solid",
                    roughness: 1,
                    boundElements: null,
                    text: branchText,
                    originalText: branchText,
                    fontSize: 16,
                    fontFamily: 2,
                    textAlign: "center",
                    verticalAlign: "middle",
                    baseline: 18,
                    lineHeight: 1.2,
                    containerId: branchRectId,
                });

                newElements.push({
                    ...baseElement(),
                    type: "arrow",
                    id: `arrow-${index}-` + generateId(),
                    x: centerX,
                    y: centerY,
                    width: branchX - centerX,
                    height: branchY - centerY,
                    strokeColor: "#94a3b8",
                    backgroundColor: "transparent",
                    fillStyle: "hachure",
                    strokeWidth: 2,
                    strokeStyle: "solid",
                    roughness: 1,
                    roundness: null,
                    points: [[0, 0], [branchX - centerX, branchY - centerY]],
                    startArrowhead: null,
                    endArrowhead: "arrow",
                    boundElements: null,
                    startBinding: null,
                    endBinding: null,
                });
            });

            const allElements = [...currentElements, ...newElements];

            excalidrawAPI.updateScene({ elements: allElements });

            setTimeout(() => {
                excalidrawAPI.scrollToContent(newElements, { 
                    fitToViewport: true,
                    viewportZoomFactor: 0.8 
                });
            }, 200);

            setTimeout(async () => {
                isUpdatingFromEventRef.current = false;

                const latestElements = excalidrawAPI.getSceneElements();
                try {
                    await fetch("/api/v1/canvas", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            workspace_id: props.workspaceId,
                            canvasData: latestElements
                        })
                    });
                    console.log("✅ Mindmap tersimpan:", latestElements.filter((e: any) => !e.isDeleted).length, "elemen");
                } catch (error) {
                    console.error("❌ Gagal simpan mindmap:", error);
                }
            }, 800);
        };

        const handleDrawDebateMap = async (event: any) => {
            const generateId = () => Math.random().toString(36).substring(2, 15);
            isUpdatingFromEventRef.current = true;

            // 1. Fallback aman jika data kosong
            const { mainClaim, hoaxCheck, pro = [], con = [] } = event.detail.data;
            const currentElements = excalidrawAPI.getSceneElements();
            const appState = excalidrawAPI.getAppState();

            const canvasContainer = document.querySelector(".excalidraw__canvas") as HTMLElement || document.querySelector(".excalidraw") as HTMLElement;
            const domWidth = canvasContainer?.clientWidth || window.innerWidth;
            const domHeight = canvasContainer?.clientHeight || window.innerHeight;

            const scrollX = appState.scrollX || 0;
            const scrollY = appState.scrollY || 0;
            
            const centerX = -scrollX + (domWidth / 2);
            const centerY = -scrollY + (domHeight / 2);

            const newElements: any[] = [];

            // 2. Pewarnaan berdasarkan verdict
            const verdict = hoaxCheck?.verdict || "UNVERIFIED";
            const safeClaim = mainClaim || "Tidak ada klaim spesifik";
            
            let centerBg = "#f1f5f9"; 
            let centerStroke = "#475569";
            if (verdict === "HOAX") {
                centerBg = "#fee2e2"; centerStroke = "#b91c1c";
            } else if (verdict === "VALID") {
                centerBg = "#dcfce3"; centerStroke = "#15803d";
            } else if (verdict === "MISLEADING") {
                centerBg = "#fef08a"; centerStroke = "#a16207";
            }

            // 3. Kotak Tengah (Klaim)
            const coreRectId = "core-rect-" + generateId();
            const coreTextId = "core-text-" + generateId();
            
            newElements.push({
                ...baseElement(), type: "rectangle", id: coreRectId,
                x: centerX - 150, y: centerY - 50, width: 300, height: 100,
                backgroundColor: centerBg, strokeColor: centerStroke, fillStyle: "solid",
                strokeWidth: 2, strokeStyle: "solid", roughness: 1, 
                roundness: { type: 3 }, boundElements: [{ id: coreTextId, type: "text" }],
            });

            newElements.push({
                ...baseElement(), type: "text", id: coreTextId,
                x: centerX - 140, y: centerY - 40, width: 280, height: 80,
                backgroundColor: "transparent", strokeColor: centerStroke, fillStyle: "solid",
                strokeWidth: 1, strokeStyle: "solid", roughness: 1,
                fontSize: 16, fontFamily: 1, textAlign: "center", verticalAlign: "middle", 
                text: `[${verdict}]\n${safeClaim}`, originalText: `[${verdict}]\n${safeClaim}`, 
                baseline: 18, lineHeight: 1.2, boundElements: null, containerId: coreRectId,
            });

            // 4. Fungsi Menggambar Samping
            const drawSideNodes = (items: any[], isPro: boolean) => {
                if (!items || !Array.isArray(items)) return;

                const startX = isPro ? centerX - 450 : centerX + 250;
                const startY = centerY - ((items.length * 120) / 2) + 50;

                items.forEach((item, index) => {
                    const nodeY = startY + (index * 120);
                    const rectId = `side-rect-${index}-` + generateId();
                    const textId = `side-text-${index}-` + generateId();

                    const title = item?.title || "Referensi";
                    const shortText = title.length > 40 ? title.substring(0, 40) + "..." : title;

                    newElements.push({
                        ...baseElement(), type: "rectangle", id: rectId,
                        x: startX, y: nodeY, width: 200, height: 80,
                        backgroundColor: isPro ? "#ecfdf5" : "#fff7ed", 
                        strokeColor: isPro ? "#059669" : "#ea580c",
                        fillStyle: "solid", strokeWidth: 1, strokeStyle: "solid", roughness: 1,
                        roundness: { type: 3 }, boundElements: [{ id: textId, type: "text" }],
                    });

                    newElements.push({
                        ...baseElement(), type: "text", id: textId,
                        x: startX + 10, y: nodeY + 10, width: 180, height: 60,
                        backgroundColor: "transparent", strokeColor: isPro ? "#059669" : "#ea580c",
                        fillStyle: "solid", strokeWidth: 1, strokeStyle: "solid", roughness: 1,
                        fontSize: 12, fontFamily: 1, textAlign: "center", verticalAlign: "middle", 
                        text: shortText, originalText: shortText, baseline: 12, lineHeight: 1.2,
                        boundElements: null, containerId: rectId,
                    });

                    // PANAH ANTI-CRASH (Pakai Math.abs)
                    const dx = isPro ? 100 : -100;
                    const dy = centerY - (nodeY + 40);

                    newElements.push({
                        ...baseElement(), type: "arrow", id: `arrow-side-${index}-` + generateId(),
                        x: isPro ? startX + 200 : startX, 
                        y: nodeY + 40,
                        width: Math.abs(dx), 
                        height: Math.abs(dy) === 0 ? 1 : Math.abs(dy), 
                        backgroundColor: "transparent", strokeColor: "#94a3b8",
                        fillStyle: "hachure", strokeWidth: 2, strokeStyle: "solid", roughness: 1,
                        roundness: null, 
                        points: [[0, 0], [dx, dy]], 
                        startArrowhead: null, endArrowhead: "arrow",
                        boundElements: null, startBinding: null, endBinding: null,
                    });
                });
            };

            drawSideNodes(pro, true);
            drawSideNodes(con, false);

            // 5. MENGGABUNGKAN ARRAY DENGAN BENAR (Pakai ... pada newElements)
            const allElements = [...currentElements, ...newElements];
            
            excalidrawAPI.updateScene({ elements: allElements });
            
            setTimeout(() => { 
                excalidrawAPI.scrollToContent(newElements, { fitToViewport: true, viewportZoomFactor: 0.8 }); 
            }, 200);
            setTimeout(() => { isUpdatingFromEventRef.current = false; }, 800);
        };

        window.addEventListener("addToCanvas", handleAddToCanvas);
        window.addEventListener("drawMindmap", handleDrawMindmap);
        window.addEventListener("drawDebateMap", handleDrawDebateMap);

        return () => {
            window.removeEventListener("addToCanvas", handleAddToCanvas);
            window.removeEventListener("drawMindmap", handleDrawMindmap);
            window.removeEventListener("drawDebateMap", handleDrawDebateMap);
        };
    }, [excalidrawAPI, props.workspaceId]);

    useEffect(() => {
        if (!excalidrawAPI || !initialElements || hasLoadedRef.current) return;
        
        hasLoadedRef.current = true;
        
        excalidrawAPI.updateScene({ elements: initialElements });
        setTimeout(() => {
            excalidrawAPI.scrollToContent(initialElements, { fitToViewport: true });
        }, 100);
    }, [excalidrawAPI, initialElements]);

    const handleCanvasChange = (elements: readonly any[]) => {
        if (isUpdatingFromEventRef.current) return;
        if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
        }

        saveTimerRef.current = setTimeout(async () => {
            try {
                const hasAnyElement = elements.length > 0;
                if (!hasAnyElement) return;

                await fetch("/api/v1/canvas", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        workspace_id: props.workspaceId,
                        canvasData: elements
                    })
                });
                console.log("Canvas saved:", elements.filter(el => !el.isDeleted).length, "active elements");
            } catch (error) {
                console.error("Failed auto saved canvas", error);
            }
        }, 3000);
    };

    if (!isMounted) return null;

    return(
        <div className="custom-styles relative h-full w-full bg-[#f6f6f8] dark:bg-[#121212]">
            <Excalidraw 
                excalidrawAPI={(api) => {
                    setExcalidrawAPI(api);
                    apiRef.current = api;
                }}
                theme={isDark ? "dark" : "light"}
                initialData={{
                    elements: initialElements || undefined,
                    appState: {
                        viewBackgroundColor: "#f6f6f8",
                        currentItemFontFamily: 1
                    }
                } as any}
                onChange={(elements) => handleCanvasChange(elements)}
            />
        </div>
    );
}