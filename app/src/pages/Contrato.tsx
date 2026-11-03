import { useNavigate } from "react-router-dom";
import { CONTRATO, CONTRATO_VERSAO } from "../contrato";

// O contrato fica só no app. O aluno lê aqui e aceita na hora da compra.
export default function Contrato() {
  const navegar = useNavigate();
  return (
    <main className="pagina">
      <button className="link voltar" onClick={() => navegar(-1)}>← Voltar</button>
      <h1>Contrato</h1>
      <p className="sub">Aulas de treinamento funcional · Duo Life · versão {CONTRATO_VERSAO.split("-")[0].slice(1)}</p>
      <section className="cartao" style={{ gap: 18 }}>
        {CONTRATO.map((s) => (
          <div key={s.titulo} style={{ display: "grid", gap: 8 }}>
            <h2 style={{ fontSize: 17 }}>{s.titulo}</h2>
            {s.paragrafos.map((p, i) => <p key={i} style={{ fontSize: 15 }}>{p}</p>)}
          </div>
        ))}
      </section>
      <button className="botao" onClick={() => navegar(-1)}>Voltar</button>
    </main>
  );
}
