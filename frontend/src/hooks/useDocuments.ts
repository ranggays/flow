import { useState } from "react";

export interface Document {
    id: string;
    workspaceId: string;
    name: string;
    fileUrl: string;
    fileType: string;
    size: number;
    summary?: string | null;
    isVectorized: boolean;
    createdAt: string;
}

export function useDocuments(){
    const [isUploading, setIsUploading] = useState(false);

    const uploadDocument = async (file: File, workspaceId: string) => {
        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("workspaceId", workspaceId);
    
        try {
            const res = await fetch("/api/v1/documents/upload", {
                method: "POST",
                // ga perlu set header content-type lek gae formData
                body: formData
            });
    
            if (res.ok){
                const data = await res.json();
                console.log("Upload Success", data);
                return data;
            } else {
                console.error("Upload Failed");
                return null;
            }
        } catch (error) {
            console.error("Network Error", error);
            return null;
        } finally {
            setIsUploading(false);
        }
    };

    const deleteDocument = async (documentId: string) => {
        try {
            const response = await fetch(`/api/v1/documents/${documentId}`, {
                method: "DELETE"
            });

            return response.ok;
        } catch (error) {
            console.error("Error delete document", error);
            return false;
        }
    }

    return { uploadDocument, isUploading, deleteDocument };
}
