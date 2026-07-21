import { useEffect, useLayoutEffect, useRef, useState, ReactNode, RefObject } from "react";
import { createPortal } from "react-dom";

interface Props {
  aperto: boolean;
  onChiudi: () => void;
  ancoraRef: RefObject<HTMLElement | null>;
  className?: string;
  children: ReactNode;
}

const MARGINE = 8;

interface Stile {
  top: number;
  left: number;
  maxHeight: number;
}

export default function Popover({ aperto, onChiudi, ancoraRef, className, children }: Props) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const scrollProgrammaticoRef = useRef(false);
  const [stile, setStile] = useState<Stile | null>(null);

  function posizionaEAssicuraSpazio() {
    const ancora = ancoraRef.current;
    if (!ancora) return;
    let rectAncora = ancora.getBoundingClientRect();
    const altezzaPopover = popoverRef.current?.getBoundingClientRect().height ?? 0;
    let spazioSotto = window.innerHeight - rectAncora.bottom - MARGINE;
    let spazioSopra = rectAncora.top - MARGINE;

    if (altezzaPopover > 0 && altezzaPopover > spazioSotto && altezzaPopover > spazioSopra) {
      scrollProgrammaticoRef.current = true;
      ancora.scrollIntoView({ block: "center", behavior: "auto" });
      requestAnimationFrame(() => {
        scrollProgrammaticoRef.current = false;
      });
      rectAncora = ancora.getBoundingClientRect();
      spazioSotto = window.innerHeight - rectAncora.bottom - MARGINE;
      spazioSopra = rectAncora.top - MARGINE;
    }

    let top: number;
    let maxHeight: number;
    if (altezzaPopover <= spazioSotto || spazioSotto >= spazioSopra) {
      top = rectAncora.bottom + 4;
      maxHeight = Math.max(120, spazioSotto);
    } else {
      maxHeight = Math.max(120, spazioSopra);
      top = Math.max(MARGINE, rectAncora.top - Math.min(altezzaPopover, maxHeight) - 4);
    }

    let left = rectAncora.left;
    const larghezzaPopover = popoverRef.current?.getBoundingClientRect().width ?? 0;
    if (left + larghezzaPopover > window.innerWidth - MARGINE) {
      left = Math.max(MARGINE, window.innerWidth - larghezzaPopover - MARGINE);
    }

    setStile({ top, left, maxHeight });
  }

  useLayoutEffect(() => {
    if (!aperto || !ancoraRef.current) {
      setStile(null);
      return;
    }
    const rectAncora = ancoraRef.current.getBoundingClientRect();
    setStile({
      top: rectAncora.bottom + 4,
      left: rectAncora.left,
      maxHeight: Math.max(120, window.innerHeight - rectAncora.bottom - MARGINE),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aperto, ancoraRef]);

  useEffect(() => {
    if (!aperto || !popoverRef.current) return;
    const observer = new ResizeObserver(() => posizionaEAssicuraSpazio());
    observer.observe(popoverRef.current);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aperto]);

  useEffect(() => {
    if (!aperto) return;
    function onMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      const dentroPopover = popoverRef.current?.contains(target);
      const dentroAncora = ancoraRef.current?.contains(target);
      if (!dentroPopover && !dentroAncora) onChiudi();
    }
    function onScroll(e: Event) {
      if (scrollProgrammaticoRef.current) return;
      const target = e.target;
      if (target instanceof Node && popoverRef.current?.contains(target)) return;
      onChiudi();
    }
    function onResize() {
      onChiudi();
    }
    document.addEventListener("mousedown", onMouseDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [aperto, onChiudi, ancoraRef]);

  if (!aperto || !stile) return null;

  return createPortal(
    <div
      ref={popoverRef}
      className={"popover-portal" + (className ? " " + className : "")}
      style={{ position: "fixed", top: stile.top, left: stile.left, maxHeight: stile.maxHeight, overflowY: "auto" }}
    >
      {children}
    </div>,
    document.body
  );
}
