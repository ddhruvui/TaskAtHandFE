import { useState, useRef, useEffect } from "react";
import type { EventTemplate } from "../../types";
import { Modal } from "../Modal";
import "./EventModal.css";

interface EventModalProps {
  event?: EventTemplate; // If provided, we're editing; otherwise creating
  onConfirm: (draft: { name: string; tasks: string[] }) => void;
  onCancel: () => void;
}

export default function EventModal({
  event,
  onConfirm,
  onCancel,
}: EventModalProps) {
  const [name, setName] = useState(event?.name ?? "");
  const [tasksText, setTasksText] = useState(event?.tasks.join("\n") ?? "");
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
    if (nameRef.current && event) {
      // Select all text when editing
      nameRef.current.select();
    }
  }, [event]);

  const parsedTasks = tasksText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");

  function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed || parsedTasks.length === 0) return;
    onConfirm({ name: trimmed, tasks: parsedTasks });
  }

  return (
    <Modal
      onClose={onCancel}
      className="event-modal"
      overlayClassName="event-modal__overlay"
      labelledBy="event-modal-title"
    >
      <h3 id="event-modal-title" className="ui-modal__title event-modal__title">
        {event ? "Edit Event" : "Add Event"}
      </h3>

      <div className="field event-modal__name">
        <label htmlFor="event-modal-name" className="field__label">
          Name
        </label>
        <input
          id="event-modal-name"
          ref={nameRef}
          className="input event-modal__name-input"
          type="text"
          placeholder="Event name… (e.g. Burger Night)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
          }}
        />
      </div>

      <div className="field event-modal__tasks">
        <label
          htmlFor="event-modal-tasks"
          className="field__label event-modal__tasks-label"
        >
          Tasks
        </label>
        <textarea
          id="event-modal-tasks"
          className="textarea event-modal__textarea"
          value={tasksText}
          onChange={(e) => setTasksText(e.target.value)}
          placeholder={"One task per line…\nProcure onion\nProcure bun"}
          rows={6}
        />
        <p className="field__hint event-modal__hint">
          One task per line — {parsedTasks.length} task
          {parsedTasks.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="ui-modal__actions event-modal__actions">
        <button
          type="button"
          className="btn btn--secondary event-modal__btn event-modal__btn--cancel"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn btn--primary event-modal__btn event-modal__btn--confirm"
          onClick={handleSubmit}
          disabled={!name.trim() || parsedTasks.length === 0}
        >
          {event ? "Save" : "Add"}
        </button>
      </div>
    </Modal>
  );
}
