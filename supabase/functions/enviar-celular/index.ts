// Duo Life · manda a notificação para o celular a cada aviso novo (aluno ou professor).
//
// Ligar no Supabase:
// 1. Secrets: VAPID_PUBLICA, VAPID_PRIVADA (par de chaves de notificação) e AVISOS_WEBHOOK_TOKEN (senha inventada).
// 2. Database → Webhooks → novo webhook na tabela "avisos", evento INSERT, tipo "Supabase Edge Functions",
//    função "enviar-celular", com o cabeçalho  x-duo-segredo: <valor de AVISOS_WEBHOOK_TOKEN>.
// 3. Publicar esta função SEM verificação de JWT (quem chama é o próprio banco; a segurança é o cabeçalho).
import webpush from "npm:web-push@3.6.7";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.headers.get("x-duo-segredo") !== Deno.env.get("AVISOS_WEBHOOK_TOKEN")) return new Response("não autorizado", { status: 401 });

  const { record } = await req.json().catch(() => ({ record: null }));
  if (!record?.destinatario) return new Response("ok");

  const servidor = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: inscricoes } = await servidor.from("inscricoes_celular").select("*").eq("usuario", record.destinatario);

  webpush.setVapidDetails("mailto:duolife.ltda@gmail.com", Deno.env.get("VAPID_PUBLICA")!, Deno.env.get("VAPID_PRIVADA")!);
  const mensagem = JSON.stringify({ titulo: record.titulo, texto: record.texto, link: record.link ?? "/" });

  for (const i of inscricoes ?? []) {
    try {
      await webpush.sendNotification({ endpoint: i.endpoint, keys: { p256dh: i.p256dh, auth: i.auth } }, mensagem);
    } catch (e) {
      // Aparelho desinstalou o app ou bloqueou os avisos: apaga a inscrição.
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) await servidor.from("inscricoes_celular").delete().eq("id", i.id);
    }
  }
  await servidor.from("avisos").update({ enviado_celular: true }).eq("id", record.id);
  return new Response("ok");
});
