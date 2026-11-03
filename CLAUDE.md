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
- O aluno sempre vê quantas aulas faltam. Pós-venda automático: quando faltarem 2 aulas e quando faltar 1, o app manda notificação no celular (mais para frente, também no grupo de WhatsApp da comunidade) com o novo contrato e o pagamento pelo app (respostas de 02/11).
- Vagas: sem limite nos 3 primeiros meses de funcionamento (03/11); quando o limite for ligado, cada aula tem limite definido pela Letícia e pelo Diogo; agenda única e em tempo real para todos os alunos, sem superlotação nem marcação repetida. Mensagem automática para os alunos que ainda não marcaram em três momentos: com 3 vagas, com 1 vaga e quando lotar ("marque para o próximo dia").
- Agendar: só terças e quintas, das 8h às 9h (03/11), até um mês para frente; cada aluno pode ter no máximo 2 aulas marcadas ao mesmo tempo (decisão da Letícia e do Diogo, 02/11). Cancelamento até 6h antes; feriado sem aula; chuva não tira crédito.
- Aluno sumido: depois de 10 dias sem marcar aula ou de 2 faltas seguidas, o app manda notificação incentivando a voltar, com os textos do escopo (03/11); o professor marca presença para contar as faltas.
- Anamnese (PAR-Q) obrigatória no primeiro acesso, pedido do Diogo na reunião (transcrição, 26:14 a 29:35); fica na ficha com a data, vale 6 meses e também existe impresso.
- Entrada no app: login é o e-mail do aluno; a senha é o próprio aluno que cria, no primeiro acesso (decisão do Alessandro, 31/10).
- Pagamento dentro do app, por Pix, crédito ou débito, direto na conta da Duo Life (decisão do Alessandro, 31/10). Serviço: Asaas, na conta que a Letícia já tem (03/11). Na praia: celular (Asaas Tap), maquininha (Asaas Smart) e Pix (03/11).
- Planos: Sardinha 5 aulas R$ 230 (30 dias), Água-Viva 10 aulas R$ 420 (50 dias), Tubarão 20 aulas R$ 720 (80 dias). Sem comentários/avaliações e sem aviso de validade. Slogan: "Dois pilares. Um resultado." (03/11).
- Tudo o que for feito usa as cores da logo (fundo azul-marinho `#021A4B`, botões e títulos dourados `#E8B04A`) até a aprovação da Letícia e do Diogo. Detalhes em `marca/identidade-visual.md`.

## Onde está cada coisa

- Transcrição da reunião de 30/10/2026: `docs/transcricao-reuniao-2026-10-30.txt`
- Resumo das conversas anteriores: `docs/historico-inicio.md`
- Informações da Letícia para o app (planos, horário, cadastro, pagamento, PAR-Q): `docs/informacoes-leticia-2026-10-31.md`
- Ideias tiradas dos prints do MFit (só contexto, sem imagens): `docs/referencia-mfit.md`
- Pagamento (decisão e comparação de serviços): `docs/pagamento.md`
- Perguntas do PAR-Q (só o texto): `docs/par-q.md`
- Contrato (versão 2, 03/11): Google Docs https://docs.google.com/document/d/15aD4HmgssrDkB8G6LMA4d222vEw3cnFIgWcEesjPVYE/edit (pasta 01); cópia em `docs/contrato-rascunho.html`
- Respostas da Letícia ao escopo (02/11): `docs/respostas-leticia-2026-11-02.md`
- Logo e cores: `marca/` (`logo-duo-life.jpg`, `logo-duo-life-horizontal.jpg`, `identidade-visual.md`)
- Documento do projeto (escopo): https://docs.google.com/document/d/1-GWToSORRFPkXWvnjf5Vs_UazFg01SBf_rFNpR77270/edit
- Painel de controle: https://claude.ai/artifact/VohgRMLrRaPzMrKJGgNP2X (código em `painel/painel-duo-life.html`, com a logo publicada junto como `logo-duo-life-horizontal.jpg`; tarefas, status, resumo "Onde estamos" e histórico ficam no banco de dados do painel, coleções `tarefas`, `estado` e `historico`). O painel também guarda uma cópia desses dados dentro da página, para quem abre sem conta Claude (Letícia, Diogo, qualquer aparelho). Depois de mudar os dados, baixe as coleções com o ArtifactData (out_dir) e rode `python3 painel/atualizar-copia.py <pasta>` antes de publicar de novo
- Google Drive, pasta Plataforma - Clientes → Duo Life (id 1RhNF1ive4pycA4-j-Rz74OuCDx0xVim0):
  - 00 - Painel de Controle: 1VoXPo2ftmN59j_1mCjoYxCG67PFmvwgy
  - 01 - Documentos do Projeto: 1rQNsWckzYnu_vWSZd-1dih5bs8d7oxTr
  - 02 - Arquivos da Empresa: 1fGEtWWbHWgHoQEBWskn1HsotI08cA4ho
  - Reunioes: 1Y3XxDQOWKZzyF44GjTYtLCxNUop2zz2H

## Pendências em 02/11/2026

- Escopo enviado pelo Alessandro para a Letícia e o Diogo em 01/11/2026. Agora eles revisam e respondem a pauta da próxima reunião.
- O vídeo da reunião (`2026-10-30 19-20-36.mp4`) já está na pasta Reunioes (movido pelo Alessandro em 31/10).
- Logo recebida em 31/10/2026 (está em `marca/`). Prints do MFit recebidos: usar só como contexto, sem guardar as imagens.
- Respostas da Letícia recebidas em 02/11 e passadas para o escopo (versão 3) e para o painel.
- GitHub (decidido em 03/11): fica na organização Duo-Life-Leticia, administrada pela conta pessoal do Alessandro, separada das organizações dos outros projetos. Para transferir, a Letícia vira dona da organização. Supabase e Vercel: a definir no mesmo modelo (separados dos outros projetos), depois transferidos para duolife.ltda@gmail.com.
- Aguardando: prints da Velocity (o Alessandro acha que já mandou, mas só chegaram prints do MFit). Contrato v2 (03/11) com as decisões do Alessandro: CPF da Letícia, validade a partir da compra, desistência em até 7 dias com devolução total e sem multa, como manda o CDC art. 49, uso de imagem incluído, atestado obrigatório com "sim" no PAR-Q. Faltam nome completo e CPF da Letícia e sobrenome do Diogo (em vermelho).
