"use client"

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Workspace } from '@/hooks/useWorkspaces';

interface CreateWorkspaceModalProps{
    isOpen: boolean;
    onClose: () => void;
    initialData?: Workspace | null;
    onSubmit: (data: Workspace, id?:string) => Promise<boolean>; //utk edit create
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#64748b"];

export default function CreateWorkspaceModal({isOpen, onClose, initialData, onSubmit}: CreateWorkspaceModalProps){
    const [mounted, setMounted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const isEditMode = !!initialData; // true jika ada initialdata
    
    // variabel form
    const [formData, setFormData] = useState({
      id: "",
      name: "",
      description: "",
      category: "Personal",
      team: "",
      icon: "rocket_launch",
      color: COLORS[0],
      updatedAt: "",
    });

    useEffect(() => {
      if (isOpen && initialData){
        setFormData({
          id: "",
          name: initialData.name,
          description: initialData.description || "",
          category: initialData.category,
          team: "",
          icon: initialData.icon,
          color: initialData.color,
          updatedAt: initialData.updatedAt,
        });
      } else if (isOpen && !initialData){
        setFormData({
          id: "",
          name: "",
          description: "",
          category: "",
          team: "",
          icon: "",
          color: "",
          updatedAt: "",
        })
      }
    }, [isOpen, initialData]);

    useEffect(() => {
        setMounted(true);
        if (isOpen){
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "auto";
        }
        return () => {
            document.body.style.overflow = "auto";
        };
    }, [isOpen]);

    const handleSubmit = async () => {
      if(!formData.name) return alert("Workspace name is required");

      setIsLoading(true);
      const success = await onSubmit(formData, initialData?.id)
      
      setIsLoading(false);
      if (success) onClose();
    }
    
    if (!mounted || !isOpen) return null;
    
    return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />

      <div className="relative w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col 
        bg-white dark:bg-[#182635] 
        border border-slate-200 dark:border-[#2f4d6a] 
        transform transition-all scale-100"
      >
        
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-[#21364a] flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Create New Workspace</h2>
            <p className="text-slate-500 dark:text-[#8eadcc] text-sm mt-1">
              Set up a new space for your team to collaborate.
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-[#8eadcc] dark:hover:text-white dark:hover:bg-[#21364a] transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
          
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-white">Workspace Name</label>
            <input 
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="e.g., Marketing Team, Project Alpha" 
              className="w-full rounded-lg px-4 py-3 outline-none transition-all border
                bg-slate-50 dark:bg-[#0f1923] 
                border-slate-200 dark:border-[#2f4d6a] 
                text-slate-900 dark:text-white 
                placeholder:text-slate-400 dark:placeholder:text-[#507695] 
                focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-white">
              Description <span className="text-slate-400 dark:text-[#507695] font-normal text-xs ml-1">(Optional)</span>
            </label>
            <textarea 
              rows={3} 
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Briefly describe the purpose of this workspace..." 
              className="w-full rounded-lg px-4 py-3 outline-none transition-all resize-none border
                bg-slate-50 dark:bg-[#0f1923] 
                border-slate-200 dark:border-[#2f4d6a] 
                text-slate-900 dark:text-white 
                placeholder:text-slate-400 dark:placeholder:text-[#507695] 
                focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            ></textarea>
          </div>

          <div className="flex flex-col gap-2">
             <label className="text-sm font-semibold text-slate-700 dark:text-white">Category</label>
             <input 
               type="text"
               value={formData.category}
               onChange={(e) => setFormData({...formData, category: e.target.value})}
               placeholder="e.g., Personal, Research, Thesis"
               className="w-full rounded-lg px-4 py-3 outline-none border bg-slate-50 dark:bg-[#0f1923] border-slate-200 dark:border-[#2f4d6a] text-slate-900 dark:text-white focus:border-blue-500"
             />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-white">Select Team
                <span className="text-slate-400 dark:text-[#507695] font-normal text-xs ml-1">(Optional)</span>
            </label>
            <div className="relative">
              <select 
                value={formData.team}
                onChange={(e) => setFormData({...formData, team: e.target.value})}
                className="w-full appearance-none rounded-lg px-4 py-3 outline-none cursor-pointer border
                bg-slate-50 dark:bg-[#0f1923] 
                border-slate-200 dark:border-[#2f4d6a] 
                text-slate-900 dark:text-white 
                focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">Select a team</option>
                <option value="engineering">Engineering Group</option>
                <option value="design">Design Collective</option>
                <option value="product">Product Management</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 dark:text-[#8eadcc]">
                <span className="material-symbols-outlined">expand_more</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
             <label className="text-sm font-semibold text-slate-700 dark:text-white">Workspace Identity</label>
             <div className="flex items-center gap-4">
                <div className="shrink-0">
                    <button className="h-12 w-12 rounded-xl flex items-center justify-center border transition-colors
                        bg-blue-50 dark:bg-blue-500/20 
                        border-blue-200 dark:border-blue-500 
                        text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/30"
                    >
                        <span className="material-symbols-outlined text-2xl">rocket_launch</span>
                    </button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                    {COLORS.map((color, idx) => (
                        <button 
                          key={idx}
                          type="button"
                          onClick={() => setFormData({...formData, color: color})}
                          className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 
                          ${formData.color === color 
                              ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-[#182635] border-white' 
                              : 'border-transparent'
                          }`}
                          style={{ 
                              backgroundColor: color, 
                              borderColor: formData.color === color ? 'white' : 'transparent' 
                          }} 
                        />
                    ))}
                </div>
             </div>
          </div>

        </div>

        <div className="px-6 py-5 flex items-center justify-end gap-3 border-t 
            bg-slate-50 dark:bg-[#131e2a] 
            border-slate-100 dark:border-[#21364a]"
        >
          <button 
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg font-medium transition-colors
                text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 
                dark:text-slate-400 dark:hover:text-white dark:hover:bg-[#21364a]"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2 cursor-pointer">
            {isLoading ? "Creating..." : (isEditMode ? "Save Changes" : "Create Workspace")}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}