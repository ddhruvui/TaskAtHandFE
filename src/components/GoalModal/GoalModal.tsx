import { useState, useRef, useEffect } from "react";
import type { Goal } from "../../types";
import { Modal } from "../Modal";
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
    <Modal
      onClose={onCancel}
      className="goal-modal"
      overlayClassName="goal-modal__overlay"
      labelledBy="goal-modal-title"
    >
      <h3 id="goal-modal-title" className="ui-modal__title goal-modal__title">
        {goal ? "Edit Goal" : "Add Goal"}
      </h3>

      <input
        ref={nameRef}
        className="input goal-modal__name-input"
        type="text"
        placeholder="Goal name… (e.g. Improve Health)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit();
        }}
      />

      <div className="field goal-modal__steps">
        <label
          htmlFor="goal-modal-steps"
          className="field__label goal-modal__steps-label"
        >
          Steps
        </label>
        <textarea
          id="goal-modal-steps"
          className="textarea goal-modal__textarea"
          value={stepsText}
          onChange={(e) => setStepsText(e.target.value)}
          placeholder={"One small step per line…\nWake up at 6\nHave 1 fruit a day"}
          rows={6}
          aria-describedby="goal-modal-steps-hint"
        />
        <p id="goal-modal-steps-hint" className="field__hint goal-modal__hint">
          One step per line, in the order you want to build them —{" "}
          {parsedSteps.length} step{parsedSteps.length === 1 ? "" : "s"}
          {goal ? ". Steps keeping their name keep their progress." : ""}
        </p>
      </div>

      <div className="ui-modal__actions goal-modal__actions">
        <button
          className="btn btn--secondary goal-modal__btn goal-modal__btn--cancel"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          className="btn btn--primary goal-modal__btn goal-modal__btn--confirm"
          onClick={handleSubmit}
          disabled={!name.trim()}
        >
          {goal ? "Save" : "Add"}
        </button>
      </div>
    </Modal>
  );
}
