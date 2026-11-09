import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Modal from "./Modal";

function renderModal(onClose = vi.fn()) {
  render(
    <Modal
      onClose={onClose}
      className="demo-modal"
      overlayClassName="demo-modal__overlay"
      labelledBy="demo-title"
    >
      <h3 id="demo-title">Demo dialog</h3>
      <input placeholder="Name" />
    </Modal>,
  );
  return onClose;
}

describe("Modal", () => {
  it("renders a named modal dialog carrying the caller's classes", () => {
    renderModal();
    const dialog = screen.getByRole("dialog", { name: "Demo dialog" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveClass("ui-modal", "demo-modal");
    expect(dialog.parentElement).toHaveClass(
      "ui-modal-overlay",
      "demo-modal__overlay",
    );
  });

  it("closes on Escape from anywhere", () => {
    const onClose = renderModal();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("ignores other keys", () => {
    const onClose = renderModal();
    fireEvent.keyDown(window, { key: "Enter" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes on a click that starts and ends on the overlay", () => {
    const onClose = renderModal();
    const overlay = screen.getByRole("dialog").parentElement!;
    fireEvent.pointerDown(overlay);
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("stays open for a click inside the dialog", () => {
    const onClose = renderModal();
    const input = screen.getByPlaceholderText("Name");
    fireEvent.pointerDown(input);
    fireEvent.click(input);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("stays open when a drag starts inside and is released on the overlay", () => {
    const onClose = renderModal();
    const overlay = screen.getByRole("dialog").parentElement!;
    fireEvent.pointerDown(screen.getByPlaceholderText("Name"));
    // the browser fires the click on the common ancestor: the overlay
    fireEvent.click(overlay);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("only lets the top-most dialog answer Escape", () => {
    const outer = vi.fn();
    const inner = vi.fn();
    render(
      <>
        <Modal onClose={outer} ariaLabel="Outer">
          <p>outer</p>
        </Modal>
        <Modal onClose={inner} ariaLabel="Inner">
          <p>inner</p>
        </Modal>
      </>,
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(inner).toHaveBeenCalledTimes(1);
    expect(outer).not.toHaveBeenCalled();
  });

  it("locks page scroll while open and restores it on close", () => {
    document.body.style.overflow = "";
    const { unmount } = render(
      <Modal onClose={() => {}} ariaLabel="Scroll lock">
        <p>body</p>
      </Modal>,
    );
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("");
  });

  it("moves focus into the dialog and back to the opener on close", () => {
    const opener = document.createElement("button");
    document.body.appendChild(opener);
    opener.focus();

    const { unmount } = render(
      <Modal onClose={() => {}} ariaLabel="Focus">
        <p>no fields</p>
      </Modal>,
    );
    expect(screen.getByRole("dialog")).toHaveFocus();

    unmount();
    expect(opener).toHaveFocus();
    opener.remove();
  });
});
