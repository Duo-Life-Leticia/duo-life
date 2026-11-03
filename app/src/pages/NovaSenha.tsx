import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { erroTexto } from "../util";

export default function NovaSenha() {
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState("");
  const navegar = useNavigate();

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro("");
    if (senha.length < 6) return setErro("A senha precisa ter pelo menos 6 caracteres.");
    if (senha !== confirmar) return setErro("As duas senhas não são iguais. Digite de novo.");
    try { await api.novaSenha(senha); navegar("/", { replace: true }); } catch (err) { setErro(erroTexto(err)); }
  }

  return (
    <main className="pagina">
      <img className="logo" src="/logo-horizontal.jpg" alt="Duo Life" />
      <h1>Criar senha nova</h1>
      <form className="cartao" onSubmit={enviar}>
        <label>Nova senha (mínimo 6 caracteres)
          <input type="password" required autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
        </label>
        <label>Repita a nova senha
          <input type="password" required autoComplete="new-password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} />
        </label>
        {erro && <p className="aviso" role="alert">{erro}</p>}
        <button className="botao">Salvar senha</button>
      </form>
    </main>
  );
}
