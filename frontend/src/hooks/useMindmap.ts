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
            const res = await fetch("/api/v1/mindmap", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({summary: doc.summary})
            })

            if (!res.ok) throw new Error("Failed create mindmap from server");

            const responseData = await res.json();

            if (responseData.status === "success" && responseData.data){

                const event = new CustomEvent("drawMindmap", {
                    detail: { data: responseData.data }
                });
                window.dispatchEvent(event);
            }
        } catch (error) {
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