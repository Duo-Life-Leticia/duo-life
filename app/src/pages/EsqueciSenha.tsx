import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { erroTexto } from "../util";

export default function EsqueciSenha() {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState("");

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro("");
    try { await api.esqueciSenha(email.trim()); setEnviado(true); } catch (err) { setErro(erroTexto(err)); }
  }

  return (
    <main className="pagina">
      <Link className="link voltar" to="/entrar">← Voltar</Link>
      <h1>Esqueci minha senha</h1>
      <section className="cartao">
        {enviado ? (
          <p className="aviso ok">Pronto! Se este e-mail tiver cadastro, você vai receber um link para criar uma senha nova.</p>
        ) : (
          <form onSubmit={enviar}>
            <p className="sub">Digite o e-mail do seu cadastro. Vamos mandar um link para você criar uma senha nova.</p>
            <label>E-mail
              <input type="email" required autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            {erro && <p className="aviso" role="alert">{erro}</p>}
            <button className="botao">Enviar link</button>
          </form>
        )}
      </section>
    </main>
  );
}
