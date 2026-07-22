import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { listCampi } from "../data/campi";
import { Campo } from "../types/domain";

const STORAGE_KEY = "cambusascout.campoAttivoId";

interface CampoContextValue {
  campi: Campo[];
  campoAttivo: Campo | null;
  campoAttivoId: number | null;
  setCampoAttivoId: (id: number | null) => void;
  ricaricaCampi: () => Promise<void>;
  caricato: boolean;
}

const CampoContext = createContext<CampoContextValue | null>(null);

export function CampoProvider({ children }: { children: ReactNode }) {
  const [campi, setCampi] = useState<Campo[]>([]);
  const [campoAttivoId, setCampoAttivoIdState] = useState<number | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? Number(stored) : null;
  });
  const [caricato, setCaricato] = useState(false);

  async function ricaricaCampi() {
    try {
      const lista = await listCampi();
      setCampi(lista);
      setCampoAttivoIdState((current) => {
        if (current !== null && lista.some((c) => c.id === current)) return current;
        return lista[0]?.id ?? null;
      });
    } catch (e) {
      console.error("Caricamento campi fallito", e);
    } finally {
      setCaricato(true);
    }
  }

  useEffect(() => {
    ricaricaCampi();
  }, []);

  function setCampoAttivoId(id: number | null) {
    setCampoAttivoIdState(id);
    if (id === null) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, String(id));
  }

  const campoAttivo = campi.find((c) => c.id === campoAttivoId) ?? null;

  return (
    <CampoContext.Provider value={{ campi, campoAttivo, campoAttivoId, setCampoAttivoId, ricaricaCampi, caricato }}>
      {children}
    </CampoContext.Provider>
  );
}

export function useCampo(): CampoContextValue {
  const ctx = useContext(CampoContext);
  if (!ctx) throw new Error("useCampo deve essere usato dentro CampoProvider");
  return ctx;
}
