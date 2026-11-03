// Acesso aos dados do app. Com as chaves do Supabase configuradas, usa o banco de verdade.
// Sem as chaves, entra no "modo demonstração", com dados de exemplo guardados só neste aparelho.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type Papel = "aluno" | "admin";
export type Perfil = { id: string; nome_completo: string; email: string; papel: Papel };
export type Saldo = { aulas_total: number; usadas: number; restantes: number; valido_ate: string | null };
export type Aula = {
  id: string; data: string; inicio: string; fim: string;
  limite: number | null; marcados: number; minha_marcacao: string | null;
};
export type Plano = { id: string; nome: string; aulas: number; valor_centavos: number; validade_dias: number; parcelas_max: number };
export type SituacaoParq = { valido: boolean; temSim: boolean; atestado: boolean };
export type Cadastro = {
  nome_completo: string; email: string; senha: string; data_nascimento: string;
  telefone: string; cpf: string; rg: string; sexo: string; endereco: string;
};

export interface Api {
  demo: boolean;
  perfil(): Promise<Perfil | null>;
  aoMudarSessao(cb: () => void): () => void;
  entrar(email: string, senha: string): Promise<void>;
  cadastrar(c: Cadastro): Promise<{ precisaConfirmar: boolean }>;
  sair(): Promise<void>;
  esqueciSenha(email: string): Promise<void>;
  novaSenha(senha: string): Promise<void>;
  situacaoParq(): Promise<SituacaoParq>;
  responderParq(respostas: Record<string, boolean>): Promise<void>;
  saldo(): Promise<Saldo>;
  aulasProximas(): Promise<Aula[]>;
  marcar(aulaId: string): Promise<void>;
  cancelar(agendamentoId: string): Promise<void>;
  planos(): Promise<Plano[]>;
  gerarAulas(): Promise<number>;
}

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const chave = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Mensagens do Supabase em inglês viram português simples.
function traduzir(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "E-mail ou senha incorretos.";
  if (m.includes("email not confirmed")) return "Confirme o seu e-mail pelo link que enviamos antes de entrar.";
  if (m.includes("already registered")) return "Este e-mail já tem cadastro. Use \"Entrar\" ou \"Esqueci minha senha\".";
  if (m.includes("password should be")) return "A senha precisa ter pelo menos 6 caracteres.";
  return msg;
}

