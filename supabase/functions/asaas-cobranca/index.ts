// Duo Life · cria a cobrança no Asaas quando o aluno compra um plano pelo app.
//
// Pix: devolve o QR Code e o código "copia e cola" para mostrar no app.
// Cartão de crédito ou débito: devolve o link da página segura do Asaas, onde o aluno digita o cartão
// (o app nunca vê os dados do cartão).
//
// Segredos (Supabase → Edge Functions → Secrets), cadastrados quando a Letícia passar os dados do Asaas:
//   ASAAS_API_KEY   chave de API da conta Asaas da Letícia
//   ASAAS_AMBIENTE  "sandbox" (testes) ou "producao"
// SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY já vêm prontas.
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const resposta = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...cors, "Content-Type": "application/json" } });

function hojeSP(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const chaveAsaas = Deno.env.get("ASAAS_API_KEY");
  if (!chaveAsaas) return resposta({ erro: "nao_configurado" }, 503);
  const base = Deno.env.get("ASAAS_AMBIENTE") === "producao" ? "https://api.asaas.com/v3" : "https://sandbox.asaas.com/api/v3";
  const asaas = async (caminho: string, metodo = "GET", corpo?: unknown) => {
    const r = await fetch(base + caminho, {
      method: metodo,
      headers: { "Content-Type": "application/json", "User-Agent": "duo-life-app", access_token: chaveAsaas },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
    const dados = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(dados?.errors?.[0]?.description ?? `Asaas respondeu ${r.status}`);
    return dados;
  };

  const url = Deno.env.get("SUPABASE_URL")!;
  const comoAluno = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const servidor = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: { user } } = await comoAluno.auth.getUser();
  if (!user) return resposta({ erro: "Entre na sua conta para comprar." }, 401);

  const { plano, forma, parcelas = 1, contratoVersao } = await req.json();

  // 1. Cria a compra "pendente" com as regras do banco (valor, parcelas, aceite do contrato).
  const { data: compraId, error: erroCompra } = await comoAluno.rpc("iniciar_compra", {
    p_plano: plano, p_forma: forma, p_parcelas: parcelas, p_contrato_versao: contratoVersao,
  });
  if (erroCompra) return resposta({ erro: erroCompra.message }, 400);

  try {
    const { data: compra } = await servidor.from("compras").select("valor_centavos, plano_id, planos(nome)").eq("id", compraId).single();
    const { data: perfil } = await servidor.from("perfis").select("*").eq("id", user.id).single();

    // 2. Cliente do aluno no Asaas (cria na primeira compra).
    let clienteId = perfil.asaas_cliente_id as string | null;
    if (!clienteId) {
      const cliente = await asaas("/customers", "POST", {
        name: perfil.nome_completo, email: perfil.email, cpfCnpj: (perfil.cpf ?? "").replace(/\D/g, ""),
        mobilePhone: (perfil.telefone ?? "").replace(/\D/g, "").replace(/^55/, ""), externalReference: user.id,
      });
      clienteId = cliente.id;
      await servidor.from("perfis").update({ asaas_cliente_id: clienteId }).eq("id", user.id);
    }

    // 3. Cobrança. Crédito: cartão (com 2x no Tubarão). Débito: página do Asaas com a opção de débito.
    const valor = compra!.valor_centavos / 100;
    const nomePlano = (compra!.planos as unknown as { nome: string }).nome;
    const cobranca = await asaas("/payments", "POST", {
      customer: clienteId,
      billingType: forma === "pix" ? "PIX" : forma === "credito" ? "CREDIT_CARD" : "UNDEFINED",
      dueDate: hojeSP(),
      description: `Duo Life · Plano ${nomePlano}`,
      externalReference: compraId,
      ...(parcelas > 1 ? { installmentCount: parcelas, totalValue: valor } : { value: valor }),
    });

    let pix: { encodedImage?: string; payload?: string } = {};
    if (forma === "pix") pix = await asaas(`/payments/${cobranca.id}/pixQrCode`);

    await servidor.from("compras").update({
      pagamento_externo_id: cobranca.id, link_pagamento: cobranca.invoiceUrl,
      pix_copia_cola: pix.payload ?? null, pix_qrcode: pix.encodedImage ?? null,
    }).eq("id", compraId);

    return resposta({ compraId, link: cobranca.invoiceUrl, pixCopiaCola: pix.payload ?? null, pixQrCode: pix.encodedImage ?? null });
  } catch (e) {
    await servidor.from("compras").update({ status: "cancelado" }).eq("id", compraId);
    return resposta({ erro: `Não foi possível gerar o pagamento: ${(e as Error).message}` }, 502);
  }
});
