# Pagamento pelo app: como ligar o Asaas

Tudo já está pronto no app e no banco. Falta só ligar com a conta Asaas da Letícia.
Enquanto não estiver ligado, quem tenta pagar pelo app vê o aviso: "O pagamento pelo app está quase pronto e será
ligado em breve. Por enquanto, fale com o professor para pagar pelo celular, pela maquininha ou por Pix."
O professor continua registrando pagamentos feitos na praia pela ficha do aluno.

## O que a Letícia precisa fazer no Asaas

1. **Gerar a chave de API**: Asaas → Integrações (ou Minha conta → Integrações) → **Gerar chave de API**.
   A chave aparece uma vez só. Ela **não** deve ser mandada por WhatsApp nem por chat: a própria Letícia
   (ou o Alessandro, ao lado dela) cola a chave direto no Supabase (passo 2 abaixo).
2. Conferir se a conta aceita **Pix, cartão de crédito e cartão de débito** nas cobranças.

Dica: dá para testar antes com uma conta de testes do Asaas (sandbox, em sandbox.asaas.com), com pagamentos de mentira.

## O que fazer no Supabase (uma vez só)

1. **SQL Editor**: rodar `supabase/migrations/0003_pagamento_e_avisos.sql`.
2. **Edge Functions → Secrets** (segredos), cadastrar:
   - `ASAAS_API_KEY` = a chave de API do Asaas
   - `ASAAS_AMBIENTE` = `producao` (ou `sandbox` para testar)
   - `ASAAS_WEBHOOK_TOKEN` = uma senha longa inventada na hora (ex.: 30 letras e números misturados)
3. **Edge Functions → Deploy a new function → Via Editor**, duas funções:
   - `asaas-cobranca`: colar `supabase/functions/asaas-cobranca/index.ts`
   - `asaas-webhook`: colar `supabase/functions/asaas-webhook/index.ts` e **desligar "Verify JWT"**
     (o Asaas não tem login no Supabase; a segurança é o token do passo 2)

## O que fazer no Asaas (aviso de pagamento)

Asaas → Integrações → **Webhooks** → novo webhook:
- URL: `https://<endereço-do-projeto>.supabase.co/functions/v1/asaas-webhook`
- Token de autenticação: o mesmo valor de `ASAAS_WEBHOOK_TOKEN`
- Eventos: **PAYMENT_RECEIVED**, **PAYMENT_CONFIRMED** e **PAYMENT_REFUNDED**

## Como funciona para o aluno

1. Planos → **Quero este plano** → escolhe Pix, crédito ou débito (Tubarão: 2x no crédito).
2. Marca **"Li e aceito o contrato"** (o app guarda a data, a hora e a versão do contrato).
3. **Pix**: aparece o QR Code e o botão "Copiar código Pix", dentro do app.
   **Cartão**: abre a página segura do Asaas para digitar o cartão (o app nunca vê os dados do cartão).
4. Quando o Asaas confirma, as aulas entram no saldo na hora, com a validade contando do dia do pagamento,
   e a tela mostra "Pagamento confirmado".
5. Devolução feita no Asaas (desistência em até 7 dias) tira a compra do saldo automaticamente.

## Para conferir na primeira vez

- Cartão de débito: a cobrança é criada com a opção "o cliente escolhe a forma" no Asaas, e o aluno escolhe débito
  na página do Asaas. Conferir no teste se a opção de débito aparece para a conta da Letícia.
- Fazer uma compra de teste em cada forma (Pix, crédito à vista, crédito 2x, débito) antes de liberar para os alunos.
