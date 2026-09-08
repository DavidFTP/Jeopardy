import "./ConfirmModal.css";

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
    <div className="modal-backdrop">
      <div className="modal-scrim" onClick={onCancel} />
      <div className="modal-card">
        <div className="confirm-content">
          <h3 className="confirm-title">{title}</h3>
          <p className="confirm-msg">{message}</p>
        </div>
        <div className="confirm-actions">
          <button onClick={onCancel} className="confirm-btn confirm-btn--cancel">
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`confirm-btn confirm-btn--confirm ${danger ? "confirm-btn--danger" : ""}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}