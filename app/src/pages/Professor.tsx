import { useEffect, useState } from "react";
import { api, type Aula } from "../api";
import { useSessao } from "../App";
import { dataCurta, erroTexto, hora } from "../util";

// Tela do professor (Letícia e Diogo). Nesta primeira parte: agenda com o número de alunos e abrir aulas.
// Lista e ficha dos alunos, presença e registro de pagamento presencial vêm na próxima parte.
export default function Professor() {
  const { perfil } = useSessao();
  const [aulas, setAulas] = useState<Aula[] | null>(null);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  const carregar = () => api.aulasProximas().then(setAulas);
  useEffect(() => { carregar().catch((e) => setMsg({ tipo: "erro", texto: erroTexto(e) })); }, []);

  async function abrir() {
    setMsg(null);
    try {
      const n = await api.gerarAulas();
      setMsg({ tipo: "ok", texto: n > 0 ? `${n} aulas novas abertas (terças e quintas, 8h às 9h).` : "A agenda já está aberta para os próximos 60 dias." });
      await carregar();
    } catch (e) { setMsg({ tipo: "erro", texto: erroTexto(e) }); }
  }

  return (
    <main className="pagina">
      <div className="topo">
        <img className="logo pequena" src="/logo-horizontal.jpg" alt="Duo Life" />
        <button className="link" onClick={() => api.sair()}>Sair</button>
      </div>
      <h1>Tela do professor</h1>
      <p className="sub">Olá, {perfil?.nome_completo.split(" ")[0]}! Você tem acesso a tudo o que acontece no app.</p>
      {msg && <p className={`aviso ${msg.tipo === "ok" ? "ok" : ""}`} role="status">{msg.texto}</p>}
      <button className="botao" onClick={abrir}>Abrir aulas dos próximos 60 dias</button>
      <section className="cartao">
        <h2>Agenda</h2>
        {aulas === null ? <p className="sub">Carregando…</p> : aulas.length === 0 ? (
          <p className="sub">Nenhuma aula aberta. Toque em "Abrir aulas" para criar a agenda.</p>
        ) : (
          <div className="lista">
            {aulas.map((a) => (
              <div className="item" key={a.id}>
                <div>
                  <div className="dia">{dataCurta(a.data)}</div>
                  <div className="detalhe">{hora(a.inicio)} às {hora(a.fim)}{a.limite !== null ? ` · limite ${a.limite}` : " · sem limite"}</div>
                </div>
                <span className="selo">{a.marcados} {a.marcados === 1 ? "aluno" : "alunos"}</span>
              </div>
            ))}
          </div>
        )}
      </section>
      <p className="sub">Em breve aqui: lista e ficha dos alunos, cadastro de aluno por telefone, presença, cancelar aula (feriado ou chuva) e registro de pagamento na praia.</p>
    </main>
  );
}
