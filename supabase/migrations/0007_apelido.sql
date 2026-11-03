-- Duo Life · "Como quer ser chamado" (apelido) para a saudação do app
-- Como usar: depois do 0006, cole este arquivo no "SQL Editor" do Supabase e clique em "Run".
-- Pode ser rodado mais de uma vez.

alter table public.perfis add column if not exists apelido text;

-- Quem já tem cadastro: usa o primeiro nome (quando o nome não é um e-mail).
update public.perfis
set apelido = split_part(trim(nome_completo), ' ', 1)
where apelido is null and trim(nome_completo) <> '' and nome_completo not like '%@%';

-- Cadastro novo: guarda o apelido junto com os outros dados.
create or replace function public.criar_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfis (id, nome_completo, apelido, email, data_nascimento, telefone, cpf, rg, sexo, endereco)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome_completo', ''),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'apelido'), ''),
             nullif(split_part(trim(coalesce(new.raw_user_meta_data ->> 'nome_completo', '')), ' ', 1), '')),
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

-- O próprio aluno pode mudar o apelido em "Meu perfil".
grant update (apelido) on public.perfis to authenticated;
