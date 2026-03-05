"use client";
import Link from "next/link";
import { useState } from "react";
import { Workspace } from "@/hooks/useWorkspaces";

interface WorkspaceCardProps extends Workspace{
  onEdit: (workspace: Workspace) => void;
  onDelete: (id: string) => void
}

export default function WorkspaceCard(props: WorkspaceCardProps) {
  const { id, name, description, category, icon, color, updatedAt, members, team, onEdit, onDelete} = props;
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleMenuClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsMenuOpen(!isMenuOpen);
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsMenuOpen(false);
    onEdit(props);
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsMenuOpen(false);
    if (confirm("Are you sure you want to delete this workspace")){
        onDelete(id);
    }
  }

  return (
    <div className="relative group h-full">
        <Link href={`/workspaces/${id}`}>
            <div className="group bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-xl hover:border-blue-700/30 transition-all cursor-pointer">
                <div className={`h-32 relative overflow-hidden`} style={{
                    background: `linear-gradient(135deg, ${color} 0%, ${color}CC 100%)`
                }}>
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
                    <div className="absolute bottom-3 left-3 bg-white/20 backdrop-blur-md px-2 py-1 rounded text-[10px] text-white font-bold tracking-wider uppercase">
                    {category}
                    </div>
                </div>
                <div className="p-5">
                    <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-blue-700 transition-colors">
                    {name}
                    </h3>
                    <div className="mt-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">history</span>
                        Modified {updatedAt}
                        </div>
                        <div className="flex -space-x-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white dark:border-slate-900"></div>
                        <div className="w-6 h-6 rounded-full bg-slate-300 border-2 border-white dark:border-slate-900"></div>
                        <div className="w-6 h-6 rounded-full bg-blue-700/10 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[8px] font-bold text-blue-700">
                            +{members}
                        </div>
                        </div>
                    </div>
                    </div>
                </div>
            </div>
        </Link>
        <div className="absolute top-3 right-3 z-10">
            <button 
            onClick={handleMenuClick}
            className="h-8 w-8 bg-black/20 hover:bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-all"
            >
            <span className="material-symbols-outlined text-lg">more_vert</span>
            </button>

            {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden py-1">
                <button onClick={handleEdit} className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">edit</span> Edit
                </button>
                <button onClick={handleDelete} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">delete</span> Delete
                </button>
            </div>
            )}
        </div>
        
        {isMenuOpen && (
            <div className="fixed inset-0 z-0" onClick={() => setIsMenuOpen(false)}></div>
        )}
    </div>
  );
}