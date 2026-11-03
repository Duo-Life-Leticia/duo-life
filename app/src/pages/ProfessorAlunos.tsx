import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type AlunoResumo } from "../api";
import { dataBr, erroTexto } from "../util";
import ProfessorTopo from "./ProfessorTopo";

const CHIP_PARQ = {
  ok: { classe: "ok", texto: "PAR-Q ok" },
  pendente: { classe: "erro", texto: "Sem PAR-Q" },
  atestado: { classe: "alerta", texto: "Falta atestado" },
};

export default function ProfessorAlunos() {
  const [alunos, setAlunos] = useState<AlunoResumo[] | null>(null);
  const [busca, setBusca] = useState("");
  const [erro, setErro] = useState("");
  useEffect(() => { api.alunos().then(setAlunos).catch((e) => setErro(erroTexto(e))); }, []);

  const termo = busca.trim().toLowerCase();
  const lista = (alunos ?? []).filter((a) => !termo || a.nome_completo.toLowerCase().includes(termo) || a.email.toLowerCase().includes(termo));

  return (
    <main className="pagina">
      <ProfessorTopo />
      <h1>Alunos</h1>
      <input type="search" placeholder="Buscar pelo nome ou e-mail" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar aluno" />
      {erro && <p className="aviso">{erro}</p>}
      {alunos === null ? <p className="sub">Carregando…</p> : lista.length === 0 ? (
        <p className="sub">{alunos.length === 0 ? "Nenhum aluno cadastrado ainda." : "Nenhum aluno com esse nome."}</p>
      ) : (
        <div className="lista">
          {lista.map((a) => (
            <Link className="item clicavel" key={a.id} to={`/professor/aluno/${a.id}`}>
              <div>
                <div className="dia">{a.nome_completo}</div>
                <div className="detalhe">
                  {a.restantes > 0 ? `${a.restantes} ${a.restantes === 1 ? "aula" : "aulas"} · até ${dataBr(a.valido_ate)}` : "Sem aulas no saldo"}
                </div>
              </div>
              <span className={`chip ${CHIP_PARQ[a.parq].classe}`}>{CHIP_PARQ[a.parq].texto}</span>
            </Link>
          ))}
        </div>
      )}
      <p className="sub centro">{alunos ? `${alunos.length} ${alunos.length === 1 ? "aluno" : "alunos"} no total` : ""}</p>
    </main>
  );
}
