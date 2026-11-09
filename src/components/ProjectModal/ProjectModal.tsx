import { useState, useRef, useEffect } from "react";
import { Modal } from "../Modal";
import "./ProjectModal.css";

interface ProjectModalProps {
  projectName?: string; // If provided, we're editing; otherwise creating
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

export default function ProjectModal({
  projectName,
  onConfirm,
  onCancel,
}: ProjectModalProps) {
  const [name, setName] = useState(projectName ?? "");
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
    if (nameRef.current && projectName) {
      // Select all text when editing
      nameRef.current.select();
    }
  }, [projectName]);

  function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
  }

  return (
    <Modal
      onClose={onCancel}
      className="project-modal"
      overlayClassName="project-modal__overlay"
      labelledBy="project-modal-title"
    >
      <h3
        id="project-modal-title"
        className="ui-modal__title project-modal__title"
      >
        {projectName ? "Edit Project" : "Add Project"}
      </h3>

      <input
        ref={nameRef}
        className="input project-modal__name-input"
        type="text"
        placeholder="Project name…"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit();
        }}
      />

      <div className="ui-modal__actions project-modal__actions">
        <button
          className="btn btn--secondary project-modal__btn project-modal__btn--cancel"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          className="btn btn--primary project-modal__btn project-modal__btn--confirm"
          onClick={handleSubmit}
          disabled={!name.trim()}
        >
          {projectName ? "Save" : "Add"}
        </button>
      </div>
    </Modal>
  );
}
