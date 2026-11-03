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
