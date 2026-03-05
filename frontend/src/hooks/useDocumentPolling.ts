import { useEffect } from 'react';
import { Document } from './useDocuments';
export function useDocumentPolling(
    documents: Document[] | null,
    refreshData: () => void,
    intervalMs: number = 10000
){
    useEffect(() => {
        const hasProcessingDocs = documents?.some(doc => !doc.isVectorized);
        let interval: NodeJS.Timeout;

        if (hasProcessingDocs){
            interval = setInterval(() => {
                refreshData();
                console.log("Checking status document AI...")
            }, intervalMs)
        }

        return () => {
            if (interval) clearInterval(interval)
        }
    }, [documents, refreshData, intervalMs])
}