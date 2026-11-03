import { NavLink } from "react-router-dom";
import { api } from "../api";

// Cabeçalho comum das telas do professor, com as três abas.
export default function ProfessorTopo() {
  const aba = ({ isActive }: { isActive: boolean }) => (isActive ? "ativa" : "");
  return (
    <>
      <div className="topo">
        <img className="logo pequena" src="/logo-horizontal.jpg" alt="Duo Life" />
        <button className="link" onClick={() => api.sair()}>Sair</button>
      </div>
      <nav className="abas" aria-label="Tela do professor">
        <NavLink to="/professor" end className={aba}>Agenda</NavLink>
        <NavLink to="/professor/alunos" className={aba}>Alunos</NavLink>
        <NavLink to="/professor/novo-aluno" className={aba}>Novo aluno</NavLink>
      </nav>
    </>
  );
}
