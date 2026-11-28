import type { ArtistaConObras } from "@/lib/data";

function normalizeTechnique(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

const paintingMedia = ["oleo", "acrilico", "acuarela", "tempera", "gouache", "pintura"];

export function disciplinaDe(artista: ArtistaConObras): string {
  if (artista.disciplina) return artista.disciplina;
  if (artista.obras.length === 0) return "Disciplina pendiente";
  const allPaint = artista.obras.every((obra) => {
    const tecnica = normalizeTechnique(obra.tecnica);
    return paintingMedia.some((media) => tecnica.includes(media));
  });
  return allPaint ? "Pintura" : "Disciplina pendiente";
}
