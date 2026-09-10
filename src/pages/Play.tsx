import "./Play.css";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { EVENT_NAME } from "../config/event";
import type { BoardId, Clue, Game, Player } from "../types/game";
import { getClueValue } from "../types/game";
import { useGameStore } from "../stores/gameStore";
import { ConfirmModal } from "../components/ConfirmModal";
import { XIcon } from "../components/icons";
import {
  getSession,
  saveSession,
  deleteSession,
} from "../services/gameRepository";

function uid() {
  return (
    Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4)
  );
}

export default function Play() {
  const { id } = useParams();
  const nav = useNavigate();
  const { games, load } = useGameStore();
  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentBoard, setCurrentBoard] = useState<BoardId>("jeopardy");
  const [answeredIds, setAnsweredIds] = useState<Set<string>>(new Set());
  const [setupOpen, setSetupOpen] = useState(true);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [setupFirstPlayer, setSetupFirstPlayer] = useState(0);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [editScore, setEditScore] = useState("");
  const [removedFromClue, setRemovedFromClue] = useState<Set<string>>(
    new Set(),
  );
  const [gameOver, setGameOver] = useState(false);
  const [activeClue, setActiveClue] = useState<{
    clue: Clue;
    catIdx: number;
    rowIdx: number;
    boardId: BoardId;
  } | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [flashRed, setFlashRed] = useState(false);
  const [wagerState, setWagerState] = useState<{
    mode: "dd" | "final";
    playerId: string;
    amount: string;
    step: "pick" | "reveal";
  } | null>(null);
  const [finalWagers, setFinalWagers] = useState<Record<string, string>>({});
  const [finalPhase, setFinalPhase] = useState<"clue" | "scoring" | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    danger?: boolean;
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!id) return;
    const g = games.find((x) => x.id === id);
    if (g) {
      setGame(structuredClone(g) as Game);
      const sess = getSession(g.id);
      if (sess) {
        setPlayers(sess.players);
        setAnsweredIds(new Set(sess.answeredClueIds));
        setCurrentBoard(sess.currentBoard);
        setCurrentTurnIndex(sess.currentTurnIndex ?? 0);
        setGameOver(sess.phase === "finished");
        setSetupOpen(sess.phase === "setup");
      } else {
        setPlayers([]);
        setAnsweredIds(new Set());
        setCurrentBoard("jeopardy");
        setCurrentTurnIndex(0);
        setGameOver(false);
        setSetupOpen(true);
      }
    } else if (games.length > 0) {
      nav("/", { replace: true });
    }
  }, [games, id, nav]);

  useEffect(() => {
    if (players.length === 0 && currentTurnIndex !== 0) setCurrentTurnIndex(0);
    else if (currentTurnIndex >= players.length)
      setCurrentTurnIndex(players.length - 1);
  }, [players.length, currentTurnIndex]);

  useEffect(() => {
    if (!game) return;
    if (gameOver) return;
    if (players.length === 0) return;
    persistSession(
      players,
      answeredIds,
      currentBoard,
      currentTurnIndex,
      setupOpen ? "setup" : "playing",
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, players, answeredIds, currentBoard, currentTurnIndex, setupOpen]);

  useEffect(() => {
    setFlashRed(false);
    if (
      !activeClue ||
      activeClue.clue.timeLimit == null ||
      wagerState?.step === "pick"
    ) {
      setTimeLeft(null);
      return;
    }
    setTimeLeft(activeClue.clue.timeLimit);
  }, [activeClue, wagerState?.step]);

  useEffect(() => {
    if (timeLeft == null || timeLeft <= 0) return;
    const t = setTimeout(
      () => setTimeLeft((s) => (s == null ? null : s - 1)),
      1000,
    );
    return () => clearTimeout(t);
  }, [timeLeft]);

  useEffect(() => {
    if (timeLeft !== 0) return;
    setFlashRed(true);
    const t = setTimeout(() => setFlashRed(false), 1000);
    return () => clearTimeout(t);
  }, [timeLeft]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeClue || timeLeft == null) return;
      if (e.key === "+") {
        setTimeLeft((s) => (s == null ? null : s + 5));
      } else if (e.key === "-") {
        setTimeLeft((s) => (s == null ? null : Math.max(0, s - 5)));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeClue, timeLeft]);

  const persistSession = (
    nextPlayers: Player[],
    nextAnswered: Set<string>,
    nextBoard: BoardId,
    turnIdx: number,
    phase: "setup" | "playing" | "finished",
  ) => {
    if (!game) return;
    saveSession({
      gameId: game.id,
      players: nextPlayers,
      answeredClueIds: Array.from(nextAnswered),
      currentBoard: nextBoard,
      currentTurnIndex: turnIdx,
      phase,
      startedAt: getSession(game.id)?.startedAt ?? Date.now(),
      updatedAt: Date.now(),
    });
  };

  const board = game ? game.boards[currentBoard] : null;

  const allClueIdsForBoard = useMemo(() => {
    if (!board || currentBoard === "final") return [];
    const ids: string[] = [];
    for (const cat of board.categories)
      for (const cl of cat.clues) ids.push(cl.id);
    return ids;
  }, [board, currentBoard]);

  const isBoardComplete = useMemo(() => {
    if (!board) return false;
    if (currentBoard === "final") return false;
    return (
      allClueIdsForBoard.length > 0 &&
      allClueIdsForBoard.every((id) => answeredIds.has(id))
    );
  }, [allClueIdsForBoard, answeredIds, board, currentBoard]);

  const handleAddPlayer = () => {
    const name = newPlayerName.trim();
    if (!name) return;
    const p: Player = { id: uid(), name, score: 0 };
    const next = [...players, p];
    setPlayers(next);
    setNewPlayerName("");
    if (game)
      persistSession(
        next,
        answeredIds,
        currentBoard,
        currentTurnIndex,
        "setup",
      );
  };

  const handleRemovePlayer = (pid: string) => {
    const next = players.filter((p) => p.id !== pid);
    setPlayers(next);
    if (game)
      persistSession(
        next,
        answeredIds,
        currentBoard,
        currentTurnIndex,
        setupOpen ? "setup" : "playing",
      );
  };

  const handleStart = () => {
    if (players.length === 0) {
      setConfirmModal({
        title: "No players",
        message: "Add at least one team or player before starting.",
        confirmLabel: "OK",
        onConfirm: () => setConfirmModal(null),
      });
      return;
    }
    const turnIdx = Math.min(setupFirstPlayer, players.length - 1);
    setCurrentTurnIndex(turnIdx);
    setSetupOpen(false);
    persistSession(players, answeredIds, currentBoard, turnIdx, "playing");
  };

  const advanceTurn = () => {
    if (players.length === 0) return;
    const next = (currentTurnIndex + 1) % players.length;
    setCurrentTurnIndex(next);
    persistSession(players, answeredIds, currentBoard, next, "playing");
  };

  const handleClueClick = (
    catIdx: number,
    rowIdx: number,
    clue: Clue,
    bid: BoardId,
  ) => {
    if (answeredIds.has(clue.id)) return;
    if (bid === "final" && finalPhase !== null && finalPhase !== "clue") return;
    setShowAnswer(false);
    setRemovedFromClue(new Set());
    if (clue.isDailyDouble && bid !== "final") {
      const activePlayerId =
        players[currentTurnIndex]?.id ?? players[0]?.id ?? "";
      setWagerState({
        mode: "dd",
        playerId: activePlayerId,
        amount: "",
        step: "pick",
      });
      setActiveClue({ clue, catIdx, rowIdx, boardId: bid });
    } else {
      setWagerState(null);
      setActiveClue({ clue, catIdx, rowIdx, boardId: bid });
    }
  };

  const isGameComplete = (ans: Set<string>): boolean => {
    if (!game) return false;
    const enabledNonFinal = (["jeopardy", "double"] as BoardId[]).filter(
      (b) => game.boards[b].enabled,
    );
    const allNonFinalDone =
      enabledNonFinal.length > 0 &&
      enabledNonFinal.every((b) => {
        const ids: string[] = [];
        for (const cat of game.boards[b].categories)
          for (const cl of cat.clues) ids.push(cl.id);
        return ids.every((id) => ans.has(id));
      });
    if (!allNonFinalDone) return false;
    return !game.boards.final.enabled;
  };

  const endGame = () => {
    setGameOver(true);
    setActiveClue(null);
    setFinalPhase(null);
    setWagerState(null);
    if (game)
      persistSession(
        players,
        answeredIds,
        currentBoard,
        currentTurnIndex,
        "finished",
      );
  };

  const restartGame = () => {
    if (!game) return;
    deleteSession(game.id);
    setPlayers([]);
    setAnsweredIds(new Set());
    setCurrentBoard("jeopardy");
    setCurrentTurnIndex(0);
    setSetupFirstPlayer(0);
    setFinalWagers({});
    setFinalPhase(null);
    setActiveClue(null);
    setWagerState(null);
    setEditingPlayer(null);
    setSetupOpen(true);
    setGameOver(false);
    setConfirmModal(null);
  };

  const requestRestart = () => {
    setConfirmModal({
      title: "Restart game?",
      message: "Scores and progress will be cleared.",
      confirmLabel: "Restart",
      danger: true,
      onConfirm: restartGame,
    });
  };

  const closeClue = (markAnswered: boolean) => {
    if (activeClue && markAnswered) {
      const next = new Set(answeredIds);
      next.add(activeClue.clue.id);
      setAnsweredIds(next);
      persistSession(players, next, currentBoard, currentTurnIndex, "playing");
      if (isGameComplete(next)) {
        endGame();
        return;
      }
    }
    setActiveClue(null);
    setShowAnswer(false);
    setWagerState(null);
    setRemovedFromClue(new Set());
  };

  const award = (playerId: string, delta: number) => {
    const nextPlayers = players.map((p) =>
      p.id === playerId ? { ...p, score: p.score + delta } : p,
    );
    setPlayers(nextPlayers);
    persistSession(
      nextPlayers,
      answeredIds,
      currentBoard,
      currentTurnIndex,
      "playing",
    );
  };

  const handleTick = (playerId: string) => {
    if (!activeClue) return;
    const isDD =
      activeClue.clue.isDailyDouble &&
      wagerState &&
      wagerState.step === "reveal";
    const val = isDD
      ? Number(wagerState.amount) || 0
      : getClueValue(activeClue.clue, activeClue.rowIdx, activeClue.boardId);
    award(playerId, val);
    closeClue(true);
    advanceTurn();
  };

  const handleWrong = (playerId: string) => {
    if (!activeClue) return;
    const isDD =
      activeClue.clue.isDailyDouble &&
      wagerState &&
      wagerState.step === "reveal";
    const val = isDD
      ? Number(wagerState.amount) || 0
      : getClueValue(activeClue.clue, activeClue.rowIdx, activeClue.boardId);
    award(playerId, -val);
    if (isDD) {
      closeClue(true);
      advanceTurn();
    } else {
      const nextRemoved = new Set(removedFromClue);
      nextRemoved.add(playerId);
      setRemovedFromClue(nextRemoved);
    }
  };

  const handleVoid = () => {
    closeClue(true);
    advanceTurn();
  };

  const handleWagerConfirm = () => {
    if (!wagerState) return;
    const amt = Number(wagerState.amount);
    const isFinal = wagerState.mode === "final";
    if (isFinal) {
      setFinalWagers((prev) => {
        const next = { ...prev };
        for (const p of players) {
          if (next[p.id] === undefined) next[p.id] = "0";
        }
        return next;
      });
      setWagerState(null);
      setFinalPhase("clue");
      return;
    }
    if (!amt || amt <= 0) {
      setConfirmModal({
        title: "Invalid wager",
        message: "Enter a wager amount greater than zero.",
        confirmLabel: "OK",
        onConfirm: () => setConfirmModal(null),
      });
      return;
    }
    if (!wagerState.playerId) {
      setConfirmModal({
        title: "No player selected",
        message: "Select a player before confirming the wager.",
        confirmLabel: "OK",
        onConfirm: () => setConfirmModal(null),
      });
      return;
    }
    setWagerState({ ...wagerState, step: "reveal" });
  };

  const startFinal = () => {
    setFinalPhase("clue");
    const finalClue = game?.boards.final.categories[0]?.clues[0];
    if (finalClue) {
      setActiveClue({
        clue: finalClue,
        catIdx: 0,
        rowIdx: 0,
        boardId: "final",
      });
      setShowAnswer(false);
      setRemovedFromClue(new Set());
    }
    setFinalWagers(Object.fromEntries(players.map((p) => [p.id, "0"])));
    setWagerState({ mode: "final", playerId: "", amount: "", step: "pick" });
  };

  const finishFinalClue = () => {
    endGame();
  };

  const markFinalAnswered = (pid: string) => {
    const nextRemoved = new Set(removedFromClue);
    nextRemoved.add(pid);
    setRemovedFromClue(nextRemoved);
    const allAnswered =
      players.length > 0 && players.every((p) => nextRemoved.has(p.id));
    if (allAnswered) {
      endGame();
    }
  };

  const handleFinalClueTick = (pid: string) => {
    const wager = Number(finalWagers[pid] || 0);
    award(pid, wager);
    markFinalAnswered(pid);
  };
  const handleFinalClueWrong = (pid: string) => {
    const wager = Number(finalWagers[pid] || 0);
    award(pid, -wager);
    markFinalAnswered(pid);
  };

  const handleUpdateScore = () => {
    if (!editingPlayer) return;
    const newScore = Number(editScore);
    if (isNaN(newScore)) return;
    const nextPlayers = players.map((p) =>
      p.id === editingPlayer.id ? { ...p, score: newScore } : p,
    );
    setPlayers(nextPlayers);
    persistSession(
      nextPlayers,
      answeredIds,
      currentBoard,
      currentTurnIndex,
      "playing",
    );
    setEditingPlayer(null);
  };

  if (!game || !board) {
    return <div className="play-shell play-shell--loading">Loading...</div>;
  }

  const displayTitle =
    game.title.trim() ||
    `Game ${games.findIndex((g) => g.id === game.id) + 1 || ""}`.trim() ||
    "Game";

  const ranked = [...players].sort((a, b) => b.score - a.score);
  const podium = ranked.slice(0, 3);
  const rest = ranked.slice(3);

  if (gameOver) {
    return (
      <div className="podium-screen" style={{ background: "#0f1d45" }}>
        <Confetti />
        <div className="play-top-left">
          <Link to="/" className="btn-glass btn-xs">
            ← Home
          </Link>
          <button onClick={requestRestart} className="btn-danger btn-xs">
            Restart
          </button>
        </div>
        <div className="podium-scroll">
          <div className="podium-head">
            <div className="podium-event">{EVENT_NAME}</div>
            <div className="podium-title">{displayTitle}</div>
            <div className="podium-complete">MATCH COMPLETE</div>
          </div>

          {players.length > 0 ? (
            <>
              {players.length === 2 ? (
                <div className="podium-duo">
                  {podium[0] && (
                    <div className="podium-duo__1">
                      <div className="podium-duo__1-inner">
                        <span className="podium-duo__rank">1st</span>
                        <span className="podium-duo__name">
                          {podium[0].name}
                        </span>
                        <span className="podium-duo__score">
                          {podium[0].score}
                        </span>
                      </div>
                    </div>
                  )}
                  {podium[1] && (
                    <div className="podium-duo__2">
                      <div className="podium-duo__2-inner">
                        <span className="podium-duo__2rank">2nd</span>
                        <span className="podium-duo__2name">
                          {podium[1].name}
                        </span>
                        <span className="podium-duo__2score">
                          {podium[1].score}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="podium-top3">
                  {podium[1] && (
                    <div
                      key={podium[1].id}
                      className="podium-col podium-col--2"
                    >
                      <div className="podium-col__rank">2nd</div>
                      <div className="podium-col__name">{podium[1].name}</div>
                      <div className="podium-col__score">{podium[1].score}</div>
                    </div>
                  )}
                  {podium[0] && (
                    <div
                      key={podium[0].id}
                      className="podium-col podium-col--1"
                    >
                      <div className="podium-col__rank1">1st</div>
                      <div className="podium-col__name1">{podium[0].name}</div>
                      <div className="podium-col__score1">
                        {podium[0].score}
                      </div>
                    </div>
                  )}
                  {podium[2] && (
                    <div
                      key={podium[2].id}
                      className="podium-col podium-col--3"
                    >
                      <div className="podium-col__rank3">3rd</div>
                      <div className="podium-col__name">{podium[2].name}</div>
                      <div className="podium-col__score3">
                        {podium[2].score}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {rest.length > 0 && (
                <div className="podium-rest">
                  {rest.map((p, idx) => {
                    const place = idx + 4;
                    return (
                      <div key={p.id} className="podium-rest__row">
                        <span className="podium-rest__place">{place}th</span>
                        <span className="podium-rest__name">{p.name}</span>
                        <span
                          className={`podium-rest__score ${p.score >= 0 ? "" : "podium-rest__score--neg"}`}
                        >
                          {p.score}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <p className="podium-empty">No players played this game.</p>
          )}
        </div>

        {confirmModal && (
          <ConfirmModal
            title={confirmModal.title}
            message={confirmModal.message}
            confirmLabel={confirmModal.confirmLabel}
            danger={confirmModal.danger}
            onConfirm={confirmModal.onConfirm}
            onCancel={() => setConfirmModal(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="play-shell" style={{ background: "#0f1d45" }}>
      <div className="play-top-left">
        <Link to="/" className="btn-glass btn-xs">
          ← Home
        </Link>
        <button onClick={() => setSetupOpen(true)} className="btn-glass btn-xs">
          Players
        </button>
        <button onClick={requestRestart} className="btn-danger btn-xs">
          Restart
        </button>
      </div>

      <header className="play-header">
        <div className="play-header__title">{EVENT_NAME}</div>
        <div className="play-header__sub">{displayTitle}</div>
      </header>

      {!setupOpen && (
        <div className="play-top-right">
          {(["jeopardy", "double", "final"] as BoardId[]).map((bid) => {
            const b = game.boards[bid];
            if (!b.enabled) return null;
            return (
              <button
                key={bid}
                onClick={() => {
                  if (isBoardComplete && bid !== currentBoard) {
                    setCurrentBoard(bid);
                    persistSession(
                      players,
                      answeredIds,
                      bid,
                      currentTurnIndex,
                      "playing",
                    );
                  } else if (!isBoardComplete && bid !== currentBoard) {
                    setConfirmModal({
                      title: "Switch board?",
                      message:
                        "Switch before finishing current board? Progress will be kept.",
                      confirmLabel: "Switch",
                      onConfirm: () => {
                        setCurrentBoard(bid);
                        persistSession(
                          players,
                          answeredIds,
                          bid,
                          currentTurnIndex,
                          "playing",
                        );
                        setConfirmModal(null);
                      },
                    });
                  }
                }}
                className={`pill-tab ${currentBoard === bid ? "pill-tab--active" : "pill-tab--idle"}`}
              >
                {bid === "jeopardy"
                  ? "Jeopardy"
                  : bid === "double"
                    ? "Double"
                    : "Final"}
                {bid !== "final" && bid === currentBoard && isBoardComplete
                  ? " ✓"
                  : ""}
              </button>
            );
          })}
        </div>
      )}

      <div className="play-main">
        <div className="play-main__sub">
          <main className="play-main__inner">
            {isBoardComplete && !setupOpen && !activeClue && (
              <div className="play-banner">
                <div>
                  <h3 className="play-banner__title">
                    {currentBoard === "jeopardy"
                      ? "Jeopardy Complete!"
                      : "Double Jeopardy Complete!"}
                  </h3>
                  <p className="play-banner__sub">
                    {game.boards.double.enabled && currentBoard === "jeopardy"
                      ? "Continue to Double Jeopardy or stay here."
                      : game.boards.final.enabled && currentBoard !== "final"
                        ? "Ready for Final Jeopardy."
                        : "Game complete — review scores below."}
                  </p>
                </div>
                <div className="play-banner__actions">
                  {game.boards.double.enabled &&
                    currentBoard === "jeopardy" && (
                      <button
                        onClick={() => {
                          setCurrentBoard("double");
                          persistSession(
                            players,
                            answeredIds,
                            "double",
                            currentTurnIndex,
                            "playing",
                          );
                        }}
                        className="btn-banner-dark"
                      >
                        Go to Double →
                      </button>
                    )}
                  {game.boards.final.enabled && (
                    <button onClick={startFinal} className="btn-banner-white">
                      Final Jeopardy
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setConfirmModal({
                        title: "End game?",
                        message:
                          "Scores will be kept. You can restart later from Home.",
                        confirmLabel: "End game",
                        onConfirm: () => {
                          endGame();
                          setConfirmModal(null);
                        },
                      });
                    }}
                    className="btn-banner-ghost"
                  >
                    End
                  </button>
                </div>
              </div>
            )}

            {currentBoard === "final" &&
            game.boards.final.enabled &&
            finalPhase === null ? (
              <div className="play-final-cta">
                <p className="play-final-cta__title">Final Jeopardy</p>
                <p dir="auto" className="play-final-cta__cat">
                  Category: {game.boards.final.categories[0]?.title}
                </p>
                <button
                  onClick={startFinal}
                  disabled={players.length === 0}
                  className="btn btn-gold btn-gold--big play-final-cta__start"
                >
                  Start Final (enter wagers)
                </button>
                <button
                  onClick={() => {
                    const cl = game.boards.final.categories[0]?.clues[0];
                    if (cl) {
                      setActiveClue({
                        clue: cl,
                        catIdx: 0,
                        rowIdx: 0,
                        boardId: "final",
                      });
                      setFinalPhase("clue");
                      setFinalWagers(
                        Object.fromEntries(
                          players.map((p) => [p.id, finalWagers[p.id] ?? ""]),
                        ),
                      );
                      setWagerState(null);
                    }
                  }}
                  className="play-final-cta__reveal"
                >
                  Reveal without wagers
                </button>
              </div>
            ) : currentBoard === "final" ? (
              <div className="play-final-progress">
                Final Jeopardy in progress — see clue.
              </div>
            ) : (
              <div className="play-board-wrap">
                <BoardPlayGrid
                  board={board}
                  answeredIds={answeredIds}
                  onClueClick={handleClueClick}
                />
              </div>
            )}
          </main>
        </div>

        <div className="play-sidebar">
          {players.length === 0 ? (
            <p className="play-sidebar__none">No players yet</p>
          ) : (
            players.map((p, idx) => (
              <button
                key={p.id}
                onClick={() => {
                  setEditingPlayer(p);
                  setEditScore(String(p.score));
                }}
                className={`play-sidebar__row ${idx === currentTurnIndex ? "play-sidebar__row--active" : "play-sidebar__row--idle"}`}
              >
                <div className="play-sidebar__name">{p.name}</div>
                <div
                  className={`play-sidebar__score ${p.score >= 0 ? "" : "play-sidebar__score--neg"}`}
                >
                  {p.score}
                </div>
                {idx === currentTurnIndex && (
                  <div className="play-sidebar__picks">▸ picks next</div>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {setupOpen && (
        <div className="setup-modal">
          <div className="modal-scrim modal-scrim--strong" />
          <div className="setup-modal__card">
            <div className="setup-modal__header">
              <h3>Add Teams</h3>
            </div>
            <div className="setup-modal__body">
              <div className="setup-add-row">
                <input
                  dir="auto"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddPlayer()}
                  placeholder="Team name"
                  className="text-input text-input--round"
                />
                <button onClick={handleAddPlayer} className="btn-navy">
                  Add
                </button>
              </div>

              <div className="setup-list">
                {players.length === 0 ? (
                  <p className="setup-empty">No teams yet</p>
                ) : (
                  <div className="setup-list__rows">
                    {players.map((p) => (
                      <div key={p.id} className="setup-player-row">
                        <div className="setup-avatar">
                          {p.name.trim().charAt(0).toUpperCase() || "?"}
                        </div>
                        <span className="setup-player-name">{p.name}</span>
                        <span className="setup-player-score">{p.score}</span>
                        <button
                          onClick={() => handleRemovePlayer(p.id)}
                          className="icon-btn icon-btn--sm icon-btn--slate"
                        >
                          <XIcon size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {players.length > 0 && (
                <div className="setup-picks">
                  <p className="setup-picks__label">WHO STARTS?</p>
                  <div className="setup-picks__buttons">
                    {players.map((p, idx) => (
                      <button
                        key={p.id}
                        dir="auto"
                        onClick={() => setSetupFirstPlayer(idx)}
                        className={`setup-pick-btn ${setupFirstPlayer === idx ? "setup-pick-btn--active" : "setup-pick-btn--idle"}`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={handleStart}
                className="btn btn-gold btn-gold--big setup-start"
              >
                Start
              </button>
              {players.length > 0 && (
                <button
                  onClick={() => setSetupOpen(false)}
                  className="setup-continue"
                >
                  Continue without adding
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {editingPlayer && (
        <div className="modal-backdrop">
          <div className="modal-scrim" onClick={() => setEditingPlayer(null)} />
          <div className="modal-card">
            <div className="score-modal__body">
              <h3 dir="auto" className="score-modal__name">
                {editingPlayer.name}
              </h3>
              <div className="score-modal__row">
                <label className="score-modal__label">Score</label>
                <input
                  value={editScore}
                  onChange={(e) =>
                    setEditScore(e.target.value.replace(/[^0-9-]/g, ""))
                  }
                  className="score-modal__input"
                />
                <button onClick={handleUpdateScore} className="btn-navy">
                  Update score
                </button>
              </div>
              <div className="score-modal__turn">
                {currentTurnIndex ===
                players.findIndex((p) => p.id === editingPlayer.id) ? (
                  <span className="score-modal__turn-gold">
                    This player chooses the next question
                  </span>
                ) : (
                  ""
                )}
              </div>
            </div>
            <div className="score-modal__footer">
              <button
                dir="auto"
                onClick={() => {
                  setConfirmModal({
                    title: `Remove ${editingPlayer.name}?`,
                    message:
                      "This player will be removed from the game. Their score will be lost.",
                    confirmLabel: "Remove",
                    danger: true,
                    onConfirm: () => {
                      handleRemovePlayer(editingPlayer.id);
                      setEditingPlayer(null);
                      setConfirmModal(null);
                    },
                  });
                }}
                className="btn-danger-text"
              >
                Remove {editingPlayer.name} from this game
              </button>
            </div>
          </div>
        </div>
      )}

      {activeClue && (
        <div className="play-clue">
          {wagerState && wagerState.step === "pick" ? (
            wagerState.mode === "final" ? (
              <div className="wager-backdrop">
                <div className="wager-card wager-card--fj">
                  <h3 className="wager-card__title">FINAL JEOPARDY</h3>
                  <p className="wager-card__sub">
                    Set each team's wager. Zero means no wager.
                  </p>
                  <div className="wager-list">
                    {players.map((p) => (
                      <div key={p.id} className="wager-row">
                        <span className="wager-row__name">
                          {p.name}{" "}
                          <span className="wager-row__score">({p.score})</span>
                        </span>
                        <div className="wager-row__toggle-wrap">
                          <input
                            value={finalWagers[p.id] ?? "0"}
                            onChange={(e) =>
                              setFinalWagers({
                                ...finalWagers,
                                [p.id]: e.target.value.replace(/[^0-9]/g, ""),
                              })
                            }
                            className="wager-row__input"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="wager-actions">
                    <button
                      onClick={() => closeClue(false)}
                      className="wager-btn wager-btn--ghost"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleWagerConfirm}
                      className="wager-btn wager-btn--gold"
                    >
                      Reveal Clue →
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="wager-backdrop">
                <div className="wager-card wager-card--dd">
                  <h3 className="wager-card__title">DAILY DOUBLE!</h3>
                  <p className="wager-card__sub">
                    {`${players.find((p) => p.id === wagerState.playerId)?.name ?? ""} — enter wager (host decides cap).`}
                  </p>
                  <div className="wager-field">
                    <label className="field-label">WAGER</label>
                    <input
                      value={wagerState.amount}
                      onChange={(e) =>
                        setWagerState({
                          ...wagerState,
                          amount: e.target.value.replace(/[^0-9-]/g, ""),
                        })
                      }
                      placeholder="e.g. 500"
                      className="text-input text-input--lg"
                    />
                  </div>
                  <div className="wager-actions">
                    <button
                      onClick={() => closeClue(false)}
                      className="wager-btn wager-btn--ghost"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleWagerConfirm}
                      className="wager-btn wager-btn--gold"
                    >
                      Reveal Clue →
                    </button>
                  </div>
                </div>
              </div>
            )
          ) : (
            <>
              <button
                onClick={handleVoid}
                className="icon-btn icon-btn--md icon-btn--glass-lg play-clue__void"
                aria-label="Void question"
              >
                <XIcon size={20} />
              </button>

              <div className="play-clue__center">
                <div
                  className={`cluecard ${flashRed ? "cluecard--flash" : ""}`}
                >
                  <div className="cluecard__top">
                    <div className="cluecard__label">
                      {activeClue.boardId === "final"
                        ? "FINAL JEOPARDY"
                        : activeClue.boardId === "double"
                          ? "DOUBLE JEOPARDY"
                          : "JEOPARDY"}{" "}
                      {activeClue.boardId !== "final" &&
                        `· ${wagerState?.step === "reveal" ? Number(wagerState.amount) : getClueValue(activeClue.clue, activeClue.rowIdx, activeClue.boardId)}`}
                    </div>
                    {activeClue.clue.isDailyDouble && (
                      <span className="badge-dd badge-dd--xl">
                        DAILY DOUBLE
                      </span>
                    )}
                    {game.boards[activeClue.boardId]?.showCategories && (
                      activeClue.boardId === "final" ? (
                        <p dir="auto" className="cluecard__cat">
                          {game.boards.final.categories[0]?.title}
                        </p>
                      ) : (
                        <p dir="auto" className="cluecard__cat">
                          {game.boards[activeClue.boardId].categories[activeClue.catIdx]?.title}
                        </p>
                      )
                    )}
                  </div>

                  <div className="cluecard__body">
                    <p dir="auto" className="cluecard__q">
                      {activeClue.clue.question ||
                        "(No question set — edit this clue)"}
                    </p>

                    {activeClue.clue.media.length > 0 && (
                      <div className="cluecard__media">
                        {activeClue.clue.media.map((m) => (
                          <div key={m.id} className="cluecard__media-item">
                            {m.type === "image" && m.url.trim() && (
                              <img
                                src={m.url}
                                alt=""
                                className="cluecard__media-frame"
                              />
                            )}
                            {m.type === "video" && m.url.trim() && (
                              <video
                                src={m.url}
                                controls
                                className="cluecard__media-frame"
                              />
                            )}
                            {m.type === "audio" && m.url.trim() && (
                              <audio
                                src={m.url}
                                controls
                                className="cluecard__media-audio"
                              />
                            )}
                            {!m.url.trim() && (
                              <div className="cluecard__media-empty">
                                Empty {m.type} URL
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="cluecard__answer-zone">
                    {!showAnswer ? (
                      <button
                        onClick={() => setShowAnswer(true)}
                        className="btn-solid-dark"
                      >
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
                    {activeClue.boardId === "final" &&
                      finalPhase === "clue" && (
                        <button
                          onClick={finishFinalClue}
                          className="play-clue__final-btn"
                        >
                          Final Scores →
                        </button>
                      )}
                  </div>

                  {timeLeft != null && activeClue.boardId !== "final" && (
                    <div
                      className={`countdown-pill ${timeLeft <= 5 ? "countdown-pill--low" : ""}`}
                    >
                      {timeLeft}s
                    </div>
                  )}

                  <div className="play-clue__bottom-right">
                    {(activeClue.clue.isDailyDouble &&
                    activeClue.boardId !== "final"
                      ? players.filter((_, idx) => idx === currentTurnIndex)
                      : activeClue.boardId === "final"
                        ? players.filter((p) => finalWagers[p.id] !== undefined)
                        : players
                    ).map((p) => {
                      if (removedFromClue.has(p.id)) return null;
                      return (
                        <div key={p.id} className={`answer-frame${players[currentTurnIndex]?.id === p.id ? " answer-frame--current" : ""}`}>
                          <span className="answer-frame__name">{p.name}</span>
                          <div className="answer-frame__actions">
                            <div className="answer-frame__hov">
                              <button
                                onClick={() => {
                                  if (activeClue.boardId === "final") {
                                    handleFinalClueTick(p.id);
                                  } else handleTick(p.id);
                                }}
                                className="answer-frame__btn answer-frame__btn--ok"
                                title="Correct (+)"
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => {
                                  if (activeClue.boardId === "final") {
                                    handleFinalClueWrong(p.id);
                                  } else handleWrong(p.id);
                                }}
                                className="answer-frame__btn answer-frame__btn--no"
                                title="Wrong (-)"
                              >
                                <XIcon size={20} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {players.length === 0 && (
                      <span className="play-clue__noplayers">
                        Add players first
                      </span>
                    )}
                  </div>

                  <p className="pickswipe-hint">
                    Hover a team on the bottom right to award ✓ or ✕ — × top
                    right voids
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          confirmLabel={confirmModal.confirmLabel}
          danger={confirmModal.danger}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  );
}

function BoardPlayGrid({
  board,
  answeredIds,
  onClueClick,
}: {
  board: import("../types/game").Board;
  answeredIds: Set<string>;
  onClueClick: (
    catIdx: number,
    rowIdx: number,
    clue: Clue,
    bid: BoardId,
  ) => void;
}) {
  if (!board) return null;
  const cols = board.categories.length;
  const showCats = board.showCategories;

  return (
    <div className="bpg">
      {showCats && (
        <div className="bpg-cats">
          <div className="bpg-spacer" />
          <div
            className="bpg-cats-grid"
            style={{ "--cols": cols } as CSSProperties}
          >
            {board.categories.map((cat) => (
              <div key={cat.id} className="bpg-cat">
                <span dir="auto">{cat.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bpg-body">
        {Array.from({ length: board.categories[0]?.clues.length ?? 0 }).map(
          (_, rowIdx) => (
            <div key={rowIdx} className="bpg-row">
              <div className="bpg-row-label">
                <span>
                  {board.id === "jeopardy"
                    ? (rowIdx + 1) * 100
                    : (rowIdx + 1) * 200}
                </span>
              </div>
              <div
                className="bpg-cells"
                style={{ "--cols": cols } as CSSProperties}
              >
                {board.categories.map((cat, colIdx) => {
                  const clue = cat.clues[rowIdx];
                  const answered = answeredIds.has(clue.id);
                  const value = getClueValue(clue, rowIdx, board.id);
                  return (
                    <button
                      key={`${cat.id}-${rowIdx}`}
                      disabled={answered}
                      onClick={() =>
                        onClueClick(colIdx, rowIdx, clue, board.id)
                      }
                      className={`bpg-cell ${answered ? "bpg-cell--answered" : ""}`}
                    >
                      {value}
                    </button>
                  );
                })}
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

const CONFETTI_COLORS = [
  "#ffd700",
  "#ff5a5f",
  "#4ecdc4",
  "#5b8cff",
  "#a78bfa",
  "#f97316",
  "#f43f5e",
  "#34d399",
];

const CONFETTI_PIECES = Array.from({ length: 42 }, () => ({
  left: Math.random() * 100,
  delay: -Math.random() * 14,
  dur: 3.5 + Math.random() * 4.5,
  drift: (Math.random() - 0.5) * 160,
  rot: (Math.random() - 0.5) * 540,
  w: 6 + Math.random() * 6,
  h: 8 + Math.random() * 9,
  color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
}));

function Confetti() {
  return (
    <div className="confetti" aria-hidden="true">
      {CONFETTI_PIECES.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={
            {
              left: `${p.left}%`,
              width: p.w,
              height: p.h,
              background: p.color,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.dur}s`,
              "--drift": `${p.drift}px`,
              "--rot": `${p.rot}deg`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
