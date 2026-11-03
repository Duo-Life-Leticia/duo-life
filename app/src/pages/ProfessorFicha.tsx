import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, type Aula, type Ficha, type FormaPagamento, type Plano } from "../api";
import { PERGUNTAS_PARQ } from "../parq";
import { FORMAS, dataBr, dataCurta, erroTexto, hora, idade, linkWhats, reais } from "../util";
import ProfessorTopo from "./ProfessorTopo";

const SITUACAO: Record<string, string> = { marcado: "Marcada", presente: "Presente", falta: "Faltou" };

// Ficha do aluno: dados, PAR-Q, saldo, registrar pagamento na praia, marcar aula e histórico.
export default function ProfessorFicha() {
  const { id = "" } = useParams();
  const [ficha, setFicha] = useState<Ficha | null>(null);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [plano, setPlano] = useState("tubarao");
  const [forma, setForma] = useState<FormaPagamento>("presencial");
  const [aula, setAula] = useState("");
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  async function carregar() {
    const [f, p, a] = await Promise.all([api.ficha(id), api.planos(), api.aulasProximas()]);
    setFicha(f); setPlanos(p); setAulas(a);
    if (!aula && a[0]) setAula(a[0].id);
  }
  useEffect(() => { carregar().catch((e) => setMsg({ tipo: "erro", texto: erroTexto(e) })); }, [id]);

  async function acao(fn: () => Promise<void>, ok: string) {
    setMsg(null);
    try { await fn(); setMsg({ tipo: "ok", texto: ok }); await carregar(); window.scrollTo({ top: 0, behavior: "smooth" }); }
    catch (e) { setMsg({ tipo: "erro", texto: erroTexto(e) }); window.scrollTo({ top: 0, behavior: "smooth" }); }
  }

  if (!ficha) {
    return <main className="pagina"><ProfessorTopo />{msg ? <p className="aviso">{msg.texto}</p> : <p className="sub">Carregando…</p>}</main>;
  }
  const { perfil, parq, saldo } = ficha;
  const whats = linkWhats(perfil.telefone);
  const planoEscolhido = planos.find((p) => p.id === plano);
  const feitas = ficha.aulas.filter((a) => a.status === "presente").length;

  return (
    <main className="pagina">
      <ProfessorTopo />
      <Link className="link voltar" to="/professor/alunos">← Alunos</Link>
      <h1>{perfil.nome_completo}</h1>
      {msg && <p className={`aviso ${msg.tipo === "ok" ? "ok" : ""}`} role="status">{msg.texto}</p>}

      <section className="balao" aria-label="Saldo do aluno">
        <span className="rotulo">Saldo</span>
        <span className="numero">{saldo.restantes}</span>
        <span className="rotulo">{saldo.restantes === 1 ? "aula" : "aulas"}</span>
        <p className="sub">{saldo.restantes > 0 ? `Válido até ${dataBr(saldo.valido_ate)}` : "Sem plano ativo"} · {feitas} {feitas === 1 ? "aula feita" : "aulas feitas"}</p>
      </section>

      <section className="cartao">
        <h2>Dados</h2>
        <dl className="dados">
          <dt>Idade</dt><dd>{idade(perfil.data_nascimento)} ({dataBr(perfil.data_nascimento)})</dd>
          <dt>E-mail</dt><dd>{perfil.email}</dd>
          <dt>WhatsApp</dt><dd>{whats ? <a className="link" href={whats} target="_blank" rel="noreferrer">{perfil.telefone}</a> : perfil.telefone || "—"}</dd>
          <dt>CPF</dt><dd>{perfil.cpf || "—"}</dd>
          <dt>RG</dt><dd>{perfil.rg || "—"}</dd>
          <dt>Sexo</dt><dd>{perfil.sexo === "feminino" ? "Feminino" : perfil.sexo === "masculino" ? "Masculino" : "—"}</dd>
          <dt>Endereço</dt><dd>{perfil.endereco || "—"}</dd>
        </dl>
      </section>

      <section className="cartao">
        <h2>PAR-Q</h2>
        {!parq ? <p className="aviso">Ainda não respondeu o PAR-Q. Sem ele, não dá para marcar aulas.</p> : (
          <>
            <p className="sub">Respondido em {dataBr(parq.respondido_em.slice(0, 10))} · vale até {dataBr(parq.valido_ate)}</p>
            {parq.tem_sim && (parq.atestado_entregue
              ? <p className="aviso ok">Respondeu "sim" em alguma pergunta. Atestado médico entregue.</p>
              : <>
                  <p className="aviso info">Respondeu "sim" em alguma pergunta. Precisa entregar o atestado médico antes de treinar.</p>
                  <button className="botao" onClick={() => acao(() => api.liberarAtestado(id), "Atestado registrado. O agendamento está liberado.")}>Atestado entregue: liberar agendamento</button>
                </>)}
            <ol style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 8, fontSize: 15 }}>
              {PERGUNTAS_PARQ.map((q, i) => {
                const r = parq.respostas[String(i + 1)];
                return <li key={i}>{q} <span className={r ? "resp-sim" : "sub"}>{r === undefined ? "—" : r ? "SIM" : "Não"}</span></li>;
              })}
            </ol>
          </>
        )}
      </section>

      <section className="cartao">
        <h2>Registrar pagamento</h2>
        <p className="sub">Para pagamento feito na praia ou combinado com vocês. As aulas entram no saldo na hora, e a validade conta a partir de hoje.</p>
        <label>Plano
          <select value={plano} onChange={(e) => setPlano(e.target.value)}>
            {planos.map((p) => <option key={p.id} value={p.id}>{p.nome}: {p.aulas} aulas · {reais(p.valor_centavos)}</option>)}
          </select>
        </label>
        <label>Forma de pagamento
          <select value={forma} onChange={(e) => setForma(e.target.value as FormaPagamento)}>
            {Object.entries(FORMAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <button className="botao" onClick={() => planoEscolhido && confirm(`Registrar o Plano ${planoEscolhido.nome} (${reais(planoEscolhido.valor_centavos)}) para ${perfil.nome_completo}?`) &&
          acao(() => api.registrarPagamento(id, plano, forma), `Pagamento registrado: ${planoEscolhido.aulas} aulas no saldo.`)}>
          Registrar pagamento
        </button>
      </section>

      <section className="cartao">
        <h2>Marcar aula para o aluno</h2>
        {aulas.length === 0 ? <p className="sub">Nenhuma aula aberta.</p> : (
          <>
            <select value={aula} onChange={(e) => setAula(e.target.value)} aria-label="Aula">
              {aulas.map((a) => <option key={a.id} value={a.id}>{dataCurta(a.data)}, {hora(a.inicio)}</option>)}
            </select>
            <button className="botao contorno" onClick={() => acao(() => api.marcarPara(id, aula), "Aula marcada para o aluno.")}>Marcar aula</button>
          </>
        )}
      </section>

      <section className="cartao">
        <h2>Aulas</h2>
        {ficha.aulas.length === 0 ? <p className="sub">Nenhuma aula ainda.</p> : (
          <div className="lista">
            {ficha.aulas.map((a) => (
              <div className="item" key={a.id}>
                <div className="dia" style={{ fontSize: 16 }}>{dataCurta(a.data)}, {hora(a.inicio)}</div>
                <span className={`chip ${a.status === "presente" ? "ok" : a.status === "falta" ? "erro" : ""}`}>{SITUACAO[a.status] ?? a.status}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {ficha.compras.length > 0 && (
        <section className="cartao">
          <h2>Compras</h2>
          <div className="lista">
            {ficha.compras.map((c) => (
              <div className="item" key={c.id}>
                <div>
                  <div className="dia" style={{ fontSize: 16 }}>{planos.find((p) => p.id === c.plano_id)?.nome ?? c.plano_id} · {reais(c.valor_centavos)}</div>
                  <div className="detalhe">{c.pago_em ? `Pago em ${dataBr(c.pago_em.slice(0, 10))}` : "Pendente"} · {c.forma_pagamento ? FORMAS[c.forma_pagamento] : "—"} · até {dataBr(c.valido_ate)}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
