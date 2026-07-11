import { useState, useRef, useEffect } from "react";
import type { Goal } from "../../types";
import "./GoalModal.css";

interface GoalModalProps {
  goal?: Goal; // If provided, we're editing; otherwise creating
  onConfirm: (draft: { name: string; stepNames: string[] }) => void;
  onCancel: () => void;
}

export default function GoalModal({
  goal,
  onConfirm,
  onCancel,
}: GoalModalProps) {
  const [name, setName] = useState(goal?.name ?? "");
  const [stepsText, setStepsText] = useState(
    goal?.steps.map((s) => s.name).join("\n") ?? "",
  );
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
    if (nameRef.current && goal) {
      // Select all text when editing
      nameRef.current.select();
    }
  }, [goal]);

  const parsedSteps = stepsText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");

  function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onConfirm({ name: trimmed, stepNames: parsedSteps });
  }

  return (
    <div className="goal-modal__overlay" onClick={onCancel}>
      <div className="goal-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="goal-modal__title">{goal ? "Edit Goal" : "Add Goal"}</h3>

        <input
          ref={nameRef}
          className="goal-modal__name-input"
          type="text"
          placeholder="Goal name… (e.g. Improve Health)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
            if (e.key === "Escape") onCancel();
          }}
        />

        <div className="goal-modal__steps">
          <span className="goal-modal__steps-label">Steps</span>
          <textarea
            className="goal-modal__textarea"
            value={stepsText}
            onChange={(e) => setStepsText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onCancel();
            }}
            placeholder={"One small step per line…\nWake up at 6\nHave 1 fruit a day"}
            rows={6}
          />
          <p className="goal-modal__hint">
            One step per line, in the order you want to build them —{" "}
            {parsedSteps.length} step{parsedSteps.length === 1 ? "" : "s"}
            {goal ? ". Steps keeping their name keep their progress." : ""}
          </p>
        </div>

        <div className="goal-modal__actions">
          <button
            className="goal-modal__btn goal-modal__btn--cancel"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="goal-modal__btn goal-modal__btn--confirm"
            onClick={handleSubmit}
            disabled={!name.trim()}
          >
            {goal ? "Save" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}
