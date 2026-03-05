import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "./ThemeToggle";

export default function Sidebar(){
    return(
        <aside className="hidden md:flex w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121022] flex-col justify-between p-6 h-screen sticky top-0">
            <div className="space-y-8">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-700 flex items-center justify-center text-white">
                        <span className="material-symbols-outlined">toys_fan</span>
                    </div>
                    <div>
                        <h1 className="text-lg font-bold tracking-tight">Flow</h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Workspace Dashboard</p>
                    </div>
                </div>

                <nav className="space-y-1">
                    <Link href='#' className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-blue-700/10 text-blue font-semibold transition-colors">
                        <span className="material-symbols-outlined">home</span>
                        <span className="text-sm">Home</span>
                    </Link>
                    {["Recent", "Favorites", "Trash"].map((item, idx) => (
                        <Link key={idx} href='#' className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                            <span className="material-symbols-outlined">
                                {item === "Recent" ? "schedule" : item === "Favorites" ? "star" : "delete"}
                            </span>
                            <span className="text-sm font-medium">{item}</span>
                        </Link>
                    ))}
                </nav>

                <div>
                    <h3 className="px-3 text-xs font-bold text-slate-400 uppercase tracking-widest">My Teams</h3>
                    <div className="space-y-1">
                        <div className="flex items-center gap-3 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer hover:text-blue-700 transition-colors">
                            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                            <span>Design Team</span>
                        </div>
                        <div className="flex items-center gap-3 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 cursor-pinter hover:text-blue-700 transition-colors">
                            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                            <span>Engineering</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="bg-blue-700/5 rounded-xl p-4 border border-blue-700/10">
                    <p className="text-xs font-semibold text-blue-700 mb-1">PRO PLAN</p>
                    <p className="text-xs text-slate-500 mb-3 leading-tight">Unlock unlimited workspaces & collaborative features.</p>
                    <button className="w-full bg-blue-700 text-white text-xs font-bold py-2 rounded-lg hover:bg-opacity-90 transition-all">Upgrade Now</button>
                </div>
            </div>
        </aside>
    )
}