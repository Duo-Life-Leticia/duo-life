import { Link } from "react-router-dom";
import { CONTATOS, linkWhatsCom } from "../config";

// 3.4 Planos individuais: sem valor no app; o botão leva ao WhatsApp para consultar as opções.
const PLANOS = [
  { nome: "Sereia", tipo: "Nutrição · com a Letícia", chamada: "Faça seu plano alimentar individualizado.", whats: CONTATOS.whatsLeticia,
    itens: [] as string[] },
  { nome: "Siri", tipo: "Personal · com o Diogo", chamada: "Faça seu treino individualizado.", whats: CONTATOS.whatsDiogo, itens: [] as string[] },
  { nome: "Duplinha", tipo: "Treino + nutrição · mensal", chamada: "Transformação completa!", whats: CONTATOS.whatsLeticia || CONTATOS.whatsDiogo,
    itens: ["Personal 2 vezes por semana", "Plano alimentar completo", "Avaliação física", "Bônus: 5 aulas do funcional"] },
];

export default function NutricaoPersonal() {
  return (
    <main className="pagina">
      <Link className="link voltar" to="/inicio">← Início</Link>
      <h1>Nutrição e Personal</h1>
      <p className="sub">Atendimento individual com a Letícia e o Diogo. Toque em "Consultar opções" para falar com a gente.</p>
      {PLANOS.map((p) => {
        const link = linkWhatsCom(p.whats, `Olá! Vim pelo app da Duo Life e quero saber mais sobre o Plano ${p.nome}.`);
        return (
          <section className={`plano ${p.nome === "Duplinha" ? "destaque" : ""}`} key={p.nome}>
            <span className="sub">{p.tipo}</span>
            <h2>Plano {p.nome}</h2>
            <p>{p.chamada}</p>
            {p.itens.length > 0 && <ul style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 4 }}>{p.itens.map((i) => <li key={i}>{i}</li>)}</ul>}
            {link
              ? <a className="botao" href={link} target="_blank" rel="noreferrer">Consultar opções</a>
              : <button className="botao" disabled>Consultar opções (em breve)</button>}
          </section>
        );
      })}
      <p className="sub centro">Os valores dos planos individuais são passados pelo WhatsApp.</p>
    </main>
  );
}
