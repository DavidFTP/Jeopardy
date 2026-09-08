import "./GameCard.css";
import type { Game } from "../types/game";

export function GameCard({
  game,
  index,
  isPlaying,
  isPodium,
  onEdit,
  onPlay,
  onDelete,
  onRestart,
}: {
  game: Game;
  index: number;
  isPlaying: boolean;
  isPodium: boolean;
  onEdit: () => void;
  onPlay: () => void;
  onDelete: () => void;
  onRestart: () => void;
}) {
  const title = game.title.trim() || `Game ${index + 1}`;
  const hasImage = !!game.coverImageUrl?.trim();
  return (
    <div className="game-card">
      {hasImage ? (
        <>
          <div
            className="game-card__bg-img"
            style={{ backgroundImage: `url(${game.coverImageUrl})` }}
          />
          <div className="game-card__bg-overlay" />
        </>
      ) : (
        <div className="game-card__bg-gradient" />
      )}

      {isPlaying && <span className="game-card__badge">PLAYING</span>}

      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        aria-label="Delete game"
        className="game-card__delete"
      >
        <TrashIcon />
      </button>

      <div className="game-card__body">
        <h3 className="game-card__title">{title}</h3>
        <div className="game-card__meta">
          <span>
            {game.boards.jeopardy.categories.length}×
            {game.boards.jeopardy.categories[0]?.clues.length ?? 0}
            {game.boards.double.enabled ? " + Double" : ""}
            {game.boards.final.enabled ? " + Final" : ""}
          </span>
        </div>
      </div>

      <div className="game-card__actions">
        <button onClick={onEdit} className="game-card__btn game-card__btn--edit">
          Edit
        </button>
        <button onClick={onPlay} className="game-card__btn game-card__btn--play">
          {isPodium ? "Podium" : "Play"}
        </button>
        {(isPlaying || isPodium) && (
          <button onClick={onRestart} className="game-card__restart">
            Restart
          </button>
        )}
      </div>
    </div>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}