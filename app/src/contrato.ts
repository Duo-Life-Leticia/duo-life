// Contrato da Duo Life mostrado no app (versão 2, de 03/11/2026). Fonte: docs/contrato-rascunho.html.
// Ao mudar o texto, troque também CONTRATO_VERSAO: a cada compra o aluno aceita a versão que estiver valendo.
// Os trechos entre [colchetes] ainda serão preenchidos com os dados da Letícia e do Diogo.
export const CONTRATO_VERSAO = "v2-2026-11-03";

export const CONTRATO: { titulo: string; paragrafos: string[] }[] = [
  {
    "titulo": "1. Quem faz parte deste contrato",
    "paragrafos": [
      "Duo Life (chamada aqui de \"Duo Life\"): Letícia [nome completo], CPF [número do CPF], e-mail duolife.ltda@gmail.com, responsável pelas aulas de treinamento funcional ministradas por Diogo [sobrenome], personal trainer.",
      "Aluno: a pessoa cadastrada no aplicativo da Duo Life, com nome completo, CPF, RG, data de nascimento, endereço, e-mail e telefone informados no cadastro."
    ]
  },
  {
    "titulo": "2. O que está sendo contratado",
    "paragrafos": [
      "Aulas coletivas de treinamento funcional ao ar livre, na praia, em Santos (SP), às terças e quintas-feiras, das 8h às 9h, de acordo com o plano comprado pelo aluno."
    ]
  },
  {
    "titulo": "3. Planos, valores e validade",
    "paragrafos": [
      "Plano Sardinha: 5 aulas, R$ 230,00, validade de 30 dias.",
      "Plano Água-Viva: 10 aulas, R$ 420,00, validade de 50 dias.",
      "Plano Tubarão: 20 aulas, R$ 720,00, validade de 80 dias.",
      "3.1. A validade é contada a partir da data da compra.",
      "3.2. As aulas que não forem feitas dentro da validade são perdidas: não passam para outro plano e não são devolvidas em dinheiro.",
      "3.3. Todo plano dá direito ao \"Guia DUO LIFE\", em PDF. O Plano Tubarão dá direito também a um PDF extra de nutrição. Os guias são para uso pessoal do aluno e não podem ser repassados ou vendidos."
    ]
  },
  {
    "titulo": "4. Pagamento",
    "paragrafos": [
      "4.1. O pagamento é feito pelo aplicativo, por Pix, cartão de crédito ou cartão de débito, ou presencialmente, por Pix ou cartão.",
      "4.2. O pagamento é à vista. Só o Plano Tubarão pode ser pago em até 2 vezes no cartão de crédito.",
      "4.3. As aulas do plano ficam disponíveis no aplicativo assim que o pagamento é confirmado."
    ]
  },
  {
    "titulo": "5. Como marcar as aulas",
    "paragrafos": [
      "5.1. O aluno marca as aulas pelo aplicativo. Se tiver dificuldade, pode pedir ao professor que marque por ele.",
      "5.2. As aulas podem ser marcadas com até 1 mês de antecedência, e cada aluno pode ter no máximo 2 aulas marcadas ao mesmo tempo.",
      "5.3. A Duo Life pode definir um número máximo de alunos por aula. Quando a aula estiver cheia, o aluno escolhe outro dia."
    ]
  },
  {
    "titulo": "6. Cancelamento e faltas",
    "paragrafos": [
      "6.1. O aluno pode cancelar uma aula marcada pelo aplicativo até 6 horas antes do início. Nesse caso, a aula volta para o saldo do plano.",
      "6.2. Se o aluno não cancelar dentro desse prazo e não comparecer, a aula conta como feita."
    ]
  },
  {
    "titulo": "7. Feriados e chuva",
    "paragrafos": [
      "7.1. Não há aulas em feriados.",
      "7.2. Em dia de chuva, a Duo Life pode levar a aula para um local coberto ou cancelá-la. Se a aula for cancelada pela Duo Life, o aluno não perde a aula: ela volta para o saldo do plano."
    ]
  },
  {
    "titulo": "8. Saúde e responsabilidade",
    "paragrafos": [
      "8.1. Antes da primeira aula, o aluno responde o questionário de saúde PAR-Q pelo aplicativo (ou em papel). O questionário vale por 6 meses; depois disso, o aluno responde de novo.",
      "8.2. O aluno declara que as respostas do PAR-Q são verdadeiras e se compromete a avisar o professor sobre qualquer mudança na sua saúde.",
      "8.3. Se o aluno responder \"sim\" a alguma pergunta do PAR-Q, ele precisa entregar um atestado médico de liberação para atividade física antes da primeira aula.",
      "8.4. Durante a aula, o aluno deve respeitar os seus limites, seguir as orientações do professor e avisar na hora se sentir qualquer mal-estar."
    ]
  },
  {
    "titulo": "9. Desistência e devolução",
    "paragrafos": [
      "9.1. Quem compra um plano pelo aplicativo pode desistir em até 7 dias da compra e receber de volta todo o valor pago, sem multa, como garante o Código de Defesa do Consumidor (art. 49).",
      "9.2. Depois desse prazo, o valor pago não é devolvido, mas as aulas continuam disponíveis até o fim da validade."
    ]
  },
  {
    "titulo": "10. Dados pessoais",
    "paragrafos": [
      "10.1. Os dados do cadastro e as respostas do PAR-Q são usados só para o cadastro, a marcação de aulas, o pagamento, os avisos do aplicativo e a segurança do aluno nas aulas, como prevê a Lei Geral de Proteção de Dados (LGPD).",
      "10.2. A Duo Life não vende nem repassa esses dados. Eles só são compartilhados com o serviço de pagamento (Asaas), para processar a compra.",
      "10.3. O aluno pode pedir a qualquer momento para ver, corrigir ou apagar os seus dados, pelo e-mail duolife.ltda@gmail.com."
    ]
  },
  {
    "titulo": "11. Uso de imagem",
    "paragrafos": [
      "11.1. O aluno autoriza a Duo Life a usar, sem custo, fotos e vídeos das aulas em que aparece, nas redes sociais e nos materiais de divulgação da Duo Life.",
      "11.2. O aluno pode retirar essa autorização a qualquer momento, pelo e-mail duolife.ltda@gmail.com. A partir do pedido, a Duo Life não publica novas fotos ou vídeos com o aluno."
    ]
  },
  {
    "titulo": "12. Aceite",
    "paragrafos": [
      "12.1. Ao marcar \"Li e aceito\" no aplicativo na hora da compra, o aluno concorda com este contrato. O aplicativo guarda a data e a hora do aceite, que valem como assinatura.",
      "12.2. A cada renovação ou compra de um novo plano, o aluno aceita de novo a versão do contrato que estiver valendo."
    ]
  },
  {
    "titulo": "13. Foro",
    "paragrafos": [
      "Qualquer questão sobre este contrato será resolvida no foro da cidade de Santos (SP)."
    ]
  }
];
