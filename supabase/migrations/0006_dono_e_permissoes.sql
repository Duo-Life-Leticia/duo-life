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
