import "./PreviewOverlay.css";
import type { CSSProperties } from "react";
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

  useEffect(() => {
    setFlashRed(false);
    if (!activeClue || activeClue.clue.timeLimit == null) {
      setTimeLeft(null);
      return;
    }
    setTimeLeft(activeClue.clue.timeLimit);
  }, [activeClue]);

  useEffect(() => {
    if (timeLeft == null || timeLeft <= 0) return;
    const t = setTimeout(() => setTimeLeft((s) => (s == null ? null : s - 1)), 1000);
    return () => clearTimeout(t);
  }, [timeLeft]);

  useEffect(() => {
    if (timeLeft !== 0) return;
    setFlashRed(true);
    const t = setTimeout(() => setFlashRed(false), 1000);
    return () => clearTimeout(t);
  }, [timeLeft]);

  return (
    <div className="prev-root" style={{ background: "#0f1d45" }}>
      <div className="prev-top-left">
        <button onClick={onClose} className="btn-glass">
          ← Back to Edit
        </button>
      </div>

      <header className="prev-header">
        <div className="prev-header__title">Preview</div>
        <div className="prev-header__sub">{displayTitle}</div>
      </header>

      <div className="prev-top-right">
        {enabledBoards.map((bid) => (
          <button
            key={bid}
            onClick={() => {
              setCurrentBoard(bid);
              setActiveClue(null);
              setShowAnswer(false);
            }}
            className={`pill-tab ${currentBoard === bid ? "pill-tab--active" : "pill-tab--idle"}`}
          >
            {bid === "jeopardy" ? "Jeopardy" : bid === "double" ? "Double" : "Final"}
          </button>
        ))}
      </div>

      <div className="prev-main">
        <div className="prev-main__sub">
          <main className="prev-main__inner">
            {currentBoard === "final" ? (
              <div className="prev-board-wrap">
                <FinalPreview
                  board={game.boards.final}
                  onClueClick={(clue) => {
                    setShowAnswer(false);
                    setActiveClue({ clue, catIdx: 0, rowIdx: 0, boardId: "final" });
                  }}
                />
              </div>
            ) : (
              <div className="prev-board-wrap">
                <PreviewGrid board={board} onClueClick={handleClueClick} />
              </div>
            )}
          </main>
        </div>
      </div>

      {activeClue && (
        <div className="prev-clue">
          <button
            onClick={() => setActiveClue(null)}
            className="icon-btn icon-btn--lg icon-btn--glass-lg"
            aria-label="Close question"
          >
            <XIcon size={30} />
          </button>

          <div className="prev-clue__center">
            <div className={`cluecard ${flashRed ? "cluecard--flash" : ""}`}>
              <div className="cluecard__top">
                <div className="cluecard__label">
                  {activeClue.boardId === "final"
                    ? "FINAL JEOPARDY"
                    : activeClue.boardId === "double"
                    ? "DOUBLE JEOPARDY"
                    : "JEOPARDY"}
                  {activeClue.boardId !== "final" &&
                    ` · ${getClueValue(activeClue.clue, activeClue.rowIdx, activeClue.boardId)}`}
                </div>
                {activeClue.clue.isDailyDouble && (
                  <span className="badge-dd badge-dd--xl">
                    DAILY DOUBLE
                  </span>
                )}
                <p dir="auto" className="cluecard__cat">
                  {game.boards[activeClue.boardId]?.categories[activeClue.catIdx]?.title}
                </p>
              </div>

              <div className="cluecard__body">
                <p dir="auto" className="cluecard__q">
                  {activeClue.clue.question || "(No question set — edit this clue)"}
                </p>

                {activeClue.clue.media.length > 0 && (
                  <div className="cluecard__media">
                    {activeClue.clue.media.map((m) => (
                      <div key={m.id} className="cluecard__media-item">
                        {m.type === "image" && m.url.trim() && (
                          <img src={m.url} alt="" className="cluecard__media-frame" />
                        )}
                        {m.type === "video" && m.url.trim() && (
                          <video src={m.url} controls className="cluecard__media-frame" />
                        )}
                        {m.type === "audio" && m.url.trim() && (
                          <audio src={m.url} controls className="cluecard__media-audio" />
                        )}
                        {!m.url.trim() && (
                          <div className="cluecard__media-empty">Empty {m.type} URL</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="cluecard__answer-zone">
                {!showAnswer ? (
                  <button onClick={() => setShowAnswer(true)} className="btn-solid-dark">
                    Show Answer
                  </button>
                ) : (
                  <div className="cluecard__answer-box">
                    <p className="cluecard__answer-label">ANSWER</p>
                    <p dir="auto" className="cluecard__answer-text">
                      {activeClue.clue.answer || "(No answer set)"}
                    </p>
                  </div>
                )}
              </div>

              {timeLeft != null && activeClue.boardId !== "final" && (
                <div
                  className={`countdown-pill ${timeLeft <= 5 ? "countdown-pill--low" : ""}`}
                >
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

  return (
    <div className="pvg">
      {showCats && (
        <div className="pvg-cats">
          <div className="pvg-spacer" />
          <div className="pvg-cats-grid" style={{ "--cols": cols } as CSSProperties}>
            {board.categories.map((cat) => (
              <div key={cat.id} className="pvg-cat">
                <span dir="auto">{cat.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="pvg-body">
        {Array.from({ length: board.categories[0]?.clues.length ?? 0 }).map((_, rowIdx) => (
          <div key={rowIdx} className="pvg-row">
            <div className="pvg-row-label">
              <span>
                {board.id === "jeopardy" ? (rowIdx + 1) * 100 : (rowIdx + 1) * 200}
              </span>
            </div>
            <div className="pvg-cells" style={{ "--cols": cols } as CSSProperties}>
              {board.categories.map((cat, colIdx) => {
                const clue = cat.clues[rowIdx];
                const value = getClueValue(clue, rowIdx, board.id);
                return (
                  <button
                    key={`${cat.id}-${rowIdx}`}
                    onClick={() => onClueClick(colIdx, rowIdx, clue)}
                    className="pvg-cell"
                  >
                    <span className="pvg-cell__value">{value}</span>
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
    <div className="pvf-root">
      {board.showCategories && (
        <div className="pvf-cat">
          <span dir="auto">{cat.title}</span>
        </div>
      )}
      <div className="pvf-clue-box">
        <button onClick={() => onClueClick(clue)} className="pvf-clue-btn">
          FINAL JEOPARDY
        </button>
      </div>
    </div>
  );
}