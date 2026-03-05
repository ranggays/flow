interface ActivityRowProps {
  title: string;
  subtitle: string;
  time: string;
  icon: string;
  colorClass: string;
}

export default function ActivityRow({ title, subtitle, time, icon, colorClass }: ActivityRowProps) {
  return (
    <div className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
      <div className="flex items-center gap-4">
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${colorClass}`}>
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</p>
          <p className="text-xs text-slate-500">
            In <span className="text-blue-700 font-medium">{subtitle}</span> • {time}
          </p>
        </div>
      </div>
      <button className="text-slate-400 hover:text-slate-600">
        <span className="material-symbols-outlined">more_vert</span>
      </button>
    </div>
  );
}