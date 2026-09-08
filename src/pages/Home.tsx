import "./Home.css";
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
    <div className="home-page">
      <HomeTopBar onCreate={handleCreate} />

      <main className="home-main">
        <div className="home-heading">
          <h2>Games</h2>
          <span>
            {games.length} {games.length === 1 ? "game" : "games"}
          </span>
        </div>

        {games.length === 0 ? (
          <div className="home-empty">
            <p>No games yet</p>
            <p>Create your first Jeopardy game to get started.</p>
            <button onClick={handleCreate} className="btn btn-navy btn-gold--noshadow home-empty__create">
              + Create game
            </button>
          </div>
        ) : (
          <div className="home-grid">
            {games.map((g, i) => {
              void force;
              const playing = hasActiveSession(g.id);
              const isPodium = getSession(g.id)?.phase === "finished";
              const displayTitle = g.title.trim() || `Game ${i + 1}`;
              return (
                <GameCard
                  key={g.id}
                  game={g}
                  index={i}
                  isPlaying={playing}
                  isPodium={isPodium}
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