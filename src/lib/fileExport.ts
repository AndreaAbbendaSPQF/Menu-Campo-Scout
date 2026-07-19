import { open, save } from "@tauri-apps/plugin-dialog";
import { writeFile, writeTextFile } from "@tauri-apps/plugin-fs";

export async function salvaFileBinario(
  nomeSuggerito: string,
  estensione: string,
  filtroNome: string,
  dati: Uint8Array
): Promise<boolean> {
  const percorso = await save({
    defaultPath: nomeSuggerito,
    filters: [{ name: filtroNome, extensions: [estensione] }],
  });
  if (!percorso) return false;
  await writeFile(percorso, dati);
  return true;
}

export async function salvaFileTesto(
  nomeSuggerito: string,
  estensione: string,
  filtroNome: string,
  testo: string
): Promise<boolean> {
  const percorso = await save({
    defaultPath: nomeSuggerito,
    filters: [{ name: filtroNome, extensions: [estensione] }],
  });
  if (!percorso) return false;
  await writeTextFile(percorso, testo);
  return true;
}

export async function scegliFileDaAprire(estensione: string, filtroNome: string): Promise<string | null> {
  const percorso = await open({
    multiple: false,
    filters: [{ name: filtroNome, extensions: [estensione] }],
  });
  return typeof percorso === "string" ? percorso : null;
}
