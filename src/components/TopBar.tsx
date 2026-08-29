import { EVENT_NAME } from "../config/event";

export function HomeTopBar({ onCreate }: { onCreate: () => void }) {
  return (
    <header className="sticky top-0 z-20 bg-[#1a2d5c] border-b border-white/10 shadow-md">
      <div className="max-w-[1400px] mx-auto px-6 py-3.5 flex items-center justify-between">
        <h1 className="text-white font-black tracking-tight text-xl md:text-2xl">
          {EVENT_NAME}
        </h1>
        <button
          onClick={onCreate}
          className="bg-[#FFD700] hover:bg-[#ffdf33] text-[#0f1d45] font-extrabold px-6 py-2 rounded-full shadow transition text-sm md:text-base"
        >
          + Create
        </button>
      </div>
    </header>
  );
}

export function EditTopBar({
  title,
  onTitleChange,
  onBack,
  onPlay,
  placeholder,
}: {
  title: string;
  onTitleChange: (v: string) => void;
  onBack: () => void;
  onPlay: () => void;
  placeholder: string;
}) {
  return (
    <header className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-[1800px] mx-auto px-6 h-16 flex items-center gap-6">
        <button
          onClick={onBack}
          className="shrink-0 w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-[#0f1d45] transition"
          aria-label="Back"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder={placeholder}
          className="w-72 bg-transparent text-slate-900 placeholder:text-slate-400 border border-slate-300 rounded-lg px-4 py-2 text-sm font-semibold outline-none focus:border-[#0f1d45] focus:ring-1 focus:ring-[#0f1d45]/30 transition"
        />
        <div className="flex-1" />
        <div className="flex items-center gap-4 shrink-0">
          <button
            disabled
            title="Coming soon"
            className="hidden md:inline-flex text-slate-400 text-sm font-semibold cursor-not-allowed"
          >
            Preview
          </button>
          <button
            onClick={onPlay}
            className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-[#0f1d45] text-sm font-semibold transition"
          >
            Play
          </button>
        </div>
      </div>
    </header>
  );
}
