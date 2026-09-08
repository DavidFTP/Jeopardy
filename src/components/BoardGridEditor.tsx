import "./BoardGridEditor.css";
import type { CSSProperties } from "react";
import type { Board, Category, Clue } from "../types/game";
import { PlusIcon } from "./icons";

function formatTimeLabel(t: number): string {
  return t >= 60 ? `${t / 60} min` : `${t}s`;
}

function TimeLimitMarker({ timeLimit }: { timeLimit: number }) {
  return (
    <span
      className="bge-time-marker"
      title={`Time limit: ${formatTimeLabel(timeLimit)}`}
    >
      {formatTimeLabel(timeLimit)}
    </span>
  );
}

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
      <div className="bge-root">
        {showCats && (
          <div className="bge-cat">
            <input
              dir="auto"
              value={cat.title}
              onChange={(e) => onCategoryTitleChange(0, e.target.value)}
              className="input-ghost"
              placeholder="Final Category"
            />
          </div>
        )}

        <button
          onClick={() => onClueClick(0, 0, clue)}
          className={`bge-final-btn ${hasContent ? "bge-final-btn--has" : "bge-final-btn--empty"}`}
        >
          {!hasContent ? (
            <span className="bge-plus">
              <PlusIcon size={40} />
            </span>
          ) : (
            <div className="bge-final-content">
              <div className="bge-final-label-row">
                {clue.isDailyDouble ? <span className="badge-dd">DD</span> : "FINAL JEOPARDY CLUE"}
              </div>
              <p dir="auto" className="bge-final-q clamp-3">
                {clue.question || "Click to edit question..."}
              </p>
              <div className="bge-final-divider" />
              <p dir="auto" className="bge-final-a clamp-2">
                {clue.answer || "Click to edit answer..."}
              </p>
              {clue.media.length > 0 && (
                <p className="bge-final-meta">{clue.media.length} media attached</p>
              )}
            </div>
          )}
          {hasContent && clue.timeLimit != null && (
            <TimeLimitMarker timeLimit={clue.timeLimit} />
          )}
        </button>
      </div>
    );
  }

  if (cols === 0 || rows === 0) {
    return (
      <div className="bge-empty">
        Empty board — add columns/rows from the right panel.
      </div>
    );
  }

  const dense = cols >= 8 || rows >= 8;
  const veryDense = cols >= 10 || rows >= 10;
  const plusSize = dense ? 18 : 22;
  const density = veryDense ? "bge-grid--vdense" : dense ? "bge-grid--dense" : "";

  return (
    <div className="bge-root bge-root--tight">
      <div className="bge-grid">
        {showCats && (
          <div className="bge-cats-row">
            <div className="bge-spacer" />
            <div className="bge-cats" style={{ "--cols": cols } as CSSProperties}>
              {board.categories.map((cat: Category, ci: number) => (
                <div key={cat.id} className="bge-cat">
                  <input
                    dir="auto"
                    value={cat.title}
                    onChange={(e) => onCategoryTitleChange(ci, e.target.value)}
                    className="input-ghost"
                    placeholder="Category..."
                  />
                </div>
              ))}
            </div>
          </div>
        )}
        <div className={`bge-grid ${density}`}>
          {Array.from({ length: rows }).map((_, rowIdx) => {
            const value = board.id === "jeopardy" ? (rowIdx + 1) * 100 : (rowIdx + 1) * 200;
            return (
              <div key={rowIdx} className="bge-row">
                <div className="bge-row-label">
                  <span>{value}</span>
                </div>
                <div className="bge-cells" style={{ "--cols": cols } as CSSProperties}>
                  {board.categories.map((cat, colIdx) => {
                    const clue = cat.clues[rowIdx];
                    const hasContent = clue.question.trim() || clue.answer.trim();
                    return (
                      <button
                        key={`${cat.id}-${rowIdx}`}
                        onClick={() => onClueClick(colIdx, rowIdx, clue)}
                        className={`bge-cell ${hasContent ? "bge-cell--has" : "bge-cell--empty"}`}
                      >
                        {!hasContent ? (
                          <>
                            <span className="bge-cell-plus">
                              <PlusIcon size={plusSize} />
                            </span>
                            <span className="bge-cell-value">{value}</span>
                          </>
                        ) : (
                          <div className="bge-cell-content">
                            <p dir="auto" className="bge-cell-q clamp-2">
                              {clue.question}
                            </p>
                            <div className="bge-cell-divider" />
                            <p dir="auto" className="bge-cell-a clamp-2">
                              {clue.answer}
                            </p>
                          </div>
                        )}
                        {clue.isDailyDouble && (
                          <span className="bge-dd-marker" title="Daily Double">
                            D
                          </span>
                        )}
                        {hasContent && clue.timeLimit != null && (
                          <TimeLimitMarker timeLimit={clue.timeLimit} />
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
