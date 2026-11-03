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
