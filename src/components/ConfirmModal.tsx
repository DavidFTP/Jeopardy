export function ConfirmModal({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[400px] overflow-hidden">
        <div className="p-6">
          <h3 className="text-lg font-black text-slate-900">{title}</h3>
          <p className="text-sm text-slate-600 mt-2">{message}</p>
        </div>
        <div className="flex border-t border-slate-200">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 transition"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-3 text-sm font-black transition
              ${danger
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-[#0f1d45] hover:bg-[#1a2d5c] text-white"
              }
            `}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