function hojeSP(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

function criarSupabase(sb: SupabaseClient): Api {
  const falha = (e: { message: string } | null) => { if (e) throw new Error(traduzir(e.message)); };
  return {
    demo: false,
    async perfil() {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return null;
      const { data, error } = await sb.from("perfis").select("id, nome_completo, email, papel").eq("id", user.id).single();
      falha(error);
      return data as Perfil;
    },
    aoMudarSessao(cb) {
      const { data } = sb.auth.onAuthStateChange(() => cb());
      return () => data.subscription.unsubscribe();
    },
    async entrar(email, senha) {
      const { error } = await sb.auth.signInWithPassword({ email, password: senha });
      falha(error);
    },
    async cadastrar({ senha, email, ...dados }) {
      const { data, error } = await sb.auth.signUp({
        email, password: senha,
        options: { data: dados, emailRedirectTo: window.location.origin },
      });
      falha(error);
      return { precisaConfirmar: !data.session };
    },
    async sair() { await sb.auth.signOut(); },
    async esqueciSenha(email) {
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/nova-senha` });
      falha(error);
    },
    async novaSenha(senha) {
      const { error } = await sb.auth.updateUser({ password: senha });
      falha(error);
    },
    async situacaoParq() {
      const { data, error } = await sb.from("parq").select("tem_sim, atestado_entregue, valido_ate")
        .order("respondido_em", { ascending: false }).limit(1);
      falha(error);
      const p = data?.[0];
      if (!p || p.valido_ate < hojeSP()) return { valido: false, temSim: false, atestado: false };
      return { valido: true, temSim: p.tem_sim, atestado: p.atestado_entregue };
    },
    async responderParq(respostas) {
      const { data: { user } } = await sb.auth.getUser();
      const { error } = await sb.from("parq").insert({
        aluno_id: user!.id, respostas, tem_sim: Object.values(respostas).some(Boolean),
      });
      falha(error);
    },
    async saldo() {
      const { data, error } = await sb.rpc("meu_saldo");
      falha(error);
      return (data?.[0] ?? { aulas_total: 0, usadas: 0, restantes: 0, valido_ate: null }) as Saldo;
    },
    async aulasProximas() {
      const { data, error } = await sb.rpc("aulas_proximas");
      falha(error);
      return (data ?? []) as Aula[];
    },
    async marcar(aulaId) { const { error } = await sb.rpc("marcar_aula", { p_aula: aulaId }); falha(error); },
    async cancelar(id) { const { error } = await sb.rpc("cancelar_agendamento", { p_agendamento: id }); falha(error); },
    async planos() {
      const { data, error } = await sb.from("planos").select("*").eq("ativo", true).order("ordem");
      falha(error);
      return (data ?? []) as Plano[];
    },
    async gerarAulas() {
      const { data, error } = await sb.rpc("gerar_aulas", { p_dias: 60 });
      falha(error);
      return data as number;
    },
  };
}

// ---------------------------------------------------------------------------
// Modo demonstração: mesmas regras do banco, com dados de exemplo neste aparelho.
// ---------------------------------------------------------------------------

type EstadoDemo = {
  logado: Papel | null;
  parq: SituacaoParq | null;
  compras: number; // aulas compradas
  validoAte: string;
  agendamentos: { id: string; aulaId: string }[];
  extras: Record<string, number>; // marcações de outros alunos por aula
};

const PLANOS_DEMO: Plano[] = [
  { id: "sardinha", nome: "Sardinha", aulas: 5, valor_centavos: 23000, validade_dias: 30, parcelas_max: 1 },
  { id: "agua-viva", nome: "Água-Viva", aulas: 10, valor_centavos: 42000, validade_dias: 50, parcelas_max: 1 },
  { id: "tubarao", nome: "Tubarão", aulas: 20, valor_centavos: 72000, validade_dias: 80, parcelas_max: 2 },
];

function aulasDemo(): Omit<Aula, "marcados" | "minha_marcacao">[] {
  const lista = [];
  const d = new Date(`${hojeSP()}T12:00:00`);
  const horaSP = Number(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo", hour: "numeric", hourCycle: "h23" }));
  for (let i = horaSP >= 8 ? 1 : 0; i <= 30; i++) {
    const dia = new Date(d.getTime() + i * 86400000);
    if (dia.getDay() === 2 || dia.getDay() === 4) {
      const iso = dia.toISOString().slice(0, 10);
      lista.push({ id: `aula-${iso}`, data: iso, inicio: "08:00:00", fim: "09:00:00", limite: null });
    }
  }
  return lista;
}

function criarDemo(): Api {
  const CHAVE = "duolife-demo";
  const inicial = (): EstadoDemo => ({
    logado: null, parq: null, compras: 5,
    validoAte: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    agendamentos: [], extras: {},
  });
  let estado: EstadoDemo = inicial();
  try { const s = localStorage.getItem(CHAVE); if (s) estado = { ...estado, ...JSON.parse(s) }; } catch { /* sem armazenamento */ }
  const ouvintes = new Set<() => void>();
  const salvar = () => {
    try { localStorage.setItem(CHAVE, JSON.stringify(estado)); } catch { /* sem armazenamento */ }
  };
  const avisar = () => { salvar(); ouvintes.forEach((f) => f()); };
  const espera = () => new Promise((r) => setTimeout(r, 150));

  return {
    demo: true,
    async perfil() {
      if (!estado.logado) return null;
      return estado.logado === "admin"
        ? { id: "demo-admin", nome_completo: "Diogo (demonstração)", email: "professor@demo", papel: "admin" }
        : { id: "demo-aluno", nome_completo: "Aluno de Demonstração", email: "aluno@demo", papel: "aluno" };
    },
    aoMudarSessao(cb) { ouvintes.add(cb); return () => ouvintes.delete(cb); },
    async entrar(email) {
      await espera();
      estado.logado = email.trim().toLowerCase().startsWith("professor") ? "admin" : "aluno";
      avisar();
    },
    async cadastrar() { await espera(); estado = { ...inicial(), logado: "aluno" }; avisar(); return { precisaConfirmar: false }; },
    async sair() { estado.logado = null; avisar(); },
    async esqueciSenha() { await espera(); },
    async novaSenha() { await espera(); },
    async situacaoParq() { return estado.parq ?? { valido: false, temSim: false, atestado: false }; },
    async responderParq(r) {
      await espera();
      const temSim = Object.values(r).some(Boolean);
      estado.parq = { valido: true, temSim, atestado: false };
      avisar();
    },
    async saldo() {
      const usadas = estado.agendamentos.length;
      return { aulas_total: estado.compras, usadas, restantes: estado.compras - usadas, valido_ate: estado.validoAte };
    },
    async aulasProximas() {
      return aulasDemo().map((a) => {
        const minha = estado.agendamentos.find((g) => g.aulaId === a.id);
        return { ...a, marcados: (estado.extras[a.id] ?? 0) + (minha ? 1 : 0), minha_marcacao: minha?.id ?? null };
      });
    },
    async marcar(aulaId) {
      await espera();
      const p = estado.parq;
      if (!p?.valido) throw new Error("Responda o questionário de saúde (PAR-Q) antes de marcar.");
      if (p.temSim && !p.atestado) throw new Error("Entregue o atestado médico ao professor para liberar o agendamento.");
      if (estado.agendamentos.some((g) => g.aulaId === aulaId)) throw new Error("Você já marcou esta aula.");
      if (estado.agendamentos.length >= 2) throw new Error("Você já tem 2 aulas marcadas. Depois de fazer uma, dá para marcar a próxima.");
      if (estado.compras - estado.agendamentos.length <= 0) throw new Error("Você não tem aulas no saldo. Compre um plano para marcar.");
      estado.agendamentos.push({ id: `ag-${Date.now()}`, aulaId });
      avisar();
    },
    async cancelar(id) {
      await espera();
      estado.agendamentos = estado.agendamentos.filter((g) => g.id !== id);
      avisar();
    },
    async planos() { return PLANOS_DEMO; },
    async gerarAulas() { await espera(); return 0; },
  };
}

export const api: Api = url && chave ? criarSupabase(createClient(url, chave)) : criarDemo();
