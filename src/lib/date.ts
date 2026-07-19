function formatoData(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function enumerateDates(dataInizio: string, dataFine: string): string[] {
  const dates: string[] = [];
  const cur = new Date(dataInizio + "T00:00:00");
  const end = new Date(dataFine + "T00:00:00");
  while (cur <= end) {
    dates.push(formatoData(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

const GIORNI_SETTIMANA = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];

export function giornoSettimana(data: string): string {
  const d = new Date(data + "T00:00:00");
  return GIORNI_SETTIMANA[d.getDay()];
}

export function formattaData(data: string): string {
  const d = new Date(data + "T00:00:00");
  return d.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" });
}
