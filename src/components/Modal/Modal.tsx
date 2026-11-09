import { useEffect, useRef, type ReactNode } from "react";

/* Open modals, innermost last — only the top one answers Escape. */
const openStack: symbol[] = [];

interface ModalProps {
  /** Close request: Escape, or a click that starts and ends on the overlay */
  onClose: () => void;
  /** Extra classes on the dialog — the component's own BEM block (e.g. "header-modal") */
  className?: string;
  /** Extra classes on the overlay (e.g. "header-modal__overlay"; e2e hooks rely on these) */
  overlayClassName?: string;
  /** id of the element that names the dialog (usually its title) */
  labelledBy?: string;
  /** Accessible name when there is no visible title to point at */
  ariaLabel?: string;
  /** Wider dialog for content-heavy forms */
  wide?: boolean;
  children: ReactNode;
}

/**
 * Shared modal shell: dimmed overlay + centred dialog (a bottom sheet on
 * phones). Owns the behaviour every dialog needs so the individual modals
 * only render their form:
 *  - role="dialog" + aria-modal, named by `labelledBy`/`ariaLabel`
 *  - Escape closes from anywhere in the dialog, not just a focused input
 *  - an overlay click closes, but a drag that starts inside the dialog and
 *    ends on the overlay (e.g. selecting text) does not
 *  - focus moves into the dialog when no field claimed it, and returns to
 *    the control that opened it on close
 *  - the page behind stops scrolling while it is open
 */
export default function Modal({
  onClose,
  className,
  overlayClassName,
  labelledBy,
  ariaLabel,
  wide,
  children,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const pressStartedOnOverlay = useRef(false);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const id = Symbol("modal");
    openStack.push(id);
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Children's effects (e.g. a modal focusing its name input) run before
    // this one, so only take focus when nothing inside has it yet.
    const dialog = dialogRef.current;
    if (dialog && !dialog.contains(document.activeElement)) {
      dialog.focus({ preventScroll: true });
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || openStack[openStack.length - 1] !== id) return;
      e.stopPropagation();
      onCloseRef.current();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      const idx = openStack.indexOf(id);
      if (idx >= 0) openStack.splice(idx, 1);
      if (openStack.length === 0)
        document.body.style.overflow = previousOverflow;
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, []);

  return (
    <div
      className={`ui-modal-overlay${overlayClassName ? ` ${overlayClassName}` : ""}`}
      onPointerDown={(e) => {
        pressStartedOnOverlay.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && pressStartedOnOverlay.current) {
          onClose();
        }
        pressStartedOnOverlay.current = false;
      }}
    >
      <div
        ref={dialogRef}
        className={`ui-modal${wide ? " ui-modal--wide" : ""}${className ? ` ${className}` : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-label={labelledBy ? undefined : ariaLabel}
        tabIndex={-1}
      >
        {children}
      </div>
    </div>
  );
}
