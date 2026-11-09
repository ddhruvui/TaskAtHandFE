import { Icon } from "../Icon";
import "./AddButton.css";

interface AddButtonProps {
  /** Accessible name (aria-label + title), e.g. "Add goal" — e2e targets this */
  ariaLabel: string;
  onClick: () => void;
}

/* Shared icon-only "+" toolbar button used on every view (todo and panels):
   the view's primary action, so it is the one solid accent button on the
   page. Render it inside the view's right-aligned toolbar. Nothing shows but
   the plus, so ariaLabel carries the meaning (it is also the tooltip). */
export default function AddButton({ ariaLabel, onClick }: AddButtonProps) {
  return (
    <button
      className="add-button"
      onClick={onClick}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <Icon name="plus" size={18} strokeWidth={2.4} />
    </button>
  );
}
