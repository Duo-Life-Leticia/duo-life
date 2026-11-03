// Duo Life · o Asaas avisa aqui quando um pagamento é confirmado ou devolvido.
// Pagamento confirmado: as aulas entram no saldo do aluno na hora.
//
// No Asaas (Integrações → Webhooks), cadastre:
//   URL:   https://<projeto>.supabase.co/functions/v1/asaas-webhook
//   Token: o mesmo valor do segredo ASAAS_WEBHOOK_TOKEN
//   Eventos de cobrança: PAYMENT_RECEIVED, PAYMENT_CONFIRMED, PAYMENT_REFUNDED
// Esta função precisa ser publicada SEM verificação de JWT (o Asaas não manda login do Supabase);
// a segurança vem do token acima.
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const token = Deno.env.get("ASAAS_WEBHOOK_TOKEN");
  if (!token || req.headers.get("asaas-access-token") !== token) return new Response("não autorizado", { status: 401 });

  const evento = await req.json().catch(() => null);
  const compraId: string | undefined = evento?.payment?.externalReference;
  if (!compraId) return new Response("ok"); // cobrança que não veio do app

  const servidor = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  if (evento.event === "PAYMENT_RECEIVED" || evento.event === "PAYMENT_CONFIRMED") {
    const { error } = await servidor.rpc("confirmar_pagamento", { p_compra: compraId });
    if (error) return new Response(error.message, { status: 500 });
  } else if (evento.event === "PAYMENT_REFUNDED") {
    const { error } = await servidor.rpc("estornar_pagamento", { p_compra: compraId });
    if (error) return new Response(error.message, { status: 500 });
  }
  return new Response("ok");
});
