import { useState } from "react";
import { Link } from "react-router-dom";
import { api, type ArquivoGuia } from "../api";
import { erroTexto } from "../util";
import ProfessorTopo from "./ProfessorTopo";

const GUIAS: { arquivo: ArquivoGuia; nome: string; quem: string }[] = [
  { arquivo: "guia-duo-life.pdf", nome: "Guia DUO LIFE", quem: "Liberado para todo aluno que comprou um plano." },
  { arquivo: "nutricao-tubarao.pdf", nome: "PDF extra de nutrição", quem: "Liberado só para quem comprou o Plano Tubarão." },
];

// O professor envia os PDFs. Os alunos baixam pela tela inicial, conforme o plano comprado.
export default function ProfessorGuias() {
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [enviando, setEnviando] = useState<string | null>(null);

  async function enviar(arquivo: ArquivoGuia, nome: string, pdf?: File) {
    if (!pdf) return;
    if (pdf.type !== "application/pdf") return setMsg({ tipo: "erro", texto: "Escolha um arquivo em PDF." });
    setMsg(null); setEnviando(arquivo);
    try { await api.enviarGuia(arquivo, pdf); setMsg({ tipo: "ok", texto: `${nome} enviado. Os alunos já podem baixar.` }); }
    catch (e) { setMsg({ tipo: "erro", texto: erroTexto(e) }); }
    finally { setEnviando(null); }
  }

  async function ver(arquivo: ArquivoGuia) {
    setMsg(null);
    try {
      const link = await api.abrirGuia(arquivo);
      if (link) window.open(link, "_blank"); else setMsg({ tipo: "erro", texto: "Este PDF ainda não foi enviado." });
    } catch (e) { setMsg({ tipo: "erro", texto: erroTexto(e) }); }
  }

  return (
    <main className="pagina">
      <ProfessorTopo />
      <Link className="link voltar" to="/professor">← Agenda</Link>
      <h1>Guias em PDF</h1>
      <p className="sub">Envie o PDF de cada guia. Para trocar por uma versão nova, é só enviar de novo.</p>
      {msg && <p className={`aviso ${msg.tipo === "ok" ? "ok" : ""}`} role="status">{msg.texto}</p>}
      {GUIAS.map((g) => (
        <section className="cartao" key={g.arquivo}>
          <h2>{g.nome}</h2>
          <p className="sub">{g.quem}</p>
          <label className="botao" style={{ cursor: "pointer" }}>
            {enviando === g.arquivo ? "Enviando…" : "Escolher PDF e enviar"}
            <input type="file" accept="application/pdf" style={{ display: "none" }}
              onChange={(e) => { enviar(g.arquivo, g.nome, e.target.files?.[0]); e.target.value = ""; }} />
          </label>
          <button className="link" onClick={() => ver(g.arquivo)}>Ver o PDF atual</button>
        </section>
      ))}
    </main>
  );
}
