import { useEffect, useLayoutEffect, useRef, useState, ReactNode, RefObject } from "react";
import { createPortal } from "react-dom";

interface Props {
  aperto: boolean;
  onChiudi: () => void;
  ancoraRef: RefObject<HTMLElement | null>;
  className?: string;
  children: ReactNode;
}

export default function Popover({ aperto, onChiudi, ancoraRef, className, children }: Props) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [posizione, setPosizione] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (aperto && ancoraRef.current) {
      const rect = ancoraRef.current.getBoundingClientRect();
      setPosizione({ top: rect.bottom + 4, left: rect.left });
    } else {
      setPosizione(null);
    }
  }, [aperto, ancoraRef]);

  useEffect(() => {
    if (!aperto) return;
    function onMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      const dentroPopover = popoverRef.current?.contains(target);
      const dentroAncora = ancoraRef.current?.contains(target);
      if (!dentroPopover && !dentroAncora) onChiudi();
    }
    function onChiudiSemplice() {
      onChiudi();
    }
    document.addEventListener("mousedown", onMouseDown);
    window.addEventListener("scroll", onChiudiSemplice, true);
    window.addEventListener("resize", onChiudiSemplice);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("scroll", onChiudiSemplice, true);
      window.removeEventListener("resize", onChiudiSemplice);
    };
  }, [aperto, onChiudi, ancoraRef]);

  if (!aperto || !posizione) return null;

  return createPortal(
    <div
      ref={popoverRef}
      className={"popover-portal" + (className ? " " + className : "")}
      style={{ position: "fixed", top: posizione.top, left: posizione.left }}
    >
      {children}
    </div>,
    document.body
  );
}
