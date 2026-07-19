import { createContext, useCallback, useContext, useRef, useState, ReactNode } from "react";

interface SaveFeedbackValue {
  notificaSalvato: () => void;
  visibile: boolean;
}

const SaveFeedbackContext = createContext<SaveFeedbackValue | null>(null);

export function SaveFeedbackProvider({ children }: { children: ReactNode }) {
  const [visibile, setVisibile] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notificaSalvato = useCallback(() => {
    setVisibile(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setVisibile(false), 1400);
  }, []);

  return (
    <SaveFeedbackContext.Provider value={{ notificaSalvato, visibile }}>{children}</SaveFeedbackContext.Provider>
  );
}

export function useSaveFeedback(): () => void {
  const ctx = useContext(SaveFeedbackContext);
  if (!ctx) throw new Error("useSaveFeedback deve essere usato dentro SaveFeedbackProvider");
  return ctx.notificaSalvato;
}

export function useSaveFeedbackVisibile(): boolean {
  const ctx = useContext(SaveFeedbackContext);
  if (!ctx) throw new Error("useSaveFeedbackVisibile deve essere usato dentro SaveFeedbackProvider");
  return ctx.visibile;
}
