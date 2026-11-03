import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, type Cadastro as DadosCadastro } from "../api";
import { erroTexto } from "../util";

const vazio: DadosCadastro = {
  nome_completo: "", email: "", senha: "", data_nascimento: "", telefone: "+55 ",
  cpf: "", rg: "", sexo: "", endereco: "",
};

// 12345678901 -> 123.456.789-01
function mascaraCpf(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export default function Cadastro() {
  const [dados, setDados] = useState(vazio);
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [confirmeEmail, setConfirmeEmail] = useState(false);
  const campo = (k: keyof DadosCadastro) => (e: { target: { value: string } }) =>
    setDados({ ...dados, [k]: k === "cpf" ? mascaraCpf(e.target.value) : e.target.value });

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro("");
    if (dados.senha.length < 6) return setErro("A senha precisa ter pelo menos 6 caracteres.");
    if (dados.senha !== confirmar) return setErro("As duas senhas não são iguais. Digite de novo.");
    if (dados.cpf.replace(/\D/g, "").length !== 11) return setErro("Confira o CPF: ele tem 11 números.");
    setEnviando(true);
    try {
      const { precisaConfirmar } = await api.cadastrar({ ...dados, email: dados.email.trim() });
      if (precisaConfirmar) setConfirmeEmail(true);
    } catch (err) { setErro(erroTexto(err)); } finally { setEnviando(false); }
  }

  if (confirmeEmail) {
    return (
      <main className="pagina">
        <img className="logo" src="/logo-horizontal.jpg" alt="Duo Life" />
        <section className="cartao">
          <h1>Quase lá!</h1>
          <p>Enviamos um link para <b>{dados.email}</b>. Abra o seu e-mail e toque no link para confirmar o cadastro. Depois é só entrar com o seu e-mail e a senha que você criou.</p>
          <Link className="botao" to="/entrar">Ir para Entrar</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="pagina">
      <Link className="link voltar" to="/entrar">← Voltar</Link>
      <h1>Criar meu cadastro</h1>
      <form className="cartao" onSubmit={enviar}>
        <label>Nome completo
          <input required autoComplete="name" value={dados.nome_completo} onChange={campo("nome_completo")} />
        </label>
        <label>E-mail (vai ser o seu login)
          <input type="email" required autoComplete="email" inputMode="email" value={dados.email} onChange={campo("email")} />
        </label>
        <label>Data de nascimento
          <input type="date" required value={dados.data_nascimento} onChange={campo("data_nascimento")} />
        </label>
        <label>WhatsApp
          <input type="tel" required autoComplete="tel" inputMode="tel" value={dados.telefone} onChange={campo("telefone")} />
        </label>
        <label>CPF
          <input required inputMode="numeric" value={dados.cpf} onChange={campo("cpf")} placeholder="000.000.000-00" />
        </label>
        <label>RG
          <input required value={dados.rg} onChange={campo("rg")} />
        </label>
        <label>Sexo
          <select required value={dados.sexo} onChange={campo("sexo")}>
            <option value="" disabled>Escolha</option>
            <option value="feminino">Feminino</option>
            <option value="masculino">Masculino</option>
          </select>
        </label>
        <label>Endereço
          <textarea required rows={2} autoComplete="street-address" value={dados.endereco} onChange={campo("endereco")} placeholder="Rua, número, bairro, cidade" />
        </label>
        <label>Crie uma senha (mínimo 6 caracteres)
          <input type="password" required autoComplete="new-password" value={dados.senha} onChange={campo("senha")} />
        </label>
        <label>Repita a senha
          <input type="password" required autoComplete="new-password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} />
        </label>
        {erro && <p className="aviso" role="alert">{erro}</p>}
        <button className="botao" disabled={enviando}>{enviando ? "Enviando…" : "Criar cadastro"}</button>
        <p className="sub centro">Se tiver dificuldade, ligue para o professor que ele faz o cadastro para você.</p>
      </form>
    </main>
  );
}
