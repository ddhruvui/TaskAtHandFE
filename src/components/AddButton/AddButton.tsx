import "./AddButton.css";

interface AddButtonProps {
  /** Visible label, e.g. "Add Goal" */
  label: string;
  /** Accessible name (aria-label + title), e.g. "Add goal" — e2e targets this */
  ariaLabel: string;
  onClick: () => void;
}

/* Shared "+ Add X" toolbar button used on every view (todo and panels).
   Render it inside a right-aligned toolbar row. */
export default function AddButton({
  label,
  ariaLabel,
  onClick,
}: AddButtonProps) {
  return (
    <button
      className="readme-heading__add-btn add-button"
      onClick={onClick}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <span className="add-button__plus">+</span> {label}
    </button>
  );
}
