-- Duo Life · banco de dados completo, para colar de uma vez no SQL Editor do Supabase.
-- Gerado a partir de supabase/migrations/0001 a 0006. Antes de rodar, ligue a extensão pg_cron (Database → Extensions).

-- ============================================================
-- 0001_inicial.sql
-- ============================================================
-- Duo Life · banco de dados inicial (Etapa 1 · Aplicativo básico)
-- Como usar: no Supabase, abra "SQL Editor", cole este arquivo inteiro e clique em "Run".
-- Fuso horário das aulas: America/Sao_Paulo.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------

create type public.papel_usuario as enum ('aluno', 'admin');

-- Um perfil para cada pessoa cadastrada (o login fica em auth.users).
create table public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  nome_completo text not null,
  email text not null,
  data_nascimento date,
  telefone text,
  cpf text,
  rg text,
  sexo text check (sexo in ('feminino', 'masculino')),
  endereco text,
  papel public.papel_usuario not null default 'aluno',
  criado_em timestamptz not null default now()
);

-- PAR-Q: 7 respostas Sim/Não. Vale 6 meses. Com algum "sim", só agenda depois do atestado.
create table public.parq (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.perfis (id) on delete cascade,
  respostas jsonb not null,
  tem_sim boolean not null,
  atestado_entregue boolean not null default false,
  respondido_em timestamptz not null default now(),
  valido_ate date not null default ((now() at time zone 'America/Sao_Paulo')::date + interval '6 months')::date
);
create index parq_aluno on public.parq (aluno_id, respondido_em desc);

-- Planos do funcional.
create table public.planos (
  id text primary key,
  nome text not null,
  aulas int not null check (aulas > 0),
  valor_centavos int not null check (valor_centavos >= 0),
  validade_dias int not null check (validade_dias > 0),
  parcelas_max int not null default 1,
  ordem int not null default 0,
  ativo boolean not null default true
);

insert into public.planos (id, nome, aulas, valor_centavos, validade_dias, parcelas_max, ordem) values
  ('sardinha', 'Sardinha', 5, 23000, 30, 1, 1),
  ('agua-viva', 'Água-Viva', 10, 42000, 50, 1, 2),
  ('tubarao', 'Tubarão', 20, 72000, 80, 2, 3);

-- Compras de plano. A validade conta a partir do pagamento confirmado.
create table public.compras (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.perfis (id) on delete cascade,
  plano_id text not null references public.planos (id),
  aulas_total int not null,
  valor_centavos int not null,
  forma_pagamento text check (forma_pagamento in ('pix', 'credito', 'debito', 'presencial')),
  status text not null default 'pendente' check (status in ('pendente', 'pago', 'cancelado', 'devolvido')),
  pago_em timestamptz,
  valido_ate date,
  pagamento_externo_id text,
  criado_em timestamptz not null default now()
);
create index compras_aluno on public.compras (aluno_id, status, valido_ate);

-- Aulas (terças e quintas, 8h às 9h). limite nulo = sem limite de vagas.
create table public.aulas (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  inicio time not null default '08:00',
  fim time not null default '09:00',
  limite int check (limite is null or limite > 0),
  cancelada boolean not null default false,
  motivo_cancelamento text,
  unique (data, inicio)
);

-- Agendamentos. Cada um usa 1 aula de uma compra paga.
create table public.agendamentos (
  id uuid primary key default gen_random_uuid(),
  aula_id uuid not null references public.aulas (id) on delete cascade,
  aluno_id uuid not null references public.perfis (id) on delete cascade,
  compra_id uuid not null references public.compras (id),
  status text not null default 'marcado' check (status in ('marcado', 'cancelado', 'presente', 'falta')),
  criado_em timestamptz not null default now(),
  cancelado_em timestamptz,
  marcado_por uuid references public.perfis (id)
);
create unique index agendamento_unico on public.agendamentos (aula_id, aluno_id) where status <> 'cancelado';
create index agendamentos_aluno on public.agendamentos (aluno_id, status);

-- ---------------------------------------------------------------------------
-- Funções de apoio
-- ---------------------------------------------------------------------------

create or replace function public.agora_sp() returns timestamp
language sql stable as $$ select now() at time zone 'America/Sao_Paulo' $$;

create or replace function public.eh_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfis where id = auth.uid() and papel = 'admin')
$$;

-- Cria o perfil quando alguém se cadastra (os dados vêm do formulário de cadastro).
create or replace function public.criar_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfis (id, nome_completo, email, data_nascimento, telefone, cpf, rg, sexo, endereco)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome_completo', ''),
    new.email,
    nullif(new.raw_user_meta_data ->> 'data_nascimento', '')::date,
    new.raw_user_meta_data ->> 'telefone',
    new.raw_user_meta_data ->> 'cpf',
    new.raw_user_meta_data ->> 'rg',
    nullif(new.raw_user_meta_data ->> 'sexo', ''),
    new.raw_user_meta_data ->> 'endereco'
  );
  return new;
end $$;

create trigger ao_criar_usuario after insert on auth.users
  for each row execute function public.criar_perfil();

