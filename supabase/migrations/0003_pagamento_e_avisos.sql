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
