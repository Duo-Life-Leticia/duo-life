import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, type MeusDados, type ResumoPerfil } from "../api";
import { useSessao } from "../App";
import { dataBr, erroTexto } from "../util";

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

// 3.1 Perfil do aluno: desde quando treina, aulas feitas, evolução e os próprios dados.
export default function Perfil() {
  const { recarregar } = useSessao();
  const [resumo, setResumo] = useState<ResumoPerfil | null>(null);
  const [dados, setDados] = useState<(MeusDados & { email: string }) | null>(null);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  useEffect(() => {
    Promise.all([api.meuPerfil(), api.meusDados()]).then(([r, d]) => { setResumo(r); setDados(d); })
      .catch((e) => setMsg({ tipo: "erro", texto: erroTexto(e) }));
  }, []);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!dados) return;
    setMsg(null);
    try {
      await api.atualizarDados({ nome_completo: dados.nome_completo, telefone: dados.telefone, endereco: dados.endereco });
      await recarregar();
      setMsg({ tipo: "ok", texto: "Dados atualizados." });
    } catch (err) { setMsg({ tipo: "erro", texto: erroTexto(err) }); }
  }

  const maior = Math.max(1, ...(resumo?.por_mes ?? []).map((m) => m.aulas));
  const meta = resumo?.proximo_marco;
  const progresso = meta && resumo ? Math.min(100, Math.round((resumo.aulas_feitas / meta) * 100)) : 100;

  return (
    <main className="pagina">
      <Link className="link voltar" to="/inicio">← Início</Link>
      <h1>Meu perfil</h1>
      {msg && <p className={`aviso ${msg.tipo === "ok" ? "ok" : ""}`} role="status">{msg.texto}</p>}

      {resumo && (
        <>
          <section className="balao" aria-label="Aulas feitas">
            <span className="rotulo">Aulas feitas</span>
            <span className="numero">{resumo.aulas_feitas}</span>
            <p className="sub">{resumo.inicio ? `Treinando com a Duo Life desde ${dataBr(resumo.inicio)}` : "Sua primeira aula está chegando!"}</p>
          </section>

          <section className="cartao">
            <h2>Próxima meta</h2>
            {meta ? (
              <>
                <p>{resumo.aulas_feitas} de {meta} aulas · faltam {meta - resumo.aulas_feitas}</p>
                <div className="barra-meta" role="progressbar" aria-valuenow={progresso} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${progresso}%` }} /></div>
              </>
            ) : <p>Você já passou das 50 aulas. Que orgulho!</p>}
          </section>

          <section className="cartao">
            <h2>Sua evolução</h2>
            <p className="sub">Aulas feitas por mês</p>
            <div className="grafico" role="img" aria-label={resumo.por_mes.map((m) => `${MESES[Number(m.mes.slice(5)) - 1]}: ${m.aulas}`).join(", ")}>
              {resumo.por_mes.map((m) => (
                <div className="coluna" key={m.mes}>
                  <span className="valor">{m.aulas}</span>
                  <i style={{ height: `${Math.round((m.aulas / maior) * 100)}%` }} />
                  <span className="mes">{MESES[Number(m.mes.slice(5)) - 1]}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {dados && (
        <form className="cartao" onSubmit={salvar}>
          <h2>Meus dados</h2>
          <label>Nome completo<input required value={dados.nome_completo} onChange={(e) => setDados({ ...dados, nome_completo: e.target.value })} /></label>
          <label>WhatsApp<input type="tel" value={dados.telefone ?? ""} onChange={(e) => setDados({ ...dados, telefone: e.target.value })} /></label>
          <label>Endereço<textarea rows={2} value={dados.endereco ?? ""} onChange={(e) => setDados({ ...dados, endereco: e.target.value })} /></label>
          <p className="sub">E-mail (login): {dados.email}. Para mudar o e-mail, o CPF ou o RG, fale com o professor.</p>
          <button className="botao">Salvar</button>
        </form>
      )}
    </main>
  );
}
