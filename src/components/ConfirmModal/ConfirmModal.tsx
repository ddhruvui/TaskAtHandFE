import { useEffect, useRef, useState } from "react";
import "./ConfirmModal.css";

interface ConfirmModalProps {
  message: string;
  onConfirm: (reason?: string) => void;
  onCancel: () => void;
  /** When true, show a required reason field; Delete stays disabled until it is filled. */
  requireReason?: boolean;
  reasonLabel?: string;
}

export default function ConfirmModal({
  message,
  onConfirm,
  onCancel,
  requireReason = false,
  reasonLabel = "Why are you deleting this?",
}: ConfirmModalProps) {
  const [reason, setReason] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (requireReason) textareaRef.current?.focus();
  }, [requireReason]);

  const trimmed = reason.trim();
  const canConfirm = !requireReason || trimmed.length > 0;

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm(requireReason ? trimmed : undefined);
  };

  return (
    <div className="confirm-modal__overlay" onClick={onCancel}>
      <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
        <p className="confirm-modal__message">{message}</p>
        {requireReason && (
          <label className="confirm-modal__reason">
            <span className="confirm-modal__reason-label">{reasonLabel}</span>
            <textarea
              ref={textareaRef}
              className="confirm-modal__reason-input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="e.g. no longer needed, too big, ran out of time…"
            />
          </label>
        )}
        <div className="confirm-modal__actions">
          <button
            className="confirm-modal__btn confirm-modal__btn--cancel"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="confirm-modal__btn confirm-modal__btn--confirm"
            onClick={handleConfirm}
            disabled={!canConfirm}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
