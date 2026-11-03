import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, PAGAMENTO_NAO_LIGADO, type Plano } from "../api";
import { CONTRATO_VERSAO } from "../contrato";
import { erroTexto, reais } from "../util";

type Forma = "pix" | "credito" | "debito";
const FORMAS: { id: Forma; nome: string; detalhe: string }[] = [
  { id: "pix", nome: "Pix", detalhe: "Aprovação na hora" },
  { id: "credito", nome: "Cartão de crédito", detalhe: "Página segura do Asaas" },
  { id: "debito", nome: "Cartão de débito", detalhe: "Página segura do Asaas" },
];

// Compra de um plano pelo app: forma de pagamento, parcelas (só Tubarão no crédito) e aceite do contrato.
export default function Comprar() {
  const { plano: planoId = "" } = useParams();
  const navegar = useNavigate();
  const [plano, setPlano] = useState<Plano | null>(null);
  const [forma, setForma] = useState<Forma>("pix");
  const [parcelas, setParcelas] = useState(1);
  const [aceite, setAceite] = useState(false);
  const [erro, setErro] = useState("");
  const [naoLigado, setNaoLigado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => { api.planos().then((ps) => setPlano(ps.find((p) => p.id === planoId) ?? null)).catch((e) => setErro(erroTexto(e))); }, [planoId]);
  useEffect(() => { if (forma !== "credito") setParcelas(1); }, [forma]);

  async function pagar() {
    if (!plano) return;
    setErro(""); setNaoLigado(false); setEnviando(true);
    try {
      const c = await api.comprar(plano.id, forma, parcelas, CONTRATO_VERSAO);
      if (forma !== "pix" && c.link) window.location.href = c.link;
      else navegar(`/pagamento/${c.compraId}`, { replace: true });
    } catch (e) {
      if (erroTexto(e) === PAGAMENTO_NAO_LIGADO) setNaoLigado(true); else setErro(erroTexto(e));
      setEnviando(false);
    }
  }

  if (!plano) return <main className="pagina"><Link className="link voltar" to="/planos">← Planos</Link>{erro ? <p className="aviso">{erro}</p> : <p className="sub">Carregando…</p>}</main>;

  return (
    <main className="pagina">
      <Link className="link voltar" to="/planos">← Planos</Link>
      <h1>Plano {plano.nome}</h1>
      <section className="plano destaque">
        <div className="preco">{reais(plano.valor_centavos)}</div>
        <p>{plano.aulas} aulas · válido por {plano.validade_dias} dias a partir do pagamento</p>
        <p className="sub">Bônus: Guia DUO LIFE{plano.id === "tubarao" ? " + PDF extra de nutrição" : ""}</p>
      </section>

      <section className="cartao">
        <h2>Como você quer pagar?</h2>
        <div className="lista" role="radiogroup" aria-label="Forma de pagamento">
          {FORMAS.map((f) => (
            <button key={f.id} type="button" role="radio" aria-checked={forma === f.id}
              className={`item opcao ${forma === f.id ? "escolhida" : ""}`} onClick={() => setForma(f.id)}>
              <div style={{ textAlign: "left" }}>
                <div className="dia">{f.nome}</div>
                <div className="detalhe">{f.detalhe}</div>
              </div>
              <span className="marcador" aria-hidden="true">{forma === f.id ? "●" : "○"}</span>
            </button>
          ))}
        </div>
        {forma === "credito" && plano.parcelas_max > 1 && (
          <label>Parcelas
            <select value={parcelas} onChange={(e) => setParcelas(Number(e.target.value))}>
              <option value={1}>À vista: {reais(plano.valor_centavos)}</option>
              <option value={2}>2x de {reais(Math.round(plano.valor_centavos / 2))}</option>
            </select>
          </label>
        )}
      </section>

      <label className="aceite">
        <input type="checkbox" checked={aceite} onChange={(e) => setAceite(e.target.checked)} />
        <span>Li e aceito o <Link className="link" to="/contrato">contrato da Duo Life</Link>.</span>
      </label>

      {naoLigado && (
        <p className="aviso info">O pagamento pelo app está quase pronto e será ligado em breve. Por enquanto, fale com o professor para pagar pelo celular, pela maquininha ou por Pix.</p>
      )}
      {erro && <p className="aviso" role="alert">{erro}</p>}
      <button className="botao grande" disabled={!aceite || enviando} onClick={pagar}>
        {enviando ? "Gerando pagamento…" : !aceite ? "Aceite o contrato para continuar" : forma === "pix" ? "Pagar com Pix" : "Ir para o pagamento"}
      </button>
      <p className="sub centro">Desistiu? Você pode pedir a devolução de todo o valor em até 7 dias da compra.</p>
    </main>
  );
}
