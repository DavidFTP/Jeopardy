import type { Game } from "../types/game";

export function GameCard({
  game,
  index,
  isPlaying,
  isPodium,
  onEdit,
  onPlay,
  onDelete,
  onRestart,
}: {
  game: Game;
  index: number;
  isPlaying: boolean;
  isPodium: boolean;
  onEdit: () => void;
  onPlay: () => void;
  onDelete: () => void;
  onRestart: () => void;
}) {
  const title = game.title.trim() || `Game ${index + 1}`;
  const hasImage = !!game.coverImageUrl?.trim();
  return (
    <div className="relative rounded-2xl overflow-hidden shadow-lg border border-white/10 flex flex-col min-h-[190px]">
      {/* background */}
      {hasImage ? (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${game.coverImageUrl})` }}
          />
          <div className="absolute inset-0 bg-[#0f1d45]/65" />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a2d5c] to-[#0f1d45]" />
      )}

      {/* playing badge */}
      {isPlaying && (
        <span className="absolute top-3 left-3 bg-[#FFD700] text-[#0f1d45] text-[11px] font-black px-2.5 py-1 rounded-full tracking-widest">
          PLAYING
        </span>
      )}

      {/* delete trash */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        aria-label="Delete game"
        className="absolute top-2.5 right-2.5 z-10 w-8 h-8 rounded-full bg-black/35 hover:bg-red-600 text-white flex items-center justify-center backdrop-blur transition"
      >
        <TrashIcon />
      </button>

      {/* title */}
      <div className="relative flex-1 flex flex-col items-center justify-center p-6 pt-10">
        <h3 className="text-white font-black text-xl md:text-2xl text-center leading-tight drop-shadow">
          {title}
        </h3>
        <div className="mt-2 flex gap-1.5 flex-wrap justify-center">
          <span className="text-white/70 text-xs">
            {game.boards.jeopardy.categories.length}×
            {game.boards.jeopardy.categories[0]?.clues.length ?? 0}
            {game.boards.double.enabled ? " + Double" : ""}
            {game.boards.final.enabled ? " + Final" : ""}
          </span>
        </div>
      </div>

      {/* buttons */}
      <div className="relative p-3 pt-0 flex gap-2">
        <button
          onClick={onEdit}
          className="flex-1 bg-white/15 hover:bg-white/25 backdrop-blur text-white font-bold text-sm py-2 rounded-full border border-white/20 transition"
        >
          Edit
        </button>
        <button
          onClick={onPlay}
          className="flex-1 bg-[#FFD700] hover:bg-[#ffdf33] text-[#0f1d45] font-black text-sm py-2 rounded-full shadow transition"
        >
          {isPodium ? "Podium" : "Play"}
        </button>
        {(isPlaying || isPodium) && (
          <button
            onClick={onRestart}
            className="px-4 bg-red-600 hover:bg-red-700 text-white font-bold text-sm py-2 rounded-full transition"
          >
            Restart
          </button>
        )}
      </div>
    </div>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}
