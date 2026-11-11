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

export const SEM_CONEXAO = "Não consegui conectar. Confira a internet e tente de novo.";

// "Failed to fetch" e parecidos: o aparelho não conseguiu falar com o servidor.
export function ehErroDeConexao(msg: string): boolean {
  const m = msg.toLowerCase();
  return m.includes("failed to fetch") || m.includes("networkerror") || m.includes("load failed") || m.includes("network request failed") || m === SEM_CONEXAO.toLowerCase();
}

export function erroTexto(e: unknown): string {
  if (!(e instanceof Error)) return "Algo deu errado. Tente de novo.";
  return ehErroDeConexao(e.message) ? SEM_CONEXAO : e.message;
}

export function idade(nascimento: string | null): string {
  if (!nascimento) return "—";
  const [a, m, d] = nascimento.split("-").map(Number);
  const hoje = new Date();
  let anos = hoje.getFullYear() - a;
  if (hoje.getMonth() + 1 < m || (hoje.getMonth() + 1 === m && hoje.getDate() < d)) anos--;
  return `${anos} anos`;
}

// Link do WhatsApp a partir do telefone digitado ("+55 13 99999-0000" -> wa.me/5513999990000).
export function linkWhats(tel: string | null): string | null {
  const n = (tel ?? "").replace(/\D/g, "");
  return n.length >= 10 ? `https://wa.me/${n.startsWith("55") ? n : "55" + n}` : null;
}

export const FORMAS: Record<string, string> = {
  pix: "Pix", credito: "Cartão de crédito", debito: "Cartão de débito", presencial: "Na praia (celular ou maquininha)",
};

// Nome da saudação ("Olá, Fulana!"): o apelido; se não tiver, o primeiro nome. Nunca mostra e-mail.
export function nomeSaudacao(p: { apelido?: string | null; nome_completo?: string } | null | undefined) {
  const n = (p?.apelido?.trim() || p?.nome_completo?.trim().split(/\s+/)[0] || "");
  return n.includes("@") ? "" : n;
}
