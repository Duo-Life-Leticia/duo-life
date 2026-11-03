import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Aula, type Saldo } from "../api";
import { useSessao } from "../App";
import { dataBr, dataCurta, erroTexto, hora } from "../util";

export default function Inicio() {
  const { perfil, parq } = useSessao();
  const [saldo, setSaldo] = useState<Saldo | null>(null);
  const [minhas, setMinhas] = useState<Aula[]>([]);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  async function carregar() {
    const [s, aulas] = await Promise.all([api.saldo(), api.aulasProximas()]);
    setSaldo(s);
    setMinhas(aulas.filter((a) => a.minha_marcacao));
  }
  useEffect(() => { carregar().catch((e) => setMsg({ tipo: "erro", texto: erroTexto(e) })); }, []);

  async function cancelar(a: Aula) {
    if (!confirm(`Cancelar a aula de ${dataCurta(a.data)}, às ${hora(a.inicio)}?`)) return;
    setMsg(null);
    try { await api.cancelar(a.minha_marcacao!); setMsg({ tipo: "ok", texto: "Aula cancelada. Ela voltou para o seu saldo." }); await carregar(); }
    catch (e) { setMsg({ tipo: "erro", texto: erroTexto(e) }); }
  }

  const primeiroNome = perfil?.nome_completo.split(" ")[0] ?? "";

  return (
    <main className="pagina">
      <div className="topo">
        <img className="logo pequena" src="/logo-horizontal.jpg" alt="Duo Life" />
        <button className="link" onClick={() => api.sair()}>Sair</button>
      </div>
      <h1>Olá, {primeiroNome}!</h1>

      {saldo && (
        <section className="balao" aria-label="Seu saldo de aulas">
          {saldo.aulas_total > 0 ? (
            <>
              <span className="rotulo">Faltam</span>
              <span className="numero">{saldo.restantes}</span>
              <span className="rotulo">{saldo.restantes === 1 ? "aula" : "aulas"}</span>
              <p className="sub">Seu plano de {saldo.aulas_total} aulas: você usou {saldo.usadas}, faltam {saldo.restantes}.</p>
              <p className="sub">Válido até {dataBr(saldo.valido_ate)}</p>
            </>
          ) : (
            <>
              <span className="rotulo">Você ainda não tem aulas</span>
              <p className="sub">Escolha um plano para começar a treinar com a gente.</p>
            </>
          )}
        </section>
      )}

      {parq?.temSim && !parq.atestado && (
        <p className="aviso info">Falta entregar o atestado médico ao professor. Depois disso, o agendamento fica liberado.</p>
      )}
      {msg && <p className={`aviso ${msg.tipo === "ok" ? "ok" : ""}`} role="status">{msg.texto}</p>}

      <Link className="botao grande" to="/agendar">Agendar aula</Link>
      <Link className="botao grande contorno" to="/planos">Comprar aulas</Link>

      <section className="cartao">
        <h2>Minhas próximas aulas</h2>
        {minhas.length === 0 ? (
          <p className="sub">Nenhuma aula marcada.</p>
        ) : (
          <div className="lista">
            {minhas.map((a) => (
              <div className="item" key={a.id}>
                <div>
                  <div className="dia">{dataCurta(a.data)}</div>
                  <div className="detalhe">{hora(a.inicio)} às {hora(a.fim)} · na praia</div>
                </div>
                <button className="botao pequeno contorno" onClick={() => cancelar(a)}>Cancelar</button>
              </div>
            ))}
          </div>
        )}
        <p className="sub">Dá para cancelar até 6 horas antes. Depois disso, a aula conta como feita.</p>
      </section>
    </main>
  );
}