-- Aulas restantes de cada compra paga e dentro da validade.
create or replace function public.compras_com_saldo(p_aluno uuid)
returns table (compra_id uuid, plano_id text, aulas_total int, usadas int, restantes int, valido_ate date)
language sql stable security definer set search_path = public as $$
  select c.id, c.plano_id, c.aulas_total,
         count(a.id) filter (where a.status <> 'cancelado')::int as usadas,
         (c.aulas_total - count(a.id) filter (where a.status <> 'cancelado'))::int as restantes,
         c.valido_ate
  from public.compras c
  left join public.agendamentos a on a.compra_id = c.id
  where c.aluno_id = p_aluno and c.status = 'pago'
    and c.valido_ate >= (public.agora_sp())::date
    and (p_aluno = auth.uid() or public.eh_admin())
  group by c.id
  order by c.valido_ate
$$;

-- Resumo para o balão de saldo da tela inicial.
create or replace function public.meu_saldo()
returns table (aulas_total int, usadas int, restantes int, valido_ate date)
language sql stable security definer set search_path = public as $$
  select coalesce(sum(aulas_total), 0)::int, coalesce(sum(usadas), 0)::int,
         coalesce(sum(restantes), 0)::int, max(valido_ate)
  from public.compras_com_saldo(auth.uid())
$$;

-- Aulas dos próximos 30 dias, com vagas e se o aluno já marcou.
create or replace function public.aulas_proximas()
returns table (id uuid, data date, inicio time, fim time, limite int, marcados int, minha_marcacao uuid)
language sql stable security definer set search_path = public as $$
  select au.id, au.data, au.inicio, au.fim, au.limite,
         (select count(*) from public.agendamentos g where g.aula_id = au.id and g.status <> 'cancelado')::int,
         (select g.id from public.agendamentos g where g.aula_id = au.id and g.aluno_id = auth.uid() and g.status = 'marcado' limit 1)
  from public.aulas au
  where not au.cancelada
    and (au.data + au.inicio) > public.agora_sp()
    and au.data <= (public.agora_sp())::date + 30
  order by au.data, au.inicio
$$;

-- Marcar aula, com todas as regras do escopo.
create or replace function public.marcar_aula(p_aula uuid, p_aluno uuid default null)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_aluno uuid := coalesce(p_aluno, auth.uid());
  v_aula public.aulas;
  v_parq public.parq;
  v_compra uuid;
  v_ocupadas int;
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta para marcar a aula.'; end if;
  if v_aluno <> auth.uid() and not public.eh_admin() then raise exception 'Sem permissão.'; end if;

  select * into v_aula from public.aulas where id = p_aula for update;
  if not found or v_aula.cancelada then raise exception 'Esta aula não está disponível.'; end if;
  if (v_aula.data + v_aula.inicio) <= public.agora_sp() then raise exception 'Esta aula já começou.'; end if;
  if v_aula.data > (public.agora_sp())::date + 30 then raise exception 'Dá para marcar aulas só até um mês para frente.'; end if;

  select * into v_parq from public.parq where aluno_id = v_aluno order by respondido_em desc limit 1;
  if not found or v_parq.valido_ate < v_aula.data then
    raise exception 'Responda o questionário de saúde (PAR-Q) antes de marcar.';
  end if;
  if v_parq.tem_sim and not v_parq.atestado_entregue then
    raise exception 'Entregue o atestado médico ao professor para liberar o agendamento.';
  end if;

  if exists (select 1 from public.agendamentos where aula_id = p_aula and aluno_id = v_aluno and status <> 'cancelado') then
    raise exception 'Você já marcou esta aula.';
  end if;

  if (select count(*) from public.agendamentos g join public.aulas au on au.id = g.aula_id
      where g.aluno_id = v_aluno and g.status = 'marcado' and (au.data + au.inicio) > public.agora_sp()) >= 2 then
    raise exception 'Você já tem 2 aulas marcadas. Depois de fazer uma, dá para marcar a próxima.';
  end if;

  if v_aula.limite is not null then
    select count(*) into v_ocupadas from public.agendamentos where aula_id = p_aula and status <> 'cancelado';
    if v_ocupadas >= v_aula.limite then raise exception 'Aula cheia. Marque sua aula para o próximo dia.'; end if;
  end if;

  select c.id into v_compra
  from public.compras c
  where c.aluno_id = v_aluno and c.status = 'pago' and c.valido_ate >= v_aula.data
    and c.aulas_total > (select count(*) from public.agendamentos g where g.compra_id = c.id and g.status <> 'cancelado')
  order by c.valido_ate
  limit 1;
  if v_compra is null then raise exception 'Você não tem aulas no saldo para esta data. Compre um plano para marcar.'; end if;

  insert into public.agendamentos (aula_id, aluno_id, compra_id, marcado_por)
  values (p_aula, v_aluno, v_compra, auth.uid())
  returning id into v_id;
  return v_id;
end $$;

