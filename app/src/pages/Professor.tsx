import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type AulaProfessor } from "../api";
import { useSessao } from "../App";
import { dataCurta, erroTexto, hora } from "../util";
import ProfessorTopo from "./ProfessorTopo";

// Agenda do professor: aulas da última semana (para a presença) até um mês para frente.
export default function Professor() {
  const { perfil } = useSessao();
  const [aulas, setAulas] = useState<AulaProfessor[] | null>(null);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  const carregar = () => api.agendaProfessor().then(setAulas);
  useEffect(() => { carregar().catch((e) => setMsg({ tipo: "erro", texto: erroTexto(e) })); }, []);

  async function abrir() {
    setMsg(null);
    try {
      const n = await api.gerarAulas();
      setMsg({ tipo: "ok", texto: n > 0 ? `${n} aulas novas abertas (terças e quintas, 8h às 9h).` : "A agenda já está aberta para os próximos 60 dias." });
      await carregar();
    } catch (e) { setMsg({ tipo: "erro", texto: erroTexto(e) }); }
  }

  const hoje = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

  return (
    <main className="pagina">
      <ProfessorTopo />
      <h1>Agenda</h1>
      <p className="sub">Olá, {perfil?.nome_completo.split(" ")[0]}! Toque numa aula para ver os alunos, marcar presença, mudar o limite de vagas ou cancelar.</p>
      {msg && <p className={`aviso ${msg.tipo === "ok" ? "ok" : ""}`} role="status">{msg.texto}</p>}
      {aulas === null ? <p className="sub">Carregando…</p> : aulas.length === 0 ? (
        <p className="aviso info">Nenhuma aula aberta. Toque em "Abrir aulas" para criar a agenda.</p>
      ) : (
        <div className="lista">
          {aulas.map((a) => {
            const passada = a.data < hoje;
            return (
              <Link className={`item clicavel ${a.cancelada ? "apagada" : ""}`} key={a.id} to={`/professor/aula/${a.id}`}>
                <div>
                  <div className="dia">{dataCurta(a.data)}{a.data === hoje ? " · hoje" : ""}</div>
                  <div className="detalhe">
                    {a.cancelada ? `Cancelada: ${a.motivo_cancelamento ?? ""}` :
                      `${hora(a.inicio)} às ${hora(a.fim)} · ${a.limite !== null ? `limite ${a.limite}` : "sem limite"}${passada ? ` · ${a.presentes} ${a.presentes === 1 ? "presente" : "presentes"}` : ""}`}
                  </div>
                </div>
                {!a.cancelada && <span className="selo">{a.marcados} {a.marcados === 1 ? "aluno" : "alunos"}</span>}
              </Link>
            );
          })}
        </div>
      )}
      <button className="botao contorno" onClick={abrir}>Abrir aulas dos próximos 60 dias</button>
    </main>
  );
}
