"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface InitialForm{
  fullName: string;
  email: string;
  password: string;
}

export default function SignUpPage() {
  const [showPassword, setShowPassword] = useState(false);

  // Variabel Form
  const [formData, setFormData] = useState<InitialForm>({fullName: "", email: "", password: ""});
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: formData?.email || "",
      password: formData?.password || "",
      options: {
        data: {
          full_name: formData?.fullName
        }
      }
    });

    if (error){
      alert("Error: " + error.message);
    } else {
      alert("Registration successful! Please check your email/login.");
      router.push("/login");
    }
    setLoading(false);
  };

  const handleChange = (field: keyof InitialForm, value: string) => {
    setFormData((prev) => ({...prev, [field]: value}))
  }

  return (
    <div className="flex min-h-screen bg-[#f6f6f8] dark:bg-[#121022] font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300">
      
      <div className="hidden lg:flex lg:w-1/2 bg-[#2111d4] relative overflow-hidden flex-col justify-between p-12 text-white">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-125 h-125 bg-indigo-400 rounded-full blur-[120px]"></div>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="size-8 bg-white text-[#2111d4] rounded-lg flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl font-bold">toys_fan</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Flow</h1>
        </div>

        <div className="relative z-10">
          <h2 className="text-5xl font-bold leading-tight mb-6">Unlock your <br/>productivity flow</h2>
          <p className="text-indigo-100 text-xl max-w-md leading-relaxed">
            MindFlow: Where focus meets execution. Join thousands of users optimizing their workflow today.
          </p>
        </div>

        <div className="relative z-10 flex gap-6 text-indigo-200 text-sm">
          <span>© 2026 Flow.</span>
          <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
          <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-white dark:bg-[#121022]">
        <div className="w-full max-w-110 space-y-8">
          
          <div className="text-center lg:text-left">
            <div className="lg:hidden flex justify-center mb-8">
              <div className="flex items-center gap-2 text-[#2111d4]">
                <span className="material-symbols-outlined text-3xl font-bold">grid_view</span>
                <span className="text-2xl font-bold">MindFlow</span>
              </div>
            </div>
            <h2 className="text-3xl font-bold tracking-tight">Get started for free</h2>
            <p className="mt-2 text-slate-500 dark:text-slate-400">
              Already have an account? <Link href="/login" className="text-[#2111d4] font-semibold hover:underline">Log in</Link>
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button className="flex items-center justify-center gap-3 px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all font-semibold text-sm text-slate-700 dark:text-slate-200 shadow-sm">
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
              <span>Google</span>
            </button>
            <button className="flex items-center justify-center gap-3 px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all font-semibold text-sm text-slate-700 dark:text-slate-200 shadow-sm">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.041-1.416-4.041-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"></path></svg>
              <span>GitHub</span>
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-slate-700"></div></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white dark:bg-[#121022] px-4 text-slate-400 font-medium tracking-wider">Or sign up with email</span></div>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="block text-sm font-semibold" htmlFor="full-name">Full Name</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">person</span>
                <input id="full-name" type="text" placeholder="Jojon" className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-[#2111d4]/20 focus:border-[#2111d4] outline-none transition-all" value={formData?.fullName} onChange={(e) => handleChange("fullName", e.target.value)}/>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold" htmlFor="email">Email Address</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">mail</span>
                <input id="email" type="email" placeholder="emailmu@company.com" className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-[#2111d4]/20 focus:border-[#2111d4] outline-none transition-all" value={formData.email} onChange={(e) => handleChange("email", e.target.value)}/>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold" htmlFor="password">Password</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">lock</span>
                
                <input 
                  id="password" 
                  type={showPassword ? "text" : "password"} 
                  placeholder="••••••••" 
                  className="w-full pl-10 pr-12 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-[#2111d4]/20 focus:border-[#2111d4] outline-none transition-all"
                  value={formData.password}
                  onChange={e => handleChange("password", e.target.value)}
                />
                
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 outline-none"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
              
              <div className="flex gap-1 mt-2">
                <div className="h-1 w-full rounded-full bg-[#2111d4]"></div>
                <div className="h-1 w-full rounded-full bg-[#2111d4]"></div>
                <div className="h-1 w-full rounded-full bg-slate-200 dark:bg-slate-700"></div>
                <div className="h-1 w-full rounded-full bg-slate-200 dark:bg-slate-700"></div>
              </div>
              <p className="text-[11px] text-slate-500">Password must be at least 8 characters long.</p>
            </div>

            <button disabled={loading} type="submit" className="w-full py-3 px-4 bg-[#2111d4] hover:bg-[#2111d4]/90 text-white font-bold rounded-lg shadow-lg shadow-[#2111d4]/25 transition-all flex items-center justify-center gap-2">
            {loading ? "Creating Account" : (
              <>
                <span>Create Account</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </>
            )}
            </button>
          </form>

          <p className="text-xs text-center text-slate-400 leading-relaxed px-4">
            By clicking "Create Account", you agree to Flow's <Link href="#" className="underline hover:text-[#2111d4] transition-colors">Terms of Service</Link> and <Link href="#" className="underline hover:text-[#2111d4] transition-colors">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}