-- Cancelar: até 6 horas antes, a aula volta para o saldo. Depois disso, não cancela (conta como feita).
create or replace function public.cancelar_agendamento(p_agendamento uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_ag public.agendamentos;
  v_inicio timestamp;
begin
  select * into v_ag from public.agendamentos where id = p_agendamento for update;
  if not found or v_ag.status <> 'marcado' then raise exception 'Agendamento não encontrado.'; end if;
  if v_ag.aluno_id <> auth.uid() and not public.eh_admin() then raise exception 'Sem permissão.'; end if;

  select (data + inicio) into v_inicio from public.aulas where id = v_ag.aula_id;
  if not public.eh_admin() and v_inicio - public.agora_sp() < interval '6 hours' then
    raise exception 'O cancelamento só pode ser feito até 6 horas antes da aula. Agora a aula conta como feita.';
  end if;

  update public.agendamentos set status = 'cancelado', cancelado_em = now() where id = p_agendamento;
end $$;

-- Professor: cria as aulas de terça e quinta, das 8h às 9h, para os próximos dias.
create or replace function public.gerar_aulas(p_dias int default 60)
returns int
language plpgsql security definer set search_path = public as $$
declare
  d date;
  n int := 0;
begin
  if not public.eh_admin() then raise exception 'Só a Letícia e o Diogo podem abrir aulas.'; end if;
  for d in select generate_series((public.agora_sp())::date, (public.agora_sp())::date + p_dias, interval '1 day')::date loop
    if extract(isodow from d) in (2, 4) then
      insert into public.aulas (data) values (d) on conflict (data, inicio) do nothing;
      if found then n := n + 1; end if;
    end if;
  end loop;
  return n;
end $$;

-- Professor: cancela uma aula (feriado, chuva). Os agendamentos voltam para o saldo dos alunos.
create or replace function public.cancelar_aula(p_aula uuid, p_motivo text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.eh_admin() then raise exception 'Sem permissão.'; end if;
  update public.aulas set cancelada = true, motivo_cancelamento = p_motivo where id = p_aula;
  update public.agendamentos set status = 'cancelado', cancelado_em = now() where aula_id = p_aula and status = 'marcado';
end $$;

-- ---------------------------------------------------------------------------
-- Segurança (RLS): o aluno só vê o que é dele; Letícia e Diogo (admin) veem tudo.
-- ---------------------------------------------------------------------------

alter table public.perfis enable row level security;
alter table public.parq enable row level security;
alter table public.planos enable row level security;
alter table public.compras enable row level security;
alter table public.aulas enable row level security;
alter table public.agendamentos enable row level security;

create policy perfis_ver on public.perfis for select using (id = auth.uid() or public.eh_admin());
create policy perfis_editar on public.perfis for update using (id = auth.uid() or public.eh_admin());
-- O aluno edita os próprios dados, mas não o papel.
revoke update on public.perfis from authenticated;
grant update (nome_completo, data_nascimento, telefone, cpf, rg, sexo, endereco) on public.perfis to authenticated;

create policy parq_ver on public.parq for select using (aluno_id = auth.uid() or public.eh_admin());
create policy parq_responder on public.parq for insert with check (aluno_id = auth.uid() or public.eh_admin());
create policy parq_admin on public.parq for update using (public.eh_admin());
revoke update on public.parq from authenticated;
grant update (atestado_entregue) on public.parq to authenticated;

-- Planos: qualquer pessoa vê (inclusive quem ainda não tem conta).
create policy planos_ver on public.planos for select using (true);
create policy planos_admin on public.planos for all using (public.eh_admin()) with check (public.eh_admin());

create policy compras_ver on public.compras for select using (aluno_id = auth.uid() or public.eh_admin());
create policy compras_admin on public.compras for all using (public.eh_admin()) with check (public.eh_admin());

create policy aulas_ver on public.aulas for select using (auth.uid() is not null);
create policy aulas_admin on public.aulas for all using (public.eh_admin()) with check (public.eh_admin());

create policy agendamentos_ver on public.agendamentos for select using (aluno_id = auth.uid() or public.eh_admin());
create policy agendamentos_admin on public.agendamentos for all using (public.eh_admin()) with check (public.eh_admin());

grant execute on function public.meu_saldo, public.aulas_proximas, public.marcar_aula, public.cancelar_agendamento,
  public.compras_com_saldo, public.gerar_aulas, public.cancelar_aula, public.eh_admin to authenticated;

-- ============================================================
-- 0002_tela_professor.sql
-- ============================================================
-- Duo Life · tela do professor (Etapa 1, segunda parte)
-- Como usar: depois do 0001_inicial.sql, cole este arquivo no "SQL Editor" do Supabase e clique em "Run".

-- Lista de alunos com saldo, validade e situação do PAR-Q (só para a Letícia e o Diogo).
create or replace function public.alunos_resumo()
returns table (id uuid, nome_completo text, email text, telefone text, restantes int, valido_ate date, parq text)
language sql stable security definer set search_path = public as $$
  select p.id, p.nome_completo, p.email, p.telefone,
         coalesce((select sum(s.restantes) from public.compras_com_saldo(p.id) s), 0)::int,
         (select max(s.valido_ate) from public.compras_com_saldo(p.id) s),
         case
           when q.id is null or q.valido_ate < (public.agora_sp())::date then 'pendente'
           when q.tem_sim and not q.atestado_entregue then 'atestado'
           else 'ok'
         end
  from public.perfis p
  left join lateral (select * from public.parq where aluno_id = p.id order by respondido_em desc limit 1) q on true
  where p.papel = 'aluno' and public.eh_admin()
  order by p.nome_completo
$$;

-- Agenda do professor: aulas de alguns dias atrás (para marcar presença) até um mês para frente.
create or replace function public.aulas_periodo(p_dias_antes int default 7, p_dias_depois int default 30)
returns table (id uuid, data date, inicio time, fim time, limite int, cancelada boolean, motivo_cancelamento text,
               marcados int, presentes int)
language sql stable security definer set search_path = public as $$
  select au.id, au.data, au.inicio, au.fim, au.limite, au.cancelada, au.motivo_cancelamento,
         (select count(*) from public.agendamentos g where g.aula_id = au.id and g.status <> 'cancelado')::int,
         (select count(*) from public.agendamentos g where g.aula_id = au.id and g.status = 'presente')::int
  from public.aulas au
  where public.eh_admin()
    and au.data between (public.agora_sp())::date - p_dias_antes and (public.agora_sp())::date + p_dias_depois
  order by au.data, au.inicio
$$;

-- Pagamento feito na praia (celular, maquininha ou Pix): o professor registra e as aulas entram no saldo.
-- A validade conta a partir da data do pagamento.
create or replace function public.registrar_pagamento(p_aluno uuid, p_plano text, p_forma text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_plano public.planos;
  v_id uuid;
begin
  if not public.eh_admin() then raise exception 'Só a Letícia e o Diogo podem registrar pagamentos.'; end if;
  if p_forma not in ('pix', 'credito', 'debito', 'presencial') then raise exception 'Forma de pagamento inválida.'; end if;
  select * into v_plano from public.planos where id = p_plano and ativo;
  if not found then raise exception 'Plano não encontrado.'; end if;
  insert into public.compras (aluno_id, plano_id, aulas_total, valor_centavos, forma_pagamento, status, pago_em, valido_ate)
  values (p_aluno, v_plano.id, v_plano.aulas, v_plano.valor_centavos, p_forma, 'pago', now(),
          (public.agora_sp())::date + v_plano.validade_dias)
  returning id into v_id;
  return v_id;
end $$;

-- Presença: o professor marca quem foi (presente) e quem faltou (falta).
create or replace function public.marcar_presenca(p_agendamento uuid, p_status text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.eh_admin() then raise exception 'Sem permissão.'; end if;
  if p_status not in ('presente', 'falta', 'marcado') then raise exception 'Situação inválida.'; end if;
  update public.agendamentos set status = p_status where id = p_agendamento and status <> 'cancelado';
end $$;

-- Atestado entregue: libera o agendamento de quem respondeu "sim" no PAR-Q.
create or replace function public.liberar_atestado(p_aluno uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.eh_admin() then raise exception 'Sem permissão.'; end if;
  update public.parq set atestado_entregue = true
  where id = (select id from public.parq where aluno_id = p_aluno order by respondido_em desc limit 1);
end $$;

-- Limite de vagas de uma aula (nulo = sem limite).
create or replace function public.definir_limite(p_aula uuid, p_limite int)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.eh_admin() then raise exception 'Sem permissão.'; end if;
  if p_limite is not null and p_limite < 1 then raise exception 'O limite precisa ser de pelo menos 1 vaga.'; end if;
  update public.aulas set limite = p_limite where id = p_aula;
end $$;

grant execute on function public.alunos_resumo, public.aulas_periodo, public.registrar_pagamento,
  public.marcar_presenca, public.liberar_atestado, public.definir_limite to authenticated;

-- ============================================================
-- 0003_pagamento_e_avisos.sql
-- ============================================================
-- Duo Life · pagamento pelo app (Asaas) e avisos para os professores (Etapa 1, terceira parte)
-- Como usar: depois do 0002, cole este arquivo no "SQL Editor" do Supabase e clique em "Run".

-- ---------------------------------------------------------------------------
-- Pagamento pelo app
-- ---------------------------------------------------------------------------

-- Cliente do aluno no Asaas (criado na primeira compra).
alter table public.perfis add column if not exists asaas_cliente_id text;

alter table public.compras
  add column if not exists parcelas int not null default 1 check (parcelas between 1 and 2),
  add column if not exists link_pagamento text,
  add column if not exists pix_copia_cola text,
  add column if not exists pix_qrcode text,
  add column if not exists contrato_versao text,
  add column if not exists contrato_aceito_em timestamptz;
create index if not exists compras_externo on public.compras (pagamento_externo_id);

-- O aluno começa uma compra: grava o plano, o valor e o aceite do contrato. Fica "pendente" até o Asaas confirmar.
create or replace function public.iniciar_compra(p_plano text, p_forma text, p_parcelas int, p_contrato_versao text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_plano public.planos;
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta para comprar.'; end if;
  if p_forma not in ('pix', 'credito', 'debito') then raise exception 'Escolha Pix, cartão de crédito ou cartão de débito.'; end if;
  if p_contrato_versao is null or p_contrato_versao = '' then raise exception 'Para comprar, leia e aceite o contrato.'; end if;
  select * into v_plano from public.planos where id = p_plano and ativo;
  if not found then raise exception 'Plano não encontrado.'; end if;
  if p_parcelas < 1 or p_parcelas > v_plano.parcelas_max then raise exception 'Este plano não pode ser parcelado assim.'; end if;
  if p_parcelas > 1 and p_forma <> 'credito' then raise exception 'O parcelamento é só no cartão de crédito.'; end if;
  insert into public.compras (aluno_id, plano_id, aulas_total, valor_centavos, forma_pagamento, status, parcelas, contrato_versao, contrato_aceito_em)
  values (auth.uid(), v_plano.id, v_plano.aulas, v_plano.valor_centavos, p_forma, 'pendente', p_parcelas, p_contrato_versao, now())
  returning id into v_id;
  return v_id;
end $$;

-- Usada só pela função do Asaas (chave secreta do servidor): pagamento confirmado libera as aulas.
-- A validade conta a partir da data do pagamento.
create or replace function public.confirmar_pagamento(p_compra uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.compras c
  set status = 'pago', pago_em = now(),
      valido_ate = (public.agora_sp())::date + (select validade_dias from public.planos p where p.id = c.plano_id)
  where c.id = p_compra and c.status = 'pendente';
end $$;

create or replace function public.estornar_pagamento(p_compra uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.compras set status = 'devolvido' where id = p_compra and status = 'pago';
end $$;

revoke execute on function public.confirmar_pagamento, public.estornar_pagamento from public, anon, authenticated;
grant execute on function public.iniciar_compra to authenticated;

-- ---------------------------------------------------------------------------
-- Avisos (notificações) — o professor é avisado a cada aula marcada ou cancelada
-- ---------------------------------------------------------------------------

create table if not exists public.avisos (
  id uuid primary key default gen_random_uuid(),
  destinatario uuid not null references public.perfis (id) on delete cascade,
  titulo text not null,
  texto text not null,
  link text,
  lido boolean not null default false,
  criado_em timestamptz not null default now()
);
create index if not exists avisos_destinatario on public.avisos (destinatario, lido, criado_em desc);

alter table public.avisos enable row level security;
create policy avisos_ver on public.avisos for select using (destinatario = auth.uid());
create policy avisos_ler on public.avisos for update using (destinatario = auth.uid());
revoke update on public.avisos from authenticated;
grant update (lido) on public.avisos to authenticated;

create or replace function public.dia_da_aula(p_aula uuid) returns text
language sql stable security definer set search_path = public as $$
  select (array['domingo','segunda','terça','quarta','quinta','sexta','sábado'])[extract(dow from data)::int + 1]
         || ', ' || to_char(data, 'DD/MM') || ', às ' || extract(hour from inicio)::int || 'h'
  from public.aulas where id = p_aula
$$;

create or replace function public.avisar_professores() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_nome text;
  v_titulo text;
  v_texto text;
begin
  select split_part(nome_completo, ' ', 1) || coalesce(' ' || nullif(split_part(nome_completo, ' ', 2), ''), '')
    into v_nome from public.perfis where id = new.aluno_id;
  if tg_op = 'INSERT' then
    v_titulo := 'Aula marcada';
    v_texto := case when new.marcado_por is distinct from new.aluno_id
      then 'Aula de ' || public.dia_da_aula(new.aula_id) || ' marcada para ' || v_nome || '.'
      else v_nome || ' marcou a aula de ' || public.dia_da_aula(new.aula_id) || '.' end;
  elsif new.status = 'cancelado' and old.status = 'marcado' and auth.uid() = new.aluno_id then
    v_titulo := 'Aula cancelada';
    v_texto := v_nome || ' cancelou a aula de ' || public.dia_da_aula(new.aula_id) || '.';
  else
    return new;
  end if;
  -- Não avisa o professor que fez a ação.
  insert into public.avisos (destinatario, titulo, texto, link)
  select p.id, v_titulo, v_texto, '/professor/aula/' || new.aula_id
  from public.perfis p
  where p.papel = 'admin' and p.id is distinct from auth.uid();
  return new;
end $$;

drop trigger if exists avisar_professores on public.agendamentos;
create trigger avisar_professores after insert or update of status on public.agendamentos
  for each row execute function public.avisar_professores();

-- ============================================================
-- 0004_avisos_automaticos_e_guias.sql
-- ============================================================
-- Duo Life · Etapa 2: avisos automáticos, notificação no celular e Guia DUO LIFE em PDF
-- Como usar: depois do 0003, cole este arquivo no "SQL Editor" do Supabase e clique em "Run".
-- Antes, ligue a extensão pg_cron em Database → Extensions (para o aviso diário de aluno sumido).

-- ---------------------------------------------------------------------------
-- Avisos: tipo (para não repetir o mesmo aviso) e controle do envio ao celular
-- ---------------------------------------------------------------------------

alter table public.avisos
  add column if not exists tipo text not null default 'geral',
  add column if not exists referencia text,
  add column if not exists enviado_celular boolean not null default false;

-- Inscrições para notificação no celular (uma por aparelho).
create table if not exists public.inscricoes_celular (
  id uuid primary key default gen_random_uuid(),
  usuario uuid not null references public.perfis (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  criado_em timestamptz not null default now()
);
alter table public.inscricoes_celular enable row level security;
create policy inscricoes_proprias on public.inscricoes_celular for all
  using (usuario = auth.uid()) with check (usuario = auth.uid());

-- ---------------------------------------------------------------------------
-- Funções internas (sem checagem de quem pede; só o banco usa)
-- ---------------------------------------------------------------------------

create or replace function public.saldo_restante(p_aluno uuid) returns int
language sql stable security definer set search_path = public as $$
  select coalesce(sum(c.aulas_total - (select count(*) from public.agendamentos g where g.compra_id = c.id and g.status <> 'cancelado')), 0)::int
  from public.compras c
  where c.aluno_id = p_aluno and c.status = 'pago' and c.valido_ate >= (public.agora_sp())::date
$$;

-- Aluno que pode marcar aula agora: tem saldo e PAR-Q em dia (com atestado, se precisar).
create or replace function public.pode_marcar(p_aluno uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.saldo_restante(p_aluno) > 0
     and exists (select 1 from public.parq q where q.aluno_id = p_aluno
                   and q.valido_ate >= (public.agora_sp())::date and (not q.tem_sim or q.atestado_entregue)
                   and q.respondido_em = (select max(respondido_em) from public.parq where aluno_id = p_aluno))
     and (select count(*) from public.agendamentos g join public.aulas a on a.id = g.aula_id
          where g.aluno_id = p_aluno and g.status = 'marcado' and (a.data + a.inicio) > public.agora_sp()) < 2
$$;

create or replace function public.dia_curto(p_aula uuid) returns text
language sql stable security definer set search_path = public as $$
  select (array['domingo','segunda','terça','quarta','quinta','sexta','sábado'])[extract(dow from data)::int + 1]
         || ', ' || extract(hour from inicio)::int || 'h'
  from public.aulas where id = p_aula
$$;

-- Avisa os alunos que podem marcar e ainda não estão nesta aula.
create or replace function public.avisar_alunos_da_aula(p_aula uuid, p_tipo text, p_titulo text, p_texto text, p_exceto uuid default null) returns void
language sql security definer set search_path = public as $$
  insert into public.avisos (destinatario, titulo, texto, link, tipo, referencia)
  select p.id, p_titulo, p_texto, '/agendar', p_tipo, p_aula::text
  from public.perfis p
  where p.papel = 'aluno' and p.id is distinct from p_exceto and public.pode_marcar(p.id)
    and not exists (select 1 from public.agendamentos g where g.aula_id = p_aula and g.aluno_id = p.id and g.status <> 'cancelado')
    and not exists (select 1 from public.avisos v where v.destinatario = p.id and v.tipo = p_tipo and v.referencia = p_aula::text)
$$;

revoke execute on function public.saldo_restante, public.pode_marcar, public.avisar_alunos_da_aula from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Avisos automáticos ligados à agenda
-- ---------------------------------------------------------------------------

create or replace function public.avisos_da_agenda() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_restantes int;
  v_limite int;
  v_ocupadas int;
  v_dia text;
begin
  select limite into v_limite from public.aulas where id = new.aula_id;
  select count(*) into v_ocupadas from public.agendamentos where aula_id = new.aula_id and status <> 'cancelado';
  v_dia := public.dia_curto(new.aula_id);

  if tg_op = 'INSERT' then
    -- 2.1 Renovação: quando faltarem 2 aulas e quando faltar 1.
    v_restantes := public.saldo_restante(new.aluno_id);
    -- Um aviso de cada por compra (não repete se o aluno cancelar e marcar de novo).
    if v_restantes in (1, 2) and not exists (select 1 from public.avisos where destinatario = new.aluno_id
         and tipo = 'renovacao-' || v_restantes and referencia = new.compra_id::text) then
      insert into public.avisos (destinatario, titulo, texto, link, tipo, referencia)
      values (new.aluno_id,
              case v_restantes when 2 then 'Restam apenas duas aulas!' else 'Resta apenas 1 aula.' end,
              case v_restantes when 2 then 'Renove o seu plano pelo app para continuar treinando com a gente.'
                                      else 'Renove o seu plano pelo app para não ficar sem treinar.' end,
              '/planos', 'renovacao-' || v_restantes, new.compra_id::text);
    end if;

    -- 1.8 Vagas (só quando a aula tem limite): com 3 vagas, com 1 vaga e quando lotar.
    if v_limite is not null then
      if v_limite - v_ocupadas = 3 then
        perform public.avisar_alunos_da_aula(new.aula_id, 'vagas-3', 'Só restam 3 vagas', 'Só restam 3 vagas para ' || v_dia || '. Garanta a sua!');
      elsif v_limite - v_ocupadas = 1 then
        perform public.avisar_alunos_da_aula(new.aula_id, 'vagas-1', 'Última vaga!', 'Última vaga para ' || v_dia || '!');
      elsif v_limite - v_ocupadas = 0 then
        perform public.avisar_alunos_da_aula(new.aula_id, 'vagas-0', 'Aula cheia', 'A aula de ' || v_dia || ' já está cheia. Marque sua aula para o próximo dia.');
      end if;
    end if;

  elsif new.status = 'cancelado' and old.status = 'marcado' then
    -- 2.3 Vaga liberada: a aula estava cheia e alguém cancelou.
    if v_limite is not null and v_ocupadas = v_limite - 1 then
      delete from public.avisos where tipo in ('vaga-liberada', 'vagas-0') and referencia = new.aula_id::text;
      perform public.avisar_alunos_da_aula(new.aula_id, 'vaga-liberada', 'Ainda temos vaga, vamos treinar?', 'Abriu uma vaga na aula de ' || v_dia || '.', new.aluno_id);
    end if;
  end if;
  return new;
end $$;

drop trigger if exists avisos_da_agenda on public.agendamentos;
create trigger avisos_da_agenda after insert or update of status on public.agendamentos
  for each row execute function public.avisos_da_agenda();

-- ---------------------------------------------------------------------------
-- 2.4 Aluno sumido: roda todo dia (9h de Brasília) pelo pg_cron
-- ---------------------------------------------------------------------------

create or replace function public.avisos_diarios() returns int
language plpgsql security definer set search_path = public as $$
declare
  n int := 0;
  r record;
begin
  for r in select p.id from public.perfis p where p.papel = 'aluno' and public.saldo_restante(p.id) > 0 loop
    -- 10 dias sem marcar aula (e sem aula marcada para frente).
    if not exists (select 1 from public.agendamentos g where g.aluno_id = r.id and g.criado_em > now() - interval '10 days')
       and not exists (select 1 from public.agendamentos g join public.aulas a on a.id = g.aula_id
                       where g.aluno_id = r.id and g.status = 'marcado' and (a.data + a.inicio) > public.agora_sp())
       and not exists (select 1 from public.avisos v where v.destinatario = r.id and v.tipo = 'sumido-10-dias' and v.criado_em > now() - interval '10 days')
       and (select min(pago_em) from public.compras where aluno_id = r.id and status = 'pago') < now() - interval '10 days'
    then
      insert into public.avisos (destinatario, titulo, texto, link, tipo)
      values (r.id, 'Não deixe de treinar!',
              'Faz 10 dias que você não marca uma aula, e ainda restam ' || public.saldo_restante(r.id) || ' aulas no seu plano. Bora para a praia?',
              '/agendar', 'sumido-10-dias');
      n := n + 1;
    end if;

    -- 2 faltas seguidas (avisa uma vez por falta mais recente).
    if (select bool_and(status = 'falta') and count(*) = 2 from (
          select g.status from public.agendamentos g join public.aulas a on a.id = g.aula_id
          where g.aluno_id = r.id and g.status in ('presente', 'falta')
          order by a.data desc, a.inicio desc limit 2) ultimas)
       and not exists (select 1 from public.avisos v where v.destinatario = r.id and v.tipo = 'duas-faltas'
                       and v.referencia = (select g.id::text from public.agendamentos g join public.aulas a on a.id = g.aula_id
                                           where g.aluno_id = r.id and g.status = 'falta' order by a.data desc, a.inicio desc limit 1))
    then
      insert into public.avisos (destinatario, titulo, texto, link, tipo, referencia)
      values (r.id, 'Sentimos sua falta!',
              'Você não veio nas duas últimas aulas. Ainda restam ' || public.saldo_restante(r.id) || ' aulas no seu plano: escolha o próximo dia e volte a treinar com a gente.',
              '/agendar', 'duas-faltas',
              (select g.id::text from public.agendamentos g join public.aulas a on a.id = g.aula_id
               where g.aluno_id = r.id and g.status = 'falta' order by a.data desc, a.inicio desc limit 1));
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;
revoke execute on function public.avisos_diarios from public, anon, authenticated;

-- Agenda o aviso diário às 12h UTC (9h em Brasília). Precisa da extensão pg_cron ligada.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('duo-life-avisos-diarios', '0 12 * * *', 'select public.avisos_diarios()');
  else
    raise notice 'pg_cron não está ligado: ligue em Database → Extensions e rode este arquivo de novo.';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2.5 Guia DUO LIFE em PDF (Storage do Supabase, pasta "guias", privada)
--   guia-duo-life.pdf       → todo aluno que já comprou um plano
--   nutricao-tubarao.pdf    → quem comprou o Plano Tubarão
-- ---------------------------------------------------------------------------

create or replace function public.pode_baixar_guia(p_arquivo text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.eh_admin()
      or (p_arquivo = 'guia-duo-life.pdf'
          and exists (select 1 from public.compras where aluno_id = auth.uid() and status = 'pago'))
      or (p_arquivo = 'nutricao-tubarao.pdf'
          and exists (select 1 from public.compras where aluno_id = auth.uid() and status = 'pago' and plano_id = 'tubarao'))
$$;
grant execute on function public.pode_baixar_guia to authenticated;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'buckets') then
    insert into storage.buckets (id, name, public) values ('guias', 'guias', false) on conflict (id) do nothing;
    execute $p$create policy guias_baixar on storage.objects for select to authenticated
      using (bucket_id = 'guias' and public.pode_baixar_guia(name))$p$;
    execute $p$create policy guias_enviar on storage.objects for insert to authenticated
      with check (bucket_id = 'guias' and public.eh_admin())$p$;
    execute $p$create policy guias_trocar on storage.objects for update to authenticated
      using (bucket_id = 'guias' and public.eh_admin())$p$;
    execute $p$create policy guias_apagar on storage.objects for delete to authenticated
      using (bucket_id = 'guias' and public.eh_admin())$p$;
  end if;
end $$;

-- ============================================================
-- 0005_perfil_e_marcos.sql
-- ============================================================
-- Duo Life · Etapa 3: perfil do aluno com evolução e marcos de 30 e 50 aulas
-- Como usar: depois do 0004, cole este arquivo no "SQL Editor" do Supabase e clique em "Run".

-- Resumo do perfil: desde quando treina, aulas feitas, faltas e aulas feitas por mês (últimos 6 meses).
create or replace function public.meu_perfil(p_aluno uuid default null)
returns table (inicio date, aulas_feitas int, faltas int, por_mes jsonb, proximo_marco int)
language sql stable security definer set search_path = public as $$
  with aluno as (select coalesce(p_aluno, auth.uid()) as id),
  feitas as (
    select a.data from public.agendamentos g join public.aulas a on a.id = g.aula_id, aluno
    where g.aluno_id = aluno.id and g.status = 'presente'
  ),
  meses as (
    select to_char(m, 'YYYY-MM') as mes
    from generate_series(date_trunc('month', (public.agora_sp())::date) - interval '5 months',
                         date_trunc('month', (public.agora_sp())::date), interval '1 month') m
  )
  select
    (select least(min(f.data), (select min(c.pago_em)::date from public.compras c, aluno where c.aluno_id = aluno.id and c.status = 'pago'))
       from feitas f),
    (select count(*) from feitas)::int,
    (select count(*) from public.agendamentos g, aluno where g.aluno_id = aluno.id and g.status = 'falta')::int,
    (select jsonb_agg(jsonb_build_object('mes', m.mes, 'aulas', (select count(*) from feitas f where to_char(f.data, 'YYYY-MM') = m.mes)) order by m.mes) from meses m),
    (select case when count(*) < 30 then 30 when count(*) < 50 then 50 else null end from feitas)::int
  from aluno
  where (select id from aluno) = auth.uid() or public.eh_admin()
$$;
grant execute on function public.meu_perfil to authenticated;

-- 3.2 Marcos: ao completar 30 e 50 aulas (presença marcada), avisa os professores e parabeniza o aluno.
create or replace function public.avisar_marcos() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_feitas int;
  v_nome text;
begin
  if new.status <> 'presente' or old.status = 'presente' then return new; end if;
  select count(*) into v_feitas from public.agendamentos where aluno_id = new.aluno_id and status = 'presente';
  if v_feitas not in (30, 50) then return new; end if;
  if exists (select 1 from public.avisos where tipo = 'marco-' || v_feitas and referencia = new.aluno_id::text) then return new; end if;

  select nome_completo into v_nome from public.perfis where id = new.aluno_id;
  insert into public.avisos (destinatario, titulo, texto, link, tipo, referencia)
  select p.id, v_feitas || ' aulas!', v_nome || ' completou ' || v_feitas || ' aulas. Que tal fazer um agrado?',
         '/professor/aluno/' || new.aluno_id, 'marco-' || v_feitas, new.aluno_id::text
  from public.perfis p where p.papel = 'admin';
  insert into public.avisos (destinatario, titulo, texto, link, tipo, referencia)
  values (new.aluno_id, 'Parabéns: ' || v_feitas || ' aulas!', 'Você completou ' || v_feitas || ' aulas com a Duo Life. Continue assim!',
          '/perfil', 'marco-' || v_feitas || '-aluno', new.aluno_id::text);
  return new;
end $$;

drop trigger if exists avisar_marcos on public.agendamentos;
create trigger avisar_marcos after update of status on public.agendamentos
  for each row execute function public.avisar_marcos();

-- ============================================================
-- 0006_dono_e_permissoes.sql
-- ============================================================
-- Duo Life · nível "dono" (Alessandro) acima de professor e permissões mais fechadas
-- Como usar: depois do 0005, cole este arquivo no "SQL Editor" do Supabase e clique em "Run".
-- Depois, marque a sua conta como dono (troque o e-mail):
--   update public.perfis set papel = 'admin', dono = true where email = 'seu-email@exemplo.com';

-- Dono: tudo o que o professor faz, mais escolher quem é professor e mudar planos e preços.
alter table public.perfis add column if not exists dono boolean not null default false;

create or replace function public.eh_dono() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfis where id = auth.uid() and dono)
$$;

-- O dono também conta como professor.
create or replace function public.eh_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfis where id = auth.uid() and (papel = 'admin' or dono))
$$;

grant execute on function public.eh_dono to authenticated;

-- ---------------------------------------------------------------------------
-- Professor: só as ações das telas (pelas funções do banco), sem mexer direto nas tabelas
-- ---------------------------------------------------------------------------

drop policy if exists planos_admin on public.planos;
drop policy if exists compras_admin on public.compras;
drop policy if exists aulas_admin on public.aulas;
drop policy if exists agendamentos_admin on public.agendamentos;
drop policy if exists parq_admin on public.parq;

-- Cada um edita só os próprios dados.
drop policy if exists perfis_editar on public.perfis;
create policy perfis_editar on public.perfis for update using (id = auth.uid());

-- Planos e preços: só o dono.
drop policy if exists planos_dono on public.planos;
create policy planos_dono on public.planos for all using (public.eh_dono()) with check (public.eh_dono());

-- ---------------------------------------------------------------------------
-- Equipe: o dono escolhe quem é professor
-- ---------------------------------------------------------------------------

create or replace function public.equipe()
returns table (id uuid, nome_completo text, email text, dono boolean)
language sql stable security definer set search_path = public as $$
  select p.id, p.nome_completo, p.email, p.dono
  from public.perfis p
  where (p.papel = 'admin' or p.dono) and public.eh_dono()
  order by p.dono desc, p.nome_completo
$$;

create or replace function public.definir_professor(p_email text, p_professor boolean)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_perfil public.perfis;
begin
  if not public.eh_dono() then raise exception 'Só o dono do app pode mudar a equipe.'; end if;
  select * into v_perfil from public.perfis where lower(email) = lower(trim(p_email));
  if not found then raise exception 'Não achei ninguém com este e-mail. A pessoa precisa se cadastrar no app primeiro.'; end if;
  if v_perfil.dono then raise exception 'A conta do dono não pode ser mudada por aqui.'; end if;
  update public.perfis set papel = case when p_professor then 'admin' else 'aluno' end::public.papel_usuario where id = v_perfil.id;
  return v_perfil.nome_completo;
end $$;

grant execute on function public.equipe, public.definir_professor to authenticated;
