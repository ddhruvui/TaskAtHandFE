import { useState, useRef, useEffect } from "react";
import type { EventTemplate } from "../../types";
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
    <div className="event-modal__overlay" onClick={onCancel}>
      <div className="event-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="event-modal__title">
          {event ? "Edit Event" : "Add Event"}
        </h3>

        <input
          ref={nameRef}
          className="event-modal__name-input"
          type="text"
          placeholder="Event name… (e.g. Burger Night)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
            if (e.key === "Escape") onCancel();
          }}
        />

        <div className="event-modal__tasks">
          <span className="event-modal__tasks-label">Tasks</span>
          <textarea
            className="event-modal__textarea"
            value={tasksText}
            onChange={(e) => setTasksText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onCancel();
            }}
            placeholder={"One task per line…\nProcure onion\nProcure bun"}
            rows={6}
          />
          <p className="event-modal__hint">
            One task per line — {parsedTasks.length} task
            {parsedTasks.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="event-modal__actions">
          <button
            className="event-modal__btn event-modal__btn--cancel"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="event-modal__btn event-modal__btn--confirm"
            onClick={handleSubmit}
            disabled={!name.trim() || parsedTasks.length === 0}
          >
            {event ? "Save" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}
