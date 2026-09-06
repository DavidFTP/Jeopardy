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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[720px] max-h-[92vh] flex flex-col overflow-hidden">
        <div className="bg-[#0f1d45] text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="font-black text-lg">Edit Clue — ${effectiveValue}</h3>
            <p className="text-white/70 text-xs">
              {boardId === "final" ? "Final Jeopardy" : `${boardId === "double" ? "Double" : "Jeopardy"} · Row ${rowIndex + 1}`}
              {draft.isDailyDouble ? " · Daily Double" : ""}
            </p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white" aria-label="Close">
            <XIcon size={14} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          <div>
            <label className="block text-xs font-black tracking-widest text-slate-500 mb-1">QUESTION / CLUE</label>
            <textarea
              dir="auto"
              value={draft.question}
              onChange={(e) => setDraft({ ...draft, question: e.target.value })}
              rows={3}
              placeholder="Enter the clue shown to players..."
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f1d45] focus:border-transparent text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-black tracking-widest text-slate-500 mb-1">ANSWER</label>
            <textarea
              dir="auto"
              value={draft.answer}
              onChange={(e) => setDraft({ ...draft, answer: e.target.value })}
              rows={2}
              placeholder="Correct response..."
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f1d45] text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black tracking-widest text-slate-500 mb-1">VALUE</label>
              <div className="flex gap-2">
                <input
                  value={valueInput}
                  onChange={(e) => setValueInput(e.target.value)}
                  placeholder={`${derivedValue}`}
                  className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f1d45] text-sm"
                />
                <button
                  onClick={() => setValueInput("")}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold"
                >
                  Reset
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Blank = ${derivedValue} (default). Host can decide cap in play.</p>
            </div>
            <label className="flex items-center gap-3 border border-slate-200 rounded-xl px-4 py-3 cursor-pointer hover:bg-slate-50">
              <input
                type="checkbox"
                checked={draft.isDailyDouble}
                onChange={(e) => setDraft({ ...draft, isDailyDouble: e.target.checked })}
                className="w-5 h-5 accent-[#0f1d45]"
              />
              <div>
                <span className="block text-sm font-bold text-slate-800">Daily Double</span>
                <span className="block text-xs text-slate-500">Hidden on the board until picked</span>
              </div>
            </label>
          </div>

          <div>
            <label className="block text-xs font-black tracking-widest text-slate-500 mb-2">TIME LIMIT</label>
            <div className="flex flex-wrap gap-2">
              {TIME_LIMIT_OPTIONS.map((opt) => {
                const active = (draft.timeLimit ?? null) === opt.value;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setDraft({ ...draft, timeLimit: opt.value })}
                    className={`px-3 py-1.5 rounded-full text-xs font-black border transition ${
                      active
                        ? "bg-[#FFD700] border-[#FFD700] text-[#0f1d45] shadow"
                        : "bg-white border-slate-200 text-slate-600 hover:border-[#0f1d45] hover:text-[#0f1d45]"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Time the player has to answer. {draft.timeLimit == null ? "Unlimited is selected." : `Selected: ${draft.timeLimit >= 60 ? `${draft.timeLimit / 60} min` : `${draft.timeLimit} sec`}.`}</p>
          </div>

          <div>
            <label className="block text-xs font-black tracking-widest text-slate-500 mb-2">MEDIA (image / video / audio)</label>
            <div className="grid grid-cols-3 gap-3">
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
                    className="border-2 border-dashed border-slate-300 rounded-xl p-3 flex flex-col items-center justify-center gap-2 min-h-[140px] bg-slate-50/60 hover:border-[#0f1d45] hover:bg-slate-50 transition cursor-pointer"
                  >
                    <label className="w-full flex flex-col items-center justify-center gap-2 cursor-pointer">
                      <span className="text-xs font-black tracking-widest text-slate-500">{type.toUpperCase()}</span>
                      {item ? (
                        <div className="w-full">
                          {type === "image" && item.url.trim() ? <img src={item.url} alt="" className="w-full h-16 object-cover rounded-lg" /> : null}
                          {type === "video" && item.url.trim() ? <video src={item.url} className="w-full h-16 object-cover rounded-lg" controls /> : null}
                          {type === "audio" && item.url.trim() ? <audio src={item.url} controls className="w-full mt-1" /> : null}
                          {!item.url.trim() && <span className="text-xs text-slate-400">Drop {type} here</span>}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Drop {type} here<br />or click to browse</span>
                      )}
                      <PlusIcon size={20} className="mx-auto" />
                      <input
                        type="file"
                        accept={ACCEPT[type]}
                        className="hidden"
                        onChange={(e) => refileMediaForType(type, e.target)}
                      />
                    </label>
                    {item && (
                      <button onClick={() => removeMedia(item.id)} className="mt-1 w-7 h-7 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center" aria-label={`Remove ${type}`}>
                        <XIcon size={11} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 p-4 flex items-center justify-between gap-3 bg-slate-50">
          <button onClick={onDelete} className="w-10 h-10 rounded-full bg-white border border-red-300 hover:bg-red-600 hover:border-red-600 hover:text-white text-red-500 flex items-center justify-center transition" title="Delete/clarify this clue" aria-label="Delete clue">
            <TrashIcon size={16} />
          </button>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-6 py-2.5 rounded-full border border-slate-300 text-slate-700 font-bold text-sm hover:bg-white">Cancel</button>
            <button onClick={handleSave} className="px-8 py-2.5 rounded-full bg-[#0f1d45] hover:bg-[#1a2d5c] text-white font-black text-sm shadow">Save clue</button>
          </div>
        </div>
      </div>
    </div>
  );
}