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
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
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
  const [removedFromClue, setRemovedFromClue] = useState<Set<string>>(new Set());
  const [gameOver, setGameOver] = useState(false);
  // clue modal state
  const [activeClue, setActiveClue] = useState<{
    clue: Clue;
    catIdx: number;
    rowIdx: number;
    boardId: BoardId;
  } | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [wagerState, setWagerState] = useState<{
    mode: "dd" | "final";
    playerId: string;
    amount: string;
    step: "pick" | "reveal";
  } | null>(null);
  // final wager state
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
      if (sess && sess.phase !== "finished") {
        setPlayers(sess.players);
        setAnsweredIds(new Set(sess.answeredClueIds));
        setCurrentBoard(sess.currentBoard);
        setCurrentTurnIndex(sess.currentTurnIndex ?? 0);
        setGameOver(false);
        if (sess.phase === "setup") setSetupOpen(true);
        else setSetupOpen(false);
      } else {
        // no active session (or finished) -> start a fresh game
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
    else if (currentTurnIndex >= players.length) setCurrentTurnIndex(players.length - 1);
  }, [players.length, currentTurnIndex]);

  const persistSession = (nextPlayers: Player[], nextAnswered: Set<string>, nextBoard: BoardId, turnIdx: number, phase: "setup" | "playing" | "finished") => {
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
    for (const cat of board.categories) for (const cl of cat.clues) ids.push(cl.id);
    return ids;
  }, [board, currentBoard]);

  const isBoardComplete = useMemo(() => {
    if (!board) return false;
    if (currentBoard === "final") return false;
    return allClueIdsForBoard.length > 0 && allClueIdsForBoard.every((id) => answeredIds.has(id));
  }, [allClueIdsForBoard, answeredIds, board, currentBoard]);

  const handleAddPlayer = () => {
    const name = newPlayerName.trim();
    if (!name) return;
    const p: Player = { id: uid(), name, score: 0 };
    const next = [...players, p];
    setPlayers(next);
    setNewPlayerName("");
    if (game) persistSession(next, answeredIds, currentBoard, currentTurnIndex, "setup");
  };

  const handleRemovePlayer = (pid: string) => {
    const next = players.filter((p) => p.id !== pid);
    setPlayers(next);
    if (game) persistSession(next, answeredIds, currentBoard, currentTurnIndex, setupOpen ? "setup" : "playing");
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

  const handleClueClick = (catIdx: number, rowIdx: number, clue: Clue, bid: BoardId) => {
    if (answeredIds.has(clue.id)) return;
    if (bid === "final" && finalPhase !== null && finalPhase !== "clue") return;
    setShowAnswer(false);
    setRemovedFromClue(new Set());
    if (clue.isDailyDouble && bid !== "final") {
      const activePlayerId = players[currentTurnIndex]?.id ?? players[0]?.id ?? "";
      setWagerState({ mode: "dd", playerId: activePlayerId, amount: "", step: "pick" });
      setActiveClue({ clue, catIdx, rowIdx, boardId: bid });
    } else {
      setWagerState(null);
      setActiveClue({ clue, catIdx, rowIdx, boardId: bid });
    }
  };

  const isGameComplete = (ans: Set<string>): boolean => {
    if (!game) return false;
    const enabledNonFinal = (["jeopardy", "double"] as BoardId[]).filter((b) => game.boards[b].enabled);
    const allNonFinalDone =
      enabledNonFinal.length > 0 &&
      enabledNonFinal.every((b) => {
        const ids: string[] = [];
        for (const cat of game.boards[b].categories) for (const cl of cat.clues) ids.push(cl.id);
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
    if (game) persistSession(players, answeredIds, currentBoard, currentTurnIndex, "finished");
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
    const nextPlayers = players.map((p) => (p.id === playerId ? { ...p, score: p.score + delta } : p));
    setPlayers(nextPlayers);
    persistSession(nextPlayers, answeredIds, currentBoard, currentTurnIndex, "playing");
  };

  const handleTick = (playerId: string) => {
    if (!activeClue) return;
    const isDD = activeClue.clue.isDailyDouble && wagerState && wagerState.step === "reveal";
    const val = isDD ? Number(wagerState.amount) || 0 : getClueValue(activeClue.clue, activeClue.rowIdx, activeClue.boardId);
    award(playerId, val);
    closeClue(true);
    advanceTurn();
  };

  const handleWrong = (playerId: string) => {
    if (!activeClue) return;
    const isDD = activeClue.clue.isDailyDouble && wagerState && wagerState.step === "reveal";
    const val = isDD ? Number(wagerState.amount) || 0 : getClueValue(activeClue.clue, activeClue.rowIdx, activeClue.boardId);
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
      setActiveClue({ clue: finalClue, catIdx: 0, rowIdx: 0, boardId: "final" });
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
    const nextPlayers = players.map((p) => (p.id === editingPlayer.id ? { ...p, score: newScore } : p));
    setPlayers(nextPlayers);
    persistSession(nextPlayers, answeredIds, currentBoard, currentTurnIndex, "playing");
    setEditingPlayer(null);
  };

  if (!game || !board) {
    return (
      <div className="min-h-screen bg-[#0f1d45] flex items-center justify-center text-white">
        Loading...
      </div>
    );
  }

  const displayTitle = game.title.trim() || `Game ${games.findIndex((g) => g.id === game.id) + 1 || ""}`.trim() || "Game";

  const ranked = [...players].sort((a, b) => b.score - a.score);
  const podium = ranked.slice(0, 3);
  const rest = ranked.slice(3);

  if (gameOver) {
    return (
      <div
        className="h-screen relative flex flex-col items-center overflow-hidden"
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
        <Link
          to="/"
          className="absolute top-4 left-4 z-10 px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 text-white font-bold text-sm transition"
        >
          ← Back to Home
        </Link>
        <div className="flex-1 w-full max-w-[1100px] px-6 py-10 flex flex-col items-center overflow-y-auto">
          <div className="text-center">
            <div className="text-white font-black tracking-tight text-4xl md:text-6xl">{EVENT_NAME}</div>
            <div className="text-[#FFD700] font-bold text-3xl md:text-5xl mt-3">{displayTitle}</div>
            <div className="mt-4 text-sm font-black tracking-[0.3em] text-white/60">GAME COMPLETE</div>
          </div>

          {players.length > 0 ? (
            <>
              {/* podium top 3 */}
              <div className="mt-10 w-full flex items-end justify-center gap-3 md:gap-6">
                {/* 2nd */}
                {podium[1] && (
                  <div key={podium[1].id} className="flex-1 max-w-[240px] bg-[#94a3b8]/20 border border-white/15 rounded-t-2xl px-3 pt-5 pb-3 text-center">
                    <div className="text-2xl font-black text-[#cbd5e1]">2nd</div>
                    <div className="mt-2 text-white font-black text-lg truncate">{podium[1].name}</div>
                    <div className="text-[#cbd5e1] font-black text-sm">${podium[1].score}</div>
                  </div>
                )}
                {/* 1st */}
                {podium[0] && (
                  <div key={podium[0].id} className="flex-1 max-w-[280px] bg-[#FFD700] border border-[#FFD700]/80 rounded-t-3xl px-3 pt-8 pb-4 text-center shadow-xl">
                    <div className="text-4xl font-black text-[#0f1d45]">1st</div>
                    <div className="mt-3 text-[#0f1d45] font-black text-xl truncate">{podium[0].name}</div>
                    <div className="text-[#0f1d45] font-black text-lg mt-1">${podium[0].score}</div>
                  </div>
                )}
                {/* 3rd */}
                {podium[2] && (
                  <div key={podium[2].id} className="flex-1 max-w-[240px] bg-[#d97706]/25 border border-white/15 rounded-t-2xl px-3 pt-5 pb-3 text-center">
                    <div className="text-2xl font-black text-[#fdba74]">3rd</div>
                    <div className="mt-2 text-white font-black text-lg truncate">{podium[2].name}</div>
                    <div className="text-[#fdba74] font-black text-sm">${podium[2].score}</div>
                  </div>
                )}
              </div>

              {/* others */}
              {rest.length > 0 && (
                <div className="mt-8 w-full max-w-md flex flex-col gap-2">
                  {rest.map((p, idx) => {
                    const place = idx + 4;
                    return (
                      <div key={p.id} className="flex items-center gap-3 bg-white/10 border border-white/10 rounded-xl px-4 py-2.5">
                        <span className="w-10 shrink-0 text-white/60 font-black text-sm">{place}th</span>
                        <span className="flex-1 text-white font-bold text-sm truncate">{p.name}</span>
                        <span className={`font-black text-sm ml-auto ${p.score >= 0 ? "text-white" : "text-red-400"}`}>${p.score}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
          <p className="mt-10 text-white/60">No players played this game.</p>
        )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
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
      {/* top left buttons */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <Link to="/" className="text-xs bg-white/15 hover:bg-white/25 text-white px-3 py-1.5 rounded-full">
          ← Home
        </Link>
        <button onClick={() => setSetupOpen(true)} className="text-xs bg-white/15 hover:bg-white/25 text-white px-3 py-1.5 rounded-full">
          Players
        </button>
        <button
          onClick={() => {
            setConfirmModal({
              title: "Restart game?",
              message: "Scores and progress will be cleared.",
              confirmLabel: "Restart",
              danger: true,
              onConfirm: () => {
                deleteSession(game.id);
                setPlayers([]);
                setAnsweredIds(new Set());
                setCurrentBoard("jeopardy");
                setCurrentTurnIndex(0);
                setSetupOpen(true);
                setFinalPhase(null);
                setActiveClue(null);
                setGameOver(false);
                setConfirmModal(null);
              },
            });
          }}
          className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-full"
        >
          Restart
        </button>
      </div>

      {/* top centered title */}
      <header className="text-center pt-4 pb-2 px-4">
        <div className="text-white font-black tracking-tight text-xl md:text-2xl">{EVENT_NAME}</div>
        <div className="text-[#FFD700] font-bold text-lg mt-1">{displayTitle}</div>
      </header>

      {/* top right board pills */}
      {!setupOpen && (
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          {(["jeopardy", "double", "final"] as BoardId[]).map((bid) => {
            const b = game.boards[bid];
            if (!b.enabled) return null;
            return (
              <button
                key={bid}
                onClick={() => {
                  if (isBoardComplete && bid !== currentBoard) {
                    setCurrentBoard(bid);
                    persistSession(players, answeredIds, bid, currentTurnIndex, "playing");
                  } else if (!isBoardComplete && bid !== currentBoard) {
                    setConfirmModal({
                      title: "Switch board?",
                      message: "Switch before finishing current board? Progress will be kept.",
                      confirmLabel: "Switch",
                      onConfirm: () => {
                        setCurrentBoard(bid);
                        persistSession(players, answeredIds, bid, currentTurnIndex, "playing");
                        setConfirmModal(null);
                      },
                    });
                  }
                }}
                className={`px-4 py-1.5 rounded-full text-xs font-black border ${currentBoard === bid ? "bg-[#FFD700] border-[#FFD700] text-[#0f1d45]" : "bg-white/10 border-white/20 text-white hover:bg-white/20"}`}
              >
                {bid === "jeopardy" ? "Jeopardy" : bid === "double" ? "Double" : "Final"}
                {bid !== "final" && bid === currentBoard && isBoardComplete ? " ✓" : ""}
              </button>
            );
          })}
        </div>
      )}

      {/* main area */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        <div className="flex-1 min-h-0 overflow-hidden">
          <main className="h-full flex flex-col px-4 py-4">
            {/* board complete banner */}
            {isBoardComplete && !setupOpen && !activeClue && (
              <div className="mb-4 bg-[#FFD700] text-[#0f1d45] rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-3 shadow">
                <div>
                  <h3 className="font-black text-lg">
                    {currentBoard === "jeopardy" ? "Jeopardy Complete!" : "Double Jeopardy Complete!"}
                  </h3>
                  <p className="text-sm font-medium opacity-80">
                    {game.boards.double.enabled && currentBoard === "jeopardy"
                      ? "Continue to Double Jeopardy or stay here."
                      : game.boards.final.enabled && currentBoard !== "final"
                      ? "Ready for Final Jeopardy."
                      : "Game complete — review scores below."}
                  </p>
                </div>
                <div className="flex gap-2">
                  {game.boards.double.enabled && currentBoard === "jeopardy" && (
                    <button
                      onClick={() => {
                        setCurrentBoard("double");
                        persistSession(players, answeredIds, "double", currentTurnIndex, "playing");
                      }}
                      className="bg-[#0f1d45] text-white px-6 py-2.5 rounded-full font-black text-sm"
                    >
                      Go to Double →
                    </button>
                  )}
                  {game.boards.final.enabled && (
                    <button onClick={startFinal} className="bg-white text-[#0f1d45] px-6 py-2.5 rounded-full font-black text-sm border-2 border-[#0f1d45]">
                      Final Jeopardy
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setConfirmModal({
                        title: "End game?",
                        message: "Scores will be kept. You can restart later from Home.",
                        confirmLabel: "End game",
                        onConfirm: () => {
                          endGame();
                          setConfirmModal(null);
                        },
                      });
                    }}
                    className="bg-white/70 text-[#0f1d45] px-5 py-2.5 rounded-full font-bold text-sm"
                  >
                    End
                  </button>
                </div>
              </div>
            )}

            {/* board grid */}
            {currentBoard === "final" && game.boards.final.enabled && finalPhase === null ? (
              <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-8 text-center">
                <p className="text-white font-black text-2xl">Final Jeopardy</p>
                <p className="text-white/70 mt-2">Category: {game.boards.final.categories[0]?.title}</p>
                <button onClick={startFinal} disabled={players.length === 0} className="mt-6 bg-[#FFD700] text-[#0f1d45] px-8 py-3 rounded-full font-black disabled:opacity-50">
                  Start Final (enter wagers)
                </button>
                <button
                  onClick={() => {
                    const cl = game.boards.final.categories[0]?.clues[0];
                    if (cl) {
                      setActiveClue({ clue: cl, catIdx: 0, rowIdx: 0, boardId: "final" });
                      setFinalPhase("clue");
                      setFinalWagers(Object.fromEntries(players.map((p) => [p.id, finalWagers[p.id] ?? ""])));
                      setWagerState(null);
                    }
                  }}
                  className="block mx-auto mt-3 text-white/80 underline text-sm"
                >
                  Reveal without wagers
                </button>
              </div>
            ) : currentBoard === "final" ? (
              <div className="text-center py-10 text-white/60">Final Jeopardy in progress — see clue modal.</div>
            ) : (
              <div className="flex-1 min-h-0">
                <BoardPlayGrid board={board} answeredIds={answeredIds} onClueClick={handleClueClick} />
              </div>
            )}
          </main>
        </div>

        {/* right sidebar */}
        <div className="shrink-0 w-[130px] border-l border-white/10 overflow-y-auto p-2 flex flex-col gap-1">
          {players.length === 0 ? (
            <p className="text-white/40 text-xs text-center mt-8">No players yet</p>
          ) : (
            players.map((p, idx) => (
              <button
                key={p.id}
                onClick={() => { setEditingPlayer(p); setEditScore(String(p.score)); }}
                className={`w-full text-left rounded-lg px-2 py-1.5 transition cursor-pointer ${
                  idx === currentTurnIndex
                    ? "border-l-4 border-[#FFD700] bg-white/10"
                    : "border-l-4 border-transparent hover:bg-white/5"
                }`}
              >
                <div className="font-bold text-xs text-white truncate leading-tight">{p.name}</div>
                <div className={`font-black text-xs mt-0.5 leading-tight ${p.score >= 0 ? "text-white" : "text-red-400"}`}>${p.score}</div>
                {idx === currentTurnIndex && (
                  <div className="text-[10px] text-[#FFD700] font-bold mt-0.5">▸ picks next</div>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Player setup modal */}
      {setupOpen && (
        <div className="fixed inset-0 z-40 flex items-start justify-center pt-[10vh] p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[420px] overflow-hidden">
            <div className="bg-[#0f1d45] text-white p-5 text-center">
              <h3 className="font-black text-lg">Add Teams / Players</h3>
              <p className="text-white/70 text-xs mt-1">Type a name and press Add — add as many as you like</p>
            </div>
            <div className="p-5">
              <div className="flex gap-2">
                <input
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddPlayer()}
                  placeholder="Team name"
                  className="flex-1 border border-slate-300 rounded-full px-4 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f1d45]"
                />
                <button onClick={handleAddPlayer} className="bg-[#0f1d45] hover:bg-[#1a2d5c] text-white font-black px-6 py-2.5 rounded-full text-sm">
                  Add
                </button>
              </div>

              <div className="mt-4 min-h-[80px]">
                {players.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-6 border border-dashed rounded-xl">No teams yet</p>
                ) : (
                  <div className="space-y-2">
                    {players.map((p) => (
                      <div key={p.id} className="flex items-center gap-3 border border-slate-200 rounded-xl px-3 py-2">
                        <div className="w-8 h-8 rounded-full bg-[#FFD700] text-[#0f1d45] flex items-center justify-center font-black text-sm">
                          {p.name.trim().charAt(0).toUpperCase() || "?"}
                        </div>
                        <span className="flex-1 font-bold text-slate-800 text-sm">{p.name}</span>
                        <span className="text-sm font-black text-[#0f1d45]">${p.score}</span>
                        <button onClick={() => handleRemovePlayer(p.id)} className="w-7 h-7 rounded-full bg-slate-100 hover:bg-red-600 hover:text-white flex items-center justify-center">
                          <XIcon size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {players.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-black tracking-widest text-slate-500 mb-2">WHO PICKS FIRST?</p>
                  <div className="flex flex-wrap gap-2">
                    {players.map((p, idx) => (
                      <button
                        key={p.id}
                        onClick={() => setSetupFirstPlayer(idx)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${
                          setupFirstPlayer === idx
                            ? "bg-[#FFD700] border-[#FFD700] text-[#0f1d45]"
                            : "bg-white border-slate-200 text-slate-600 hover:border-slate-400"
                        }`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={handleStart} className="mt-6 w-full bg-[#FFD700] hover:bg-[#ffdf33] text-[#0f1d45] font-black py-3 rounded-full shadow text-center">
                Start
              </button>
              {players.length > 0 && (
                <button onClick={() => setSetupOpen(false)} className="mt-2 w-full text-slate-500 text-sm underline">
                  Continue without adding
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Score edit modal */}
      {editingPlayer && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditingPlayer(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[400px] overflow-hidden">
            <div className="p-6 text-center">
              <h3 className="font-black text-xl text-slate-900">{editingPlayer.name}</h3>
              <div className="mt-5 flex items-center justify-center gap-3">
                <label className="text-sm font-bold text-slate-600">Score</label>
                <input
                  value={editScore}
                  onChange={(e) => setEditScore(e.target.value.replace(/[^0-9-]/g, ""))}
                  className="w-28 border border-slate-300 rounded-xl px-4 py-2.5 text-lg font-black text-center focus:outline-none focus:ring-2 focus:ring-[#0f1d45]"
                />
                <button onClick={handleUpdateScore} className="bg-[#0f1d45] hover:bg-[#1a2d5c] text-white font-black px-5 py-2.5 rounded-full text-sm">
                  Update score
                </button>
              </div>
              <div className="mt-4">
                <p className="text-xs text-slate-400">
                  {currentTurnIndex === players.findIndex((p) => p.id === editingPlayer.id) ? (
                    <span className="text-[#FFD700] font-bold">This player chooses the next question</span>
                  ) : (
                    ""
                  )}
                </p>
              </div>
            </div>
            <div className="border-t border-slate-200 p-4 text-center">
              <button
                onClick={() => {
                  setConfirmModal({
                    title: `Remove ${editingPlayer.name}?`,
                    message: "This player will be removed from the game. Their score will be lost.",
                    confirmLabel: "Remove",
                    danger: true,
                    onConfirm: () => {
                      handleRemovePlayer(editingPlayer.id);
                      setEditingPlayer(null);
                      setConfirmModal(null);
                    },
                  });
                }}
                className="text-red-600 hover:text-red-700 font-bold text-sm"
              >
                Remove {editingPlayer.name} from this game
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clue big card */}
      {activeClue && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#0f1d45]">
          {wagerState && wagerState.step === "pick" ? (
            wagerState.mode === "final" ? (
              <div className="flex-1 flex items-center justify-center p-6 bg-[#0f1d45]">
                <div className="bg-white rounded-2xl p-6 w-full max-w-[520px] shadow-2xl">
                  <h3 className="font-black text-2xl text-center text-[#0f1d45]">FINAL JEOPARDY</h3>
                  <p className="text-center text-slate-600 text-sm mt-1">Set each team's wager. Zero means no wager.</p>
                  <div className="mt-5 space-y-2 max-h-[50vh] overflow-y-auto">
                    {players.map((p) => (
                      <div key={p.id} className="flex items-center gap-3 border border-slate-200 rounded-xl px-3 py-2">
                        <span className="flex-1 font-bold text-sm text-slate-800 truncate">{p.name} <span className="font-normal text-slate-400 text-xs">(${p.score})</span></span>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-slate-500 font-bold text-sm">$</span>
                          <input
                            value={finalWagers[p.id] ?? "0"}
                            onChange={(e) => setFinalWagers({ ...finalWagers, [p.id]: e.target.value.replace(/[^0-9]/g, "") })}
                            className="w-24 border border-slate-300 rounded-lg px-2 py-1.5 text-sm font-black text-right focus:outline-none focus:ring-2 focus:ring-[#0f1d45]"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 flex gap-3">
                    <button onClick={() => closeClue(false)} className="flex-1 border border-slate-300 rounded-full py-3 font-bold text-sm">Cancel</button>
                    <button onClick={handleWagerConfirm} className="flex-1 bg-[#FFD700] text-[#0f1d45] rounded-full py-3 font-black text-sm">Reveal Clue →</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-6 bg-[#0f1d45]">
                <div className="bg-white rounded-2xl p-6 w-full max-w-[480px] shadow-2xl">
                  <h3 className="font-black text-2xl text-center text-[#0f1d45]">DAILY DOUBLE!</h3>
                  <p className="text-center text-slate-600 text-sm mt-1">
                    {`${players.find((p) => p.id === wagerState.playerId)?.name ?? ""} — enter wager (host decides cap).`}
                  </p>
                  <div className="mt-5 space-y-3">
                    <label className="block text-xs font-black tracking-widest text-slate-500">WAGER</label>
                    <input value={wagerState.amount} onChange={(e) => setWagerState({ ...wagerState, amount: e.target.value.replace(/[^0-9-]/g, "") })} placeholder="e.g. 500" className="w-full border border-slate-300 rounded-xl px-4 py-3 text-lg font-black placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f1d45]" />
                  </div>
                  <div className="mt-6 flex gap-3">
                    <button onClick={() => closeClue(false)} className="flex-1 border border-slate-300 rounded-full py-3 font-bold text-sm">Cancel</button>
                    <button onClick={handleWagerConfirm} className="flex-1 bg-[#FFD700] text-[#0f1d45] rounded-full py-3 font-black text-sm">Reveal Clue →</button>
                  </div>
                </div>
              </div>
            )
          ) : (
            <>
              <button onClick={handleVoid} className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/15 hover:bg-red-600 text-white flex items-center justify-center backdrop-blur" aria-label="Void question">
                <XIcon size={15} />
              </button>

              <div className="flex-1 flex items-center justify-center p-6 md:p-10 overflow-auto">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[1100px] min-h-[60vh] flex flex-col p-6 md:p-10 relative">
                  <div className="text-center">
                    <div className="inline-flex items-center gap-2 bg-[#0f1d45] text-white px-4 py-1.5 rounded-full text-xs font-black tracking-widest">
                      {activeClue.boardId === "final" ? "FINAL JEOPARDY · WAGER" : activeClue.boardId === "double" ? "DOUBLE JEOPARDY" : "JEOPARDY"} {activeClue.boardId !== "final" && `· $${wagerState?.step === "reveal" ? Number(wagerState.amount) : getClueValue(activeClue.clue, activeClue.rowIdx, activeClue.boardId)}`}
                    </div>
                    {activeClue.clue.isDailyDouble && <span className="ml-2 inline-block bg-red-600 text-white px-3 py-1 rounded-full text-xs font-black">DAILY DOUBLE</span>}
                    {activeClue.boardId === "double" || activeClue.boardId === "jeopardy" ? (
                      <p className="text-xs font-bold tracking-widest text-slate-500 mt-2">{game.boards[activeClue.boardId].categories[activeClue.catIdx]?.title}</p>
                    ) : (
                      <p className="text-xs font-bold tracking-widest text-slate-500 mt-2">{game.boards.final.categories[0]?.title}</p>
                    )}
                  </div>

                  <div className="flex-1 flex flex-col items-center justify-center py-6">
                    <p className="text-2xl md:text-4xl font-black text-slate-900 text-center leading-tight max-w-[900px]">
                      {activeClue.clue.question || "(No question set — edit this clue)"}
                    </p>

                    {activeClue.clue.media.length > 0 && (
                      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-[900px]">
                        {activeClue.clue.media.map((m) => (
                          <div key={m.id} className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
                            {m.type === "image" && m.url.trim() && <img src={m.url} alt="" className="w-full max-h-[320px] object-contain bg-black" />}
                            {m.type === "video" && m.url.trim() && <video src={m.url} controls className="w-full max-h-[320px] bg-black" />}
                            {m.type === "audio" && m.url.trim() && <audio src={m.url} controls className="w-full p-3" />}
                            {!m.url.trim() && <div className="p-4 text-sm text-slate-400">Empty {m.type} URL</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-200 pt-4 flex flex-col items-center gap-3">
                    {!showAnswer ? (
                      <button onClick={() => setShowAnswer(true)} className="bg-slate-900 hover:bg-black text-white px-6 py-2.5 rounded-full font-bold text-sm">
                        Show Answer
                      </button>
                    ) : (
                      <div className="bg-[#FFD700]/20 border-2 border-[#FFD700] rounded-2xl px-6 py-4 w-full max-w-[700px] text-center">
                        <p className="text-xs font-black tracking-widest text-slate-600">ANSWER</p>
                        <p className="text-lg md:text-xl font-black text-slate-900 mt-1">{activeClue.clue.answer || "(No answer set)"}</p>
                      </div>
                    )}
                    {activeClue.boardId === "final" && finalPhase === "clue" && (
                      <button
                        onClick={finishFinalClue}
                        className="bg-[#0f1d45] text-white px-6 py-2.5 rounded-full font-black text-sm mt-2"
                      >
                        Close & Score Final →
                      </button>
                    )}
                  </div>

                  {/* bottom right team panel */}
                  <div className="absolute bottom-4 right-4 flex flex-col gap-2">
                    {(activeClue.clue.isDailyDouble && activeClue.boardId !== "final"
                      ? players.filter((_, idx) => idx === currentTurnIndex)
                      : activeClue.boardId === "final"
                      ? players.filter((p) => finalWagers[p.id] !== undefined)
                      : players
                    ).map((p) => {
                      if (removedFromClue.has(p.id)) return null;
                      return (
                        <div key={p.id} className="group flex items-center gap-2 bg-slate-900 text-white rounded-full pl-3 pr-1 py-1 shadow-lg border border-white/10 min-w-[140px] justify-between">
                          <span className="font-bold text-sm truncate">{p.name}</span>
                          <div className="flex gap-1 shrink-0">
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                              <button
                                onClick={() => {
                                  if (activeClue.boardId === "final") {
                                    handleFinalClueTick(p.id);
                                  } else handleTick(p.id);
                                }}
                                className="w-7 h-7 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center text-xs font-black"
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
                                className="w-7 h-7 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center"
                                title="Wrong (-)"
                              >
                                <XIcon size={10} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {players.length === 0 && <span className="text-white/60 text-xs">Add players first</span>}
                  </div>

                  <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-slate-400 hidden md:block">Hover a team on the bottom right to award ✓ or ✕ — × top right voids</p>
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
  onClueClick: (catIdx: number, rowIdx: number, clue: Clue, bid: BoardId) => void;
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
          <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: GAP }}>
            {board.categories.map((cat) => (
              <div key={cat.id} className="bg-[#0f1d45] border-2 border-[#FFD700]/30 rounded-xl p-2 min-h-[40px] flex items-center justify-center text-center">
                <span className="text-white font-black text-xs sm:text-sm leading-tight">{cat.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 flex flex-col" style={{ gap: GAP }}>
        {Array.from({ length: board.categories[0]?.clues.length ?? 0 }).map((_, rowIdx) => (
          <div key={rowIdx} className="flex-1 min-h-0 flex" style={{ gap: GAP }}>
            <div className="shrink-0 flex items-center justify-center" style={{ width: ROW_LABEL_W }}>
              <span className="text-white/40 text-[10px] font-bold tracking-wider [writing-mode:vertical-lr] rotate-180 select-none">
                {board.id === "jeopardy" ? (rowIdx + 1) * 100 : (rowIdx + 1) * 200}
              </span>
            </div>
            <div className="flex-1 grid min-h-0" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: GAP }}>
              {board.categories.map((cat, colIdx) => {
                const clue = cat.clues[rowIdx];
                const answered = answeredIds.has(clue.id);
                const value = getClueValue(clue, rowIdx, board.id);
                return (
                  <button
                    key={`${cat.id}-${rowIdx}`}
                    disabled={answered}
                    onClick={() => onClueClick(colIdx, rowIdx, clue, board.id)}
                    className={`rounded-xl border-2 min-h-0 min-w-0 flex items-center justify-center text-center transition
                      ${answered ? "opacity-0 pointer-events-none" : "bg-[#0f1d45] border-[#1a2d5c] hover:border-[#FFD700] hover:bg-[#1a2d5c] text-[#FFD700] cursor-pointer"}
                    `}
                  >
                    <span className="font-black text-lg sm:text-2xl md:text-3xl tracking-tight drop-shadow">${value}</span>
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
