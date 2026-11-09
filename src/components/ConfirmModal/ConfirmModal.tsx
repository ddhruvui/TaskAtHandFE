import { useEffect, useRef, useState } from "react";
import { Modal } from "../Modal";
import { Icon } from "../Icon";
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
  const cancelRef = useRef<HTMLButtonElement>(null);

  // With a reason to type, start in the field; otherwise on Cancel — the
  // safe choice for a destructive dialog.
  useEffect(() => {
    if (requireReason) textareaRef.current?.focus();
    else cancelRef.current?.focus();
  }, [requireReason]);

  const trimmed = reason.trim();
  const canConfirm = !requireReason || trimmed.length > 0;

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm(requireReason ? trimmed : undefined);
  };

  return (
    <Modal
      onClose={onCancel}
      className="confirm-modal"
      overlayClassName="confirm-modal__overlay"
      labelledBy="confirm-modal-message"
    >
      <div className="confirm-modal__head">
        <span className="confirm-modal__icon" aria-hidden="true">
          <Icon name="trash" size={18} />
        </span>
        <div className="confirm-modal__copy">
          <p id="confirm-modal-message" className="confirm-modal__message">
            {message}
          </p>
          <p className="confirm-modal__note">This can't be undone.</p>
        </div>
      </div>
      {requireReason && (
        <label className="field confirm-modal__reason">
          <span className="field__label confirm-modal__reason-label">
            {reasonLabel}
          </span>
          <textarea
            ref={textareaRef}
            className="textarea confirm-modal__reason-input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey))
                handleConfirm();
            }}
            rows={3}
            placeholder="e.g. no longer needed, too big, ran out of time…"
          />
        </label>
      )}
      <div className="ui-modal__actions confirm-modal__actions">
        <button
          ref={cancelRef}
          className="btn btn--secondary confirm-modal__btn confirm-modal__btn--cancel"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          className="btn btn--danger confirm-modal__btn confirm-modal__btn--confirm"
          onClick={handleConfirm}
          disabled={!canConfirm}
        >
          Delete
        </button>
      </div>
    </Modal>
  );
}
