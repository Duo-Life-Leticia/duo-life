// Contatos da Duo Life usados no app. Preencher quando a Letícia e o Diogo passarem os dados.
// WhatsApp: só números, com 55 e DDD (ex.: "5513999990000"). Instagram: só o nome, sem @.
export const CONTATOS = {
  whatsLeticia: "", // Sereia · nutrição
  whatsDiogo: "", // Siri · personal (e dúvidas sobre as aulas)
  instagram: "",
};

export function linkWhatsCom(numero: string, mensagem: string): string | null {
  return numero ? `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}` : null;
}
