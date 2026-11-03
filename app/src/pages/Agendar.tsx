import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Aula } from "../api";
import { dataCurta, erroTexto, hora } from "../util";

function vagas(a: Aula): string {
  if (a.limite === null) return "Vagas abertas";
  const livres = a.limite - a.marcados;
  if (livres <= 0) return "Aula cheia";
  return livres === 1 ? "Última vaga!" : livres <= 3 ? `Só restam ${livres} vagas` : `${livres} vagas`;
}

export default function Agendar() {
  const [aulas, setAulas] = useState<Aula[] | null>(null);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  const carregar = () => api.aulasProximas().then(setAulas);
  useEffect(() => { carregar().catch((e) => setMsg({ tipo: "erro", texto: erroTexto(e) })); }, []);

  async function marcar(a: Aula) {
    setMsg(null); setOcupado(a.id);
    try { await api.marcar(a.id); setMsg({ tipo: "ok", texto: `Aula marcada: ${dataCurta(a.data)}, às ${hora(a.inicio)}. Até lá!` }); await carregar(); }
    catch (e) { setMsg({ tipo: "erro", texto: erroTexto(e) }); }
    finally { setOcupado(null); }
  }

  return (
    <main className="pagina">
      <Link className="link voltar" to="/inicio">← Voltar</Link>
      <h1>Agendar aula</h1>
      <p className="sub">Terças e quintas, das 8h às 9h, na praia. Você pode ter até 2 aulas marcadas ao mesmo tempo.</p>
      {msg && <p className={`aviso ${msg.tipo === "ok" ? "ok" : ""}`} role="status">{msg.texto}</p>}
      {aulas === null ? (
        <p className="sub">Carregando…</p>
      ) : aulas.length === 0 ? (
        <p className="aviso info">Ainda não há aulas abertas. Em breve o professor abre a agenda.</p>
      ) : (
        <div className="lista">
          {aulas.map((a) => {
            const cheia = a.limite !== null && a.marcados >= a.limite;
            const v = vagas(a);
            return (
              <div className="item" key={a.id}>
                <div>
                  <div className="dia">{dataCurta(a.data)}</div>
                  <div className={`detalhe ${a.limite !== null && a.limite - a.marcados <= 3 ? "alerta" : ""}`}>{hora(a.inicio)} às {hora(a.fim)} · {v}</div>
                </div>
                {a.minha_marcacao ? (
                  <span className="selo">Marcada ✓</span>
                ) : (
                  <button className="botao pequeno" disabled={cheia || ocupado === a.id} onClick={() => marcar(a)}>
                    {cheia ? "Cheia" : ocupado === a.id ? "…" : "Marcar"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
