import { useState, useRef, useEffect } from "react";
import { Modal } from "../Modal";
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
    <Modal
      onClose={onCancel}
      className="header-modal"
      overlayClassName="header-modal__overlay"
      labelledBy="header-modal-title"
    >
      <div>
        <h3
          id="header-modal-title"
          className="ui-modal__title header-modal__title"
        >
          {headerName ? "Edit Header" : "Add Header"}
        </h3>
        <p className="ui-modal__description header-modal__description">
          {headerName
            ? "Rename this group of tasks."
            : "Headers group related tasks, like Work or Home."}
        </p>
      </div>

      <input
        ref={nameRef}
        className="input header-modal__name-input"
        type="text"
        placeholder="Header name…"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit();
        }}
      />

      <div className="ui-modal__actions header-modal__actions">
        <button
          className="btn btn--secondary header-modal__btn header-modal__btn--cancel"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          className="btn btn--primary header-modal__btn header-modal__btn--confirm"
          onClick={handleSubmit}
          disabled={!name.trim()}
        >
          {headerName ? "Save" : "Add"}
        </button>
      </div>
    </Modal>
  );
}
