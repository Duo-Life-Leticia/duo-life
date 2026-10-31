# Duo Life · Plataforma

Projeto do Alessandro para a Duo Life (Letícia, nutricionista, e Diogo, personal trainer): app de agendamento e compra de aulas do funcional na praia, em Santos.

## Regras

- Escreva sempre em português do Brasil, em linguagem simples.
- O Duo Life não se mistura com nenhum outro cliente ou projeto: nem no Claude, nem no GitHub, nem no Drive, nem no painel.
- Nada é programado sem a aprovação do Alessandro. A programação só começa depois que a Letícia e o Diogo aprovarem o escopo.
- Painéis e arquivos de outros projetos nunca são alterados a partir deste.
- Não citar nomes de outros clientes ou projetos em nada do Duo Life (documentos, painel, GitHub, Drive).
- Cadastro do aluno: nome completo, e-mail, data de nascimento, telefone (WhatsApp), CPF, RG, sexo e endereço (decisão do Alessandro, 31/10).
- O Diogo (professor) também cadastra aluno pela tela do professor, para quem não conseguir pelo app. Sem campo "gênero" (só "sexo").
- Acessos: a Letícia e o Diogo são administradores, com acesso total. O aluno vê só o que é dele (plano, saldo, validade, aulas, contrato), marca e cancela a própria aula, compra e renova.
- O aluno sempre vê quantas aulas faltam. Pós-venda automático: quando faltarem 2 aulas e quando faltar 1, o app manda mensagem (e-mail, SMS ou WhatsApp) com o novo contrato e o pagamento pelo app.
- Vagas: cada aula tem limite definido pela Letícia e pelo Diogo; agenda única e em tempo real para todos os alunos, sem superlotação nem marcação repetida. Mensagem automática para os alunos que ainda não marcaram em três momentos: com 3 vagas, com 1 vaga e quando lotar ("marque para o próximo dia").
- Agendar: só terças e quintas, até um mês para frente; cada aluno pode ter no máximo 4 aulas marcadas ao mesmo tempo (decisão do Alessandro, 31/10).
- Aluno sumido: quem fechou o plano e não marca aulas ou falta muito recebe mensagem automática pelo app incentivando a voltar (o professor marca presença para contar as faltas).
- Anamnese (PAR-Q) obrigatória no primeiro acesso, pedido do Diogo na reunião (transcrição, 26:14 a 29:35); fica na ficha com a data.
- Entrada no app: login é o e-mail do aluno; a senha é o próprio aluno que cria, no primeiro acesso (decisão do Alessandro, 31/10).
- Pagamento dentro do app, por Pix, crédito ou débito, direto na conta da Duo Life (decisão do Alessandro, 31/10).
- Tudo o que for feito usa as cores da logo (fundo azul-marinho `#021A4B`, botões e títulos dourados `#E8B04A`) até a aprovação da Letícia e do Diogo. Detalhes em `marca/identidade-visual.md`.

## Onde está cada coisa

- Transcrição da reunião de 30/10/2026: `docs/transcricao-reuniao-2026-10-30.txt`
- Resumo das conversas anteriores: `docs/historico-inicio.md`
- Informações da Letícia para o app (planos, horário, cadastro, pagamento, PAR-Q): `docs/informacoes-leticia-2026-10-31.md`
- Ideias tiradas dos prints do MFit (só contexto, sem imagens): `docs/referencia-mfit.md`
- Pagamento (decisão e comparação de serviços): `docs/pagamento.md`
- Logo e cores: `marca/` (`logo-duo-life.jpg`, `logo-duo-life-horizontal.jpg`, `identidade-visual.md`)
- Documento do projeto (escopo): https://docs.google.com/document/d/1-GWToSORRFPkXWvnjf5Vs_UazFg01SBf_rFNpR77270/edit
- Painel de controle: https://claude.ai/artifact/VohgRMLrRaPzMrKJGgNP2X (código em `painel/painel-duo-life.html`, com a logo publicada junto como `logo-duo-life-horizontal.jpg`; tarefas, status, resumo "Onde estamos" e histórico ficam no banco de dados do painel, coleções `tarefas`, `estado` e `historico`)
- Google Drive, pasta Plataforma - Clientes → Duo Life (id 1RhNF1ive4pycA4-j-Rz74OuCDx0xVim0):
  - 00 - Painel de Controle: 1VoXPo2ftmN59j_1mCjoYxCG67PFmvwgy
  - 01 - Documentos do Projeto: 1rQNsWckzYnu_vWSZd-1dih5bs8d7oxTr
  - 02 - Arquivos da Empresa: 1fGEtWWbHWgHoQEBWskn1HsotI08cA4ho
  - Reunioes: 1Y3XxDQOWKZzyF44GjTYtLCxNUop2zz2H

## Pendências em 31/10/2026

- O Alessandro manda o escopo para a Letícia e o Diogo até domingo, 01/11/2026.
- O vídeo da reunião (`2026-10-30 19-20-36.mp4`) já está na pasta Reunioes (movido pelo Alessandro em 31/10).
- Logo recebida em 31/10/2026 (está em `marca/`). Prints do MFit recebidos: usar só como contexto, sem guardar as imagens.
- Aguardando da Letícia e do Diogo: prints da Velocity, valores e validade dos planos, slogan, e o e-mail da Duo Life para o Alessandro criar as contas do app (GitHub, banco de dados, hospedagem).
