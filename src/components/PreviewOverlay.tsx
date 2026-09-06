import { useEffect, useState } from "react";
import type { BoardId, Clue, Game } from "../types/game";
import { getClueValue } from "../types/game";
import { XIcon } from "./icons";

export function PreviewOverlay({
  game,
  onClose,
}: {
  game: Game;
  onClose: () => void;
}) {
  const [currentBoard, setCurrentBoard] = useState<BoardId>("jeopardy");
  const [activeClue, setActiveClue] = useState<{
    clue: Clue;
    catIdx: number;
    rowIdx: number;
    boardId: BoardId;
  } | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [flashRed, setFlashRed] = useState(false);

  const board = game.boards[currentBoard];
  const displayTitle = game.title.trim() || "Untitled Game";
  const enabledBoards = (["jeopardy", "double", "final"] as BoardId[]).filter(
    (bid) => game.boards[bid].enabled
  );

  const handleClueClick = (catIdx: number, rowIdx: number, clue: Clue) => {
    setShowAnswer(false);
    setActiveClue({ clue, catIdx, rowIdx, boardId: currentBoard });
  };

  // Reset countdown when a clue is revealed
  useEffect(() => {
    setFlashRed(false);
    if (!activeClue || activeClue.clue.timeLimit == null) {
      setTimeLeft(null);
      return;
    }
    setTimeLeft(activeClue.clue.timeLimit);
  }, [activeClue]);

  // countdown tick
  useEffect(() => {
    if (timeLeft == null || timeLeft <= 0) return;
    const t = setTimeout(() => setTimeLeft((s) => (s == null ? null : s - 1)), 1000);
    return () => clearTimeout(t);
  }, [timeLeft]);

  // flash red when time hits zero, then return to original colour
  useEffect(() => {
    if (timeLeft !== 0) return;
    setFlashRed(true);
    const t = setTimeout(() => setFlashRed(false), 1000);
    return () => clearTimeout(t);
  }, [timeLeft]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-hidden"
      style={
        game.coverImageUrl?.trim()
          ? {
              backgroundImage: `linear-gradient(rgba(6,12,233,0.88), rgba(3,17,75,0.92)), url(${game.coverImageUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundAttachment: "fixed",
            }
          : { background: "#0f1d45" }
      }
    >
      {/* top left */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <button
          onClick={onClose}
          className="text-xs bg-white/15 hover:bg-white/25 text-white px-3 py-1.5 rounded-full"
        >
          ← Back to Edit
        </button>
      </div>

      {/* top centered title */}
      <header className="text-center pt-4 pb-2 px-4">
        <div className="text-white font-black tracking-tight text-xl md:text-2xl">
          Preview
        </div>
        <div className="text-[#FFD700] font-bold text-lg mt-1">{displayTitle}</div>
      </header>

      {/* top right board pills */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        {enabledBoards.map((bid) => (
          <button
            key={bid}
            onClick={() => {
              setCurrentBoard(bid);
              setActiveClue(null);
              setShowAnswer(false);
            }}
            className={`px-4 py-1.5 rounded-full text-xs font-black border ${
              currentBoard === bid
                ? "bg-[#FFD700] border-[#FFD700] text-[#0f1d45]"
                : "bg-white/10 border-white/20 text-white hover:bg-white/20"
            }`}
          >
            {bid === "jeopardy" ? "Jeopardy" : bid === "double" ? "Double" : "Final"}
          </button>
        ))}
      </div>

      {/* main area */}
      <div className="flex-1 flex min-h-0 overflow-hidden pt-6">
        <div className="flex-1 min-h-0 overflow-hidden">
          <main className="h-full flex flex-col px-4 py-4">
            {currentBoard === "final" ? (
              <div className="flex-1 min-h-0">
                <FinalPreview
                  board={game.boards.final}
                  onClueClick={(clue) => {
                    setShowAnswer(false);
                    setActiveClue({ clue, catIdx: 0, rowIdx: 0, boardId: "final" });
                  }}
                />
              </div>
            ) : (
              <div className="flex-1 min-h-0">
                <PreviewGrid board={board} onClueClick={handleClueClick} />
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Clue card */}
      {activeClue && (
        <div className="fixed inset-0 z-10 flex flex-col bg-[#0f1d45]">
          <button
            onClick={() => setActiveClue(null)}
            className="absolute top-4 right-4 z-10 w-20 h-20 rounded-full bg-white/15 hover:bg-red-600 text-white flex items-center justify-center backdrop-blur"
            aria-label="Close question"
          >
            <XIcon size={30} />
          </button>

          <div className="flex-1 flex items-center justify-center p-6 md:p-10 overflow-auto">
            <div className={`bg-white rounded-3xl shadow-2xl w-full max-w-[85vw] min-h-[85vh] flex flex-col p-6 md:p-10 relative transition-colors duration-1000 ${flashRed ? "bg-[#fecaca]" : "bg-white"}`}>
              <div className="text-center">
                <div className="inline-flex items-center gap-4 bg-[#0f1d45] text-white px-8 py-3 rounded-full text-2xl font-black tracking-widest">
                  {activeClue.boardId === "final"
                    ? "FINAL JEOPARDY"
                    : activeClue.boardId === "double"
                    ? "DOUBLE JEOPARDY"
                    : "JEOPARDY"}
                  {activeClue.boardId !== "final" &&
                    ` · ${getClueValue(activeClue.clue, activeClue.rowIdx, activeClue.boardId)}`}
                </div>
                {activeClue.clue.isDailyDouble && (
                  <span className="ml-4 inline-block bg-red-600 text-white px-6 py-2 rounded-full text-2xl font-black">
                    DAILY DOUBLE
                  </span>
                )}
                <p dir="auto" className="text-2xl font-bold tracking-widest text-slate-500 mt-4">
                  {game.boards[activeClue.boardId]?.categories[activeClue.catIdx]?.title}
                </p>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center py-12">
                <p dir="auto" className="text-5xl md:text-7xl font-black text-slate-900 text-center leading-tight max-w-[70vw]">
                  {activeClue.clue.question || "(No question set — edit this clue)"}
                </p>

                {activeClue.clue.media.length > 0 && (
                  <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-[70vw]">
                    {activeClue.clue.media.map((m) => (
                      <div
                        key={m.id}
                        className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-50"
                      >
                        {m.type === "image" && m.url.trim() && (
                          <img src={m.url} alt="" className="w-full max-h-[640px] object-contain bg-black" />
                        )}
                        {m.type === "video" && m.url.trim() && (
                          <video src={m.url} controls className="w-full max-h-[640px] bg-black" />
                        )}
                        {m.type === "audio" && m.url.trim() && (
                          <audio src={m.url} controls className="w-full p-6" />
                        )}
                        {!m.url.trim() && (
                          <div className="p-4 text-2xl text-slate-400">Empty {m.type} URL</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-8 flex flex-col items-center gap-6">
                {!showAnswer ? (
                  <button
                    onClick={() => setShowAnswer(true)}
                    className="bg-slate-900 hover:bg-black text-white px-12 py-5 rounded-full font-bold text-3xl"
                  >
                    Show Answer
                  </button>
                ) : (
                  <div className="bg-[#FFD700]/20 border-2 border-[#FFD700] rounded-2xl px-12 py-8 w-full max-w-[55vw] text-center">
                    <p className="text-2xl font-black tracking-widest text-slate-600">ANSWER</p>
                    <p dir="auto" className="text-4xl font-black text-slate-900 mt-2">
                      {activeClue.clue.answer || "(No answer set)"}
                    </p>
                  </div>
                )}
              </div>

              {/* bottom left countdown */}
              {timeLeft != null && activeClue.boardId !== "final" && (
                <div className={`absolute bottom-4 left-4 z-10 rounded-full px-8 py-4 text-3xl font-black tracking-widest shadow-lg ${timeLeft <= 5 ? "bg-red-600 text-white animate-pulse" : "bg-slate-900 text-white"}`}>
                  {timeLeft}s
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PreviewGrid({
  board,
  onClueClick,
}: {
  board: import("../types/game").Board;
  onClueClick: (catIdx: number, rowIdx: number, clue: Clue) => void;
}) {
  if (!board) return null;
  const cols = board.categories.length;
  const showCats = board.showCategories;
  const ROW_LABEL_W = 24;
  const GAP = 8;

  return (
    <div className="flex flex-col h-full">
      {showCats && (
        <div className="flex mb-2 shrink-0" style={{ gap: GAP }}>
          <div className="shrink-0" style={{ width: ROW_LABEL_W }} />
          <div
            className="flex-1 grid"
            style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: GAP }}
          >
            {board.categories.map((cat) => (
              <div
                key={cat.id}
                className="bg-[#0f1d45] border-2 border-[#FFD700]/30 rounded-xl p-2 min-h-[40px] flex items-center justify-center text-center"
              >
                <span dir="auto" className="text-white font-black text-xs sm:text-sm leading-tight">
                  {cat.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 flex flex-col" style={{ gap: GAP }}>
        {Array.from({ length: board.categories[0]?.clues.length ?? 0 }).map((_, rowIdx) => (
          <div key={rowIdx} className="flex-1 min-h-0 flex" style={{ gap: GAP }}>
            <div
              className="shrink-0 flex items-center justify-center"
              style={{ width: ROW_LABEL_W }}
            >
              <span className="text-white/40 text-[10px] font-bold tracking-wider [writing-mode:vertical-lr] rotate-180 select-none">
                {board.id === "jeopardy" ? (rowIdx + 1) * 100 : (rowIdx + 1) * 200}
              </span>
            </div>
            <div
              className="flex-1 grid min-h-0"
              style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: GAP }}
            >
              {board.categories.map((cat, colIdx) => {
                const clue = cat.clues[rowIdx];
                const value = getClueValue(clue, rowIdx, board.id);
                return (
                  <button
                    key={`${cat.id}-${rowIdx}`}
                    onClick={() => onClueClick(colIdx, rowIdx, clue)}
                    className="rounded-xl border-2 min-h-0 min-w-0 flex items-center justify-center text-center transition border-[#1a2d5c] bg-[#0f1d45] hover:border-[#FFD700] hover:bg-[#1a2d5c] text-[#FFD700] cursor-pointer"
                  >
                    <span className="font-black text-lg sm:text-2xl md:text-3xl tracking-tight drop-shadow">
                      {value}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FinalPreview({
  board,
  onClueClick,
}: {
  board: import("../types/game").Board;
  onClueClick: (clue: Clue) => void;
}) {
  const clue = board.categories[0]?.clues[0];
  const cat = board.categories[0];
  if (!clue || !cat) return null;

  return (
    <div className="h-full flex flex-col p-6 max-w-[700px] w-full mx-auto">
      {board.showCategories && (
        <div className="shrink-0 bg-[#0f1d45] border-2 border-[#FFD700]/30 rounded-xl px-1.5 py-2 min-h-[44px] flex items-center">
          <span dir="auto" className="flex-1 min-w-0 text-center font-black text-sm text-white">
            {cat.title}
          </span>
        </div>
      )}
      <div className="mt-3 flex-1 min-h-0 rounded-xl border-2 border-[#1a2d5c] bg-[#0f1d45] hover:border-[#FFD700] hover:bg-[#1a2d5c] transition flex items-center justify-center text-center cursor-pointer">
        <button
          onClick={() => onClueClick(clue)}
          className="w-full h-full flex items-center justify-center text-[#FFD700] font-black text-2xl md:text-4xl tracking-tight drop-shadow"
        >
          FINAL JEOPARDY
        </button>
      </div>
    </div>
  );
}
