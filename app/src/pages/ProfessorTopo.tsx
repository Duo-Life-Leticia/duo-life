import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { api } from "../api";
import { useSessao } from "../App";

// Cabeçalho comum das telas do professor, com as abas. "Avisos" mostra quantos ainda não foram lidos.
export default function ProfessorTopo() {
  const [novos, setNovos] = useState(0);
  const { trocarModo } = useSessao();
  const { pathname } = useLocation();
  useEffect(() => {
    const ver = () => api.avisos().then((a) => setNovos(a.filter((x) => !x.lido).length)).catch(() => {});
    ver();
    const t = setInterval(ver, 30000);
    return () => clearInterval(t);
  }, [pathname]);

  const aba = ({ isActive }: { isActive: boolean }) => (isActive ? "ativa" : "");
  return (
    <>
      <div className="topo">
        <img className="logo pequena" src="/logo-horizontal.jpg" alt="Duo Life" />
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <button className="link" onClick={() => trocarModo("aluno")}>Ver como aluno</button>
          <button className="link" onClick={() => api.sair()}>Sair</button>
        </div>
      </div>
      <nav className="abas" aria-label="Tela do professor">
        <NavLink to="/professor" end className={aba}>Agenda</NavLink>
        <NavLink to="/professor/alunos" className={aba}>Alunos</NavLink>
        <NavLink to="/professor/novo-aluno" className={aba}>Novo aluno</NavLink>
        <NavLink to="/professor/avisos" className={aba}>
          Avisos{novos > 0 && pathname !== "/professor/avisos" && <span className="contador">{novos}</span>}
        </NavLink>
      </nav>
    </>
  );
}
