import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, type Plano } from "../api";
import { useSessao } from "../App";
import { erroTexto, reais } from "../util";

export default function Planos() {
  const { perfil } = useSessao();
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [erro, setErro] = useState("");
  const navegar = useNavigate();
  useEffect(() => { api.planos().then(setPlanos).catch((e) => setErro(erroTexto(e))); }, []);

  return (
    <main className="pagina">
      <Link className="link voltar" to={perfil ? "/" : "/entrar"}>← Voltar</Link>
      <h1>Planos do funcional</h1>
      <p className="sub">Aulas na praia, em Santos, às terças e quintas, das 8h às 9h. Todo plano vem com o Guia DUO LIFE.</p>
      {erro && <p className="aviso">{erro}</p>}
      <div className="lista">
        {planos.map((p) => (
          <section key={p.id} className={`plano ${p.id === "tubarao" ? "destaque" : ""}`}>
            {p.id === "tubarao" && <span className="selo" style={{ justifySelf: "start" }}>Melhor custo-benefício</span>}
            <h2>Plano {p.nome}</h2>
            <div className="preco">{reais(p.valor_centavos)}</div>
            <p>{p.aulas} aulas · válido por {p.validade_dias} dias</p>
            <p className="sub">
              {reais(Math.round(p.valor_centavos / p.aulas))} por aula
              {p.parcelas_max > 1 ? ` · em até ${p.parcelas_max}x no cartão` : " · à vista"}
            </p>
            <p className="sub">Bônus: Guia DUO LIFE{p.id === "tubarao" ? " + PDF extra de nutrição" : ""}</p>
            <button className="botao" onClick={() => navegar(perfil ? `/comprar/${p.id}` : "/entrar")}>Quero este plano</button>
          </section>
        ))}
      </div>
      <p className="sub centro">Pague pelo app com Pix, cartão de crédito ou débito. <Link className="link" to="/contrato">Ler o contrato</Link></p>
    </main>
  );
}
