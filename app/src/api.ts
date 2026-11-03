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
export type NovoAluno = Omit<Cadastro, "senha">;

// Tela do professor
export type SituacaoParqAluno = "ok" | "pendente" | "atestado";
export type AlunoResumo = {
  id: string; nome_completo: string; email: string; telefone: string | null;
  restantes: number; valido_ate: string | null; parq: SituacaoParqAluno;
};
export type Ficha = {
  perfil: NovoAluno & { id: string };
  parq: { respostas: Record<string, boolean>; tem_sim: boolean; atestado_entregue: boolean; respondido_em: string; valido_ate: string } | null;
  compras: { id: string; plano_id: string; aulas_total: number; valor_centavos: number; forma_pagamento: string | null; status: string; pago_em: string | null; valido_ate: string | null }[];
  aulas: { id: string; data: string; inicio: string; status: string }[];
  saldo: Saldo;
};
export type AulaProfessor = {
  id: string; data: string; inicio: string; fim: string; limite: number | null;
  cancelada: boolean; motivo_cancelamento: string | null; marcados: number; presentes: number;
};
export type AlunoNaAula = { agendamento_id: string; aluno_id: string; nome_completo: string; telefone: string | null; status: string };
export type FormaPagamento = "pix" | "credito" | "debito" | "presencial";

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
  // Professor (Letícia e Diogo)
  gerarAulas(): Promise<number>;
  agendaProfessor(): Promise<AulaProfessor[]>;
  alunosDaAula(aulaId: string): Promise<AlunoNaAula[]>;
  marcarPresenca(agendamentoId: string, status: "presente" | "falta" | "marcado"): Promise<void>;
  cancelarAula(aulaId: string, motivo: string): Promise<void>;
  definirLimite(aulaId: string, limite: number | null): Promise<void>;
  alunos(): Promise<AlunoResumo[]>;
  ficha(alunoId: string): Promise<Ficha>;
  liberarAtestado(alunoId: string): Promise<void>;
  registrarPagamento(alunoId: string, planoId: string, forma: FormaPagamento): Promise<void>;
  marcarPara(alunoId: string, aulaId: string): Promise<void>;
  cadastrarAluno(dados: NovoAluno): Promise<void>;
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

function somaSaldo(linhas: { aulas_total: number; usadas: number; restantes: number; valido_ate: string }[]): Saldo {
  return {
    aulas_total: linhas.reduce((t, l) => t + l.aulas_total, 0),
    usadas: linhas.reduce((t, l) => t + l.usadas, 0),
    restantes: linhas.reduce((t, l) => t + l.restantes, 0),
    valido_ate: linhas.reduce<string | null>((m, l) => (!m || l.valido_ate > m ? l.valido_ate : m), null),
  };
}

