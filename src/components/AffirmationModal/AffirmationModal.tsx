import { useState, useRef, useEffect } from "react";
import type { Affirmation } from "../../types";
import { Modal } from "../Modal";
import "./AffirmationModal.css";

interface AffirmationModalProps {
  affirmation?: Affirmation; // If provided, we're editing; otherwise creating
  onConfirm: (draft: { name: string }) => void;
  onCancel: () => void;
}

export default function AffirmationModal({
  affirmation,
  onConfirm,
  onCancel,
}: AffirmationModalProps) {
  const [name, setName] = useState(affirmation?.name ?? "");
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
    if (nameRef.current && affirmation) {
      // Select all text when editing
      nameRef.current.select();
    }
  }, [affirmation]);

  function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onConfirm({ name: trimmed });
  }

  return (
    <Modal
      onClose={onCancel}
      className="affirmation-modal"
      overlayClassName="affirmation-modal__overlay"
      labelledBy="affirmation-modal-title"
    >
      <div>
        <h3
          id="affirmation-modal-title"
          className="ui-modal__title affirmation-modal__title"
        >
          {affirmation ? "Edit Affirmation" : "Add Affirmation"}
        </h3>
        <p className="ui-modal__description affirmation-modal__description">
          A short line to read every day.
        </p>
      </div>

      <input
        ref={nameRef}
        className="input affirmation-modal__name-input"
        type="text"
        placeholder="Affirmation… (e.g. Thank you blessing)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit();
        }}
      />

      <div className="ui-modal__actions affirmation-modal__actions">
        <button
          className="btn btn--secondary affirmation-modal__btn affirmation-modal__btn--cancel"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          className="btn btn--primary affirmation-modal__btn affirmation-modal__btn--confirm"
          onClick={handleSubmit}
          disabled={!name.trim()}
        >
          {affirmation ? "Save" : "Add"}
        </button>
      </div>
    </Modal>
  );
}
