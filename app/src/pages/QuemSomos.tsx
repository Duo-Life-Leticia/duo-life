import { useNavigate } from "react-router-dom";
import { CONTATOS, linkWhatsCom } from "../config";

// 3.5 Quem somos: duas linhas sobre a Duo Life, o slogan, Instagram e WhatsApp.
export default function QuemSomos() {
  const navegar = useNavigate();
  const whats = linkWhatsCom(CONTATOS.whatsDiogo || CONTATOS.whatsLeticia, "Olá! Vim pelo app da Duo Life.");
  const insta = CONTATOS.instagram ? `https://instagram.com/${CONTATOS.instagram}` : null;
  return (
    <main className="pagina">
      <button className="link voltar" onClick={() => navegar(-1)}>← Voltar</button>
      <img className="logo" src="/logo-horizontal.jpg" alt="Duo Life" />
      <p className="slogan" style={{ fontSize: 20 }}>Dois pilares. Um resultado.</p>
      <section className="cartao">
        <h1>Quem somos</h1>
        <p>A Duo Life une nutrição e movimento. A Letícia, nutricionista, e o Diogo, personal trainer, levam o treino funcional para a praia de Santos.</p>
        <p className="sub">Treino ao ar livre, em grupo, com acompanhamento de perto, para todas as idades.</p>
      </section>
      <div className="linha-acoes">
        {insta ? <a className="botao contorno" href={insta} target="_blank" rel="noreferrer">Instagram</a> : <button className="botao contorno" disabled>Instagram (em breve)</button>}
        {whats ? <a className="botao contorno" href={whats} target="_blank" rel="noreferrer">WhatsApp</a> : <button className="botao contorno" disabled>WhatsApp (em breve)</button>}
      </div>
    </main>
  );
}
