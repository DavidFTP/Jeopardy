import "./Edit.css";
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
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
      <div className="edit-loading">Loading...</div>
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
    <div className="edit-page">
      <EditTopBar
        title={game.title}
        onTitleChange={(v) => setGame({ ...game, title: v })}
        onBack={handleBack}
        onPlay={handlePlay}
        onPreview={() => setPreviewOpen(true)}
        placeholder={placeholder}
      />

      <div className="edit-main">
        <div className="edit-content">
            <div className="edit-pills">
              <button
                onClick={() => setActiveBoard("jeopardy")}
                className={`edit-tab ${activeBoard === "jeopardy" ? "edit-tab--active" : "edit-tab--idle"}`}
              >
                Jeopardy
              </button>

              <div className="edit-chip-wrap">
                {!game.boards.double.enabled ? (
                  <button
                    onClick={() => toggleBoardEnabled("double")}
                    title="Add Double Jeopardy"
                    aria-label="Add Double Jeopardy"
                    className="edit-tab-add"
                  >
                    <PlusIcon size={18} />
                    Add Double Jeopardy
                  </button>
                ) : (
                <button
                  onClick={() => setActiveBoard("double")}
                  className={`edit-tab ${activeBoard === "double" ? "edit-tab--active" : "edit-tab--idle"}`}
                >
                  Double Jeopardy
                </button>
                )}
                {game.boards.double.enabled && (
                  <button
                    onClick={() => toggleBoardEnabled("double")}
                    className="edit-remove-chip"
                    title="Remove Double Jeopardy"
                    aria-label="Remove Double Jeopardy"
                  >
                    <XIcon size={9} />
                  </button>
                )}
              </div>

              <div className="edit-chip-wrap">
                {!game.boards.final.enabled ? (
                  <button
                    onClick={() => toggleBoardEnabled("final")}
                    title="Add Final Jeopardy"
                    aria-label="Add Final Jeopardy"
                    className="edit-tab-add"
                  >
                    <PlusIcon size={18} />
                    Add Final Jeopardy
                  </button>
                ) : (
                <button
                  onClick={() => setActiveBoard("final")}
                  className={`edit-tab ${activeBoard === "final" ? "edit-tab--active" : "edit-tab--idle"}`}
                >
                  Final Jeopardy
                </button>
                )}
                {game.boards.final.enabled && (
                  <button
                    onClick={() => toggleBoardEnabled("final")}
                    className="edit-remove-chip"
                    title="Remove Final Jeopardy"
                    aria-label="Remove Final Jeopardy"
                  >
                    <XIcon size={9} />
                  </button>
                )}
              </div>
            </div>

          <div className="edit-grid-wrap">
            {!board.enabled ? (
              <div className="edit-disabled">
                <div className="edit-disabled-card">
                  <p className="edit-disabled-title">
                    {board.id === "double" ? "Double Jeopardy is off" : "Final Jeopardy is off"}
                  </p>
                  <p className="edit-disabled-sub">
                    Click the pill above to re-enable. Previous edits are kept.
                  </p>
                  <button onClick={() => toggleBoardEnabled(board.id)} className="btn btn-gold edit-disabled-btn">
                    Enable
                  </button>
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

        <aside className="edit-side">
          <div className="edit-side-card">
            {activeBoard !== "final" && (
            <div>
              <div className="edit-side-head">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="18" rx="1" />
                  <rect x="14" y="3" width="7" height="18" rx="1" />
                </svg>
                <span>Columns</span>
              </div>
              <div className="edit-stepper-row">
                <button onClick={() => resizeBoard(currentCols - 1, currentRows)} className="edit-stepper">
                  −
                </button>
                <span className="edit-stepper-val">{currentCols}</span>
                <button onClick={() => resizeBoard(currentCols + 1, currentRows)} disabled={currentCols >= 10} className="edit-stepper">
                  +
                </button>
              </div>
            </div>
            )}

            {activeBoard !== "final" && <div className="edit-divider" />}

            {activeBoard !== "final" && (
            <div>
              <div className="edit-side-head">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="7" rx="1" />
                  <rect x="3" y="14" width="18" height="7" rx="1" />
                </svg>
                <span>Rows</span>
              </div>
              <div className="edit-stepper-row">
                <button onClick={() => resizeBoard(currentCols, currentRows - 1)} className="edit-stepper">
                  −
                </button>
                <span className="edit-stepper-val">{currentRows}</span>
                <button onClick={() => resizeBoard(currentCols, currentRows + 1)} disabled={currentRows >= 10} className="edit-stepper">
                  +
                </button>
              </div>
            </div>
            )}

            <div className="edit-divider" />

            <div>
              <div className="edit-side-head">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span>Background</span>
              </div>
              <input
                ref={bgInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    const src = ev.target?.result as string;
                    const img = new Image();
                    img.onload = () => {
                      const MAX = 1600;
                      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
                      const w = Math.max(1, Math.round(img.width * scale));
                      const h = Math.max(1, Math.round(img.height * scale));
                      const canvas = document.createElement("canvas");
                      canvas.width = w;
                      canvas.height = h;
                      const ctx = canvas.getContext("2d");
                      if (!ctx) return;
                      ctx.drawImage(img, 0, 0, w, h);
                      setGame({ ...game, coverImageUrl: canvas.toDataURL("image/jpeg", 0.82) });
                    };
                    img.src = src;
                  };
                  reader.readAsDataURL(file);
                  e.target.value = "";
                }}
              />
              <button
                onClick={() => bgInputRef.current?.click()}
                className="edit-upload"
              >
                {game.coverImageUrl?.trim() ? (
                  <>
                    <img src={game.coverImageUrl} alt="Background" className="edit-upload-img" />
                    <span className="edit-upload-txt edit-upload-txt--sub">Click to change</span>
                  </>
                ) : (
                  <>
                    <ImageIcon />
                    <span className="edit-upload-txt">
                      Drag an image here,<br />or click to pick one
                    </span>
                  </>
                )}
              </button>
              {game.coverImageUrl?.trim() && (
                <button
                  onClick={() => setGame({ ...game, coverImageUrl: "" })}
                  className="edit-remove-bg"
                >
                  Remove background
                </button>
              )}
            </div>

            <div className="edit-divider" />
            <label className="edit-showcats">
              <span>Show categories</span>
              <span className="toggle">
                <input
                  type="checkbox"
                  checked={board.showCategories}
                  onChange={(e) => setGame({ ...game, boards: { ...game.boards, [activeBoard]: { ...board, showCategories: e.target.checked } } })}
                />
                <span className="toggle-track" />
              </span>
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