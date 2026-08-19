import { useEffect, useRef } from "react";

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

function focusable(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement,
  );
}

/**
 * Bank-grade modal accessibility: Esc closes, Tab is trapped inside the
 * container, and focus returns to the opener element on close.
 */
export function useModalA11y<T extends HTMLElement = HTMLDivElement>(
  open: boolean,
  onClose: () => void,
) {
  const containerRef = useRef<T | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    openerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose?.();
        return;
      }
      if (e.key !== "Tab") return;
      const nodes = focusable(containerRef.current);
      if (!nodes.length) return;
      const first = nodes[0]!;
      const last = nodes[nodes.length - 1]!;
      const active = document.activeElement as HTMLElement | null;
      if (!containerRef.current?.contains(active ?? null)) {
        e.preventDefault();
        first.focus();
        return;
      }
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      const opener = openerRef.current;
      openerRef.current = null;
      if (opener?.isConnected) {
        requestAnimationFrame(() => opener.focus?.());
      }
    };
  }, [open, onClose]);

  return containerRef;
}
