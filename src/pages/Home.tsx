import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HomeTopBar } from "../components/TopBar";
import { GameCard } from "../components/GameCard";
import { ConfirmModal } from "../components/ConfirmModal";
import { useGameStore } from "../stores/gameStore";
import {
  createNewGame,
  deleteSession,
  getSession,
  hasActiveSession,
} from "../services/gameRepository";

type ModalState =
  | null
  | { type: "delete"; id: string; title: string }
  | { type: "restart"; id: string; title: string }
  | { type: "edit-while-playing"; id: string };

export default function Home() {
  const nav = useNavigate();
  const { games, load, deleteGame, saveGame } = useGameStore();
  const [, force] = useState(0);
  const [modal, setModal] = useState<ModalState>(null);

  useEffect(() => {
    load();
    const onStorage = () => force((x) => x + 1);
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [load]);

  const handleCreate = () => {
    const g = createNewGame(games);
    saveGame(g);
    nav(`/edit/${g.id}`);
  };

  const handleDelete = (id: string, title: string) => {
    setModal({ type: "delete", id, title });
  };

  const handleRestart = (id: string, title: string) => {
    setModal({ type: "restart", id, title });
  };

  return (
    <div className="min-h-screen bg-[#0f1d45]">
      <HomeTopBar onCreate={handleCreate} />

      <main className="max-w-[1400px] mx-auto px-6 py-8">
        <div className="flex items-baseline gap-3 mb-6">
          <h2 className="text-white font-black text-2xl">Games</h2>
          <span className="text-white/60 text-sm">
            {games.length} {games.length === 1 ? "game" : "games"}
          </span>
        </div>

        {games.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center shadow">
            <p className="text-slate-700 font-semibold text-lg">No games yet</p>
            <p className="text-slate-500 text-sm mt-1">
              Create your first Jeopardy game to get started.
            </p>
            <button
              onClick={handleCreate}
              className="mt-6 bg-[#0f1d45] hover:bg-[#1a2d5c] text-white font-bold px-8 py-3 rounded-full shadow transition"
            >
              + Create game
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {games.map((g, i) => {
              void force;
              const playing = hasActiveSession(g.id);
              getSession(g.id);
              const displayTitle = g.title.trim() || `Game ${i + 1}`;
              return (
                <GameCard
                  key={g.id}
                  game={g}
                  index={i}
                  isPlaying={playing}
                  onEdit={() => {
                    if (playing) {
                      setModal({ type: "edit-while-playing", id: g.id });
                      return;
                    }
                    nav(`/edit/${g.id}`);
                  }}
                  onPlay={() => nav(`/play/${g.id}`)}
                  onDelete={() => handleDelete(g.id, displayTitle)}
                  onRestart={() => handleRestart(g.id, displayTitle)}
                />
              );
            })}
          </div>
        )}
      </main>

      {modal?.type === "delete" && (
        <ConfirmModal
          title="Delete game?"
          message={`"${modal.title}" will be permanently deleted. This cannot be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={() => {
            deleteGame(modal.id);
            setModal(null);
          }}
          onCancel={() => setModal(null)}
        />
      )}

      {modal?.type === "restart" && (
        <ConfirmModal
          title="Restart game?"
          message={`"${modal.title}" — all current scores and progress will be lost.`}
          confirmLabel="Restart"
          danger
          onConfirm={() => {
            deleteSession(modal.id);
            force((x) => x + 1);
            setModal(null);
          }}
          onCancel={() => setModal(null)}
        />
      )}

      {modal?.type === "edit-while-playing" && (
        <ConfirmModal
          title="Edit active game?"
          message="Editing will restart this game and clear its current play session."
          confirmLabel="Continue"
          onConfirm={() => {
            if (modal.id) deleteSession(modal.id);
            nav(`/edit/${modal.id}`);
          }}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  );
}
