import { useEffect, useState } from "react";
import { ativarCelular, situacaoCelular, type SituacaoCelular } from "../celular";
import { erroTexto } from "../util";

// Cartão para ligar as notificações no celular. Some quando já está ligado.
export default function AtivarCelular({ para }: { para: "aluno" | "professor" }) {
  const [situacao, setSituacao] = useState<SituacaoCelular | null>(null);
  const [erro, setErro] = useState("");
  useEffect(() => { situacaoCelular().then(setSituacao).catch(() => setSituacao("sem-suporte")); }, []);

  async function ativar() {
    setErro("");
    try { setSituacao(await ativarCelular()); } catch (e) { setErro(erroTexto(e)); }
  }

  if (!situacao || situacao === "ativo" || situacao === "sem-suporte") return null;
  const motivo = para === "aluno"
    ? "Receba no celular o aviso de vagas, de renovação do plano e das suas aulas."
    : "Receba no celular um aviso a cada aula marcada ou cancelada pelos alunos.";

  return (
    <section className="cartao">
      <h2>Avisos no celular</h2>
      {situacao === "instalar-iphone" ? (
        <>
          <p className="sub">{motivo}</p>
          <p>No iPhone, primeiro coloque o app na tela de início:</p>
          <ol style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 6 }}>
            <li>Toque no botão <b>Compartilhar</b> (o quadrado com a seta para cima), embaixo no Safari.</li>
            <li>Escolha <b>Adicionar à Tela de Início</b>.</li>
            <li>Abra o Duo Life pelo ícone novo e ligue os avisos aqui.</li>
          </ol>
        </>
      ) : situacao === "bloqueado" ? (
        <p className="sub">Os avisos estão bloqueados neste celular. Para liberar, abra os ajustes do navegador e permita as notificações do Duo Life.</p>
      ) : situacao === "nao-configurado" ? (
        <p className="aviso ok">Permissão dada! Os avisos começam a chegar assim que o app for publicado.</p>
      ) : (
        <>
          <p className="sub">{motivo}</p>
          <button className="botao contorno" onClick={ativar}>Ligar avisos no celular</button>
        </>
      )}
      {erro && <p className="aviso">{erro}</p>}
    </section>
  );
}
