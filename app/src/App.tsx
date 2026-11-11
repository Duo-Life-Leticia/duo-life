import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { api, type Perfil, type SituacaoParq } from "./api";
import { SEM_CONEXAO, ehErroDeConexao } from "./util";
import Entrar from "./pages/Entrar";
import Cadastro from "./pages/Cadastro";
import EsqueciSenha from "./pages/EsqueciSenha";
import NovaSenha from "./pages/NovaSenha";
import Parq from "./pages/Parq";
import Inicio from "./pages/Inicio";
import Agendar from "./pages/Agendar";
import Planos from "./pages/Planos";
import Professor from "./pages/Professor";
import ProfessorAula from "./pages/ProfessorAula";
import ProfessorAlunos from "./pages/ProfessorAlunos";
import ProfessorFicha from "./pages/ProfessorFicha";
import ProfessorNovoAluno from "./pages/ProfessorNovoAluno";
import ProfessorAvisos from "./pages/ProfessorAvisos";
import ProfessorGuias from "./pages/ProfessorGuias";
import Comprar from "./pages/Comprar";
import Pagamento from "./pages/Pagamento";
import Contrato from "./pages/Contrato";
import MeuPerfil from "./pages/Perfil";
import NutricaoPersonal from "./pages/NutricaoPersonal";
import QuemSomos from "./pages/QuemSomos";

// Professor pode ver o app como aluno (para conferir e ajudar), com a mesma conta.
type Modo = "professor" | "aluno";
type Sessao = {
  perfil: Perfil | null; parq: SituacaoParq | null; recarregar: () => Promise<void>;
  modo: Modo; trocarModo: (m: Modo) => void;
};
const SessaoCtx = createContext<Sessao>({ perfil: null, parq: null, recarregar: async () => {}, modo: "professor", trocarModo: () => {} });

function modoSalvo(): Modo {
  try { return localStorage.getItem("duolife-modo") === "aluno" ? "aluno" : "professor"; } catch { return "professor"; }
}
export const useSessao = () => useContext(SessaoCtx);

// Tela simples para quando o app não consegue abrir: nunca deixa a tela azul vazia.
export function TelaDeFalha({ texto, aoTentar }: { texto: string; aoTentar: () => void }) {
  return (
    <main className="pagina">
      <img className="logo" src="/logo-horizontal.jpg" alt="Duo Life" />
      <section className="cartao">
        <h1>Ops!</h1>
        <p className="aviso" role="alert">{texto}</p>
        <button className="botao" onClick={aoTentar}>Tentar de novo</button>
      </section>
    </main>
  );
}

