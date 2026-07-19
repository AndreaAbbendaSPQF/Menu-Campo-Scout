import { useEffect, useState } from "react";

interface Props {
  valore: number;
  onCommit: (n: number) => void;
  className?: string;
}

export default function EditableNumberCell({ valore, onCommit, className }: Props) {
  const [testo, setTesto] = useState(String(valore));

  useEffect(() => {
    setTesto(String(valore));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valore]);

  function commit() {
    const n = Number(testo.replace(",", "."));
    if (Number.isNaN(n)) {
      setTesto(String(valore));
      return;
    }
    if (n !== valore) onCommit(n);
  }

  return (
    <input
      className={className ?? "qty-input"}
      value={testo}
      onChange={(e) => setTesto(e.target.value)}
      onBlur={commit}
    />
  );
}
