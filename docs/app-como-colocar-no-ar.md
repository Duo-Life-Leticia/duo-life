# App Duo Life: como ligar ao Supabase e colocar no ar

O código do app fica em `app/` (React + Vite, abre no navegador do celular e pode ser colocado na tela de início).
O banco de dados fica em `supabase/migrations/0001_inicial.sql`.
Sem as chaves do Supabase, o app abre em **modo demonstração**, com dados de exemplo.

## 1. Criar o banco de dados (uma vez só)

1. Entre no Supabase, no projeto **duo-life**.
2. Menu da esquerda: **SQL Editor** → **New query**.
3. Copie todo o conteúdo de `supabase/migrations/0001_inicial.sql`, cole e clique em **Run**.
4. Deve aparecer "Success. No rows returned".

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

## O que vem na próxima parte

- Tela do professor: lista e ficha dos alunos, cadastrar aluno por telefone, marcar aula no lugar do aluno,
  presença, cancelar aula (feriado ou chuva), registrar pagamento na praia, liberar atestado.
- Pagamento pelo app com o Asaas (Pix, crédito e débito).
- Mensagem no WhatsApp dos professores a cada aula marcada.
