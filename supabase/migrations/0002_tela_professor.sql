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
