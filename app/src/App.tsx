import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { api, type Perfil, type SituacaoParq } from "./api";
import Entrar from "./pages/Entrar";
import Cadastro from "./pages/Cadastro";
import EsqueciSenha from "./pages/EsqueciSenha";
import NovaSenha from "./pages/NovaSenha";
import Parq from "./pages/Parq";
import Inicio from "./pages/Inicio";
import Agendar from "./pages/Agendar";
import Planos from "./pages/Planos";
import Professor from "./pages/Professor";

type Sessao = { perfil: Perfil | null; parq: SituacaoParq | null; recarregar: () => Promise<void> };
const SessaoCtx = createContext<Sessao>({ perfil: null, parq: null, recarregar: async () => {} });
export const useSessao = () => useContext(SessaoCtx);

export default function App() {
  const [carregando, setCarregando] = useState(true);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [parq, setParq] = useState<SituacaoParq | null>(null);

  const recarregar = useCallback(async () => {
    try {
      const p = await api.perfil();
      setPerfil(p);
      setParq(p && p.papel === "aluno" ? await api.situacaoParq() : null);
    } catch {
      setPerfil(null);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    recarregar();
    return api.aoMudarSessao(() => { recarregar(); });
  }, [recarregar]);

  if (carregando) return <div className="pagina"><img className="logo" src="/logo-horizontal.jpg" alt="Duo Life" /></div>;

  // Quem não entrou vê só as telas de entrada. Professor e aluno têm telas diferentes.
  const inicio = !perfil ? "/entrar" : perfil.papel === "admin" ? "/professor" : parq?.valido ? "/inicio" : "/par-q";
  const aluno = perfil?.papel === "aluno";

  return (
    <SessaoCtx.Provider value={{ perfil, parq, recarregar }}>
      {api.demo && <div className="demo">Modo demonstração: os dados são de exemplo e ficam só neste aparelho.</div>}
      <Routes>
        <Route path="/entrar" element={perfil ? <Navigate to={inicio} replace /> : <Entrar />} />
        <Route path="/cadastro" element={perfil ? <Navigate to={inicio} replace /> : <Cadastro />} />
        <Route path="/esqueci-senha" element={<EsqueciSenha />} />
        <Route path="/nova-senha" element={<NovaSenha />} />
        <Route path="/planos" element={<Planos />} />
        <Route path="/par-q" element={aluno ? <Parq /> : <Navigate to={inicio} replace />} />
        <Route path="/inicio" element={aluno && parq?.valido ? <Inicio /> : <Navigate to={inicio} replace />} />
        <Route path="/agendar" element={aluno && parq?.valido ? <Agendar /> : <Navigate to={inicio} replace />} />
        <Route path="/professor" element={perfil?.papel === "admin" ? <Professor /> : <Navigate to={inicio} replace />} />
        <Route path="*" element={<Navigate to={inicio} replace />} />
      </Routes>
    </SessaoCtx.Provider>
  );
}
