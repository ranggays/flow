"use client";

import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import { useDropdown } from "@/hooks/useDropdown";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Workspace } from "@/hooks/useWorkspaces";
import { useRouter } from "next/navigation";

interface WorkspaceHeaderProp{
    workspace: Workspace | null;
}

export default function WorkspaceHeader({workspace}: WorkspaceHeaderProp) {
  const { isOpen, toggle, ref} = useDropdown();
  const [userEmail, setUserEmail] = useState("Loading...");
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function getUser(){
    const {data: {user}} = await supabase.auth.getUser();
    if (user){
        setUserEmail(user.user_metadata?.full_name || user.email || "User");
    }
    }
    getUser();
  }, []);

  const handleSignOut = async () => {
    try {
        await supabase.auth.signOut();
        router.refresh();
        router.push("/login");
    } catch (error) {
        console.error("Error signing out:", error);
    }
  };
    
  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-4 md:px-6 z-20 relative shrink-0 transition-colors">
      
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="h-9 w-9 rounded-lg bg-blue-700 flex items-center justify-center text-white">
                <span className="material-symbols-outlined">toys_fan</span>
            </div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white hidden sm:block">Flow</h1>
        </Link>

        <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-slate-500 dark:text-slate-400">
          <Link href="/" className="px-2 py-1 hover:text-primary hover:bg-slate-50 dark:hover:bg-slate-800 rounded transition-all">Workspace</Link>
          <span className="text-slate-300 dark:text-slate-600">/</span>
          <span className="px-2 py-1 text-slate-900 dark:text-white font-medium cursor-default">{workspace?.name}</span>
        </nav>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        
        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>

        <div ref={ref} className="flex items-center gap-3">
            <ThemeToggle />
            
            <button className="flex items-center gap-2 pl-1 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors p-1 pr-2" onClick={toggle}>
                <div className="relative">
                    <div className="h-8 w-8 rounded-full bg-linear-to-tr from-blue-500 to-cyan-400 flex items-center justify-center text-white text-xs font-bold shadow-inner">
                        {userEmail.charAt(0).toUpperCase()}
                    </div>
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
                </div>
                <div className="hidden xl:block text-left">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-none">{userEmail.slice(15,20).toUpperCase()}</p>
                </div>
                <span className={`material-symbols-outlined text-slate-400 text-sm hidden xl:block transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} onClick={toggle}>
                    expand_more
                </span>
            </button>

            {isOpen && (
                <div className="absolute top-full right-3 mt-2 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-50 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                    <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Signed in as</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{userEmail.charAt(15).toUpperCase() + userEmail.slice(16,20)}</p>
                    </div>
                    <a href="#" className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-primary transition-colors">
                        <span className="material-symbols-outlined text-[18px]">person</span>
                        Profile Settings
                    </a>
                    <a href="#" className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-primary transition-colors">
                        <span className="material-symbols-outlined text-[18px]">credit_card</span>
                         Billing & Plan
                    </a>
        
                    <div className="border-t border-slate-100 dark:border-slate-800 my-1"></div>
                
                   <button onClick={handleSignOut} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        <span className="material-symbols-outlined text-[18px]">logout</span>
                        Sign Out
                    </button>
                </div>
            )}
        </div>
      </div>
    </header>
  );
}