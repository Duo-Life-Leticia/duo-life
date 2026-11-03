# Etapa 2: avisos automáticos, notificação no celular e Guia DUO LIFE

## O que já funciona (depois de rodar `supabase/migrations/0004_avisos_automaticos_e_guias.sql`)

Os avisos são criados pelo próprio banco de dados e aparecem no app (tela inicial do aluno; aba Avisos do professor).

| Aviso | Quando | Para quem | Texto |
|---|---|---|---|
| Renovação (2.1) | Ao marcar aula e ficar com 2 aulas no saldo | Aluno | "Restam apenas duas aulas!" |
| Renovação (2.1) | Ao marcar aula e ficar com 1 aula | Aluno | "Resta apenas 1 aula." |
| Vagas (1.8) | Aula com limite: restam 3 vagas | Alunos que podem marcar | "Só restam 3 vagas para terça, 8h. Garanta a sua!" |
| Vagas (1.8) | Aula com limite: resta 1 vaga | Alunos que podem marcar | "Última vaga para terça, 8h!" |
| Aula cheia (1.8) | Aula com limite lotou | Alunos que podem marcar | "A aula de terça, 8h já está cheia. Marque sua aula para o próximo dia." |
| Vaga liberada (2.3) | A aula estava cheia e alguém cancelou | Alunos que podem marcar (menos quem cancelou) | "Ainda temos vaga, vamos treinar?" |
| Aluno sumido (2.4) | 10 dias sem marcar aula (todo dia às 9h) | Aluno com saldo | "Não deixe de treinar! …" |
| Aluno sumido (2.4) | 2 faltas seguidas (todo dia às 9h) | Aluno com saldo | "Sentimos sua falta! …" |
| Aula marcada/cancelada (1.14) | A cada marcação ou cancelamento | Letícia e Diogo | "Bia Souza marcou a aula de quinta, 05/11, às 8h." |

"Alunos que podem marcar" = têm saldo, PAR-Q em dia (com atestado, se precisar), menos de 2 aulas marcadas e ainda não estão naquela aula.
Nenhum aviso se repete (cada um sai uma vez por compra, por aula ou por falta).

Para o aviso diário de aluno sumido: no Supabase, **Database → Extensions → pg_cron → ligar**, e rodar o arquivo 0004 de novo.

## Notificação no celular (com o app fechado)

1. **Gerar o par de chaves de notificação (VAPID)**. Num computador com Node instalado:
   `npx web-push generate-vapid-keys`
   (ou peça ao Claude para gerar na hora de publicar).
2. **Vercel** → Environment Variables: `VITE_VAPID_PUBLIC_KEY` = a chave **pública**.
3. **Supabase → Edge Functions → Secrets**:
   - `VAPID_PUBLICA` = chave pública
   - `VAPID_PRIVADA` = chave **privada** (nunca vai no app nem no chat)
   - `AVISOS_WEBHOOK_TOKEN` = uma senha longa inventada
4. **Edge Functions** → nova função `enviar-celular` com `supabase/functions/enviar-celular/index.ts`,
   com **"Verify JWT" desligado**.
5. **Database → Webhooks** → novo: tabela `avisos`, evento **Insert**, tipo **Supabase Edge Functions**,
   função `enviar-celular`, cabeçalho `x-duo-segredo` = o valor de `AVISOS_WEBHOOK_TOKEN`.

No app, o aluno e o professor tocam em **"Ligar avisos no celular"**.
- **Android**: funciona direto no Chrome.
- **iPhone**: primeiro "Compartilhar → Adicionar à Tela de Início" e abrir pelo ícone; o app mostra esse passo a passo.

## Guia DUO LIFE em PDF (2.5)

1. O 0004 cria a pasta privada `guias` no Storage do Supabase.
2. O professor envia os PDFs em **Agenda → Guias em PDF**:
   - **Guia DUO LIFE** (`guia-duo-life.pdf`): liberado para todo aluno que comprou um plano.
   - **PDF extra de nutrição** (`nutricao-tubarao.pdf`): liberado só para quem comprou o Tubarão.
3. O aluno baixa na tela inicial, em **"Seus guias"**. O link de download vale 5 minutos e só funciona para quem tem direito.

Falta: a Letícia mandar os PDFs dos guias.
