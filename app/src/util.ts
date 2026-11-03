const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

// "2026-11-05" -> "Quinta, 05/11"
export function dataCurta(iso: string): string {
  const [a, m, d] = iso.split("-").map(Number);
  const dia = new Date(a, m - 1, d).getDay();
  return `${DIAS[dia]}, ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
}

// "2026-11-05" -> "05/11/2026"
export function dataBr(iso: string | null): string {
  if (!iso) return "—";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

// "08:00:00" -> "8h"
export function hora(h: string): string {
  const [hh, mm] = h.split(":");
  return `${Number(hh)}h${mm !== "00" ? mm : ""}`;
}

export function reais(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function erroTexto(e: unknown): string {
  return e instanceof Error ? e.message : "Algo deu errado. Tente de novo.";
}
