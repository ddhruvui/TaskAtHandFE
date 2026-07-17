import { useState, useRef, useEffect } from "react";
import type { Call, CallFrequency } from "../../types";
import "./CallModal.css";

interface CallModalProps {
  call?: Call; // If provided, we're editing; otherwise creating
  onConfirm: (draft: { name: string; frequency: CallFrequency }) => void;
  onCancel: () => void;
}

export default function CallModal({
  call,
  onConfirm,
  onCancel,
}: CallModalProps) {
  const [name, setName] = useState(call?.name ?? "");
  const [frequency, setFrequency] = useState<CallFrequency>(
    call?.frequency ?? "biweekly",
  );
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
    if (nameRef.current && call) {
      // Select all text when editing
      nameRef.current.select();
    }
  }, [call]);

  function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onConfirm({ name: trimmed, frequency });
  }

  return (
    <div className="call-modal__overlay" onClick={onCancel}>
      <div className="call-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="call-modal__title">
          {call ? "Edit Call" : "Add Call"}
        </h3>

        <input
          ref={nameRef}
          className="call-modal__name-input"
          type="text"
          placeholder="Person to call… (e.g. Grandma)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
            if (e.key === "Escape") onCancel();
          }}
        />

        <div
          className="call-modal__frequency"
          role="radiogroup"
          aria-label="Call frequency"
        >
          <label className="call-modal__frequency-option">
            <input
              type="radio"
              name="call-frequency"
              value="biweekly"
              checked={frequency === "biweekly"}
              onChange={() => setFrequency("biweekly")}
            />
            Biweekly
          </label>
          <label className="call-modal__frequency-option">
            <input
              type="radio"
              name="call-frequency"
              value="monthly"
              checked={frequency === "monthly"}
              onChange={() => setFrequency("monthly")}
            />
            Monthly
          </label>
        </div>

        <div className="call-modal__actions">
          <button
            className="call-modal__btn call-modal__btn--cancel"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="call-modal__btn call-modal__btn--confirm"
            onClick={handleSubmit}
            disabled={!name.trim()}
          >
            {call ? "Save" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}