function criarSupabase(sb: SupabaseClient): Api {
  const falha = (e: { message: string } | null) => { if (e) throw new Error(traduzir(e.message)); };
  const rpc = async <T,>(nome: string, args?: Record<string, unknown>) => {
    const { data, error } = await sb.rpc(nome, args);
    falha(error);
    return data as T;
  };
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
      const linhas = await rpc<Saldo[]>("meu_saldo");
      return linhas?.[0] ?? { aulas_total: 0, usadas: 0, restantes: 0, valido_ate: null };
    },
    async aulasProximas() { return (await rpc<Aula[]>("aulas_proximas")) ?? []; },
    async marcar(aulaId) { await rpc("marcar_aula", { p_aula: aulaId }); },
    async cancelar(id) { await rpc("cancelar_agendamento", { p_agendamento: id }); },
    async planos() {
      const { data, error } = await sb.from("planos").select("*").eq("ativo", true).order("ordem");
      falha(error);
      return (data ?? []) as Plano[];
    },
    async gerarAulas() { return rpc<number>("gerar_aulas", { p_dias: 60 }); },
    async agendaProfessor() { return (await rpc<AulaProfessor[]>("aulas_periodo", { p_dias_antes: 7, p_dias_depois: 30 })) ?? []; },
    async alunosDaAula(aulaId) {
      const { data, error } = await sb.from("agendamentos")
        .select("id, status, aluno_id, perfis!agendamentos_aluno_id_fkey(nome_completo, telefone)")
        .eq("aula_id", aulaId).neq("status", "cancelado");
      falha(error);
      return (data ?? []).map((g) => {
        const p = g.perfis as unknown as { nome_completo: string; telefone: string | null };
        return { agendamento_id: g.id, aluno_id: g.aluno_id, status: g.status, nome_completo: p.nome_completo, telefone: p.telefone };
      }).sort((a, b) => a.nome_completo.localeCompare(b.nome_completo));
    },
    async marcarPresenca(id, status) { await rpc("marcar_presenca", { p_agendamento: id, p_status: status }); },
    async cancelarAula(aulaId, motivo) { await rpc("cancelar_aula", { p_aula: aulaId, p_motivo: motivo }); },
    async definirLimite(aulaId, limite) { await rpc("definir_limite", { p_aula: aulaId, p_limite: limite }); },
    async alunos() { return (await rpc<AlunoResumo[]>("alunos_resumo")) ?? []; },
    async ficha(id) {
      const [p, q, c, a, s] = await Promise.all([
        sb.from("perfis").select("id, nome_completo, email, telefone, data_nascimento, cpf, rg, sexo, endereco").eq("id", id).single(),
        sb.from("parq").select("respostas, tem_sim, atestado_entregue, respondido_em, valido_ate").eq("aluno_id", id)
          .order("respondido_em", { ascending: false }).limit(1),
        sb.from("compras").select("id, plano_id, aulas_total, valor_centavos, forma_pagamento, status, pago_em, valido_ate")
          .eq("aluno_id", id).order("criado_em", { ascending: false }),
        sb.from("agendamentos").select("id, status, aulas(data, inicio)").eq("aluno_id", id).neq("status", "cancelado"),
        sb.rpc("compras_com_saldo", { p_aluno: id }),
      ]);
      [p, q, c, a, s].forEach((r) => falha(r.error));
      const aulas = (a.data ?? []).map((g) => {
        const au = g.aulas as unknown as { data: string; inicio: string };
        return { id: g.id, status: g.status, data: au.data, inicio: au.inicio };
      }).sort((x, y) => (x.data < y.data ? 1 : -1));
      return {
        perfil: p.data as Ficha["perfil"],
        parq: (q.data?.[0] ?? null) as Ficha["parq"],
        compras: (c.data ?? []) as Ficha["compras"],
        aulas,
        saldo: somaSaldo(s.data ?? []),
      };
    },
    async liberarAtestado(id) { await rpc("liberar_atestado", { p_aluno: id }); },
    async registrarPagamento(alunoId, planoId, forma) {
      await rpc("registrar_pagamento", { p_aluno: alunoId, p_plano: planoId, p_forma: forma });
    },
    async marcarPara(alunoId, aulaId) { await rpc("marcar_aula", { p_aula: aulaId, p_aluno: alunoId }); },
    async cadastrarAluno(dados) {
      const { data, error } = await sb.functions.invoke("cadastrar-aluno", {
        body: { ...dados, redirectTo: `${window.location.origin}/nova-senha` },
      });
      if (error) {
        const corpo = await (error as { context?: Response }).context?.json?.().catch(() => null);
        throw new Error(corpo?.erro ?? "Não foi possível cadastrar o aluno agora. Tente de novo.");
      }
      if (data?.erro) throw new Error(data.erro);
    },
  };
}

// ---------------------------------------------------------------------------
// Modo demonstração: mesmas regras do banco, com dados de exemplo neste aparelho.
// ---------------------------------------------------------------------------

type AlunoDemo = AlunoResumo & { dados: NovoAluno; presencas: number };
type EstadoDemo = {
  logado: Papel | null;
  parq: SituacaoParq | null;
  compras: number; // aulas compradas pelo aluno de demonstração
  validoAte: string;
  agendamentos: { id: string; aulaId: string }[];
  extras: Record<string, string[]>; // ids de outros alunos marcados em cada aula
  presencas: Record<string, "presente" | "falta">; // agendamento -> situação
  limites: Record<string, number>;
  canceladas: Record<string, string>; // aula -> motivo
  alunos: AlunoDemo[];
};

const PLANOS_DEMO: Plano[] = [
  { id: "sardinha", nome: "Sardinha", aulas: 5, valor_centavos: 23000, validade_dias: 30, parcelas_max: 1 },
  { id: "agua-viva", nome: "Água-Viva", aulas: 10, valor_centavos: 42000, validade_dias: 50, parcelas_max: 1 },
  { id: "tubarao", nome: "Tubarão", aulas: 20, valor_centavos: 72000, validade_dias: 80, parcelas_max: 2 },
];

