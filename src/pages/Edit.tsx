import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { EditTopBar } from "../components/TopBar";
import { BoardGridEditor } from "../components/BoardGridEditor";
import { ClueEditorModal } from "../components/ClueEditorModal";
import { PreviewOverlay } from "../components/PreviewOverlay";
import { PlusIcon, XIcon } from "../components/icons";
import type { BoardId, Clue, Game } from "../types/game";
import { getClueValue } from "../types/game";
import {
  createEmptyCategory,
  createEmptyClue,
  getAutoNumberForNew,
} from "../services/gameRepository";
import { useGameStore } from "../stores/gameStore";

function ImageIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/40">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

export default function Edit() {
  const { id } = useParams();
  const nav = useNavigate();
  const { games, load, saveGame } = useGameStore();
  const [game, setGame] = useState<Game | null>(null);
  const [activeBoard, setActiveBoard] = useState<BoardId>("jeopardy");
  const [editingClue, setEditingClue] = useState<{
    catIdx: number;
    rowIdx: number;
    clue: Clue;
  } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const bgInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!id) return;
    const found = games.find((g) => g.id === id);
    if (found) setGame(structuredClone(found) as Game);
    else if (games.length > 0) nav("/", { replace: true });
  }, [id, games, nav]);

  // Auto-save debounce
  useEffect(() => {
    if (!game) return;
    const t = setTimeout(() => {
      saveGame({ ...game, updatedAt: Date.now() });
    }, 800);
    return () => clearTimeout(t);
  }, [game, saveGame]);

  const placeholder = useMemo(() => {
    if (!game) return "Game";
    if (game.title.trim()) return game.title;
    const idx = games.findIndex((g) => g.id === game.id);
    const n = getAutoNumberForNew(games.filter((g) => g.id !== game.id));
    const displayIdx = idx >= 0 ? idx + 1 : n;
    return `Game ${displayIdx}`;
  }, [game, games]);

  if (!game) {
    return (
      <div className="min-h-screen bg-[#0f1d45] flex items-center justify-center text-white">
        Loading...
      </div>
    );
  }

  const board = game.boards[activeBoard];

  const handleSaveClue = (updated: Clue) => {
    if (!editingClue) return;
    setGame((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev) as Game;
      const b = next.boards[activeBoard];
      b.categories[editingClue.catIdx].clues[editingClue.rowIdx] = updated;
      return next;
    });
    setEditingClue(null);
  };

  const handleDeleteClue = () => {
    if (!editingClue) return;
    setGame((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev) as Game;
      const b = next.boards[activeBoard];
      b.categories[editingClue.catIdx].clues[editingClue.rowIdx] = createEmptyClue();
      return next;
    });
    setEditingClue(null);
  };

  const handleCategoryTitle = (catIdx: number, title: string) => {
    setGame((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev) as Game;
      next.boards[activeBoard].categories[catIdx].title = title;
      return next;
    });
  };

  const toggleBoardEnabled = (bid: BoardId) => {
    setGame((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev) as Game;
      const b = next.boards[bid];
      if (b.enabled) {
        b.enabled = false;
        if (activeBoard === bid) setActiveBoard("jeopardy");
      } else {
        b.enabled = true;
        if (b.categories.length === 0) {
          b.categories = [createEmptyCategory(0, 4)];
          if (bid === "final") {
            b.categories = [{ id: Math.random().toString(36).slice(2), title: "Final Category", clues: [createEmptyClue()] }];
          }
        }
        setActiveBoard(bid);
      }
      return next;
    });
  };

  const resizeBoard = (cols: number, rows: number) => {
    if (activeBoard === "final") return;
    cols = Math.max(1, Math.min(10, cols));
    rows = Math.max(1, Math.min(10, rows));
    setGame((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev) as Game;
      const b = next.boards[activeBoard];
      while (b.categories.length < cols) {
        b.categories.push(createEmptyCategory(b.categories.length, rows));
      }
      while (b.categories.length > cols) b.categories.pop();
      for (const cat of b.categories) {
        while (cat.clues.length < rows) cat.clues.push(createEmptyClue());
        while (cat.clues.length > rows) cat.clues.pop();
      }
      return next;
    });
  };

  const currentCols = board.categories.length;
  const currentRows = board.categories[0]?.clues.length ?? 0;

  const handlePlay = () => {
    saveGame({ ...game, updatedAt: Date.now() });
    nav(`/play/${game.id}`);
  };

  const handleBack = () => {
    saveGame({ ...game, updatedAt: Date.now() });
    nav("/");
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#0f1d45]">
      <EditTopBar
        title={game.title}
        onTitleChange={(v) => setGame({ ...game, title: v })}
        onBack={handleBack}
        onPlay={handlePlay}
        onPreview={() => setPreviewOpen(true)}
        placeholder={placeholder}
      />

      <div className="flex-1 flex min-h-0">
        {/* Main content */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden px-6 pt-9 pb-4">
            {/* Board pills - floating, no panel */}
            <div className="flex items-center justify-center gap-3 mb-5 shrink-0">
              {/* Jeopardy - always enabled */}
              <button
                onClick={() => setActiveBoard("jeopardy")}
                className={`px-6 py-2.5 rounded-full font-bold text-sm border-2 transition
                  ${activeBoard === "jeopardy"
                    ? "bg-white border-[#FFD700] text-[#0f1d45]"
                    : "bg-transparent border-white/30 text-white/70 hover:border-white/50 hover:text-white"
                  }
                `}
              >
                Jeopardy
              </button>

              {/* Double Jeopardy */}
              <div className="relative">
                {!game.boards.double.enabled ? (
                  <button
                    onClick={() => toggleBoardEnabled("double")}
                    title="Add Double Jeopardy"
                    aria-label="Add Double Jeopardy"
                    className="px-4 py-2.5 rounded-full bg-transparent border-2 border-white/30 text-white/70 hover:border-white/60 hover:text-white font-bold text-sm flex items-center gap-1.5 transition"
                  >
                    <PlusIcon size={18} />
                    Add Double Jeopardy
                  </button>
                ) : (
                <button
                  onClick={() => setActiveBoard("double")}
                  className={`px-6 py-2.5 rounded-full font-bold text-sm border-2 transition
                    ${activeBoard === "double"
                      ? "bg-white border-[#FFD700] text-[#0f1d45]"
                      : "bg-transparent border-white/30 text-white/70 hover:border-white/50 hover:text-white"
                    }
                  `}
                >
                  Double Jeopardy
                </button>
                )}
                {game.boards.double.enabled && (
                  <button
                    onClick={() => toggleBoardEnabled("double")}
                    className="absolute -top-2 -right-2.5 w-6 h-6 rounded-full bg-[#1e3a6e] hover:bg-red-500 text-white flex items-center justify-center border-2 border-[#0f1d45] transition"
                    title="Remove Double Jeopardy"
                    aria-label="Remove Double Jeopardy"
                  >
                    <XIcon size={9} />
                  </button>
                )}
              </div>

              {/* Final Jeopardy */}
              <div className="relative">
                {!game.boards.final.enabled ? (
                  <button
                    onClick={() => toggleBoardEnabled("final")}
                    title="Add Final Jeopardy"
                    aria-label="Add Final Jeopardy"
                    className="px-4 py-2.5 rounded-full bg-transparent border-2 border-white/30 text-white/70 hover:border-white/60 hover:text-white font-bold text-sm flex items-center gap-1.5 transition"
                  >
                    <PlusIcon size={18} />
                    Add Final Jeopardy
                  </button>
                ) : (
                <button
                  onClick={() => setActiveBoard("final")}
                  className={`px-6 py-2.5 rounded-full font-bold text-sm border-2 transition
                    ${activeBoard === "final"
                      ? "bg-white border-[#FFD700] text-[#0f1d45]"
                      : "bg-transparent border-white/30 text-white/70 hover:border-white/50 hover:text-white"
                    }
                  `}
                >
                  Final Jeopardy
                </button>
                )}
                {game.boards.final.enabled && (
                  <button
                    onClick={() => toggleBoardEnabled("final")}
                    className="absolute -top-2 -right-2.5 w-6 h-6 rounded-full bg-[#1e3a6e] hover:bg-red-500 text-white flex items-center justify-center border-2 border-[#0f1d45] transition"
                    title="Remove Final Jeopardy"
                    aria-label="Remove Final Jeopardy"
                  >
                    <XIcon size={9} />
                  </button>
                )}
              </div>
            </div>

          {/* Grid - takes remaining space, no scroll */}
          <div className="flex-1 min-h-0">
            {!board.enabled ? (
              <div className="h-full flex items-center justify-center">
                <div className="bg-white/5 border border-dashed border-white/20 rounded-2xl p-10 text-center">
                  <p className="text-white font-bold">{board.id === "double" ? "Double Jeopardy is off" : "Final Jeopardy is off"}</p>
                  <p className="text-white/60 text-sm mt-1">Click the pill above to re-enable. Previous edits are kept.</p>
                  <button onClick={() => toggleBoardEnabled(board.id)} className="mt-4 px-6 py-2 rounded-full bg-[#FFD700] text-[#0f1d45] font-black text-sm">Enable</button>
                </div>
              </div>
            ) : (
              <BoardGridEditor
                board={board}
                onCategoryTitleChange={handleCategoryTitle}
                onClueClick={(catIdx, rowIdx, clue) => setEditingClue({ catIdx, rowIdx, clue })}
              />
            )}
          </div>
        </div>

        {/* Right side panel - hovering card from edge */}
        <aside className="hidden lg:flex shrink-0 w-[180px] pr-0 items-center">
          <div className="w-full bg-[#1a2d5c] rounded-l-2xl border border-white/10 border-r-0 p-4 space-y-4 shadow-2xl">
            {/* Columns */}
            {activeBoard !== "final" && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/60">
                  <rect x="3" y="3" width="7" height="18" rx="1" />
                  <rect x="14" y="3" width="7" height="18" rx="1" />
                </svg>
                <span className="text-white text-sm font-bold">Columns</span>
              </div>
              <div className="flex items-center justify-between">
                <button
                  onClick={() => resizeBoard(currentCols - 1, currentRows)}
                  className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white font-bold text-lg flex items-center justify-center transition"
                >
                  −
                </button>
                <span className="text-white font-black text-xl w-10 text-center">{currentCols}</span>
                <button
                  onClick={() => resizeBoard(currentCols + 1, currentRows)}
                  disabled={currentCols >= 10}
                  className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white font-bold text-lg flex items-center justify-center transition disabled:opacity-30"
                >
                  +
                </button>
              </div>
            </div>
            )}

            {activeBoard !== "final" && <div className="border-t border-white/10" />}

            {/* Rows */}
            {activeBoard !== "final" && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/60">
                  <rect x="3" y="3" width="18" height="7" rx="1" />
                  <rect x="3" y="14" width="18" height="7" rx="1" />
                </svg>
                <span className="text-white text-sm font-bold">Rows</span>
              </div>
              <div className="flex items-center justify-between">
                <button
                  onClick={() => resizeBoard(currentCols, currentRows - 1)}
                  className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white font-bold text-lg flex items-center justify-center transition"
                >
                  −
                </button>
                <span className="text-white font-black text-xl w-10 text-center">{currentRows}</span>
                <button
                  onClick={() => resizeBoard(currentCols, currentRows + 1)}
                  disabled={currentRows >= 10}
                  className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white font-bold text-lg flex items-center justify-center transition disabled:opacity-30"
                >
                  +
                </button>
              </div>
            </div>
            )}

            <div className="border-t border-white/10" />

            {/* Background */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/60">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span className="text-white text-sm font-bold">Background</span>
              </div>
              <input
                ref={bgInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    setGame({ ...game, coverImageUrl: ev.target?.result as string });
                  };
                  reader.readAsDataURL(file);
                }}
              />
              <button
                onClick={() => bgInputRef.current?.click()}
                className="w-full border-2 border-dashed border-white/20 rounded-xl p-5 flex flex-col items-center justify-center gap-2 hover:border-white/40 hover:bg-white/5 transition cursor-pointer"
              >
                {game.coverImageUrl?.trim() ? (
                  <>
                    <img src={game.coverImageUrl} alt="Background" className="w-full h-20 object-cover rounded-lg" />
                    <span className="text-white/50 text-xs mt-1">Click to change</span>
                  </>
                ) : (
                  <>
                    <ImageIcon />
                    <span className="text-white/50 text-xs text-center leading-tight">Drag an image here,<br />or click to pick one</span>
                  </>
                )}
              </button>
              {game.coverImageUrl?.trim() && (
                <button
                  onClick={() => setGame({ ...game, coverImageUrl: "" })}
                  className="mt-2 w-full text-red-400/70 hover:text-red-400 text-xs text-center"
                >
                  Remove background
                </button>
              )}
            </div>

            {/* Show categories */}
            <div className="border-t border-white/10" />
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-white text-sm font-bold">Show categories</span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={board.showCategories}
                      onChange={(e) => setGame({ ...game, boards: { ...game.boards, [activeBoard]: { ...board, showCategories: e.target.checked } } })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FFD700]"></div>
                  </div>
            </label>
          </div>
        </aside>
      </div>

      {editingClue && (
        <ClueEditorModal
          clue={editingClue.clue}
          boardId={activeBoard}
          rowIndex={editingClue.rowIdx}
          derivedValue={activeBoard === "final" ? 0 : getClueValue(editingClue.clue, editingClue.rowIdx, activeBoard)}
          onSave={handleSaveClue}
          onDelete={handleDeleteClue}
          onClose={() => setEditingClue(null)}
        />
      )}

      {previewOpen && (
        <PreviewOverlay game={game} onClose={() => setPreviewOpen(false)} />
      )}
    </div>
  );
}
