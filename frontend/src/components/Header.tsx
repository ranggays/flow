"use client";
import { useDropdown } from "@/hooks/useDropdown";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";

export default function Header() {
  const {isOpen, toggle, ref} = useDropdown();
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
      console.error("Error signing out: ",error);
    }
  }

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-10 px-4 md:px-8 flex items-center justify-between">
      
      <div className="flex items-center gap-3">
        <button className="md:hidden p-2 -ml-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
          <span className="material-symbols-outlined">menu</span>
        </button>

        <nav className="hidden md:flex items-center text-sm font-medium">
          <span className="text-slate-900 dark:text-white">All Projects</span>
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
          <input 
            className="pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm w-32 md:w-64 focus:ring-2 focus:ring-blue-700 outline-none transition-all" 
            placeholder="Search..." 
            type="text"
          />
        </div>
        
        <ThemeToggle />
        <div ref={ref} className="relative">
            <button onClick={toggle} className="flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full p-1 pl-1 pr-2 transition-colors">
                <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden border border-slate-200 dark:border-slate-600">
                    <div className="w-full h-full bg-linear-to-tr from-blue-500 to-cyan-400 flex items-center justify-center text-white text-xs font-bold">
                        {userEmail.charAt(0).toUpperCase()}
                    </div>
                </div>
                <span className="hidden lg:block text-sm font-semibold text-slate-700 dark:text-slate-200">{userEmail.slice(15,20).toUpperCase()}</span>
                <span className={`material-symbols-outlined text-slate-400 text-sm transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>expand_more</span>
            </button>
            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-50 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                    <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Signed in as</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{userEmail.charAt(15).toUpperCase() + userEmail.slice(16,20)}</p>
                    </div>
                    <a href="#" className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-primary transition-colors">
                      <span className="material-symbols-outlined text-[18px]">person</span>
                      My Profile
                    </a>
                    <a href="#" className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-primary transition-colors">
                      <span className="material-symbols-outlined text-[18px]">settings</span>
                      Settings
                    </a>
                    <div className="border-t border-slate-100 dark:border-slate-800 my-1"></div>
                    <button onClick={handleSignOut} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                      <span className="material-symbols-outlined text-[18px]">logout</span>
                      Log Out
                    </button>
                </div>
            )}
        </div>
      </div>
    </header>
  );
}