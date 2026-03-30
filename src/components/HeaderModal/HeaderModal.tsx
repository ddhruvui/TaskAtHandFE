import { useState, useRef, useEffect } from "react";
import "./HeaderModal.css";

interface HeaderModalProps {
  headerName?: string; // If provided, we're editing; otherwise creating
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

export default function HeaderModal({
  headerName,
  onConfirm,
  onCancel,
}: HeaderModalProps) {
  const [name, setName] = useState(headerName ?? "");
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
    if (nameRef.current && headerName) {
      // Select all text when editing
      nameRef.current.select();
    }
  }, [headerName]);

  function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
  }

  return (
    <div className="header-modal__overlay" onClick={onCancel}>
      <div className="header-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="header-modal__title">
          {headerName ? "Edit Header" : "Add Header"}
        </h3>

        <input
          ref={nameRef}
          className="header-modal__name-input"
          type="text"
          placeholder="Header name…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
            if (e.key === "Escape") onCancel();
          }}
        />

        <div className="header-modal__actions">
          <button
            className="header-modal__btn header-modal__btn--cancel"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="header-modal__btn header-modal__btn--confirm"
            onClick={handleSubmit}
            disabled={!name.trim()}
          >
            {headerName ? "Save" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}
