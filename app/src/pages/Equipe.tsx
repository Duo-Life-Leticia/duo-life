import { useEffect, useState, type FormEvent } from "react";
import { api, type MembroEquipe } from "../api";
import { erroTexto } from "../util";

// Só o dono do app (Alessandro) vê: escolhe quem é professor. A pessoa precisa ter se cadastrado no app antes.
export default function Equipe() {
  const [equipe, setEquipe] = useState<MembroEquipe[]>([]);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const carregar = () => api.equipe().then(setEquipe);
  useEffect(() => { carregar().catch((e) => setMsg({ tipo: "erro", texto: erroTexto(e) })); }, []);

  async function mudar(alvo: string, professor: boolean) {
    setMsg(null);
    try {
      const nome = await api.definirProfessor(alvo.trim(), professor);
      setMsg({ tipo: "ok", texto: professor ? `${nome} agora é professor.` : `${nome} voltou a ser aluno.` });
      setEmail(""); await carregar();
    } catch (e) { setMsg({ tipo: "erro", texto: erroTexto(e) }); }
  }

  function adicionar(e: FormEvent) { e.preventDefault(); if (email.trim()) mudar(email, true); }

  return (
    <section className="cartao">
      <h2>Equipe</h2>
      <p className="sub">Só você vê esta parte. Professores fazem o dia a dia pelas telas do app; mudar o app, os preços e a equipe é só com você.</p>
      <div className="lista">
        {equipe.map((m) => (
          <div className="item" key={m.id}>
            <div>
              <div className="dia" style={{ fontSize: 16 }}>{m.nome_completo}</div>
              <div className="detalhe">{m.email}</div>
            </div>
            {m.dono ? <span className="selo">Dono</span> : (
              <button className="botao pequeno contorno" onClick={() => confirm(`Tirar ${m.nome_completo} de professor?`) && mudar(m.email, false)}>Remover</button>
            )}
          </div>
        ))}
      </div>
      <form onSubmit={adicionar}>
        <label>Tornar professor (e-mail da pessoa, já cadastrada no app)
          <input type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" />
        </label>
        <button className="botao contorno">Tornar professor</button>
      </form>
      {msg && <p className={`aviso ${msg.tipo === "ok" ? "ok" : ""}`} role="status">{msg.texto}</p>}
    </section>
  );
}
