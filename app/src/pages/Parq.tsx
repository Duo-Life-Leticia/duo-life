import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useSessao } from "../App";
import { erroTexto } from "../util";
import { PERGUNTAS_PARQ as PERGUNTAS } from "../parq";


export default function Parq() {
  const [respostas, setRespostas] = useState<Record<string, boolean>>({});
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const { recarregar } = useSessao();
  const navegar = useNavigate();
  const completo = PERGUNTAS.every((_, i) => String(i + 1) in respostas);

  async function enviar() {
    setErro(""); setEnviando(true);
    try { await api.responderParq(respostas); await recarregar(); navegar("/inicio", { replace: true }); }
    catch (err) { setErro(erroTexto(err)); setEnviando(false); }
  }

  return (
    <main className="pagina">
      <img className="logo pequena" src="/logo-horizontal.jpg" alt="Duo Life" />
      <h1>Questionário de saúde (PAR-Q)</h1>
      <p className="sub">Antes de treinar, responda estas 7 perguntas. As respostas ficam guardadas na sua ficha e valem por 6 meses.</p>
      <section className="cartao">
        {PERGUNTAS.map((p, i) => {
          const k = String(i + 1);
          return (
            <div className="parq-pergunta" key={k}>
              <p><b>{i + 1}.</b> {p}</p>
              <div className="sim-nao" role="group" aria-label={`Resposta da pergunta ${i + 1}`}>
                <button type="button" aria-pressed={respostas[k] === true} onClick={() => setRespostas({ ...respostas, [k]: true })}>Sim</button>
                <button type="button" aria-pressed={respostas[k] === false} onClick={() => setRespostas({ ...respostas, [k]: false })}>Não</button>
              </div>
            </div>
          );
        })}
      </section>
      {Object.values(respostas).some(Boolean) && (
        <p className="aviso info">Você respondeu "sim" em alguma pergunta. Para poder marcar aulas, entregue ao professor um atestado médico liberando a atividade física.</p>
      )}
      {erro && <p className="aviso" role="alert">{erro}</p>}
      <button className="botao" disabled={!completo || enviando} onClick={enviar}>
        {completo ? (enviando ? "Salvando…" : "Enviar respostas") : "Responda todas as perguntas"}
      </button>
    </main>
  );
}
