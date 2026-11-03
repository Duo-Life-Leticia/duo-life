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
