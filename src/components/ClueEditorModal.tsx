import "./ClueEditorModal.css";
import { useEffect, useState } from "react";
import type { BoardId, Clue, MediaType, TimeLimit } from "../types/game";
import { XIcon, TrashIcon, PlusIcon } from "./icons";

const TIME_LIMIT_OPTIONS: { label: string; value: TimeLimit }[] = [
  { label: "10s", value: 10 },
  { label: "20s", value: 20 },
  { label: "30s", value: 30 },
  { label: "1 min", value: 60 },
  { label: "2 min", value: 120 },
  { label: "3 min", value: 180 },
  { label: "Unlimited", value: null },
];

function newId() {
  return Math.random().toString(36).slice(2, 9);
}

const ACCEPT: Record<MediaType, string> = {
  image: "image/*",
  video: "video/*",
  audio: "audio/*",
};

export function ClueEditorModal({
  clue,
  boardId,
  rowIndex,
  derivedValue,
  onSave,
  onDelete,
  onClose,
}: {
  clue: Clue;
  boardId: BoardId;
  rowIndex: number;
  derivedValue: number;
  onSave: (updated: Clue) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Clue>(() => structuredClone(clue));
  const [valueInput, setValueInput] = useState<string>(
    clue.valueOverride != null ? String(clue.valueOverride) : ""
  );

  useEffect(() => {
    setDraft(structuredClone(clue));
    setValueInput(clue.valueOverride != null ? String(clue.valueOverride) : "");
  }, [clue]);

  const effectiveValue = valueInput.trim() === "" ? derivedValue : Number(valueInput) || derivedValue;

  const replaceMediaOfType = (type: MediaType, file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      setDraft((d) => {
        const others = d.media.filter((m) => m.type !== type);
        const base = { type, url, alt: file.name } as const;
        return { ...d, media: [...others, { id: newId(), ...base }] };
      });
    };
    reader.readAsDataURL(file);
  };

  const addFileOfType = (type: MediaType, file: File) => {
    replaceMediaOfType(type, file);
  };

  const refileMediaForType = (type: MediaType, input: HTMLInputElement | null) => {
    if (!input) return;
    const file = input.files?.[0];
    if (!file) return;
    addFileOfType(type, file);
    input.value = "";
  };

  const removeMedia = (id: string) => {
    setDraft((d) => ({ ...d, media: d.media.filter((m) => m.id !== id) }));
  };

  const handleSave = () => {
    const updated: Clue = {
      ...draft,
      valueOverride: valueInput.trim() === "" ? null : Number(valueInput),
    };
    onSave(updated);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-scrim modal-scrim--strong" onClick={onClose} />
      <div className="modal-card modal-card--xl">
        <div className="modal-header">
          <div>
            <h3 className="clue-editor__title">Edit Clue — {effectiveValue}</h3>
            <p className="clue-editor__subtitle">
              {boardId === "final" ? "Final Jeopardy" : `${boardId === "double" ? "Double" : "Jeopardy"} · Row ${rowIndex + 1}`}
              {draft.isDailyDouble ? " · Daily Double" : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="icon-btn icon-btn--md clue-editor__close"
            aria-label="Close"
          >
            <XIcon size={14} />
          </button>
        </div>

        <div className="modal-body clue-editor__body">
          <div>
            <label className="field-label">QUESTION / CLUE</label>
            <textarea
              dir="auto"
              value={draft.question}
              onChange={(e) => setDraft({ ...draft, question: e.target.value })}
              rows={3}
              placeholder="Enter the clue shown to players..."
              className="text-input"
            />
          </div>
          <div>
            <label className="field-label">ANSWER</label>
            <textarea
              dir="auto"
              value={draft.answer}
              onChange={(e) => setDraft({ ...draft, answer: e.target.value })}
              rows={2}
              placeholder="Correct response..."
              className="text-input"
            />
          </div>

          <div className="clue-editor__grid2">
            <div>
              <label className="field-label">VALUE</label>
              <div className="clue-editor__value-row">
                <input
                  value={valueInput}
                  onChange={(e) => setValueInput(e.target.value)}
                  placeholder={`${derivedValue}`}
                  className="text-input"
                />
                <button
                  onClick={() => setValueInput("")}
                  className="btn-slate"
                >
                  Reset
                </button>
              </div>
              <p className="hint">Blank = {derivedValue} (default). Host can decide cap in play.</p>
            </div>
            <label className="clue-editor__dd">
              <input
                type="checkbox"
                checked={draft.isDailyDouble}
                onChange={(e) => setDraft({ ...draft, isDailyDouble: e.target.checked })}
              />
              <div>
                <span className="clue-editor__dd-title">Daily Double</span>
                <span className="clue-editor__dd-sub">Hidden on the board until picked</span>
              </div>
            </label>
          </div>

          <div>
            <label className="field-label">TIME LIMIT</label>
            <div className="clue-editor__pills">
              {TIME_LIMIT_OPTIONS.map((opt) => {
                const active = (draft.timeLimit ?? null) === opt.value;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setDraft({ ...draft, timeLimit: opt.value })}
                    className={`clue-editor__pill ${active ? "clue-editor__pill--active" : ""}`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <p className="hint">Time the player has to answer. {draft.timeLimit == null ? "Unlimited is selected." : `Selected: ${draft.timeLimit >= 60 ? `${draft.timeLimit / 60} min` : `${draft.timeLimit} sec`}.`}</p>
          </div>

          <div>
            <label className="field-label">MEDIA (image / video / audio)</label>
            <div className="clue-editor__media-grid">
              {(["image", "video", "audio"] as MediaType[]).map((type) => {
                const item = draft.media.find((m) => m.type === type);
                return (
                  <div
                    key={type}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files?.[0];
                      if (file) addFileOfType(type, file);
                    }}
                    onDragEnter={(e) => e.preventDefault()}
                    className="clue-editor__media-card"
                  >
                    <label className="clue-editor__media-label">
                      <span className="clue-editor__media-type">{type.toUpperCase()}</span>
                      {item ? (
                        <div className="clue-editor__media-preview">
                          {type === "image" && item.url.trim() ? <img src={item.url} alt="" /> : null}
                          {type === "video" && item.url.trim() ? <video src={item.url} controls /> : null}
                          {type === "audio" && item.url.trim() ? <audio src={item.url} controls /> : null}
                          {!item.url.trim() && <span className="clue-editor__media-empty">Drop {type} here</span>}
                        </div>
                      ) : (
                        <span className="clue-editor__media-empty">
                          Drop {type} here<br />or click to browse
                        </span>
                      )}
                      <PlusIcon size={20} />
                      <input
                        type="file"
                        accept={ACCEPT[type]}
                        hidden
                        onChange={(e) => refileMediaForType(type, e.target)}
                      />
                    </label>
                    {item && (
                      <button
                        onClick={() => removeMedia(item.id)}
                        className="icon-btn icon-btn--sm icon-btn--red clue-editor__media-remove"
                        aria-label={`Remove ${type}`}
                      >
                        <XIcon size={11} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button
            onClick={onDelete}
            className="icon-btn icon-btn--md icon-btn--softred"
            title="Delete/clarify this clue"
            aria-label="Delete clue"
          >
            <TrashIcon size={16} />
          </button>
          <div className="clue-editor__footer-right">
            <button onClick={onClose} className="btn-outline">Cancel</button>
            <button onClick={handleSave} className="btn-navy">Save clue</button>
          </div>
        </div>
      </div>
    </div>
  );
}