export default function App() {
  const [carregando, setCarregando] = useState(true);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [parq, setParq] = useState<SituacaoParq | null>(null);
  const [modo, setModo] = useState<Modo>(modoSalvo);
  const [falha, setFalha] = useState<string | null>(null);
  const [demorou, setDemorou] = useState(false);
  const navegar = useNavigate();
  const trocarModo = useCallback((m: Modo) => {
    setModo(m);
    try { localStorage.setItem("duolife-modo", m); } catch { /* sem armazenamento */ }
    navegar(m === "professor" ? "/professor" : "/", { replace: true });
  }, [navegar]);

  const recarregar = useCallback(async () => {
    try {
      const p = await api.perfil();
      setPerfil(p);
      setParq(p ? await api.situacaoParq() : null);
      setFalha(null);
    } catch (e) {
      // Problema de conexão: mantém a pessoa onde está e mostra o aviso. Outro erro: volta para a entrada.
      if (e instanceof Error && ehErroDeConexao(e.message)) setFalha(SEM_CONEXAO);
      else setPerfil(null);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    recarregar();
    return api.aoMudarSessao(() => { recarregar(); });
  }, [recarregar]);

  // Se a abertura passar de 12 segundos, mostra o aviso em vez de deixar a tela parada.
  useEffect(() => {
    if (!carregando) return;
    const t = setTimeout(() => setDemorou(true), 12000);
    return () => clearTimeout(t);
  }, [carregando]);

  if (falha || (carregando && demorou)) {
    return (
      <TelaDeFalha texto={falha ?? "O app está demorando para abrir. Confira a internet e tente de novo."}
        aoTentar={() => { setDemorou(false); setFalha(null); setCarregando(true); recarregar(); }} />
    );
  }
  if (carregando) return <div className="pagina"><img className="logo" src="/logo-horizontal.jpg" alt="Duo Life" /><p className="sub centro">Abrindo…</p></div>;

  // Quem não entrou vê só as telas de entrada. Professor e aluno têm telas diferentes.
  const verComoAluno = (perfil?.papel === "admin" || Boolean(perfil?.dono)) && modo === "aluno";
  const aluno = perfil?.papel === "aluno" || verComoAluno;
  const admin = perfil?.papel === "admin" || Boolean(perfil?.dono);
  const inicio = !perfil ? "/entrar" : admin && !verComoAluno ? "/professor" : parq?.valido ? "/inicio" : "/par-q";

  return (
    <SessaoCtx.Provider value={{ perfil, parq, recarregar, modo, trocarModo }}>
      {api.demo && <div className="demo">Modo demonstração: os dados são de exemplo e ficam só neste aparelho.</div>}
      {verComoAluno && (
        <div className="faixa-modo">
          Você está vendo o app como aluno.{" "}
          <button className="link" onClick={() => trocarModo("professor")}>Voltar para a tela do professor</button>
        </div>
      )}
      <Routes>
        <Route path="/entrar" element={perfil ? <Navigate to={inicio} replace /> : <Entrar />} />
        <Route path="/cadastro" element={perfil ? <Navigate to={inicio} replace /> : <Cadastro />} />
        <Route path="/esqueci-senha" element={<EsqueciSenha />} />
        <Route path="/nova-senha" element={<NovaSenha />} />
        <Route path="/planos" element={<Planos />} />
        <Route path="/par-q" element={aluno ? <Parq /> : <Navigate to={inicio} replace />} />
        <Route path="/inicio" element={aluno && parq?.valido ? <Inicio /> : <Navigate to={inicio} replace />} />
        <Route path="/agendar" element={aluno && parq?.valido ? <Agendar /> : <Navigate to={inicio} replace />} />
        <Route path="/professor" element={admin ? <Professor /> : <Navigate to={inicio} replace />} />
        <Route path="/professor/aula/:id" element={admin ? <ProfessorAula /> : <Navigate to={inicio} replace />} />
        <Route path="/professor/alunos" element={admin ? <ProfessorAlunos /> : <Navigate to={inicio} replace />} />
        <Route path="/professor/aluno/:id" element={admin ? <ProfessorFicha /> : <Navigate to={inicio} replace />} />
        <Route path="/professor/novo-aluno" element={admin ? <ProfessorNovoAluno /> : <Navigate to={inicio} replace />} />
        <Route path="/professor/guias" element={admin ? <ProfessorGuias /> : <Navigate to={inicio} replace />} />
        <Route path="/professor/avisos" element={admin ? <ProfessorAvisos /> : <Navigate to={inicio} replace />} />
        <Route path="/comprar/:plano" element={aluno && parq?.valido ? <Comprar /> : <Navigate to={inicio} replace />} />
        <Route path="/pagamento/:id" element={aluno ? <Pagamento /> : <Navigate to={inicio} replace />} />
        <Route path="/contrato" element={<Contrato />} />
        <Route path="/perfil" element={aluno && parq?.valido ? <MeuPerfil /> : <Navigate to={inicio} replace />} />
        <Route path="/nutricao-personal" element={<NutricaoPersonal />} />
        <Route path="/quem-somos" element={<QuemSomos />} />
        <Route path="*" element={<Navigate to={inicio} replace />} />
      </Routes>
    </SessaoCtx.Provider>
  );
}
