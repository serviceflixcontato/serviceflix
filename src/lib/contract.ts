/**
 * Contrato de Prestação de Serviços de Manutenção por Assinatura — Service Flix.
 * O texto abaixo é a versão oficial apresentada ao cliente no momento da contratação.
 * Campos entre {{ }} são preenchidos automaticamente com os dados do cliente e do plano.
 */

export const CONTRACT_VERSION = "1.1";

export const CONTRACT_TITLE = "CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE MANUTENÇÃO POR ASSINATURA";

export const COMPANY = {
  name: "SERVICEFLIX",
  legalName: "Josias da Silva Mendonça Filho",
  cnpj: "64.341.567/0001-04",
  address: "Rua Doutor José Juca Assi, nº 96, Jardim Planalto, Mogi das Cruzes – SP",
};

export type ContractFields = {
  nome_cliente: string;
  cpf_cnpj: string;
  email: string;
  telefone: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade_uf: string;
  nome_plano: string;
  periodicidade: string;
  valor_assinatura: string;
  forma_pagamento: string;
  limite_atendimentos: string;
  servicos_inclusos: string;
  endereco_atendimento: string;
  data_contratacao: string;
  data_inicio: string;
  data_hora_aceite: string;
  ip_aceite: string;
  id_contratacao: string;
  versao_contrato: string;
  quantidade_paineis: string;
  limpezas_ano: string;
  valor_por_painel: string;
};

export type ContractSection = {
  heading?: string | undefined;
  paragraphs: string[];
};