const daquiA = (dias: number) => new Date(Date.now() + dias * 86400000).toISOString().slice(0, 10);

function alunoExemplo(id: string, nome: string, restantes: number, parq: SituacaoParqAluno, nascimento: string): AlunoDemo {
  const email = `${nome.split(" ")[0].toLowerCase()}@exemplo.com`;
  return {
    id, nome_completo: nome, email, telefone: "+55 13 99999-0000", restantes,
    valido_ate: restantes > 0 ? daquiA(40) : null, parq, presencas: 3,
    dados: { nome_completo: nome, email, telefone: "+55 13 99999-0000", data_nascimento: nascimento, cpf: "000.000.000-00", rg: "00.000.000-0", sexo: "feminino", endereco: "Santos, SP" },
  };
}

// Aulas de terça e quinta, 8h às 9h, de 7 dias atrás até 30 dias para frente.
function datasDemo(): string[] {
  const lista: string[] = [];
  const base = new Date(`${hojeSP()}T12:00:00`);
  for (let i = -7; i <= 30; i++) {
    const dia = new Date(base.getTime() + i * 86400000);
    if (dia.getDay() === 2 || dia.getDay() === 4) lista.push(dia.toISOString().slice(0, 10));
  }
  return lista;
}

function jaComecou(data: string): boolean {
  const horaSP = Number(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo", hour: "numeric", hourCycle: "h23" }));
  const hoje = hojeSP();
  return data < hoje || (data === hoje && horaSP >= 8);
}

function criarDemo(): Api {
  const CHAVE = "duolife-demo-v3";
  const inicial = (): EstadoDemo => ({
    logado: null, parq: null, compras: 5, validoAte: daquiA(30), agendamentos: [],
    extras: {}, presencas: {}, limites: {}, canceladas: {},
    alunos: [
      alunoExemplo("demo-ana", "Ana Paula Souza", 8, "ok", "1962-03-14"),
      alunoExemplo("demo-carlos", "Carlos Eduardo Lima", 0, "pendente", "1975-08-02"),
      alunoExemplo("demo-marta", "Marta Regina Reis", 15, "atestado", "1958-11-21"),
    ],
  });
  let estado: EstadoDemo = inicial();
  try { const s = localStorage.getItem(CHAVE); if (s) estado = { ...estado, ...JSON.parse(s) }; } catch { /* sem armazenamento */ }
  // Aulas da semana passada já vêm com alunos, para a tela de presença ter exemplo.
  if (Object.keys(estado.extras).length === 0) {
    datasDemo().filter(jaComecou).forEach((d, i) => { estado.extras[`aula-${d}`] = i % 2 === 0 ? ["demo-ana", "demo-marta"] : ["demo-ana"]; });
  }
  const ouvintes = new Set<() => void>();
  const salvar = () => {
    try { localStorage.setItem(CHAVE, JSON.stringify(estado)); } catch { /* sem armazenamento */ }
  };
  const avisar = () => { salvar(); ouvintes.forEach((f) => f()); };
  const espera = () => new Promise((r) => setTimeout(r, 150));
  const nomeDe = (id: string) => estado.alunos.find((a) => a.id === id)?.nome_completo ?? "Aluno de Demonstração";
  const marcadosNa = (aulaId: string) =>
    (estado.extras[aulaId]?.length ?? 0) + (estado.agendamentos.some((g) => g.aulaId === aulaId) ? 1 : 0);
  const futurasDoDemo = () => estado.agendamentos.filter((g) => !jaComecou(g.aulaId.slice(5)));

  function marcarDemo(aulaId: string) {
    const p = estado.parq;
    if (!p?.valido) throw new Error("Responda o questionário de saúde (PAR-Q) antes de marcar.");
    if (p.temSim && !p.atestado) throw new Error("Entregue o atestado médico ao professor para liberar o agendamento.");
    if (estado.agendamentos.some((g) => g.aulaId === aulaId)) throw new Error("Você já marcou esta aula.");
    if (futurasDoDemo().length >= 2) throw new Error("Você já tem 2 aulas marcadas. Depois de fazer uma, dá para marcar a próxima.");
    const limite = estado.limites[aulaId];
    if (limite && marcadosNa(aulaId) >= limite) throw new Error("Aula cheia. Marque sua aula para o próximo dia.");
    if (estado.compras - estado.agendamentos.length <= 0) throw new Error("Você não tem aulas no saldo. Compre um plano para marcar.");
    estado.agendamentos.push({ id: `ag-${Date.now()}`, aulaId });
  }

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
      estado.parq = { valido: true, temSim: Object.values(r).some(Boolean), atestado: false };
      avisar();
    },
    async saldo() {
      const usadas = estado.agendamentos.length;
      return { aulas_total: estado.compras, usadas, restantes: estado.compras - usadas, valido_ate: estado.validoAte };
    },
    async aulasProximas() {
      return datasDemo().filter((d) => !jaComecou(d) && !estado.canceladas[`aula-${d}`]).map((d) => {
        const id = `aula-${d}`;
        const minha = estado.agendamentos.find((g) => g.aulaId === id);
        return { id, data: d, inicio: "08:00:00", fim: "09:00:00", limite: estado.limites[id] ?? null, marcados: marcadosNa(id), minha_marcacao: minha?.id ?? null };
      });
    },
    async marcar(aulaId) { await espera(); marcarDemo(aulaId); avisar(); },
    async cancelar(id) { await espera(); estado.agendamentos = estado.agendamentos.filter((g) => g.id !== id); avisar(); },
    async planos() { return PLANOS_DEMO; },
    async gerarAulas() { await espera(); return 0; },
    async agendaProfessor() {
      return datasDemo().map((d) => {
        const id = `aula-${d}`;
        const ags = [...(estado.extras[id] ?? []).map((a) => `${id}:${a}`), ...estado.agendamentos.filter((g) => g.aulaId === id).map((g) => g.id)];
        return {
          id, data: d, inicio: "08:00:00", fim: "09:00:00", limite: estado.limites[id] ?? null,
          cancelada: Boolean(estado.canceladas[id]), motivo_cancelamento: estado.canceladas[id] ?? null,
          marcados: estado.canceladas[id] ? 0 : ags.length,
          presentes: ags.filter((g) => estado.presencas[g] === "presente").length,
        };
      });
    },
    async alunosDaAula(aulaId) {
      if (estado.canceladas[aulaId]) return [];
      const lista: AlunoNaAula[] = (estado.extras[aulaId] ?? []).map((alunoId) => ({
        agendamento_id: `${aulaId}:${alunoId}`, aluno_id: alunoId, nome_completo: nomeDe(alunoId),
        telefone: "+55 13 99999-0000", status: estado.presencas[`${aulaId}:${alunoId}`] ?? "marcado",
      }));
      estado.agendamentos.filter((g) => g.aulaId === aulaId).forEach((g) => lista.push({
        agendamento_id: g.id, aluno_id: "demo-aluno", nome_completo: "Aluno de Demonstração",
        telefone: "+55 13 98888-0000", status: estado.presencas[g.id] ?? "marcado",
      }));
      return lista.sort((a, b) => a.nome_completo.localeCompare(b.nome_completo));
    },
    async marcarPresenca(id, status) {
      await espera();
      if (status === "marcado") delete estado.presencas[id]; else estado.presencas[id] = status;
      avisar();
    },
    async cancelarAula(aulaId, motivo) {
      await espera();
      estado.canceladas[aulaId] = motivo;
      estado.agendamentos = estado.agendamentos.filter((g) => g.aulaId !== aulaId);
      avisar();
    },
    async definirLimite(aulaId, limite) {
      await espera();
      if (limite === null) delete estado.limites[aulaId]; else estado.limites[aulaId] = limite;
      avisar();
    },
    async alunos() {
      const demo: AlunoResumo = {
        id: "demo-aluno", nome_completo: "Aluno de Demonstração", email: "aluno@demo", telefone: "+55 13 98888-0000",
        restantes: estado.compras - estado.agendamentos.length, valido_ate: estado.validoAte,
        parq: !estado.parq?.valido ? "pendente" : estado.parq.temSim && !estado.parq.atestado ? "atestado" : "ok",
      };
      return [...estado.alunos.map(({ dados: _d, presencas: _p, ...a }) => a), demo].sort((a, b) => a.nome_completo.localeCompare(b.nome_completo));
    },
    async ficha(id) {
      await espera();
      const a = estado.alunos.find((x) => x.id === id);
      if (!a) {
        const usadas = estado.agendamentos.length;
        return {
          perfil: { id, nome_completo: "Aluno de Demonstração", email: "aluno@demo", telefone: "+55 13 98888-0000", data_nascimento: "1970-01-15", cpf: "000.000.000-00", rg: "00.000.000-0", sexo: "masculino", endereco: "Santos, SP" },
          parq: estado.parq?.valido ? { respostas: {}, tem_sim: estado.parq.temSim, atestado_entregue: estado.parq.atestado, respondido_em: new Date().toISOString(), valido_ate: daquiA(180) } : null,
          compras: [{ id: "c1", plano_id: "sardinha", aulas_total: estado.compras, valor_centavos: 23000, forma_pagamento: "pix", status: "pago", pago_em: new Date().toISOString(), valido_ate: estado.validoAte }],
          aulas: estado.agendamentos.map((g) => ({ id: g.id, data: g.aulaId.slice(5), inicio: "08:00:00", status: estado.presencas[g.id] ?? "marcado" })),
          saldo: { aulas_total: estado.compras, usadas, restantes: estado.compras - usadas, valido_ate: estado.validoAte },
        };
      }
      const respostas: Record<string, boolean> = Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((n) => [String(n), a.parq === "atestado" && n === 5]));
      return {
        perfil: { id, ...a.dados },
        parq: a.parq === "pendente" ? null : { respostas, tem_sim: a.parq === "atestado", atestado_entregue: false, respondido_em: new Date().toISOString(), valido_ate: daquiA(180) },
        compras: a.restantes > 0 ? [{ id: "c-" + id, plano_id: "tubarao", aulas_total: 20, valor_centavos: 72000, forma_pagamento: "presencial", status: "pago", pago_em: new Date().toISOString(), valido_ate: a.valido_ate }] : [],
        aulas: Object.entries(estado.extras).filter(([, ids]) => ids.includes(id)).map(([aulaId]) => ({
          id: `${aulaId}:${id}`, data: aulaId.slice(5), inicio: "08:00:00", status: estado.presencas[`${aulaId}:${id}`] ?? "marcado",
        })).sort((x, y) => (x.data < y.data ? 1 : -1)),
        saldo: { aulas_total: a.restantes > 0 ? 20 : 0, usadas: a.restantes > 0 ? 20 - a.restantes : 0, restantes: a.restantes, valido_ate: a.valido_ate },
      };
    },
    async liberarAtestado(id) {
      await espera();
      const a = estado.alunos.find((x) => x.id === id);
      if (a) a.parq = "ok"; else if (estado.parq) estado.parq.atestado = true;
      avisar();
    },
    async registrarPagamento(id, planoId) {
      await espera();
      const plano = PLANOS_DEMO.find((p) => p.id === planoId)!;
      const a = estado.alunos.find((x) => x.id === id);
      if (a) { a.restantes += plano.aulas; a.valido_ate = daquiA(plano.validade_dias); }
      else { estado.compras += plano.aulas; estado.validoAte = daquiA(plano.validade_dias); }
      avisar();
    },
    async marcarPara(alunoId, aulaId) {
      await espera();
      if (alunoId === "demo-aluno") { marcarDemo(aulaId); avisar(); return; }
      const a = estado.alunos.find((x) => x.id === alunoId)!;
      if (a.parq === "pendente") throw new Error("Este aluno ainda não respondeu o PAR-Q.");
      if (a.parq === "atestado") throw new Error("Falta o atestado médico deste aluno.");
      if (a.restantes <= 0) throw new Error("Este aluno não tem aulas no saldo.");
      const ids = estado.extras[aulaId] ?? [];
      if (ids.includes(alunoId)) throw new Error("Este aluno já está marcado nesta aula.");
      estado.extras[aulaId] = [...ids, alunoId];
      a.restantes -= 1;
      avisar();
    },
    async cadastrarAluno(d) {
      await espera();
      if (estado.alunos.some((a) => a.email === d.email)) throw new Error("Este e-mail já tem cadastro no app.");
      estado.alunos.push({ ...alunoExemplo(`demo-${Date.now()}`, d.nome_completo, 0, "pendente", d.data_nascimento), email: d.email, dados: d });
      avisar();
    },
  };
}

export const api: Api = url && chave ? criarSupabase(createClient(url, chave)) : criarDemo();
