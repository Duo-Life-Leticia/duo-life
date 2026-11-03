# Histórico: início do projeto Duo Life

Resumo da primeira conversa com o Claude (31/10/2026). A cópia completa está no Google Drive:
[Histórico da conversa com o Claude - início do projeto Duo Life](https://docs.google.com/document/d/1Poxdbl-DZ7Azv7Rpmzm54LUelkzEoXRc1yKtSlNHP7s/edit)
(pasta Plataforma - Clientes → Duo Life → 01 - Documentos do Projeto).

## Pedido do Alessandro

Projeto Duo Life (cliente novo, separado de tudo). Transcrever a reunião com a Letícia e o Diogo,
montar o documento do projeto e criar um painel de controle com todo o escopo, no mesmo formato usado em outros projetos do Alessandro.

## Regra principal

O Duo Life não se mistura com nenhum outro cliente ou projeto: nem no Claude, nem no GitHub, nem no painel.

## Onde fica cada coisa

- Transcrição da reunião de 30/10/2026: `docs/transcricao-reuniao-2026-10-30.txt` (Whisper, 54 min; pode ter erros de nomes)
- Google Drive: Plataforma - Clientes → Duo Life (00 - Painel de Controle, 01 - Documentos do Projeto, 02 - Arquivos da Empresa, Reunioes)
- Vídeo: `2026-10-30 19-20-36.mp4`, na raiz da pasta Duo Life no Drive
- Modelo a seguir: o painel de controle e o documento do projeto usados em outros projetos do Alessandro

## Prazo combinado na reunião

O Alessandro disse que manda o escopo para a Letícia e o Diogo até domingo (01/11/2026).

## O que falta

1. Documento do Projeto - Plataforma Duo Life (Drive, pasta 01), no formato padrão do Alessandro.
2. Painel de Controle Duo Life, com todo o escopo em etapas e tarefas.
3. Mover o vídeo para a pasta Reunioes (confirmar com o Alessandro).
4. Nada é programado sem a aprovação do Alessandro.

## Segunda conversa (31/10/2026)

- Documento do projeto criado no Drive (pasta 01): [Documento do Projeto - Plataforma Duo Life](https://docs.google.com/document/d/1-GWToSORRFPkXWvnjf5Vs_UazFg01SBf_rFNpR77270/edit)
- Painel de controle criado no Claude: [Painel Duo Life Plataforma](https://claude.ai/artifact/VohgRMLrRaPzMrKJGgNP2X) (código em `painel/painel-duo-life.html`; tarefas, status e histórico ficam no banco de dados do painel)
- Etapas propostas: 0 Escopo e preparação, 1 Aplicativo básico, 2 Avisos e conteúdo, 3 Perfil e divulgação
- Pendente: o Alessandro enviar o escopo até 01/11; confirmar se pode mover o vídeo para a pasta Reunioes

## Terceira conversa (31/10/2026)

- O Alessandro mandou a logo da Duo Life (sereia, sol e siri, em dourado sobre azul-marinho). Ela fica em `marca/`.
- Regra nova: tudo usa as cores da logo, fundo azul-marinho e botões dourados, até a Letícia e o Diogo aprovarem. Detalhes em `marca/identidade-visual.md`.
- O painel de controle foi atualizado com a logo e as cores. A tarefa 0.6 (receber a logo) foi marcada como concluída.
- A Letícia mandou pelo WhatsApp os planos (Sardinha 5, Água-Viva 10, Tubarão 20 aulas), o horário (7h às 8h), os dados do cadastro (nome completo, data de nascimento, telefone, CPF), o endereço só no pagamento com cartão e o PAR-Q obrigatório. Está em `docs/informacoes-leticia-2026-10-31.md`. Falta passar para o Documento do Projeto no Drive.
- Chegaram os prints do MFit (cadastro de aluno, ficha, PAR-Q). O Alessandro pediu para usar só o contexto, sem as imagens: as ideias estão em `docs/referencia-mfit.md`.
- Decisões do Alessandro: o cadastro mantém RG, sexo e endereço; o pagamento é feito dentro do app (Pix, crédito e débito), direto na conta da Duo Life, para o cliente não desistir na hora da compra. Comparação de serviços em `docs/pagamento.md` (recomendação: Asaas).
- Entrada no app: login com o e-mail do aluno e senha criada por ele mesmo no primeiro acesso (era o que o Diogo quis dizer). O e-mail entra no cadastro.
- O campo "gênero" do MFit fica de fora (o cadastro tem só "sexo"). O Diogo pode cadastrar o aluno pela tela do professor quando o aluno não conseguir pelo app.
- Documento do Projeto atualizado no Google Docs (versão 2) com tudo o que foi decidido nesta conversa.
- O Alessandro moveu o vídeo da reunião para a pasta Reunioes.
- O Alessandro pediu para não citar nomes de outros projetos em nada do Duo Life; foram tirados do GitHub, do painel e dos documentos do Drive. A criação das contas do app (tarefa 0.15) fica com o Alessandro, e o Documento do Projeto pede o e-mail da Duo Life para isso.
- Entraram no Documento do Projeto: acessos (Letícia e Diogo administradores, aluno só vê o que é dele), saldo sempre visível, pós-venda e renovação automáticos (aviso com 2 e com 1 aula, por e-mail, SMS ou WhatsApp, novo contrato e pagamento no app) e a anamnese pedida pelo Diogo. Nova seção 8, Pauta da próxima reunião.
- Aluno sumido: mensagem automática pelo app para quem fechou o plano e não marca aulas ou falta muito. Entrou no escopo e na pauta (definir quando mandar e a marcação de presença).
- Vagas: limite por aula, agenda única em tempo real para todos, sem superlotação nem marcação repetida, contagem regressiva por mensagem e aviso de aula cheia. Entrou no escopo e na pauta.
- Avisos de vagas definidos pelo Alessandro: com 3 vagas, com 1 vaga e quando lotar.
- Cada aluno pode ter no máximo 4 aulas marcadas ao mesmo tempo, dentro da janela de um mês.
- 01/11: o painel passou a abrir em qualquer aparelho (iPhone, Mac, Android, Windows) mesmo sem conta Claude, com uma cópia dos dados gravada na página (`painel/atualizar-copia.py`).
- 01/11: o Alessandro mandou o escopo para a Letícia e o Diogo, dentro do prazo. Tarefa 0.4 concluída no painel.
- 02/11: chegaram as respostas da Letícia (PDF). Tudo passado para o Documento do Projeto (versão 3), para o painel e para `docs/respostas-leticia-2026-11-02.md`. A confirmar: horário das aulas.
- 03/11: recebido o e-mail da Duo Life para criar as contas do app: duolife.ltda@gmail.com (tarefa 0.15, com o Alessandro).
- 03/11: slogan escolhido: "Dois pilares. Um resultado."
- 03/11: pagamento na praia pelo celular, maquininha e Pix; limite de vagas depois de 3 meses de funcionamento.
- 03/11: o Alessandro mandou os prints do PAR-Q do Diogo. As perguntas (só o texto) estão em `docs/par-q.md` e no escopo; as 7 perguntas foram confirmadas pelo último print.
- 03/11: horário das 8h às 9h; Asaas na conta da Letícia; aviso de aluno sumido com 10 dias ou 2 faltas, com textos propostos.
- 03/11: rascunho do contrato criado no Drive (pasta 01) e em `docs/contrato-rascunho.html`, com 6 decisões em aberto no fim.
- 03/11: contrato v2 com as decisões do Alessandro; faltam o nome completo e o CPF da Letícia e o sobrenome do Diogo (marcados em vermelho).
- 03/11: o Alessandro decidiu respeitar o CDC: desistência em até 7 dias com devolução total, sem multa. Contrato corrigido.
- 03/11: o Alessandro decidiu criar contas novas e separadas de tudo (GitHub, Supabase, Vercel), no e-mail dele, para transferir depois para a Duo Life.
- 03/11: GitHub mantido na organização Duo-Life-Leticia (opção 1), no mesmo modelo dos outros projetos do Alessandro: separado por organização.
- 03/11: Supabase criado (projeto duo-life, São Paulo, gratuito). A conta antiga já tinha usado os 2 projetos gratuitos, por isso o Supabase ficou separado.
- 03/11: conta da Vercel criada (Duo life, Hobby). Contas do app prontas: GitHub, Supabase e Vercel (tarefa 0.15 concluída).
- 03/11: tarefa 0.8 concluída; as fotos de referência já foram enviadas ao Alessandro.
- 03/11: tarefa 0.12 concluída com o contrato versão 2; ajustes da Letícia e do Diogo podem vir depois.
- 03/11: Etapa 1 começou. Primeira parte pronta: banco de dados com as regras (testado), entrada, cadastro, esqueci a senha, PAR-Q, tela do aluno com saldo, agenda, planos e tela do professor separada. Falta ligar ao Supabase e publicar na Vercel.
