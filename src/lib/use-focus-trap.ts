import { type RefObject, useEffect } from "react";

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

export function resolveNextFocusIndex(
  currentIndex: number,
  totalItems: number,
  shiftKey: boolean,
): number | null {
  if (totalItems <= 0) {
    return null;
  }
  if (shiftKey) {
    if (currentIndex <= 0) {
      return totalItems - 1;
    }
    return null;
  }
  if (currentIndex === -1 || currentIndex >= totalItems - 1) {
    return 0;
  }
  return null;
}

export function useFocusTrap(
  isOpen: boolean,
  containerRef: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") {
        return;
      }
      const container = containerRef.current;
      if (!container) {
        return;
      }
      const focusables = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);

      if (focusables.length === 0) {
        return;
      }

      const activeElement =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      const currentIndex = activeElement
        ? focusables.indexOf(activeElement)
        : -1;

      const wrapIndex = resolveNextFocusIndex(
        currentIndex,
        focusables.length,
        event.shiftKey,
      );

      if (wrapIndex !== null) {
        event.preventDefault();
        focusables[wrapIndex]?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, containerRef]);
}
