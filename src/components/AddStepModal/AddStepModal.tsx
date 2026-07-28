import { useState, useRef, useEffect } from "react";
// Deliberately reuses the add-task modal's stylesheet and `add-modal__*`
// classes: adding a step to a goal is the same gesture as adding a task to a
// header, so the two dialogs must stay identical from one source.
import "../AddTaskModal/AddTaskModal.css";

interface AddStepModalProps {
  goalName: string;
  busy?: boolean;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

export default function AddStepModal({
  goalName,
  busy = false,
  onConfirm,
  onCancel,
}: AddStepModalProps) {
  const [name, setName] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  function handleAdd() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
  }

  return (
    <div className="add-modal__overlay" onClick={onCancel}>
      <div className="add-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="add-modal__title">
          Add step <span className="add-modal__title-folder">— {goalName}</span>
        </h3>

        <input
          ref={nameRef}
          className="add-modal__name-input"
          type="text"
          placeholder="Step name… (e.g. Wake up at 6)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
            if (e.key === "Escape") onCancel();
          }}
        />

        {/* A step carries no due date of its own — starting it is what creates
            the daily task, and that task is always the 7-day recurring one. */}
        <p className="add-modal__ecd-hint">
          Added to the backlog. Start it later to make it a daily habit.
        </p>

        <div className="add-modal__actions">
          <button
            className="add-modal__btn add-modal__btn--cancel"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="add-modal__btn add-modal__btn--confirm"
            onClick={handleAdd}
            disabled={busy || !name.trim()}
          >
            Add step
          </button>
        </div>
      </div>
    </div>
  );
}
