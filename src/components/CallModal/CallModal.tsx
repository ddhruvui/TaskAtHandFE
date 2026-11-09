import { useState, useRef, useEffect } from "react";
import type { Call, CallFrequency } from "../../types";
import { Modal } from "../Modal";
import "./CallModal.css";

interface CallModalProps {
  call?: Call; // If provided, we're editing; otherwise creating
  onConfirm: (draft: { name: string; frequency: CallFrequency }) => void;
  onCancel: () => void;
}

const FREQUENCIES: { value: CallFrequency; label: string; hint: string }[] = [
  { value: "biweekly", label: "Biweekly", hint: "Twice a month." },
  { value: "monthly", label: "Monthly", hint: "Once a month." },
];

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
    <Modal
      onClose={onCancel}
      className="call-modal"
      overlayClassName="call-modal__overlay"
      labelledBy="call-modal-title"
    >
      <h3 id="call-modal-title" className="ui-modal__title call-modal__title">
        {call ? "Edit Call" : "Add Call"}
      </h3>

      <label className="field call-modal__field">
        <span className="field__label">Person</span>
        <input
          ref={nameRef}
          className="input call-modal__name-input"
          type="text"
          placeholder="Person to call… (e.g. Grandma)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
          }}
        />
      </label>

      <div className="field call-modal__field">
        <span className="field__label">How often</span>
        {/* Native radios (e2e checks them by role), each laid over its
            segment so the whole pill is the hit target. */}
        <div
          className="segmented call-modal__frequency"
          role="radiogroup"
          aria-label="Call frequency"
        >
          {FREQUENCIES.map((option) => {
            const active = frequency === option.value;
            return (
              <label
                key={option.value}
                className={`segmented__btn call-modal__frequency-option${active ? " segmented__btn--active call-modal__frequency-option--active" : ""}`}
              >
                <input
                  className="call-modal__frequency-radio"
                  type="radio"
                  name="call-frequency"
                  value={option.value}
                  checked={active}
                  onChange={() => setFrequency(option.value)}
                />
                {option.label}
              </label>
            );
          })}
        </div>
        <span className="field__hint call-modal__frequency-hint">
          {FREQUENCIES.find((o) => o.value === frequency)?.hint}
        </span>
      </div>

      <div className="ui-modal__actions call-modal__actions">
        <button
          className="btn btn--secondary call-modal__btn call-modal__btn--cancel"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          className="btn btn--primary call-modal__btn call-modal__btn--confirm"
          onClick={handleSubmit}
          disabled={!name.trim()}
        >
          {call ? "Save" : "Add"}
        </button>
      </div>
    </Modal>
  );
}
