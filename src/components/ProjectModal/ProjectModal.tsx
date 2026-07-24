import { useState, useRef, useEffect } from "react";
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
    <div className="project-modal__overlay" onClick={onCancel}>
      <div className="project-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="project-modal__title">
          {projectName ? "Edit Project" : "Add Project"}
        </h3>

        <input
          ref={nameRef}
          className="project-modal__name-input"
          type="text"
          placeholder="Project name…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
            if (e.key === "Escape") onCancel();
          }}
        />

        <div className="project-modal__actions">
          <button
            className="project-modal__btn project-modal__btn--cancel"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="project-modal__btn project-modal__btn--confirm"
            onClick={handleSubmit}
            disabled={!name.trim()}
          >
            {projectName ? "Save" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}