export const CONTRACT_SECTIONS: ContractSection[] = [
  {
    paragraphs: [
      "Pelo presente instrumento particular, de um lado:",
      `CONTRATADA: SERVICEFLIX, nome fantasia de ${COMPANY.legalName}, inscrito no CNPJ nº ${COMPANY.cnpj}, com endereço na ${COMPANY.address}, neste ato representada por seu titular ${COMPANY.legalName}, doravante denominada simplesmente CONTRATADA;`,
      "e, de outro lado:",
      "CONTRATANTE: {{nome_cliente}}",
      "CPF/CNPJ: {{cpf_cnpj}}",
      "E-mail: {{email}}",
      "Telefone: {{telefone}}",
      "Endereço: {{endereco}}",
      "Número: {{numero}}",
      "Complemento: {{complemento}}",
      "Bairro: {{bairro}}",
      "Cidade/UF: {{cidade_uf}}",
      "doravante denominado simplesmente CONTRATANTE, têm entre si justo e contratado o presente CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE MANUTENÇÃO POR ASSINATURA, mediante as cláusulas e condições seguintes.",
    ],
  },
  {
    heading: "CLÁUSULA 1ª – DO OBJETO",
    paragraphs: [
      "1.1. O presente contrato tem por objeto a prestação, pela CONTRATADA, de serviços de manutenção, conservação, pequenos reparos, assistência e demais serviços expressamente previstos no plano de assinatura escolhido pelo CONTRATANTE.",
      "1.2. A contratação será realizada por meio da plataforma digital da SERVICEFLIX, de acordo com o plano selecionado pelo CONTRATANTE.",
      "1.3. A assinatura corresponde à disponibilização de mão de obra para os serviços abrangidos pelo plano contratado, observados os limites, condições, quantidade de atendimentos, tipos de serviços e demais características informadas na plataforma no momento da contratação.",
      "1.4. O presente contrato não implica a disponibilização de empregado, funcionário fixo, profissional residente ou profissional exclusivo no imóvel do CONTRATANTE.",
      "1.5. A contratação possui natureza de prestação de serviços, não estabelecendo relação trabalhista entre o CONTRATANTE e os profissionais disponibilizados pela CONTRATADA.",
    ],
  },
  {
    heading: "CLÁUSULA 2ª – DO PLANO CONTRATADO",
    paragraphs: [
      "2.1. O CONTRATANTE declara que escolheu o plano disponibilizado pela plataforma da SERVICEFLIX.",
      "PLANO CONTRATADO: {{nome_plano}}",
      "PERIODICIDADE: {{periodicidade}}",
      "VALOR DA ASSINATURA: {{valor_assinatura}}",
      "FORMA DE PAGAMENTO: {{forma_pagamento}}",
      "LIMITE DE ATENDIMENTOS: {{limite_atendimentos}}",
      "SERVIÇOS INCLUSOS:",
      "{{servicos_inclusos}}",
      "2.2. Integram a contratação as informações do plano apresentadas ao CONTRATANTE no momento da contratação, desde que compatíveis com este contrato.",
      "2.3. Os serviços, limites, periodicidade, valores e demais condições específicas poderão variar conforme o plano escolhido.",
    ],
  },
  {
    heading: "CLÁUSULA 3ª – DA CONTRATAÇÃO DIGITAL",
    paragraphs: [
      "3.1. A contratação poderá ser realizada integralmente por meio eletrônico.",
      "3.2. Para concluir a contratação, o CONTRATANTE deverá preencher seus dados cadastrais, informar o endereço de atendimento, selecionar o plano desejado, ter acesso a este contrato, manifestar expressamente sua concordância e realizar o pagamento correspondente.",
      "3.3. O simples acesso à plataforma ou preenchimento de cadastro não será considerado, isoladamente, aceite deste contrato.",
      "3.4. A contratação será considerada concluída após o registro eletrônico do aceite e a confirmação do pagamento, observadas as condições do meio de pagamento utilizado.",
      "3.5. A CONTRATADA poderá manter registros eletrônicos da contratação, incluindo, quando disponíveis, nome, documento, e-mail, data e hora do aceite, versão do contrato aceita, endereço IP, identificação da transação e demais informações técnicas relacionadas à contratação.",
    ],
  },
  {
    heading: "CLÁUSULA 4ª – DO LOCAL DE PRESTAÇÃO DOS SERVIÇOS",
    paragraphs: [
      "4.1. A assinatura ficará vinculada ao endereço informado pelo CONTRATANTE:",
      "ENDEREÇO DE ATENDIMENTO: {{endereco_atendimento}}",
      "4.2. O CONTRATANTE deverá informar corretamente o endereço e as características relevantes do local.",
      "4.3. A prestação dos serviços em endereço diferente daquele cadastrado dependerá de prévia autorização da CONTRATADA e poderá estar sujeita a condições adicionais.",
    ],
  },
  {
    heading: "CLÁUSULA 5ª – DA NATUREZA DA ASSINATURA",
    paragraphs: [
      "5.1. A assinatura da SERVICEFLIX não representa contratação de trabalhador exclusivo, profissional residente, empregado fixo ou disponibilidade permanente de um profissional no imóvel.",
      "5.2. Os profissionais serão direcionados conforme a natureza do serviço, disponibilidade operacional, região de atendimento, agenda e características do chamado.",
      "5.3. O CONTRATANTE não poderá exigir que determinado profissional permaneça exclusivamente vinculado ao imóvel, salvo contratação específica nesse sentido.",
      "5.4. A assinatura garante ao CONTRATANTE o acesso aos serviços previstos no plano contratado, respeitando seus limites e condições, não representando execução ilimitada ou irrestrita de qualquer tipo de serviço.",
    ],
  },
  {
    heading: "CLÁUSULA 6ª – DOS MATERIAIS, PEÇAS E INSUMOS",
    paragraphs: [
      "6.1. Todos os materiais, peças, componentes, equipamentos, insumos, consumíveis e demais itens necessários à execução dos serviços serão de responsabilidade do CONTRATANTE, salvo quando houver contratação expressa e específica em sentido contrário.",
      "6.2. A CONTRATADA fornecerá, como regra geral, a mão de obra necessária à execução dos serviços abrangidos pelo plano, não estando incluído no valor da assinatura o fornecimento de materiais, peças ou componentes.",
      "6.3. Caberá ao CONTRATANTE adquirir e disponibilizar os materiais necessários para a realização do serviço.",
      "6.4. Os materiais fornecidos pelo CONTRATANTE deverão ser adequados, suficientes, compatíveis e próprios para o serviço solicitado.",
      "6.5. Caso o material disponibilizado seja inadequado, insuficiente, incompatível, defeituoso ou ofereça risco à execução do serviço, a CONTRATADA poderá interromper, recusar ou reagendar a execução até que sejam fornecidos materiais adequados.",
      "6.6. A CONTRATADA não responderá por defeitos, falhas, incompatibilidades ou danos diretamente decorrentes de materiais, peças ou componentes fornecidos pelo CONTRATANTE, ressalvadas as responsabilidades que não possam ser afastadas pela legislação aplicável.",
      "6.7. Caso o CONTRATANTE solicite que a CONTRATADA providencie a compra de materiais, peças ou componentes, isso dependerá de autorização prévia e poderá gerar cobrança separada.",
      "6.8. A eventual aquisição de material pela CONTRATADA não será considerada parte integrante da assinatura, salvo quando expressamente indicado no plano ou em orçamento adicional aprovado pelo CONTRATANTE.",
    ],
  },
  {
    heading: "CLÁUSULA 7ª – DAS FERRAMENTAS E EQUIPAMENTOS ESPECIAIS",
    paragraphs: [
      "7.1. A prestação da mão de obra pela CONTRATADA não significa que todos os equipamentos, máquinas, estruturas ou ferramentas especiais necessárias à execução estarão incluídos na assinatura.",
      "7.2. Ferramentas, equipamentos, estruturas ou recursos especiais que não sejam de uso ordinário da mão de obra poderão ser de responsabilidade do CONTRATANTE, conforme a natureza do serviço.",
      "7.3. Poderão ser considerados equipamentos ou estruturas especiais, entre outros: a) andaimes; b) plataformas elevatórias; c) escadas especiais ou de grande altura; d) equipamentos para acesso em altura; e) equipamentos de elevação; f) máquinas específicas; g) equipamentos de locação; h) ferramentas especiais de grande porte; i) equipamentos necessários em razão das características particulares do imóvel.",
      "7.4. Quando determinado equipamento ou estrutura especial for necessário, a CONTRATADA informará previamente ao CONTRATANTE, sempre que possível.",
      "7.5. Caso o equipamento especial seja de responsabilidade do CONTRATANTE, o serviço poderá ser suspenso ou reagendado até que o equipamento adequado esteja disponível em condições seguras de utilização.",
      "7.6. A CONTRATADA poderá recusar a execução de serviço quando os equipamentos, ferramentas, estruturas ou condições disponibilizadas pelo CONTRATANTE apresentarem risco à integridade física dos profissionais ou de terceiros.",
    ],
  },
  {
    heading: "CLÁUSULA 8ª – DA SEGURANÇA DO LOCAL",
    paragraphs: [
      "8.1. O CONTRATANTE deverá disponibilizar ambiente adequado e seguro para a realização dos serviços.",
      "8.2. O CONTRATANTE deverá informar previamente a existência de riscos, instalações perigosas, redes elétricas, estruturas comprometidas, produtos químicos, animais, locais de difícil acesso ou qualquer outra condição que possa oferecer risco.",
      "8.3. A CONTRATADA poderá suspender ou não iniciar o serviço quando identificar condição que represente risco à integridade física de seus profissionais ou de terceiros.",
      "8.4. A suspensão motivada por condição insegura, ausência de material, ausência de equipamento especial ou impossibilidade de acesso não será considerada, por si só, falha na prestação do serviço.",
      "8.5. O reagendamento ocorrerá após a regularização das condições necessárias à execução.",
    ],
  },
  {
    heading: "CLÁUSULA 9ª – DA SOLICITAÇÃO E DO AGENDAMENTO",
    paragraphs: [
      "9.1. Os serviços serão solicitados pelo CONTRATANTE por meio dos canais disponibilizados pela SERVICEFLIX.",
      "9.2. Cada solicitação poderá ser analisada pela CONTRATADA antes do agendamento, a fim de verificar se o serviço está abrangido pelo plano.",
      "9.3. O agendamento dependerá da disponibilidade operacional da CONTRATADA.",
      "9.4. O prazo de atendimento poderá variar conforme a natureza do serviço, urgência, disponibilidade de profissional, localização, necessidade de materiais, equipamentos especiais, condições de acesso e outros fatores que possam interferir na execução.",
      "9.5. A confirmação do chamado não significa necessariamente que o serviço será concluído no mesmo atendimento, especialmente quando houver necessidade de material, peça, equipamento ou serviço complementar.",
    ],
  },
  {
    heading: "CLÁUSULA 10ª – DOS SERVIÇOS ADICIONAIS",
    paragraphs: [
      "10.1. Serviços que não estejam expressamente incluídos no plano poderão ser classificados como serviços adicionais.",
      "10.2. A realização de serviço adicional dependerá de prévia ciência e autorização do CONTRATANTE.",
      "10.3. A aprovação poderá ser realizada por meio eletrônico, inclusive pela plataforma, e-mail, mensagem ou outro canal disponibilizado pela CONTRATADA.",
      "10.4. O serviço adicional poderá ser cobrado separadamente da assinatura.",
      "10.5. Nenhum serviço adicional será cobrado sem prévia autorização do CONTRATANTE, ressalvadas situações em que a legislação permita procedimento diverso.",
    ],
  },
  {
    heading: "CLÁUSULA 11ª – DOS SERVIÇOS NÃO ABRANGIDOS",
    paragraphs: [
      "11.1. Salvo previsão expressa no plano contratado, não estão automaticamente incluídos na assinatura: a) fornecimento de materiais; b) fornecimento de peças; c) equipamentos especiais; d) locação de andaimes; e) plataformas elevatórias; f) máquinas ou equipamentos de grande porte; g) serviços de terceiros especializados; h) projetos técnicos, laudos ou ART/RRT, quando exigíveis; i) serviços que dependam de profissional legalmente habilitado para atividade específica, quando não previstos no plano; j) reformas de grande porte; k) obras estruturais; l) serviços que ultrapassem os limites quantitativos ou técnicos do plano; m) serviços decorrentes de danos provocados por terceiros, mau uso ou alterações realizadas posteriormente por terceiros.",
      "11.2. A relação acima é exemplificativa, prevalecendo as condições específicas apresentadas no plano contratado.",
    ],
  },
  {
    heading: "CLÁUSULA 12ª – DAS OBRIGAÇÕES DA CONTRATADA",
    paragraphs: [
      "12.1. São obrigações da CONTRATADA: a) disponibilizar os serviços previstos no plano contratado; b) realizar a mão de obra correspondente aos serviços abrangidos pelo plano; c) utilizar profissionais compatíveis com a natureza dos serviços; d) realizar os atendimentos com zelo e diligência; e) informar, quando identificado, eventual necessidade de material, equipamento ou serviço adicional; f) comunicar ao CONTRATANTE situações que impeçam ou dificultem a execução; g) respeitar as condições e limites estabelecidos neste contrato e no plano contratado.",
      "12.2. A CONTRATADA poderá utilizar profissionais, parceiros, prestadores ou terceiros para a execução dos serviços, permanecendo responsável pela gestão da prestação contratada dentro dos limites legais e contratuais.",
    ],
  },
  {
    heading: "CLÁUSULA 13ª – DAS OBRIGAÇÕES DO CONTRATANTE",
    paragraphs: [
      "13.1. São obrigações do CONTRATANTE: a) fornecer informações verdadeiras; b) efetuar os pagamentos devidos; c) permitir o acesso ao imóvel; d) disponibilizar materiais necessários; e) disponibilizar equipamentos ou ferramentas especiais quando forem de sua responsabilidade; f) garantir condições adequadas de segurança; g) informar previamente riscos ou condições especiais existentes no imóvel; h) não exigir a execução de serviço em condições inseguras; i) autorizar previamente serviços adicionais; j) não interferir indevidamente na execução técnica do serviço; k) comunicar imediatamente eventual problema relacionado ao serviço executado; l) manter seus dados cadastrais atualizados.",
    ],
  },
  {
    heading: "CLÁUSULA 14ª – DO PAGAMENTO DA ASSINATURA",
    paragraphs: [
      "14.1. O valor da assinatura será aquele informado ao CONTRATANTE no momento da contratação.",
      "VALOR: {{valor_assinatura}}",
      "PERIODICIDADE: {{periodicidade}}",
      "FORMA DE PAGAMENTO: {{forma_pagamento}}",
      "14.2. A cobrança poderá ser realizada de forma recorrente, de acordo com a periodicidade escolhida.",
      "14.3. O início da utilização dos serviços estará condicionado à confirmação da contratação e do pagamento, salvo condição diversa expressamente informada pela CONTRATADA.",
      "14.4. O não pagamento poderá resultar na suspensão de novos atendimentos enquanto permanecer a inadimplência, observados os direitos assegurados pela legislação aplicável.",
      "14.5. A suspensão por inadimplência não implica automaticamente cancelamento da assinatura.",
      "14.6. Eventuais valores, encargos ou consequências decorrentes de atraso somente serão aplicados quando previamente informados e permitidos pela legislação aplicável.",
    ],
  },
  {
    heading: "CLÁUSULA 15ª – DA RENOVAÇÃO DA ASSINATURA",
    paragraphs: [
      "15.1. Quando o plano possuir cobrança recorrente, a assinatura poderá ser renovada automaticamente de acordo com a periodicidade escolhida pelo CONTRATANTE, desde que essa condição seja apresentada de forma clara no momento da contratação.",
      "15.2. O CONTRATANTE poderá solicitar o cancelamento da renovação por meio dos canais disponibilizados pela CONTRATADA.",
      "15.3. A renovação não poderá alterar unilateralmente o plano contratado sem comunicação prévia e observância da legislação aplicável.",
    ],
  },
  {
    heading: "CLÁUSULA 16ª – DO CANCELAMENTO",
    paragraphs: [
      "16.1. O CONTRATANTE poderá solicitar o cancelamento da assinatura pelos canais disponibilizados pela SERVICEFLIX.",
      "16.2. O cancelamento da assinatura não autoriza, por si só, a cobrança de serviços que não tenham sido contratados ou realizados.",
      "16.3. Serviços adicionais previamente autorizados e efetivamente realizados permanecerão sujeitos ao pagamento correspondente, ressalvadas as hipóteses de direito de arrependimento ou outros direitos previstos em lei.",
      "16.4. Quando houver cobrança recorrente, o cancelamento deverá interromper as cobranças futuras após o processamento do pedido, observadas as regras do meio de pagamento e da legislação aplicável.",
      "16.5. O cancelamento não prejudicará obrigações já constituídas anteriormente à sua efetivação.",
    ],
  },
  {
    heading: "CLÁUSULA 17ª – DO DIREITO DE ARREPENDIMENTO",
    paragraphs: [
      "17.1. Nas hipóteses em que a contratação estiver sujeita ao direito de arrependimento previsto na legislação consumerista, especialmente nas contratações realizadas fora do estabelecimento comercial, o CONTRATANTE poderá exercer esse direito no prazo legal.",
      "17.2. O exercício do direito de arrependimento será realizado por meio dos canais disponibilizados pela CONTRATADA.",
      "17.3. Quando aplicável, os valores pagos serão restituídos na forma e nos prazos estabelecidos pela legislação.",
      "17.4. A presente cláusula não limita ou exclui qualquer direito assegurado ao consumidor pela legislação vigente.",
    ],
  },
  {
    heading: "CLÁUSULA 18ª – DA RESPONSABILIDADE PELA EXECUÇÃO",
    paragraphs: [
      "18.1. A CONTRATADA será responsável pela execução adequada da mão de obra que efetivamente prestar, dentro dos limites do serviço contratado.",
      "18.2. A CONTRATADA não será responsável por problemas decorrentes exclusivamente de: a) materiais fornecidos pelo CONTRATANTE; b) peças fornecidas pelo CONTRATANTE; c) instalações preexistentes; d) defeitos ocultos ou preexistentes; e) desgaste natural; f) mau uso; g) intervenções realizadas posteriormente por terceiros; h) alterações realizadas pelo CONTRATANTE ou por terceiros; i) condições inadequadas do local; j) ausência ou inadequação de equipamentos especiais que sejam de responsabilidade do CONTRATANTE; k) fatos de terceiros; l) caso fortuito ou força maior, nos termos da legislação aplicável.",
      "18.3. A exclusão de responsabilidade prevista nesta cláusula não se aplica quando houver responsabilidade legal da CONTRATADA que não possa ser afastada por contrato.",
    ],
  },
  {
    heading: "CLÁUSULA 19ª – DA GARANTIA DOS SERVIÇOS",
    paragraphs: [
      "19.1. A garantia aplicável aos serviços observará a legislação vigente e, quando houver, as condições específicas informadas pela CONTRATADA para determinado serviço.",
      "19.2. A garantia não abrangerá problemas provocados por materiais, peças ou componentes fornecidos pelo CONTRATANTE, quando o defeito decorrer desses itens.",
      "19.3. Também poderá não ser aplicável quando o serviço tiver sido posteriormente alterado, desmontado ou reparado por terceiros, ressalvadas as garantias que legalmente não possam ser afastadas.",
      "19.4. Eventuais reclamações deverão ser comunicadas à CONTRATADA assim que identificadas, para possibilitar a análise e, quando cabível, a correção do serviço.",
    ],
  },
  {
    heading: "CLÁUSULA 20ª – DO ACESSO AO IMÓVEL",
    paragraphs: [
      "20.1. O CONTRATANTE deverá assegurar o acesso dos profissionais ao local previamente agendado.",
      "20.2. O CONTRATANTE deverá fornecer chaves, autorizações, códigos de acesso ou outras informações necessárias, quando aplicável.",
      "20.3. Caso o acesso não seja possível no horário agendado por responsabilidade do CONTRATANTE, poderá ser necessário novo agendamento.",
      "20.4. Quando houver necessidade de autorização de condomínio, proprietário, síndico, administradora ou terceiro, caberá ao CONTRATANTE providenciá-la previamente, salvo quando expressamente acordado de outra forma.",
    ],
  },
  {
    heading: "CLÁUSULA 21ª – DAS LIMITAÇÕES TÉCNICAS E DE SEGURANÇA",
    paragraphs: [
      "21.1. A CONTRATADA não será obrigada a realizar serviço que, segundo avaliação técnica razoável, apresente risco à integridade física dos profissionais, terceiros ou patrimônio.",
      "21.2. Também poderá ser recusada ou suspensa a execução quando não houver material, equipamento, acesso ou condição mínima necessária para a realização segura do serviço.",
      "21.3. Sempre que possível, a CONTRATADA informará ao CONTRATANTE o motivo da impossibilidade e as condições necessárias para eventual reagendamento.",
    ],
  },
  {
    heading: "CLÁUSULA 22ª – DA PROTEÇÃO DE DADOS PESSOAIS",
    paragraphs: [
      "22.1. Os dados pessoais fornecidos pelo CONTRATANTE poderão ser tratados pela CONTRATADA para finalidades relacionadas à contratação, cobrança, identificação, comunicação, agendamento, prestação dos serviços, atendimento ao cliente, cumprimento de obrigações legais e exercício regular de direitos.",
      "22.2. O tratamento dos dados será realizado de acordo com a legislação aplicável, especialmente a Lei Geral de Proteção de Dados Pessoais – LGPD.",
      "22.3. A CONTRATADA poderá utilizar prestadores de serviços e plataformas tecnológicas necessárias à operação da assinatura, inclusive meios de pagamento, hospedagem, comunicação, agendamento e atendimento, observadas as obrigações legais aplicáveis.",
      "22.4. O CONTRATANTE poderá exercer os direitos previstos na legislação de proteção de dados por meio do canal disponibilizado pela CONTRATADA.",
    ],
  },
  {
    heading: "CLÁUSULA 23ª – DO ACEITE ELETRÔNICO E DA COMPROVAÇÃO DA CONTRATAÇÃO",
    paragraphs: [
      "23.1. O CONTRATANTE declara que leu e teve acesso a este contrato antes de concluir a contratação.",
      "23.2. A manifestação eletrônica de concordância, realizada por meio do mecanismo disponibilizado na plataforma, constituirá registro da manifestação de vontade do CONTRATANTE.",
      "23.3. A CONTRATADA poderá registrar e conservar as informações relacionadas ao aceite eletrônico, incluindo: a) identificação do CONTRATANTE; b) CPF/CNPJ; c) e-mail; d) data e hora; e) endereço IP, quando tecnicamente disponível; f) identificação da versão do contrato aceita; g) plano escolhido; h) informações da transação; i) demais registros técnicos relacionados à contratação.",
      "23.4. O CONTRATANTE declara que os dados fornecidos são verdadeiros e que possui capacidade e autorização necessárias para realizar a contratação.",
      "23.5. A contratação eletrônica será considerada parte integrante da relação contratual, observada a legislação aplicável.",
    ],
  },
  {
    heading: "CLÁUSULA 24ª – DA ALTERAÇÃO DAS CONDIÇÕES",
    paragraphs: [
      "24.1. Alterações futuras nas condições dos planos, preços, serviços ou funcionalidades da plataforma não alterarão retroativamente uma contratação já realizada.",
      "24.2. Quando necessária comunicação prévia ao CONTRATANTE, a CONTRATADA utilizará os meios de contato cadastrados.",
      "24.3. Alterações que impliquem nova contratação ou modificação substancial das condições deverão ser apresentadas de forma clara ao CONTRATANTE.",
    ],
  },
  {
    heading: "CLÁUSULA 25ª – DA COMUNICAÇÃO ENTRE AS PARTES",
    paragraphs: [
      "25.1. As comunicações relacionadas à contratação poderão ocorrer por e-mail, plataforma, aplicativo, WhatsApp, telefone ou outros canais oficialmente disponibilizados pela SERVICEFLIX.",
      "25.2. O CONTRATANTE é responsável por manter seus dados de contato atualizados.",
      "25.3. As comunicações serão realizadas pelos meios disponibilizados pela CONTRATADA, observada a legislação aplicável.",
    ],
  },
  {
    heading: "CLÁUSULA 26ª – DA AUSÊNCIA DE RELAÇÃO TRABALHISTA COM O CONTRATANTE",
    paragraphs: [
      "26.1. O presente contrato não cria vínculo empregatício entre o CONTRATANTE e os profissionais que realizarem os serviços.",
      "26.2. A gestão, organização e direcionamento dos profissionais utilizados pela CONTRATADA serão realizados pela própria CONTRATADA, respeitados os limites legais aplicáveis.",
      "26.3. O CONTRATANTE não poderá contratar ou exigir do profissional atividades estranhas ao serviço solicitado por meio da SERVICEFLIX sem autorização da CONTRATADA.",
    ],
  },
  {
    heading: "CLÁUSULA 27ª – DA BOA-FÉ E DO EQUILÍBRIO CONTRATUAL",
    paragraphs: [
      "27.1. As partes comprometem-se a agir de acordo com a boa-fé, transparência e cooperação durante a execução do contrato.",
      "27.2. Nenhuma disposição deste contrato deverá ser interpretada como renúncia a direito que seja assegurado por norma legal de caráter obrigatório.",
      "27.3. Caso alguma disposição seja considerada inválida ou inaplicável, as demais permanecerão vigentes naquilo que não for afetado.",
    ],
  },
  {
    heading: "CLÁUSULA 28ª – DA LEGISLAÇÃO APLICÁVEL",
    paragraphs: [
      "28.1. Este contrato será regido pela legislação brasileira aplicável à natureza da contratação.",
      "28.2. Nas relações de consumo, serão respeitados os direitos previstos na legislação consumerista.",
    ],
  },
  {
    heading: "CLÁUSULA 29ª – DO FORO",
    paragraphs: [
      "29.1. Fica observado o foro competente de acordo com a legislação aplicável, inclusive as regras de proteção ao consumidor quando estas forem aplicáveis.",
      "29.2. Nenhuma disposição desta cláusula terá por finalidade afastar o direito do consumidor ao foro que lhe seja assegurado por lei.",
    ],
  },
  {
    heading: "CLÁUSULA 30ª – DA INTEGRAÇÃO DO CONTRATO",
    paragraphs: [
      "30.1. Este contrato, juntamente com as condições específicas do plano escolhido e as informações apresentadas ao CONTRATANTE no momento da contratação, constitui o conjunto das condições aplicáveis à assinatura.",
      "30.2. Em caso de divergência entre uma informação genérica da plataforma e as condições específicas do plano contratado, deverão ser consideradas as informações efetivamente apresentadas ao CONTRATANTE antes da conclusão da contratação, observada a legislação aplicável.",
    ],
  },
  {
    heading: "CLÁUSULA 31ª – DO PLANO FLIX SOLAR (LIMPEZA DE PAINÉIS SOLARES)",
    paragraphs: [
      "31.1. Quando o plano contratado for o FLIX SOLAR, o objeto da assinatura será a limpeza periódica de painéis solares, tanto fotovoltaicos (geração de energia) quanto de aquecimento solar, instalados no endereço de atendimento informado pelo CONTRATANTE.",
      "31.2. O CONTRATANTE declara a quantidade de painéis e a quantidade de limpezas desejadas por ano no momento da contratação:",
      "QUANTIDADE DE PAINÉIS: {{quantidade_paineis}}",
      "LIMPEZAS POR ANO: {{limpezas_ano}}",
      "VALOR POR PAINEL (POR LIMPEZA): {{valor_por_painel}}",
      "VALOR DA ADESÃO (1ª MENSALIDADE): {{valor_adesao}}",
      "31.3. O valor total anual do FLIX SOLAR é calculado pela multiplicação do valor por painel (por limpeza), definido pela CONTRATADA e vigente no momento da contratação, pela quantidade de painéis informada e pela quantidade de limpezas anuais escolhida. A primeira mensalidade corresponde à ADESÃO, equivalente ao valor de 10 (dez) painéis, e o saldo restante será dividido em 11 (onze) parcelas mensais. A regra da adesão aplica-se tanto a novas contratações quanto a mudanças de plano para o FLIX SOLAR.",
      "31.4. As limpezas serão agendadas pelo CONTRATANTE por meio dos canais disponibilizados pela SERVICEFLIX, respeitada a quantidade de limpezas anuais contratada e a disponibilidade operacional da CONTRATADA.",
      "31.5. A execução da limpeza depende de condições seguras de acesso aos painéis. Quando os painéis estiverem instalados em telhados ou locais elevados, aplicam-se as regras deste contrato sobre equipamentos especiais, estruturas de acesso e segurança do local (Cláusulas 7ª, 8ª e 21ª).",
      "31.6. Não estão incluídos no FLIX SOLAR, salvo contratação específica: reparos, manutenção elétrica, troca de componentes, desinstalação ou reinstalação de painéis, serviços de telhado e quaisquer serviços que não sejam a limpeza dos painéis.",
      "31.7. Caso a quantidade real de painéis no local seja diferente da informada pelo CONTRATANTE, a CONTRATADA poderá ajustar o valor da assinatura ou readequar a contratação, mediante prévia comunicação ao CONTRATANTE.",
    ],
  },
  {
    heading: "DADOS DA CONTRATAÇÃO",
    paragraphs: [
      "CONTRATANTE: {{nome_cliente}}",
      "CPF/CNPJ: {{cpf_cnpj}}",
      "E-MAIL: {{email}}",
      "PLANO: {{nome_plano}}",
      "VALOR: {{valor_assinatura}}",
      "PERIODICIDADE: {{periodicidade}}",
      "FORMA DE PAGAMENTO: {{forma_pagamento}}",
      "DATA DA CONTRATAÇÃO: {{data_contratacao}}",
      "DATA DE INÍCIO: {{data_inicio}}",
      "ENDEREÇO DE ATENDIMENTO: {{endereco_atendimento}}",
      "SERVIÇOS INCLUSOS: {{servicos_inclusos}}",
      "LIMITE DE ATENDIMENTOS: {{limite_atendimentos}}",
    ],
  },
];

