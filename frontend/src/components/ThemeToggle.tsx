"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

export function ThemeToggle(){
    const { theme, setTheme } = useTheme();
    const [ mounted, setMounted ] = useState(false);

    useEffect(() => {
        setMounted(true)
    }, []);

    if (!mounted) return null;

    return(
        <button onClick={() => setTheme (theme === "dark" ? "light" : "dark")} className="p-2 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors">
            {theme === "dark" ? (
                <span className="material-symbols-outlined">
                    light_mode
                </span>
            ): (
                <span className="material-symbols-outlined">
                    dark_mode
                </span>
            )}
        </button>
    )
}