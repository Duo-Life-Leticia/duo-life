import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Aviso } from "../api";
import { erroTexto } from "../util";
import ProfessorTopo from "./ProfessorTopo";

function quando(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

// Avisos do professor: aula marcada ou cancelada pelos alunos. Ao abrir, ficam como lidos.
export default function ProfessorAvisos() {
  const [avisos, setAvisos] = useState<Aviso[] | null>(null);
  const [erro, setErro] = useState("");
  useEffect(() => {
    api.avisos().then((a) => { setAvisos(a); if (a.some((x) => !x.lido)) api.marcarAvisosLidos(); }).catch((e) => setErro(erroTexto(e)));
  }, []);

  return (
    <main className="pagina">
      <ProfessorTopo />
      <h1>Avisos</h1>
      <p className="sub">Cada aula marcada ou cancelada pelos alunos aparece aqui.</p>
      {erro && <p className="aviso">{erro}</p>}
      {avisos === null ? <p className="sub">Carregando…</p> : avisos.length === 0 ? <p className="sub">Nenhum aviso por enquanto.</p> : (
        <div className="lista">
          {avisos.map((a) => {
            const conteudo = (
              <div>
                <div className="dia" style={{ fontSize: 16 }}>{!a.lido && <span className="contador" aria-label="novo">novo</span>} {a.titulo}</div>
                <div className="detalhe">{a.texto}</div>
                <div className="detalhe" style={{ fontSize: 13 }}>{quando(a.criado_em)}</div>
              </div>
            );
            return a.link
              ? <Link className="item clicavel" key={a.id} to={a.link}>{conteudo}</Link>
              : <div className="item" key={a.id}>{conteudo}</div>;
          })}
        </div>
      )}
    </main>
  );
}
