import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, type AlunoNaAula, type AulaProfessor } from "../api";
import { dataCurta, erroTexto, hora, linkWhats } from "../util";
import ProfessorTopo from "./ProfessorTopo";

// Uma aula: lista de alunos, presença, limite de vagas e cancelamento (feriado ou chuva).
export default function ProfessorAula() {
  const { id = "" } = useParams();
  const [aula, setAula] = useState<AulaProfessor | null>(null);
  const [alunos, setAlunos] = useState<AlunoNaAula[]>([]);
  const [limite, setLimite] = useState("");
  const [motivo, setMotivo] = useState("Chuva");
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  async function carregar() {
    const [agenda, lista] = await Promise.all([api.agendaProfessor(), api.alunosDaAula(id)]);
    const a = agenda.find((x) => x.id === id) ?? null;
    setAula(a); setAlunos(lista); setLimite(a?.limite ? String(a.limite) : "");
  }
  useEffect(() => { carregar().catch((e) => setMsg({ tipo: "erro", texto: erroTexto(e) })); }, [id]);

  async function acao(fn: () => Promise<void>, ok: string) {
    setMsg(null);
    try { await fn(); setMsg({ tipo: "ok", texto: ok }); await carregar(); } catch (e) { setMsg({ tipo: "erro", texto: erroTexto(e) }); }
  }

  function presenca(g: AlunoNaAula, status: "presente" | "falta") {
    const novo = g.status === status ? "marcado" : status;
    acao(() => api.marcarPresenca(g.agendamento_id, novo), novo === "presente" ? `${g.nome_completo}: presente.` : novo === "falta" ? `${g.nome_completo}: faltou.` : "Presença desmarcada.");
  }

  function salvarLimite() {
    const n = limite.trim() === "" ? null : Number(limite);
    if (n !== null && (!Number.isInteger(n) || n < 1)) return setMsg({ tipo: "erro", texto: "O limite precisa ser um número a partir de 1, ou vazio para sem limite." });
    acao(() => api.definirLimite(id, n), n === null ? "Aula sem limite de vagas." : `Limite de ${n} vagas salvo.`);
  }

  function cancelar() {
    if (!confirm(`Cancelar a aula de ${aula ? dataCurta(aula.data) : ""} (${motivo})? As aulas marcadas voltam para o saldo dos alunos.`)) return;
    acao(() => api.cancelarAula(id, motivo), "Aula cancelada. As aulas voltaram para o saldo dos alunos.");
  }

  return (
    <main className="pagina">
      <ProfessorTopo />
      <Link className="link voltar" to="/professor">← Agenda</Link>
      {!aula ? <p className="sub">Carregando…</p> : (
        <>
          <h1>{dataCurta(aula.data)}</h1>
          <p className="sub">{hora(aula.inicio)} às {hora(aula.fim)} · {aula.marcados} {aula.marcados === 1 ? "marcado" : "marcados"} · {aula.presentes} {aula.presentes === 1 ? "presente" : "presentes"}</p>
          {aula.cancelada && <p className="aviso info">Aula cancelada: {aula.motivo_cancelamento}</p>}
          {msg && <p className={`aviso ${msg.tipo === "ok" ? "ok" : ""}`} role="status">{msg.texto}</p>}

          <section className="cartao">
            <h2>Alunos e presença</h2>
            {alunos.length === 0 ? <p className="sub">Nenhum aluno marcado nesta aula.</p> : (
              <div className="lista">
                {alunos.map((g) => {
                  const whats = linkWhats(g.telefone);
                  return (
                    <div className="item vertical" key={g.agendamento_id}>
                      <div>
                        <Link className="dia" style={{ color: "inherit" }} to={`/professor/aluno/${g.aluno_id}`}>{g.nome_completo}</Link>
                        <div className="detalhe">{whats ? <a className="link" href={whats} target="_blank" rel="noreferrer">WhatsApp</a> : "sem telefone"}</div>
                      </div>
                      <div className="presenca" role="group" aria-label={`Presença de ${g.nome_completo}`}>
                        <button className="sim" aria-pressed={g.status === "presente"} onClick={() => presenca(g, "presente")}>Presente</button>
                        <button className="nao" aria-pressed={g.status === "falta"} onClick={() => presenca(g, "falta")}>Faltou</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {!aula.cancelada && (
            <>
              <section className="cartao">
                <h2>Limite de vagas</h2>
                <p className="sub">Nos 3 primeiros meses as aulas ficam sem limite. Deixe vazio para "sem limite".</p>
                <div className="linha-acoes">
                  <input type="number" min={1} inputMode="numeric" placeholder="Sem limite" value={limite} onChange={(e) => setLimite(e.target.value)} />
                  <button className="botao" onClick={salvarLimite}>Salvar limite</button>
                </div>
              </section>
              <section className="cartao">
                <h2>Cancelar esta aula</h2>
                <p className="sub">Feriado ou chuva: as aulas marcadas voltam para o saldo dos alunos.</p>
                <label>Motivo
                  <select value={motivo} onChange={(e) => setMotivo(e.target.value)}>
                    <option>Chuva</option>
                    <option>Feriado</option>
                    <option>Outro motivo</option>
                  </select>
                </label>
                <button className="botao contorno" onClick={cancelar}>Cancelar aula</button>
              </section>
            </>
          )}
        </>
      )}
    </main>
  );
}