/** Declarações que o cliente precisa marcar antes de concluir a contratação. */
export const ACCEPT_ITEMS = [
  "Li integralmente o Contrato de Prestação de Serviços de Manutenção por Assinatura, tive acesso às condições do plano escolhido e concordo com seus termos.",
  "Estou ciente de que a SERVICEFLIX presta, conforme o plano contratado, mão de obra para os serviços abrangidos pela assinatura, e que materiais, peças, insumos e determinados equipamentos ou ferramentas especiais são de responsabilidade do CONTRATANTE, conforme este contrato.",
  "Estou ciente de que a assinatura não corresponde à contratação de profissional exclusivo ou empregado fixo no imóvel.",
  "Estou ciente das condições de pagamento, periodicidade, limites do plano, agendamento, cancelamento e demais condições apresentadas antes da contratação.",
];

export const CONTRACT_CLOSING =
  "SERVICEFLIX — Serviços de manutenção por assinatura, com praticidade, agilidade e flexibilidade.";

/** Substitui os campos {{ }} pelos dados informados. */
export function fillTemplate(text: string, fields: Partial<ContractFields>) {
  return text.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const value = (fields as Record<string, string | undefined>)[key];
    return value && value.trim() ? value : "—";
  });
}

/** Contrato com todos os campos preenchidos, pronto para leitura ou PDF. */
export function renderContract(fields: Partial<ContractFields>): ContractSection[] {
  return CONTRACT_SECTIONS.map((section) => ({
    heading: section.heading,
    paragraphs: section.paragraphs.map((paragraph) => fillTemplate(paragraph, fields)),
  }));
}
