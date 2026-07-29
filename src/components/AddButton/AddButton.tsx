import "./AddButton.css";

interface AddButtonProps {
  /** Accessible name (aria-label + title), e.g. "Add goal" — e2e targets this */
  ariaLabel: string;
  onClick: () => void;
}

/* Shared icon-only "+" toolbar button used on every view (todo and panels).
   Render it inside a right-aligned toolbar row. Nothing shows but the plus,
   so ariaLabel carries the meaning the visible label used to. */
export default function AddButton({ ariaLabel, onClick }: AddButtonProps) {
  return (
    <button
      className="readme-heading__add-btn add-button"
      onClick={onClick}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      +
    </button>
  );
}
