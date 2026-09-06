import type { Board, Category, Clue } from "../types/game";
import { PlusIcon } from "./icons";

export function BoardGridEditor({
  board,
  onCategoryTitleChange,
  onClueClick,
}: {
  board: Board;
  onCategoryTitleChange: (catIdx: number, title: string) => void;
  onClueClick: (catIdx: number, rowIdx: number, clue: Clue) => void;
}) {
  const cols = board.categories.length;
  const rows = board.categories[0]?.clues.length ?? 0;
  const showCats = board.showCategories;

  if (board.id === "final") {
    const clue = board.categories[0]?.clues[0];
    const cat = board.categories[0];
    if (!clue || !cat) return null;
    const hasContent = clue.question.trim() || clue.answer.trim();
    return (
      <div className="h-full flex flex-col p-6 max-w-[700px] w-full mx-auto">
        {/* Category box - matches normal grid category style */}
        {showCats && (
          <div className="shrink-0 bg-white rounded-xl border-2 border-[#FFD700] px-1.5 py-2 min-h-[44px] flex items-center">
            <input
              dir="auto"
              value={cat.title}
              onChange={(e) => onCategoryTitleChange(0, e.target.value)}
              className="flex-1 min-w-0 bg-transparent text-slate-800 placeholder:text-slate-400 text-center font-black text-sm outline-none"
              placeholder="Final Category"
            />
          </div>
        )}

        {/* Clue box - matches normal grid empty clue cell */}
        <button
          onClick={() => onClueClick(0, 0, clue)}
          className={`mt-3 flex-1 min-h-0 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 text-center transition group overflow-hidden
            ${hasContent
              ? "bg-white border-[#FFD700] hover:shadow-lg hover:shadow-[#FFD700]/20"
              : "bg-[#1e3a6e]/60 border-[#3b82f6]/40 hover:border-[#FFD700] hover:bg-[#1e3a6e]/80"
            }
          `}
        >
          {!hasContent ? (
            <>
              <span className="text-white/30 group-hover:text-[#FFD700]/60 transition">
                <PlusIcon size={40} />
              </span>
            </>
          ) : (
            <div className="w-full text-center p-4">
              <div className="text-xs font-black tracking-widest text-slate-700 mb-2">
                {clue.isDailyDouble ? <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full">DD</span> : "FINAL JEOPARDY CLUE"}
              </div>
              <div className="space-y-2">
                <p dir="auto" className="text-slate-900 font-bold line-clamp-3">{clue.question || "Click to edit question..."}</p>
                <div className="border-t border-dashed border-slate-400 my-2" />
                <p dir="auto" className="text-slate-700 text-sm line-clamp-2">{clue.answer || "Click to edit answer..."}</p>
              </div>
              {clue.media.length > 0 && <p className="text-xs text-slate-600 mt-2">{clue.media.length} media attached</p>}
            </div>
          )}
        </button>
      </div>
    );
  }

  if (cols === 0 || rows === 0) {
    return (
      <div className="h-full flex items-center justify-center text-white/60">
        Empty board — add columns/rows from the right panel.
      </div>
    );
  }

  const ROW_LABEL_W = 24; // px
  const GAP = 12; // px gap between cells

  // Shrink placeholder sizing as the grid gets denser so 10x10 stays tight.
  const dense = cols >= 8 || rows >= 8;
  const veryDense = cols >= 10 || rows >= 10;
  const plusSize = dense ? 18 : 22;
  const valueText = veryDense
    ? "text-base sm:text-lg"
    : dense
      ? "text-lg sm:text-xl"
      : "text-xl sm:text-2xl md:text-3xl";

  return (
    <div className="h-full flex flex-col p-4">
      <div className="flex-1 min-h-0 flex flex-col">
        {/* Category headers row */}
        {showCats && (
          <div className="flex mb-3" style={{ gap: GAP }}>
            <div className="shrink-0" style={{ width: ROW_LABEL_W }} />
            <div
              className="flex-1 grid"
              style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: GAP }}
            >
              {board.categories.map((cat: Category, ci: number) => (
                <div
                  key={cat.id}
                  className="bg-white rounded-xl border-2 border-[#FFD700] px-1.5 py-2 min-h-[44px] min-w-0 flex items-center gap-1 overflow-hidden"
                >
                  <input
                    dir="auto"
                    value={cat.title}
                    onChange={(e) => onCategoryTitleChange(ci, e.target.value)}
                    className="flex-1 min-w-0 bg-transparent text-slate-800 placeholder:text-slate-400 text-center font-black text-sm outline-none"
                    placeholder="Category..."
                  />
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="flex-1 min-h-0 flex flex-col" style={{ gap: GAP }}>
          {Array.from({ length: rows }).map((_, rowIdx) => {
            const value = board.id === "jeopardy" ? (rowIdx + 1) * 100 : (rowIdx + 1) * 200;
            return (
              <div key={rowIdx} className="flex-1 min-h-0 flex" style={{ gap: GAP }}>
                {/* Row label */}
                <div className="shrink-0 flex items-center justify-center" style={{ width: ROW_LABEL_W }}>
                  <span className="text-white/40 text-[10px] font-bold tracking-wider [writing-mode:vertical-lr] rotate-180 select-none">
                    {value}
                  </span>
                </div>
                {/* Clue cells for this row */}
                <div
                  className="flex-1 grid min-h-0"
                  style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: GAP }}
                >
                  {board.categories.map((cat, colIdx) => {
                    const clue = cat.clues[rowIdx];
                    const hasContent = clue.question.trim() || clue.answer.trim();
                    return (
                      <button
                        key={`${cat.id}-${rowIdx}`}
                        onClick={() => onClueClick(colIdx, rowIdx, clue)}
                        style={{ containerType: "size" }}
                        className={`relative rounded-xl border-2 border-dashed min-h-0 min-w-0 flex flex-col items-center justify-center text-center transition group overflow-hidden
                          ${hasContent
                            ? "bg-white border-[#FFD700] hover:shadow-lg hover:shadow-[#FFD700]/20"
                            : "bg-[#1e3a6e]/60 border-[#3b82f6]/40 hover:border-[#FFD700] hover:bg-[#1e3a6e]/80"
                          }
                        `}
                      >
                        {!hasContent ? (
                          <>
                            <span className="text-white/30 group-hover:text-[#FFD700]/60 transition leading-none">
                              <PlusIcon size={plusSize} />
                            </span>
                            <span className={`font-black tracking-tight leading-none text-white/40 ${valueText}`}>
                              {value}
                            </span>
                          </>
                        ) : (
                          <div className="w-full text-center p-1.5 sm:p-2">
                            <p dir="auto" className="text-slate-800 font-medium leading-snug line-clamp-2" style={{ fontSize: "clamp(21px, min(13.5cqw, 18cqh), 66px)" }}>{clue.question}</p>
                            <div className="border-t border-dashed border-slate-300 my-1" />
                            <p dir="auto" className="text-slate-500 leading-snug line-clamp-2" style={{ fontSize: "clamp(18px, min(11.4cqw, 15cqh), 54px)" }}>{clue.answer}</p>
                          </div>
                        )}
                        {clue.isDailyDouble && (
                          <span className="absolute top-1 right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[8px] sm:text-[9px] font-black" title="Daily Double">
                            D
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
