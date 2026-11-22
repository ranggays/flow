import { useEffect } from 'react';
import { Document } from './useDocuments';
export function useDocumentPolling(
    documents: Document[] | null,
    refreshData: () => void,
    intervalMs: number = 10000
){
    const hasProcessingDocs = documents?.some(doc => !doc.isVectorized) ?? false;
    
    useEffect(() => {
        if(!hasProcessingDocs) return;
        
        const interval = window.setInterval(() => {
            void refreshData();
        }, intervalMs)

        return () => {
            window.clearInterval(interval);
        }
    }, [hasProcessingDocs, refreshData, intervalMs])
}