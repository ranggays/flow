import { useState } from "react";

export function useMindmap(){
    const [isGeneratingMindmap, setIsGeneratingMindmap] = useState<string | null>(null);

    const handleVisualize = async (doc: any) => {
        if (!doc.summary){
            alert("This document doesnt have a summary to be visualized.");
            return;
        }

        setIsGeneratingMindmap(doc.id);

        try {
            const res = await fetch("http://localhost:8000/api/v1/generate-mindmap", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    summary: doc.summary
                })
            });

            if (!res.ok) throw new Error("Failed create mindmap from server");

            const responseData = await res.json();

            console.log("Data siap dilempar:", responseData);

            if (responseData.status === "success" && responseData.data){
                console.log("MELEMPAR EVENT DRAWMINDMAP SEKARANG!");

                const event = new CustomEvent("drawMindmap", {
                    detail: { data: responseData.data }
                });
                window.dispatchEvent(event);
                console.log("Event dispatched, listeners akan menerima");
            }
        } catch (error) {
            console.error("Error Visualization:", error);
            alert("Sorry, Failed visualized document");
        } finally{
            setIsGeneratingMindmap(null);
        }
    }
    return {
        isGeneratingMindmap,
        handleVisualize
    }
}