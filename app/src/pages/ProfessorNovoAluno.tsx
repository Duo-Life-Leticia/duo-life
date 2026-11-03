import { useState, type FormEvent } from "react";
import { api, type NovoAluno } from "../api";
import { erroTexto } from "../util";
import ProfessorTopo from "./ProfessorTopo";

const vazio: NovoAluno = { nome_completo: "", apelido: "", email: "", data_nascimento: "", telefone: "+55 ", cpf: "", rg: "", sexo: "", endereco: "" };

function mascaraCpf(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

// O professor cadastra o aluno que ligou pedindo ajuda. O aluno recebe um e-mail e cria a senha no primeiro acesso.
export default function ProfessorNovoAluno() {
  const [dados, setDados] = useState(vazio);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const campo = (k: keyof NovoAluno) => (e: { target: { value: string } }) =>
    setDados({ ...dados, [k]: k === "cpf" ? mascaraCpf(e.target.value) : e.target.value });

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (dados.cpf && dados.cpf.replace(/\D/g, "").length !== 11) return setMsg({ tipo: "erro", texto: "Confira o CPF: ele tem 11 números." });
    setEnviando(true);
    try {
      await api.cadastrarAluno({ ...dados, email: dados.email.trim() });
      setMsg({ tipo: "ok", texto: `Pronto! ${dados.nome_completo} foi cadastrado. Enviamos um e-mail para ${dados.email} criar a senha no primeiro acesso.` });
      setDados(vazio);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) { setMsg({ tipo: "erro", texto: erroTexto(err) }); } finally { setEnviando(false); }
  }

  return (
    <main className="pagina">
      <ProfessorTopo />
      <h1>Cadastrar aluno</h1>
      <p className="sub">Para quem não conseguiu se cadastrar pelo app. O aluno recebe um e-mail para criar a própria senha.</p>
      {msg && <p className={`aviso ${msg.tipo === "ok" ? "ok" : ""}`} role="status">{msg.texto}</p>}
      <form className="cartao" onSubmit={enviar}>
        <label>Nome completo<input required value={dados.nome_completo} onChange={campo("nome_completo")} /></label>
        <label>Como quer ser chamado(a) (opcional)<input value={dados.apelido ?? ""} onChange={campo("apelido")} placeholder="Se ficar vazio, usa o primeiro nome" /></label>
        <label>E-mail do aluno<input type="email" required inputMode="email" value={dados.email} onChange={campo("email")} /></label>
        <label>Data de nascimento<input type="date" required value={dados.data_nascimento} onChange={campo("data_nascimento")} /></label>
        <label>WhatsApp<input type="tel" required inputMode="tel" value={dados.telefone} onChange={campo("telefone")} /></label>
        <label>CPF<input inputMode="numeric" value={dados.cpf} onChange={campo("cpf")} placeholder="000.000.000-00" /></label>
        <label>RG<input value={dados.rg} onChange={campo("rg")} /></label>
        <label>Sexo
          <select value={dados.sexo} onChange={campo("sexo")}>
            <option value="">Escolha</option>
            <option value="feminino">Feminino</option>
            <option value="masculino">Masculino</option>
          </select>
        </label>
        <label>Endereço<textarea rows={2} value={dados.endereco} onChange={campo("endereco")} placeholder="Rua, número, bairro, cidade" /></label>
        <button className="botao" disabled={enviando}>{enviando ? "Cadastrando…" : "Cadastrar e enviar e-mail"}</button>
      </form>
    </main>
  );
}
