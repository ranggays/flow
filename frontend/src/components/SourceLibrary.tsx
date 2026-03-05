"use client"
import { cn } from "@/lib/utils";
import { useRef, useState } from "react";
import { useDocuments, Document } from "@/hooks/useDocuments";
import { useDocumentPolling } from "@/hooks/useDocumentPolling";
import { useMindmap } from "@/hooks/useMindmap";

interface SourceLibraryProps {
  isCollapsed: boolean;
  toggleCollapse: () => void;
  workspaceId: string | null;
  documents: Document[] | null;
  onUploadSuccess: () => void;
  onDeleteSuccess: () => void;
  onDocumentClick: (doc: Document | null) => void;
}

export default function SourceLibrary({ isCollapsed, toggleCollapse, workspaceId, documents, onUploadSuccess, onDeleteSuccess,onDocumentClick }: SourceLibraryProps) {
  const { uploadDocument, isUploading, deleteDocument } = useDocuments();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [docToDelete, setDocToDelete] = useState<Document | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { isGeneratingMindmap, handleVisualize } = useMindmap();

  useDocumentPolling(documents, onUploadSuccess);

  const parseSummary = (rawSummary: string | null) => {
    if (!rawSummary) return "Processing Summary...";
    try {
      if (rawSummary.startsWith('[')){
        const parsed = JSON.parse(rawSummary);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].text){
          return parsed[0].text;
        }
      }
      return rawSummary;
    } catch (error) {
      return rawSummary;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric'});
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // gae hook
    const result = await uploadDocument(file, workspaceId!);

    if (result){
      onUploadSuccess();
    } else {
      alert("Failed Uploading Document");
    }

    if (fileInputRef.current) fileInputRef.current.value = "" // reset input;
  };

  const handleDelete = async () => {
    if (!docToDelete) return;

    setIsDeleting(true);
    const result = await deleteDocument(docToDelete.id);
    setIsDeleting(false);
    if (result){
      setDocToDelete(null);
      onDeleteSuccess();
    } else {
      alert("Failed Deleting Document");
    }
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.includes("pdf")) return "picture_as_pdf";
    if (fileType.includes("image")) return "image";
    return "article";
  };

  return (
    <aside className={cn(
      "h-full bg-white dark:bg-slate-900 flex flex-col transition-all duration-300 border-r border-slate-200 dark:border-slate-800",
      isCollapsed ? "w-full items-center" : "w-full"
    )}>
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf,.txt,.md" className="hidden" />
      <div className={cn(
        "border-b border-slate-100 dark:border-slate-800 flex items-center",
        isCollapsed ? "h-14 justify-center" : "p-4 justify-between"
      )}>
        {isCollapsed ? (
          <button onClick={toggleCollapse} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 dark:text-slate-400" title="Expand">
            <span className="material-symbols-outlined">last_page</span>
          </button>
        ) : (
          <>
             <button onClick={toggleCollapse} className="p-1 -ml-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300" title="Collapse">
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <h2 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-700">menu_book</span>
              Source Library
            </h2>
            <button onClick={() => fileInputRef.current?.click()} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">
              <span className="material-symbols-outlined text-slate-500 dark:text-slate-400">add_circle</span>
            </button>
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-6 mt-4">
            <div className="[writing-mode:vertical-lr] rotate-180 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
               Source Library
            </div>
            <div className="flex flex-col gap-4">
              {documents?.map(doc => (
                <button key={doc.id} onClick={() => onDocumentClick(doc)} className="material-symbols-outlined text-slate-400 hover:text-slate-600 cursor-pointer" title={doc.name}>{getFileIcon(doc.fileType)}</button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {documents?.length === 0 ? (
              <div className="text-center p-4 text-sm text-slate-400">No sources yet. Upload one!</div>
            ): (
              documents?.map(doc => (
                <div key={doc.id} className="group relative bg-blue-100 border border-blue-200 p-3 rounded-lg cursor-pointer transition-all hover:bg-blue-50 hover:border-blue-300 shadow-sm">
                  <div className="flex items-start justify-between mb-2">
                    <span className="material-symbols-outlined text-blue-700">description</span>
                    <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider bg-blue-100 px-2 py-0.5 rounded-full">{doc.isVectorized ? "Active" : "Processing"}</span>
                  </div>
                  <h3 className="text-sm semibold text-slate-900 mb-1 truncate title-font">
                    {doc.name}
                  </h3>
                  <div className="relative group/tooltip">
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed cursor-help">
                      {parseSummary(doc.summary || "Belum ada ringkasan.")}
                    </p>

                    {doc.summary && (
                      <div className="absolute z-100 invisible opacity-0 group-hover/tooltip:visible group-hover/tooltip:opacity-100 transition-all duration-200 top-full left-0 pt-2 w-72">
                         
                         <div className="p-3 bg-slate-800 text-slate-100 text-xs rounded-xl shadow-xl relative border border-slate-700">
                            
                            <div className="absolute bottom-full left-4 border-[6px] border-transparent border-b-slate-800"></div>
                            
                            <div className="leading-relaxed whitespace-pre-wrap wrap-break-word max-h-48 overflow-y-auto custom-scrollbar pr-2">
                               {parseSummary(doc.summary)}
                            </div>

                         </div>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 pt-3 border-t border-blue-100/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-600 font-medium">
                        {formatBytes(doc.size)}
                      </span>
                      <span className="text-[10px] text-slate-400 italic">
                        {formatDate(doc.createdAt)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button 
                        onClick={() => onDocumentClick(doc)}
                        className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                        title="View Document"
                      >
                        <span className="material-symbols-outlined text-[16px] block">visibility</span>
                      </button>
                      <button 
                        onClick={() => handleVisualize(doc)}
                        disabled={isGeneratingMindmap === doc.id}
                        className="p-1.5 text-purple-600 hover:bg-purple-100 rounded-md transition-colors disabled:opacity-50"
                        title="Visualize Mindmap"
                      >
                        {isGeneratingMindmap === doc.id ? (
                          <span className="material-symbols-outlined text-[16px] block animate-spin">sync</span>
                        ) : (
                          <span className="material-symbols-outlined text-[16px] block">account_tree</span>
                        )}
                      </button>
                      <button 
                        onClick={() => setDocToDelete(doc)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                        title="Delete Document"
                      >
                        <span className="material-symbols-outlined text-[16px] block">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>

      <div className={cn("border-t border-slate-100 dark:border-slate-800", isCollapsed ? "p-2 flex justify-center" : "p-4 bg-slate-50 dark:bg-slate-800/50")}>
        {isCollapsed ? (
          <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="p-2 text-slate-400 dark:text-slate-500 hover:text-primary transition-colors">
            <span className="material-symbols-outlined">{isUploading ? 'cloud_upload':'upload_file'}</span>
          </button>
        ) : (
          <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="w-full py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition-colors">
            {isUploading ? (
              <>
                <div className="flex justify-center items-center gap-2">
                  <span className="material-symbols-outlined text-sm animate-spin">refresh</span>
                  <p>Uploading...</p>
                </div>
              </>
            ) : (
              "Upload New Source"
            )}
          </button>
        )}
      </div>
      {docToDelete && (
                <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm transition-all">
                    <div className="bg-white p-6 rounded-2xl shadow-xl w-100 border border-slate-100">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                                <span className="material-symbols-outlined">warning</span>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Hapus Dokumen?</h3>
                                <p className="text-sm text-slate-500">Tindakan ini tidak dapat dibatalkan.</p>
                            </div>
                        </div>
                        
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 mb-6">
                            <p className="text-sm text-slate-700 font-medium truncate">
                                {docToDelete.name}
                            </p>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button 
                                onClick={() => setDocToDelete(null)}
                                disabled={isDeleting}
                                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                            >
                                Batal
                            </button>
                            <button 
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl flex items-center gap-2"
                            >
                                {isDeleting ? "Menghapus..." : "Ya, Hapus"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
    </aside>
  );
}