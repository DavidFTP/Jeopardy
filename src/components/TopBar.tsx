import "./TopBar.css";
import { EVENT_NAME } from "../config/event";

export function HomeTopBar({ onCreate }: { onCreate: () => void }) {
  return (
    <header className="home-bar">
      <div className="home-bar__inner">
        <h1 className="home-bar__title">{EVENT_NAME}</h1>
        <button onClick={onCreate} className="home-bar__create">
          + Create
        </button>
      </div>
    </header>
  );
}

export function EditTopBar({
  title,
  onTitleChange,
  onBack,
  onPlay,
  onPreview,
  placeholder,
}: {
  title: string;
  onTitleChange: (v: string) => void;
  onBack: () => void;
  onPlay: () => void;
  onPreview: () => void;
  placeholder: string;
}) {
  return (
    <header className="edit-bar">
      <div className="edit-bar__inner">
        <button onClick={onBack} className="edit-bar__back" aria-label="Back">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <input
          dir="auto"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder={placeholder}
          className="edit-bar__title"
        />
        <div className="edit-bar__spacer" />
        <div className="edit-bar__actions">
          <button onClick={onPreview} className="edit-bar__preview">
            Preview
          </button>
          <button onClick={onPlay} className="edit-bar__play">
            Play
          </button>
        </div>
      </div>
    </header>
  );
}