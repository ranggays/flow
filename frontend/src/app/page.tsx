"use client";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import WorkspaceCard from "@/components/WorkspaceCard";
import ActivityRow from "@/components/ActivityRow";
import CreateWorkspaceModal from "@/components/CreateWorkspaceModal";
import { useCallback, useEffect, useState } from "react";
import { useWorkspaces, Workspace } from "@/hooks/useWorkspaces";

const getTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} mins ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return `${days} days ago`;
};

interface Activity {
  id: string;
  title: string;
  subtitle: string;
  timestamp: string;
  icon: string;
  colorClass: string
}

export default function Dashboard() {
  const { workspaces, isLoading, fetchWorkspaces, createWorkspace, updateWorkspace, deleteWorkspace, workspace } = useWorkspaces();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);

  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(true);

  const fetchRecentActivity = useCallback(async () => {
    try {
      setIsLoadingActivity(true);
      const res = await fetch("/api/v1/recent-activity");
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setActivities(json.data);
        }
      }
    } catch (error) {
      console.error("Gagal mengambil aktivitas:", error);
    } finally {
      setIsLoadingActivity(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkspaces();
    fetchRecentActivity();
  }, [fetchWorkspaces, fetchRecentActivity]);

  const handleOpenEdit = (workspace: Workspace) => {
    setEditingWorkspace(workspace);
    setIsModalOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingWorkspace(null);
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (formData: Workspace, id?: string) => {
    let success = false;
    if (id){
      success = await updateWorkspace(id, formData);
    } else {
      success = await createWorkspace(formData);
    }

    if (success) fetchWorkspaces();
    return success;
  }

  const handleCloseModal = () => {
    setIsModalOpen(false);
    fetchWorkspaces();
  };

  const WorkspaceSkeleton = () => {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col min-h-55 animate-pulse">
        <div className="flex justify-between items-start mb-auto">
          <div className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-slate-800"></div>
          <div className="h-6 w-20 rounded-full bg-slate-200 dark:bg-slate-800"></div>
        </div>
        <div className="mt-6 mb-2">
        <div className="h-5 w-3/4 bg-slate-200 dark:bg-slate-800 rounded-md mb-2"></div>
        <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-800 rounded-md"></div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
        <div className="flex -space-x-2">
          <div className="h-7 w-7 rounded-full bg-slate-200 dark:bg-slate-800 border-2 border-white dark:border-slate-900"></div>
          <div className="h-7 w-7 rounded-full bg-slate-200 dark:bg-slate-800 border-2 border-white dark:border-slate-900"></div>
        </div>
        <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded-md"></div>
      </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f6f6f8] dark:bg-[#121022]">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header />

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto">            
            <div className="flex flex-col md:flex-row sm:items-start justify-between gap-4 mb-8">
              <div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Workspaces</h2>
                <p className="text-slate-500 mt-1">Manage your team's brainstorming boards and creative sessions.</p>
              </div>
              <button onClick={handleOpenCreate} className="flex items-center gap-2 bg-blue-700 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-blue-700/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer">
                <span className="material-symbols-outlined text-lg">add</span>
                Create New Workspace
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <WorkspaceSkeleton key={`skeleton-${index}`} />
                ))
              ):(
                <>
                  {workspaces.map((ws, i) => (
                    <WorkspaceCard key={ws.id}
                      {...ws}
                      id={ws.id}
                      name={ws.name}
                      category={ws.category}
                      color={ws.color}
                      updatedAt={new Date(ws.updatedAt).toLocaleDateString("id-ID", {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                      })}
                      members={2}
                      onEdit={handleOpenEdit}
                      onDelete={deleteWorkspace}
                    />
                  ))}              
                </>
              )}
              <div className="group bg-dashed border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center p-8 hover:border-blue-700/50 hover:bg-blue-700/5 transition-all cursor-pointer min-h-55">
                <div onClick={handleOpenCreate} className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-blue-700 group-hover:bg-blue-700/10 transition-all mb-4">
                  <span className="material-symbols-outlined text-3xl">add</span>
                </div>
                <p className="text-sm font-bold text-slate-500 group-hover:text-blue-700 transition-colors">New Workspace</p>
              </div>
            </div>

            <div className="mt-16 pb-10">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Recent Activity</h3>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800">
                {isLoadingActivity ? (
                  <div className="p-6 flex justify-center">
                    <span className="material-symbols-outlined animate-spin text-slate-400">sync</span>
                  </div>
                ) : activities.length > 0 ? (
                  activities.map((activity) => (
                    <ActivityRow 
                      key={activity.id}
                      title={activity.title} 
                      subtitle={activity.subtitle || ""} 
                      time={getTimeAgo(activity.timestamp)} 
                      icon={activity.icon} 
                      colorClass={activity.colorClass}
                    />
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-500">
                    <span className="material-symbols-outlined text-4xl mb-2 opacity-30">history</span>
                    <p className="text-sm">Belum ada aktivitas terbaru.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <CreateWorkspaceModal isOpen={isModalOpen} onClose={(handleCloseModal)} initialData={editingWorkspace} onSubmit={handleModalSubmit}/>
    </div>
  );
}