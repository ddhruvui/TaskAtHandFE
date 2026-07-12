import { useState, useRef, useEffect } from "react";
import type { Affirmation } from "../../types";
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
    <div className="affirmation-modal__overlay" onClick={onCancel}>
      <div className="affirmation-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="affirmation-modal__title">
          {affirmation ? "Edit Affirmation" : "Add Affirmation"}
        </h3>

        <input
          ref={nameRef}
          className="affirmation-modal__name-input"
          type="text"
          placeholder="Affirmation… (e.g. Thank you blessing)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
            if (e.key === "Escape") onCancel();
          }}
        />

        <div className="affirmation-modal__actions">
          <button
            className="affirmation-modal__btn affirmation-modal__btn--cancel"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="affirmation-modal__btn affirmation-modal__btn--confirm"
            onClick={handleSubmit}
            disabled={!name.trim()}
          >
            {affirmation ? "Save" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}
