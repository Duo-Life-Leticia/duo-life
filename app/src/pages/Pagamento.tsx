import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, type SituacaoCompra } from "../api";
import { dataBr, erroTexto, reais } from "../util";

// Acompanha o pagamento: mostra o Pix (QR Code e copia e cola) e confere a cada 5 segundos se já caiu.
export default function Pagamento() {
  const { id = "" } = useParams();
  const [compra, setCompra] = useState<SituacaoCompra | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ativo = true;
    const ver = () => api.situacaoCompra(id).then((c) => { if (ativo) setCompra(c); }).catch((e) => setErro(erroTexto(e)));
    ver();
    const t = setInterval(ver, 5000);
    return () => { ativo = false; clearInterval(t); };
  }, [id]);

  async function copiar() {
    if (!compra?.pix_copia_cola) return;
    try { await navigator.clipboard.writeText(compra.pix_copia_cola); setCopiado(true); setTimeout(() => setCopiado(false), 3000); }
    catch { setErro("Não deu para copiar. Toque e segure no código para copiar."); }
  }

  if (!compra) return <main className="pagina">{erro ? <p className="aviso">{erro}</p> : <p className="sub">Carregando…</p>}</main>;

  if (compra.status === "pago") {
    return (
      <main className="pagina">
        <img className="logo" src="/logo-horizontal.jpg" alt="Duo Life" />
        <section className="balao">
          <span className="rotulo">Pagamento confirmado</span>
          <span className="numero">{compra.aulas_total}</span>
          <span className="rotulo">aulas no seu saldo</span>
          <p className="sub">Válidas até {dataBr(compra.valido_ate)}. O Guia DUO LIFE já está liberado para você.</p>
        </section>
        <Link className="botao grande" to="/agendar">Agendar minha aula</Link>
        <Link className="link centro" to="/inicio">Ir para o início</Link>
      </main>
    );
  }

  if (compra.status !== "pendente") {
    return (
      <main className="pagina">
        <h1>Pagamento não concluído</h1>
        <p className="aviso">Este pagamento foi cancelado. Você pode tentar de novo ou falar com o professor.</p>
        <Link className="botao" to="/planos">Ver os planos</Link>
      </main>
    );
  }

  return (
    <main className="pagina">
      <Link className="link voltar" to="/inicio">← Início</Link>
      <h1>{compra.forma_pagamento === "pix" ? "Pague com Pix" : "Finalize o pagamento"}</h1>
      <p className="sub">Valor: <b>{reais(compra.valor_centavos)}</b> · {compra.aulas_total} aulas</p>
      {compra.forma_pagamento === "pix" ? (
        <section className="cartao centro">
          {compra.pix_qrcode
            ? <img src={`data:image/png;base64,${compra.pix_qrcode}`} alt="QR Code do Pix" style={{ width: 230, height: 230, margin: "0 auto", background: "#fff", borderRadius: 12, padding: 8 }} />
            : <p className="sub">Abra o app do seu banco, escolha Pix "copia e cola" e cole o código abaixo.</p>}
          {compra.pix_copia_cola && (
            <>
              <textarea readOnly rows={3} value={compra.pix_copia_cola} aria-label="Código Pix copia e cola" style={{ fontSize: 13 }} />
              <button className="botao" onClick={copiar}>{copiado ? "Código copiado ✓" : "Copiar código Pix"}</button>
            </>
          )}
        </section>
      ) : compra.link_pagamento ? (
        <a className="botao grande" href={compra.link_pagamento}>Abrir a página de pagamento</a>
      ) : null}
      <p className="aviso info">Assim que o pagamento cair, esta tela muda sozinha e as aulas entram no seu saldo.</p>
      {api.simularPagamento && (
        <button className="botao contorno" onClick={() => api.simularPagamento!(id).then(() => api.situacaoCompra(id).then(setCompra))}>Demonstração: simular pagamento confirmado</button>
      )}
      {erro && <p className="aviso">{erro}</p>}
    </main>
  );
}
