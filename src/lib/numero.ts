export function formattaQuantita(n: number): string {
  return n.toLocaleString("it-IT", { maximumFractionDigits: 3 });
}
