# App Duo Life: como ligar ao Supabase e colocar no ar

O código do app fica em `app/` (React + Vite, abre no navegador do celular e pode ser colocado na tela de início).
O banco de dados fica em `supabase/migrations/0001_inicial.sql`.
Sem as chaves do Supabase, o app abre em **modo demonstração**, com dados de exemplo.

## 1. Criar o banco de dados (uma vez só)

1. Entre no Supabase, no projeto **duo-life**.
2. Menu da esquerda: **SQL Editor** → **New query**.
3. Copie todo o conteúdo de `supabase/migrations/0001_inicial.sql`, cole e clique em **Run**.
4. Deve aparecer "Success. No rows returned".
5. Faça o mesmo com `supabase/migrations/0002_tela_professor.sql` (funções da tela do professor)
   e com `supabase/migrations/0003_pagamento_e_avisos.sql` (pagamento pelo app e avisos para os professores).
6. O pagamento pelo Asaas tem o passo a passo próprio em `docs/asaas-como-ligar.md`.

## 1b. Função "Cadastrar aluno" (o professor cadastra quem não conseguiu pelo app)

1. No Supabase: **Edge Functions** → **Deploy a new function** → **Via Editor**.
2. Nome da função: `cadastrar-aluno` (exatamente assim).
3. Apague o exemplo, cole o conteúdo de `supabase/functions/cadastrar-aluno/index.ts` e clique em **Deploy function**.
4. As chaves que a função usa já vêm prontas no Supabase; não precisa configurar nada.

## 2. Ajustes do login no Supabase

1. **Authentication → Sign In / Providers → Email**: deixe "Enable email provider" ligado e
   "Confirm email" ligado (o aluno confirma o e-mail antes de entrar).
2. **Authentication → URL Configuration → Site URL**: coloque o endereço do app na Vercel
   (por exemplo `https://duo-life.vercel.app`). Em "Redirect URLs", adicione o mesmo endereço com `/**` no fim.

## 3. Pegar as duas chaves do app

Em **Project Settings → API** (ou "API Keys"):
- **Project URL** → vai em `VITE_SUPABASE_URL`
- **anon public** (chave pública) → vai em `VITE_SUPABASE_ANON_KEY`

A chave pública pode ficar no app. **Nunca** use nem mande a chave `service_role` (secreta).

## 4. Colocar no ar na Vercel

1. Na Vercel: **Add New → Project** → importar o repositório `Duo-Life-Leticia/duo-life`.
2. **Root Directory**: `app`. Framework: Vite (a Vercel detecta sozinha).
3. **Environment Variables**: cadastre `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
4. **Deploy**.

Observação: no plano gratuito (Hobby), a Vercel pode não aceitar repositório privado de organização do GitHub.
Se aparecer esse aviso, a saída é o plano Pro ou deixar o repositório público (não tem senha nem dado de aluno no código).

## 5. Tornar a Letícia e o Diogo administradores

Depois que os dois se cadastrarem no app, rode no **SQL Editor** (trocando pelos e-mails deles):

```sql
update public.perfis set papel = 'admin'
where email in ('email-da-leticia@exemplo.com', 'email-do-diogo@exemplo.com');
```

Ao entrar de novo, eles veem a **tela do professor**, e não a do aluno.

## 6. Primeiros passos no app

1. O professor entra e toca em **"Abrir aulas dos próximos 60 dias"** (cria terças e quintas, 8h às 9h).
2. Enquanto o pagamento pelo app não está pronto, a compra paga na praia é registrada no Supabase
   (**Table Editor → compras**) ou pela tela do professor, quando essa parte ficar pronta.

## O que já funciona (Etapa 1, primeira parte)

- Entrada com e-mail e senha, "Esqueci minha senha" e criação de senha nova.
- Cadastro com nome completo, e-mail, data de nascimento, WhatsApp (+55), CPF, RG, sexo e endereço.
- PAR-Q obrigatório com as 7 perguntas; com "sim", o agendamento só libera depois do atestado.
- Tela do aluno: balão com o saldo ("faltam X aulas"), botões Agendar aula e Comprar aulas, próximas aulas.
- Agenda: terças e quintas, até 1 mês para frente, no máximo 2 aulas marcadas, aviso de vagas, aula cheia.
- Cancelamento até 6 horas antes (a aula volta para o saldo); depois disso não cancela.
- Planos com valor, validade, preço por aula e bônus Guia DUO LIFE.
- Tela do professor separada: agenda com o número de alunos por aula e abrir aulas.
- Segurança: o aluno só vê os próprios dados; só a Letícia e o Diogo veem tudo.

## Tela do professor (Etapa 1, segunda parte)

- Agenda da última semana até um mês para frente, com o número de alunos e de presentes.
- Em cada aula: lista de alunos com WhatsApp, presença (Presente / Faltou), limite de vagas e cancelar aula (chuva, feriado).
- Alunos: lista com busca, saldo e situação do PAR-Q (ok, sem PAR-Q, falta atestado).
- Ficha do aluno: dados e idade, respostas do PAR-Q, "Atestado entregue: liberar agendamento",
  registrar pagamento feito na praia, marcar aula para o aluno, histórico de aulas e compras.
- Novo aluno: o professor cadastra e o aluno recebe um e-mail para criar a senha.

## Pagamento e avisos (Etapa 1, terceira parte)

- Compra pelo app: escolha de Pix, crédito (2x no Tubarão) ou débito, aceite do contrato e Pix dentro do app.
  Pronto, só falta ligar ao Asaas (`docs/asaas-como-ligar.md`).
- Contrato completo dentro do app (tela "Contrato").
- Aba "Avisos" do professor, com contador: cada aula marcada ou cancelada pelos alunos.
  A notificação no celular (fora do app) entra na Etapa 2, junto com os avisos dos alunos.
