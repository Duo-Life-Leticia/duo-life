import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { erroTexto } from "../util";

export default function Entrar() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(""); setEnviando(true);
    try { await api.entrar(email.trim(), senha); } catch (err) { setErro(erroTexto(err)); setEnviando(false); }
  }

  return (
    <main className="pagina">
      <img className="logo" src="/logo-horizontal.jpg" alt="Duo Life" />
      <p className="slogan">Dois pilares. Um resultado.</p>
      <section className="cartao">
        <h1>Entrar</h1>
        {api.demo && (
          <p className="aviso info">Demonstração: use qualquer e-mail para entrar como aluno, ou um e-mail que comece com "professor" para ver a tela do professor.</p>
        )}
        <form onSubmit={enviar}>
          <label>E-mail
            <input type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label>Senha
            <input type="password" autoComplete="current-password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
          </label>
          {erro && <p className="aviso" role="alert">{erro}</p>}
          <button className="botao" disabled={enviando}>{enviando ? "Entrando…" : "Entrar"}</button>
        </form>
        <Link className="link centro" to="/esqueci-senha">Esqueci minha senha</Link>
      </section>
      <section className="cartao">
        <h2>Primeira vez aqui?</h2>
        <p className="sub">Faça o seu cadastro e crie a sua senha. Leva poucos minutos.</p>
        <Link className="botao contorno" to="/cadastro">Criar meu cadastro</Link>
        <Link className="link centro" to="/planos">Ver os planos</Link>
        <Link className="link centro" to="/quem-somos">Quem somos</Link>
      </section>
    </main>
  );
}
