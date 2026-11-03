// Duo Life · o professor cadastra um aluno que não conseguiu se cadastrar pelo app.
// O aluno recebe um e-mail de convite e cria a própria senha no primeiro acesso.
// Só a Letícia e o Diogo (papel "admin") podem usar.
// As chaves SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY já vêm prontas nas funções do Supabase.
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resposta = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const url = Deno.env.get("SUPABASE_URL")!;
  const quemPede = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: ehAdmin } = await quemPede.rpc("eh_admin");
  if (!ehAdmin) return resposta({ erro: "Só a Letícia e o Diogo podem cadastrar alunos." }, 403);

  const d = await req.json();
  if (!d.email || !d.nome_completo) return resposta({ erro: "Preencha pelo menos o nome completo e o e-mail." }, 400);

  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { error } = await admin.auth.admin.inviteUserByEmail(String(d.email).trim(), {
    redirectTo: d.redirectTo,
    data: {
      nome_completo: d.nome_completo, data_nascimento: d.data_nascimento, telefone: d.telefone,
      cpf: d.cpf, rg: d.rg, sexo: d.sexo, endereco: d.endereco,
    },
  });
  if (error) {
    const msg = error.message.toLowerCase().includes("already")
      ? "Este e-mail já tem cadastro no app."
      : error.message;
    return resposta({ erro: msg }, 400);
  }
  return resposta({ ok: true });
});
